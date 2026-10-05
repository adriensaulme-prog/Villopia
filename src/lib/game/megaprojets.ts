/**
 * Mégaprojets (docs/SYSTEME-DEVELOPPEMENT.md §6, Jalon 20 1/3), fusionnés
 * dans le catalogue à seuils d'influence des monuments (docs/A-INTEGRER.md
 * §41, décision d'Adrien du 05/10/2026) : plus de choix du maire, plus de
 * financement, plus de ressources de ville. Un mégaprojet apparaît tout seul
 * quand le record d'influence de la ville atteint son seuil, comme un
 * monument. Ce fichier décrit seulement la famille « mégaprojet » ; le
 * catalogue unifié (monuments + mégaprojets) est dans monuments.ts.
 *
 * Source de vérité pour l'affichage ; le déblocage réel vit côté serveur
 * (supabase/migrations/0050_..., anti-triche) et les seuils doivent y rester
 * identiques (tests/unit/catalogueBatiments.test.ts le vérifie).
 */
import type { Activite } from "./activites";

export type TypeMegaprojet =
  | "grande_ecole"
  | "parc_sports"
  | "marche_couvert"
  | "hopital"
  | "stade"
  | "centrale_solaire"
  | "zone_logistique"
  | "technopole"
  | "gare_tgv"
  | "parc_eolien"
  | "opera"
  | "tour_emblematique"
  | "aeroport"
  | "centre_recherche"
  | "centrale"
  | "grand_stade"
  | "centrale_nouvelle_generation"
  | "siege_international";

export interface DefMegaprojet {
  type: TypeMegaprojet;
  /** Son thème : la teinte du bâtiment en 3D. */
  activite: Activite;
  /** Record d'influence qui le débloque. */
  seuil: number;
  /**
   * Ancien stade de population (0 = Bourg … 4 = Mégapole) : il ne décide plus
   * du déblocage mais garde le bâtiment à la même place et à la même taille
   * qu'avant (megaprojetsVille.ts, terrain.ts) — la position d'un mégaprojet
   * ne doit jamais bouger, et elle ne peut plus dépendre de la population de
   * la ville au moment où il apparaît.
   */
  stade: number;
}

/**
 * Les 18 mégaprojets, dans l'ordre croissant des seuils. Leur palier dans le
 * catalogue unifié est PREMIER_PALIER_MEGAPROJET + leur rang ici (ne jamais
 * réordonner ni renuméroter : c'est l'identifiant stocké en base).
 */
export const CATALOGUE_MEGAPROJETS: readonly DefMegaprojet[] = [
  { type: "grande_ecole", activite: "services", seuil: 400, stade: 0 },
  { type: "parc_sports", activite: "loisirs", seuil: 750, stade: 0 },
  { type: "marche_couvert", activite: "commerce", seuil: 1500, stade: 0 },
  { type: "hopital", activite: "services", seuil: 2000, stade: 1 },
  { type: "stade", activite: "loisirs", seuil: 3500, stade: 1 },
  { type: "centrale_solaire", activite: "energie", seuil: 6000, stade: 1 },
  { type: "zone_logistique", activite: "industrie", seuil: 8000, stade: 1 },
  { type: "technopole", activite: "recherche", seuil: 12000, stade: 2 },
  { type: "gare_tgv", activite: "commerce", seuil: 15000, stade: 2 },
  { type: "parc_eolien", activite: "energie", seuil: 20000, stade: 2 },
  { type: "opera", activite: "loisirs", seuil: 30000, stade: 2 },
  { type: "tour_emblematique", activite: "residentiel", seuil: 40000, stade: 3 },
  { type: "aeroport", activite: "commerce", seuil: 60000, stade: 3 },
  { type: "centre_recherche", activite: "recherche", seuil: 80000, stade: 3 },
  { type: "centrale", activite: "energie", seuil: 120000, stade: 3 },
  { type: "grand_stade", activite: "loisirs", seuil: 150000, stade: 4 },
  { type: "centrale_nouvelle_generation", activite: "energie", seuil: 300000, stade: 4 },
  { type: "siege_international", activite: "commerce", seuil: 400000, stade: 4 },
];

/** Les paliers 0 à 15 sont les monuments (monuments.ts) ; les mégaprojets suivent. */
export const PREMIER_PALIER_MEGAPROJET = 16;

/** Mégaprojet d'un palier du catalogue unifié, ou null si ce palier n'en est pas un. */
export function megaprojetDuPalier(palier: number): DefMegaprojet | null {
  return CATALOGUE_MEGAPROJETS[palier - PREMIER_PALIER_MEGAPROJET] ?? null;
}

/** Rang d'un mégaprojet parmi ceux de son stade (0 = le premier) : il décale sa case de celle de ses voisins de stade. */
export function rangDansLeStade(palier: number): number {
  const def = megaprojetDuPalier(palier);
  if (!def) return 0;
  let rang = 0;
  for (let p = PREMIER_PALIER_MEGAPROJET; p < palier; p++) if (megaprojetDuPalier(p)?.stade === def.stade) rang++;
  return rang;
}

/**
 * Population de la ville quand son stade s'ouvrait : sert UNIQUEMENT à choisir
 * la case de placement en 3D (megaprojetsVille.ts), plus jamais au déblocage.
 */
export const POPULATION_STADE: readonly number[] = [5000, 15000, 40000, 100000, 250000];

/**
 * Bonus permanents des mégaprojets (docs/SYSTEME-DEVELOPPEMENT.md §6 et §6 bis),
 * conservés tels quels par le §41 : seul le déblocage a changé. Appliqués côté
 * serveur par nb_megaprojets_construits() (migration 0050) ; ici pour la
 * documentation et le test de cohérence.
 */
export const BONUS_MEGAPROJETS = {
  /** Pertes de manifestation ×0,75. */
  manifestation: ["stade", "grand_stade"],
  /** Élan Énergie +20 % par bâtiment, cumulatif. */
  energie: ["centrale_solaire", "parc_eolien", "centrale", "centrale_nouvelle_generation"],
  /** Contamination ÷2, en plus de la défense existante. */
  contamination: ["hopital"],
  /** Propagande ÷2, en plus de la défense existante. */
  propagande: ["opera"],
} as const satisfies Record<string, readonly TypeMegaprojet[]>;
