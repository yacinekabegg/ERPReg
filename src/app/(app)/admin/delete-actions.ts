'use server';

import { revalidatePath } from 'next/cache';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export type FormState = { ok: boolean; message: string };

const TYPES = ['lot', 'commande_client', 'commande_fournisseur', 'analyse', 'client'] as const;
type EntityType = (typeof TYPES)[number];

// Suppression d'un enregistrement (réservé admin). Gère les dépendances.
export async function deleteEntity(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!supabaseConfigured()) return { ok: false, message: 'Supabase non branché.' };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Session expirée.' };
  if (!user.roles.includes('admin')) return { ok: false, message: 'Suppression réservée à l’admin.' };

  const type = String(formData.get('type') || '') as EntityType;
  const id = String(formData.get('id') || '');
  if (!TYPES.includes(type) || !id) return { ok: false, message: 'Suppression invalide.' };

  const supabase = createClient();

  try {
    switch (type) {
      case 'lot': {
        // Détache le lot d'éventuelles lignes de commande, puis supprime
        // (mouvements et documents partent en cascade).
        await supabase.from('lignes_commande').update({ lot_alloue_id: null }).eq('lot_alloue_id', id);
        const { error } = await supabase.from('lots').delete().eq('id', id);
        if (error) return { ok: false, message: error.message };
        break;
      }
      case 'commande_client': {
        // Lignes et expéditions partent en cascade.
        const { error } = await supabase.from('commandes_clients').delete().eq('id', id);
        if (error) return { ok: false, message: error.message };
        break;
      }
      case 'commande_fournisseur': {
        await supabase.from('lots').update({ commande_fournisseur_id: null }).eq('commande_fournisseur_id', id);
        const { error } = await supabase.from('commandes_fournisseur').delete().eq('id', id);
        if (error) return { ok: false, message: error.message };
        break;
      }
      case 'analyse': {
        const { error } = await supabase.from('suivi_analyses').delete().eq('id', id);
        if (error) return { ok: false, message: error.message };
        break;
      }
      case 'client': {
        const { count } = await supabase
          .from('commandes_clients')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', id);
        if (count && count > 0) {
          return { ok: false, message: 'Client lié à des commandes : supprimez-les d’abord.' };
        }
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) return { ok: false, message: error.message };
        break;
      }
    }
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  for (const p of ['/reception', '/commandes', '/appro', '/analyses', '/dashboard', '/departs']) {
    revalidatePath(p);
  }
  return { ok: true, message: 'Supprimé.' };
}
