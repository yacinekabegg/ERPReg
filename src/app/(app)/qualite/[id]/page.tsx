import Link from 'next/link';
import PageHead from '@/components/PageHead';
import { AccessDenied } from '@/components/Placeholder';
import { CoaCEForm, InfosForm, DecisionForm } from '../FicheForms';
import { getAppUser, hasAnyRole } from '@/lib/appUser';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

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

type Lot = {
  id: string;
  numero_lot_ce: string | null;
  numero_lot_fournisseur: string | null;
  granulometrie: string | null;
  date_reception: string;
  dluo: string | null;
  quantite_recue: number;
  statut: string;
  coa_fournisseur_path: string | null;
  coa_circuegg_path: string | null;
  coa_infos: Record<string, string> | null;
  commentaire_qualite: string | null;
  gammes: { nom: string } | null;
  origines: { pays: string } | null;
  fournisseurs: { nom: string } | null;
};

export default async function FicheLotPage({ params }: { params: { id: string } }) {
  const user = await getAppUser();
  if (!user) redirect('/login');
  if (!hasAnyRole(user.roles, ['qualite'])) {
    return (
      <>
        <PageHead title="Fiche lot" />
        <AccessDenied />
      </>
    );
  }

  if (!supabaseConfigured()) {
    return (
      <>
        <PageHead title="Fiche lot" subtitle="Mode démo" />
        <div className="notice">
          Branchez Supabase pour ouvrir une fiche lot réelle.{' '}
          <Link href="/qualite">Retour à la file</Link>.
        </div>
      </>
    );
  }

  const supabase = createClient();
  const { data } = await supabase
    .from('lots')
    .select(
      'id, numero_lot_ce, numero_lot_fournisseur, granulometrie, date_reception, dluo, quantite_recue, statut, coa_fournisseur_path, coa_circuegg_path, coa_infos, commentaire_qualite, gammes(nom), origines(pays), fournisseurs(nom)',
    )
    .eq('id', params.id)
    .maybeSingle();

  const lot = data as unknown as Lot | null;
  if (!lot) notFound();

  // Liens de téléchargement signés pour les CoA.
  let coaFournUrl: string | null = null;
  let coaCEUrl: string | null = null;
  if (lot.coa_fournisseur_path) {
    const { data: s } = await supabase.storage.from('coa').createSignedUrl(lot.coa_fournisseur_path, 300);
    coaFournUrl = s?.signedUrl ?? null;
  }
  if (lot.coa_circuegg_path) {
    const { data: s } = await supabase.storage.from('coa').createSignedUrl(lot.coa_circuegg_path, 300);
    coaCEUrl = s?.signedUrl ?? null;
  }

  const decided = ['libere', 'bloque', 'refuse'].includes(lot.statut);

  return (
    <>
      <PageHead
        title={`Lot ${lot.numero_lot_fournisseur ?? lot.numero_lot_ce ?? ''}`}
        subtitle="Validation qualité — décision manuelle, sans seuil."
      />
      <p style={{ marginTop: -12, marginBottom: 16 }}>
        <Link href="/qualite">← Retour à la file</Link>
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="btn-row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Informations lot</h3>
          <span className={`badge ${STATUT_BADGE[lot.statut] ?? 'muted'}`}>
            {STATUT_LABEL[lot.statut] ?? lot.statut}
          </span>
        </div>
        <dl className="dl" style={{ marginTop: 14 }}>
          <dt>Gamme</dt>
          <dd>{lot.gammes?.nom}</dd>
          <dt>Granulométrie</dt>
          <dd>{lot.granulometrie ?? '—'}</dd>
          <dt>Origine</dt>
          <dd>{lot.origines?.pays}</dd>
          <dt>Fournisseur</dt>
          <dd>{lot.fournisseurs?.nom ?? '—'}</dd>
          <dt>Quantité reçue</dt>
          <dd>{lot.quantite_recue} kg</dd>
          <dt>N° interne (CE)</dt>
          <dd>{lot.numero_lot_ce ?? '—'}</dd>
          <dt>Réception</dt>
          <dd>{lot.date_reception}</dd>
          <dt>DLUO</dt>
          <dd>{lot.dluo ?? '—'}</dd>
          <dt>CoA fournisseur</dt>
          <dd>{coaFournUrl ? <a href={coaFournUrl}>Télécharger le PDF</a> : '—'}</dd>
          <dt>CoA Circul&apos;Egg</dt>
          <dd>{coaCEUrl ? <a href={coaCEUrl}>Télécharger le PDF</a> : '— (à ajouter)'}</dd>
          {lot.commentaire_qualite && (
            <>
              <dt>Commentaire qualité</dt>
              <dd>{lot.commentaire_qualite}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>CoA Circul&apos;Egg</h3>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Contre-analyse Circul&apos;Egg : attachez le PDF (généré ailleurs en v1).
        </p>
        <CoaCEForm lotId={lot.id} hasCoa={!!lot.coa_circuegg_path} />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Champs informatifs (facultatifs)</h3>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Aucun seuil n&apos;est calculé : ces champs aident seulement à la lecture.
        </p>
        <InfosForm lotId={lot.id} infos={lot.coa_infos} />
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Décision libératoire</h3>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Un lot n&apos;est vendable que s&apos;il est <strong>libéré</strong>.
          {decided && ' Ce lot a déjà une décision — vous pouvez la modifier.'}
        </p>
        <DecisionForm lotId={lot.id} />
      </div>
    </>
  );
}
