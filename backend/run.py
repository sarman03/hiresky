#!/usr/bin/env python3
"""HireSky backend entrypoint.

Usage:
    python run.py                 # run the full pipeline from config.yaml
    python run.py --demo          # scripted input, no audio/OCR/ML deps needed
    python run.py --list-devices  # print input devices and exit
    python run.py --config path   # use a specific config file
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import signal

from hiresky.audio.capture import list_devices
from hiresky.config import load_config
from hiresky.orchestrator import Orchestrator


def _setup_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s  %(levelname)-7s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )


def _print_devices() -> None:
    devices = list_devices()
    if not devices:
        print("No input devices found (is PortAudio/sounddevice installed?).")
        return
    print("Available input devices:")
    for d in devices:
        print(f"  [{d['index']:>2}] {d['name']}  ({d['channels']} ch, {d['rate']} Hz)")


async def _main_async(args: argparse.Namespace) -> None:
    cfg = load_config(args.config)
    _setup_logging(cfg.logging.level)
    log = logging.getLogger("hiresky")

    if not args.demo and not cfg.gemini_api_key:
        log.warning("GEMINI_API_KEY not set — LLM answers will error. Use --demo to test transport only.")

    orch = Orchestrator(cfg, demo=args.demo)

    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, orch.stop)
        except NotImplementedError:  # Windows
            pass

    log.info("HireSky backend starting (demo=%s)", args.demo)
    await orch.run()
    log.info("HireSky backend stopped")


def main() -> None:
    parser = argparse.ArgumentParser(description="HireSky backend orchestrator")
    parser.add_argument("--demo", action="store_true", help="run with scripted input")
    parser.add_argument("--config", default=None, help="path to config.yaml")
    parser.add_argument("--list-devices", action="store_true", help="list audio input devices and exit")
    args = parser.parse_args()

    if args.list_devices:
        _print_devices()
        return

    try:
        asyncio.run(_main_async(args))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
