import { createClient, supabaseConfigured } from '@/lib/supabase/server';

export type Ref = { id: string; label: string };
export type Adresse = { id: string; label: string };
export type ClientWithAdresses = { id: string; nom: string; adresses: Adresse[] };
export type EligibleLot = { id: string; numero: string; gamme_id: string; dispo: number };

// Toutes les fonctions ci-dessous ne lèvent jamais : en cas d'indisponibilité de la
// base, elles renvoient une liste vide (la page s'affiche sans planter).

export async function getGammes(): Promise<Ref[]> {
  if (!supabaseConfigured()) return [];
  try {
    const { data } = await createClient().from('gammes').select('id, nom').eq('actif', true).order('nom');
    return (data ?? []).map((x) => ({ id: x.id as string, label: x.nom as string }));
  } catch {
    return [];
  }
}

export async function getOrigines(): Promise<Ref[]> {
  if (!supabaseConfigured()) return [];
  try {
    const { data } = await createClient().from('origines').select('id, pays').eq('actif', true).order('pays');
    return (data ?? []).map((x) => ({ id: x.id as string, label: x.pays as string }));
  } catch {
    return [];
  }
}

export async function getTransporteurs(): Promise<Ref[]> {
  if (!supabaseConfigured()) return [];
  try {
    const { data } = await createClient().from('transporteurs').select('id, nom').order('nom');
    return (data ?? []).map((x) => ({ id: x.id as string, label: x.nom as string }));
  } catch {
    return [];
  }
}

export async function getFournisseurs(): Promise<Ref[]> {
  if (!supabaseConfigured())
    return [
      { id: 'demo-egglin', label: 'Egglin' },
      { id: 'demo-eggnovo', label: 'Eggnovo' },
      { id: 'demo-lessonia', label: 'Lessonia' },
    ];
  try {
    const { data } = await createClient().from('fournisseurs').select('id, nom').eq('actif', true).order('nom');
    return (data ?? []).map((x) => ({ id: x.id as string, label: x.nom as string }));
  } catch {
    return [];
  }
}

export async function getClientsWithAdresses(): Promise<ClientWithAdresses[]> {
  if (!supabaseConfigured()) return [];
  try {
    const { data } = await createClient()
      .from('clients')
      .select('id, raison_sociale, adresses_livraison(id, libelle, ville)')
      .order('raison_sociale');
    return (data ?? []).map((c: any) => ({
      id: c.id as string,
      nom: c.raison_sociale as string,
      adresses: (c.adresses_livraison ?? []).map((a: any) => ({
        id: a.id as string,
        label: [a.libelle, a.ville].filter(Boolean).join(' — ') || 'Adresse',
      })),
    }));
  } catch {
    return [];
  }
}

// Lots éligibles à l'allocation : libérés, avec quantité disponible > 0.
export async function getEligibleLots(): Promise<EligibleLot[]> {
  if (!supabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const [lotsRes, stockRes] = await Promise.all([
      supabase.from('lots').select('id, numero_lot_ce, numero_lot_fournisseur, gamme_id').eq('statut', 'libere'),
      supabase.from('v_stock_lot').select('lot_id, quantite_disponible, disponible_vente'),
    ]);
    const dispo = new Map<string, number>();
    for (const s of (stockRes.data as any[]) ?? []) {
      if (s.disponible_vente) dispo.set(s.lot_id as string, Number(s.quantite_disponible) || 0);
    }
    return ((lotsRes.data as any[]) ?? [])
      .map((l) => ({
        id: l.id as string,
        numero: (l.numero_lot_fournisseur as string) ?? (l.numero_lot_ce as string) ?? '',
        gamme_id: l.gamme_id as string,
        dispo: dispo.get(l.id as string) ?? 0,
      }))
      .filter((l) => l.dispo > 0);
  } catch {
    return [];
  }
}
