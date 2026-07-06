'use client';

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
  disabled,
}: {
  gammes: Option[];
  origines: Option[];
  fournisseurs: Option[];
  emplacements: Option[];
  disabled?: boolean;
}) {
  const [state, formAction] = useFormState(createLot, initialState);

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
          <label htmlFor="granulometrie">Granulométrie</label>
          <input id="granulometrie" name="granulometrie" type="text" placeholder="ex. 200-220µm" />
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
          <input
            id="quantite_recue"
            name="quantite_recue"
            type="number"
            step="0.001"
            min="0"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="format">Format</label>
          <select id="format" name="format" defaultValue="sac">
            <option value="sac">Sac</option>
            <option value="echantillon">Échantillon</option>
            <option value="echantillotheque">Échantillothèque</option>
            <option value="nc">NC (non conforme)</option>
          </select>
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
      </div>

      <div className="field">
        <label htmlFor="coa">CoA fournisseur (PDF)</label>
        <input id="coa" name="coa" type="file" accept="application/pdf,.pdf" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
        <SubmitButton />
        {state.message && (
          <span className={state.ok ? 'badge ok' : 'badge danger'}>{state.message}</span>
        )}
      </div>

      {disabled && (
        <p className="error" style={{ marginTop: 12 }}>
          ⚠️ Mode démo : branchez Supabase (<code>.env.local</code>) pour enregistrer réellement.
        </p>
      )}
    </form>
  );
}
