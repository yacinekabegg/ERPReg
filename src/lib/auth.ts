import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import type { Role } from '@/lib/roles';

export type CurrentUser = {
  id: string;
  email: string | null;
  nom: string;
  roles: Role[];
};

// Récupère l'utilisateur connecté et ses rôles (profil Postgres).
// Retourne null si non connecté, Supabase non configuré, ou base indisponible.
// Ne lève jamais : une base en pause ne doit pas planter toute l'application.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!supabaseConfigured()) return null;

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    const user = data?.user;
    if (error || !user) return null;

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
  } catch {
    return null;
  }
}
