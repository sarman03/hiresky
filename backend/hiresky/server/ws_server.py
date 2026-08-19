"""WebSocket broadcast server.

Overlays connect and receive a stream of JSON events. Message envelope:

    {"type": "transcript",   "text": "...", "ts": 1720000000.0}
    {"type": "token",        "text": "wo",  "id": "resp-3"}
    {"type": "answer_start", "id": "resp-3"}
    {"type": "answer_end",   "id": "resp-3"}
    {"type": "ocr",          "text": "...", "ts": ...}
    {"type": "status",       "text": "listening"}

The server is a simple fan-out broadcaster: the orchestrator calls
``broadcast(event)`` and every connected client receives it. Clients may send
``{"type": "ping"}`` and receive ``{"type": "pong"}``.
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any

import websockets
from websockets.server import WebSocketServerProtocol

from ..config import ServerConfig

log = logging.getLogger("hiresky.server")


class OverlayServer:
    def __init__(self, cfg: ServerConfig) -> None:
        self.cfg = cfg
        self._clients: set[WebSocketServerProtocol] = set()
        self._server = None
        # Optional callback(action: str) for control commands from overlays.
        self.command_handler = None

    async def _handler(self, ws: WebSocketServerProtocol) -> None:
        self._clients.add(ws)
        peer = getattr(ws, "remote_address", "?")
        log.info("Overlay connected: %s (%d total)", peer, len(self._clients))
        await self._send(ws, {"type": "status", "text": "connected"})
        try:
            async for raw in ws:
                await self._on_message(ws, raw)
        except websockets.ConnectionClosed:
            pass
        finally:
            self._clients.discard(ws)
            log.info("Overlay disconnected: %s (%d left)", peer, len(self._clients))

    async def _on_message(self, ws: WebSocketServerProtocol, raw: str) -> None:
        try:
            msg = json.loads(raw)
        except json.JSONDecodeError:
            return
        mtype = msg.get("type")
        if mtype == "ping":
            await self._send(ws, {"type": "pong", "ts": time.time()})
        elif mtype == "cmd" and self.command_handler is not None:
            try:
                self.command_handler(str(msg.get("action", "")), msg)
            except Exception:
                log.exception("command handler failed")

    async def _send(self, ws: WebSocketServerProtocol, event: dict[str, Any]) -> None:
        try:
            await ws.send(json.dumps(event))
        except websockets.ConnectionClosed:
            self._clients.discard(ws)

    async def broadcast(self, event: dict[str, Any]) -> None:
        """Send an event to every connected overlay."""
        if not self._clients:
            return
        event.setdefault("ts", time.time())
        payload = json.dumps(event)
        dead: list[WebSocketServerProtocol] = []
        for ws in list(self._clients):
            try:
                await ws.send(payload)
            except websockets.ConnectionClosed:
                dead.append(ws)
        for ws in dead:
            self._clients.discard(ws)

    async def start(self) -> None:
        self._server = await websockets.serve(
            self._handler, self.cfg.host, self.cfg.port, ping_interval=20
        )
        log.info("WebSocket server listening on ws://%s:%d", self.cfg.host, self.cfg.port)

    async def stop(self) -> None:
        if self._server is not None:
            self._server.close()
            await self._server.wait_closed()
