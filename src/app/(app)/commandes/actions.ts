'use server';

import { revalidatePath } from 'next/cache';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export type FormState = { ok: boolean; message: string };

async function guardSales(): Promise<
  { ok: true; supabase: ReturnType<typeof createClient>; userId: string } | { ok: false; message: string }
> {
  if (!supabaseConfigured()) return { ok: false, message: 'Supabase non branché : action impossible en mode démo.' };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Session expirée.' };
  if (!user.roles.includes('sales') && !user.roles.includes('admin')) {
    return { ok: false, message: 'Accès refusé : rôle Sales requis.' };
  }
  return { ok: true, supabase: createClient(), userId: user.id };
}

function ref(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

// Crée un client + une adresse de livraison par défaut.
export async function createClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const g = await guardSales();
  if (!g.ok) return { ok: false, message: g.message };

  const raison_sociale = String(formData.get('raison_sociale') || '').trim();
  if (!raison_sociale) return { ok: false, message: 'La raison sociale est obligatoire.' };

  const { supabase } = g;
  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      raison_sociale,
      secteur: String(formData.get('secteur') || 'autre'),
      contact: String(formData.get('contact') || '') || null,
      email: String(formData.get('email') || '') || null,
      tel: String(formData.get('tel') || '') || null,
    })
    .select('id')
    .single();
  if (error || !client) return { ok: false, message: `Échec : ${error?.message ?? 'inconnu'}` };

  const ligne1 = String(formData.get('ligne1') || '').trim();
  if (ligne1) {
    await supabase.from('adresses_livraison').insert({
      client_id: client.id,
      libelle: String(formData.get('libelle') || 'Principale'),
      ligne1,
      cp: String(formData.get('cp') || '') || null,
      ville: String(formData.get('ville') || '') || null,
      par_defaut: true,
    });
  }

  revalidatePath('/commandes');
  revalidatePath('/departs');
  return { ok: true, message: `Client « ${raison_sociale} » créé.` };
}

// Crée une commande client avec ses lignes.
export async function createCommandeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const g = await guardSales();
  if (!g.ok) return { ok: false, message: g.message };

  const client_id = String(formData.get('client_id') || '');
  if (!client_id) return { ok: false, message: 'Sélectionnez un client.' };

  const type = String(formData.get('type') || 'commande');
  if (!['echantillon', 'commande'].includes(type)) return { ok: false, message: 'Type invalide.' };

  const gammes = formData.getAll('gamme_id').map(String);
  const origines = formData.getAll('origine_id').map(String);
  const qtes = formData.getAll('quantite').map((v) => Number(v));
  const remarques = formData.getAll('remarques').map(String);
  const lignes = gammes
    .map((gamme_id, i) => ({
      gamme_id,
      origine_id: origines[i] || null,
      quantite: qtes[i],
      remarques: remarques[i] || null,
    }))
    .filter((l) => l.gamme_id && Number.isFinite(l.quantite) && l.quantite > 0);
  if (lignes.length === 0) return { ok: false, message: 'Ajoutez au moins une ligne (gamme + quantité).' };

  const { supabase, userId } = g;
  const { data: cmd, error } = await supabase
    .from('commandes_clients')
    .insert({
      numero: ref(type === 'echantillon' ? 'ECH' : 'CMD'),
      client_id,
      adresse_id: String(formData.get('adresse_id') || '') || null,
      type,
      priorite: String(formData.get('priorite') || 'normale'),
      date_souhaitee: String(formData.get('date_souhaitee') || '') || null,
      commentaire: String(formData.get('commentaire') || '') || null,
      statut: 'confirmee',
      created_by: userId,
    })
    .select('id, numero')
    .single();
  if (error || !cmd) return { ok: false, message: `Échec : ${error?.message ?? 'inconnu'}` };

  const { error: lErr } = await supabase.from('lignes_commande').insert(
    lignes.map((l) => ({
      commande_id: cmd.id,
      gamme_id: l.gamme_id,
      origine_id: l.origine_id,
      quantite: l.quantite,
      remarques: l.remarques,
    })),
  );
  if (lErr) return { ok: false, message: `Commande créée mais lignes en échec : ${lErr.message}` };

  revalidatePath('/commandes');
  revalidatePath('/departs');
  return { ok: true, message: `${type === 'echantillon' ? 'Échantillon' : 'Commande'} ${cmd.numero} créé(e).` };
}
