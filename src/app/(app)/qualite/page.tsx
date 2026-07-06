import Link from 'next/link';
import PageHead from '@/components/PageHead';
import { AccessDenied, ModuleNotice } from '@/components/Placeholder';
import { getAppUser, hasAnyRole } from '@/lib/appUser';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type LotRow = {
  id: string;
  numero_lot_ce: string | null;
  numero_lot_fournisseur: string | null;
  date_reception: string;
  quantite_recue: number;
  statut: string;
  coa_fournisseur_path: string | null;
  coa_circuegg_path: string | null;
  gammes: { nom: string } | null;
  origines: { pays: string } | null;
};

const STATUT_BADGE: Record<string, string> = { en_attente: 'warn', en_cours: 'warn' };
const STATUT_LABEL: Record<string, string> = { en_attente: 'En attente', en_cours: 'En cours' };

async function fetchFile(): Promise<LotRow[]> {
  if (!supabaseConfigured()) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from('lots')
    .select(
      'id, numero_lot_ce, numero_lot_fournisseur, date_reception, quantite_recue, statut, coa_fournisseur_path, coa_circuegg_path, gammes(nom), origines(pays)',
    )
    .in('statut', ['en_attente', 'en_cours'])
    .order('date_reception', { ascending: true });
  return (data as unknown as LotRow[]) ?? [];
}

export default async function QualitePage() {
  const user = await getAppUser();
  if (!user) redirect('/login');
  if (!hasAnyRole(user.roles, ['qualite'])) {
    return (
      <>
        <PageHead title="Qualité" />
        <AccessDenied />
      </>
    );
  }

  const lots = await fetchFile();

  return (
    <>
      <PageHead
        title="Qualité"
        subtitle="File des lots à valider (les plus anciens d'abord). Décision 100 % humaine, sans seuil calculé."
      />

      {!supabaseConfigured() && (
        <div style={{ marginBottom: 16 }}>
          <ModuleNotice sprint="Mode démo">
            Branchez Supabase pour voir la file réelle des lots et poser les décisions
            (Libérer / Bloquer / Refuser).
          </ModuleNotice>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>À traiter ({lots.length})</h3>
        {lots.length === 0 ? (
          <div className="notice" style={{ border: 0, padding: 0 }}>
            Aucun lot en attente. Les lots arrivent ici après réception.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>N° lot</th>
                <th>Réception</th>
                <th>Gamme</th>
                <th>Origine</th>
                <th>Qté (kg)</th>
                <th>CoA fourn.</th>
                <th>CoA CE</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lots.map((l) => (
                <tr key={l.id}>
                  <td>{l.numero_lot_fournisseur ?? l.numero_lot_ce}</td>
                  <td>{l.date_reception}</td>
                  <td>{l.gammes?.nom}</td>
                  <td>{l.origines?.pays}</td>
                  <td>{l.quantite_recue}</td>
                  <td>{l.coa_fournisseur_path ? '📎' : '—'}</td>
                  <td>{l.coa_circuegg_path ? '📎' : '—'}</td>
                  <td>
                    <span className={`badge ${STATUT_BADGE[l.statut] ?? 'muted'}`}>
                      {STATUT_LABEL[l.statut] ?? l.statut}
                    </span>
                  </td>
                  <td>
                    <Link className="btn ghost" href={`/qualite/${l.id}`}>
                      Traiter
                    </Link>
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
