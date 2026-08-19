#!/usr/bin/env python3
"""HireSky Zero-Dependency Backend.

Runs a WebSocket server using only Python's standard library.
Simulates a conversation (You/Them turns) and streams real Gemini API responses
using standard `urllib.request` (no `websockets`, `openai`, or other pip packages required).
"""

import asyncio
import base64
import hashlib
import json
import logging
import os
import socket
import struct
import sys
import threading
import time
import urllib.request
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger("hiresky.zerodep")

BACKEND_DIR = Path(__file__).resolve().parent

# --- 1. Load config and env manually ---

def load_env_file():
    env_path = BACKEND_DIR / ".env"
    if env_path.exists():
        log.info("Loading environment variables from %s", env_path)
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip().strip('"').strip("'")

def load_yaml_config():
    config = {
        "server": {"host": "127.0.0.1", "port": 8765},
        "llm": {
            "model": "gemini-3.1-flash-lite",
            "system_prompt": "You are a helpful, extremely concise technical interview copilot. Answer the interviewer's question or assist the candidate with a precise, brief answer."
        }
    }
    
    # Try reading config.yaml, then config.example.yaml
    config_path = BACKEND_DIR / "config.yaml"
    if not config_path.exists():
        config_path = BACKEND_DIR / "config.example.yaml"
        
    if config_path.exists():
        log.info("Parsing configuration from %s (basic parser)", config_path)
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                current_section = None
                for line in f:
                    line = line.split("#", 1)[0].strip()
                    if not line:
                        continue
                    if line.endswith(":"):
                        current_section = line[:-1].strip()
                    elif ":" in line:
                        k, v = line.split(":", 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if current_section == "server":
                            if k == "host": config["server"]["host"] = v
                            elif k == "port": config["server"]["port"] = int(v)
                        elif current_section == "llm":
                            if k == "model": config["llm"]["model"] = v
                            elif k == "system_prompt": config["llm"]["system_prompt"] = v
        except Exception as e:
            log.warning("Could not parse config file: %s. Using default ports/models.", e)
            
    return config

# --- 2. Gemini Streaming API via urllib.request ---

def fetch_gemini_stream_blocking(api_key, model, system_prompt, user_prompt, queue, loop):
    """Fetches Gemini streaming API responses in a background thread and pushes tokens to an asyncio Queue."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={api_key}"
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": user_prompt}
                ]
            }
        ],
        "systemInstruction": {
            "parts": [
                {"text": system_prompt}
            ]
        },
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 800
        }
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            for line in response:
                line = line.decode("utf-8").strip()
                if line.startswith("data:"):
                    data_str = line[5:].strip()
                    if not data_str:
                        continue
                    try:
                        chunk = json.loads(data_str)
                        candidates = chunk.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                text = parts[0].get("text", "")
                                if text:
                                    loop.call_soon_threadsafe(queue.put_nowait, text)
                    except Exception:
                        pass
    except Exception as e:
        log.error("Gemini API call failed: %s", e)
        loop.call_soon_threadsafe(queue.put_nowait, f"\n[Gemini API Stream Error: {e}]")
    finally:
        # Sentinel to signal end of stream
        loop.call_soon_threadsafe(queue.put_nowait, None)

async def stream_gemini_api(api_key, model, system_prompt, user_prompt):
    """Asynchronously stream Gemini tokens from the background thread generator."""
    queue = asyncio.Queue()
    loop = asyncio.get_running_loop()
    
    threading.Thread(
        target=fetch_gemini_stream_blocking,
        args=(api_key, model, system_prompt, user_prompt, queue, loop),
        daemon=True
    ).start()
    
    while True:
        token = await queue.get()
        if token is None:
            break
        yield token

# --- 3. Zero-dependency WebSocket Server ---

class ZeroDepWebSocketServer:
    def __init__(self, host='127.0.0.1', port=8765):
        self.host = host
        self.port = port
        self.clients = set()
        self.on_message_callback = None
        self.server = None

    async def start(self):
        self.server = await asyncio.start_server(
            self.handle_connection, self.host, self.port
        )
        log.info("WebSocket server listening on ws://%s:%d", self.host, self.port)

    async def stop(self):
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            log.info("WebSocket server stopped")

    async def handle_connection(self, reader, writer):
        # 1. Perform WebSocket handshake
        try:
            data = await reader.read(4096)
        except Exception:
            writer.close()
            return
            
        request = data.decode('utf-8', errors='ignore')
        
        headers = {}
        lines = request.split('\r\n')
        if not lines or 'GET' not in lines[0]:
            writer.close()
            return
            
        for line in lines[1:]:
            if ':' in line:
                k, v = line.split(':', 1)
                headers[k.strip().lower()] = v.strip()
                
        ws_key = headers.get('sec-websocket-key')
        if not ws_key:
            writer.close()
            return
            
        guid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
        accept = base64.b64encode(
            hashlib.sha1((ws_key + guid).encode('utf-8')).digest()
        ).decode('utf-8')
        
        handshake = (
            "HTTP/1.1 101 Switching Protocols\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Accept: {accept}\r\n\r\n"
        )
        writer.write(handshake.encode('utf-8'))
        await writer.drain()
        
        client = (reader, writer)
        self.clients.add(client)
        peer = writer.get_extra_info('peername')
        log.info("Client connected: %s (Total: %d)", peer, len(self.clients))
        
        # Send initial status messages
        await self.send_to_client(client, {"type": "status", "text": "connected"})
        await self.send_to_client(client, {"type": "status", "text": "listening"})

        try:
            while True:
                # Read 2-byte frame header
                header = await reader.readexactly(2)
                byte1, byte2 = header[0], header[1]
                
                fin = (byte1 & 0x80) != 0
                opcode = byte1 & 0x0F
                masked = (byte2 & 0x80) != 0
                payload_len = byte2 & 0x7F
                
                if opcode == 8:  # Connection close
                    break
                    
                if payload_len == 126:
                    ext_len = await reader.readexactly(2)
                    payload_len = struct.unpack(">H", ext_len)[0]
                elif payload_len == 127:
                    ext_len = await reader.readexactly(8)
                    payload_len = struct.unpack(">Q", ext_len)[0]
                    
                mask_key = b""
                if masked:
                    mask_key = await reader.readexactly(4)
                    
                payload = await reader.readexactly(payload_len)
                
                if masked:
                    unmasked = bytearray(payload_len)
                    for i in range(payload_len):
                        unmasked[i] = payload[i] ^ mask_key[i % 4]
                    payload = bytes(unmasked)
                    
                if opcode == 1:  # Text frame
                    msg_text = payload.decode('utf-8', errors='ignore')
                    if self.on_message_callback:
                        await self.on_message_callback(client, msg_text)
                elif opcode == 9:  # Ping
                    # Send Pong (opcode 10)
                    pong_frame = bytearray([0x8A, 0])
                    writer.write(pong_frame)
                    await writer.drain()
        except (asyncio.IncompleteReadError, ConnectionResetError):
            pass
        finally:
            self.clients.discard(client)
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass
            log.info("Client disconnected (Total: %d)", len(self.clients))

    async def send_to_client(self, client, message_dict):
        reader, writer = client
        payload_str = json.dumps(message_dict)
        payload_bytes = payload_str.encode('utf-8')
        length = len(payload_bytes)
        
        if length <= 125:
            header = bytes([0x81, length])
        elif length <= 65535:
            header = bytes([0x81, 126]) + struct.pack(">H", length)
        else:
            header = bytes([0x81, 127]) + struct.pack(">Q", length)
            
        try:
            writer.write(header + payload_bytes)
            await writer.drain()
        except Exception:
            self.clients.discard(client)

    async def broadcast(self, message_dict):
        if not self.clients:
            return
        tasks = [self.send_to_client(client, message_dict) for client in list(self.clients)]
        await asyncio.gather(*tasks, return_exceptions=True)

# --- 4. Orchestration & Conversation Simulator ---

class ZeroDepOrchestrator:
    def __init__(self, config):
        self.config = config
        self.server = ZeroDepWebSocketServer(
            host=config["server"]["host"],
            port=config["server"]["port"]
        )
        self.server.on_message_callback = self.handle_client_message
        self.listening = True
        self.answering = False
        self.transcript = []
        self.answer_seq = 0
        self.system_prompt = config["llm"]["system_prompt"]
        self.candidate_info = ""
        self.api_key = os.environ.get("GEMINI_API_KEY")
        
        # Simple test script for simulation
        self.demo_script = [
            ("interviewer", "Hello, thank you for joining today's session. Let's start with a quick question."),
            ("you", "Hi, glad to be here! Happy to answer."),
            ("interviewer", "Can you explain the difference between a process and a thread, and when you would use each?"),
            ("you", "Sure. A process has its own virtual memory space and resources, while multiple threads run inside a single process and share its memory. You use processes for isolation (e.g. multi-processing browser tabs) and threads for lighter concurrency where shared state is needed."),
            ("interviewer", "Excellent. How would you design a system to handle high read traffic with low latency?"),
            ("you", "I'd implement a multi-layered caching strategy. First, use a CDN for static assets at the edge. Second, add an in-memory cache like Redis or Memcached in front of the database. Third, read replicas for horizontal database scaling."),
        ]

    async def start(self):
        await self.server.start()
        
        if not self.api_key or self.api_key.startswith("AQ.Ab8RN"):
            log.warning("=" * 60)
            log.warning("GEMINI_API_KEY is missing or invalid in your .env file!")
            log.warning("Real LLM completions will fail. We will stream simulated answers instead.")
            log.warning("To get real answers, put your valid key in backend/.env")
            log.warning("=" * 60)

        # Start the simulated speech loop
        self.simulation_task = asyncio.create_task(self.run_conversation_simulation())

    async def stop(self):
        if hasattr(self, 'simulation_task'):
            self.simulation_task.cancel()
        await self.server.stop()

    async def handle_client_message(self, client, raw_msg):
        try:
            msg = json.loads(raw_msg)
        except json.JSONDecodeError:
            return
            
        action = msg.get("action")
        mtype = msg.get("type")
        
        if mtype == "ping":
            await self.server.send_to_client(client, {"type": "pong", "ts": time.time()})
        elif mtype == "cmd":
            if action == "toggle_listening":
                self.listening = not self.listening
                state = "listening" if self.listening else "paused"
                log.info("Listening state toggled to: %s", state)
                await self.server.broadcast({"type": "status", "text": state})
            elif action == "ask":
                question = msg.get("text", "").strip()
                if question and not self.answering:
                    log.info("User asked directly: %s", question)
                    asyncio.create_task(self.trigger_llm_response(question=question))
            elif action == "assist":
                if not self.answering:
                    log.info("Manual assist triggered")
                    asyncio.create_task(self.trigger_llm_response())

            elif action == "analyze_screen":
                if not self.answering:
                    log.info("Analyze screen request received")
                    # Send a mock screen analysis prompt
                    await self.server.broadcast({"type": "ocr", "text": "[On-screen Code Editor] \n\nfunction findTwoSum(nums, target) {\n  // OCR scan mock context\n}"})
                    asyncio.create_task(self.trigger_llm_response(question="Analyze the current screen and help me write the two-sum function optimally."))

    async def run_conversation_simulation(self):
        """Simulates a live interview session by sending You/Them utterances every few seconds."""
        await asyncio.sleep(2.0)
        
        # Message count to keep track of speech bubbles
        msg_seq = 0
        
        for speaker, text in self.demo_script:
            if not self.listening:
                # Wait until listening is resumed
                while not self.listening:
                    await asyncio.sleep(1.0)
                    
            msg_seq += 1
            msg_id = f"msg-zero-{msg_seq}"
            
            # Send streaming status (typing simulation)
            words = text.split(" ")
            current_text = ""
            for word in words:
                if not self.listening:
                    break
                current_text += word + " "
                await self.server.broadcast({
                    "type": "conversation",
                    "id": msg_id,
                    "speaker": speaker,
                    "status": "streaming",
                    "text": current_text.strip(),
                    "ts": time.time()
                })
                await asyncio.sleep(0.15) # delay to simulate typing
                
            if not self.listening:
                continue
                
            # Send completed utterance
            await self.server.broadcast({
                "type": "conversation",
                "id": msg_id,
                "speaker": speaker,
                "status": "completed",
                "text": text,
                "ts": time.time()
            })
            log.info("Simulated utterance finalized [%s]: %s", speaker, text[:60] + "...")
            self.transcript.append(f"[{speaker}] {text}")
            
            # If the interviewer finishes their turn, trigger an LLM response!
            if speaker == "interviewer" and self.listening and not self.answering:
                await asyncio.sleep(0.5)
                asyncio.create_task(self.trigger_llm_response())
                
            await asyncio.sleep(7.0) # Pause between turns
            
        await self.server.broadcast({"type": "status", "text": "demo complete"})
        log.info("Demo script completed. Standing by for manual asks/commands.")

    async def trigger_llm_response(self, question=None):
        if self.answering:
            return
            
        self.answering = True
        self.answer_seq += 1
        resp_id = f"resp-zero-{self.answer_seq}"
        
        try:
            await self.server.broadcast({"type": "answer_start", "id": resp_id})
            
            # Prepare transcript text
            full_context = "\n".join(self.transcript[-6:])
            if question:
                full_context += f"\n\n[User request] {question}"
                
            # Check if key is available and valid
            has_valid_key = self.api_key and not self.api_key.startswith("AQ.Ab8RN")
            
            if has_valid_key:
                log.info("Streaming response from real Gemini API...")
                sys_prompt = self.system_prompt
                if self.candidate_info:
                    sys_prompt += f"\n\nCANDIDATE INFO:\n{self.candidate_info}"
                    
                async for token in stream_gemini_api(
                    self.api_key, 
                    self.config["llm"]["model"], 
                    sys_prompt, 
                    full_context
                ):
                    await self.server.broadcast({
                        "type": "token",
                        "id": resp_id,
                        "text": token
                    })
            else:
                log.info("Streaming simulated response (mock)...")
                mock_answers = [
                    "Here is a suggested reply:\n\n1. **A process** is an independent execution unit with its own memory heap.\n2. **A thread** is a path of execution within a process, sharing memory with sister threads.\n3. **Use processes** for isolation; **use threads** for lightweight data exchange.",
                    "To achieve high reads and low latency, I recommend:\n\n- Add a **Redis cache** in front of your database for frequent queries.\n- Configure **DB read-replicas** to spread the query load.\n- Set up a **CDN (like Cloudflare)** for static content closer to users."
                ]
                # Pick a response based on sequence
                mock_text = mock_answers[self.answer_seq % len(mock_answers)]
                if question:
                    mock_text = f"You asked: '{question}'.\nHere is a simulated answer. (Configure GEMINI_API_KEY in .env for real responses)."
                
                for char in mock_text:
                    await self.server.broadcast({
                        "type": "token",
                        "id": resp_id,
                        "text": char
                    })
                    await asyncio.sleep(0.015)
                    
            await self.server.broadcast({"type": "answer_end", "id": resp_id})
            log.info("LLM answer stream completed for %s", resp_id)
        except Exception as e:
            log.exception("Error while streaming LLM response")
        finally:
            self.answering = False

# --- 5. Main entrypoint ---

async def main():
    load_env_file()
    config = load_yaml_config()
    
    orchestrator = ZeroDepOrchestrator(config)
    await orchestrator.start()
    
    # Run until interrupted
    stop_event = asyncio.Event()
    
    # Simple cross-platform signal handling
    loop = asyncio.get_event_loop()
    for sig in ('SIGINT', 'SIGTERM'):
        try:
            loop.add_signal_handler(getattr(asyncio, sig), stop_event.set)
        except (NotImplementedError, AttributeError):
            pass  # Windows fallback
            
    try:
        await stop_event.wait()
    except KeyboardInterrupt:
        pass
    finally:
        log.info("Stopping zero-dependency backend...")
        await orchestrator.stop()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("Exited.")
