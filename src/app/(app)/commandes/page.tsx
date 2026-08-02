import PageHead from '@/components/PageHead';
import { AccessDenied, ModuleNotice } from '@/components/Placeholder';
import { ClientForm, CommandeForm } from './CommandesForms';
import { getAppUser, hasAnyRole } from '@/lib/appUser';
import { getClientsWithAdresses, getGammes, getOrigines } from '@/lib/refs';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type CmdRow = {
  numero: string | null;
  date_commande: string;
  statut: string;
  clients: { raison_sociale: string } | null;
};

async function fetchCommandes(): Promise<CmdRow[]> {
  if (!supabaseConfigured()) return [];
  const { data } = await createClient()
    .from('commandes_clients')
    .select('numero, date_commande, statut, clients(raison_sociale)')
    .order('date_commande', { ascending: false })
    .limit(20);
  return (data as unknown as CmdRow[]) ?? [];
}

export default async function CommandesPage() {
  const user = await getAppUser();
  if (!user) redirect('/login');
  if (!hasAnyRole(user.roles, ['sales', 'prod_ops'])) {
    return (
      <>
        <PageHead title="Commandes" />
        <AccessDenied />
      </>
    );
  }

  const [clients, gammes, origines, commandes] = await Promise.all([
    getClientsWithAdresses(),
    getGammes(),
    getOrigines(),
    fetchCommandes(),
  ]);
  const canWrite = user.roles.includes('sales') || user.roles.includes('admin');

  return (
    <>
      <PageHead
        title="Commandes clients"
        subtitle="Clients et commandes, saisis par les Sales dans l'outil."
      />

      {!supabaseConfigured() && (
        <div style={{ marginBottom: 16 }}>
          <ModuleNotice sprint="Mode démo">
            Branchez Supabase pour créer réellement clients et commandes.
          </ModuleNotice>
        </div>
      )}

      {canWrite && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginTop: 0 }}>Nouveau client</h3>
            <ClientForm />
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginTop: 0 }}>Nouvelle commande / échantillon</h3>
            <CommandeForm clients={clients} gammes={gammes} origines={origines} />
          </div>
        </>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Commandes récentes</h3>
        {commandes.length === 0 ? (
          <div className="notice" style={{ border: 0, padding: 0 }}>
            Aucune commande enregistrée.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Date</th>
                <th>Client</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {commandes.map((c, i) => (
                <tr key={c.numero ?? i}>
                  <td>{c.numero}</td>
                  <td>{c.date_commande}</td>
                  <td>{c.clients?.raison_sociale}</td>
                  <td>
                    <span className="badge muted">{c.statut}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
