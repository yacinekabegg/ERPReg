import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import type { Role } from '@/lib/roles';

export type CurrentUser = {
  id: string;
  email: string | null;
  nom: string;
  roles: Role[];
};

// Récupère l'utilisateur connecté et ses rôles (profil Postgres).
// Retourne null si non connecté ou Supabase non configuré.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!supabaseConfigured()) return null;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profil } = await supabase
    .from('profils')
    .select('nom, roles')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? null,
    nom: profil?.nom ?? user.email ?? 'Utilisateur',
    roles: (profil?.roles ?? []) as Role[],
  };
}
