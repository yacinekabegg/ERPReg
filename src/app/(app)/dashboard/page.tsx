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

type ApproRow = {
  id: string;
  numero: string | null;
  numero_bdc: string | null;
  etat: string;
  date_prevue: string | null;
  gammes: { nom: string } | null;
};
type ApproStat = { id: string; reste_a_recevoir: number; en_retard: boolean; jours_retard: number };
type AlertLot = { numero: string; date: string };

async function fetchData(): Promise<{
  lots: (LotRow & { dluo: string | null; date_reception: string })[];
  stock: Map<string, StockRow>;
  appro: { row: ApproRow; stat: ApproStat | undefined }[];
}> {
  if (!supabaseConfigured()) return { lots: [], stock: new Map(), appro: [] };
  try {
    const supabase = createClient();
    const [lotsRes, stockRes, approRes, statRes] = await Promise.all([
      supabase
        .from('lots')
        .select(
          'id, numero_lot_ce, numero_lot_fournisseur, statut, quantite_recue, dluo, date_reception, gammes(nom), origines(pays)',
        )
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('v_stock_lot').select('lot_id, quantite_stock, quantite_disponible, disponible_vente'),
      supabase
        .from('commandes_fournisseur')
        .select('id, numero, numero_bdc, etat, date_prevue, gammes(nom)')
        .not('etat', 'in', '("recue","annulee")'),
      supabase.from('v_appro').select('id, reste_a_recevoir, en_retard, jours_retard'),
    ]);
    const stock = new Map<string, StockRow>();
    for (const s of (stockRes.data as unknown as StockRow[]) ?? []) stock.set(s.lot_id, s);
    const stats = new Map<string, ApproStat>();
    for (const s of (statRes.data as unknown as ApproStat[]) ?? []) stats.set(s.id, s);
    const appro = ((approRes.data as unknown as ApproRow[]) ?? []).map((row) => ({
      row,
      stat: stats.get(row.id),
    }));
    return { lots: (lotsRes.data as any) ?? [], stock, appro };
  } catch {
    return { lots: [], stock: new Map(), appro: [] };
  }
}

export default async function DashboardPage() {
  await getAppUser();
  const { lots, stock, appro } = await fetchData();

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

  // Prévisionnel par gamme : dispo + en cours de livraison (reste à recevoir).
  const enCoursParGamme = new Map<string, number>();
  for (const { row, stat } of appro) {
    const g = row.gammes?.nom ?? '—';
    enCoursParGamme.set(g, (enCoursParGamme.get(g) ?? 0) + Number(stat?.reste_a_recevoir ?? 0));
  }
  const dispoParGamme = new Map<string, number>();
  for (const r of aggRows) dispoParGamme.set(r.gamme, (dispoParGamme.get(r.gamme) ?? 0) + r.dispo);
  const prevRows = [...new Set([...dispoParGamme.keys(), ...enCoursParGamme.keys()])]
    .sort()
    .map((g) => {
      const dispo = dispoParGamme.get(g) ?? 0;
      const attendu = enCoursParGamme.get(g) ?? 0;
      return { gamme: g, dispo, attendu, previsionnel: dispo + attendu };
    });

  // Alertes non bloquantes.
  const NOW = Date.now();
  const JOUR = 24 * 3600 * 1000;
  const retards = appro.filter((a) => a.stat?.en_retard);
  const attenteAnciens = enAttente.filter(
    (l) => l.date_reception && NOW - new Date(l.date_reception).getTime() > 14 * JOUR,
  );
  const dluoProche = disponibles.filter(
    (l) => l.dluo && new Date(l.dluo).getTime() - NOW < 90 * JOUR,
  );
  const alertes: { type: string; badge: string; texte: string }[] = [];
  if (retards.length)
    alertes.push({
      type: 'danger',
      badge: 'Appro en retard',
      texte: retards
        .map((a) => `${a.row.numero_bdc ?? a.row.numero} (+${a.stat?.jours_retard} j)`)
        .join(', '),
    });
  if (attenteAnciens.length)
    alertes.push({
      type: 'warn',
      badge: 'Qualité en attente > 14 j',
      texte: attenteAnciens.map((l) => l.numero_lot_fournisseur ?? l.numero_lot_ce ?? '').join(', '),
    });
  if (dluoProche.length)
    alertes.push({
      type: 'warn',
      badge: 'DLUO < 90 j',
      texte: dluoProche.map((l) => l.numero_lot_fournisseur ?? l.numero_lot_ce ?? '').join(', '),
    });

  return (
    <>
      <PageHead
        title="Stock"
        subtitle="Disponibilité à la vente par gamme et origine. Seuls les lots libérés sont vendables."
      />

      {alertes.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          {alertes.map((a) => (
            <div key={a.badge} style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 6 }}>
              <span className={`badge ${a.type}`}>{a.badge}</span>
              <span style={{ fontSize: 14 }}>{a.texte}</span>
            </div>
          ))}
        </div>
      )}

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

      {prevRows.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Prévisionnel par gamme</h3>
          <table>
            <thead>
              <tr>
                <th>Gamme</th>
                <th>Disponible (kg)</th>
                <th>En cours de livraison (kg)</th>
                <th>Prévisionnel (kg)</th>
              </tr>
            </thead>
            <tbody>
              {prevRows.map((r) => (
                <tr key={r.gamme}>
                  <td>{r.gamme}</td>
                  <td>{r.dispo}</td>
                  <td>{r.attendu}</td>
                  <td style={{ fontWeight: 600 }}>{r.previsionnel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Lots</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0 }}>
          <strong>Stock</strong> = quantité physique du lot. <strong>Dispo</strong> = quantité
          vendable = stock d&apos;un lot <strong>libéré</strong> moins le réservé (0 tant que le lot
          n&apos;est pas libéré par la Qualité).
        </p>
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
