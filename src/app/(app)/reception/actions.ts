'use server';

import { revalidatePath } from 'next/cache';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export type FormState = { ok: boolean; message: string };

// Crée un lot en réception : insertion du lot, mouvement d'entrée en stock,
// et upload du CoA fournisseur (Supabase Storage) si fourni.
export async function createLot(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!supabaseConfigured()) {
    return {
      ok: false,
      message: 'Supabase non branché : enregistrement impossible en mode démo.',
    };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Session expirée, reconnectez-vous.' };
  if (!user.roles.includes('prod_ops') && !user.roles.includes('admin')) {
    return { ok: false, message: 'Accès refusé : rôle Prod/Ops requis.' };
  }

  const gamme_id = String(formData.get('gamme_id') || '');
  const origine_id = String(formData.get('origine_id') || '');
  const fournisseur_id = String(formData.get('fournisseur_id') || '') || null;
  const granulometrie = String(formData.get('granulometrie') || '') || null;
  const quantite = Number(formData.get('quantite_recue'));
  const dluo = String(formData.get('dluo') || '') || null;
  const numero_lot_fournisseur = String(formData.get('numero_lot_fournisseur') || '').trim();
  const emplacement_id = String(formData.get('emplacement_id') || '') || null;
  const format = String(formData.get('format') || 'sac');

  if (!gamme_id || !origine_id) {
    return { ok: false, message: 'Gamme et origine sont obligatoires.' };
  }
  if (!numero_lot_fournisseur) {
    return { ok: false, message: 'Le n° de lot fournisseur est obligatoire (identifiant du lot).' };
  }
  if (!Number.isFinite(quantite) || quantite <= 0) {
    return { ok: false, message: 'La quantité reçue doit être un nombre positif (kg).' };
  }

  const supabase = createClient();

  // 1) Insertion du lot (n° de lot CE généré par trigger, statut = en_attente).
  const { data: lot, error: lotErr } = await supabase
    .from('lots')
    .insert({
      gamme_id,
      origine_id,
      fournisseur_id,
      granulometrie,
      quantite_recue: quantite,
      dluo,
      numero_lot_fournisseur,
      emplacement_id,
      created_by: user.id,
    })
    .select('id, numero_lot_ce, numero_lot_fournisseur')
    .single();

  if (lotErr || !lot) {
    return { ok: false, message: `Erreur à l'enregistrement du lot : ${lotErr?.message ?? 'inconnue'}` };
  }

  // 2) Mouvement de stock : entrée de la quantité reçue.
  const { error: mvtErr } = await supabase.from('mouvements_stock').insert({
    lot_id: lot.id,
    type: 'entree',
    format,
    quantite,
    utilisateur: user.id,
    reference: 'reception',
    motif: 'Réception initiale',
  });
  if (mvtErr) {
    return { ok: false, message: `Lot créé mais mouvement de stock en échec : ${mvtErr.message}` };
  }

  // 3) Upload du CoA fournisseur (facultatif) dans le bucket Storage "coa".
  const file = formData.get('coa');
  if (file instanceof File && file.size > 0) {
    const path = `lots/${lot.id}/coa-fournisseur`;
    const { error: upErr } = await supabase.storage
      .from('coa')
      .upload(path, file, { upsert: true, contentType: file.type || 'application/pdf' });
    if (!upErr) {
      await supabase.from('lots').update({ coa_fournisseur_path: path }).eq('id', lot.id);
    }
  }

  revalidatePath('/reception');
  revalidatePath('/dashboard');
  return {
    ok: true,
    message: `Lot ${lot.numero_lot_fournisseur} enregistré en stock (en attente qualité).`,
  };
}
