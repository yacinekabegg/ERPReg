'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { expedierCommande, prendreEnPreparation, type FormState } from './actions';
import type { Ref, EligibleLot } from '@/lib/refs';

const init: FormState = { ok: false, message: '' };

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

export function PreparationForm({ commandeId }: { commandeId: string }) {
  const [state, action] = useFormState(prendreEnPreparation, init);
  return (
    <form action={action} className="btn-row">
      <input type="hidden" name="commande_id" value={commandeId} />
      <Submit className="btn ghost">Passer en préparation</Submit>
      <Status s={state} />
    </form>
  );
}

export function ExpedierForm({
  commandeId,
  lignes,
  lotsByGamme,
  transporteurs,
}: {
  commandeId: string;
  lignes: { id: string; gamme: string; gamme_id: string; quantite: number }[];
  lotsByGamme: Record<string, EligibleLot[]>;
  transporteurs: Ref[];
}) {
  const [state, action] = useFormState(expedierCommande, init);
  return (
    <form action={action}>
      <input type="hidden" name="commande_id" value={commandeId} />

      <table style={{ marginBottom: 16 }}>
        <thead>
          <tr>
            <th>Gamme</th>
            <th>Qté (kg)</th>
            <th>Lot à allouer (libéré)</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => {
            const lots = lotsByGamme[l.gamme_id] ?? [];
            return (
              <tr key={l.id}>
                <td>{l.gamme}</td>
                <td>{l.quantite}</td>
                <td>
                  <select name={`lot_${l.id}`} defaultValue="" required style={{ minWidth: 240 }}>
                    <option value="" disabled>
                      {lots.length ? 'Choisir un lot…' : 'Aucun lot libéré disponible'}
                    </option>
                    {lots.map((lot) => (
                      <option key={lot.id} value={lot.id}>
                        {lot.numero} — dispo {lot.dispo} kg
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="grid cols-3">
        <div className="field">
          <label htmlFor="transporteur_id">Transporteur</label>
          <select id="transporteur_id" name="transporteur_id" defaultValue={transporteurs[0]?.id ?? ''}>
            {transporteurs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="numero_suivi">N° de suivi</label>
          <input id="numero_suivi" name="numero_suivi" />
        </div>
        <div className="field">
          <label htmlFor="poids">Poids (kg)</label>
          <input id="poids" name="poids" type="number" step="0.001" min="0" />
        </div>
        <div className="field">
          <label htmlFor="nb_colis">Nombre de colis</label>
          <input id="nb_colis" name="nb_colis" type="number" min="1" defaultValue="1" />
        </div>
      </div>

      <div className="btn-row">
        <Submit>Expédier &amp; décrémenter le stock</Submit>
        <Status s={state} />
      </div>
    </form>
  );
}
