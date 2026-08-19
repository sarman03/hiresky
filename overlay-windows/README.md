# HireSky Overlay — Windows (C# / WPF)

A borderless, always-on-top, **screen-capture-immune** overlay. Connects to the
backend WebSocket server and renders the streamed copilot output on a
glassmorphism card in the top-right of your working area.

## Privacy mechanism

On load the window calls
`SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)`. The Desktop Window
Manager then excludes the window from every capture path, so it is invisible to
Zoom, Google Meet, Teams, the Snipping Tool, and OBS while remaining visible on
your physical display.

> Requires Windows 10 version 2004 (build 19041) or later. On older builds the
> overlay still runs but is **not** capture-immune (a notice is shown).

It also sets `WS_EX_NOACTIVATE` (never steals focus from the meeting app) and
`WS_EX_TOOLWINDOW` (hidden from Alt-Tab).

## Build & run

Requires the .NET 8 SDK (and, for `dotnet run`, a Windows machine — WPF is
Windows-only).

```powershell
cd overlay-windows
dotnet run
```

Or open `HireSkyOverlay.csproj` in Visual Studio 2022 and press F5.

Point it at a non-default backend:

```powershell
$env:HIRESKY_WS_URL = "ws://127.0.0.1:8765"
dotnet run
```

## Controls

* **Ctrl+Alt+H** — toggle overlay visibility (registered as a global hotkey).
* Drag anywhere on the card to reposition it.

## Notes

* `ShowInTaskbar=False` and the tool-window style keep it out of the taskbar and
  Alt-Tab.
* If the backend isn't up yet, the client reconnects with exponential backoff;
  the status dot stays red until connected.
* To distribute, `dotnet publish -c Release -r win-x64 --self-contained` produces
  a standalone executable.
