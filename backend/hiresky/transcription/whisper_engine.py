"""Whisper transcription.

Two interchangeable backends selected by ``transcription.backend`` in config:

* ``faster-whisper`` — local CTranslate2 model, no network, low latency.
* ``gemini``         — Gemini audio transcription via the API.

Both expose the same ``transcribe(pcm_bytes) -> str`` coroutine. Transcription
runs in a thread executor so it never blocks the asyncio event loop.
"""
from __future__ import annotations

import asyncio
import io
import logging
import wave
from typing import Optional

import numpy as np

from ..config import Config

log = logging.getLogger("hiresky.transcription")


def _pcm_to_wav_bytes(pcm: bytes, sample_rate: int) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(pcm)
    return buf.getvalue()


class Transcriber:
    """Facade over the configured Whisper backend."""

    def __init__(self, cfg: Config) -> None:
        self.cfg = cfg
        self.sample_rate = cfg.audio.sample_rate
        self.backend = cfg.transcription.backend if hasattr(cfg, "transcription") else "faster-whisper"
        self._model = None
        self._openai = None
        # Serialize model access: multiple audio sources share one Transcriber
        # and the underlying model is not safe for concurrent inference.
        self._lock = asyncio.Lock()
        self._load()

    # -- loading ---------------------------------------------------------
    def _load(self) -> None:
        tc = getattr(self.cfg, "transcription", None)
        backend = getattr(tc, "backend", "faster-whisper") if tc else "faster-whisper"
        self.backend = backend

        if backend == "faster-whisper":
            from faster_whisper import WhisperModel

            device = tc.device
            if device == "auto":
                device = "cpu"
                try:
                    import torch  # noqa: F401

                    if torch.cuda.is_available():
                        device = "cuda"
                except Exception:
                    pass
            log.info("Loading faster-whisper model %s on %s", tc.model, device)
            self._model = WhisperModel(
                tc.model, device=device, compute_type=tc.compute_type
            )
        elif backend == "gemini":
            if not self.cfg.gemini_api_key:
                log.warning("GEMINI_API_KEY is not set — Gemini transcription calls will fail")
            log.info("Using Gemini API transcription backend")
        else:
            raise ValueError(f"Unknown transcription backend: {backend!r}")

    # -- inference -------------------------------------------------------
    def _transcribe_sync(self, pcm: bytes) -> str:
        tc = self.cfg.transcription
        if self.backend == "faster-whisper":
            audio = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
            segments, _ = self._model.transcribe(
                audio,
                language=tc.language,
                beam_size=1,          # greedy = lowest latency
                vad_filter=False,     # our own VAD already segmented
            )
            return " ".join(s.text.strip() for s in segments).strip()

        # gemini backend
        wav = _pcm_to_wav_bytes(pcm, self.sample_rate)
        import json
        import urllib.request
        import base64

        base64_audio = base64.b64encode(wav).decode("utf-8")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.cfg.gemini_api_key}"
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "inlineData": {
                                "mimeType": "audio/wav",
                                "data": base64_audio
                            }
                        },
                        {
                            "text": "Transcribe the audio exactly. Output only the transcription, nothing else. If there is no speech, output empty string."
                        }
                    ]
                }
            ]
        }
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                parts = res_data["candidates"][0]["content"]["parts"]
                text = "".join(p.get("text", "") for p in parts)
                return text.strip()
        except Exception:
            log.exception("Gemini transcription API call failed")
            return ""

    @property
    def busy(self) -> bool:
        """True while a transcription is in flight (used to skip interim runs)."""
        return self._lock.locked()

    async def transcribe(self, pcm: bytes) -> str:
        """Transcribe one utterance's PCM bytes to text (off the event loop)."""
        if not pcm:
            return ""
        loop = asyncio.get_event_loop()
        try:
            async with self._lock:
                return await loop.run_in_executor(None, self._transcribe_sync, pcm)
        except Exception:  # pragma: no cover
            log.exception("Transcription failed")
            return ""
