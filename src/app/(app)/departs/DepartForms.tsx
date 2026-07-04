'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createDemande, expedierDemande, type FormState } from './actions';
import type { Ref, ClientWithAdresses, EligibleLot } from '@/lib/refs';

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

type Line = { key: number; gamme_id: string; origine_id: string; quantite: string };

export function DemandeForm({
  clients,
  gammes,
  origines,
}: {
  clients: ClientWithAdresses[];
  gammes: Ref[];
  origines: Ref[];
}) {
  const [state, action] = useFormState(createDemande, init);
  const [type, setType] = useState('echantillon');
  const [clientId, setClientId] = useState('');
  const [lines, setLines] = useState<Line[]>([
    { key: 1, gamme_id: '', origine_id: '', quantite: '0.050' },
  ]);

  const adresses = clients.find((c) => c.id === clientId)?.adresses ?? [];
  const update = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  if (clients.length === 0) {
    return (
      <div className="notice" style={{ border: 0, padding: 0 }}>
        Aucun client. Créez-en un dans <strong>Commandes</strong> avant de demander un départ.
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="type" value={type} />
      <div className="grid cols-3">
        <div className="field">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="echantillon">Échantillon</option>
            <option value="commande">Commande</option>
          </select>
        </div>
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
          <label htmlFor="priorite">Priorité</label>
          <select id="priorite" name="priorite" defaultValue="normale">
            <option value="normale">Normale</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="date_souhaitee">Date souhaitée</label>
          <input id="date_souhaitee" name="date_souhaitee" type="date" />
        </div>
      </div>

      <label style={{ fontWeight: 600, fontSize: 13, color: 'var(--muted)' }}>
        Lignes {type === 'echantillon' && '(échantillon : 0,050 kg = 50 g par défaut, modifiable)'}
      </label>
      {lines.map((l) => (
        <div key={l.key} className="grid cols-3" style={{ marginTop: 6 }}>
          <div className="field">
            <select value={l.gamme_id} name="gamme_id" onChange={(e) => update(l.key, { gamme_id: e.target.value })}>
              <option value="">Gamme…</option>
              {gammes.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <select value={l.origine_id} name="origine_id" onChange={(e) => update(l.key, { origine_id: e.target.value })}>
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
              onChange={(e) => update(l.key, { quantite: e.target.value })}
            />
          </div>
        </div>
      ))}

      <div className="btn-row" style={{ marginTop: 4 }}>
        <button
          type="button"
          className="btn ghost"
          onClick={() =>
            setLines((ls) => [...ls, { key: Date.now(), gamme_id: '', origine_id: '', quantite: '' }])
          }
        >
          + Ajouter une ligne
        </button>
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="commentaire">Commentaire</label>
        <textarea id="commentaire" name="commentaire" />
      </div>

      <div className="btn-row">
        <Submit>Créer la demande</Submit>
        <Status s={state} />
      </div>
    </form>
  );
}

export function ExpedierForm({
  demandeId,
  lignes,
  lotsByGamme,
  transporteurs,
}: {
  demandeId: string;
  lignes: { id: string; gamme: string; gamme_id: string; quantite: number }[];
  lotsByGamme: Record<string, EligibleLot[]>;
  transporteurs: Ref[];
}) {
  const [state, action] = useFormState(expedierDemande, init);
  return (
    <form action={action}>
      <input type="hidden" name="demande_id" value={demandeId} />

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
