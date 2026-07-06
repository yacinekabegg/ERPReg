import PageHead from '@/components/PageHead';
import { getAppUser } from '@/lib/appUser';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type LotRow = {
  id: string;
  numero_lot_ce: string | null;
  numero_lot_fournisseur: string | null;
  statut: string;
  quantite_recue: number;
  gammes: { nom: string } | null;
  origines: { pays: string } | null;
};
type StockRow = {
  lot_id: string;
  quantite_stock: number;
  quantite_disponible: number;
  disponible_vente: boolean;
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

async function fetchData(): Promise<{ lots: LotRow[]; stock: Map<string, StockRow> }> {
  if (!supabaseConfigured()) return { lots: [], stock: new Map() };
  try {
    const supabase = createClient();
    const [lotsRes, stockRes] = await Promise.all([
      supabase
        .from('lots')
        .select('id, numero_lot_ce, numero_lot_fournisseur, statut, quantite_recue, gammes(nom), origines(pays)')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('v_stock_lot').select('lot_id, quantite_stock, quantite_disponible, disponible_vente'),
    ]);
    const stock = new Map<string, StockRow>();
    for (const s of (stockRes.data as unknown as StockRow[]) ?? []) stock.set(s.lot_id, s);
    return { lots: (lotsRes.data as unknown as LotRow[]) ?? [], stock };
  } catch {
    return { lots: [], stock: new Map() };
  }
}

export default async function DashboardPage() {
  await getAppUser();
  const { lots, stock } = await fetchData();

  const disponibles = lots.filter((l) => l.statut === 'libere');
  const enAttente = lots.filter((l) => l.statut === 'en_attente' || l.statut === 'en_cours');

  // Agrégation : quantité disponible à la vente par gamme × origine.
  const agg = new Map<string, { gamme: string; origine: string; dispo: number }>();
  for (const l of lots) {
    const s = stock.get(l.id);
    if (!s || !s.disponible_vente) continue;
    const gamme = l.gammes?.nom ?? '—';
    const origine = l.origines?.pays ?? '—';
    const key = `${gamme}|${origine}`;
    const cur = agg.get(key) ?? { gamme, origine, dispo: 0 };
    cur.dispo += Number(s.quantite_disponible) || 0;
    agg.set(key, cur);
  }
  const aggRows = [...agg.values()].sort(
    (a, b) => a.gamme.localeCompare(b.gamme) || a.origine.localeCompare(b.origine),
  );

  return (
    <>
      <PageHead
        title="Stock"
        subtitle="Disponibilité à la vente par gamme et origine. Seuls les lots libérés sont vendables."
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
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--warn)' }}>{enAttente.length}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Disponible à la vente — par gamme × origine</h3>
        {aggRows.length === 0 ? (
          <div className="notice" style={{ border: 0, padding: 0 }}>
            Aucun stock libéré disponible. Les quantités apparaîtront après réception (Réception)
            et libération d'un lot (Qualité).
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Gamme</th>
                <th>Origine</th>
                <th>Disponible (kg)</th>
              </tr>
            </thead>
            <tbody>
              {aggRows.map((r) => (
                <tr key={`${r.gamme}-${r.origine}`}>
                  <td>{r.gamme}</td>
                  <td>{r.origine}</td>
                  <td style={{ fontWeight: 600, color: 'var(--ok)' }}>{r.dispo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Lots</h3>
        {lots.length === 0 ? (
          <div className="notice" style={{ border: 0, padding: 0 }}>
            Aucun lot pour l'instant. Les lots apparaîtront ici dès la première réception
            (module <strong>Réception</strong>).
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>N° lot</th>
                <th>Gamme</th>
                <th>Origine</th>
                <th>Stock (kg)</th>
                <th>Dispo (kg)</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((l, i) => {
                const s = stock.get(l.id);
                return (
                  <tr key={l.id ?? i}>
                    <td>{l.numero_lot_fournisseur ?? l.numero_lot_ce}</td>
                    <td>{l.gammes?.nom}</td>
                    <td>{l.origines?.pays}</td>
                    <td>{s ? s.quantite_stock : l.quantite_recue}</td>
                    <td>{s ? s.quantite_disponible : 0}</td>
                    <td>
                      <span className={`badge ${STATUT_BADGE[l.statut] ?? 'muted'}`}>
                        {STATUT_LABEL[l.statut] ?? l.statut}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
