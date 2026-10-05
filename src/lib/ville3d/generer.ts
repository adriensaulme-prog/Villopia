/**
 * Orchestration : construit la géométrie complète d'une ville pour une
 * graine (identité stable — l'id de la ville) et une population (le
 * record `population_max`, jamais la population instantanée — voir
 * docs/DECISIONS.md §4, Jalon 6). Porté depuis
 * docs/prototypes/prototype-ville-3d.html (generate()), y compris la
 * croissance sans limite du Jalon 7bis : au-delà des 16 premiers blocs,
 * un bloc de plus tous les 5 000 habitants, du centre vers l'extérieur.
 */

import { cleDe } from "./emplacements";
import { casesTriees } from "./cases";
import { buildMonument, buildPlaceMonument, gabaritMonument } from "./monuments";
import { blocsDeLiaison, placesMegaprojets } from "./megaprojetsVille";
import { niveauLoisirs } from "./megaprojetsFormes";
import { placesMonuments } from "./monumentsVille";
import { rngFrom } from "./aleatoire";
import {
  BS,
  CITY_R_MIN,
  COL,
  MAT,
  PLAFOND_RENDU_POPULATION,
  T,
  TOWER_AFTER_OPEN,
  TOWER_FROM,
  TOWER_STAGGER,
  blockX0,
  openAtK,
} from "./constantes";
import { TOURS_CASE_MAX, choisirCase } from "./zonage";
import { flat, Geo } from "./geometrie";
import type { TamponAO } from "./mobilier";
import {
  buildBlock,
  buildCountryRoads,
  buildCountryside,
  buildDrones,
  buildEnergieCampagne,
  buildIdleBlock,
  buildMegaprojetsCampagne,
  buildRoadsAndTraffic,
  buildTramway,
  zonesEnergie,
  type Bloc,
  type MegaprojetConstruit,
  type MonumentDebloque,
  type Stats,
  type ZoneSansArbre,
} from "./terrain";
import type { VocationQuartier } from "./quartiers";
import type { Facade } from "./batiments";
import { technologiesDepuisPalier, type TechnologiesVille } from "@/lib/game/technologies";

/** Vocation de chaque bloc déjà ouvert, par rang (0 = le plus central) —
 * donnée serveur (table city_blocks, Jalon 19), absente = "residentiel"
 * par défaut (dégradation propre avant que le bloc n'ait sa vocation
 * assignée, ou pour une ville dont les blocs sont plus vieux que ce
 * jalon). */
export type VocationsBlocs = ReadonlyMap<number, VocationQuartier>;

/**
 * Premier rang né avec le zonage (A-INTEGRER §25, sous-jalon 25b) : le
 * plus petit `rang` dont `zonee` est vrai, ou undefined si aucun (ville
 * historique, ou aucune donnée) — tout ce qui précède garde l'emplacement
 * historique. Le marqueur est monotone (la migration 0038 pose false sur
 * l'existant, les nouveaux blocs reçoivent true).
 */
export function premierRangZone(blocs: readonly { rang: number; zonee?: boolean | null }[]): number | undefined {
  let min: number | undefined;
  for (const b of blocs) if (b.zonee && (min === undefined || b.rang < min)) min = b.rang;
  return min;
}

export interface ResultatGeneration {
  g: Geo;
  ao: TamponAO[];
  glow: { x: number; z: number }[];
  stats: Stats & { cityR: number };
}


/**
 * Ordre d'ouverture des blocs d'une ville et seuils de chacun, à une
 * population donnée. Pur : c'est lui qui garantit qu'une ville qui grandit
 * ne déplace jamais un bloc déjà ouvert (tests/unit/ville3dCroissance.test.ts).
 */
