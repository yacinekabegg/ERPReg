'use server';

import { revalidatePath } from 'next/cache';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export type FormState = { ok: boolean; message: string };

type Guard =
  | { ok: true; supabase: ReturnType<typeof createClient>; userId: string }
  | { ok: false; message: string };

async function guard(): Promise<Guard> {
  if (!supabaseConfigured()) {
    return { ok: false, message: 'Supabase non branché : action impossible en mode démo.' };
  }
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Session expirée, reconnectez-vous.' };
  if (!user.roles.includes('qualite') && !user.roles.includes('admin')) {
    return { ok: false, message: 'Accès refusé : rôle Qualité requis.' };
  }
  return { ok: true, supabase: createClient(), userId: user.id };
}

const ZONE_PAR_STATUT: Record<string, string> = {
  libere: 'libere',
  bloque: 'bloque',
  refuse: 'bloque',
};

const LABEL_STATUT: Record<string, string> = {
  libere: 'libéré',
  bloque: 'bloqué',
  refuse: 'refusé',
};

// Décision qualité : Libérer / Bloquer / Refuser + commentaire. Trace un audit.
export async function decideLot(_prev: FormState, formData: FormData): Promise<FormState> {
  const g = await guard();
  if (!g.ok) return { ok: false, message: g.message };

  const lotId = String(formData.get('lot_id') || '');
  const statut = String(formData.get('statut') || '');
  const commentaire = String(formData.get('commentaire') || '') || null;

  if (!lotId) return { ok: false, message: 'Lot introuvable.' };
  if (!['libere', 'bloque', 'refuse'].includes(statut)) {
    return { ok: false, message: 'Décision invalide.' };
  }

  const { supabase, userId } = g;

  // État avant (pour l'audit).
  const { data: before } = await supabase.from('lots').select('statut').eq('id', lotId).single();

  // Emplacement cible selon la décision (best-effort).
  let emplacement_id: string | undefined;
  const { data: emp } = await supabase
    .from('emplacements')
    .select('id')
    .eq('zone', ZONE_PAR_STATUT[statut])
    .limit(1)
    .maybeSingle();
  if (emp?.id) emplacement_id = emp.id as string;

  const { error } = await supabase
    .from('lots')
    .update({
      statut,
      commentaire_qualite: commentaire,
      ...(emplacement_id ? { emplacement_id } : {}),
    })
    .eq('id', lotId);

  if (error) return { ok: false, message: `Échec de la décision : ${error.message}` };

  await supabase.from('journal_audit').insert({
    utilisateur: userId,
    action: `lot_${statut}`,
    entite: 'lots',
    entite_id: lotId,
    avant: { statut: before?.statut ?? null },
    apres: { statut, commentaire },
  });

  revalidatePath('/qualite');
  revalidatePath(`/qualite/${lotId}`);
  revalidatePath('/dashboard');
  return { ok: true, message: `Lot ${LABEL_STATUT[statut]}.` };
}

// Upload du CoA Circul'Egg. Passe le lot en "en_cours" s'il était "en_attente".
export async function uploadCoaCE(_prev: FormState, formData: FormData): Promise<FormState> {
  const g = await guard();
  if (!g.ok) return { ok: false, message: g.message };

  const lotId = String(formData.get('lot_id') || '');
  const file = formData.get('coa');
  if (!lotId) return { ok: false, message: 'Lot introuvable.' };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'Sélectionnez un fichier PDF.' };
  }

  const { supabase } = g;
  const path = `lots/${lotId}/coa-circuegg`;
  const { error: upErr } = await supabase.storage
    .from('coa')
    .upload(path, file, { upsert: true, contentType: file.type || 'application/pdf' });
  if (upErr) return { ok: false, message: `Upload échoué : ${upErr.message}` };

  const { data: cur } = await supabase.from('lots').select('statut').eq('id', lotId).single();
  await supabase
    .from('lots')
    .update({
      coa_circuegg_path: path,
      ...(cur?.statut === 'en_attente' ? { statut: 'en_cours' } : {}),
    })
    .eq('id', lotId);

  revalidatePath(`/qualite/${lotId}`);
  revalidatePath('/qualite');
  return { ok: true, message: 'CoA Circul’Egg enregistré.' };
}

// Sauvegarde des champs informatifs (facultatifs, non bloquants) dans coa_infos.
export async function saveInfos(_prev: FormState, formData: FormData): Promise<FormState> {
  const g = await guard();
  if (!g.ok) return { ok: false, message: g.message };

  const lotId = String(formData.get('lot_id') || '');
  if (!lotId) return { ok: false, message: 'Lot introuvable.' };

  const champs = ['humidite', 'proteines', 'salmonella', 'listeria', 'aspect', 'autres'];
  const infos: Record<string, string> = {};
  for (const c of champs) {
    const v = String(formData.get(c) || '').trim();
    if (v) infos[c] = v;
  }

  const { supabase } = g;
  const { error } = await supabase.from('lots').update({ coa_infos: infos }).eq('id', lotId);
  if (error) return { ok: false, message: `Échec : ${error.message}` };

  revalidatePath(`/qualite/${lotId}`);
  return { ok: true, message: 'Informations enregistrées.' };
}
