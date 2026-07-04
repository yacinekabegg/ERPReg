import PageHead from '@/components/PageHead';
import { AccessDenied, ModuleNotice } from '@/components/Placeholder';
import { getAppUser, hasAnyRole } from '@/lib/appUser';
import { ROLE_LABELS, type Role } from '@/lib/roles';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getAppUser();
  if (!user) redirect('/login');
  if (!hasAnyRole(user.roles, ['admin'])) {
    return (
      <>
        <PageHead title="Admin" />
        <AccessDenied />
      </>
    );
  }

  const roles = Object.keys(ROLE_LABELS) as Role[];

  return (
    <>
      <PageHead
        title="Administration"
        subtitle="Utilisateurs, rôles et référentiels."
      />
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Rôles disponibles</h3>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Libellé</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r}>
                <td><code>{r}</code></td>
                <td>{ROLE_LABELS[r]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ModuleNotice sprint="Sprint 0+">
        Gestion des utilisateurs via Supabase Auth ; affectation des rôles dans
        <code> public.profils.roles</code>. Référentiels (gammes, origines,
        transporteurs, emplacements) éditables ici en Sprint&nbsp;1+.
      </ModuleNotice>
    </>
  );
}
