"""The orchestrator: wires audio → VAD → Whisper → LLM → WebSocket, plus a
parallel OCR context loop.

Concurrency model (all on one asyncio loop):

* ``_audio_loop``  — pulls PCM frames, segments utterances, transcribes them,
  appends to the rolling transcript, broadcasts each transcript line, and
  decides when to trigger an LLM completion.
* ``_ocr_loop``    — periodically refreshes on-screen text context.
* ``_answer``      — streams an LLM completion and forwards each token.

A ``demo`` mode replaces audio+OCR with scripted input so the overlay and the
streaming path can be exercised without a loopback device or microphone.
"""
from __future__ import annotations

import asyncio
import logging
import time

from .audio.capture import AudioCapture, AudioUnavailable
from .audio.vad import UtteranceSegmenter
from .config import Config
from .conversation import ConversationManager
from .llm.gemini_client import GeminiStreamer
from .ocr.screen_ocr import ScreenOcr
from .server.ws_server import OverlayServer

log = logging.getLogger("hiresky.orchestrator")


class _MockStreamer:
    """Offline token streamer for --demo (no network / API key required)."""

    async def stream(self, transcript: str, ocr_context: str = ""):
        reply = (
            "Here's a strong structure for that: state the situation briefly, "
            "the action you took, and the measurable result. Keep it under 90 "
            "seconds and lead with the outcome."
        )
        for word in reply.split(" "):
            yield word + " "
            await asyncio.sleep(0.04)


