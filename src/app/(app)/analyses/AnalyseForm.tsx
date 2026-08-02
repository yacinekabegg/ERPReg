'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { addAnalyse, type FormState } from './actions';

type Option = { id: string; label: string };
const init: FormState = { ok: false, message: '' };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? '…' : 'Enregistrer l’analyse'}
    </button>
  );
}

export default function AnalyseForm({ lots }: { lots: Option[] }) {
  const [state, action] = useFormState(addAnalyse, init);
  return (
    <form action={action}>
      <div className="grid cols-3">
        <div className="field">
          <label htmlFor="type_analyse">Type d&apos;analyse *</label>
          <input id="type_analyse" name="type_analyse" placeholder="ex. Collagène, Métaux lourds, Microbiologie" required />
        </div>
        <div className="field">
          <label htmlFor="date_analyse">Date</label>
          <input id="date_analyse" name="date_analyse" type="date" />
        </div>
        <div className="field">
          <label htmlFor="lot_id">Lot concerné (facultatif)</label>
          <select id="lot_id" name="lot_id" defaultValue="">
            <option value="">— (générale / biannuelle)</option>
            {lots.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="valeurs">Valeurs / résultats</label>
        <textarea id="valeurs" name="valeurs" placeholder="Saisie libre (ex. Collagène 24 %, Élastine 27 %…)" />
      </div>
      <div className="grid cols-3">
        <div className="field">
          <label htmlFor="commentaire">Commentaire</label>
          <input id="commentaire" name="commentaire" />
        </div>
        <div className="field">
          <label htmlFor="fichier">Fichier (facultatif)</label>
          <input id="fichier" name="fichier" type="file" accept="application/pdf,.pdf,image/*" />
        </div>
      </div>
      <div className="btn-row">
        <Submit />
        {state.message && <span className={state.ok ? 'badge ok' : 'badge danger'}>{state.message}</span>}
      </div>
    </form>
  );
}
