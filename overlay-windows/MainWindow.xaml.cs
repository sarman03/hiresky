using System;
using System.Windows;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using HireSky.Models;
using HireSky.Services;

namespace HireSky;

public partial class MainWindow : Window
{
    private WebSocketClient? _client;
    private string _answer = "";
    private const int HotkeyId = 0xB001;
    private HwndSource? _source;
    private bool _hiddenByHotkey;
    
    private DatabaseService? _dbService;
    private ChatSession? _currentSession;

    public MainWindow()
    {
        InitializeComponent();
        Loaded += OnLoaded;
        Closed += OnClosed;
    }

    private void OnLoaded(object? sender, RoutedEventArgs e)
    {
        var hwnd = new WindowInteropHelper(this).Handle;

        // 1) Screen-capture exclusion
        if (!NativeMethods.SetWindowDisplayAffinity(hwnd, NativeMethods.WDA_EXCLUDEFROMCAPTURE))
        {
            StatusText.Text = "capture-exclusion unavailable on this OS build";
        }

        // 2) Tool window + no-activate
        int ex = NativeMethods.GetWindowLong(hwnd, NativeMethods.GWL_EXSTYLE);
        ex |= NativeMethods.WS_EX_TOOLWINDOW | NativeMethods.WS_EX_NOACTIVATE;
        NativeMethods.SetWindowLong(hwnd, NativeMethods.GWL_EXSTYLE, ex);

        // 3) Position top-right
        var wa = SystemParameters.WorkArea;
        Left = wa.Right - Width - 24;
        Top = wa.Top + 24;

        // 4) Global hotkey Ctrl+Alt+H
        _source = HwndSource.FromHwnd(hwnd);
        _source?.AddHook(WndProc);
        NativeMethods.RegisterHotKey(hwnd, HotkeyId,
            NativeMethods.MOD_CONTROL | NativeMethods.MOD_ALT | NativeMethods.MOD_NOREPEAT,
            0x48 /* VK_H */);

        // Initialize Database and Session
        try {
            _dbService = new DatabaseService();
            _currentSession = _dbService.CreateSession();
        } catch (Exception ex) {
            StatusText.Text = "DB Error: " + ex.Message;
        }

        // 5) Connect to the backend
        var url = Environment.GetEnvironmentVariable("HIRESKY_WS_URL") ?? "ws://127.0.0.1:8765";
        _client = new WebSocketClient(new Uri(url));
        _client.EventReceived += OnEvent;
        _client.ConnectionChanged += OnConnectionChanged;
        _client.Start();
    }

    private IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        if (msg == NativeMethods.WM_HOTKEY && wParam.ToInt32() == HotkeyId)
        {
            _hiddenByHotkey = !_hiddenByHotkey;
            Visibility = _hiddenByHotkey ? Visibility.Hidden : Visibility.Visible;
            handled = true;
        }
        return IntPtr.Zero;
    }

    private void OnConnectionChanged(bool connected)
    {
        Dispatcher.Invoke(() =>
        {
            StatusDot.Fill = new SolidColorBrush(connected
                ? Color.FromRgb(0x22, 0xC5, 0x5E)
                : Color.FromRgb(0xEF, 0x44, 0x44));
            StatusText.Text = connected ? "listening" : "disconnected";
        });
    }

    private void OnEvent(BackendEvent ev)
    {
        Dispatcher.Invoke(() =>
        {
            switch (ev.Type)
            {
                case "status":
                    StatusText.Text = ev.Text ?? "";
                    break;
                case "answer_start":
                    _answer = "";
                    AnswerText.Text = "";
                    break;
                case "token":
                    _answer += ev.Text ?? "";
                    AnswerText.Text = _answer;
                    break;
                case "answer_end":
                    if (_currentSession != null && _dbService != null && !string.IsNullOrEmpty(_answer))
                    {
                        _dbService.AddMessageToSession(_currentSession.Id, new ChatMessage {
                            Role = "Assistant",
                            Content = _answer
                        });
                    }
                    break;
                case "transcript":
                    var t = ev.Text ?? "";
                    TranscriptText.Text = "🗣  " + t;
                    if (_currentSession != null && _dbService != null && !string.IsNullOrEmpty(t))
                    {
                        _dbService.AddMessageToSession(_currentSession.Id, new ChatMessage {
                            Role = "User",
                            Content = t
                        });
                    }
                    break;
            }
        });
    }

    private void Card_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.ButtonState == MouseButtonState.Pressed)
            DragMove();
    }

    private void OnClosed(object? sender, EventArgs e)
    {
        var hwnd = new WindowInteropHelper(this).Handle;
        NativeMethods.UnregisterHotKey(hwnd, HotkeyId);
        _source?.RemoveHook(WndProc);
        _client?.Stop();
    }
}
