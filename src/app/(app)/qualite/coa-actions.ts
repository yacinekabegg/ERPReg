'use server';

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { revalidatePath } from 'next/cache';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { CoaDocument } from '@/components/pdf/CoaDocument';
import { COA_ALL_PARAMS, defaultCoaData, tousConformes, type CoaData } from '@/lib/coa-template';

export type FormState = { ok: boolean; message: string };

async function guard(): Promise<
  { ok: true; supabase: ReturnType<typeof createClient>; userId: string } | { ok: false; message: string }
> {
  if (!supabaseConfigured()) return { ok: false, message: 'Supabase non branché : action impossible en mode démo.' };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Session expirée.' };
  if (!user.roles.includes('qualite') && !user.roles.includes('admin')) {
    return { ok: false, message: 'Accès refusé : rôle Qualité requis.' };
  }
  return { ok: true, supabase: createClient(), userId: user.id };
}

// Enregistre les paramètres du CoA et, si demandé (action="generer"),
// vérifie que tout est conforme puis génère et stocke le PDF.
export async function soumettreCoA(_prev: FormState, formData: FormData): Promise<FormState> {
  const g = await guard();
  if (!g.ok) return { ok: false, message: g.message };
  const { supabase, userId } = g;

  const lotId = String(formData.get('lot_id') || '');
  const action = String(formData.get('action') || 'save');
  if (!lotId) return { ok: false, message: 'Lot introuvable.' };

  // Recompose la structure CoA depuis le formulaire.
  const params: CoaData['params'] = {};
  for (const p of COA_ALL_PARAMS) {
    params[p.cle] = {
      resultat: String(formData.get(`res_${p.cle}`) || '').trim(),
      conforme: formData.get(`conf_${p.cle}`) === 'on',
    };
  }
  const coa: CoaData = {
    produit: String(formData.get('produit') || '').trim() || 'REGGENERATE',
    numero_lot: String(formData.get('numero_lot') || '').trim(),
    date_fabrication: String(formData.get('date_fabrication') || ''),
    date_expiration: String(formData.get('date_expiration') || ''),
    signataire: String(formData.get('signataire') || '').trim(),
    fonction: String(formData.get('fonction') || '').trim(),
    params,
  };

  // Fusionne dans coa_infos (préserve d'éventuelles autres clés).
  const { data: lotRow } = await supabase.from('lots').select('coa_infos').eq('id', lotId).single();
  const coa_infos = { ...((lotRow?.coa_infos as Record<string, unknown>) ?? {}), coa };
  const { error: saveErr } = await supabase.from('lots').update({ coa_infos }).eq('id', lotId);
  if (saveErr) return { ok: false, message: `Échec de l'enregistrement : ${saveErr.message}` };

  if (action !== 'generer') {
    revalidatePath(`/qualite/${lotId}`);
    return { ok: true, message: 'Paramètres du CoA enregistrés.' };
  }

  // Génération : tous les paramètres saisis doivent être conformes.
  if (!tousConformes(coa)) {
    return {
      ok: false,
      message: 'Génération refusée : cochez « conforme » sur tous les paramètres saisis (au moins un requis).',
    };
  }

  let buffer: Buffer;
  try {
    const element = React.createElement(CoaDocument, { data: coa }) as unknown as Parameters<
      typeof renderToBuffer
    >[0];
    buffer = await renderToBuffer(element);
  } catch (e) {
    return { ok: false, message: `Échec de génération du PDF : ${(e as Error).message}` };
  }

  const path = `lots/${lotId}/coa-circuegg.pdf`;
  const { error: upErr } = await supabase.storage
    .from('coa')
    .upload(path, buffer, { upsert: true, contentType: 'application/pdf' });
  if (upErr) return { ok: false, message: `Upload du PDF échoué : ${upErr.message}` };

  await supabase.from('lots').update({ coa_circuegg_path: path }).eq('id', lotId);
  await supabase.from('journal_audit').insert({
    utilisateur: userId,
    action: 'coa_genere',
    entite: 'lots',
    entite_id: lotId,
    apres: { numero_lot: coa.numero_lot },
  });

  revalidatePath(`/qualite/${lotId}`);
  return { ok: true, message: `CoA généré pour le lot ${coa.numero_lot}.` };
}
