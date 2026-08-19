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
* **`Cmd + Shift + \`** or **`Cmd + Shift + S`** or **`Cmd + Ctrl + S`**
  **Analyze Screen Only**: Captures your screen (OCR) and asks Gemini to analyze it (e.g. solve a LeetCode problem or code snippet currently visible) without sending your spoken transcript.
  
* **`Cmd + /`** or **`Cmd + Shift + /`** or **`Cmd + Shift + A`** or **`Cmd + Ctrl + D`**
  **Analyze Screen + Transcript**: Captures your screen (OCR) and sends it along with the live conversation transcript to Gemini for a fully contextual answer.

### 📝 Transcript Actions
* **`Cmd + ]`** or **`Cmd + Shift + ]`** or **`Cmd + Shift + D`** or **`Cmd + Ctrl + A`**
  **Commit & Ask AI**: Locks the current transcript segment, submits it to Gemini for assistance, and starts a fresh transcript bubble underneath.

---

## 🪟 Windows Keyboard Shortcuts
These hotkeys are registered globally on Windows (defined in [SETUP-windows.md](file:///Users/sarman/projects/hireSky/HireSky/SETUP-windows.md#L58-L66) and [MainWindow.xaml.cs](file:///Users/sarman/projects/hireSky/HireSky/overlay-windows/MainWindow.xaml.cs#L49-L54)):

### 🎛️ Control & Visibility
* **`Ctrl + Alt + H`** — **Toggle Overlay Visibility**: Show / Hide the entire HireSky Windows Overlay card.
* **`Ctrl + Alt + Y`** — **Show Dashboard**: Restore settings dashboard window.

### 🖥️ Screen Analysis & Capture (OCR)
* **`Ctrl + Shift + S`** — **Analyze Screen**: Capture screen & analyze with Gemini AI.
* **`Ctrl + Shift + A`** — **Analyze Screen + Voice**: Combine current screen + live interview voice transcript.

### 🖱️ Repositioning
* **Drag anywhere on the card** to reposition the overlay on your screen.
