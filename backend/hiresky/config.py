"""Configuration loading and typed access.

Loads ``config.yaml`` (falling back to ``config.example.yaml``) and overlays
environment variables from ``.env``. Exposes a nested-dataclass ``Config`` so
the rest of the codebase gets attribute access and IDE completion instead of
dict spelunking.
"""
from __future__ import annotations

import os
import typing
from dataclasses import dataclass, field, fields, is_dataclass
from pathlib import Path
from typing import Any, Optional

import yaml
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent


@dataclass
class AudioSource:
    """One capture channel.

    ``name`` is the speaker label shown in the chat overlay ("you" for your
    mic, "them" for the system/meeting loopback). ``device`` is a case-
    insensitive substring matched against the device names printed by
    ``run.py --list-devices``.
    """
    name: str = "them"
    device: str = "BlackHole"
    enabled: bool = True


@dataclass
class AudioConfig:
    sample_rate: int = 16000
    channels: int = 1
    block_ms: int = 30
    # Backwards-compatible single-device field. If ``sources`` is empty this is
    # used as the sole "them" source.
    input_device: str = "BlackHole"
    sources: list[AudioSource] = field(
        default_factory=lambda: [
            AudioSource(name="them", device="BlackHole", enabled=True),
            AudioSource(name="you", device="MacBook", enabled=True),
        ]
    )

    def active_sources(self) -> list["AudioSource"]:
        """Resolved list of enabled sources (falls back to ``input_device``)."""
        srcs = [s for s in self.sources if s.enabled]
        if srcs:
            return srcs
        return [AudioSource(name="them", device=self.input_device, enabled=True)]


@dataclass
class VadConfig:
    aggressiveness: int = 2
    silence_ms: int = 700
    min_utterance_ms: int = 400


@dataclass
class TranscriptionConfig:
    backend: str = "faster-whisper"   # "faster-whisper" or "gemini"
    model: str = "base.en"
    device: str = "auto"
    compute_type: str = "int8"
    language: str = "en"


@dataclass
class OcrRegion:
    left: int = 0
    top: int = 0
    width: int = 1280
    height: int = 800


@dataclass
class OcrConfig:
    enabled: bool = True
    interval_s: float = 4.0
    region: OcrRegion = field(default_factory=OcrRegion)
    min_chars: int = 12
    monitor: int = 1


@dataclass
class LlmConfig:
    model: str = "gemini-3.1-flash-lite"
    temperature: float = 0.3
    max_tokens: int = 400
    system_prompt: str = ""
    candidate_info: str = ""
    trigger_chars: int = 160
    context_chars: int = 4000


@dataclass
class ServerConfig:
    host: str = "127.0.0.1"
    port: int = 8765


@dataclass
class LoggingConfig:
    level: str = "INFO"


@dataclass
class Config:
    audio: AudioConfig = field(default_factory=AudioConfig)
    vad: VadConfig = field(default_factory=VadConfig)
    transcription: TranscriptionConfig = field(default_factory=TranscriptionConfig)
    ocr: OcrConfig = field(default_factory=OcrConfig)
    llm: LlmConfig = field(default_factory=LlmConfig)
    server: ServerConfig = field(default_factory=ServerConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)

    # Secret, sourced from environment only.
    gemini_api_key: Optional[str] = None


def _from_dict(cls: type, data: dict[str, Any]) -> Any:
    """Recursively build a dataclass from a plain dict, ignoring unknown keys.

    Resolves annotations via ``get_type_hints`` because ``from __future__
    import annotations`` stores ``field.type`` as a string, not the class.
    """
    hints = typing.get_type_hints(cls)
    kwargs: dict[str, Any] = {}
    for f in fields(cls):
        if f.name not in data or data[f.name] is None:
            continue
        value = data[f.name]
        ftype = hints.get(f.name, f.type)
        origin = typing.get_origin(ftype)
        if is_dataclass(ftype) and isinstance(value, dict):
            kwargs[f.name] = _from_dict(ftype, value)
        elif origin in (list, typing.List) and isinstance(value, list):
            args = typing.get_args(ftype)
            item_type = args[0] if args else Any
            if is_dataclass(item_type):
                kwargs[f.name] = [
                    _from_dict(item_type, v) if isinstance(v, dict) else v
                    for v in value
                ]
            else:
                kwargs[f.name] = value
        else:
            kwargs[f.name] = value
    return cls(**kwargs)


def load_config(path: Optional[str | Path] = None) -> Config:
    """Load configuration from YAML + environment.

    Resolution order for the YAML file: explicit ``path`` -> ``config.yaml``
    -> ``config.example.yaml``.
    """
    load_dotenv(BACKEND_DIR / ".env")

    if path is not None:
        yaml_path = Path(path)
    else:
        yaml_path = BACKEND_DIR / "config.yaml"
        if not yaml_path.exists():
            yaml_path = BACKEND_DIR / "config.example.yaml"

    data: dict[str, Any] = {}
    if yaml_path.exists():
        with open(yaml_path, "r", encoding="utf-8") as fh:
            data = yaml.safe_load(fh) or {}

    cfg = _from_dict(Config, data)

    # Secrets / overrides from environment.
    cfg.gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if host := os.environ.get("HIRESKY_WS_HOST"):
        cfg.server.host = host
    if port := os.environ.get("HIRESKY_WS_PORT"):
        cfg.server.port = int(port)

    return cfg
