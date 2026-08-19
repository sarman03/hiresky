"""Voice Activity Detection — segment the PCM stream into utterances.

Consumes fixed-size frames (10/20/30 ms at 16 kHz mono, 16-bit) and emits a
complete utterance (concatenated PCM bytes) once trailing silence exceeds
``silence_ms``. Short blips below ``min_utterance_ms`` are discarded.

Uses ``webrtcvad`` if present; otherwise falls back to a simple RMS energy gate
so the pipeline still runs (with lower accuracy) on machines without the native
extension.
"""
from __future__ import annotations

import logging

import numpy as np

from ..config import AudioConfig, VadConfig

log = logging.getLogger("hiresky.audio.vad")

try:
    import webrtcvad

    _HAVE_WEBRTC = True
except Exception:  # pragma: no cover - environment dependent
    webrtcvad = None  # type: ignore
    _HAVE_WEBRTC = False


class _EnergyVad:
    """RMS-threshold fallback when webrtcvad is unavailable."""

    def __init__(self, threshold: float = 500.0) -> None:
        self.threshold = threshold

    def is_speech(self, frame: bytes, sample_rate: int) -> bool:  # noqa: D401
        samples = np.frombuffer(frame, dtype=np.int16).astype(np.float32)
        if samples.size == 0:
            return False
        rms = float(np.sqrt(np.mean(samples**2)))
        return rms > self.threshold


class UtteranceSegmenter:
    """Groups speech frames into utterances using a silence hangover."""

    def __init__(self, audio_cfg: AudioConfig, vad_cfg: VadConfig) -> None:
        self.sample_rate = audio_cfg.sample_rate
        self.block_ms = audio_cfg.block_ms
        self.silence_frames = max(1, vad_cfg.silence_ms // audio_cfg.block_ms)
        self.min_frames = max(1, vad_cfg.min_utterance_ms // audio_cfg.block_ms)

        if _HAVE_WEBRTC:
            self._vad = webrtcvad.Vad(vad_cfg.aggressiveness)
            self._use_webrtc = True
        else:
            log.warning("webrtcvad unavailable — using RMS energy fallback")
            self._vad = _EnergyVad()
            self._use_webrtc = False

        self._buffer: list[bytes] = []
        self._silence_run = 0
        self._in_speech = False

    def _is_speech(self, frame: bytes) -> bool:
        try:
            if self._use_webrtc:
                return self._vad.is_speech(frame, self.sample_rate)
            return self._vad.is_speech(frame, self.sample_rate)
        except Exception:
            return False

    @property
    def in_speech(self) -> bool:
        """True while an utterance is being accumulated (someone is talking)."""
        return self._in_speech

    def buffer_bytes(self) -> bytes:
        """Current in-progress utterance PCM (for interim transcription)."""
        return b"".join(self._buffer)

    def push(self, frame: bytes) -> bytes | None:
        """Feed one frame. Returns full utterance PCM bytes when one completes."""
        speech = self._is_speech(frame)

        if speech:
            self._in_speech = True
            self._silence_run = 0
            self._buffer.append(frame)
            return None

        if self._in_speech:
            self._buffer.append(frame)  # keep trailing silence for natural cut
            self._silence_run += 1
            if self._silence_run >= self.silence_frames:
                return self._flush()
        return None

    def _flush(self) -> bytes | None:
        frames = self._buffer
        self._buffer = []
        self._silence_run = 0
        self._in_speech = False
        if len(frames) < self.min_frames:
            return None
        return b"".join(frames)
