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

// Navigation par module — ordre du flux : Appro → Réception → Qualité → Stock →
// Commande client → Départ → Suivi analyses → Admin. Filtrée selon les rôles.
export const NAV: NavItem[] = [
  {
    href: '/appro',
    label: 'Appro',
    icon: '📦',
    roles: ['prod_ops', 'admin'],
    description: 'Commandes fournisseur, arrivées prévues, retards',
  },
  {
    href: '/reception',
    label: 'Réception',
    icon: '📥',
    roles: ['prod_ops', 'admin'],
    description: 'Entrée des lots et documents fournisseur (BL / ATR)',
  },
  {
    href: '/qualite',
    label: 'Qualité',
    icon: '🧪',
    roles: ['qualite', 'admin'],
    description: 'Validation des lots, CoA et génération du certificat',
  },
  {
    href: '/dashboard',
    label: 'Stock',
    icon: '📊',
    roles: ['sales', 'prod_ops', 'qualite', 'depart', 'admin'],
    description: 'Stock disponible par gamme et origine',
  },
  {
    href: '/commandes',
    label: 'Commande client',
    icon: '🧾',
    roles: ['sales', 'prod_ops', 'admin'],
    description: 'Commandes et échantillons clients',
  },
  {
    href: '/departs',
    label: 'Départ',
    icon: '🚚',
    roles: ['depart', 'sales', 'admin'],
    description: 'Préparation et expédition des commandes',
  },
  {
    href: '/analyses',
    label: 'Suivi analyses',
    icon: '🔬',
    roles: ['qualite', 'admin'],
    description: 'Registre des analyses ponctuelles et biannuelles',
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
