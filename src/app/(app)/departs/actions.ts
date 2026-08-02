'use server';

import { revalidatePath } from 'next/cache';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export type FormState = { ok: boolean; message: string };

async function guardDepart(): Promise<
  { ok: true; supabase: ReturnType<typeof createClient>; userId: string } | { ok: false; message: string }
> {
  if (!supabaseConfigured()) return { ok: false, message: 'Supabase non branché : action impossible en mode démo.' };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Session expirée.' };
  if (!user.roles.includes('depart') && !user.roles.includes('admin')) {
    return { ok: false, message: 'Accès refusé : rôle Équipe départ requis.' };
  }
  return { ok: true, supabase: createClient(), userId: user.id };
}

// Marque une commande "en préparation".
export async function prendreEnPreparation(_prev: FormState, formData: FormData): Promise<FormState> {
  const g = await guardDepart();
  if (!g.ok) return { ok: false, message: g.message };
  const id = String(formData.get('commande_id') || '');
  if (!id) return { ok: false, message: 'Commande introuvable.' };
  const { error } = await g.supabase.from('commandes_clients').update({ statut: 'en_preparation' }).eq('id', id);
  if (error) return { ok: false, message: `Échec : ${error.message}` };
  revalidatePath('/departs');
  revalidatePath(`/departs/${id}`);
  return { ok: true, message: 'Commande passée en préparation.' };
}

// Équipe départ : alloue les lots libérés et expédie -> décrémente le stock.
export async function expedierCommande(_prev: FormState, formData: FormData): Promise<FormState> {
  const g = await guardDepart();
  if (!g.ok) return { ok: false, message: g.message };
  const { supabase, userId } = g;

  const commande_id = String(formData.get('commande_id') || '');
  if (!commande_id) return { ok: false, message: 'Commande introuvable.' };

  const { data: cmd } = await supabase
    .from('commandes_clients')
    .select('id, numero, statut, type')
    .eq('id', commande_id)
    .single();
  if (!cmd) return { ok: false, message: 'Commande introuvable.' };
  if (cmd.statut === 'expediee' || cmd.statut === 'cloturee') {
    return { ok: false, message: 'Cette commande est déjà expédiée.' };
  }
  const formatSortie = cmd.type === 'echantillon' ? 'echantillon' : 'sac';

  const { data: lignes } = await supabase
    .from('lignes_commande')
    .select('id, quantite')
    .eq('commande_id', commande_id);
  if (!lignes || lignes.length === 0) return { ok: false, message: 'Aucune ligne à expédier.' };

  const alloc = lignes.map((l: any) => ({
    ligne_id: l.id as string,
    quantite: Number(l.quantite),
    lot_id: String(formData.get(`lot_${l.id}`) || ''),
  }));
  if (alloc.some((a) => !a.lot_id)) {
    return { ok: false, message: 'Allouez un lot libéré à chaque ligne avant d’expédier.' };
  }

  // 1) Expédition rattachée à la commande.
  const { data: exp, error: expErr } = await supabase
    .from('expeditions')
    .insert({
      commande_id,
      transporteur_id: String(formData.get('transporteur_id') || '') || null,
      numero_suivi: String(formData.get('numero_suivi') || '') || null,
      poids: Number(formData.get('poids')) || null,
      nb_colis: Number(formData.get('nb_colis')) || 1,
      date_expedition: new Date().toISOString(),
      statut: 'remise',
    })
    .select('id')
    .single();
  if (expErr || !exp) return { ok: false, message: `Échec expédition : ${expErr?.message ?? 'inconnu'}` };

  // 2) Allocation des lots + décrément du stock.
  for (const a of alloc) {
    await supabase.from('lignes_commande').update({ lot_alloue_id: a.lot_id }).eq('id', a.ligne_id);
    await supabase.from('mouvements_stock').insert({
      lot_id: a.lot_id,
      type: 'sortie',
      format: formatSortie,
      quantite: -Math.abs(a.quantite),
      utilisateur: userId,
      reference: exp.id,
      motif: `Expédition ${cmd.numero}`,
    });
  }

  // 3) Clôture.
  await supabase.from('commandes_clients').update({ statut: 'expediee' }).eq('id', commande_id);
  await supabase.from('journal_audit').insert({
    utilisateur: userId,
    action: 'commande_expediee',
    entite: 'commandes_clients',
    entite_id: commande_id,
    apres: { statut: 'expediee', expedition: exp.id },
  });

  revalidatePath('/departs');
  revalidatePath(`/departs/${commande_id}`);
  revalidatePath('/dashboard');
  return { ok: true, message: `Commande ${cmd.numero} expédiée, stock décrémenté.` };
}
