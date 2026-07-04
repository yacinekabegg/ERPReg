// Rôles génériques (sans prénom) — miroir de l'enum Postgres user_role.
export type Role = 'sales' | 'prod_ops' | 'qualite' | 'depart' | 'admin';

export const ROLE_LABELS: Record<Role, string> = {
  sales: 'Sales',
  prod_ops: 'Prod / Ops / Appro',
  qualite: 'Qualité',
  depart: 'Équipe départ',
  admin: 'Admin',
};

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  roles: Role[]; // rôles autorisés (admin voit tout)
  description: string;
};

// Navigation par module. Filtrée selon les rôles de l'utilisateur.
export const NAV: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Stock',
    icon: '📊',
    roles: ['sales', 'prod_ops', 'qualite', 'depart', 'admin'],
    description: 'Stock disponible par gamme et origine',
  },
  {
    href: '/reception',
    label: 'Réception',
    icon: '📥',
    roles: ['prod_ops', 'admin'],
    description: 'Entrée des lots et upload du CoA fournisseur',
  },
  {
    href: '/qualite',
    label: 'Qualité',
    icon: '🧪',
    roles: ['qualite', 'admin'],
    description: 'Validation des lots : Libérer / Bloquer / Refuser',
  },
  {
    href: '/departs',
    label: 'Départs',
    icon: '🚚',
    roles: ['sales', 'depart', 'admin'],
    description: 'Demandes de départ (échantillon / commande) et expéditions',
  },
  {
    href: '/commandes',
    label: 'Commandes',
    icon: '🧾',
    roles: ['sales', 'prod_ops', 'admin'],
    description: 'Commandes clients',
  },
  {
    href: '/appro',
    label: 'Appro',
    icon: '📦',
    roles: ['prod_ops', 'admin'],
    description: 'Arrivées prévues et retards',
  },
  {
    href: '/admin',
    label: 'Admin',
    icon: '⚙️',
    roles: ['admin'],
    description: 'Utilisateurs, rôles et référentiels',
  },
];

// L'utilisateur a-t-il accès à un item ?
export function canAccess(item: NavItem, roles: Role[]): boolean {
  if (roles.includes('admin')) return true;
  return item.roles.some((r) => roles.includes(r));
}
