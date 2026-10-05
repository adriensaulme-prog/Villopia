/**
 * Place des monuments d'influence DANS la ville (docs/A-INTEGRER.md §33,
 * demande d'Adrien du 02/10/2026) : « les monuments ne sont pas placés dans
 * la ville mais en extérieur ». Ils retrouvent leur intention d'origine
 * (§19 : près du centre, zone symbolique), abandonnée au sous-jalon 25a
 * qui les avait mis dans une ceinture à 450 m.
 *
 * A-INTEGRER §49 A+B (retour d'Adrien du 05/10/2026) : les monuments sont
 * plus grands, et « plus dans les cours » : ils se posent sur une PARCELLE DE
 * FAÇADE, au bord de la rue, là où on les voit. Un bloc compte seize
 * parcelles (4 × 4) : douze font son pourtour, quatre ou deux sa cour, et les
 * autres le gratte-ciel. Dans le pourtour, quatre parcelles reçoivent des
 * maisons, deux des immeubles, et les autres un jardin public (l'une d'elles
 * un parking) : c'est à la place d'un de ces jardins que se pose le monument,
 * donc sans jamais déloger une maison ni un immeuble.
 *
 * Règle : le monument du palier p occupe une parcelle de façade du bloc
 * numéro p dans l'ordre de distance au centre (cases.ts) : un monument par
 * bloc, les 16 blocs les plus centraux pour 16 paliers. Dans ce bloc, la
 * parcelle est tirée au hasard (graine de la ville et du bloc) parmi les
 * jardins publics ; le monument tourne sa façade vers la rue de la parcelle.
 * Ces choix ne dépendent que de la graine de la ville : un monument ne se
 * déplace jamais, que la ville grandisse ou que le bloc ne soit pas encore
 * ouvert (la parcelle est alors une friche au cœur de la ville, et le
 * monument y attend son bloc). Fonction pure, lue à la fois par le rendu 3D et
 * par le bouton « Voir où il est ».
 *
 * Avant le §49, deux monuments se partageaient la cour des huit blocs les plus
 * centraux : ils ont donc changé de place, une seule fois.
 */
import { rngFrom } from "./aleatoire";
import { casesCentrales } from "./cases";
import { facadesBloc, type LotFacade } from "./terrain";
import type { Facade, Rect } from "./batiments";

/** Un monument par bloc : les blocs les plus centraux de la ville, autant que de paliers du catalogue. */
export const NB_BLOCS_MONUMENTS = 16;

export interface PlaceMonument {
  /** Centre de la parcelle. */
  x: number;
  z: number;
  /** Bloc dont une parcelle de façade accueille ce monument. */
  bi: number;
  bj: number;
  /** Parcelle (colonne, rangée) dans la grille 4 × 4 du bloc. */
  lc: number;
  lr: number;
  rect: Rect;
  /** Côté de la parcelle sur la rue : la façade du monument regarde par là. */
  front: Facade;
}

/** Parcelles du pourtour d'un bloc où un monument peut se poser : les jardins publics (rang 6 et plus), jamais celle du parking. */
export function parcellesPourMonument(key: string, bi: number, bj: number): LotFacade[] {
  const { lots, parkingIdx } = facadesBloc(key, bi, bj);
  return lots.filter((l) => l.idx >= 6 && l.idx !== parkingIdx);
}

/**
 * Positions des monuments des `paliers` donnés. `Map` palier -> place. Les
 * parcelles sont calculées une fois par bloc (voir facadesBloc : un calcul
 * léger sur une géométrie jetable).
 */
export function placesMonuments(key: string, paliers: readonly number[]): Map<number, PlaceMonument> {
  const cases = casesCentrales(key, NB_BLOCS_MONUMENTS);
  const places = new Map<number, PlaceMonument>();
  for (const palier of paliers) {
    const p = ((palier % NB_BLOCS_MONUMENTS) + NB_BLOCS_MONUMENTS) % NB_BLOCS_MONUMENTS;
    const c = cases[p];
    const candidates = parcellesPourMonument(key, c.bi, c.bj);
    const lot = candidates[Math.floor(rngFrom(key + "|monument|parcelle|" + c.bi + "," + c.bj)() * candidates.length)];
    const [x0, z0, x1, z1] = lot.rect;
    places.set(palier, { x: (x0 + x1) / 2, z: (z0 + z1) / 2, bi: c.bi, bj: c.bj, lc: lot.lc, lr: lot.lr, rect: lot.rect, front: lot.front });
  }
  return places;
}
