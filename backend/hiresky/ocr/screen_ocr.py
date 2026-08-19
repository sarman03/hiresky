"""Periodic screen-region capture + Tesseract OCR.

Grabs a user-defined rectangle with ``mss`` on an interval, runs it through
``pytesseract``, and yields de-duplicated text so the LLM gets fresh visual
context (code on screen, a shared doc, a whiteboard) without spamming identical
frames.

Degrades gracefully: if ``mss``/``pytesseract``/Tesseract are missing, the
capture loop logs once and idles instead of crashing the orchestrator.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

from ..config import OcrConfig

log = logging.getLogger("hiresky.ocr")

try:
    import mss
    import pytesseract
    from PIL import Image

    _HAVE_OCR = True
except Exception as exc:  # pragma: no cover - environment dependent
    _HAVE_OCR = False
    _IMPORT_ERROR = exc


class ScreenOcr:
    """Async source of OCR text snapshots from a screen region."""

    def __init__(self, cfg: OcrConfig) -> None:
        self.cfg = cfg
        self._last_text: str = ""

    def _region_dict(self) -> dict:
        r = self.cfg.region
        return {"left": r.left, "top": r.top, "width": r.width, "height": r.height}

    def _capture_once(self) -> Optional[str]:
        with mss.mss() as sct:
            region = self._region_dict()
            if region["width"] <= 0 or region["height"] <= 0:
                region = sct.monitors[self.cfg.monitor]  # full monitor
            shot = sct.grab(region)
            img = Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")
        # Light pre-processing improves OCR on UI text.
        img = img.convert("L")
        text = pytesseract.image_to_string(img)
        return text.strip()

    async def snapshots(self):
        """Async generator yielding new OCR text roughly every ``interval_s``."""
        if not self.cfg.enabled:
            return
        if not _HAVE_OCR:
            log.warning("OCR dependencies unavailable (%r) — OCR disabled", _IMPORT_ERROR)
            return

        loop = asyncio.get_event_loop()
        while True:
            try:
                text = await loop.run_in_executor(None, self._capture_once)
            except Exception:
                log.exception("OCR capture failed")
                text = None

            if text and len(text) >= self.cfg.min_chars and text != self._last_text:
                self._last_text = text
                yield text
            await asyncio.sleep(self.cfg.interval_s)
