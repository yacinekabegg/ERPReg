'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createLot, type FormState } from './actions';

type Option = { id: string; label: string };

const initialState: FormState = { ok: false, message: '' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? 'Enregistrement…' : 'Enregistrer le lot'}
    </button>
  );
}

export default function ReceptionForm({
  gammes,
  origines,
  fournisseurs,
  emplacements,
  commandes,
  disabled,
}: {
  gammes: Option[];
  origines: Option[];
  fournisseurs: Option[];
  emplacements: Option[];
  commandes: Option[];
  disabled?: boolean;
}) {
  const [state, formAction] = useFormState(createLot, initialState);
  const [fournisseur, setFournisseur] = useState('');

  return (
    <form action={formAction}>
      <div className="grid cols-3">
        <div className="field">
          <label htmlFor="numero_lot_fournisseur">N° de lot fournisseur *</label>
          <input
            id="numero_lot_fournisseur"
            name="numero_lot_fournisseur"
            type="text"
            placeholder="ex. EGGM3002504"
            required
          />
        </div>

        <div className="field">
          <label>N° de lot interne</label>
          <input value="Généré automatiquement (CE-…)" disabled readOnly />
        </div>

        <div className="field">
          <label htmlFor="fournisseur_id">Fournisseur</label>
          <select
            id="fournisseur_id"
            name="fournisseur_id"
            value={fournisseur}
            onChange={(e) => setFournisseur(e.target.value)}
          >
            <option value="">—</option>
            {fournisseurs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
            <option value="__autre__">Autre…</option>
          </select>
        </div>

        {fournisseur === '__autre__' && (
          <div className="field">
            <label htmlFor="fournisseur_autre">Nouveau fournisseur</label>
            <input id="fournisseur_autre" name="fournisseur_autre" placeholder="Nom du fournisseur" />
          </div>
        )}

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
          <label htmlFor="quantite_recue">Quantité reçue (kg) *</label>
          <input id="quantite_recue" name="quantite_recue" type="number" step="0.001" min="0" required />
        </div>

        <div className="field">
          <label htmlFor="dluo">DLUO / DDM</label>
          <input id="dluo" name="dluo" type="date" />
        </div>

        <div className="field">
          <label htmlFor="emplacement_id">Emplacement</label>
          <select id="emplacement_id" name="emplacement_id" defaultValue="">
            <option value="">—</option>
            {emplacements.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="commande_fournisseur_id">Commande fournisseur liée</label>
          <select id="commande_fournisseur_id" name="commande_fournisseur_id" defaultValue="">
            <option value="">— (aucune)</option>
            {commandes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid cols-3">
        <div className="field">
          <label htmlFor="bl">Bon de livraison (BL)</label>
          <input id="bl" name="bl" type="file" accept="application/pdf,.pdf,image/*" />
        </div>
        <div className="field">
          <label htmlFor="atr">ATR (document douanier)</label>
          <input id="atr" name="atr" type="file" accept="application/pdf,.pdf,image/*" />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
        <SubmitButton />
        {state.message && (
          <span className={state.ok ? 'badge ok' : 'badge danger'}>{state.message}</span>
        )}
      </div>
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>
        Le CoA fournisseur et les analyses se joignent ensuite dans l&apos;onglet Qualité (plusieurs fichiers possibles).
      </p>

      {disabled && (
        <p className="error" style={{ marginTop: 12 }}>
          ⚠️ Mode démo : branchez Supabase (<code>.env.local</code>) pour enregistrer réellement.
        </p>
      )}
    </form>
  );
}