class Orchestrator:
    def __init__(self, cfg: Config, demo: bool = False) -> None:
        self.cfg = cfg
        self.demo = demo
        self.server = OverlayServer(cfg.server)
        self.conversation = ConversationManager(self.server)

        self._transcript: list[str] = []
        self._ocr_context: str = ""
        self._pending_chars = 0
        self._answer_seq = 0
        self._answering = False
        self._listening = True          # toggled by the overlay (Cmd+V)
        self._stop = asyncio.Event()

        # Heavy components are created lazily so demo mode needs no ML deps.
        self._llm: GeminiStreamer | None = None
        self._transcriber = None

    # -- lifecycle -------------------------------------------------------
    async def run(self) -> None:
        await self.server.start()
        # Let the overlay send control commands (e.g. toggle listening).
        self.server.command_handler = self._on_command
        tasks: list[asyncio.Task] = [asyncio.create_task(self.conversation.watchdog())]
        if self.demo:
            tasks.append(asyncio.create_task(self._demo_audio_loop()))
        else:
            from .transcription.whisper_engine import Transcriber

            # One shared transcriber (model loaded once) for every source.
            self._transcriber = Transcriber(self.cfg)
            for source in self.cfg.audio.active_sources():
                log.info("Starting capture source '%s' -> device ~%r",
                         source.name, source.device)
                tasks.append(asyncio.create_task(self._source_loop(source)))
            if self.cfg.ocr.enabled:
                tasks.append(asyncio.create_task(self._ocr_loop()))
        try:
            await self._stop.wait()
        finally:
            for t in tasks:
                t.cancel()
            await self.server.stop()

    def stop(self) -> None:
        self._stop.set()

    def _on_command(self, action: str, data: dict | None = None) -> None:
        """Handle a control command sent by an overlay over the WebSocket."""
        if action == "configure":
            # Lets an overlay push the system prompt / candidate info at
            # session start, as documented in config.example.yaml. Without
            # this handler nothing could ever set these at runtime, so
            # _answer() would always hit its "no prompt configured" abort.
            data = data or {}
            if "system_prompt" in data:
                self.cfg.llm.system_prompt = str(data.get("system_prompt") or "")
            if "candidate_info" in data:
                self.cfg.llm.candidate_info = str(data.get("candidate_info") or "")
            log.info("Configured via overlay (system_prompt: %d chars, candidate_info: %d chars)",
                      len(self.cfg.llm.system_prompt), len(self.cfg.llm.candidate_info))
            asyncio.create_task(
                self.server.broadcast({"type": "status", "text": "configured"})
            )
        elif action == "toggle_listening":
            self._listening = not self._listening
            state = "listening" if self._listening else "paused"
            log.info("Listening toggled -> %s", state)
            asyncio.create_task(
                self.server.broadcast({"type": "status", "text": state})
            )
        elif action == "assist":
            # Force an answer from the current transcript right now.
            if not self._answering:
                asyncio.create_task(self._answer())
        elif action == "ask":
            # A typed question from the overlay's input box.
            question = str((data or {}).get("text", "")).strip()
            if question and not self._answering:
                log.info("Ask: %s", question)
                asyncio.create_task(self._answer(question=question))
        elif action == "analyze_screen":
            # Cmd+/ — answer from the OCR context that the background loop
            # keeps fresh in memory, so no new scan is needed.
            if self._answering:
                return
            screen = (self._ocr_context or "").strip()
            if len(screen) < 40:
                log.warning("analyze_screen: OCR context too small (%d chars) — "
                            "grant Screen Recording permission?", len(screen))
                asyncio.create_task(self.server.broadcast({
                    "type": "answer_start", "id": "ocr-warn"}))
                asyncio.create_task(self.server.broadcast({
                    "type": "token", "id": "ocr-warn",
                    "text": ("I can't read your screen yet. macOS needs Screen "
                             "Recording permission for HireSky to capture app "
                             "windows (System Settings > Privacy & Security > "
                             "Screen Recording), and Tesseract must be installed "
                             "(brew install tesseract). Once granted, the backend "
                             "log will show 'OCR captured N chars' with your "
                             "screen text, then Cmd+/ will work.")}))
                asyncio.create_task(self.server.broadcast({
                    "type": "answer_end", "id": "ocr-warn"}))
                return
            log.info("Analyze screen (%d chars of OCR context)", len(screen))
            asyncio.create_task(self._answer(question=(
                "Analyze the content in [On-screen text] and respond per your "
                "SCREEN ANALYSIS instructions: solve a coding problem with the "
                "full coding format, answer an interview question as me, explain "
                "documentation, or diagnose an error and suggest fixes."
            )))


    # -- transcript / triggering ----------------------------------------
    def _rolling_transcript(self) -> str:
        return " ".join(self._transcript)[-self.cfg.llm.context_chars:]

    async def _handle_utterance(self, text: str, speaker: str = "them") -> None:
        if not text or not self._listening:
            return
        # Keep speaker-labeled context so the LLM knows who said what.
        self._transcript.append(f"[{speaker}] {text}")
        self._pending_chars += len(text)
        # Merge into the structured conversation (chat-style messages).
        await self.conversation.add_final(speaker, text)
        log.info("Transcript [%s]: %s", speaker, text)

        # Answer when the other party finishes a turn (that's when you need a
        # cue), or when enough new speech has piled up — never while answering.
        should_answer = not self._answering and (
            speaker == "them" or self._pending_chars >= self.cfg.llm.trigger_chars
        )
        if should_answer:
            self._pending_chars = 0
            asyncio.create_task(self._answer())

    async def _answer(self, question: str | None = None) -> None:
        if self._answering:
            return
        self._answering = True
        self._answer_seq += 1
        resp_id = f"resp-{self._answer_seq}"
        
        if not self.cfg.llm.system_prompt:
            log.warning("No system prompt configured. Aborting answer.")
            try:
                await self.server.broadcast({"type": "answer_start", "id": resp_id})
                await self.server.broadcast({
                    "type": "token",
                    "text": "You haven't added any prompt. Please add the prompt in the Dashboard first.",
                    "id": resp_id
                })
                await self.server.broadcast({"type": "answer_end", "id": resp_id})
            except Exception:
                pass
            finally:
                self._answering = False
            return

        transcript = self._rolling_transcript()
        if question:
            transcript += f"\n\n[User asks you directly] {question}\nAnswer this question."
        try:
            if self._llm is None:
                self._llm = _MockStreamer() if self.demo else GeminiStreamer(self.cfg)
            await self.server.broadcast({"type": "answer_start", "id": resp_id})
            async for token in self._llm.stream(
                transcript, self._ocr_context
            ):
                await self.server.broadcast(
                    {"type": "token", "text": token, "id": resp_id}
                )
            await self.server.broadcast({"type": "answer_end", "id": resp_id})
        finally:
            self._answering = False

    # -- audio pipeline (one loop per source) ---------------------------
    async def _source_loop(self, source) -> None:
        """Capture + segment + transcribe a single source, tagged by speaker."""
        capture = AudioCapture(self.cfg.audio, device_substr=source.device)
        segmenter = UtteranceSegmenter(self.cfg.audio, self.cfg.vad)

        try:
            capture.start()
        except AudioUnavailable as exc:
            log.error("[%s] audio unavailable: %s", source.name, exc)
            await self.server.broadcast(
                {"type": "status", "text": f"{source.name}: {exc}"}
            )
            return

        await self.server.broadcast({"type": "status", "text": "listening"})

        # Emit a live (partial) transcript roughly every ~700 ms while talking,
        # then a final one when the utterance ends. Interim runs are skipped
        # when the transcriber is already busy so they never pile up.
        interim_frames = max(1, int(700 / self.cfg.audio.block_ms))
        since_interim = 0
        try:
            async for frame in capture.frames():
                if not self._listening:
                    continue
                utterance = segmenter.push(frame)

                if segmenter.in_speech:
                    since_interim += 1
                    if since_interim >= interim_frames and not self._transcriber.busy:
                        since_interim = 0
                        partial = segmenter.buffer_bytes()
                        text = await self._transcriber.transcribe(partial)
                        if text:
                            # Live update of the active chat message. This also
                            # triggers the speaker switch the moment the other
                            # party starts talking.
                            await self.conversation.add_partial(source.name, text)

                if utterance is not None:
                    since_interim = 0
                    text = await self._transcriber.transcribe(utterance)
                    log.debug("[%s] final utterance %d bytes -> %r",
                              source.name, len(utterance), text)
                    await self._handle_utterance(text, source.name)
        finally:
            capture.stop()

    # -- OCR loop --------------------------------------------------------
    async def _ocr_loop(self) -> None:
        ocr = ScreenOcr(self.cfg.ocr)
        async for text in ocr.snapshots():
            self._ocr_context = text
            await self.server.broadcast({"type": "ocr", "text": text[:400]})
            # INFO so you can confirm in the terminal what the screen capture
            # actually sees. If this stays empty / tiny while a real window is
            # on screen, Screen Recording permission is almost certainly the
            # cause (macOS excludes app windows from capture without it).
            log.info("OCR captured %d chars: %r", len(text), text[:80])

    # -- demo mode -------------------------------------------------------
    async def _demo_audio_loop(self) -> None:
        """Feed scripted utterances so the overlay + streaming can be tested."""
        await self.server.broadcast({"type": "status", "text": "demo mode"})
        script = [
            ("them", "So tell me about a time you had to debug a really tricky production issue."),
            ("you", "Sure — we were seeing intermittent 500s under load but only in one region."),
            ("them", "How would you design a rate limiter for a public API?"),
            ("you", "I'd start with a token-bucket per client key stored in Redis."),
        ]
        await asyncio.sleep(1.0)
        for speaker, line in script:
            await self._handle_utterance(line, speaker)
            # Force an answer after each interviewer turn so the stream shows.
            self._pending_chars = 0
            if speaker == "them":
                await self._answer()
            await asyncio.sleep(2.0)
        await self.server.broadcast({"type": "status", "text": "demo complete"})
