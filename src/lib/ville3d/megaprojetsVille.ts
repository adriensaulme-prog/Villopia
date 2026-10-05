/**
 * Place des mégaprojets DANS la ville (retour d'Adrien du 05/10/2026, après avoir
 * testé le jeu) : « les mégaprojets doivent être dans les villes, là ils sont
 * loin des villes et pas toujours à côté d'une route ».
 *
 * Histoire de la règle. §37 : « à la bordure de la ville, pas loin dans la
 * campagne à 450 m ». §41 : un mégaprojet se débloque par le record d'influence,
 * plus par la population ; il gardait la case du STADE de population qu'il avait
 * (la première case libre quand la ville atteint cette population). C'était
 * insuffisant (§46, resté ouvert) : une ville de 60 000 habitants voyait ses
 * mégaprojets des derniers stades à 300-450 m, au milieu des champs, hors de tout
 * réseau de rues. Les stades de population ne décident donc plus de rien ici.
 *
 * Règle actuelle. Les 16 blocs les plus centraux sont ceux des monuments
 * (monumentsVille.ts). Chaque mégaprojet prend, dans l'ordre du catalogue (donc
 * l'ordre de leurs seuils d'influence : les plus modestes au plus près du centre),
 * la PREMIÈRE case libre de l'ordre de distance de cases.ts à partir de la 17e :
 * un bloc entier contre le noyau de la ville, avec ses rues autour (generer.ts
 * dessine toujours les rues d'un site de mégaprojet, et celles qui le relient à
 * l'axe central : `blocsDeLiaison`). Le Stade (2 × 2 blocs) et le Parc d'attractions
 * (2 × 2) prennent le premier carré de blocs entièrement libre.
 *   - un site de plusieurs blocs part de sa case d'ancrage vers l'extérieur de la
 *     ville (même signe que la case en x et en z) et ne chevauche jamais un axe
 *     central ; tous ses blocs sont réservés (megaprojets.ts, `tailleMegaprojet`) ;
 *   - le secteur d'Énergie est exclu (A-INTEGRER §49 C : « l'Énergie est trop
 *     proche du Siège international ») : un site à moins de DISTANCE_MIN_ENERGIE
 *     (150 m) de ce secteur (distanceAuSecteurEnergie, par le centre pour un bloc,
 *     par le bord pour plusieurs blocs) n'est jamais choisi ;
 *   - ils sont libres des 16 blocs des monuments et de tout autre mégaprojet.
 * Quand la ville atteint ce bloc il devient le mégaprojet, comme depuis le §45 : le
 * bloc est RÉSERVÉ, aucun lot ne s'y construit (terrain.ts, `siteMegaprojet`) et son
 * emprise est limitée au bloc (`rayon`), donc il ne déborde jamais sur une rue.
 *
 * Fonction pure de la graine : le rendu 3D ET le bouton « Voir où il est » lisent
 * exactement la même position, et elle ne dépend ni de la population courante, ni
 * des vocations des blocs, ni des autres mégaprojets débloqués : le placement se
 * calcule toujours pour les 18 mégaprojets du catalogue (la place de l'un dépend de
 * celle des précédents), puis on ne rend que ceux demandés.
 *
 * Tous les mégaprojets ont changé de place avec ce retour (une seule fois) : ils
 * étaient à la bordure de la ville, ils sont maintenant dans son noyau.
 */
import { CATALOGUE_MEGAPROJETS, PREMIER_PALIER_MEGAPROJET, megaprojetDuPalier } from "@/lib/game/megaprojets";
import { casesCentrales, casesTriees } from "./cases";
import { BS, blockX0 } from "./constantes";
import { distanceAuSecteurEnergie, distanceRectAuSecteurEnergie } from "./emplacements";
import { blocsMegaprojet, rayonMegaprojet, tailleMegaprojet } from "./megaprojets";
import { NB_BLOCS_MONUMENTS } from "./monumentsVille";
import { rectCourBloc } from "./terrain";

