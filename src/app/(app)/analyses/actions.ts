'use server';

import { revalidatePath } from 'next/cache';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export type FormState = { ok: boolean; message: string };

// Ajoute une analyse au registre (ponctuelle ou biannuelle). Non exploité auto par l'ERP.
export async function addAnalyse(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!supabaseConfigured()) return { ok: false, message: 'Supabase non branché : action impossible en mode démo.' };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Session expirée.' };
  if (!user.roles.includes('qualite') && !user.roles.includes('admin')) {
    return { ok: false, message: 'Accès refusé : rôle Qualité requis.' };
  }

  const type_analyse = String(formData.get('type_analyse') || '').trim();
  if (!type_analyse) return { ok: false, message: 'Le type d’analyse est obligatoire.' };

  const supabase = createClient();

  let fichier_path: string | null = null;
  const file = formData.get('fichier');
  if (file instanceof File && file.size > 0) {
    fichier_path = `analyses/${Date.now().toString(36)}-${file.name}`;
    await supabase.storage.from('coa').upload(fichier_path, file, {
      upsert: true,
      contentType: file.type || 'application/octet-stream',
    });
  }

  const { error } = await supabase.from('suivi_analyses').insert({
    type_analyse,
    date_analyse: String(formData.get('date_analyse') || '') || new Date().toISOString().slice(0, 10),
    valeurs: String(formData.get('valeurs') || '') || null,
    commentaire: String(formData.get('commentaire') || '') || null,
    lot_id: String(formData.get('lot_id') || '') || null,
    fichier_path,
    created_by: user.id,
  });
  if (error) return { ok: false, message: `Échec : ${error.message}` };

  revalidatePath('/analyses');
  return { ok: true, message: `Analyse « ${type_analyse} » enregistrée.` };
}
