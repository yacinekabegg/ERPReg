import PageHead from '@/components/PageHead';
import { AccessDenied, ModuleNotice } from '@/components/Placeholder';
import { CommandeFournisseurForm, EtatForm, ETAT_LABEL } from './ApproForms';
import { getAppUser, hasAnyRole } from '@/lib/appUser';
import { getFournisseurs, getGammes, getOrigines } from '@/lib/refs';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type CmdRow = {
  id: string;
  numero: string | null;
  numero_bdc: string | null;
  etat: string;
  quantite_attendue: number;
  date_commande: string;
  date_prevue: string | null;
  commentaires: string | null;
  gammes: { nom: string } | null;
  fournisseurs: { nom: string } | null;
};
type ApproStat = { id: string; quantite_recue: number; reste_a_recevoir: number; en_retard: boolean; jours_retard: number };

async function fetchAppro(): Promise<{ commandes: CmdRow[]; stats: Map<string, ApproStat> }> {
  if (!supabaseConfigured()) return { commandes: [], stats: new Map() };
  const supabase = createClient();
  const [cmdRes, statRes] = await Promise.all([
    supabase
      .from('commandes_fournisseur')
      .select('id, numero, numero_bdc, etat, quantite_attendue, date_commande, date_prevue, commentaires, gammes(nom), fournisseurs(nom)')
      .order('date_commande', { ascending: false })
      .limit(100),
    supabase.from('v_appro').select('id, quantite_recue, reste_a_recevoir, en_retard, jours_retard'),
  ]);
  const stats = new Map<string, ApproStat>();
  for (const s of (statRes.data as unknown as ApproStat[]) ?? []) stats.set(s.id, s);
  return { commandes: (cmdRes.data as unknown as CmdRow[]) ?? [], stats };
}

function CmdTable({ rows, stats, canWrite }: { rows: CmdRow[]; stats: Map<string, ApproStat>; canWrite: boolean }) {
  if (rows.length === 0) {
    return (
      <div className="notice" style={{ border: 0, padding: 0 }}>
        Aucune commande.
      </div>
    );
  }
  return (
    <table>
      <thead>
        <tr>
          <th>BDC</th>
          <th>Fournisseur</th>
          <th>Gamme</th>
          <th>Attendu (kg)</th>
          <th>Reçu</th>
          <th>Reste</th>
          <th>Prévue</th>
          <th>État</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => {
          const s = stats.get(c.id);
          return (
            <tr key={c.id}>
              <td>{c.numero_bdc ?? c.numero}</td>
              <td>{c.fournisseurs?.nom ?? '—'}</td>
              <td>{c.gammes?.nom}</td>
              <td>{c.quantite_attendue}</td>
              <td>{s?.quantite_recue ?? 0}</td>
              <td style={{ fontWeight: 600 }}>{s?.reste_a_recevoir ?? c.quantite_attendue}</td>
              <td>
                {c.date_prevue ?? '—'}{' '}
                {s?.en_retard && <span className="badge danger">+{s.jours_retard} j</span>}
              </td>
              <td>
                {canWrite ? (
                  <EtatForm commandeId={c.id} etat={c.etat} />
                ) : (
                  <span className="badge muted">{ETAT_LABEL[c.etat] ?? c.etat}</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default async function ApproPage() {
  const user = await getAppUser();
  if (!user) redirect('/login');
  if (!hasAnyRole(user.roles, ['prod_ops', 'sales', 'qualite'])) {
    return (
      <>
        <PageHead title="Appro" />
        <AccessDenied />
      </>
    );
  }
  const canWrite = user.roles.includes('prod_ops') || user.roles.includes('admin');

  const [{ commandes, stats }, gammes, origines, fournisseurs] = await Promise.all([
    fetchAppro(),
    getGammes(),
    getOrigines(),
    getFournisseurs(),
  ]);

  const enCours = commandes.filter((c) => c.etat !== 'recue' && c.etat !== 'annulee');
  const historique = commandes.filter((c) => c.etat === 'recue' || c.etat === 'annulee').slice(0, 15);
  const retards = enCours.filter((c) => stats.get(c.id)?.en_retard);

  return (
    <>
      <PageHead
        title="Appro — commandes fournisseur"
        subtitle="Workflow Egglin : Demande → Proforma → Paiement → Production → Expédition → Réception. Réceptions partielles suivies via les lots rattachés."
      />

      {!supabaseConfigured() && (
        <div style={{ marginBottom: 16 }}>
          <ModuleNotice sprint="Mode démo">Branchez Supabase pour gérer l&apos;appro réelle.</ModuleNotice>
        </div>
      )}

      {retards.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'var(--danger)' }}>
          <strong style={{ color: 'var(--danger)' }}>⚠ {retards.length} commande(s) en retard</strong>
          <span style={{ color: 'var(--muted)' }}>
            {' '}
            — {retards.map((c) => c.numero_bdc ?? c.numero).join(', ')}
          </span>
        </div>
      )}

      {canWrite && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Nouvelle commande fournisseur</h3>
          <CommandeFournisseurForm gammes={gammes} origines={origines} fournisseurs={fournisseurs} />
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>En cours ({enCours.length})</h3>
        <CmdTable rows={enCours} stats={stats} canWrite={canWrite} />
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 0 }}>
          💡 La quantité « Reçu » se met à jour automatiquement quand une réception est rattachée à
          la commande (module Réception). La commande passe en « 6 · Réceptionnée » quand tout est reçu.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Historique récent</h3>
        <CmdTable rows={historique} stats={stats} canWrite={false} />
      </div>
    </>
  );
}
