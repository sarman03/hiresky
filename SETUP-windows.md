# HireSky — Windows Setup & Build Guide (Windows 10 / 11)

A borderless, always-on-top, **Screen Capture-Immune** overlay for Windows. 
Uses `SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)` to stay **100% invisible to Zoom, Google Meet, Microsoft Teams, Discord, Snipping Tool, and OBS**, while remaining crystal-clear on your physical monitor.

---

## 🪟 Quick Start (Running on Windows)

### Prerequisites

1. Install [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (or Visual Studio 2022).
2. Install Python 3.10+ (for running the zero-dependency / orchestrator backend).

---

### Step 1: Start the Backend (Terminal 1)

In PowerShell or Command Prompt:

```powershell
cd backend
python run_zero_dep.py
```

* This starts the WebSocket server on `ws://127.0.0.1:8765`.

---

### Step 2: Build & Run the Windows Overlay App (Terminal 2)

In PowerShell:

```powershell
cd overlay-windows
dotnet run
```

* The **HireSky Windows Overlay** card will launch in the top-right corner of your screen!

---

## 📦 Packaging Standalone `HireSky.exe` for Distribution

To create a single `.exe` executable that can run on any Windows 10/11 computer (without installing .NET):

In PowerShell inside `overlay-windows`:

```powershell
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfContained=true
```

The output standalone executable will be generated at:
`overlay-windows/bin/Release/net8.0-windows/win-x64/publish/HireSkyOverlay.exe`

## ⌨️ Windows Global Hotkeys

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| **Ctrl + Alt + H** | **Toggle Overlay** | Show / Hide the entire HireSky Windows Overlay card. |
| **Ctrl + Alt + S** | **Commit & Ask AI** | Locks current transcript segment and submits it to Gemini. |
| **Ctrl + Alt + D** | **Analyze Screen** | Capture screen & analyze with Gemini AI. |
| **Ctrl + Alt + F** | **Analyze Screen + Voice** | Combine current screen + live interview voice transcript. |
| **Ctrl + Alt + Y** | **Show Dashboard** | Restore settings dashboard window. |

---

## 🛡️ Windows Privacy & Protection Mechanism

On load, the C# WPF app executes:
```csharp
NativeMethods.SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
```

* **Windows 10 (version 2004+) & Windows 11:** The Desktop Window Manager (DWM) excludes the HireSky window from all screen captures. Your interviewer or screen share sees ONLY your code editor / browser, while HireSky remains visible to your eyes.
* Sets `WS_EX_NOACTIVATE` so clicking the overlay never steals key focus from your meeting or code editor.
* Sets `WS_EX_TOOLWINDOW` so it stays hidden from Alt-Tab and the taskbar.
