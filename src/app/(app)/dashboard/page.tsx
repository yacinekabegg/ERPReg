import PageHead from '@/components/PageHead';
import { getAppUser } from '@/lib/appUser';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type LotRow = {
  numero_lot_ce: string | null;
  statut: string;
  quantite_recue: number;
  gammes: { nom: string } | null;
  origines: { pays: string } | null;
};

const STATUT_BADGE: Record<string, string> = {
  libere: 'ok',
  en_attente: 'warn',
  en_cours: 'warn',
  bloque: 'danger',
  refuse: 'danger',
};

const STATUT_LABEL: Record<string, string> = {
  libere: 'Libéré',
  en_attente: 'En attente',
  en_cours: 'En cours',
  bloque: 'Bloqué',
  refuse: 'Refusé',
};

async function fetchLots(): Promise<LotRow[]> {
  if (!supabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('lots')
      .select('numero_lot_ce, statut, quantite_recue, gammes(nom), origines(pays)')
      .order('created_at', { ascending: false })
      .limit(50);
    return (data as unknown as LotRow[]) ?? [];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  await getAppUser();
  const lots = await fetchLots();
  const disponibles = lots.filter((l) => l.statut === 'libere');

  return (
    <>
      <PageHead
        title="Stock"
        subtitle="Disponibilité par gamme et origine. Seuls les lots libérés sont vendables."
      />

      <div className="grid cols-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Lots en stock</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{lots.length}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Lots libérés (vendables)</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ok)' }}>{disponibles.length}</div>
        </div>
        <div className="card">
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>En attente qualité</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--warn)' }}>
            {lots.filter((l) => l.statut === 'en_attente' || l.statut === 'en_cours').length}
          </div>
        </div>
      </div>

      <div className="card">
        {lots.length === 0 ? (
          <div className="notice" style={{ border: 0, padding: 0 }}>
            Aucun lot pour l'instant. Les lots apparaîtront ici dès la première réception
            (module <strong>Réception</strong>, Sprint&nbsp;1).
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>N° lot</th>
                <th>Gamme</th>
                <th>Origine</th>
                <th>Quantité (kg)</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((l, i) => (
                <tr key={l.numero_lot_ce ?? i}>
                  <td>{l.numero_lot_ce}</td>
                  <td>{l.gammes?.nom}</td>
                  <td>{l.origines?.pays}</td>
                  <td>{l.quantite_recue}</td>
                  <td>
                    <span className={`badge ${STATUT_BADGE[l.statut] ?? 'muted'}`}>
                      {STATUT_LABEL[l.statut] ?? l.statut}
                    </span>
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
