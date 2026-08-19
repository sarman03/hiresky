"""System-audio (loopback) capture.

Wraps ``sounddevice`` to pull mono 16-bit PCM frames off a loopback device and
push them onto an ``asyncio.Queue`` as raw ``bytes``. The device is matched by
name substring so users can put e.g. ``"BlackHole"`` in config without knowing
the exact index.

If ``sounddevice`` / PortAudio is unavailable (headless CI, no audio backend),
``AudioCapture`` degrades gracefully: :func:`list_devices` returns an empty
list and :func:`start` raises a clear :class:`AudioUnavailable`.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

import numpy as np

from ..config import AudioConfig

log = logging.getLogger("hiresky.audio.capture")

try:
    import sounddevice as sd

    _HAVE_SD = True
except Exception as exc:  # pragma: no cover - environment dependent
    sd = None  # type: ignore
    _HAVE_SD = False
    _IMPORT_ERROR = exc


class AudioUnavailable(RuntimeError):
    """Raised when no usable audio backend / device is present."""


def list_devices() -> list[dict]:
    """Return input-capable devices as ``{index, name, channels, rate}`` dicts."""
    if not _HAVE_SD:
        return []
    devices = []
    for idx, dev in enumerate(sd.query_devices()):
        if dev.get("max_input_channels", 0) > 0:
            devices.append(
                {
                    "index": idx,
                    "name": dev["name"],
                    "channels": dev["max_input_channels"],
                    "rate": int(dev["default_samplerate"]),
                }
            )
    return devices


def _resolve_device(name_substr: str) -> Optional[int]:
    """Find the first input device whose name contains ``name_substr``."""
    for dev in list_devices():
        if name_substr.lower() in dev["name"].lower():
            return dev["index"]
    return None


class AudioCapture:
    """Streams fixed-size PCM frames from one device into a queue.

    ``device_substr`` is matched (case-insensitively) against device names, so
    each source (your mic, or the system loopback) gets its own capture.
    """

    def __init__(self, cfg: AudioConfig, device_substr: Optional[str] = None) -> None:
        self.cfg = cfg
        self.device_substr = device_substr if device_substr is not None else cfg.input_device
        self.target_rate = cfg.sample_rate                       # 16 kHz for Whisper/VAD
        self.block_ms = cfg.block_ms
        # Exact frame the VAD expects: 30 ms of 16 kHz 16-bit mono = 480 samples.
        self.target_frame_samples = int(self.target_rate * self.block_ms / 1000)
        self.frame_bytes = self.target_frame_samples * 2
        self.queue: "asyncio.Queue[bytes]" = asyncio.Queue(maxsize=200)
        self._stream = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._capture_rate = self.target_rate
        # Rolling buffer of resampled 16 kHz int16 samples, sliced into frames.
        self._out_buf = np.zeros(0, dtype=np.int16)

    def _resample_to_target(self, x: "np.ndarray") -> "np.ndarray":
        """Linear-resample float32 mono from capture rate to target rate."""
        if self._capture_rate == self.target_rate or x.size == 0:
            return x
        ratio = self.target_rate / self._capture_rate
        n_out = int(round(x.size * ratio))
        if n_out <= 0:
            return np.zeros(0, dtype=np.float32)
        idx = np.linspace(0.0, x.size - 1, n_out)
        return np.interp(idx, np.arange(x.size), x).astype(np.float32)

    def _callback(self, indata, frames, time_info, status) -> None:  # noqa: ANN001
        """PortAudio thread callback — resample, reframe, hand to the loop."""
        if status:
            log.debug("audio status: %s", status)
        mono = indata[:, 0] if indata.ndim > 1 else indata[:]
        resampled = self._resample_to_target(np.asarray(mono, dtype=np.float32))
        pcm16 = np.clip(resampled * 32768.0, -32768, 32767).astype(np.int16)
        if self._loop is not None:
            self._loop.call_soon_threadsafe(self._push_samples, pcm16)

    def _push_samples(self, pcm16: "np.ndarray") -> None:
        """Accumulate resampled samples and emit exact-size 16 kHz frames."""
        self._out_buf = (
            np.concatenate([self._out_buf, pcm16]) if self._out_buf.size else pcm16
        )
        fs = self.target_frame_samples
        while self._out_buf.size >= fs:
            self._enqueue(self._out_buf[:fs].tobytes())
            self._out_buf = self._out_buf[fs:]

    def _enqueue(self, data: bytes) -> None:
        try:
            self.queue.put_nowait(data)
        except asyncio.QueueFull:
            # Drop oldest to stay real-time.
            try:
                self.queue.get_nowait()
                self.queue.put_nowait(data)
            except asyncio.QueueEmpty:
                pass

    def start(self) -> None:
        if not _HAVE_SD:
            raise AudioUnavailable(
                f"sounddevice/PortAudio not available: {_IMPORT_ERROR!r}"
            )
        device = _resolve_device(self.device_substr)
        if device is None:
            available = ", ".join(d["name"] for d in list_devices()) or "<none>"
            raise AudioUnavailable(
                f"No input device matching {self.device_substr!r}. "
                f"Available: {available}"
            )

        self._loop = asyncio.get_event_loop()

        # Capture at the device's native rate (BlackHole / built-in mic are
        # usually 48 kHz). Forcing 16 kHz on a 48 kHz device makes CoreAudio
        # deliver wrong-sized buffers, which webrtcvad then rejects — so we
        # capture native and resample to 16 kHz ourselves.
        try:
            info = sd.query_devices(device)
            self._capture_rate = int(info.get("default_samplerate") or self.target_rate)
        except Exception:
            self._capture_rate = self.target_rate
        if self._capture_rate <= 0:
            self._capture_rate = self.target_rate

        self._out_buf = np.zeros(0, dtype=np.int16)
        block = int(self._capture_rate * self.block_ms / 1000)
        self._stream = sd.InputStream(
            samplerate=self._capture_rate,
            blocksize=block,
            device=device,
            channels=1,
            dtype="float32",
            callback=self._callback,
        )
        self._stream.start()
        log.info(
            "Audio capture started: device[%s] %r  capture=%d Hz -> target=%d Hz",
            device,
            self.device_substr,
            self._capture_rate,
            self.target_rate,
        )

    def stop(self) -> None:
        if self._stream is not None:
            self._stream.stop()
            self._stream.close()
            self._stream = None
            log.info("Audio capture stopped")

    async def frames(self):
        """Async generator yielding PCM frames as they arrive."""
        while True:
            yield await self.queue.get()
