'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createCommandeFournisseur, setEtatCommande, type FormState } from './actions';
import type { Ref } from '@/lib/refs';

const init: FormState = { ok: false, message: '' };

export const ETAT_LABEL: Record<string, string> = {
  demande: '1 · Demande (WhatsApp)',
  proforma: '2 · Proforma envoyée',
  paiement: '3 · Paiement envoyé',
  production: '4 · Production lancée',
  expedition: '5 · Expédition Turquie',
  recue: '6 · Réceptionnée',
  annulee: 'Annulée',
};

function Submit({ children, className = 'btn' }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending}>
      {pending ? '…' : children}
    </button>
  );
}
function Status({ s }: { s: FormState }) {
  if (!s.message) return null;
  return <span className={s.ok ? 'badge ok' : 'badge danger'}>{s.message}</span>;
}

export function CommandeFournisseurForm({
  gammes,
  origines,
  fournisseurs,
}: {
  gammes: Ref[];
  origines: Ref[];
  fournisseurs: Ref[];
}) {
  const [state, action] = useFormState(createCommandeFournisseur, init);
  return (
    <form action={action}>
      <div className="grid cols-3">
        <div className="field">
          <label htmlFor="fournisseur_id">Fournisseur</label>
          <select id="fournisseur_id" name="fournisseur_id" defaultValue="">
            <option value="">—</option>
            {fournisseurs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="gamme_id">Gamme *</label>
          <select id="gamme_id" name="gamme_id" required defaultValue="">
            <option value="" disabled>
              Choisir…
            </option>
            {gammes.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="origine_id">Origine *</label>
          <select id="origine_id" name="origine_id" required defaultValue="">
            <option value="" disabled>
              Choisir…
            </option>
            {origines.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="quantite_attendue">Quantité (kg) *</label>
          <input id="quantite_attendue" name="quantite_attendue" type="number" step="0.001" min="0" required />
        </div>
        <div className="field">
          <label htmlFor="numero_bdc">N° bon de commande</label>
          <input id="numero_bdc" name="numero_bdc" placeholder="ex. 251119" />
        </div>
        <div className="field">
          <label htmlFor="date_commande">Date de commande</label>
          <input id="date_commande" name="date_commande" type="date" />
        </div>
        <div className="field">
          <label htmlFor="date_prevue">Réception prévue</label>
          <input id="date_prevue" name="date_prevue" type="date" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="commentaires">Commentaires</label>
        <input id="commentaires" name="commentaires" />
      </div>
      <div className="btn-row">
        <Submit>Créer la commande</Submit>
        <Status s={state} />
      </div>
    </form>
  );
}

export function EtatForm({ commandeId, etat }: { commandeId: string; etat: string }) {
  const [state, action] = useFormState(setEtatCommande, init);
  return (
    <form action={action} className="btn-row" style={{ gap: 6 }}>
      <input type="hidden" name="commande_id" value={commandeId} />
      <select name="etat" defaultValue={etat} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)' }}>
        {Object.entries(ETAT_LABEL).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <Submit className="btn ghost">OK</Submit>
      <Status s={state} />
    </form>
  );
}
