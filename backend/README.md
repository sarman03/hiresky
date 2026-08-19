# HireSky Backend (Python Orchestrator)

cross-platform. Handles audio loopback capture, VAD, Whisper transcription,
screen OCR, Gemini streaming, and the WebSocket server the overlays connect to.

## Run

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # add GEMINI_API_KEY
cp config.example.yaml config.yaml

python run.py --list-devices    # find your loopback device name
# set audio.input_device in config.yaml, then:
python run.py
```

### Demo mode (no audio hardware / ML deps needed)

```bash
pip install websockets openai pyyaml python-dotenv numpy
python run.py --demo
```

Demo mode feeds scripted interview-style utterances through the LLM + WebSocket
path so you can verify an overlay (or `test_client.html`) renders the stream.
Without a `GEMINI_API_KEY` the token stream will carry an error string, which
is still enough to confirm the transport works end to end.

### Browser test client

Open `test_client.html` in any browser to watch the raw event stream from the
server — useful while developing the native overlays.

## Module map

| Module                                | Responsibility                              |
|---------------------------------------|---------------------------------------------|
| `hiresky/config.py`                   | Typed config from `config.yaml` + `.env`    |
| `hiresky/audio/capture.py`            | Loopback PCM capture (`sounddevice`)        |
| `hiresky/audio/vad.py`                | Utterance segmentation (`webrtcvad`)        |
| `hiresky/transcription/whisper_engine.py` | Whisper STT (`faster-whisper` or Gemini)|
| `hiresky/ocr/screen_ocr.py`           | Screen-region OCR (`mss` + `pytesseract`)   |
| `hiresky/llm/gemini_client.py`        | Streaming chat completions                  |
| `hiresky/server/ws_server.py`         | WebSocket fan-out to overlays               |
| `hiresky/orchestrator.py`             | Wires the pipeline together                 |
| `run.py`                              | CLI entrypoint                              |

## Event protocol (server → overlay)

JSON messages over WebSocket:

```jsonc
{"type": "status",       "text": "listening"}
{"type": "transcript",   "text": "full utterance text"}
{"type": "answer_start", "id": "resp-3"}
{"type": "token",        "text": "partial ", "id": "resp-3"}
{"type": "answer_end",   "id": "resp-3"}
{"type": "ocr",          "text": "on-screen text snapshot"}
```

Overlay → server: `{"type": "ping"}` → `{"type": "pong"}`.
