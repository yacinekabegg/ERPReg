import PageHead from '@/components/PageHead';
import { AccessDenied } from '@/components/Placeholder';
import ReceptionForm from './ReceptionForm';
import { getAppUser, hasAnyRole } from '@/lib/appUser';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Ref = { id: string; label: string };
type LotRow = {
  numero_lot_ce: string | null;
  date_reception: string;
  quantite_recue: number;
  statut: string;
  numero_lot_fournisseur: string | null;
  coa_fournisseur_path: string | null;
  gammes: { nom: string } | null;
  origines: { pays: string } | null;
};

const STATUT_LABEL: Record<string, string> = {
  libere: 'Libéré',
  en_attente: 'En attente',
  en_cours: 'En cours',
  bloque: 'Bloqué',
  refuse: 'Refusé',
};

async function loadRefs(): Promise<{
  gammes: Ref[];
  origines: Ref[];
  emplacements: Ref[];
  lots: LotRow[];
}> {
  if (!supabaseConfigured()) {
    // Mode démo : référentiel local pour parcourir le formulaire.
    return {
      gammes: [
        { id: 'demo-std', label: 'Reggenerate® Standard' },
        { id: 'demo-plus', label: 'Reggenerate® Plus' },
        { id: 'demo-bio', label: 'Reggenerate® Bio' },
        { id: 'demo-pa', label: 'Reggenerate® Plein Air' },
      ],
      origines: [
        { id: 'demo-fr', label: 'France' },
        { id: 'demo-es', label: 'Espagne' },
        { id: 'demo-tr', label: 'Turquie' },
      ],
      emplacements: [
        { id: 'demo-q', label: 'Zone quarantaine' },
        { id: 'demo-l', label: 'Zone stock libéré' },
      ],
      lots: [],
    };
  }

  const supabase = createClient();
  const [g, o, e, l] = await Promise.all([
    supabase.from('gammes').select('id, nom').eq('actif', true).order('nom'),
    supabase.from('origines').select('id, pays').eq('actif', true).order('pays'),
    supabase.from('emplacements').select('id, zone, libelle').order('zone'),
    supabase
      .from('lots')
      .select(
        'numero_lot_ce, date_reception, quantite_recue, statut, numero_lot_fournisseur, coa_fournisseur_path, gammes(nom), origines(pays)',
      )
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return {
    gammes: (g.data ?? []).map((x) => ({ id: x.id as string, label: x.nom as string })),
    origines: (o.data ?? []).map((x) => ({ id: x.id as string, label: x.pays as string })),
    emplacements: (e.data ?? []).map((x) => ({
      id: x.id as string,
      label: (x.libelle as string) ?? (x.zone as string),
    })),
    lots: (l.data as unknown as LotRow[]) ?? [],
  };
}

export default async function ReceptionPage() {
  const user = await getAppUser();
  if (!user) redirect('/login');
  if (!hasAnyRole(user.roles, ['prod_ops'])) {
    return (
      <>
        <PageHead title="Réception" />
        <AccessDenied />
      </>
    );
  }

  const { gammes, origines, emplacements, lots } = await loadRefs();

  return (
    <>
      <PageHead
        title="Réception"
        subtitle="Entrée d'un lot en stock. Le n° de lot Circul'Egg est généré automatiquement ; le lot entre en attente qualité."
      />

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Nouveau lot</h3>
        <ReceptionForm
          gammes={gammes}
          origines={origines}
          emplacements={emplacements}
          disabled={!supabaseConfigured()}
        />
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Dernières réceptions</h3>
        {lots.length === 0 ? (
          <div className="notice" style={{ border: 0, padding: 0 }}>
            Aucun lot enregistré pour l'instant.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>N° lot</th>
                <th>Date</th>
                <th>Gamme</th>
                <th>Origine</th>
                <th>Qté (kg)</th>
                <th>N° fournisseur</th>
                <th>CoA</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((l, i) => (
                <tr key={l.numero_lot_ce ?? i}>
                  <td>{l.numero_lot_ce}</td>
                  <td>{l.date_reception}</td>
                  <td>{l.gammes?.nom}</td>
                  <td>{l.origines?.pays}</td>
                  <td>{l.quantite_recue}</td>
                  <td>{l.numero_lot_fournisseur ?? '—'}</td>
                  <td>{l.coa_fournisseur_path ? '📎' : '—'}</td>
                  <td>
                    <span className="badge muted">{STATUT_LABEL[l.statut] ?? l.statut}</span>
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
