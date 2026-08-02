'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { deleteEntity, type FormState } from '@/app/(app)/admin/delete-actions';

const init: FormState = { ok: false, message: '' };

function Btn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      title={`Supprimer ${label}`}
      onClick={(e) => {
        if (!confirm(`Supprimer ${label} ? Cette action est définitive.`)) e.preventDefault();
      }}
      disabled={pending}
      style={{
        background: 'transparent',
        border: '1px solid var(--border)',
        color: 'var(--danger)',
        borderRadius: 6,
        padding: '4px 8px',
        cursor: 'pointer',
        fontSize: 13,
      }}
    >
      {pending ? '…' : '🗑'}
    </button>
  );
}

// Bouton de suppression (admin). N'affiche rien si l'utilisateur n'est pas admin.
export default function DeleteButton({
  type,
  id,
  label,
  canDelete,
}: {
  type: 'lot' | 'commande_client' | 'commande_fournisseur' | 'analyse' | 'client';
  id: string;
  label: string;
  canDelete: boolean;
}) {
  const [state, action] = useFormState(deleteEntity, init);
  if (!canDelete) return null;
  return (
    <form action={action} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <Btn label={label} />
      {state.message && !state.ok && <span className="badge danger">{state.message}</span>}
    </form>
  );
}
