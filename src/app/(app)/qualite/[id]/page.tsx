import Link from 'next/link';
import PageHead from '@/components/PageHead';
import { AccessDenied } from '@/components/Placeholder';
import { CoaCEForm, DecisionForm } from '../FicheForms';
import CoaForm from '../CoaForm';
import DocumentsForm, { type LotDoc } from '../DocumentsForm';
import { defaultCoaData } from '@/lib/coa-template';
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
  coa_infos: Record<string, unknown> | null;
  commentaire_qualite: string | null;
  note_interne: string | null;
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
      'id, numero_lot_ce, numero_lot_fournisseur, granulometrie, date_reception, dluo, quantite_recue, statut, coa_fournisseur_path, coa_circuegg_path, coa_infos, commentaire_qualite, note_interne, gammes(nom), origines(pays), fournisseurs(nom)',
    )
    .eq('id', params.id)
    .maybeSingle();

  const lot = data as unknown as Lot | null;
  if (!lot) notFound();

  // Liens de téléchargement signés pour les CoA.
  let coaCEUrl: string | null = null;
  if (lot.coa_circuegg_path) {
    const { data: s } = await supabase.storage.from('coa').createSignedUrl(lot.coa_circuegg_path, 300);
    coaCEUrl = s?.signedUrl ?? null;
  }

  // Documents joints (CoA fournisseur, analyses…) avec liens signés.
  const { data: docRows } = await supabase
    .from('lot_documents')
    .select('id, categorie, filename, path')
    .eq('lot_id', lot.id)
    .in('categorie', ['coa_fournisseur', 'coa_interne', 'analyse', 'autre'])
    .order('created_at', { ascending: false });
  const documents: LotDoc[] = [];
  for (const d of (docRows as any[]) ?? []) {
    const { data: s } = await supabase.storage.from('coa').createSignedUrl(d.path as string, 300);
    documents.push({ id: d.id, categorie: d.categorie, filename: d.filename, url: s?.signedUrl ?? null });
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
          <dt>Origine</dt>
          <dd>{lot.origines?.pays}</dd>
          <dt>Fournisseur</dt>
          <dd>{lot.fournisseurs?.nom ?? '—'}</dd>
          <dt>Quantité reçue</dt>
          <dd>{lot.quantite_recue} kg</dd>
          <dt>N° lot interne</dt>
          <dd>{lot.numero_lot_ce ?? '—'}</dd>
          <dt>Réception</dt>
          <dd>{lot.date_reception}</dd>
          <dt>DLUO</dt>
          <dd>{lot.dluo ?? '—'}</dd>
          <dt>CoA Circul&apos;Egg généré</dt>
          <dd>{coaCEUrl ? <a href={coaCEUrl}>Télécharger le PDF</a> : '— (à générer)'}</dd>
          {lot.commentaire_qualite && (
            <>
              <dt>Commentaire qualité</dt>
              <dd>{lot.commentaire_qualite}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Documents & analyses reçus</h3>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Joignez plusieurs fichiers : CoA fournisseur, analyses du lot (Turquie), CoA / analyses
          internes (Eurofins…).
        </p>
        <DocumentsForm lotId={lot.id} documents={documents} />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>CoA Circul&apos;Egg — génération</h3>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Saisissez les résultats (fournisseur / interne) et cochez « conforme ». Le PDF charté est
          généré une fois tous les paramètres validés, puis rattaché au lot.
        </p>
        <CoaForm
          lotId={lot.id}
          data={defaultCoaData(lot)}
          coaUrl={coaCEUrl}
          noteInterne={lot.note_interne}
        />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Joindre un CoA externe (repli)</h3>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Si besoin, vous pouvez aussi attacher un PDF de CoA produit ailleurs (remplace le CoA généré).
        </p>
        <CoaCEForm lotId={lot.id} hasCoa={!!lot.coa_circuegg_path} />
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
