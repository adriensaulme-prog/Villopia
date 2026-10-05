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
 * A-INTEGRER §49 C (retour d'Adrien du 05/10/2026) : « l'Énergie est trop proche
 * du Siège international ». Les mégaprojets du dernier stade tombaient à la
 * ceinture (~450 m), pile là où commence le secteur d'Énergie (+x, ±30°) : le
 * Siège international se retrouvait à 17 m d'une éolienne. Le secteur d'Énergie
 * est donc EXCLU du placement : une case dont la cour est à moins de
 * DISTANCE_MIN_ENERGIE (150 m) du secteur (distanceAuSecteurEnergie) n'est
 * jamais choisie. Seuls les mégaprojets dont la case était dans ce cas bougent ;
 * chacun prend la première case libre PLUS LOIN dans l'ordre de cases.ts (donc
 * toujours hors de la ville quand elle atteint son stade, et jamais sur la case
 * d'un autre mégaprojet, ni sur celle qu'un autre aurait gardée). Les autres
 * gardent exactement leur place.
 *
 * A-INTEGRER §49 D (retour d'Adrien du 05/10/2026) : le Stade et le Grand stade
 * occupent plusieurs blocs (megaprojets.ts, `tailleMegaprojet` : 2 × 2 et 3 × 3).
 * Leur site est un CARRÉ de blocs qui part de la case de leur stade et s'étend
 * vers l'extérieur de la ville (vers les x et z de même signe que la case) : les
 * blocs qu'il ajoute sont donc plus loin du centre que sa case, jamais entre elle
 * et la ville, et il ne chevauche jamais un axe central. Tous ses blocs sont
 * réservés : libres de tout autre mégaprojet, hors des 16 blocs des monuments, et
 * à 150 m du secteur d'Énergie par leur BORD (pas par leur centre). Les autres
 * mégaprojets gardent leur place ; le Stade et le Grand stade, eux, ont dû bouger
 * (leur ancien bloc seul n'est plus qu'une partie de leur site).
 *
 * Fonction pure de (graine, palier) : le rendu 3D ET le bouton « Voir où il
 * est » lisent exactement la même position, et elle ne dépend ni de la
 * population courante, ni des vocations des blocs, ni des autres mégaprojets
 * débloqués : le placement se calcule toujours pour les 18 mégaprojets du
 * catalogue (un déplacement dépend des autres), puis on ne rend que ceux
 * demandés.
 */
import {
  CATALOGUE_MEGAPROJETS,
  POPULATION_STADE,
  PREMIER_PALIER_MEGAPROJET,
  megaprojetDuPalier,
  rangDansLeStade,
} from "@/lib/game/megaprojets";
import { casesCentrales, casesTriees } from "./cases";
import { BS, PLAFOND_RENDU_POPULATION, blockX0, openAtK } from "./constantes";
import { distanceAuSecteurEnergie, distanceRectAuSecteurEnergie } from "./emplacements";
import { blocsMegaprojet, rayonMegaprojet, tailleMegaprojet } from "./megaprojets";
import { NB_BLOCS_MONUMENTS } from "./monumentsVille";
import { rectCourBloc } from "./terrain";
import { FENETRE_CANDIDATS } from "./zonage";

export interface PlaceMegaprojet {
  /** Centre du site : celui de la cour de la case pour un mégaprojet d'un bloc, celui du carré de blocs pour les autres. */
  x: number;
  z: number;
  /** Case (bloc) d'ancrage : la plus proche du centre de la ville. Un site de plusieurs blocs part d'elle vers l'extérieur. */
  bi: number;
  bj: number;
  /**
   * Demi-côté de son emprise carrée (la plateforme) : celui de son stade, réduit si besoin pour rester dans le
   * bloc (A-INTEGRER §45) ; ou, pour le Stade et le Grand stade (§49 D), celui du carré de blocs. Fonction de
   * (graine, palier) seulement, comme la position.
   */
  rayon: number;
  /** Nombre de blocs de côté du site : 1 pour presque tous, 2 pour le Stade, 3 pour le Grand stade. */
  taille: 1 | 2 | 3;
  /** Tous les blocs réservés (un seul, ou `taille` × `taille`), aucun lot ne s'y construit. */
  blocs: { bi: number; bj: number }[];
  /** Rectangle des blocs réservés, rues intérieures comprises : [x0, z0, x1, z1]. */
  rect: [number, number, number, number];
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

/**
 * Distance minimale (m) entre un mégaprojet et le secteur d'Énergie (A-INTEGRER §49 C) : celle de son
 * centre pour un mégaprojet d'un bloc, celle de son bord pour un site de plusieurs blocs. Toute
 * installation d'Énergie est dans le secteur : elle est donc à au moins 150 m du centre de n'importe
 * quel mégaprojet.
 */
export const DISTANCE_MIN_ENERGIE = 150;

/** Les 18 paliers du catalogue unifié qui sont des mégaprojets (16 à 33). */
const TOUS_LES_PALIERS: readonly number[] = CATALOGUE_MEGAPROJETS.map((_, i) => PREMIER_PALIER_MEGAPROJET + i);

/** Cases d'avance, au-delà de la plus lointaine case de départ, où un mégaprojet écarté du secteur d'Énergie ou gêné par un autre peut aller se poser. */
const MARGE_DEPLACEMENT = 200;

/** Blocs d'un carré de `n` × `n` qui part de `c` vers l'extérieur de la ville (de même signe que sa case), sans jamais chevaucher un axe central. */
export function blocsDuSite(c: { bi: number; bj: number }, n: number): { bi: number; bj: number }[] {
  const di = c.bi >= 0 ? 1 : -1,
    dj = c.bj >= 0 ? 1 : -1;
  const blocs: { bi: number; bj: number }[] = [];
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) blocs.push({ bi: c.bi + di * a, bj: c.bj + dj * b });
  return blocs;
}

interface SiteCase {
  x: number;
  z: number;
  bi: number;
  bj: number;
  /** Distance du centre de la cour au bord de son bloc (un mégaprojet d'un bloc). */
  marge: number;
  blocs: { bi: number; bj: number }[];
  rect: [number, number, number, number];
  /** Distance au secteur d'Énergie : du centre (un bloc) ou du bord (plusieurs blocs). */
  distanceEnergie: number;
}

/** Placements des 18 mégaprojets, par graine (pur, donc mémorisable : le calcul reconstruit des blocs pour trouver leurs cours). */
const memo = new Map<string, ReadonlyMap<number, PlaceMegaprojet>>();

const cleBloc = (b: { bi: number; bj: number }) => b.bi + "," + b.bj;

function placesDeTous(key: string): ReadonlyMap<number, PlaceMegaprojet> {
  const deja = memo.get(key);
  if (deja) return deja;
  const indices = TOUS_LES_PALIERS.map((p) => indiceCaseMegaprojet(p)!);
  // Même demi-côté de grille que planifierBlocs() pour `K = max(indices)` : agrandir la grille ne réordonne jamais les cases déjà classées.
  // Cinq blocs de marge : un site de 3 × 3 blocs déborde de deux blocs vers l'extérieur.
  const M = Math.ceil(Math.sqrt(Math.max(...indices) + MARGE_DEPLACEMENT) / 2) + 5;
  const cases = casesTriees(key, M);
  const tailles = TOUS_LES_PALIERS.map((p) => blocsMegaprojet(megaprojetDuPalier(p)?.type ?? ""));

  const sites = new Map<string, SiteCase>();
  const siteDe = (i: number, n: number): SiteCase => {
    const cleSite = i + "|" + n;
    let site = sites.get(cleSite);
    if (!site) {
      const c = cases[i];
      const blocs = blocsDuSite(c, n);
      if (n === 1) {
        const rect = rectCourBloc(key, c.bi, c.bj);
        // Jamais en pratique (un bloc a toujours au moins deux parcelles intérieures) : centre du bloc.
        const [x0, z0, x1, z1] = rect ?? [c.bi * 80 + 8, c.bj * 80 + 8, c.bi * 80 + 72, c.bj * 80 + 72];
        const x = (x0 + x1) / 2,
          z = (z0 + z1) / 2;
        const bx = blockX0(c.bi),
          bz = blockX0(c.bj);
        site = {
          x,
          z,
          bi: c.bi,
          bj: c.bj,
          marge: Math.min(x - bx, bx + BS - x, z - bz, bz + BS - z),
          blocs,
          rect: [bx, bz, bx + BS, bz + BS],
          distanceEnergie: distanceAuSecteurEnergie(x, z),
        };
      } else {
        const xs = blocs.map((b) => blockX0(b.bi)),
          zs = blocs.map((b) => blockX0(b.bj));
        const rect: [number, number, number, number] = [Math.min(...xs), Math.min(...zs), Math.max(...xs) + BS, Math.max(...zs) + BS];
        site = {
          x: (rect[0] + rect[2]) / 2,
          z: (rect[1] + rect[3]) / 2,
          bi: c.bi,
          bj: c.bj,
          marge: Math.min(rect[2] - rect[0], rect[3] - rect[1]) / 2,
          blocs,
          rect,
          distanceEnergie: distanceRectAuSecteurEnergie(rect[0], rect[1], rect[2], rect[3]),
        };
      }
      sites.set(cleSite, site);
    }
    return site;
  };
  const tropPresDeLEnergie = (i: number, n: number) => siteDe(i, n).distanceEnergie < DISTANCE_MIN_ENERGIE;

  // Blocs que personne d'autre ne peut prendre : ceux des monuments (les 16 blocs les plus centraux, §49 B).
  const reserves = new Set(casesCentrales(key, NB_BLOCS_MONUMENTS).map(cleBloc));
  const libre = (i: number, n: number) => siteDe(i, n).blocs.every((b) => !reserves.has(cleBloc(b)));
  const reserver = (i: number, n: number) => siteDe(i, n).blocs.forEach((b) => reserves.add(cleBloc(b)));

  // 1. Les mégaprojets d'un bloc dont la case de départ est hors d'atteinte du secteur d'Énergie la gardent.
  const choix = new Map<number, number>();
  const aPlacer: number[] = [];
  TOUS_LES_PALIERS.forEach((palier, k) => {
    if (tailles[k] === 1 && !tropPresDeLEnergie(indices[k], 1) && libre(indices[k], 1)) {
      choix.set(palier, indices[k]);
      reserver(indices[k], 1);
    } else aPlacer.push(k);
  });
  // 2. Les autres (le Stade, le Grand stade, les mégaprojets écartés du secteur d'Énergie) prennent, dans l'ordre
  // du catalogue, la première case libre à partir de la leur : un carré de blocs entièrement libre, hors du secteur.
  for (const k of aPlacer) {
    const n = tailles[k];
    let i = n === 1 ? indices[k] + 1 : indices[k];
    while (i < cases.length && (!libre(i, n) || tropPresDeLEnergie(i, n))) i++;
    choix.set(TOUS_LES_PALIERS[k], i);
    reserver(i, n);
  }

  const places = new Map<number, PlaceMegaprojet>();
  TOUS_LES_PALIERS.forEach((palier, k) => {
    const n = tailles[k];
    const site = siteDe(choix.get(palier)!, n);
    const def = megaprojetDuPalier(palier);
    const rayon = n === 1 ? Math.min(rayonMegaprojet(def?.stade ?? 0), site.marge) : tailleMegaprojet(def?.type ?? "", def?.stade ?? 0).R;
    places.set(palier, { x: site.x, z: site.z, bi: site.bi, bj: site.bj, rayon, taille: n, blocs: site.blocs, rect: site.rect });
  });
  if (memo.size >= 32) memo.clear();
  memo.set(key, places);
  return places;
}

/** Positions des mégaprojets des `paliers` donnés (les paliers qui n'en sont pas sont ignorés). `Map` palier -> place (centre de la cour de leur case, ou du carré de leurs blocs). */
export function placesMegaprojets(key: string, paliers: readonly number[]): Map<number, PlaceMegaprojet> {
  const places = new Map<number, PlaceMegaprojet>();
  if (!paliers.some((p) => indiceCaseMegaprojet(p) !== null)) return places;
  const tous = placesDeTous(key);
  for (const palier of paliers) {
    const place = tous.get(palier);
    if (place) places.set(palier, place);
  }
  return places;
}
