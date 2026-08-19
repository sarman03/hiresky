using System;
using System.IO;
using LiteDB;
using HireSky.Models;

namespace HireSky.Services;

public class DatabaseService : IDisposable
{
    private readonly LiteDatabase _db;
    private readonly ILiteCollection<ChatSession> _sessions;

    public DatabaseService()
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var dbFolder = Path.Combine(appData, "HireSky");
        Directory.CreateDirectory(dbFolder);
        
        var dbPath = Path.Combine(dbFolder, "History.db");
        _db = new LiteDatabase(dbPath);
        _sessions = _db.GetCollection<ChatSession>("sessions");
        _sessions.EnsureIndex(x => x.CreatedAt);
    }

    public ChatSession CreateSession()
    {
        var session = new ChatSession();
        _sessions.Insert(session);
        return session;
    }

    public void AddMessageToSession(Guid sessionId, ChatMessage message)
    {
        var session = _sessions.FindById(sessionId);
        if (session != null)
        {
            session.Messages.Add(message);
            _sessions.Update(session);
        }
    }
    
    public void Dispose()
    {
        _db.Dispose();
    }
}
