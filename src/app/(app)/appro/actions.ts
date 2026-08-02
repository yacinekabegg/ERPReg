'use server';

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { revalidatePath } from 'next/cache';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { BonCommandeDocument } from '@/components/pdf/BonCommandeDocument';

export type FormState = { ok: boolean; message: string };

const ETATS = ['demande', 'proforma', 'paiement', 'production', 'expedition', 'recue', 'annulee'];

async function guard(): Promise<
  { ok: true; supabase: ReturnType<typeof createClient>; userId: string } | { ok: false; message: string }
> {
  if (!supabaseConfigured()) return { ok: false, message: 'Supabase non branché : action impossible en mode démo.' };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Session expirée.' };
  if (!user.roles.includes('prod_ops') && !user.roles.includes('admin')) {
    return { ok: false, message: 'Accès refusé : rôle Prod/Ops requis.' };
  }
  return { ok: true, supabase: createClient(), userId: user.id };
}

// Crée une commande fournisseur (appro).
export async function createCommandeFournisseur(_prev: FormState, formData: FormData): Promise<FormState> {
  const g = await guard();
  if (!g.ok) return { ok: false, message: g.message };

  const gamme_id = String(formData.get('gamme_id') || '');
  const origine_id = String(formData.get('origine_id') || '');
  const quantite = Number(formData.get('quantite_attendue'));
  if (!gamme_id || !origine_id) return { ok: false, message: 'Gamme et origine sont obligatoires.' };
  if (!Number.isFinite(quantite) || quantite <= 0) {
    return { ok: false, message: 'La quantité attendue doit être un nombre positif (kg).' };
  }

  const { supabase } = g;
  const numero_bdc = String(formData.get('numero_bdc') || '') || null;
  const { data, error } = await supabase
    .from('commandes_fournisseur')
    .insert({
      numero: numero_bdc ?? `APP-${Date.now().toString(36).toUpperCase()}`,
      numero_bdc,
      fournisseur_id: String(formData.get('fournisseur_id') || '') || null,
      gamme_id,
      origine_id,
      quantite_attendue: quantite,
      date_commande: String(formData.get('date_commande') || '') || new Date().toISOString().slice(0, 10),
      date_prevue: String(formData.get('date_prevue') || '') || null,
      commentaires: String(formData.get('commentaires') || '') || null,
      etat: 'demande',
    })
    .select('id, numero')
    .single();
  if (error || !data) return { ok: false, message: `Échec : ${error?.message ?? 'inconnu'}` };

  // Génère le bon de commande fournisseur (PDF) et le rattache à la commande.
  try {
    const { data: full } = await supabase
      .from('commandes_fournisseur')
      .select('numero, numero_bdc, quantite_attendue, date_commande, date_prevue, commentaires, gammes(nom), origines(pays), fournisseurs(nom)')
      .eq('id', data.id)
      .single();
    if (full) {
      const f = full as any;
      const element = React.createElement(BonCommandeDocument, {
        data: {
          numero: f.numero,
          numero_bdc: f.numero_bdc,
          fournisseur: f.fournisseurs?.nom ?? '—',
          gamme: f.gammes?.nom ?? '—',
          origine: f.origines?.pays ?? '—',
          quantite: Number(f.quantite_attendue),
          date_commande: f.date_commande,
          date_prevue: f.date_prevue,
          commentaires: f.commentaires,
        },
      }) as unknown as Parameters<typeof renderToBuffer>[0];
      const buffer = await renderToBuffer(element);
      const path = `commandes-fournisseur/${data.id}.pdf`;
      const { error: upErr } = await supabase.storage
        .from('coa')
        .upload(path, buffer, { upsert: true, contentType: 'application/pdf' });
      if (!upErr) await supabase.from('commandes_fournisseur').update({ pdf_path: path }).eq('id', data.id);
    }
  } catch {
    // La commande est créée même si la génération du PDF échoue.
  }

  revalidatePath('/appro');
  revalidatePath('/dashboard');
  return { ok: true, message: `Commande ${data.numero} créée (bon de commande généré).` };
}

// Avance (ou change) l'état d'une commande dans le workflow 6 étapes.
export async function setEtatCommande(_prev: FormState, formData: FormData): Promise<FormState> {
  const g = await guard();
  if (!g.ok) return { ok: false, message: g.message };

  const id = String(formData.get('commande_id') || '');
  const etat = String(formData.get('etat') || '');
  if (!id) return { ok: false, message: 'Commande introuvable.' };
  if (!ETATS.includes(etat)) return { ok: false, message: 'État invalide.' };

  const { supabase, userId } = g;
  const patch: Record<string, unknown> = { etat };
  if (etat === 'paiement') patch.date_paiement = new Date().toISOString().slice(0, 10);
  if (etat === 'recue') patch.date_reelle = new Date().toISOString().slice(0, 10);
  const numero_proforma = String(formData.get('numero_proforma') || '');
  if (numero_proforma) patch.numero_proforma = numero_proforma;

  const { error } = await supabase.from('commandes_fournisseur').update(patch).eq('id', id);
  if (error) return { ok: false, message: `Échec : ${error.message}` };

  await supabase.from('journal_audit').insert({
    utilisateur: userId,
    action: 'appro_etat',
    entite: 'commandes_fournisseur',
    entite_id: id,
    apres: { etat },
  });

  revalidatePath('/appro');
  revalidatePath('/dashboard');
  return { ok: true, message: 'État mis à jour.' };
}
