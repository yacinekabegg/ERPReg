'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV, canAccess, ROLE_LABELS, type Role } from '@/lib/roles';

export default function Sidebar({
  nom,
  roles,
}: {
  nom: string;
  roles: Role[];
}) {
  const pathname = usePathname();
  const items = NAV.filter((item) => canAccess(item, roles));

  return (
    <aside className="sidebar">
      <div className="brand" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/circulegg-logo.png" alt="Circul'Egg" />
        <span className="brand-sub">ERP Reggenerate</span>
      </div>

      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link key={item.href} href={item.href} className={`nav-item${active ? ' active' : ''}`}>
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}

      <div className="sidebar-foot">
        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{nom}</div>
        <div className="roles-line" style={{ margin: '6px 0 10px' }}>
          {roles.length === 0 ? (
            <span className="badge muted">aucun rôle</span>
          ) : (
            roles.map((r) => (
              <span key={r} className="badge muted">
                {ROLE_LABELS[r]}
              </span>
            ))
          )}
        </div>
        <form action="/auth/signout" method="post">
          <button className="btn ghost" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
            Déconnexion
          </button>
        </form>
      </div>
    </aside>
  );
}
