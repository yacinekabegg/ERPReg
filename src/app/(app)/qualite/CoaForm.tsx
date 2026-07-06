'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { soumettreCoA, type FormState } from './coa-actions';
import { COA_SECTIONS, COA_ALL_PARAMS, type CoaData } from '@/lib/coa-template';

const init: FormState = { ok: false, message: '' };

function Btn({ children, value, className = 'btn', disabled }: { children: React.ReactNode; value: string; className?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" name="action" value={value} disabled={disabled || pending}>
      {pending ? '…' : children}
    </button>
  );
}

type PState = Record<string, { resultat: string; conforme: boolean }>;

export default function CoaForm({ lotId, data, coaUrl }: { lotId: string; data: CoaData; coaUrl: string | null }) {
  const [state, action] = useFormState(soumettreCoA, init);
  const [params, setParams] = useState<PState>(() => {
    const p: PState = {};
    for (const k of COA_ALL_PARAMS) p[k.cle] = { ...data.params[k.cle] };
    return p;
  });

  const set = (cle: string, patch: Partial<{ resultat: string; conforme: boolean }>) =>
    setParams((s) => ({ ...s, [cle]: { ...s[cle], ...patch } }));

  const saisis = COA_ALL_PARAMS.filter((p) => (params[p.cle]?.resultat ?? '').trim() !== '');
  const canGenerate = saisis.length > 0 && saisis.every((p) => params[p.cle]?.conforme);

  return (
    <form action={action}>
      <input type="hidden" name="lot_id" value={lotId} />

      <div className="grid cols-3">
        <div className="field">
          <label htmlFor="produit">Nom du produit</label>
          <input id="produit" name="produit" defaultValue={data.produit} />
        </div>
        <div className="field">
          <label htmlFor="numero_lot">N° de lot</label>
          <input id="numero_lot" name="numero_lot" defaultValue={data.numero_lot} />
        </div>
        <div className="field">
          <label htmlFor="date_fabrication">Date de fabrication</label>
          <input id="date_fabrication" name="date_fabrication" type="date" defaultValue={data.date_fabrication} />
        </div>
        <div className="field">
          <label htmlFor="date_expiration">Date d&apos;expiration</label>
          <input id="date_expiration" name="date_expiration" type="date" defaultValue={data.date_expiration} />
        </div>
        <div className="field">
          <label htmlFor="signataire">Signataire</label>
          <input id="signataire" name="signataire" defaultValue={data.signataire} />
        </div>
        <div className="field">
          <label htmlFor="fonction">Fonction</label>
          <input id="fonction" name="fonction" defaultValue={data.fonction} />
        </div>
      </div>

      {COA_SECTIONS.map((section) => (
        <div key={section.titreFr} style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, color: 'var(--brand)', borderBottom: '1px solid var(--border)', paddingBottom: 4, marginBottom: 6 }}>
            {section.titreFr}
          </div>
          <table>
            <thead>
              <tr>
                <th>Paramètre</th>
                <th>Critère</th>
                <th>Résultat</th>
                <th>Unité</th>
                <th style={{ textAlign: 'center' }}>Conforme</th>
              </tr>
            </thead>
            <tbody>
              {section.params.map((p) => (
                <tr key={p.cle}>
                  <td>
                    {p.labelFr}
                    {p.type === 'porte' && <span className="badge muted" style={{ marginLeft: 6 }}>porté</span>}
                  </td>
                  <td style={{ color: 'var(--muted)' }}>{p.critere}</td>
                  <td>
                    <input
                      name={`res_${p.cle}`}
                      value={params[p.cle]?.resultat ?? ''}
                      onChange={(e) => set(p.cle, { resultat: e.target.value })}
                      style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, width: 120 }}
                    />
                  </td>
                  <td style={{ color: 'var(--muted)' }}>{p.unite}</td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      name={`conf_${p.cle}`}
                      checked={params[p.cle]?.conforme ?? false}
                      onChange={(e) => set(p.cle, { conforme: e.target.checked })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="btn-row" style={{ marginTop: 16 }}>
        <Btn value="save" className="btn ghost">Enregistrer</Btn>
        <Btn value="generer" disabled={!canGenerate}>📄 Générer le CoA</Btn>
        {coaUrl && (
          <a className="btn ghost" href={coaUrl} target="_blank" rel="noreferrer">
            Télécharger le CoA généré
          </a>
        )}
        {state.message && <span className={state.ok ? 'badge ok' : 'badge danger'}>{state.message}</span>}
      </div>
      {!canGenerate && (
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 0 }}>
          Le bouton « Générer » s&apos;active quand tous les paramètres saisis sont cochés « conforme ».
        </p>
      )}
    </form>
  );
}