export function planifierBlocs(
  name: string,
  C: number,
  vocations?: VocationsBlocs,
  zonageDepuisRang?: number
): { blocks: Bloc[]; K: number } {
  const key = cleDe(name);
  // Nombre de blocs ouverts à ce stade, puis candidats en anneaux autour
  // du croisement central (blocs repérés par des entiers relatifs).
  // Plafond de rendu : l'étendue de la ville s'arrête à
  // PLAFOND_RENDU_POPULATION, même si la population continue de monter.
  const Crendu = Math.min(C, PLAFOND_RENDU_POPULATION);
  let K = 0;
  while (openAtK(K) <= Crendu) K++;
  const M = Math.ceil(Math.sqrt(K + 40) / 2) + 3;
  // Aléa d'ordre propre à chaque case (cases.ts) : ajouter des candidats ne
  // réordonne jamais les blocs déjà ouverts.
  const blocks: Bloc[] = casesTriees(key, M).map((c) => ({
    bi: c.bi,
    bj: c.bj,
    d: c.d,
    openAt: 0,
    gap: 0,
    towerAt: 0,
    active: false,
    vocation: "residentiel" as VocationQuartier,
  }));
  blocks.length = Math.min(blocks.length, K + 24);

  // Case (index dans l'ordre de distance) occupée par chaque rang. Jalon
  // 19 : la vocation est fixée par rang une fois pour toutes (§7), le rang
  // est celui de city_blocks.rang (ordre d'ouverture). Avant le zonage
  // (§25), rang = case : un bloc s'ouvrait à la case suivante. Pour les
  // rangs nés avec le zonage, la case est rejouée rang après rang
  // (zonage.ts) selon la vocation du bloc.
  const debutZonage = zonageDepuisRang ?? Infinity;
  const libre = blocks.map(() => true);
  const caseDuRang: number[] = [];
  const rangDeLaCase: number[] = blocks.map(() => -1);
  for (let rang = 0; rang < K; rang++) {
    const voc = vocations?.get(rang) ?? "residentiel";
    const s = rang < debutZonage ? rang : choisirCase(blocks, libre, rang, voc);
    libre[s] = false;
    caseDuRang[rang] = s;
    rangDeLaCase[s] = rang;
  }
  blocks.forEach((b, s) => {
    const rang = rangDeLaCase[s];
    // Case encore vide : pas de rang, on garde l'ancien décompte par case
    // (jamais actif, rien ne le lit).
    const r = rang >= 0 ? rang : s;
    b.openAt = openAtK(r);
    b.gap = openAtK(r + 1) - b.openAt;
    b.active = rang >= 0 && Crendu >= b.openAt;
    // Gratte-ciel : plus la case est centrale, plus tôt. Un bloc zoné
    // au-delà de TOURS_CASE_MAX n'en reçoit jamais (maisons en périphérie).
    b.towerAt =
      rang >= debutZonage && s >= TOURS_CASE_MAX
        ? Infinity
        : Math.max(TOWER_FROM + s * TOWER_STAGGER, b.openAt + TOWER_AFTER_OPEN);
    b.vocation = rang >= 0 ? (vocations?.get(rang) ?? "residentiel") : "residentiel";
  });
  return { blocks, K };
}

