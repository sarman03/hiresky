"""Streaming Gemini chat client via OpenAI compatibility.

Given the rolling transcript + latest OCR context, streams a short assistant
completion token-by-token via an async generator so the WebSocket server can
forward each delta to the overlay the instant it arrives.
"""
from __future__ import annotations

import logging
from typing import AsyncIterator

from ..config import Config

log = logging.getLogger("hiresky.llm")


class GeminiStreamer:
    def __init__(self, cfg: Config) -> None:
        self.cfg = cfg
        from openai import AsyncOpenAI

        if not cfg.gemini_api_key:
            log.warning("GEMINI_API_KEY is not set — LLM calls will fail")
        self._client = AsyncOpenAI(
            api_key=cfg.gemini_api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )

    def _build_messages(self, transcript: str, ocr_context: str) -> list[dict]:
        ctx = self.cfg.llm.context_chars
        transcript = transcript[-ctx:]
        
        # Build the system instruction combining the active prompt and candidate profile
        system_content = []
        if self.cfg.llm.system_prompt:
            system_content.append(f"INSTRUCTIONS / ROLE:\n{self.cfg.llm.system_prompt}")
            
        candidate_info = getattr(self.cfg.llm, "candidate_info", "")
        if candidate_info:
            system_content.append(f"\n\nPREPARED CANDIDATE PROFILE:\n{candidate_info}\n\nAlways answer questions using this candidate profile and experience context.")
            
        system_prompt = "\n".join(system_content) if system_content else "You are HireSky, a concise real-time meeting copilot."
        
        user_parts = [f"[Live transcript]\n{transcript}"]
        if ocr_context:
            user_parts.append(f"\n\n[On-screen text]\n{ocr_context[-1500:]}")
            
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "".join(user_parts)},
        ]

    async def stream(self, transcript: str, ocr_context: str = "") -> AsyncIterator[str]:
        """Yield completion token deltas as they stream from the API."""
        messages = self._build_messages(transcript, ocr_context)
        try:
            stream = await self._client.chat.completions.create(
                model=self.cfg.llm.model,
                messages=messages,
                temperature=self.cfg.llm.temperature,
                max_tokens=self.cfg.llm.max_tokens,
                stream=True,
            )
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield delta.content
        except Exception:  # pragma: no cover - network dependent
            log.exception("Gemini streaming call failed")
            yield "[HireSky: LLM request failed — check API key / network]"
