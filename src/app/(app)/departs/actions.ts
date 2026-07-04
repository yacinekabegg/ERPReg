'use server';

import { revalidatePath } from 'next/cache';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import type { Role } from '@/lib/roles';

export type FormState = { ok: boolean; message: string };

async function guard(roles: Role[]): Promise<
  { ok: true; supabase: ReturnType<typeof createClient>; userId: string } | { ok: false; message: string }
> {
  if (!supabaseConfigured()) return { ok: false, message: 'Supabase non branché : action impossible en mode démo.' };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Session expirée.' };
  const allowed = user.roles.includes('admin') || roles.some((r) => user.roles.includes(r));
  if (!allowed) return { ok: false, message: 'Accès refusé.' };
  return { ok: true, supabase: createClient(), userId: user.id };
}

function ref(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

// Sales : crée une demande de départ (échantillon / commande) avec ses lignes.
export async function createDemande(_prev: FormState, formData: FormData): Promise<FormState> {
  const g = await guard(['sales']);
  if (!g.ok) return { ok: false, message: g.message };

  const type = String(formData.get('type') || 'echantillon');
  const client_id = String(formData.get('client_id') || '');
  if (!['echantillon', 'commande'].includes(type)) return { ok: false, message: 'Type invalide.' };
  if (!client_id) return { ok: false, message: 'Sélectionnez un client.' };

  const gammes = formData.getAll('gamme_id').map(String);
  const origines = formData.getAll('origine_id').map(String);
  const qtes = formData.getAll('quantite').map((v) => Number(v));
  const lignes = gammes
    .map((gamme_id, i) => ({ gamme_id, origine_id: origines[i] || null, quantite: qtes[i] }))
    .filter((l) => l.gamme_id && Number.isFinite(l.quantite) && l.quantite > 0);
  if (lignes.length === 0) return { ok: false, message: 'Ajoutez au moins une ligne (gamme + quantité).' };

  const { supabase, userId } = g;
  const { data: dem, error } = await supabase
    .from('demandes_depart')
    .insert({
      numero: ref('DEP'),
      type,
      demandeur_id: userId,
      client_id,
      adresse_id: String(formData.get('adresse_id') || '') || null,
      date_souhaitee: String(formData.get('date_souhaitee') || '') || null,
      priorite: String(formData.get('priorite') || 'normale'),
      commentaire: String(formData.get('commentaire') || '') || null,
      statut: 'demandee',
    })
    .select('id, numero')
    .single();
  if (error || !dem) return { ok: false, message: `Échec : ${error?.message ?? 'inconnu'}` };

  const { error: lErr } = await supabase.from('lignes_depart').insert(
    lignes.map((l) => ({
      demande_id: dem.id,
      gamme_id: l.gamme_id,
      origine_id: l.origine_id,
      quantite: l.quantite,
    })),
  );
  if (lErr) return { ok: false, message: `Demande créée mais lignes en échec : ${lErr.message}` };

  revalidatePath('/departs');
  return { ok: true, message: `Demande ${dem.numero} créée.` };
}

// Équipe départ : alloue les lots et expédie -> décrémente le stock.
export async function expedierDemande(_prev: FormState, formData: FormData): Promise<FormState> {
  const g = await guard(['depart']);
  if (!g.ok) return { ok: false, message: g.message };
  const { supabase, userId } = g;

  const demande_id = String(formData.get('demande_id') || '');
  if (!demande_id) return { ok: false, message: 'Demande introuvable.' };

  const { data: dem } = await supabase
    .from('demandes_depart')
    .select('id, numero, statut')
    .eq('id', demande_id)
    .single();
  if (!dem) return { ok: false, message: 'Demande introuvable.' };
  if (dem.statut === 'expediee' || dem.statut === 'livree') {
    return { ok: false, message: 'Cette demande est déjà expédiée.' };
  }

  const { data: lignes } = await supabase
    .from('lignes_depart')
    .select('id, quantite')
    .eq('demande_id', demande_id);
  if (!lignes || lignes.length === 0) return { ok: false, message: 'Aucune ligne à expédier.' };

  // Récupère le lot alloué par ligne (champ lot_<ligneId>).
  const alloc = lignes.map((l: any) => ({
    ligne_id: l.id as string,
    quantite: Number(l.quantite),
    lot_id: String(formData.get(`lot_${l.id}`) || ''),
  }));
  if (alloc.some((a) => !a.lot_id)) {
    return { ok: false, message: 'Allouez un lot libéré à chaque ligne avant d’expédier.' };
  }

  // 1) Crée l'expédition.
  const { data: exp, error: expErr } = await supabase
    .from('expeditions')
    .insert({
      demande_id,
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

  // 2) Alloue les lots et décrémente le stock (mouvement sortie).
  for (const a of alloc) {
    await supabase.from('lignes_depart').update({ lot_alloue_id: a.lot_id }).eq('id', a.ligne_id);
    await supabase.from('mouvements_stock').insert({
      lot_id: a.lot_id,
      type: 'sortie',
      quantite: -Math.abs(a.quantite),
      utilisateur: userId,
      reference: exp.id,
      motif: `Expédition ${dem.numero}`,
    });
  }

  // 3) Clôture la demande.
  await supabase.from('demandes_depart').update({ statut: 'expediee' }).eq('id', demande_id);
  await supabase.from('journal_audit').insert({
    utilisateur: userId,
    action: 'depart_expedie',
    entite: 'demandes_depart',
    entite_id: demande_id,
    apres: { statut: 'expediee', expedition: exp.id },
  });

  revalidatePath('/departs');
  revalidatePath(`/departs/${demande_id}`);
  revalidatePath('/dashboard');
  return { ok: true, message: `Demande ${dem.numero} expédiée, stock décrémenté.` };
}