export interface PlaceMegaprojet {
  /** Centre du site : celui de la cour de la case pour un mégaprojet d'un bloc, celui du rectangle de blocs pour les autres. */
  x: number;
  z: number;
  /** Case (bloc) d'ancrage : la plus proche du centre de la ville. Un site de plusieurs blocs part d'elle vers l'extérieur. */
  bi: number;
  bj: number;
  /**
   * Demi-côté de son emprise carrée (la plateforme) : celui de son stade, réduit si besoin pour rester dans le
   * bloc (A-INTEGRER §45) ; ou, pour le Stade et le Parc d'attractions (§49 D), celui du rectangle de blocs.
   * Fonction de la graine et du palier seulement, comme la position.
   */
  rayon: number;
  /** Demi-côté de la plateforme le long de z (égal à `rayon` sauf pour un site rectangulaire). */
  rayonZ: number;
  /** Nombre de blocs du site le long de x et de z : 1 × 1 pour presque tous, 2 × 2 pour le Stade et le Parc d'attractions. */
  nx: number;
  nz: number;
  /** Tous les blocs réservés (un seul, ou `nx` × `nz`), aucun lot ne s'y construit. */
  blocs: { bi: number; bj: number }[];
  /** Rectangle des blocs réservés, rues intérieures comprises : [x0, z0, x1, z1]. */
  rect: [number, number, number, number];
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

/** Demi-côté de la grille de cases : les cent premières cases sont exactes (agrandir la grille ne réordonne jamais les cases déjà classées). */
const DEMI_GRILLE = 12;

/** Blocs d'un rectangle de `nx` × `nz` qui part de `c` vers l'extérieur de la ville (de même signe que sa case), sans jamais chevaucher un axe central. */
export function blocsDuSite(c: { bi: number; bj: number }, nx: number, nz: number): { bi: number; bj: number }[] {
  const di = c.bi >= 0 ? 1 : -1,
    dj = c.bj >= 0 ? 1 : -1;
  const blocs: { bi: number; bj: number }[] = [];
  for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) blocs.push({ bi: c.bi + di * a, bj: c.bj + dj * b });
  return blocs;
}

/**
 * Blocs qui relient `bloc` au croisement central, en escalier (un pas en x, un pas en z, en alternant) : leurs
 * rues forment le chemin qui amène à un mégaprojet. Du bloc contre le croisement (0 ou −1 selon le signe)
 * jusqu'au bloc visé inclus.
 */
export function blocsDeLiaison(bloc: { bi: number; bj: number }): { bi: number; bj: number }[] {
  let i = bloc.bi >= 0 ? 0 : -1,
    j = bloc.bj >= 0 ? 0 : -1;
  const chemin = [{ bi: i, bj: j }];
  while (i !== bloc.bi || j !== bloc.bj) {
    if (i !== bloc.bi && (Math.abs(bloc.bi - i) >= Math.abs(bloc.bj - j) || j === bloc.bj)) i += Math.sign(bloc.bi - i);
    else j += Math.sign(bloc.bj - j);
    chemin.push({ bi: i, bj: j });
  }
  return chemin;
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
  const cases = casesTriees(key, DEMI_GRILLE);

  const sites = new Map<string, SiteCase>();
  const siteDe = (i: number, t: { nx: number; nz: number }): SiteCase => {
    const cleSite = i + "|" + t.nx + "x" + t.nz;
    let site = sites.get(cleSite);
    if (!site) {
      const c = cases[i];
      const blocs = blocsDuSite(c, t.nx, t.nz);
      if (t.nx * t.nz === 1) {
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

  // Blocs que personne d'autre ne peut prendre : ceux des monuments (les 16 blocs les plus centraux, §49 B), puis ceux
  // des mégaprojets déjà placés.
  const reserves = new Set(casesCentrales(key, NB_BLOCS_MONUMENTS).map(cleBloc));
  const places = new Map<number, PlaceMegaprojet>();
  for (const palier of TOUS_LES_PALIERS) {
    const def = megaprojetDuPalier(palier);
    const t = blocsMegaprojet(def?.type ?? "");
    // La première case libre à partir de la 17e, hors du secteur d'Énergie.
    let i = NB_BLOCS_MONUMENTS;
    while (i < cases.length) {
      const site = siteDe(i, t);
      if (site.blocs.every((b) => !reserves.has(cleBloc(b))) && site.distanceEnergie >= DISTANCE_MIN_ENERGIE) break;
      i++;
    }
    const site = siteDe(i, t);
    for (const b of site.blocs) reserves.add(cleBloc(b));
    const taille = tailleMegaprojet(def?.type ?? "", def?.stade ?? 0);
    const multi = t.nx * t.nz > 1;
    const rayon = multi ? taille.R : Math.min(rayonMegaprojet(def?.stade ?? 0), site.marge);
    places.set(palier, { x: site.x, z: site.z, bi: site.bi, bj: site.bj, rayon, rayonZ: multi ? taille.Rz : rayon, nx: t.nx, nz: t.nz, blocs: site.blocs, rect: site.rect });
  }
  if (memo.size >= 32) memo.clear();
  memo.set(key, places);
  return places;
}

/** Positions des mégaprojets des `paliers` donnés (les paliers qui n'en sont pas sont ignorés). `Map` palier -> place (centre de la cour de leur case, ou du rectangle de leurs blocs). */
export function placesMegaprojets(key: string, paliers: readonly number[]): Map<number, PlaceMegaprojet> {
  const places = new Map<number, PlaceMegaprojet>();
  if (!paliers.some((p) => megaprojetDuPalier(p) !== null)) return places;
  const tous = placesDeTous(key);
  for (const palier of paliers) {
    const place = tous.get(palier);
    if (place) places.set(palier, place);
  }
  return places;
}
