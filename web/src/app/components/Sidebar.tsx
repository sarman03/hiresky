"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Overview', path: '/' },
    { name: 'Context & Profile', path: '/context' },
    { name: 'Calendar', path: '/calendar' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'Leaderboard', path: '/leaderboard' },
    { name: '🔔 Notifications', path: '/notifications' },
    { name: '🎁 Referrals', path: '/referrals' },
    { name: 'History', path: '/history' },
    { name: 'Integrations', path: '/integrations' },
    { name: '⚙️ Admin', path: '/admin' },
  ];

  return (
    <aside style={{
      width: '220px',
      background: 'white',
      borderRight: '1px solid var(--border)',
      padding: '22px 14px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ marginBottom: '24px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '9px' }}>
        <div style={{
          width: '30px', height: '30px', 
          background: 'linear-gradient(135deg, #111, #555)',
          borderRadius: '9px',
          display: 'grid', placeItems: 'center', color: 'white', fontSize: '13px', fontWeight: 'bold'
        }}>H</div>
        <h2 style={{ margin: 0, fontWeight: 800, fontSize: '19px', letterSpacing: '-0.7px', color: '#111' }}>HireSky</h2>
      </div>

      <div style={{
        fontSize: '11px',
        color: '#999',
        margin: '0 10px 12px',
        textTransform: 'uppercase',
        letterSpacing: '.8px'
      }}>Workspace</div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.name} href={item.path} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 11px',
              borderRadius: '9px',
              background: isActive ? '#f2f2f3' : 'transparent',
              color: isActive ? '#111' : '#777',
              fontWeight: isActive ? 600 : 400,
              fontSize: '12px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = '#111';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = '#777';
              }
            }}>
              <span style={{
                width: '15px', height: '15px', borderRadius: '4px',
                background: isActive ? '#111' : '#e8e8ea'
              }}></span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '10px', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '30px', height: '30px',
          borderRadius: '50%',
          background: '#eee',
          display: 'grid', placeItems: 'center',
          fontSize: '11px', fontWeight: 700, color: '#111'
        }}>
          AM
        </div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#111' }}>Akash</div>
          <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>Pro Plan</div>
        </div>
      </div>
    </aside>
  );
}
