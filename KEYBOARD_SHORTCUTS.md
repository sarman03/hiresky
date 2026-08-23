# HireSky Keyboard Shortcuts ⌨️

This document lists all system-wide keyboard shortcuts (hotkeys) configured for the HireSky native overlay applications.

---

## 🍏 macOS Keyboard Shortcuts
These hotkeys are registered globally on macOS (defined in [AppDelegate.swift](file:///Users/sarman/projects/hireSky/HireSky/overlay-macos/Sources/HireSkyOverlay/AppDelegate.swift#L240-L301)):

### 🎛️ Control & Visibility
* **`Cmd + V`** — **Toggle Voice Listening**: Start or stop recording and transcribing your voice.
* **`Cmd + T`** or **`Ctrl + T`** — **Toggle Transcript**: Show or hide the interviewer transcript panel on the right.
* **`Cmd + O`** — **Toggle Overlay Visibility**: Instantly hide all overlay panels (or restore them).
* **`Cmd + Option + Y`** — **Show Dashboard**: Bring back the main dashboard setup window to adjust prompts and key settings.

### 🖥️ Screen Analysis & Capture (OCR)
* **`Cmd + Option + D`** — **Analyze Screen Only**: Captures your screen (OCR) and asks Gemini to analyze it (e.g. solve a LeetCode problem or code snippet currently visible) without sending your spoken transcript.
  
* **`Cmd + Option + F`** — **Analyze Screen + Transcript**: Captures your screen (OCR) and sends it along with the live conversation transcript to Gemini for a fully contextual answer.

### 📝 Transcript Actions
* **`Cmd + Option + S`** — **Commit & Ask AI**: Locks the current transcript segment, submits it to Gemini for assistance, and starts a fresh transcript bubble underneath.

---

## 🪟 Windows Keyboard Shortcuts
These hotkeys are registered globally on Windows (defined in [SETUP-windows.md](file:///Users/sarman/projects/hireSky/HireSky/SETUP-windows.md#L58-L66) and [MainWindow.xaml.cs](file:///Users/sarman/projects/hireSky/HireSky/overlay-windows/MainWindow.xaml.cs#L49-L54)):

### 🎛️ Control & Visibility
* **`Ctrl + Alt + H`** — **Toggle Overlay Visibility**: Show / Hide the entire HireSky Windows Overlay card.
* **`Ctrl + Alt + T`** — **Toggle Transcript Visibility**: Show / Hide the running transcript text line at the bottom.
* **`Ctrl + Alt + Y`** — **Show Dashboard**: Restore settings dashboard window.

### 🖥️ Screen Analysis & Capture (OCR)
* **`Ctrl + Alt + D`** — **Analyze Screen Only**: Capture screen region OCR and analyze with Gemini AI.
* **`Ctrl + Alt + F`** — **Analyze Screen + Voice**: Combine current screen + live interview voice transcript.

### 📝 Transcript Actions
* **`Ctrl + Alt + S`** — **Commit & Ask AI**: Locks the current transcript segment and submits it to Gemini for assistance.

### 🖱️ Repositioning
* **Drag anywhere on the card** to reposition the overlay on your screen.
