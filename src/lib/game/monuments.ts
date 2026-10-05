/**
 * Monuments d'influence (docs/A-INTEGRER.md §19, Jalon 20 3/3) et catalogue
 * unifié avec les mégaprojets (§41, 05/10/2026). Source de vérité pour
 * l'affichage ; le calcul réel (déblocage) vit côté serveur
 * (supabase/migrations/0030_... puis 0050_..., anti-triche) — à tenir
 * synchronisé si ces chiffres changent (tests/unit/catalogueBatiments.test.ts
 * compare les deux).
 *
 * `CATALOGUE_MONUMENTS` : les 16 monuments, paliers 0 à 15. `CATALOGUE_BATIMENTS` :
 * les monuments suivis des 18 mégaprojets (paliers 16 à 33), 34 entrées au total,
 * toutes débloquées automatiquement par le record d'influence.
 */
import type { Activite } from "./activites";
import { CATALOGUE_MEGAPROJETS, PREMIER_PALIER_MEGAPROJET, type TypeMegaprojet } from "./megaprojets";

export type TypeMonument =
  | "borne_commemorative"
  | "banc_public"
  | "fontaine_simple"
  | "buste"
  | "obelisque"
  | "arc_triomphe_miniature"
  | "horloge_municipale"
  | "fontaine_monumentale"
  | "statue_equestre"
  | "mur_remerciements"
  | "arche_monumentale"
  | "tour_observatoire"
  | "statue_emblematique"
  | "temple_national"
  | "statue_geante"
  | "monument_ultime";

export interface PalierMonument {
  seuil: number;
  type: TypeMonument;
}

/** Les 16 paliers du document (§19), dans l'ordre — catalogue fini, pas de "puis ×2" au-delà. */
export const CATALOGUE_MONUMENTS: PalierMonument[] = [
  { seuil: 10, type: "borne_commemorative" },
  { seuil: 25, type: "banc_public" },
  { seuil: 50, type: "fontaine_simple" },
  { seuil: 100, type: "buste" },
  { seuil: 250, type: "obelisque" },
  { seuil: 500, type: "arc_triomphe_miniature" },
  { seuil: 1000, type: "horloge_municipale" },
  { seuil: 2500, type: "fontaine_monumentale" },
  { seuil: 5000, type: "statue_equestre" },
  { seuil: 10000, type: "mur_remerciements" },
  { seuil: 25000, type: "arche_monumentale" },
  { seuil: 50000, type: "tour_observatoire" },
  { seuil: 100000, type: "statue_emblematique" },
  { seuil: 250000, type: "temple_national" },
  { seuil: 500000, type: "statue_geante" },
  { seuil: 1000000, type: "monument_ultime" },
];

export function seuilMonument(palier: number): number | null {
  return CATALOGUE_MONUMENTS[palier]?.seuil ?? null;
}

export function typeMonument(palier: number): TypeMonument | null {
  return CATALOGUE_MONUMENTS[palier]?.type ?? null;
}

/** Combien de paliers un record d'influence donné débloque (0 à 16). */
export function nbMonumentsDebloques(influenceMax: number): number {
  let n = 0;
  while (n < CATALOGUE_MONUMENTS.length && influenceMax >= CATALOGUE_MONUMENTS[n].seuil) n++;
  return n;
}

export type FamilleBatiment = "monument" | "megaprojet";

/** Une entrée du catalogue unifié. `palier` est l'identifiant stocké en base (jamais renuméroté). */
export interface EntreeCatalogue {
  palier: number;
  seuil: number;
  famille: FamilleBatiment;
  type: TypeMonument | TypeMegaprojet;
  /** Seulement pour un mégaprojet : son thème. */
  activite: Activite | null;
}

/**
 * Les 34 entrées, indexées par palier : monuments 0 à 15, mégaprojets 16 à 33.
 * Les seuils ne sont donc PAS croissants le long de ce tableau (les mégaprojets
 * s'intercalent entre les monuments) : pour l'ordre d'apparition, voir
 * `catalogueParSeuil()`.
 */
export const CATALOGUE_BATIMENTS: readonly EntreeCatalogue[] = [
  ...CATALOGUE_MONUMENTS.map((m, palier) => ({
    palier,
    seuil: m.seuil,
    famille: "monument" as const,
    type: m.type,
    activite: null,
  })),
  ...CATALOGUE_MEGAPROJETS.map((m, i) => ({
    palier: PREMIER_PALIER_MEGAPROJET + i,
    seuil: m.seuil,
    famille: "megaprojet" as const,
    type: m.type,
    activite: m.activite,
  })),
];

/** Entrée d'un palier, ou null pour un palier inconnu (donnée incomplète). */
export function entreeCatalogue(palier: number): EntreeCatalogue | null {
  return CATALOGUE_BATIMENTS[palier] ?? null;
}

/** Le catalogue dans l'ordre où les entrées se débloquent (seuil croissant). */
export function catalogueParSeuil(): EntreeCatalogue[] {
  return [...CATALOGUE_BATIMENTS].sort((a, b) => a.seuil - b.seuil || a.palier - b.palier);
}

/** Entrées débloquées par un record d'influence donné, dans l'ordre d'apparition. */
export function batimentsDebloques(influenceMax: number): EntreeCatalogue[] {
  return catalogueParSeuil().filter((e) => influenceMax >= e.seuil);
}

/**
 * Sépare les paliers débloqués d'une ville (lignes de la table `monuments`) en
 * monuments et en mégaprojets, comme la scène 3D les attend (deux listes, deux
 * places différentes : les monuments dans les cours des premiers blocs, les
 * mégaprojets à la bordure). Un palier inconnu est ignoré.
 */
export function repartirBatiments(paliers: readonly number[]): {
  monuments: { palier: number; type: string }[];
  megaprojets: { palier: number; type: string; activite: string }[];
} {
  const monuments: { palier: number; type: string }[] = [];
  const megaprojets: { palier: number; type: string; activite: string }[] = [];
  for (const palier of paliers) {
    const e = entreeCatalogue(palier);
    if (!e) continue;
    if (e.famille === "monument") monuments.push({ palier, type: e.type });
    else if (e.activite) megaprojets.push({ palier, type: e.type, activite: e.activite });
  }
  return { monuments, megaprojets };
}
