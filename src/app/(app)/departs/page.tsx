import Link from 'next/link';
import PageHead from '@/components/PageHead';
import { AccessDenied, ModuleNotice } from '@/components/Placeholder';
import RecapHebdo from './RecapHebdo';
import { getAppUser, hasAnyRole } from '@/lib/appUser';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type CmdRow = {
  id: string;
  numero: string | null;
  type: string;
  statut: string;
  priorite: string;
  date_souhaitee: string | null;
  commentaire: string | null;
  clients: { raison_sociale: string } | null;
};
type ExpRow = {
  numero_suivi: string | null;
  date_expedition: string | null;
  commandes_clients: { numero: string | null; type: string; clients: { raison_sociale: string } | null } | null;
};

const STATUT_BADGE: Record<string, string> = {
  confirmee: 'warn',
  en_preparation: 'warn',
  expediee: 'ok',
  cloturee: 'ok',
  annulee: 'muted',
  brouillon: 'muted',
};
const STATUT_LABEL: Record<string, string> = {
  confirmee: 'À préparer',
  en_preparation: 'En préparation',
  expediee: 'Expédiée',
  cloturee: 'Clôturée',
  annulee: 'Annulée',
  brouillon: 'Brouillon',
};

async function fetchData(): Promise<{ commandes: CmdRow[]; expeditions: ExpRow[] }> {
  if (!supabaseConfigured()) return { commandes: [], expeditions: [] };
  try {
  const supabase = createClient();
  const [cmdRes, expRes] = await Promise.all([
    supabase
      .from('commandes_clients')
      .select('id, numero, type, statut, priorite, date_souhaitee, commentaire, clients(raison_sociale)')
      .order('date_commande', { ascending: false })
      .limit(80),
    supabase
      .from('expeditions')
      .select('numero_suivi, date_expedition, commandes_clients(numero, type, clients(raison_sociale))')
      .not('commande_id', 'is', null)
      .order('date_expedition', { ascending: false })
      .limit(60),
  ]);
  return {
    commandes: (cmdRes.data as unknown as CmdRow[]) ?? [],
    expeditions: (expRes.data as unknown as ExpRow[]) ?? [],
  };
  } catch {
    return { commandes: [], expeditions: [] };
  }
}

function CmdTable({ rows, action }: { rows: CmdRow[]; action: boolean }) {
  if (rows.length === 0) {
    return <div className="notice" style={{ border: 0, padding: 0 }}>Aucune commande.</div>;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>N°</th>
          <th>Type</th>
          <th>Client</th>
          <th>Priorité</th>
          <th>Date voulue</th>
          <th>Statut</th>
          {action && <th></th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.id}>
            <td>{c.numero}</td>
            <td>{c.type === 'echantillon' ? 'Échantillon' : 'Commande'}</td>
            <td>{c.clients?.raison_sociale}</td>
            <td>{c.priorite === 'urgente' ? <span className="badge danger">Urgente</span> : 'Normale'}</td>
            <td>{c.date_souhaitee ?? '—'}</td>
            <td>
              <span className={`badge ${STATUT_BADGE[c.statut] ?? 'muted'}`}>
                {STATUT_LABEL[c.statut] ?? c.statut}
              </span>
            </td>
            {action && (
              <td>
                <Link className="btn ghost" href={`/departs/${c.id}`}>
                  {c.statut === 'expediee' || c.statut === 'cloturee' ? 'Voir' : 'Préparer'}
                </Link>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Récap texte des expéditions de la semaine en cours (lundi → maintenant).
function buildRecap(expeditions: ExpRow[]): { texte: string; count: number } {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 0 = lundi
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - day);
  const week = expeditions.filter((e) => e.date_expedition && new Date(e.date_expedition) >= monday);
  const lignes = week.map((e) => {
    const c = e.commandes_clients;
    const t = c?.type === 'echantillon' ? 'Échantillon' : 'Commande';
    return `• ${t} ${c?.numero ?? ''} — ${c?.clients?.raison_sociale ?? ''}${e.numero_suivi ? ` (suivi ${e.numero_suivi})` : ''}`;
  });
  const texte =
    `Récap des envois de la semaine (${week.length}) :\n` +
    (lignes.length ? lignes.join('\n') : 'Aucun envoi cette semaine.');
  return { texte, count: week.length };
}

export default async function DepartsPage() {
  const user = await getAppUser();
  if (!user) redirect('/login');
  if (!hasAnyRole(user.roles, ['depart', 'sales'])) {
    return (
      <>
        <PageHead title="Départ" />
        <AccessDenied />
      </>
    );
  }

  const { commandes, expeditions } = await fetchData();
  const aPreparer = commandes.filter((c) => c.statut === 'confirmee' || c.statut === 'en_preparation');
  const recap = buildRecap(expeditions);

  return (
    <>
      <PageHead
        title="Départ"
        subtitle="File de préparation des commandes et échantillons clients. La logistique affecte le lot et expédie."
      />

      {!supabaseConfigured() && (
        <div style={{ marginBottom: 16 }}>
          <ModuleNotice sprint="Mode démo">
            Branchez Supabase. Les commandes sont créées par les Sales dans l&apos;onglet Commande client.
          </ModuleNotice>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>À préparer ({aPreparer.length})</h3>
        <CmdTable rows={aPreparer} action />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Récap de la semaine</h3>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          À copier-coller dans le canal des commandes/échantillons envoyés.
        </p>
        <RecapHebdo texte={recap.texte} count={recap.count} />
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Toutes les commandes</h3>
        <CmdTable rows={commandes} action />
      </div>
    </>
  );
}
