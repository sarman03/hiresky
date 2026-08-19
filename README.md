# HireSky 🚀

HireSky is an advanced, real-time AI meeting copilot designed to provide live contextual assistance during video calls. It captures system audio and screen context, processes it through Large Language Models (LLMs), and displays the output on a native, privacy-focused desktop overlay.

Built with cross-platform native privacy APIs, the HireSky overlay remains completely invisible to standard screen-sharing and recording software (like Zoom, Google Meet, and OBS).

---

## ✨ Features

* **Screen-Share Immune Overlay:** Utilizes native OS privacy flags (`WDA_EXCLUDEFROMCAPTURE` on Windows, `NSWindowSharingNone` on macOS) to ensure the UI is stripped from OS-level framebuffers during screen sharing.
* **Real-Time Audio Pipeline:** Captures system audio loopback and transcribes it using high-speed Whisper AI.
* **Contextual Screen OCR:** Periodically captures user-defined screen regions (e.g., code editors, whiteboards) to provide visual context to the LLM.
* **Low-Latency Streaming:** Streams Gemini token responses in real-time via WebSockets to a glassmorphism-styled UI.

---

## 🏗️ Architecture

HireSky operates on a decoupled backend/frontend architecture:

1. **Python Orchestrator (Backend):** Handles audio routing, OCR capture, VAD (Voice Activity Detection), and Gemini API communication.
2. **Native Overlay (Frontend):** A lightweight, borderless, always-on-top window built in C#/C++ (Windows) or Swift (macOS) that renders the text stream and enforces capture privacy.

```
┌────────────────────────────────────────────────────────────┐
│                     Python Orchestrator                      │
│                                                              │
│  ┌───────────┐   ┌──────┐   ┌────────────┐   ┌───────────┐  │
│  │  Audio    │──▶│ VAD  │──▶│  Whisper   │──▶│           │  │
│  │  Capture  │   └──────┘   │ Transcribe │   │           │  │
│  └───────────┘              └────────────┘   │   LLM     │  │
│                                               │  (Gemini  │  │
│  ┌───────────┐   ┌────────────┐               │ streaming)│  │
│  │  Screen   │──▶│  Tesseract │──────────────▶│           │  │
│  │  Capture  │   │    OCR     │               └─────┬─────┘  │
│  └───────────┘   └────────────┘                     │        │
│                                                      ▼        │
│                                          ┌────────────────┐  │
│                                          │ WebSocket      │  │
│                                          │ Server (tokens)│  │
│                                          └───────┬────────┘  │
└──────────────────────────────────────────────────┼──────────┘
                                                    │ ws://
                        ┌───────────────────────────┴──────────┐
                        ▼                                       ▼
              ┌───────────────────┐                 ┌────────────────────┐
              │  macOS Overlay    │                 │  Windows Overlay   │
              │  (Swift / AppKit) │                 │  (C# / WPF)        │
              │ NSWindowSharingNone│                 │WDA_EXCLUDEFROMCAPTURE│
              └───────────────────┘                 └────────────────────┘
```

---

## 📁 Repository layout

```
HireSky/
├── backend/              # Python orchestrator (cross-platform, runnable)
│   ├── hiresky/          # package: audio, vad, transcription, ocr, llm, server
│   ├── run.py            # entrypoint
│   ├── requirements.txt
│   ├── config.example.yaml
│   └── .env.example
├── overlay-macos/        # Native Swift/AppKit overlay (compile with Xcode/SPM)
└── overlay-windows/      # Native C#/WPF overlay (compile with .NET / Visual Studio)
```

---

## 📋 Prerequisites

Before installing HireSky, ensure you have the following installed:

### Global
* Python 3.10+
* An active [Gemini API Key](https://ai.google.dev/) (gemini-3.1-flash-lite recommended for speed)

### Windows
* Tesseract OCR (`tesseract.exe`) added to your system PATH.
* Visual Studio / C++ Build Tools (for compiling the native overlay).
* .NET 8 SDK.

### macOS
* A virtual audio loopback driver installed (e.g., [BlackHole](https://existential.audio/blackhole/) or Soundflower) to route system audio.
* Xcode Command Line Tools.
* Tesseract OCR (`brew install tesseract`).

---

## 🚀 Quick start

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env               # then add your GEMINI_API_KEY
cp config.example.yaml config.yaml # tweak audio device / OCR region

python run.py
```

The orchestrator prints the audio devices it can see on startup. Set the
loopback device name (BlackHole on macOS, or a "Stereo Mix" / VB-Cable device
on Windows) in `config.yaml`, then restart.

The WebSocket server listens on `ws://127.0.0.1:8765` by default.

### 2. Overlay

**macOS**

```bash
cd overlay-macos
swift run                          # or open Package.swift in Xcode and Run
```

**Windows**

```powershell
cd overlay-windows
dotnet run                         # or open the .csproj in Visual Studio
```

The overlay connects to the backend automatically and renders the streamed
tokens. Try screen-sharing your desktop — the overlay window will not appear in
the shared/recorded feed.

---

## ⚙️ Configuration

All backend behaviour is controlled by `config.yaml` (see `config.example.yaml`
for the annotated defaults). Highlights:

* `audio.input_device` — name (or substring) of the loopback device to capture.
* `ocr.enabled` / `ocr.region` — turn OCR on and define the screen rectangle.
* `llm.model` / `llm.system_prompt` — model and persona for the copilot.
* `server.host` / `server.port` — WebSocket endpoint the overlay connects to.

Secrets (your `GEMINI_API_KEY`) live in `.env`, never in `config.yaml`.

---

## 🔒 Privacy model

The overlay is excluded from OS-level screen capture at the window-server level,
not by drawing tricks. On macOS this uses `NSWindow.sharingType = .none`; on
Windows it uses `SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)`. Both
cause the compositor to omit the window from any capture framebuffer, so it is
invisible to Zoom, Meet, Teams, OBS, and native screenshot tools while remaining
visible on your physical display.

> **Note:** Screen-capture exclusion is enforced by the OS compositor. A camera
> physically pointed at your screen will still see the overlay. Use responsibly
> and in line with the policies of any meeting you attend.

---

## 🧪 Development

The backend is designed so every stage is swappable and independently testable.
Each module (`audio`, `vad`, `transcription`, `ocr`, `llm`, `server`) exposes a
small, typed interface and can be run in isolation. See `backend/README.md`.

## 📄 License

MIT — see `LICENSE`.
