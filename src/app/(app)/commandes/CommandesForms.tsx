'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createClientAction, createCommandeAction, type FormState } from './actions';
import type { Ref, ClientWithAdresses } from '@/lib/refs';

const init: FormState = { ok: false, message: '' };

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? '…' : children}
    </button>
  );
}
function Status({ s }: { s: FormState }) {
  if (!s.message) return null;
  return <span className={s.ok ? 'badge ok' : 'badge danger'}>{s.message}</span>;
}

export function ClientForm() {
  const [state, action] = useFormState(createClientAction, init);
  return (
    <form action={action}>
      <div className="grid cols-3">
        <div className="field">
          <label htmlFor="raison_sociale">Raison sociale *</label>
          <input id="raison_sociale" name="raison_sociale" required />
        </div>
        <div className="field">
          <label htmlFor="secteur">Secteur</label>
          <select id="secteur" name="secteur" defaultValue="autre">
            <option value="nutraceutique">Nutraceutique</option>
            <option value="cosmetique">Cosmétique</option>
            <option value="petfood">Petfood</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="contact">Contact</label>
          <input id="contact" name="contact" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" />
        </div>
        <div className="field">
          <label htmlFor="tel">Téléphone</label>
          <input id="tel" name="tel" />
        </div>
      </div>
      <div className="grid cols-3">
        <div className="field">
          <label htmlFor="libelle">Adresse — libellé</label>
          <input id="libelle" name="libelle" placeholder="Principale" />
        </div>
        <div className="field">
          <label htmlFor="ligne1">Adresse (ligne 1)</label>
          <input id="ligne1" name="ligne1" />
        </div>
        <div className="field">
          <label htmlFor="ville">Ville</label>
          <input id="ville" name="ville" />
        </div>
        <div className="field">
          <label htmlFor="cp">Code postal</label>
          <input id="cp" name="cp" />
        </div>
      </div>
      <div className="btn-row">
        <Submit>Créer le client</Submit>
        <Status s={state} />
      </div>
    </form>
  );
}

type Line = { key: number; gamme_id: string; origine_id: string; quantite: string; remarques: string };

export function CommandeForm({
  clients,
  gammes,
  origines,
}: {
  clients: ClientWithAdresses[];
  gammes: Ref[];
  origines: Ref[];
}) {
  const [state, action] = useFormState(createCommandeAction, init);
  const [clientId, setClientId] = useState('');
  const [type, setType] = useState('commande');
  const [lines, setLines] = useState<Line[]>([
    { key: 1, gamme_id: '', origine_id: '', quantite: '', remarques: '' },
  ]);

  const adresses = clients.find((c) => c.id === clientId)?.adresses ?? [];

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function removeLine(key: number) {
    setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls));
  }
  // Change de type : un échantillon pré-remplit les quantités vides à 0,050 kg (50 g).
  function changeType(t: string) {
    setType(t);
    if (t === 'echantillon') {
      setLines((ls) => ls.map((l) => (l.quantite.trim() === '' ? { ...l, quantite: '0.050' } : l)));
    }
  }

  if (clients.length === 0) {
    return (
      <div className="notice" style={{ border: 0, padding: 0 }}>
        Créez d&apos;abord un client ci-dessus pour pouvoir saisir une commande.
      </div>
    );
  }

  return (
    <form action={action}>
      <div className="grid cols-3">
        <div className="field">
          <label htmlFor="client_id">Client *</label>
          <select
            id="client_id"
            name="client_id"
            required
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="" disabled>
              Choisir…
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="adresse_id">Adresse de livraison</label>
          <select id="adresse_id" name="adresse_id" defaultValue="">
            <option value="">—</option>
            {adresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Type</label>
          <select name="type" value={type} onChange={(e) => changeType(e.target.value)}>
            <option value="commande">Commande</option>
            <option value="echantillon">Échantillon</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="priorite">Priorité</label>
          <select id="priorite" name="priorite" defaultValue="normale">
            <option value="normale">Normale</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="date_souhaitee">Date voulue</label>
          <input id="date_souhaitee" name="date_souhaitee" type="date" />
        </div>
      </div>

      <label style={{ fontWeight: 600, fontSize: 13, color: 'var(--muted)' }}>
        Lignes {type === 'echantillon' && '(échantillon)'}
      </label>
      {lines.map((l) => (
        <div key={l.key} className="grid cols-3" style={{ marginTop: 6 }}>
          <div className="field">
            <select
              name="gamme_id"
              value={l.gamme_id}
              onChange={(e) => updateLine(l.key, { gamme_id: e.target.value })}
            >
              <option value="">Grade / gamme…</option>
              {gammes.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <select
              name="origine_id"
              value={l.origine_id}
              onChange={(e) => updateLine(l.key, { origine_id: e.target.value })}
            >
              <option value="">Origine (indiff.)</option>
              {origines.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <input
              name="quantite"
              type="number"
              step="0.001"
              min="0"
              placeholder="Quantité (kg)"
              value={l.quantite}
              onChange={(e) => updateLine(l.key, { quantite: e.target.value })}
            />
          </div>
          <div className="field">
            <input
              name="remarques"
              placeholder="Remarques (ex. premium)"
              value={l.remarques}
              onChange={(e) => updateLine(l.key, { remarques: e.target.value })}
            />
          </div>
          {lines.length > 1 && (
            <div className="field" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn ghost"
                title="Supprimer cette ligne"
                onClick={() => removeLine(l.key)}
                style={{ color: 'var(--danger)' }}
              >
                ✕ Retirer
              </button>
            </div>
          )}
        </div>
      ))}

      <div className="btn-row" style={{ marginTop: 4 }}>
        <button
          type="button"
          className="btn ghost"
          onClick={() =>
            setLines((ls) => [...ls, { key: Date.now(), gamme_id: '', origine_id: '', quantite: '', remarques: '' }])
          }
        >
          + Ajouter une ligne
        </button>
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="commentaire">Commentaire</label>
        <input id="commentaire" name="commentaire" />
      </div>

      <div className="btn-row" style={{ marginTop: 4 }}>
        <Submit>Créer</Submit>
        <Status s={state} />
      </div>
    </form>
  );
}
