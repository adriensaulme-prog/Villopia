/**
 * Place des mégaprojets À LA BORDURE de la ville (docs/A-INTEGRER.md §37,
 * décision d'Adrien du 05/10/2026) : « les mégaprojets doivent venir à la
 * bordure de la ville, pas loin dans la campagne à 450 m et plus » — avec
 * la contrainte qu'un mégaprojet déjà construit ne bouge JAMAIS, même
 * quand la ville le rejoint puis le dépasse.
 *
 * Depuis le §41 (05/10/2026), un mégaprojet se débloque par le record
 * d'influence de la ville, plus par sa population : on ne sait donc plus à
 * quelle taille de ville il apparaît. Le §41 ne remet pas en cause sa place :
 * chaque mégaprojet garde le STADE de population qu'il avait (POPULATION_STADE,
 * megaprojets.ts : Bourg, Ville, Grande ville, Métropole, Mégapole), et c'est
 * ce stade, une constante du catalogue, qui fixe sa case. Les mégaprojets
 * d'un même stade (3 ou 4) se rangent sur des cases voisines, dans l'ordre du
 * catalogue.
 *
 * Réconciliation : la ville grandit, donc « la bordure » change tout le
 * temps ; on ne la recalcule jamais. Chaque stade a une case fixe, celle
 * qui est tout juste hors de la ville quand elle atteint la population de ce
 * stade, lue dans l'ordre de distance de cases.ts — qui ne dépend que de la
 * graine de la ville :
 *   - quand la ville atteint cette population, elle occupe au plus les K
 *     cases les plus proches (K = blocs ouverts à ce seuil), et le zonage ne
 *     regarde que les (rang + FENETRE_CANDIDATS) premières cases : la case
 *     K + FENETRE − 1 est donc forcément libre, à une ou deux rues de la ville
 *     (le stade Bourg tombe à ~240 m du centre au lieu de 450 m), et les
 *     cases d'après le sont encore plus ;
 *   - le mégaprojet se pose au centre de la COUR COMMUNE de cette case, comme
 *     les monuments (monumentsVille.ts) : quand la ville atteint plus tard
 *     cette case, son bloc se construit autour sans toucher le mégaprojet (la
 *     cour n'est plus décorée, generer.ts) — il se retrouve DANS la ville, à
 *     sa place d'origine ;
 *   - le stade Mégapole (250 000 habitants) est le dernier : c'est aussi le
 *     plafond de rendu (PLAFOND_RENDU_POPULATION), la ville dessinée cesse de
 *     s'étendre au-delà.
 * A-INTEGRER §45 (05/10/2026, taille réelle) : le mégaprojet n'est plus petit au
 * point de tenir dans la cour. Il garde EXACTEMENT la même position (centre de la
 * cour), mais occupe le bloc entier : le bloc est RÉSERVÉ, aucun lot ne s'y
 * construit (terrain.ts, `siteMegaprojet`), et son emprise est limitée à la
 * distance entre sa position et le bord du bloc, donc il ne déborde jamais sur
 * une rue ni sur le bloc voisin (`rayon`). Quand la ville atteint la case, le
 * bloc devient le mégaprojet : une grande place dans la ville, pas un bâtiment
 * coincé entre des maisons.
 *
 * Fonction pure de (graine, palier) : le rendu 3D ET le bouton « Voir où il
 * est » lisent exactement la même position, et elle ne dépend ni de la
 * population courante, ni des vocations des blocs, ni des autres mégaprojets
 * débloqués.
 */
import { POPULATION_STADE, megaprojetDuPalier, rangDansLeStade } from "@/lib/game/megaprojets";
import { casesTriees } from "./cases";
import { BS, PLAFOND_RENDU_POPULATION, blockX0, openAtK } from "./constantes";
import { rayonMegaprojet } from "./megaprojets";
import { rectCourBloc } from "./terrain";
import { FENETRE_CANDIDATS } from "./zonage";

export interface PlaceMegaprojet {
  x: number;
  z: number;
  /** Case (bloc) que ce mégaprojet réserve (sa cour en est le centre, décalé de 7,25 m du centre du bloc). */
  bi: number;
  bj: number;
  /**
   * Demi-côté de son emprise carrée : celui de son stade, réduit si besoin pour rester dans le bloc
   * (A-INTEGRER §45). Fonction de (graine, palier) seulement, comme la position.
   */
  rayon: number;
}

/** Nombre de blocs ouverts quand la ville atteint `population` (plafonnée au rendu), comme planifierBlocs(). */
function blocsOuverts(population: number): number {
  const rendu = Math.min(population, PLAFOND_RENDU_POPULATION);
  let K = 0;
  while (openAtK(K) <= rendu) K++;
  return K;
}

/**
 * Indice, dans l'ordre de distance de cases.ts, de la première case d'un
 * stade : la première qu'aucun bloc ne peut avoir pris quand la ville atteint
 * la population de ce stade.
 */
export function indiceCaseStade(stade: number): number {
  const population = POPULATION_STADE[Math.min(Math.max(stade, 0), POPULATION_STADE.length - 1)];
  return blocsOuverts(population) + FENETRE_CANDIDATS - 1;
}

/**
 * Indice de case du mégaprojet d'un palier du catalogue unifié : la première
 * case de son stade, décalée d'un cran par mégaprojet du même stade qui le
 * précède. `null` si ce palier n'est pas un mégaprojet.
 */
export function indiceCaseMegaprojet(palier: number): number | null {
  const def = megaprojetDuPalier(palier);
  if (!def) return null;
  return indiceCaseStade(def.stade) + rangDansLeStade(palier);
}

/** Positions des mégaprojets des `paliers` donnés (les paliers qui n'en sont pas sont ignorés). `Map` palier -> place (centre de la cour de leur case). */
export function placesMegaprojets(key: string, paliers: readonly number[]): Map<number, PlaceMegaprojet> {
  const places = new Map<number, PlaceMegaprojet>();
  const valides = paliers.filter((p) => indiceCaseMegaprojet(p) !== null);
  if (valides.length === 0) return places;
  const indices = valides.map((p) => indiceCaseMegaprojet(p)!);
  // Même demi-côté de grille que planifierBlocs() pour `K = max(indices)` : agrandir la grille ne réordonne jamais les cases déjà classées.
  const M = Math.ceil(Math.sqrt(Math.max(...indices) + 40) / 2) + 3;
  const cases = casesTriees(key, M);
  valides.forEach((palier, i) => {
    const c = cases[indices[i]];
    const rect = rectCourBloc(key, c.bi, c.bj);
    // Jamais en pratique (un bloc a toujours au moins deux parcelles intérieures) : centre du bloc.
    const [x0, z0, x1, z1] = rect ?? [c.bi * 80 + 8, c.bj * 80 + 8, c.bi * 80 + 72, c.bj * 80 + 72];
    const x = (x0 + x1) / 2,
      z = (z0 + z1) / 2;
    const bx = blockX0(c.bi),
      bz = blockX0(c.bj);
    const marge = Math.min(x - bx, bx + BS - x, z - bz, bz + BS - z);
    const stade = megaprojetDuPalier(palier)?.stade ?? 0;
    places.set(palier, { x, z, bi: c.bi, bj: c.bj, rayon: Math.min(rayonMegaprojet(stade), marge) });
  });
  return places;
}
