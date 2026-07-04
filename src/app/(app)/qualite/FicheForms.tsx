'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { decideLot, uploadCoaCE, saveInfos, type FormState } from './actions';

const init: FormState = { ok: false, message: '' };

function Status({ state }: { state: FormState }) {
  if (!state.message) return null;
  return <span className={state.ok ? 'badge ok' : 'badge danger'}>{state.message}</span>;
}

function Submit({ children, className = 'btn' }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending}>
      {pending ? '…' : children}
    </button>
  );
}

type Infos = Record<string, string> | null;

export function CoaCEForm({ lotId, hasCoa }: { lotId: string; hasCoa: boolean }) {
  const [state, action] = useFormState(uploadCoaCE, init);
  return (
    <form action={action}>
      <input type="hidden" name="lot_id" value={lotId} />
      <div className="field">
        <label htmlFor="coa">CoA Circul&apos;Egg (PDF){hasCoa ? ' — remplacer' : ''}</label>
        <input id="coa" name="coa" type="file" accept="application/pdf,.pdf" required />
      </div>
      <div className="btn-row">
        <Submit className="btn ghost">Enregistrer le CoA</Submit>
        <Status state={state} />
      </div>
    </form>
  );
}

export function InfosForm({ lotId, infos }: { lotId: string; infos: Infos }) {
  const [state, action] = useFormState(saveInfos, init);
  const v = (k: string) => infos?.[k] ?? '';
  return (
    <form action={action}>
      <input type="hidden" name="lot_id" value={lotId} />
      <div className="grid cols-3">
        <div className="field">
          <label htmlFor="humidite">Humidité</label>
          <input id="humidite" name="humidite" defaultValue={v('humidite')} placeholder="ex. 8 %" />
        </div>
        <div className="field">
          <label htmlFor="proteines">Protéines</label>
          <input id="proteines" name="proteines" defaultValue={v('proteines')} placeholder="ex. 90 %" />
        </div>
        <div className="field">
          <label htmlFor="salmonella">Salmonella</label>
          <input id="salmonella" name="salmonella" defaultValue={v('salmonella')} placeholder="ex. absence /25g" />
        </div>
        <div className="field">
          <label htmlFor="listeria">Listeria</label>
          <input id="listeria" name="listeria" defaultValue={v('listeria')} placeholder="ex. absence /25g" />
        </div>
        <div className="field">
          <label htmlFor="aspect">Aspect / couleur</label>
          <input id="aspect" name="aspect" defaultValue={v('aspect')} />
        </div>
        <div className="field">
          <label htmlFor="autres">Autres</label>
          <input id="autres" name="autres" defaultValue={v('autres')} />
        </div>
      </div>
      <div className="btn-row">
        <Submit className="btn ghost">Enregistrer les infos</Submit>
        <Status state={state} />
      </div>
    </form>
  );
}

export function DecisionForm({ lotId }: { lotId: string }) {
  const [state, action] = useFormState(decideLot, init);
  return (
    <form action={action}>
      <input type="hidden" name="lot_id" value={lotId} />
      <div className="field">
        <label htmlFor="commentaire">Commentaire (motif de blocage / refus, dérogation…)</label>
        <textarea id="commentaire" name="commentaire" />
      </div>
      <div className="btn-row">
        {/* Chaque bouton soumet avec sa valeur de statut. */}
        <button className="btn" type="submit" name="statut" value="libere">
          ✅ Libérer
        </button>
        <button className="btn warn" type="submit" name="statut" value="bloque">
          ⛔ Bloquer
        </button>
        <button className="btn danger" type="submit" name="statut" value="refuse">
          ✖ Refuser
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}
