/**
 * Place des mégaprojets À LA BORDURE de la ville (docs/A-INTEGRER.md §37,
 * décision d'Adrien du 05/10/2026) : « les mégaprojets doivent venir à la
 * bordure de la ville, pas loin dans la campagne à 450 m et plus » — avec
 * la contrainte qu'un mégaprojet déjà construit ne bouge JAMAIS, même
 * quand la ville le rejoint puis le dépasse.
 *
 * Réconciliation : la ville grandit, donc « la bordure » change tout le
 * temps ; on ne la recalcule jamais. Chaque palier a une case fixe, celle
 * qui est tout juste hors de la ville AU MOMENT OÙ LE PALIER S'OUVRE
 * (seuilMegaprojet(palier) habitants), lue dans l'ordre de distance de
 * cases.ts — qui ne dépend que de la graine de la ville :
 *   - quand le palier s'ouvre, la ville occupe au plus les K cases les plus
 *     proches (K = blocs ouverts à ce seuil), et le zonage ne regarde que
 *     les (rang + FENETRE_CANDIDATS) premières cases : la case K + FENETRE − 1
 *     est donc forcément libre, à une ou deux rues de la ville (le mégaprojet
 *     de Bourg, palier 0, tombe à ~240 m du centre au lieu de 450 m) ;
 *   - le mégaprojet se pose au centre de la COUR COMMUNE de cette case, comme
 *     les monuments (monumentsVille.ts) : quand la ville atteint plus tard
 *     cette case, son bloc se construit autour sans toucher le mégaprojet (la
 *     cour n'est plus décorée, generer.ts) — il se retrouve DANS la ville, à
 *     sa place d'origine ;
 *   - au-delà du plafond de rendu (PLAFOND_RENDU_POPULATION) la ville cesse
 *     de s'étendre : les paliers suivants prennent les cases d'après, qui ne
 *     seront jamais construites.
 * Fonction pure de (graine, palier) : le rendu 3D ET le bouton « Voir où il
 * est » lisent exactement la même position, et elle ne dépend ni de la
 * population courante, ni des vocations des blocs, ni des autres paliers.
 */
import { seuilMegaprojet } from "@/lib/game/megaprojets";
import { casesTriees } from "./cases";
import { PLAFOND_RENDU_POPULATION, openAtK } from "./constantes";
import { rectCourBloc } from "./terrain";
import { FENETRE_CANDIDATS } from "./zonage";

export interface PlaceMegaprojet {
  x: number;
  z: number;
  /** Case (bloc) dont la cour accueille ce mégaprojet. */
  bi: number;
  bj: number;
}

/** Nombre de blocs ouverts quand la ville atteint `population` (plafonnée au rendu), comme planifierBlocs(). */
function blocsOuverts(population: number): number {
  const rendu = Math.min(population, PLAFOND_RENDU_POPULATION);
  let K = 0;
  while (openAtK(K) <= rendu) K++;
  return K;
}

/**
 * Indice, dans l'ordre de distance de cases.ts, de la case du mégaprojet du
 * palier : la première case qu'aucun bloc ne peut avoir pris à l'ouverture du
 * palier, décalée d'un cran par palier déjà posé au même endroit (au-delà du
 * plafond de rendu, la ville ne grandit plus : tous les paliers y partagent
 * le même K).
 */
export function indiceCaseMegaprojet(palier: number): number {
  const K = blocsOuverts(seuilMegaprojet(palier));
  let decalage = 0;
  for (let q = 0; q < palier; q++) if (blocsOuverts(seuilMegaprojet(q)) === K) decalage++;
  return K + FENETRE_CANDIDATS - 1 + decalage;
}

/** Positions des mégaprojets des `paliers` donnés. `Map` palier -> place (centre de la cour de leur case). */
export function placesMegaprojets(key: string, paliers: readonly number[]): Map<number, PlaceMegaprojet> {
  const places = new Map<number, PlaceMegaprojet>();
  if (paliers.length === 0) return places;
  const indices = paliers.map((p) => indiceCaseMegaprojet(p));
  // Même demi-côté de grille que planifierBlocs() pour `K = max(indices)` : agrandir la grille ne réordonne jamais les cases déjà classées.
  const M = Math.ceil(Math.sqrt(Math.max(...indices) + 40) / 2) + 3;
  const cases = casesTriees(key, M);
  paliers.forEach((palier, i) => {
    const c = cases[indices[i]];
    const rect = rectCourBloc(key, c.bi, c.bj);
    // Jamais en pratique (un bloc a toujours au moins deux parcelles intérieures) : centre du bloc.
    const [x0, z0, x1, z1] = rect ?? [c.bi * 80 + 8, c.bj * 80 + 8, c.bi * 80 + 72, c.bj * 80 + 72];
    places.set(palier, { x: (x0 + x1) / 2, z: (z0 + z1) / 2, bi: c.bi, bj: c.bj });
  });
  return places;
}
