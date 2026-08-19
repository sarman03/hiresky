export default function Integrations() {
  return (
    <div className="animate-fade-in">
      <div className="dash-header">
        <div>
          <h3>Integrations</h3>
          <p>Connect your tools to automatically sync interviews and transcripts.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Google Calendar */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }} className="delay-1 animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ width: '48px', height: '48px', background: '#f8f8f9', border: '1px solid #eee', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              G
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#111', marginBottom: '2px' }}>Google Calendar</div>
              <div style={{ fontSize: '12px', color: '#777' }}>Sync upcoming interview invites.</div>
            </div>
          </div>
          <button className="btn btn-dark" style={{ width: '100%' }}>
            Connect Google Account
          </button>
        </div>

        {/* Microsoft Outlook */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }} className="delay-2 animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ width: '48px', height: '48px', background: '#0078D4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: 'white', fontWeight: 700 }}>
              O
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#111', marginBottom: '2px' }}>Microsoft Outlook</div>
              <div style={{ fontSize: '12px', color: '#777' }}>Sync Teams and Outlook invites.</div>
            </div>
          </div>
          <button className="btn btn-light" style={{ width: '100%', border: '1px solid var(--border)' }}>
            Connect Microsoft Account
          </button>
        </div>

      </div>
    </div>
  );
}
