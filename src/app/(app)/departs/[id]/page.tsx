import Link from 'next/link';
import PageHead from '@/components/PageHead';
import { AccessDenied } from '@/components/Placeholder';
import { ExpedierForm } from '../DepartForms';
import { getAppUser, hasAnyRole } from '@/lib/appUser';
import { getEligibleLots, getTransporteurs, type EligibleLot } from '@/lib/refs';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const STATUT_LABEL: Record<string, string> = {
  demandee: 'Demandée',
  en_preparation: 'En préparation',
  expediee: 'Expédiée',
  livree: 'Livrée',
  incident: 'Incident',
  annulee: 'Annulée',
};

export default async function DepartDetailPage({ params }: { params: { id: string } }) {
  const user = await getAppUser();
  if (!user) redirect('/login');
  if (!hasAnyRole(user.roles, ['sales', 'depart'])) {
    return (
      <>
        <PageHead title="Départ" />
        <AccessDenied />
      </>
    );
  }
  const canExecute = user.roles.includes('depart') || user.roles.includes('admin');

  if (!supabaseConfigured()) {
    return (
      <>
        <PageHead title="Départ" subtitle="Mode démo" />
        <div className="notice">
          Branchez Supabase pour ouvrir une demande réelle. <Link href="/departs">Retour</Link>.
        </div>
      </>
    );
  }

  const supabase = createClient();
  const { data } = await supabase
    .from('demandes_depart')
    .select(
      'id, numero, type, statut, priorite, commentaire, date_souhaitee, clients(raison_sociale), adresses_livraison(libelle, ligne1, cp, ville), lignes_depart(id, quantite, gamme_id, gammes(nom))',
    )
    .eq('id', params.id)
    .maybeSingle();

  const dem = data as any;
  if (!dem) notFound();

  const lignes = (dem.lignes_depart ?? []).map((l: any) => ({
    id: l.id as string,
    gamme_id: l.gamme_id as string,
    gamme: l.gammes?.nom as string,
    quantite: Number(l.quantite),
  }));

  const eligibles = await getEligibleLots();
  const lotsByGamme: Record<string, EligibleLot[]> = {};
  for (const lot of eligibles) (lotsByGamme[lot.gamme_id] ??= []).push(lot);

  const transporteurs = await getTransporteurs();
  const done = dem.statut === 'expediee' || dem.statut === 'livree';
  const adr = dem.adresses_livraison;

  return (
    <>
      <PageHead
        title={`Départ ${dem.numero ?? ''}`}
        subtitle={dem.type === 'echantillon' ? 'Échantillon' : 'Commande'}
      />
      <p style={{ marginTop: -12, marginBottom: 16 }}>
        <Link href="/departs">← Retour à la liste</Link>
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="btn-row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Demande</h3>
          <span className="badge muted">{STATUT_LABEL[dem.statut] ?? dem.statut}</span>
        </div>
        <dl className="dl" style={{ marginTop: 14 }}>
          <dt>Client</dt>
          <dd>{dem.clients?.raison_sociale}</dd>
          <dt>Adresse</dt>
          <dd>{adr ? [adr.libelle, adr.ligne1, adr.cp, adr.ville].filter(Boolean).join(', ') : '—'}</dd>
          <dt>Priorité</dt>
          <dd>{dem.priorite === 'urgente' ? 'Urgente' : 'Normale'}</dd>
          <dt>Date souhaitée</dt>
          <dd>{dem.date_souhaitee ?? '—'}</dd>
          {dem.commentaire && (
            <>
              <dt>Commentaire</dt>
              <dd>{dem.commentaire}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{done ? 'Lignes expédiées' : 'Préparation & expédition'}</h3>
        {done ? (
          <table>
            <thead>
              <tr>
                <th>Gamme</th>
                <th>Qté (kg)</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l: any) => (
                <tr key={l.id}>
                  <td>{l.gamme}</td>
                  <td>{l.quantite}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : canExecute ? (
          <ExpedierForm
            demandeId={dem.id}
            lignes={lignes}
            lotsByGamme={lotsByGamme}
            transporteurs={transporteurs}
          />
        ) : (
          <div className="notice" style={{ border: 0, padding: 0 }}>
            En attente d&apos;exécution par l&apos;équipe départ.
          </div>
        )}
      </div>
    </>
  );
}
