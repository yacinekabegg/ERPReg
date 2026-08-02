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
  let fournisseur_id = String(formData.get('fournisseur_id') || '') || null;
  const fournisseur_autre = String(formData.get('fournisseur_autre') || '').trim();
  const quantite = Number(formData.get('quantite_recue'));
  const dluo = String(formData.get('dluo') || '') || null;
  const numero_lot_fournisseur = String(formData.get('numero_lot_fournisseur') || '').trim();
  const emplacement_id = String(formData.get('emplacement_id') || '') || null;
  const commande_fournisseur_id = String(formData.get('commande_fournisseur_id') || '') || null;

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

  // Fournisseur "Autre" : crée (ou retrouve) le fournisseur à la volée.
  if (fournisseur_id === '__autre__') {
    fournisseur_id = null;
    if (fournisseur_autre) {
      await supabase.from('fournisseurs').insert({ nom: fournisseur_autre }).select('id');
      const { data: f } = await supabase.from('fournisseurs').select('id').eq('nom', fournisseur_autre).maybeSingle();
      fournisseur_id = (f?.id as string) ?? null;
    }
  }

  // 1) Insertion du lot (n° de lot interne CE généré par trigger, statut = en_attente).
  const { data: lot, error: lotErr } = await supabase
    .from('lots')
    .insert({
      gamme_id,
      origine_id,
      fournisseur_id,
      quantite_recue: quantite,
      dluo,
      numero_lot_fournisseur,
      emplacement_id,
      commande_fournisseur_id,
      created_by: user.id,
    })
    .select('id, numero_lot_ce, numero_lot_fournisseur')
    .single();

  if (lotErr || !lot) {
    return { ok: false, message: `Erreur à l'enregistrement du lot : ${lotErr?.message ?? 'inconnue'}` };
  }

  // 2) Mouvement de stock : entrée de la quantité reçue (toujours en sac).
  const { error: mvtErr } = await supabase.from('mouvements_stock').insert({
    lot_id: lot.id,
    type: 'entree',
    format: 'sac',
    quantite,
    utilisateur: user.id,
    reference: 'reception',
    motif: 'Réception initiale',
  });
  if (mvtErr) {
    return { ok: false, message: `Lot créé mais mouvement de stock en échec : ${mvtErr.message}` };
  }

  // 3) Documents fournisseur : BL et ATR (facultatifs) -> lot_documents.
  for (const [champ, categorie] of [
    ['bl', 'bl'],
    ['atr', 'atr'],
  ] as const) {
    const file = formData.get(champ);
    if (file instanceof File && file.size > 0) {
      const path = `lots/${lot.id}/${categorie}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('coa')
        .upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' });
      if (!upErr) {
        await supabase.from('lot_documents').insert({
          lot_id: lot.id,
          categorie,
          path,
          filename: file.name,
          created_by: user.id,
        });
      }
    }
  }

  // 4) Réception partielle : si la commande fournisseur rattachée est
  //    entièrement reçue, elle passe automatiquement en "Réceptionnée".
  if (commande_fournisseur_id) {
    const { data: stat } = await supabase
      .from('v_appro')
      .select('reste_a_recevoir')
      .eq('id', commande_fournisseur_id)
      .maybeSingle();
    if (stat && Number(stat.reste_a_recevoir) <= 0) {
      await supabase
        .from('commandes_fournisseur')
        .update({ etat: 'recue', date_reelle: new Date().toISOString().slice(0, 10) })
        .eq('id', commande_fournisseur_id);
    }
  }

  revalidatePath('/reception');
  revalidatePath('/dashboard');
  revalidatePath('/appro');
  return {
    ok: true,
    message: `Lot ${lot.numero_lot_fournisseur} enregistré en stock (en attente qualité).`,
  };
}
