import Link from 'next/link';
import PageHead from '@/components/PageHead';
import { AccessDenied, ModuleNotice } from '@/components/Placeholder';
import { DemandeForm } from './DepartForms';
import { getAppUser, hasAnyRole } from '@/lib/appUser';
import { getClientsWithAdresses, getGammes, getOrigines } from '@/lib/refs';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type DemRow = {
  id: string;
  numero: string | null;
  type: string;
  statut: string;
  date_demande: string;
  priorite: string;
  clients: { raison_sociale: string } | null;
};

const STATUT_BADGE: Record<string, string> = {
  demandee: 'warn',
  en_preparation: 'warn',
  expediee: 'ok',
  livree: 'ok',
  incident: 'danger',
  annulee: 'muted',
};
const STATUT_LABEL: Record<string, string> = {
  demandee: 'Demandée',
  en_preparation: 'En préparation',
  expediee: 'Expédiée',
  livree: 'Livrée',
  incident: 'Incident',
  annulee: 'Annulée',
};

async function fetchDemandes(): Promise<DemRow[]> {
  if (!supabaseConfigured()) return [];
  const { data } = await createClient()
    .from('demandes_depart')
    .select('id, numero, type, statut, date_demande, priorite, clients(raison_sociale)')
    .order('date_demande', { ascending: false })
    .limit(50);
  return (data as unknown as DemRow[]) ?? [];
}

function DemandeTable({ rows, action }: { rows: DemRow[]; action: boolean }) {
  if (rows.length === 0) {
    return (
      <div className="notice" style={{ border: 0, padding: 0 }}>
        Aucune demande.
      </div>
    );
  }
  return (
    <table>
      <thead>
        <tr>
          <th>N°</th>
          <th>Type</th>
          <th>Client</th>
          <th>Priorité</th>
          <th>Statut</th>
          {action && <th></th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((d) => (
          <tr key={d.id}>
            <td>{d.numero}</td>
            <td>{d.type === 'echantillon' ? 'Échantillon' : 'Commande'}</td>
            <td>{d.clients?.raison_sociale}</td>
            <td>{d.priorite === 'urgente' ? <span className="badge danger">Urgente</span> : 'Normale'}</td>
            <td>
              <span className={`badge ${STATUT_BADGE[d.statut] ?? 'muted'}`}>
                {STATUT_LABEL[d.statut] ?? d.statut}
              </span>
            </td>
            {action && (
              <td>
                <Link className="btn ghost" href={`/departs/${d.id}`}>
                  {d.statut === 'expediee' || d.statut === 'livree' ? 'Voir' : 'Exécuter'}
                </Link>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function DepartsPage() {
  const user = await getAppUser();
  if (!user) redirect('/login');
  if (!hasAnyRole(user.roles, ['sales', 'depart'])) {
    return (
      <>
        <PageHead title="Départs" />
        <AccessDenied />
      </>
    );
  }

  const isSales = user.roles.includes('sales') || user.roles.includes('admin');
  const isDepart = user.roles.includes('depart') || user.roles.includes('admin');

  const [clients, gammes, origines, demandes] = await Promise.all([
    isSales ? getClientsWithAdresses() : Promise.resolve([]),
    isSales ? getGammes() : Promise.resolve([]),
    isSales ? getOrigines() : Promise.resolve([]),
    fetchDemandes(),
  ]);

  const aTraiter = demandes.filter((d) => d.statut === 'demandee' || d.statut === 'en_preparation');

  return (
    <>
      <PageHead
        title="Départs"
        subtitle="Demandes de départ (échantillon / commande) puis préparation et expédition."
      />

      {!supabaseConfigured() && (
        <div style={{ marginBottom: 16 }}>
          <ModuleNotice sprint="Mode démo">
            Branchez Supabase pour créer et exécuter des demandes réelles.
          </ModuleNotice>
        </div>
      )}

      {isSales && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Nouvelle demande de départ</h3>
          <DemandeForm clients={clients} gammes={gammes} origines={origines} />
        </div>
      )}

      {isDepart && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>File à exécuter ({aTraiter.length})</h3>
          <DemandeTable rows={aTraiter} action />
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Toutes les demandes</h3>
        <DemandeTable rows={demandes} action={isDepart} />
      </div>
    </>
  );
}
