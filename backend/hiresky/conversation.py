"""Conversation-aware transcript processing.

Turns raw utterances/partials from the audio pipeline into structured chat
messages, the way a messenger renders a dialogue:

* One *active message* at a time, owned by the current speaker.
* New fragments from the same speaker are **merged** into the active message
  (no new bubble per utterance).
* A **speaker switch** finalizes the active message immediately and starts a
  new one for the other speaker.
* **Silence >= finalize_silence_s** (default 30 s) finalizes the active
  message; the next speech starts a brand-new bubble.

Emitted events (over the WebSocket broadcast):

    {"type": "conversation", "id": "msg-3", "speaker": "interviewer",
     "status": "streaming", "text": "Tell me about yourself..."}

    {"type": "conversation", "id": "msg-3", "speaker": "interviewer",
     "status": "completed", "text": "Tell me about yourself. Can you also
      explain your recent project?"}

``speaker`` is "interviewer" (the meeting/system audio) or "you" (your mic).
"""
from __future__ import annotations

import asyncio
import logging
import time

log = logging.getLogger("hiresky.conversation")


class ConversationManager:
    def __init__(self, server, finalize_silence_s: float = 30.0) -> None:
        self.server = server
        self.finalize_silence_s = finalize_silence_s

        self._seq = 0
        self._speaker: str | None = None    # "you" | "interviewer"
        self._id: str | None = None
        self._committed = ""                # merged, VAD-final fragments
        self._partial = ""                  # live interim tail (replaced often)
        self._last_activity = 0.0

    @staticmethod
    def _label(source_name: str) -> str:
        return "you" if source_name == "you" else "interviewer"

    # -- public API (called from the audio loops) ------------------------

    async def add_partial(self, source_name: str, text: str) -> None:
        """Live interim text while the speaker is still talking."""
        if not text:
            return
        await self._ensure_active(self._label(source_name))
        self._partial = text
        self._last_activity = time.time()
        await self._emit("streaming")

    async def add_final(self, source_name: str, text: str) -> None:
        """A VAD-final utterance — merge it into the active message."""
        if not text:
            return
        await self._ensure_active(self._label(source_name))
        self._committed = f"{self._committed} {text}".strip()
        self._partial = ""
        self._last_activity = time.time()
        await self._emit("streaming")

    async def finalize(self) -> None:
        """Close the active message and broadcast it as completed."""
        if self._speaker is None:
            return
        text = f"{self._committed} {self._partial}".strip()
        if text:
            await self.server.broadcast({
                "type": "conversation",
                "id": self._id,
                "speaker": self._speaker,
                "status": "completed",
                "text": text,
            })
            log.info("Finalized [%s] %s: %r", self._id, self._speaker, text[:80])
        self._speaker = None
        self._id = None
        self._committed = ""
        self._partial = ""

    async def watchdog(self) -> None:
        """Finalize the active message after a long silence (30 s default)."""
        while True:
            await asyncio.sleep(2.0)
            if (
                self._speaker is not None
                and (time.time() - self._last_activity) >= self.finalize_silence_s
            ):
                log.info("Silence >= %.0fs — finalizing active message",
                         self.finalize_silence_s)
                await self.finalize()

    # -- internals --------------------------------------------------------

    async def _ensure_active(self, speaker: str) -> None:
        """Open a message for ``speaker``, closing the previous one if the
        speaker changed or the silence window elapsed."""
        now = time.time()
        if self._speaker is not None:
            switched = speaker != self._speaker
            stale = (now - self._last_activity) >= self.finalize_silence_s
            if switched or stale:
                await self.finalize()
        if self._speaker is None:
            self._seq += 1
            self._speaker = speaker
            self._id = f"msg-{self._seq}"
            self._committed = ""
            self._partial = ""
            self._last_activity = now

    async def _emit(self, status: str) -> None:
        text = f"{self._committed} {self._partial}".strip()
        if not text:
            return
        await self.server.broadcast({
            "type": "conversation",
            "id": self._id,
            "speaker": self._speaker,
            "status": status,
            "text": text,
        })
