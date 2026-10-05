/**
 * Mégaprojets construits (Jalon 20 1/3, docs/SYSTEME-DEVELOPPEMENT.md §6) : « un bâtiment
 * unique apparaît », placé à la bordure de la ville par buildMegaprojetsCampagne() (terrain.ts),
 * à un emplacement fixe par palier : un mégaprojet déjà construit ne se déplace jamais.
 *
 * A-INTEGRER §44 (05/10/2026) : la première passe n'avait que trois silhouettes primitives
 * (tour, dôme, arche) teintées selon l'activité. Chacun des 18 types a maintenant sa propre
 * silhouette et la couleur/matière NATURELLE du bâtiment qu'il représente (décision d'Adrien :
 * ni la teinte d'activité, ni l'or des monuments) :
 *   megaprojetsCivils.ts       école, hôpital, opéra, tour emblématique, siège, technopole, recherche ;
 *   megaprojetsEquipements.ts  parc des sports, stades, marché, logistique, gare, aéroport ;
 *   megaprojetsEnergie.ts      centrales et parcs — qui reprennent les modèles d'Énergie (energie.ts).
 * Pour dessiner un type de plus, ajouter une entrée à SILHOUETTES (le typage l'exige pour les
 * 18 du catalogue) : un type inconnu retombe sur un simple bâtiment de pierre.
 *
 * L'emprise (un carré de demi-côté `rayonMegaprojet(stade)`) et la hauteur (`hauteurMegaprojet`)
 * suivent le STADE du mégaprojet, jamais son palier du catalogue (16 à 33) : c'est ce qui règle la
 * taille. Tous les modèles se dessinent en fractions de ces deux valeurs.
 *
 * A-INTEGRER §45 (05/10/2026, décision d'Adrien) : TAILLE RÉELLE. Jusqu'au §44 un mégaprojet tenait
 * dans la cour d'un bloc (4,8 à 8 m de large, plus petit qu'un arbre au zoom maximal). Il occupe
 * maintenant un bloc entier : de 22 m de large (stade 0) à ~54 m (stade 4), pour 11 à 55 m de haut,
 * contre 8 à 12 m pour une maison ou un immeuble. Le bloc est RÉSERVÉ (megaprojetsVille.ts,
 * terrain.ts) : aucun lot ne s'y construit, le mégaprojet n'empiète donc jamais sur une maison ni
 * sur une rue, et sa position, elle, n'a pas changé d'un mètre.
 */
import type { RNG } from "./aleatoire";
import { COL, MAT, hex } from "./constantes";
import type { Geo } from "./geometrie";
import type { TamponAO } from "./mobilier";
import type { TypeMegaprojet } from "@/lib/game/megaprojets";
import { aeroport, gareTgv, grandStade, marcheCouvert, parcSports, stade as stadeMega, zoneLogistique } from "./megaprojetsEquipements";
import { centraleNouvelleGeneration, centraleSolaire, centrale, parcEolien } from "./megaprojetsEnergie";
import { centreRecherche, grandeEcole, hopital, opera, siegeInternational, technopole, tourEmblematique } from "./megaprojetsCivils";
import { BASE, haut, plateforme, volume, zone, type Site } from "./megaprojetsFormes";

/**
 * Demi-côté de l'emprise carrée d'un mégaprojet, selon son stade (0 = ex-Bourg … 4 = ex-Mégapole).
 * Un bloc fait 64 m ; la place du mégaprojet est décalée de 7,25 m du centre du bloc (centre de la
 * cour, megaprojetsVille.ts), donc le plus grand carré qui tient dans le bloc a un demi-côté de
 * 24,75 m : le rayon du stade 4 est volontairement juste au-dessus (27 m) et se réduit à la place
 * disponible (`rayonMax`).
 */
const RAYONS_MEGAPROJET = [11, 15, 19, 23, 27] as const;
/** Hauteur de l'élément le plus haut du mégaprojet (un bâtiment ordinaire : 8 à 12 m ; un gratte-ciel : bien plus). */
const HAUTEURS_MEGAPROJET = [11, 17, 25, 40, 55] as const;

const dansLesStades = (stade: number) => Math.min(Math.max(Math.round(stade), 0), RAYONS_MEGAPROJET.length - 1);

export function rayonMegaprojet(stade: number): number {
  return RAYONS_MEGAPROJET[dansLesStades(stade)];
}

/** Hauteur dont dispose un mégaprojet au-dessus de sa plateforme, selon son stade. */
export function hauteurMegaprojet(stade: number): number {
  return HAUTEURS_MEGAPROJET[dansLesStades(stade)];
}

/** Type inconnu : un bâtiment de pierre sobre à toit plat. */
function generique(s: Site) {
  plateforme(s);
  volume(s, zone(s, -0.7, -0.7, 0.7, 0.7), BASE, haut(s, 0.7), { c: hex("#d6cbb4"), m: MAT.APART, topM: MAT.FLATROOF, topC: COL.roofGray });
}

const SILHOUETTES: Record<TypeMegaprojet, (s: Site) => void> = {
  grande_ecole: grandeEcole,
  parc_sports: parcSports,
  marche_couvert: marcheCouvert,
  hopital,
  stade: stadeMega,
  centrale_solaire: centraleSolaire,
  zone_logistique: zoneLogistique,
  technopole,
  gare_tgv: gareTgv,
  parc_eolien: parcEolien,
  opera,
  tour_emblematique: tourEmblematique,
  aeroport,
  centre_recherche: centreRecherche,
  centrale,
  grand_stade: grandStade,
  centrale_nouvelle_generation: centraleNouvelleGeneration,
  siege_international: siegeInternational,
};

export function buildMegaprojet(
  g: Geo,
  cx: number,
  cz: number,
  type: string,
  /**
   * Stade du mégaprojet (0 = ex-Bourg … 4 = ex-Mégapole, megaprojets.ts du jeu), PAS son
   * palier du catalogue (16 à 33) : c'est lui qui règle la taille du bâtiment.
   */
  stade: number,
  r: RNG,
  ao: TamponAO[],
  seed: number,
  /**
   * Demi-côté maximal que permet la place (megaprojetsVille.ts : distance de la case au bord de son
   * bloc). S'il est plus petit que le rayon du stade, le mégaprojet est réduit d'autant EN TOUTES
   * DIMENSIONS (hauteur comprise) : mêmes proportions, jamais de dépassement sur la rue.
   */
  rayonMax = Infinity
) {
  const Rstade = rayonMegaprojet(stade);
  const R = Math.min(Rstade, rayonMax),
    H = (hauteurMegaprojet(stade) * R) / Rstade;
  const dessiner = Object.prototype.hasOwnProperty.call(SILHOUETTES, type) ? SILHOUETTES[type as TypeMegaprojet] : generique;
  dessiner({ g, cx, cz, R, H, r, seed });
  ao.push({ x0: cx - R, z0: cz - R, x1: cx + R, z1: cz + R, w: 1, h: H });
}
