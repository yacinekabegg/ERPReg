// Modèle du CoA Circul'Egg (repris du gabarit Excel « COA »).
// type 'mesure' = saisi lot par lot ; type 'porte' = valeur reportée (pré-remplie, modifiable).

export type CoaParam = {
  cle: string;
  labelFr: string;
  labelEn: string;
  methode: string;
  critere: string;
  unite: string;
  type: 'mesure' | 'porte';
  defaut?: string; // valeur portée par défaut
};

export type CoaSection = { titreFr: string; titreEn: string; params: CoaParam[] };

export const COA_SECTIONS: CoaSection[] = [
  {
    titreFr: 'Caractéristiques',
    titreEn: 'Specifications',
    params: [
      { cle: 'proteines', labelFr: 'Protéines', labelEn: 'Protein', methode: 'Kjeldahl', critere: '> 80 %', unite: '%', type: 'mesure' },
      { cle: 'collagene', labelFr: 'Collagène', labelEn: 'Collagen', methode: 'Sircol™ Insoluble Collagen Assay (modifié)', critere: '> 22 %', unite: '%', type: 'porte', defaut: '> 22 %' },
      { cle: 'elastine', labelFr: 'Élastine', labelEn: 'Elastin', methode: 'Fastin™ Elastin Assay (modifié)', critere: '> 25 %', unite: '%', type: 'porte', defaut: '> 25 %' },
      { cle: 'acide_hyaluronique', labelFr: 'Acide hyaluronique', labelEn: 'Hyaluronic Acid', methode: 'HPLC', critere: '> 3 %', unite: '%', type: 'porte', defaut: '> 3 %' },
      { cle: 'gag', labelFr: 'Glycosaminoglycanes', labelEn: 'Glycosaminoglycans', methode: 'Blyscan™ sulfated Glycosaminoglycan (sGAG) assay', critere: '4-5 %', unite: '%', type: 'porte', defaut: '4-5 %' },
    ],
  },
  {
    titreFr: 'Microbiologie',
    titreEn: 'Microbiology',
    params: [
      { cle: 'micro_org_30', labelFr: 'Micro-organismes à 30°C', labelEn: 'Micro-organisms 30°C', methode: 'XP V08-034', critere: '< 10 000', unite: 'ufc/g', type: 'mesure' },
      { cle: 'enterobacteries', labelFr: 'Entérobactéries', labelEn: 'Enterobacteria', methode: 'NF EN ISO 21528-2 - 37°C', critere: '< 10', unite: 'ufc/g', type: 'mesure' },
      { cle: 'clostridium', labelFr: 'Clostridium perfringens', labelEn: 'Clostridium perfringens', methode: 'NF EN ISO 7937 v2005', critere: '< 100', unite: 'ufc/g', type: 'mesure' },
      { cle: 'salmonella', labelFr: 'Salmonella', labelEn: 'Salmonella', methode: 'BIO 12/16-09/05', critere: 'Non détecté / ND', unite: '/ 25g', type: 'mesure' },
      { cle: 'staph', labelFr: 'Staphylocoque à coagulase positive', labelEn: 'Coagulase-positive staphylococci', methode: 'NF EN ISO 6888-2 37°C', critere: '< 10', unite: 'ufc/g', type: 'mesure' },
      { cle: 'bacillus', labelFr: 'Bacillus cereus présomptifs', labelEn: 'Presumptive Bacillus cereus', methode: 'NF EN ISO 7932', critere: '< 100', unite: 'ufc/g', type: 'mesure' },
      { cle: 'listeria', labelFr: 'Listeria spp', labelEn: 'Listeria spp', methode: 'BIO 12/2-06/94', critere: 'Non détecté / ND', unite: '/ 25g', type: 'mesure' },
    ],
  },
  {
    titreFr: 'Physico-chimie',
    titreEn: 'Physico-chemistry',
    params: [
      { cle: 'granulometrie', labelFr: 'Granulométrie', labelEn: 'Granulometry', methode: 'Granulométrie laser en voie sèche', critere: '< 250', unite: 'µm', type: 'mesure' },
      { cle: 'extrait_sec', labelFr: 'Extrait sec', labelEn: 'Dry extract', methode: 'ISO 787-2 2021 adaptée', critere: '> 90', unite: '%', type: 'mesure' },
    ],
  },
];

