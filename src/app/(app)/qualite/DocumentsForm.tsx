'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { addLotDocument, type FormState } from './coa-actions';

const init: FormState = { ok: false, message: '' };

const CAT_LABEL: Record<string, string> = {
  coa_fournisseur: 'CoA fournisseur',
  coa_interne: 'CoA / analyse interne (Eurofins…)',
  analyse: 'Analyse (lot)',
  autre: 'Autre',
};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn ghost" type="submit" disabled={pending}>
      {pending ? '…' : 'Ajouter le document'}
    </button>
  );
}

export type LotDoc = { id: string; categorie: string; filename: string | null; url: string | null };

export default function DocumentsForm({ lotId, documents }: { lotId: string; documents: LotDoc[] }) {
  const [state, action] = useFormState(addLotDocument, init);
  return (
    <div>
      {documents.length > 0 ? (
        <table style={{ marginBottom: 14 }}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Fichier</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id}>
                <td>{CAT_LABEL[d.categorie] ?? d.categorie}</td>
                <td>{d.url ? <a href={d.url} target="_blank" rel="noreferrer">{d.filename ?? 'Télécharger'}</a> : d.filename}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>Aucun document joint pour l&apos;instant.</p>
      )}

      <form action={action}>
        <input type="hidden" name="lot_id" value={lotId} />
        <div className="grid cols-3">
          <div className="field">
            <label htmlFor="categorie">Type de document</label>
            <select id="categorie" name="categorie" defaultValue="coa_fournisseur">
              {Object.entries(CAT_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="fichier">Fichier</label>
            <input id="fichier" name="fichier" type="file" accept="application/pdf,.pdf,image/*" required />
          </div>
        </div>
        <div className="btn-row">
          <Submit />
          {state.message && <span className={state.ok ? 'badge ok' : 'badge danger'}>{state.message}</span>}
        </div>
      </form>
    </div>
  );
}