export function generate(
  name: string,
  C: number,
  vocations?: VocationsBlocs,
  elanEnergie = 0,
  megaprojets: MegaprojetConstruit[] = [],
  nbTechnologies = 0,
  monuments: MonumentDebloque[] = [],
  theme = "classique",
  zonageDepuisRang?: number
): ResultatGeneration {
  const key = cleDe(name);
  const g = new Geo();
  const ao: TamponAO[] = [],
    glow: { x: number; z: number }[] = [],
    ev: number[] = [];
  const stats: Stats = { maxFloors: 0, towers: 0, active: 0 };
  const tech: TechnologiesVille = technologiesDepuisPalier(nbTechnologies);
  flat(g, -4000, -4000, 4000, 4000, 0, COL.meadow, MAT.MEADOW);

  const { blocks, K } = planifierBlocs(name, C, vocations, zonageDepuisRang);
  for (let rang = 0; rang <= K; rang++) ev.push(openAtK(rang));

  const act = blocks.filter((b) => b.active);
  stats.active = act.length;
  const bc = (i: number) => blockX0(i) + BS / 2;
  const cx = act.reduce((a, b) => a + bc(b.bi), 0) / act.length,
    cz = act.reduce((a, b) => a + bc(b.bj), 0) / act.length;
  // A-INTEGRER §33 puis §49 A+B : un monument occupe une parcelle de façade (un jardin public) de l'un
  // des premiers blocs, au bord de la rue — ou sa friche si le bloc n'est pas encore ouvert.
  const places = placesMonuments(
    key,
    monuments.map((m) => m.palier)
  );
  // Retour d'Adrien du 05/10/2026 : les mégaprojets sont DANS la ville, dans les premiers blocs après ceux des
  // monuments (megaprojetsVille.ts), avec leurs rues ; le bloc, déjà ouvert ou non, devient le mégaprojet.
  const placesMega = placesMegaprojets(
    key,
    megaprojets.map((m) => m.palier)
  );
  let E = 0,
    R = 0;
  for (const b of act) {
    E = Math.max(E, Math.abs(bc(b.bi) - cx) + BS / 2 + 10, Math.abs(bc(b.bj) - cz) + BS / 2 + 10);
    R = Math.max(R, Math.abs(blockX0(b.bi)), Math.abs(blockX0(b.bi) + BS), Math.abs(blockX0(b.bj)), Math.abs(blockX0(b.bj) + BS));
  }
  // Les sites de mégaprojets et les monuments débloqués comptent dans l'étendue de la ville (retour d'Adrien du
  // 05/10/2026 : ils sont dans la ville) : sa carte d'occlusion et de lueur de nuit, ses ombres et son brouillard
  // doivent les couvrir, ou leurs lampadaires n'éclaireraient rien.
  for (const p of placesMega.values()) R = Math.max(R, Math.abs(p.rect[0]), Math.abs(p.rect[1]), Math.abs(p.rect[2]), Math.abs(p.rect[3]));
  for (const p of places.values()) R = Math.max(R, Math.abs(p.x) + 16, Math.abs(p.z) + 16);
  const cityR = Math.max(CITY_R_MIN, R + 8);
  stats.center = [cx, cz];
  stats.extent = E;
  stats.cityR = cityR;

  const horsVille = (b: Bloc) =>
    Math.max(Math.abs(blockX0(b.bi)), Math.abs(blockX0(b.bi) + BS), Math.abs(blockX0(b.bj)), Math.abs(blockX0(b.bj) + BS)) >= cityR;

  // A-INTEGRER §45 et §49 D : un mégaprojet occupe son bloc entier (taille réelle) — le Stade et le Parc
  // d'attractions un carré de 2 × 2 blocs —, qui n'a donc ni lots ni cour.
  const blocsMega = [...placesMega.values()].flatMap((p) => p.blocs);
  const casesSansCour = new Set(blocsMega.map((b) => b.bi + "," + b.bj));
  // Parcelles de façade occupées par un monument, par bloc : buildBlock() n'y pose pas de jardin public.
  const lotsMonument = new Map<string, Set<string>>();
  for (const p of places.values()) {
    const cle = p.bi + "," + p.bj;
    if (!lotsMonument.has(cle)) lotsMonument.set(cle, new Set());
    lotsMonument.get(cle)!.add(p.lc + "," + p.lr);
  }
  const casesMegaprojet = casesSansCour;
  // Côtés des blocs d'un site de plusieurs blocs qui touchent un autre bloc du même site : pas de trottoir ni de lampadaire.
  const cotesInternes = new Map<string, Set<Facade>>();
  for (const p of placesMega.values()) {
    if (p.nx * p.nz === 1) continue;
    const dans = new Set(p.blocs.map((b) => b.bi + "," + b.bj));
    for (const b of p.blocs) {
      const cotes = new Set<Facade>();
      if (dans.has(b.bi - 1 + "," + b.bj)) cotes.add("-x");
      if (dans.has(b.bi + 1 + "," + b.bj)) cotes.add("+x");
      if (dans.has(b.bi + "," + (b.bj - 1))) cotes.add("-z");
      if (dans.has(b.bi + "," + (b.bj + 1))) cotes.add("+z");
      cotesInternes.set(b.bi + "," + b.bj, cotes);
    }
  }
  // Rues qui traversent un site de plusieurs blocs : elles disparaissent avec lui.
  const ruesInternes = [...placesMega.values()].filter((p) => p.nx * p.nz > 1).map((p) => p.rect);
  // Rien ne se plante sur un monument (sa parcelle de 14,5 m) ni sur l'emprise d'un mégaprojet (carré, marge de 3 m pour sa plateforme ; tout le carré de blocs pour un site de plusieurs blocs).
  const zoneSite = (p: { x: number; z: number; rayon: number; nx: number; nz: number; rect: [number, number, number, number] }, marge: number): ZoneSansArbre =>
    p.nx * p.nz > 1
      ? { x: p.x, z: p.z, demi: (p.rect[2] - p.rect[0]) / 2 + marge - 3, demiZ: (p.rect[3] - p.rect[1]) / 2 + marge - 3 }
      : { x: p.x, z: p.z, demi: p.rayon + marge };
  const emplacementsSurCour: ZoneSansArbre[] = [
    ...[...places.values()].map((p) => ({ x: p.x, z: p.z, demi: 8 })),
    ...[...placesMega.values()].map((p) => zoneSite(p, 3)),
  ];

  // Blocs pas encore ouverts mais aménagés (retour d'Adrien du 05/10/2026 : « pas toujours à côté d'une route ») :
  // un site de mégaprojet et le bloc d'un monument débloqués ont toujours leurs rues, leurs trottoirs et leurs
  // lampadaires, même si la ville ne les a pas encore atteints ; les rues qui les relient au croisement central
  // sont dessinées aussi. Le bloc ouvert plus tard reprend là où il en est (rien n'est construit avant son heure).
  const cle = (b: { bi: number; bj: number }) => b.bi + "," + b.bj;
  const actifs = new Set(act.map(cle));
  const amenages = new Map<string, { bi: number; bj: number }>();
  for (const b of blocsMega) if (!actifs.has(cle(b))) amenages.set(cle(b), b);
  for (const p of places.values()) if (!actifs.has(cle(p))) amenages.set(cle(p), { bi: p.bi, bj: p.bj });
  const pourLesRues = new Map<string, { bi: number; bj: number }>();
  for (const b of act) pourLesRues.set(cle(b), b);
  for (const b of amenages.values()) pourLesRues.set(cle(b), b);
  for (const p of placesMega.values()) for (const b of blocsDeLiaison(p)) pourLesRues.set(cle(b), b);
  for (const p of places.values()) for (const b of blocsDeLiaison(p)) pourLesRues.set(cle(b), b);

  buildRoadsAndTraffic(g, [...pourLesRues.values()] as Bloc[], key, Math.ceil(cityR / T), ruesInternes);
  const optionsBloc = (b: { bi: number; bj: number }) => ({
    sansCour: casesSansCour.has(cle(b)),
    siteMegaprojet: casesMegaprojet.has(cle(b)),
    cotesInternes: cotesInternes.get(cle(b)),
    lotsMonument: lotsMonument.get(cle(b)),
  });
  const dessines = new Set<string>();
  for (const b of blocks) {
    if (b.active || amenages.has(cle(b))) {
      buildBlock(g, b, C, key, ao, stats, glow, ev, tech, theme, optionsBloc(b));
      dessines.add(cle(b));
    } else if (!horsVille(b)) buildIdleBlock(g, b, key, ao, emplacementsSurCour);
  }
  // Les blocs aménagés hors de la liste des cases candidates (une petite ville, un site de mégaprojet plus loin).
  for (const b of amenages.values()) {
    if (dessines.has(cle(b))) continue;
    const vide: Bloc = { bi: b.bi, bj: b.bj, d: Math.hypot(b.bi + 0.5, b.bj + 0.5), openAt: Infinity, gap: 1, towerAt: Infinity, active: false, vocation: "residentiel" };
    buildBlock(g, vide, C, key, ao, stats, glow, [], tech, theme, optionsBloc(b));
  }
  if (tech.tramway) buildTramway(g, key, cityR);
  if (tech.drones) buildDrones(g, key, cityR);
  buildCountryside(g, key, ao, cityR, [
    ...[...placesMega.values()].map((p) => zoneSite(p, 6)),
    ...zonesEnergie(key, elanEnergie),
  ]);
  buildCountryRoads(g, key, ao, cityR);
  buildEnergieCampagne(g, key, ao, elanEnergie);
  buildMegaprojetsCampagne(g, key, ao, megaprojets, placesMega, glow, niveauLoisirs(stats.stadesLoisirs ?? 0));
  for (const m of monuments) {
    const place = places.get(m.palier);
    if (!place) continue;
    const r = rngFrom(key + "|monument|type|" + m.palier);
    const seed = Math.floor(r() * 900) + 50;
    buildPlaceMonument(g, place.x, place.z, ao, seed, place.front, gabaritMonument(m.type, m.palier).rayon);
    buildMonument(g, place.x, place.z, m.type, m.palier, ao, seed, place.front);
  }
  stats.next = ev.filter((t) => t > C).reduce((m, t) => Math.min(m, t), Infinity);
  return { g, ao, glow, stats: { ...stats, cityR } };
}
