// Libellés des états d'une commande fournisseur.
// Module neutre (composant serveur ET client peuvent l'importer sans souci RSC).
export const ETAT_LABEL: Record<string, string> = {
  demande: '1 · Demande (WhatsApp)',
  proforma: '2 · Proforma envoyée',
  paiement: '3 · Paiement envoyé',
  production: '4 · Production lancée',
  expedition: '5 · Expédition Turquie',
  recue: '6 · Réceptionnée',
  annulee: 'Annulée',
};
