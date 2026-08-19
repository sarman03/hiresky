using System;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

namespace HireSky;

/// <summary>Decoded backend event (see backend/README.md protocol).</summary>
public sealed class BackendEvent
{
    [JsonPropertyName("type")] public string Type { get; set; } = "";
    [JsonPropertyName("text")] public string? Text { get; set; }
    [JsonPropertyName("id")]   public string? Id { get; set; }
}

/// <summary>
/// ClientWebSocket wrapper with a background receive loop, app-level ping
/// keepalive, and exponential-backoff reconnect.
/// </summary>
public sealed class WebSocketClient
{
    private readonly Uri _url;
    private readonly CancellationTokenSource _cts = new();
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public event Action<BackendEvent>? EventReceived;
    public event Action<bool>? ConnectionChanged;

    public WebSocketClient(Uri url) => _url = url;

    public void Start() => _ = RunAsync(_cts.Token);

    public void Stop() => _cts.Cancel();

    private async Task RunAsync(CancellationToken ct)
    {
        var delay = TimeSpan.FromSeconds(1);
        while (!ct.IsCancellationRequested)
        {
            using var ws = new ClientWebSocket();
            try
            {
                await ws.ConnectAsync(_url, ct);
                ConnectionChanged?.Invoke(true);
                delay = TimeSpan.FromSeconds(1); // reset backoff
                _ = PingLoopAsync(ws, ct);
                await ReceiveLoopAsync(ws, ct);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch
            {
                // fall through to reconnect
            }

            ConnectionChanged?.Invoke(false);
            if (ct.IsCancellationRequested) break;

            try { await Task.Delay(delay, ct); } catch { break; }
            delay = TimeSpan.FromSeconds(Math.Min(delay.TotalSeconds * 2, 10));
        }
    }

    private async Task ReceiveLoopAsync(ClientWebSocket ws, CancellationToken ct)
    {
        var buffer = new byte[8192];
        var sb = new StringBuilder();
        while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
        {
            sb.Clear();
            WebSocketReceiveResult result;
            do
            {
                result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), ct);
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "", ct);
                    return;
                }
                sb.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));
            }
            while (!result.EndOfMessage);

            var json = sb.ToString();
            if (json.Length == 0) continue;
            try
            {
                var ev = JsonSerializer.Deserialize<BackendEvent>(json, JsonOpts);
                if (ev != null) EventReceived?.Invoke(ev);
            }
            catch (JsonException)
            {
                // ignore malformed frames
            }
        }
    }

    private static async Task PingLoopAsync(ClientWebSocket ws, CancellationToken ct)
    {
        var ping = Encoding.UTF8.GetBytes("{\"type\":\"ping\"}");
        while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
        {
            try
            {
                await ws.SendAsync(new ArraySegment<byte>(ping),
                    WebSocketMessageType.Text, true, ct);
                await Task.Delay(TimeSpan.FromSeconds(15), ct);
            }
            catch
            {
                return;
            }
        }
    }
}
