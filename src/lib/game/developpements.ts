/**
 * Développements nationaux (docs/A-INTEGRER.md §48, migration 0054) : un catalogue fixe de 9
 * développements, 3 par famille (attaque, défense, développement), financés par les ressources
 * nationales et débloqués par un vote hebdomadaire du pays.
 *
 * Source de vérité pour l'affichage ; le calcul réel (options de la semaine, clôture du vote, stock,
 * effets) vit côté serveur (supabase/migrations/0054_developpements_nationaux.sql, anti-triche) — à
 * tenir synchronisé si ces chiffres changent (tests/unit/developpements.test.ts compare les deux).
 */

/** Les quatre catégories de ressource nationale (Jalon 10), dans l'ordre d'affichage. */
export const CATEGORIES_RESSOURCE = ["industrie", "techno", "culture", "commerce"] as const;
export type CategorieRessource = (typeof CATEGORIES_RESSOURCE)[number];

export const FAMILLES_DEVELOPPEMENT = ["attaque", "defense", "developpement"] as const;
export type FamilleDeveloppement = (typeof FAMILLES_DEVELOPPEMENT)[number];

export type IdDeveloppement =
  | "arsenal_national"
  | "mobilisation_eclair"
  | "service_renseignement"
  | "fortifications"
  | "bouclier_civil"
  | "resistance_propagande"
  | "expansion_urbaine"
  | "rayonnement_diplomatique"
  | "avance_technologique";

export type CoutDeveloppement = Record<CategorieRessource, number>;

export interface DefDeveloppement {
  id: IdDeveloppement;
  famille: FamilleDeveloppement;
  /** Rang dans le catalogue : départage une égalité de voix. */
  ordre: number;
  cout: CoutDeveloppement;
}

const cout = (industrie: number, techno: number, culture: number, commerce: number): CoutDeveloppement => ({
  industrie,
  techno,
  culture,
  commerce,
});

/** Le catalogue, dans l'ordre de la fonction SQL developpements_catalogue(). */
export const CATALOGUE_DEVELOPPEMENTS: readonly DefDeveloppement[] = [
  { id: "arsenal_national", famille: "attaque", ordre: 1, cout: cout(6, 4, 0, 0) },
  { id: "mobilisation_eclair", famille: "attaque", ordre: 2, cout: cout(8, 0, 0, 6) },
  { id: "service_renseignement", famille: "attaque", ordre: 3, cout: cout(0, 10, 5, 0) },
  { id: "fortifications", famille: "defense", ordre: 4, cout: cout(8, 4, 0, 0) },
  { id: "bouclier_civil", famille: "defense", ordre: 5, cout: cout(0, 0, 8, 6) },
  { id: "resistance_propagande", famille: "defense", ordre: 6, cout: cout(0, 5, 10, 0) },
  { id: "expansion_urbaine", famille: "developpement", ordre: 7, cout: cout(4, 0, 0, 8) },
  { id: "rayonnement_diplomatique", famille: "developpement", ordre: 8, cout: cout(0, 0, 10, 5) },
  { id: "avance_technologique", famille: "developpement", ordre: 9, cout: cout(0, 12, 4, 0) },
];

export function developpementDe(id: string): DefDeveloppement | undefined {
  return CATALOGUE_DEVELOPPEMENTS.find((d) => d.id === id);
}

/** Stock de ressources disponible d'un pays par catégorie (stock_pays().stock). */
export type StockRessources = Record<CategorieRessource, number>;

export function coutTotal(d: DefDeveloppement): number {
  return CATEGORIES_RESSOURCE.reduce((s, c) => s + d.cout[c], 0);
}

/** Catégories où le stock ne couvre pas le coût, avec ce qui manque. Vide = finançable. */
export function manque(stock: StockRessources, d: DefDeveloppement): Partial<Record<CategorieRessource, number>> {
  const m: Partial<Record<CategorieRessource, number>> = {};
  for (const c of CATEGORIES_RESSOURCE) {
    const reste = d.cout[c] - Math.max(0, stock[c] ?? 0);
    if (reste > 0) m[c] = reste;
  }
  return m;
}

export function peutFinancer(stock: StockRessources, d: DefDeveloppement): boolean {
  return Object.keys(manque(stock, d)).length === 0;
}

/**
 * Chiffres des effets (mêmes valeurs que les fonctions SQL de la migration 0054 ; un test vérifie
 * que chaque nombre figure bien dans le SQL). Ils servent à écrire les textes d'effet à l'écran.
 */
export const EFFETS_DEVELOPPEMENTS = {
  /** Arsenal national : part ajoutée à l'effort national quand le pays attaque. */
  arsenalEffort: 0.2,
  /** Mobilisation éclair : multiplicateur de l'effort le premier jour d'un conflit où le pays attaque. */
  eclairPremierJour: 2,
  /** Bonus défensif de base (Jalon 13) puis avec les Fortifications. */
  defensifBase: 1.5,
  defensifFortifications: 1.75,
  /** Bouclier civil : facteur sur les pertes de population quotidiennes de la guerre. */
  bouclierPertes: 0.5,
  /** Résistance à la propagande : facteur sur les attaques AntiVille subies. */
  resistanceAntiville: 0.75,
  /** Expansion urbaine : chance d'un habitant de plus par visite. */
  expansionCroissance: 0.1,
  /** Rayonnement diplomatique : poids ajouté à l'avis du pays (et voix au chapitre). */
  rayonnementPoids: 0.5,
  /** Avance technologique : part retirée des seuils d'influence. */
  avanceSeuil: 0.1,
} as const;
