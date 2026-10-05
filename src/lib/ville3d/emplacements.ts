/**
 * Emplacements, dans la campagne autour de la ville, de ce qui n'est pas
 * dans un bloc : les installations d'Énergie (docs/A-INTEGRER.md §25,
 * point 5 + « voir où il est »). Les monuments d'influence (§33, voir
 * monumentsVille.ts) et les mégaprojets (§37, voir megaprojetsVille.ts)
 * n'y sont plus : ils sont dans la cour d'une case de la ville ou à sa
 * bordure.
 *
 * Avant le §25 chaque objet était posé à un ANGLE ALÉATOIRE sur 360° :
 * impossible de savoir où regarder. Désormais Énergie a son SECTEUR fixe,
 * identique pour toutes les villes : l'axe +x (les autres axes sont libres ;
 * pas de boussole affichée, la caméra tourne : le joueur passe par « voir
 * où il est », bouton à conserver — §37 A), et se place à partir d'une
 * CEINTURE fixe, jamais relative au rayon courant de la ville (qui grandit) :
 * un objet déjà visible ne bouge plus jamais, et la ville ne peut plus
 * l'avaler — la ceinture est au-delà du rayon de la ville au plafond de rendu
 * (PLAFOND_RENDU_POPULATION, rayon 400), vérifié par
 * tests/unit/ville3dEmplacements.test.ts.
 *
 * Le secteur est centré sur l'axe +x, où passe la route de campagne
 * (terrain.ts, buildCountryRoads) : un tirage proche de l'axe posait la
 * centrale à moitié sur la route (§37 B). Les positions sont donc écartées de
 * la bande de route (GARDE_ROUTE_ENERGIE) ; seuls les tirages qui tombaient
 * dedans sont déplacés, les autres installations gardent leur place.
 *
 * Fonctions pures : la scène 3D (terrain.ts) ET le panneau « voir où il
 * est » (client, caméra) lisent exactement la même position.
 */

import { rngFrom, rr, type RNG } from "./aleatoire";
import { DEMI_BANDE_ROUTE_CAMPAGNE } from "./constantes";

/** Nom de ville → clé de graine (même normalisation que generate()). */
export const cleDe = (name: string) => (name || "").trim().toLowerCase() || "ville";

/** Distance (norme du max, comme le rayon de ville) à partir de laquelle on pose quoi que ce soit. */
export const CEINTURE = 450;

/** Le brouillard de distance ne démarre jamais avant ce rayon (shaders.ts, uFogR) : sinon la ceinture serait déjà dans la brume. */
export const RAYON_BROUILLARD_MIN = 440;

const DEG = Math.PI / 180;

/** Demi-ouverture d'un secteur (degrés) : 30° de part et d'autre de l'axe = 60° de large. */
const DEMI_SECTEUR = 30;

export const AXE_ENERGIE = 0;

/**
 * Demi-emprise (en z) du plus large objet d'Énergie : la ferme solaire (jusqu'à
 * 5 panneaux alignés dans une direction quelconque, ~12 m de rayon) ; la
 * centrale (clôture de −8 à +6,5 m) et les éoliennes sont plus étroites.
 */
const DEMI_EMPRISE_ENERGIE = 12;

/**
 * Distance minimale (|z|) entre le centre d'un objet d'Énergie et l'axe de la
 * route de campagne : chaussée + arbres d'alignement + emprise de l'objet.
 */
export const GARDE_ROUTE_ENERGIE = DEMI_BANDE_ROUTE_CAMPAGNE + DEMI_EMPRISE_ENERGIE;

export interface Point {
  x: number;
  z: number;
}

/**
 * Point du secteur d'axe `axeDeg`, à l'angle `fraction` (−1..+1 de part
 * et d'autre de l'axe) et à la distance `d` en norme du max (|x| ou |z|
 * maximal) : en divisant par max(|cos|,|sin|) le point est exactement sur
 * le carré de rayon `d`, comme la ville.
 */
function dansSecteur(axeDeg: number, fraction: number, d: number): Point {
  const a = (axeDeg + fraction * DEMI_SECTEUR) * DEG;
  const c = Math.cos(a),
    s = Math.sin(a);
  const k = d / Math.max(Math.abs(c), Math.abs(s));
  return { x: c * k, z: s * k };
}

/**
 * Écarte `p` de la bande de route (l'axe z = 0 de la route de campagne
 * du secteur d'Énergie) s'il tombe dedans : on le repousse du même côté, à
 * GARDE_ROUTE_ENERGIE plus un petit tirage (pour ne pas aligner les objets
 * déplacés le long de la route). N'agit que sur les tirages concernés, et le
 * tirage supplémentaire n'a lieu que dans ce cas : les autres positions, déjà
 * visibles, ne bougent pas.
 */
function horsDeLaRoute(p: Point, r: RNG): Point {
  if (Math.abs(p.z) >= GARDE_ROUTE_ENERGIE) return p;
  const cote = p.z < 0 ? -1 : 1;
  return { x: p.x, z: cote * (GARDE_ROUTE_ENERGIE + rr(r, 0, 10)) };
}

/** Installation d'Énergie n° k (0-based) : éolienne ou panneau solaire, au hasard stable dans son secteur. */
export function emplacementEnergie(key: string, k: number): Point {
  const r = rngFrom(key + "|energie|" + k);
  return horsDeLaRoute(dansSecteur(AXE_ENERGIE, r() * 2 - 1, CEINTURE + rr(r, 0, 250)), r);
}

/** Centrale d'Énergie : même secteur, au plus près de la ville. */
export function emplacementCentrale(key: string): Point {
  const r = rngFrom(key + "|energie|centrale");
  return horsDeLaRoute(dansSecteur(AXE_ENERGIE, r() * 2 - 1, CEINTURE + rr(r, 0, 60)), r);
}
