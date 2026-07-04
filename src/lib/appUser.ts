import { getCurrentUser, type CurrentUser } from '@/lib/auth';
import { supabaseConfigured } from '@/lib/supabase/server';
import type { Role } from '@/lib/roles';

// Utilisateur de démonstration quand Supabase n'est pas encore branché :
// tous les rôles, pour pouvoir parcourir l'application.
const DEMO_USER: CurrentUser = {
  id: 'demo',
  email: 'demo@circulegg.fr',
  nom: 'Démo (tous rôles)',
  roles: ['sales', 'prod_ops', 'qualite', 'depart', 'admin'],
};

// Retourne l'utilisateur applicatif : réel si connecté, sinon démo (hors ligne).
// Retourne null uniquement si Supabase est configuré mais aucune session (=> login).
export async function getAppUser(): Promise<CurrentUser | null> {
  if (!supabaseConfigured()) return DEMO_USER;
  return getCurrentUser();
}

export function hasAnyRole(userRoles: Role[], allowed: Role[]): boolean {
  if (userRoles.includes('admin')) return true;
  return allowed.some((r) => userRoles.includes(r));
}