export const COA_ALL_PARAMS: CoaParam[] = COA_SECTIONS.flatMap((s) => s.params);

export const COA_ENTREPRISE = {
  nom: "Circul'Egg",
  adresse1: '21 Rue Charles Lindbergh',
  adresse2: '35150 Janzé, France',
  ville: 'Janzé',
};

export const COA_SIGNATAIRE_DEFAUT = 'Anaïs Ratajczak';
export const COA_FONCTION_DEFAUT = 'Responsable Production & Qualité';

export const COA_DECLARATION_FR =
  "Je soussigné(e) {signataire}, agissant en tant que {fonction}, certifie que les produits envoyés par la société Circul'Egg ont subi les contrôles nécessaires, attestant qu'ils ne présentent aucun danger pour l'utilisation prévue. Je déclare que ces produits ne font l'objet d'aucun risque en matière de qualité et de sécurité, et qu'ils sont conformes à la réglementation applicable au produit.";

export const COA_DECLARATION_EN =
  "I, the undersigned {signataire}, acting as {fonction}, certify that the products sent by the company Circul'Egg have undergone the necessary checks, attesting that they do not present any danger for their intended use. I declare that these products are not subject to any quality or safety risks, and that they comply with the regulations applicable to the product.";

// Structure des données CoA stockées dans lots.coa_infos.
export type CoaParamValue = { resultat: string; conforme: boolean };
export type CoaData = {
  produit: string;
  numero_lot: string;
  date_fabrication: string; // AAAA-MM-JJ
  date_expiration: string;
  signataire: string;
  fonction: string;
  params: Record<string, CoaParamValue>;
};

type LotLike = {
  numero_lot_fournisseur?: string | null;
  numero_lot_ce?: string | null;
  gammes?: { nom: string } | null;
  granulometrie?: string | null;
  dluo?: string | null;
  coa_infos?: Record<string, unknown> | null;
};

// Pré-remplit les données CoA à partir du lot (fusionne avec ce qui est déjà en coa_infos.coa).
export function defaultCoaData(lot: LotLike): CoaData {
  const saved = (lot.coa_infos?.coa as Partial<CoaData> | undefined) ?? undefined;
  const params: Record<string, CoaParamValue> = {};
  for (const p of COA_ALL_PARAMS) {
    const prev = saved?.params?.[p.cle];
    params[p.cle] = {
      resultat: prev?.resultat ?? (p.type === 'porte' ? p.defaut ?? '' : ''),
      conforme: prev?.conforme ?? false,
    };
  }
  return {
    produit: saved?.produit ?? lot.gammes?.nom ?? 'REGGENERATE',
    numero_lot: lot.numero_lot_fournisseur ?? lot.numero_lot_ce ?? '',
    date_fabrication: saved?.date_fabrication ?? '',
    date_expiration: saved?.date_expiration ?? lot.dluo ?? '',
    signataire: saved?.signataire ?? COA_SIGNATAIRE_DEFAUT,
    fonction: saved?.fonction ?? COA_FONCTION_DEFAUT,
    params,
  };
}

// Tous les paramètres saisis (résultat non vide) sont-ils cochés conformes ?
export function tousConformes(data: CoaData): boolean {
  const saisis = COA_ALL_PARAMS.filter((p) => (data.params[p.cle]?.resultat ?? '').trim() !== '');
  if (saisis.length === 0) return false;
  return saisis.every((p) => data.params[p.cle]?.conforme === true);
}
