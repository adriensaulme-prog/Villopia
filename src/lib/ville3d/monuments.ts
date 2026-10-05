/**
 * Monuments d'influence (Jalon 20 3/3, docs/A-INTEGRER.md §19) : des
 * repères dorés/bronze, pour qu'on les distingue au premier coup d'œil.
 * A-INTEGRER §43 : chacun des 16 types a sa propre silhouette (une borne n'a
 * plus rien d'une horloge) et un détail de surface (marches, plaques
 * d'inscription, cadrans, tuiles de mur, flammes, vasques).
 *
 * A-INTEGRER §49 A+B (retour d'Adrien du 05/10/2026) : plus grands, plus
 * détaillés, et posés sur une parcelle de façade au bord de la rue (voir
 * monumentsVille.ts). Un monument tient dans le carré d'une parcelle (14,5 m) :
 * son emprise est un cercle de 8 à 13 m de large, et c'est en HAUTEUR qu'il
 * grandit : de 7 m (le banc) à 62 m (le monument ultime), la statue géante
 * à 56 m — dix fois ce qu'ils étaient. Chaque type a son gabarit (rayon,
 * hauteur) : un banc ne monte pas à 50 m, et un colosse n'a pas l'allure d'une
 * borne. La façade du monument (le côté +z de sa construction) est tournée vers
 * la rue de sa parcelle.
 *
 * Trois rangs, pour que le prestige se lise autrement que par la taille :
 *   modeste     (paliers 0-4)   une marche, bronze patiné mat, pierre brute ;
 *   notable     (paliers 5-9)   deux marches, plaques encadrées, dorure polie ;
 *   prestigieux (paliers 10-15) trois marches, marbre, or poli, quatre
 *                               lampadaires qui s'allument la nuit, flammes.
 * La teinte or/bronze reste la signature commune : elle glisse seulement du
 * bronze (palier 0) à l'or (milieu) puis à l'or poli (palier 15).
 *
 * Chaque monument tient dans le cercle de son socle (rayon du gabarit) et sous
 * la hauteur de son gabarit : les emplacements de monumentsVille.ts supposent
 * les deux. Un type inconnu (par exemple un mégaprojet fusionné au catalogue,
 * §41, si on décide de le dessiner ici plutôt que par megaprojets.ts) retombe
 * sur l'une de trois silhouettes génériques, à un gabarit tiré de son palier ;
 * pour lui en donner une, il suffit d'ajouter une entrée à FORMES et à GABARITS.
 */
import { COL, LOT, MAT, hex, type Couleur } from "./constantes";
import { box, cylinder as cylindreBrut, gableRoof, shadeC, Geo } from "./geometrie";
import type { TamponAO } from "./mobilier";
import {
  arche,
  balustrade,
  boite,
  colonne,
  disque,
  ellipsoide,
  flamme,
  lampadaire,
  marchesCarrees,
  marchesRondes,
  membre,
  mixer,
  panneau,
  plaque,
  tore,
  tourVrillee,
  tronc,
  type Face,
  type V3,
} from "./monumentsFormes";

/** Taille (rayon du socle, hauteur totale) d'un monument, en mètres. */
export interface Gabarit {
  /** Rayon du cercle du socle, la plus grande emprise du monument (jamais plus que la moitié d'une parcelle moins sa marge). */
  rayon: number;
  /** Hauteur du sommet au-dessus du sol. */
  hauteur: number;
}

/** Plus grand rayon de socle : un cercle de 13,2 m dans une parcelle de 14,5 m (LOT). */
export const RAYON_MAX_MONUMENT = LOT / 2 - 0.65;

/**
 * Gabarit de chacun des 16 types du catalogue (src/lib/game/monuments.ts). Les hauteurs vont de 7 m à
 * 62 m ; un monument prestigieux est toujours plus haut que les maisons (9 m) et les immeubles (12 à
 * 25 m) autour de lui.
 */
export const GABARITS: Readonly<Record<string, Gabarit>> = {
  borne_commemorative: { rayon: 4.0, hauteur: 9 },
  banc_public: { rayon: 5.0, hauteur: 7 },
  fontaine_simple: { rayon: 5.4, hauteur: 9 },
  buste: { rayon: 4.4, hauteur: 13 },
  obelisque: { rayon: 4.6, hauteur: 22 },
  arc_triomphe_miniature: { rayon: 6.3, hauteur: 17 },
  horloge_municipale: { rayon: 5.2, hauteur: 27 },
  fontaine_monumentale: { rayon: 6.5, hauteur: 15 },
  statue_equestre: { rayon: 5.8, hauteur: 22 },
  mur_remerciements: { rayon: 6.5, hauteur: 11 },
  arche_monumentale: { rayon: 6.4, hauteur: 34 },
  tour_observatoire: { rayon: 6.4, hauteur: 40 },
  statue_emblematique: { rayon: 6.0, hauteur: 46 },
  temple_national: { rayon: 6.5, hauteur: 24 },
  statue_geante: { rayon: 6.4, hauteur: 56 },
  monument_ultime: { rayon: 6.4, hauteur: 62 },
};

/** Gabarit d'un type : celui du catalogue, ou (type inconnu) un gabarit qui grandit avec le palier. */
export function gabaritMonument(type: string, palier: number): Gabarit {
  const connu = GABARITS[type];
  if (connu) return connu;
  const t = Math.min(Math.max(palier, 0), 15) / 15;
  return { rayon: 4.2 + 2.2 * t, hauteur: 9 + 40 * t };
}

const BRONZE = hex("#a47a2a"); // paliers modestes : bronze patiné, plus sombre que l'or
const OR = hex("#c9a227"); // l'or d'origine, au milieu de l'échelle
const OR_POLI = hex("#e2bb33"); // derniers paliers : or poli, plus vif
const PIERRE = hex("#9d9482"); // pierre des paliers modestes (la scène l'éclaircit beaucoup : COL.stone rendait presque blanc)
const MARBRE = hex("#ebe5d4");
const PLAQUE_FOND = hex("#2e2820");
const EAU = COL.water;
const EAU_CLAIRE = hex("#a8d3ee");
const FLAMME = hex("#ffb52e");
const LANTERNE = hex("#f3e2b0");
const CADRAN = hex("#f1ead6");
const FEUILLAGE = hex("#4d8a3c");

/** Finesse des cylindres : nombre de pans multiplié, pour que de grands fûts et de grands dômes ne soient pas des prismes. */
const FINESSE = 1.5;
function cylinder(
  g: Geo,
  cx: number,
  y0: number,
  cz: number,
  r: number,
  h: number,
  seg: number,
  c: Couleur,
  m: number,
  topM: number | null,
  topC: Couleur | null,
  rTop?: number
) {
  cylindreBrut(g, cx, y0, cz, r, h, Math.round(seg * FINESSE), c, m, topM, topC, rTop);
}

function hashType(type: string): number {
  let h = 0;
  for (let i = 0; i < type.length; i++) h += type.charCodeAt(i);
  return h;
}

/** Rang visuel d'un palier : 0 modeste, 1 notable, 2 prestigieux. */
export function rangMonument(palier: number): 0 | 1 | 2 {
  return palier < 5 ? 0 : palier < 10 ? 1 : 2;
}

/** Du bronze (palier 0) à l'or (palier 7-8) puis à l'or poli (palier 15). */
export function couleurMetal(t: number): Couleur {
  return t < 0.5 ? mixer(BRONZE, OR, t / 0.5) : mixer(OR, OR_POLI, (t - 0.5) / 0.5);
}

interface Ctx {
  g: Geo;
  cx: number;
  cz: number;
  seed: number;
  niveau: 0 | 1 | 2;
  /** Rayon du socle (la plus grande emprise du monument). */
  r: number;
  /** Rayon libre sur la dernière marche, et hauteur de son dessus. */
  rb: number;
  yb: number;
  /** Hauteur du dessus de la première marche (la plus large) : là où se posent les lampadaires d'angle. */
  yPied: number;
  /** Hauteur disponible au-dessus de la dernière marche. */
  hs: number;
  or: Couleur;
  orSombre: Couleur;
  orClair: Couleur;
  /** Matériau des métaux : mat (patine) pour les modestes, brillant (poli) ensuite. */
  mOr: number;
  pierre: Couleur;
  gres: Couleur;
}

type Dessin = (c: Ctx) => void;

function plaqueDe(c: Ctx, face: Face, centre: number, plan: number, y0: number, h: number, demi: number, lignes = c.niveau + 1) {
  plaque(c.g, face, centre, plan, y0, h, demi, {
    fond: PLAQUE_FOND,
    trait: c.or,
    mTrait: c.mOr,
    cadre: c.niveau > 0,
    lignes,
    seed: c.seed,
  });
}

/** Plaque sur les quatre faces d'un piédestal : hx/hz = demi-côtés du piédestal, dz/dx = demi-largeur de la plaque sur les faces ±z / ±x. */
function plaques4(c: Ctx, hx: number, hz: number, y0: number, h: number, dz: number, dx = dz) {
  plaqueDe(c, "+z", c.cx, c.cz + hz, y0, h, dz);
  plaqueDe(c, "-z", c.cx, c.cz - hz, y0, h, dz);
  plaqueDe(c, "+x", c.cz, c.cx + hx, y0, h, dx);
  plaqueDe(c, "-x", c.cz, c.cx - hx, y0, h, dx);
}

/** Demi-côté d'un tronc de pyramide (w0 en bas, w1 en haut, hauteur h) à la hauteur dy. */
const demiA = (w0: number, w1: number, h: number, dy: number) => w0 - ((w0 - w1) * dy) / h;

/** Bandeau (corniche, listel) autour d'une section rectangulaire de demi-côtés hx, hz ; `ep` est son débord. */
function bandeau(c: Ctx, y: number, hx: number, hz: number, h: number, ep: number, col: Couleur, m: number = MAT.PLAIN) {
  box(c.g, c.cx - hx - ep, y, c.cz - hz - ep, c.cx + hx + ep, y + h, c.cz + hz + ep, { c: col, m, seed: c.seed });
}

/** Rayons de couronne ou de halo : n traits en éventail au sommet d'une tête, chacun penché vers l'extérieur par son décalage. */
function couronne(c: Ctx, x: number, y: number, z: number, ecart: number, hMax: number, n = 5) {
  for (let k = 0; k < n; k++) {
    const d = k - (n - 1) / 2;
    tronc(c.g, x + d * ecart, y, z, ecart * 0.3, 0, hMax * (1 - 0.2 * Math.abs(d)), c.orClair, c.mOr, c.seed);
  }
}

// --------------------------------------------------------------------------
// Rang modeste (paliers 0 à 4)
// --------------------------------------------------------------------------

/** Borne commémorative : trois assises de pierre, fût à plaques et listels, chapiteau évasé et, au sommet, une sphère armillaire de bronze (quatre anneaux sur un axe incliné) ; quatre bornes basses autour. */
const borne: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const w = rb * 0.46;
  const h1 = hs * 0.08,
    h1b = hs * 0.06,
    h2 = hs * 0.32,
    h3 = hs * 0.03,
    h4 = hs * 0.05;
  box(g, cx - w, yb, cz - w, cx + w, yb + h1, cz + w, { c: c.pierre, m: MAT.PLAIN, seed });
  box(g, cx - w * 0.88, yb + h1, cz - w * 0.88, cx + w * 0.88, yb + h1 + h1b, cz + w * 0.88, { c: c.gres, m: MAT.PLAIN, seed });
  const y1 = yb + h1 + h1b;
  const w0 = w * 0.72,
    w1 = w * 0.58;
  tronc(g, cx, y1, cz, w0, w1, h2, c.or, c.mOr, seed);
  const d = demiA(w0, w1, h2, h2 * 0.2);
  plaques4(c, d, d, y1 + h2 * 0.2, h2 * 0.55, w * 0.34);
  for (const k of [0.05, 0.92]) bandeau(c, y1 + h2 * k, demiA(w0, w1, h2, h2 * k), demiA(w0, w1, h2, h2 * k), h2 * 0.04, 0.07, c.orSombre, c.mOr);
  bandeau(c, y1 + h2, w1, w1, h3, w * 0.18, c.pierre);
  // Chapiteau évasé, qui porte la sphère.
  const y3 = y1 + h2 + h3;
  tronc(g, cx, y3, cz, w * 0.5, w * 0.8, h4, c.orSombre, c.mOr, seed);
  const yTop = y3 + h4;
  // Sphère armillaire : un globe, l'anneau de l'équateur, deux méridiens et l'écliptique incliné de 23,5°, sur son axe polaire.
  const Rs = hs * 0.17,
    yS = yTop + Rs * 1.15;
  const r = Rs * 0.06;
  ellipsoide(g, cx, yS, cz, Rs * 0.27, Rs * 0.27, Rs * 0.27, c.orClair, c.mOr, 12, 8);
  tore(g, [cx, yS, cz], Rs, r, [0, 1, 0], c.or, c.mOr, { seed });
  tore(g, [cx, yS, cz], Rs * 0.98, r, [1, 0, 0], c.or, c.mOr, { seed });
  tore(g, [cx, yS, cz], Rs * 0.98, r, [Math.cos(0.85), 0, Math.sin(0.85)], c.orSombre, c.mOr, { seed });
  const tilt = 0.41;
  tore(g, [cx, yS, cz], Rs * 1.03, r * 1.2, [Math.sin(tilt), Math.cos(tilt), 0], c.orClair, c.mOr, { seed });
  const pol: V3 = [Math.sin(tilt) * Rs * 1.3, Math.cos(tilt) * Rs * 1.3, 0];
  membre(g, [cx - pol[0], yS - pol[1], cz], [cx + pol[0], yS + pol[1], cz], r * 0.9, r * 0.9, c.orSombre, c.mOr, { seed });
  for (const s of [-1, 1]) ellipsoide(g, cx + s * pol[0], yS + s * pol[1], cz, r * 2, r * 2, r * 2, c.orClair, c.mOr, 8, 5);
  // Quatre jambes de force du chapiteau à l'équateur.
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    membre(g, [cx + Math.cos(a) * w * 0.35, yTop, cz + Math.sin(a) * w * 0.35], [cx + Math.cos(a) * Rs, yS, cz + Math.sin(a) * Rs], r * 1.1, r * 0.8, c.orSombre, c.mOr, { seg: 6, seed });
  }
  // Quatre bornes basses aux angles de la marche.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x = cx + sx * rb * 0.66,
        z = cz + sz * rb * 0.66;
      cylinder(g, x, yb, z, rb * 0.05, hs * 0.09, 8, c.orSombre, c.mOr, MAT.PLAIN, c.or, rb * 0.04);
      ellipsoide(g, x, yb + hs * 0.1, z, rb * 0.045, rb * 0.045, rb * 0.045, c.or, c.mOr, 8, 5);
    }
};

/** Banc public : un banc ondulé de pierre à lattes de bronze, dossier à crêtes, sous une treille d'arceaux fleuris ; deux lampadaires qui dépassent (ils s'allument la nuit). */
const banc: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const L = rb * 0.72,
    P = rb * 0.2;
  const n = 7;
  const pas = (2 * L) / n;
  const hAss = hs * 0.16;
  const onde = (k: number) => rb * 0.11 * Math.sin(((k + 0.5) / n) * Math.PI * 2);
  for (let k = 0; k < n; k++) {
    const x = cx - L + (k + 0.5) * pas,
      z = cz + onde(k);
    // Assise : un bloc de pierre et trois lattes de bronze ; le dossier est plus haut aux crêtes de l'onde.
    box(g, x - pas / 2 + 0.04, yb, z - P, x + pas / 2 - 0.04, yb + hAss, z + P, { c: c.pierre, m: MAT.PLAIN, seed });
    for (let i = 0; i < 3; i++) {
      const z0 = z - P + (i * 2 * P) / 3;
      box(g, x - pas / 2 + 0.06, yb + hAss, z0 + 0.03, x + pas / 2 - 0.06, yb + hAss + hs * 0.025, z0 + (2 * P) / 3 - 0.03, { c: c.or, m: c.mOr, seed });
    }
    const hDos = hs * (0.1 + 0.07 * Math.cos(((k + 0.5) / n) * Math.PI * 2 * 2));
    box(g, x - pas / 2 + 0.06, yb + hAss, z - P, x + pas / 2 - 0.06, yb + hAss + hDos, z - P + rb * 0.05, { c: c.gres, m: MAT.PLAIN, seed });
    box(g, x - pas / 2 + 0.1, yb + hAss + hDos, z - P - 0.02, x + pas / 2 - 0.1, yb + hAss + hDos + hs * 0.02, z - P + rb * 0.06, { c: c.or, m: c.mOr, seed });
  }
  // Joues d'extrémité : un massif de pierre à volute de bronze.
  for (const sg of [-1, 1]) {
    const x = cx + sg * (L + rb * 0.06);
    box(g, x - rb * 0.06, yb, cz + onde(sg < 0 ? 0 : n - 1) - P - 0.1, x + rb * 0.06, yb + hAss + hs * 0.12, cz + onde(sg < 0 ? 0 : n - 1) + P + 0.1, { c: c.pierre, m: MAT.PLAIN, seed });
    ellipsoide(g, x, yb + hAss + hs * 0.13, cz + onde(sg < 0 ? 0 : n - 1), rb * 0.07, hs * 0.035, P * 0.9, c.orSombre, c.mOr, 8, 5);
  }
  plaqueDe(c, "+z", cx, cz + onde(3) + P + 0.02, yb + 0.1, hAss * 0.7, L * 0.28, 1);
  // Treille : cinq arceaux de bronze qui enjambent le banc, reliés par des lisses, et des fleurs.
  const rIn = P + rb * 0.12,
    ySp = yb + hs * 0.1;
  const rAr = 0.16;
  for (let i = 0; i < 4; i++) {
    const x = cx - L * 0.78 + (i * (2 * L * 0.78)) / 3;
    arche(g, x, ySp, cz, rIn, rIn + rAr, 0.28, c.orSombre, c.mOr, { versX: true, seed, seg: 12 });
    for (const sz of [-1, 1]) box(g, x - 0.14, yb, cz + sz * (rIn + rAr / 2) - 0.14, x + 0.14, ySp, cz + sz * (rIn + rAr / 2) + 0.14, { c: c.orSombre, m: c.mOr, seed });
    for (const a of [0.6, 1.57, 2.55]) ellipsoide(g, x, ySp + Math.sin(a) * (rIn + 0.08), cz + Math.cos(a) * (rIn + 0.08), 0.26, 0.2, 0.26, i % 2 ? hex("#c9584a") : hex("#6aa84f"), MAT.FOLIAGE, 6, 4);
  }
  const yTop = ySp + rIn + rAr / 2;
  membre(g, [cx - L * 0.78, yTop, cz], [cx + L * 0.78, yTop, cz], 0.07, 0.07, c.orSombre, c.mOr, { seg: 6, seed });
  for (const sz of [-1, 1]) membre(g, [cx - L * 0.78, ySp + rIn * 0.7, cz + sz * rIn * 0.72], [cx + L * 0.78, ySp + rIn * 0.7, cz + sz * rIn * 0.72], 0.06, 0.06, c.orSombre, c.mOr, { seg: 6, seed });
  for (const sg of [-1, 1]) lampadaire(g, cx + sg * (L + rb * 0.04), yb, cz - P - rb * 0.12, hs * 0.97, { fut: c.orSombre, pied: c.pierre, lanterne: LANTERNE, echelle: 2.6, seed });
};

/** Fontaine à sphère : trois bassins étagés, une grande sphère de bronze qui flotte au-dessus sur un jet, douze arcs d'eau qui la frappent, huit petits jets sur la margelle. */
const fontaineSimple: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb } = c;
  const R1 = rb * 0.9,
    R2 = rb * 0.62,
    R3 = rb * 0.36;
  const b1 = hs * 0.09,
    b2 = hs * 0.075,
    b3 = hs * 0.07;
  cylinder(g, cx, yb, cz, R1, b1, 18, c.pierre, MAT.PLAIN, MAT.PLAIN, c.gres);
  cylinder(g, cx, yb + b1, cz, R1, hs * 0.02, 18, c.gres, MAT.PLAIN, null, null, R1 * 0.96);
  cylinder(g, cx, yb + b1, cz, R1 * 0.93, hs * 0.01, 18, EAU, MAT.WATER, MAT.WATER, EAU);
  const y2 = yb + b1;
  cylinder(g, cx, y2, cz, R2, b2, 16, c.gres, MAT.PLAIN, MAT.WATER, EAU);
  const y3 = y2 + b2;
  cylinder(g, cx, y3, cz, R3, b3, 14, c.pierre, MAT.PLAIN, MAT.WATER, EAU);
  const y4 = y3 + b3;
  // Sphère flottante sur sa colonne d'eau.
  const Rs = hs * 0.13;
  const yC = y4 + hs * 0.1 + Rs;
  cylinder(g, cx, y4, cz, rb * 0.05, hs * 0.1, 8, EAU_CLAIRE, MAT.WATER, null, null, rb * 0.03);
  ellipsoide(g, cx, yC, cz, Rs, Rs, Rs, c.or, c.mOr, 18, 12);
  // Méridiens et parallèles gravés sur la sphère.
  tore(g, [cx, yC, cz], Rs * 1.005, Rs * 0.025, [0, 1, 0], c.orSombre, c.mOr, { seed: c.seed });
  tore(g, [cx, yC, cz], Rs * 1.005, Rs * 0.025, [1, 0, 0], c.orSombre, c.mOr, { seed: c.seed });
  tore(g, [cx, yC, cz], Rs * 1.005, Rs * 0.025, [0, 0, 1], c.orSombre, c.mOr, { seed: c.seed });
  // Douze arcs d'eau du deuxième bassin vers la sphère, et un jet vertical par-dessus.
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    membre(g, [cx + Math.cos(a) * R2 * 0.85, y3 + 0.05, cz + Math.sin(a) * R2 * 0.85], [cx + Math.cos(a) * Rs * 0.8, yC - Rs * 0.2, cz + Math.sin(a) * Rs * 0.8], 0.07, 0.035, EAU_CLAIRE, MAT.WATER, { seg: 5, seed: c.seed });
  }
  cylinder(g, cx, yC + Rs * 0.9, cz, rb * 0.04, 0.97 * hs + yb - (yC + Rs * 0.9), 8, EAU_CLAIRE, MAT.WATER, null, null, 0);
  // Huit petits jets sur le grand bassin, quatre bornes basses sur sa margelle.
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const x = cx + Math.cos(a) * R1 * 0.78,
      z = cz + Math.sin(a) * R1 * 0.78;
    cylinder(g, x, y2, z, rb * 0.03, hs * 0.04, 6, c.orSombre, c.mOr, null, null);
    membre(g, [x, y2 + hs * 0.04, z], [x - Math.cos(a) * R1 * 0.3, y2 + hs * 0.09, z - Math.sin(a) * R1 * 0.3], 0.05, 0.03, EAU_CLAIRE, MAT.WATER, { seg: 5, seed: c.seed });
  }
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    cylinder(g, cx + dx * R1 * 0.97, yb, cz + dz * R1 * 0.97, rb * 0.055, hs * 0.2, 8, c.orSombre, c.mOr, MAT.PLAIN, c.or, rb * 0.04);
    ellipsoide(g, cx + dx * R1 * 0.97, yb + hs * 0.21, cz + dz * R1 * 0.97, rb * 0.05, rb * 0.05, rb * 0.05, c.or, c.mOr, 8, 5);
  }
};

/** Buste couronné de lauriers : piédestal à plaques, épaules drapées de plis diagonaux, médaillon, tête à chevelure bouclée, couronne de lauriers (anneau et feuilles), nez, sourcils, oreilles. */
const buste: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const w = rb * 0.4;
  const h1 = hs * 0.07,
    h2 = hs * 0.36,
    h3 = hs * 0.05;
  box(g, cx - w * 1.2, yb, cz - w * 1.2, cx + w * 1.2, yb + h1, cz + w * 1.2, { c: c.pierre, m: MAT.PLAIN, seed });
  tronc(g, cx, yb + h1, cz, w * 0.9, w * 0.74, h2, c.gres, MAT.PLAIN, seed);
  const d = demiA(w * 0.9, w * 0.74, h2, h2 * 0.2);
  plaques4(c, d, d, yb + h1 + h2 * 0.2, h2 * 0.55, w * 0.46);
  for (const k of [0.04, 0.93]) bandeau(c, yb + h1 + h2 * k, demiA(w * 0.9, w * 0.74, h2, h2 * k), demiA(w * 0.9, w * 0.74, h2, h2 * k), h2 * 0.03, 0.08, c.pierre);
  bandeau(c, yb + h1 + h2, w * 0.74, w * 0.74, h3, w * 0.3, c.pierre);
  const yP = yb + h1 + h2 + h3;
  const hb = (0.98 * hs - (yP - yb)) / 0.84; // la couronne affleure la hauteur du palier
  // Épaules et toge : un volume large, deux plis diagonaux sur la poitrine, une agrafe.
  ellipsoide(g, cx, yP + 0.15 * hb, cz, 0.3 * hb, 0.15 * hb, 0.17 * hb, c.or, c.mOr, 16, 10);
  for (const sg of [-1, 1]) {
    ellipsoide(g, cx + sg * 0.22 * hb, yP + 0.1 * hb, cz + 0.04 * hb, 0.11 * hb, 0.1 * hb, 0.15 * hb, c.orSombre, c.mOr, 10, 6);
    membre(g, [cx + sg * 0.26 * hb, yP + 0.2 * hb, cz + 0.11 * hb], [cx - sg * 0.02 * hb, yP + 0.05 * hb, cz + 0.17 * hb], 0.028 * hb, 0.02 * hb, c.orSombre, c.mOr, { seg: 6, seed });
  }
  disque(g, cx, yP + 0.17 * hb, cz + 0.175 * hb, 0.04 * hb, "+z", c.orClair, c.mOr);
  cylinder(g, cx, yP + 0.2 * hb, cz, 0.07 * hb, 0.2 * hb, 8, c.or, c.mOr, null, null);
  // Tête : crâne, chevelure bouclée, visage (nez, sourcils, menton), oreilles.
  const yT = yP + 0.56 * hb;
  ellipsoide(g, cx, yT, cz, 0.15 * hb, 0.2 * hb, 0.16 * hb, c.orClair, c.mOr, 16, 10);
  for (let k = 0; k < 10; k++) {
    const a = Math.PI * (0.15 + (k / 9) * 0.7);
    ellipsoide(g, cx + Math.cos(a + Math.PI) * 0.15 * hb, yT + 0.16 * hb, cz - Math.sin(a) * 0.1 * hb, 0.04 * hb, 0.04 * hb, 0.04 * hb, c.orSombre, c.mOr, 6, 4);
  }
  box(g, cx - 0.018 * hb, yT - 0.06 * hb, cz + 0.14 * hb, cx + 0.018 * hb, yT + 0.02 * hb, cz + 0.2 * hb, { c: c.orClair, m: c.mOr, seed });
  for (const sg of [-1, 1]) {
    box(g, cx + sg * 0.1 * hb - 0.045 * hb, yT + 0.04 * hb, cz + 0.145 * hb, cx + sg * 0.1 * hb + 0.045 * hb, yT + 0.055 * hb, cz + 0.17 * hb, { c: c.orSombre, m: c.mOr, seed });
    ellipsoide(g, cx + sg * 0.155 * hb, yT, cz, 0.02 * hb, 0.045 * hb, 0.03 * hb, c.orClair, c.mOr, 6, 4);
  }
  ellipsoide(g, cx, yP + 0.42 * hb, cz + 0.08 * hb, 0.06 * hb, 0.04 * hb, 0.05 * hb, c.orClair, c.mOr, 8, 5);
  // Couronne de lauriers : un anneau doré et douze feuilles inclinées.
  tore(g, [cx, yT + 0.1 * hb, cz], 0.162 * hb, 0.016 * hb, [0, 1, 0], c.or, c.mOr, { seg: 24, segTube: 5, seed });
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    ellipsoide(g, cx + Math.cos(a) * 0.17 * hb, yT + 0.11 * hb + (k % 2) * 0.012 * hb, cz + Math.sin(a) * 0.17 * hb, 0.035 * hb, 0.012 * hb, 0.02 * hb, c.orClair, c.mOr, 6, 4);
  }
};

/** Obélisque hélicoïdal : trois assises, un fût qui vrille d'un tour et quart en bandes alternées de bronze et d'or, pyramidion poli prolongeant la torsion, pointe. */
const obelisque: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const w = rb * 0.46;
  const h1 = hs * 0.04,
    h1b = hs * 0.025,
    h2 = hs * 0.08,
    hF = hs * 0.67,
    hP = hs * 0.11;
  box(g, cx - w, yb, cz - w, cx + w, yb + h1, cz + w, { c: c.pierre, m: MAT.PLAIN, seed });
  box(g, cx - w * 0.9, yb + h1, cz - w * 0.9, cx + w * 0.9, yb + h1 + h1b, cz + w * 0.9, { c: c.gres, m: MAT.PLAIN, seed });
  box(g, cx - w * 0.8, yb + h1 + h1b, cz - w * 0.8, cx + w * 0.8, yb + h1 + h1b + h2, cz + w * 0.8, { c: c.gres, m: MAT.PLAIN, seed });
  plaques4(c, w * 0.8, w * 0.8, yb + h1 + h1b + h2 * 0.16, h2 * 0.68, w * 0.4);
  const ys = yb + h1 + h1b + h2;
  const w0 = w * 0.62,
    w1 = w * 0.3;
  const torsion = Math.PI * 1.25;
  tourVrillee(g, cx, ys, cz, w0, w1, hF, torsion, 26, c.or, c.orSombre, c.mOr, { seed });
  tourVrillee(g, cx, ys + hF, cz, w1, 0, hP, 0, 1, c.orClair, c.orClair, c.mOr, { angle0: torsion, seed });
  tronc(g, cx, ys + hF + hP, cz, w1 * 0.1, 0, hs * 0.04, c.orClair, c.mOr, seed);
  // Quatre lions couchés de bronze aux angles de la première assise.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x = cx + sx * w * 0.92,
        z = cz + sz * w * 0.92;
      ellipsoide(g, x, yb + h1 + w * 0.08, z, w * 0.14, w * 0.09, w * 0.2, c.orSombre, c.mOr, 8, 5);
      ellipsoide(g, x + sx * w * 0.04, yb + h1 + w * 0.17, z + sz * w * 0.14, w * 0.07, w * 0.07, w * 0.07, c.orClair, c.mOr, 8, 5);
    }
};

// --------------------------------------------------------------------------
// Rang notable (paliers 5 à 9)
// --------------------------------------------------------------------------

/** Arc de triomphe miniature : piliers à colonnes et reliefs, massif percé d'une arche, archivolte dorée, attique à inscription, groupe sculpté (quadrige) au sommet. */
const arcTriomphe: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const Rs = Math.min(rb * 0.78, hs * 0.27),
    rIn = Rs * 0.52,
    prof = Rs * 0.85;
  const ySp = yb + hs * 0.32;
  for (const sg of [-1, 1]) {
    box(g, sg < 0 ? cx - Rs : cx + rIn, yb, cz - prof / 2, sg < 0 ? cx - rIn : cx + Rs, ySp, cz + prof / 2, { c: c.gres, m: MAT.PLAIN, seed });
    const xc = cx + sg * ((Rs + rIn) / 2);
    plaqueDe(c, "+z", xc, cz + prof / 2, yb + hs * 0.05, (ySp - yb) * 0.55, (Rs - rIn) * 0.3, 0);
    plaqueDe(c, "-z", xc, cz - prof / 2, yb + hs * 0.05, (ySp - yb) * 0.55, (Rs - rIn) * 0.3, 0);
    // Colonnes engagées aux angles du massif, de part et d'autre du relief.
    for (const sz of [-1, 1]) {
      const xk = sg < 0 ? cx - Rs + (Rs - rIn) * 0.1 : cx + Rs - (Rs - rIn) * 0.1;
      colonne(g, xk, yb, cz + sz * (prof / 2 + 0.2), (Rs - rIn) * 0.07, ySp - yb, c.pierre, MAT.PLAIN, seed, 10, c.orClair);
    }
  }
  arche(g, cx, ySp, cz, rIn, Rs, prof, c.gres, MAT.PLAIN, { carre: true, seed, seg: 16 });
  // Archivolte : un liseré d'or qui souligne l'ouverture sur les deux faces, et une clef de voûte.
  for (const sg of [-1, 1]) {
    arche(g, cx, ySp, cz + (sg * prof) / 2, rIn - 0.08, rIn + 0.4, 0.24, c.or, c.mOr, { seed, seg: 16 });
    boite(g, sg > 0 ? "+z" : "-z", cx - 0.35, cx + 0.35, ySp + rIn - 0.1, ySp + rIn + 0.75, cz + (sg * prof) / 2, 0.28, c.orClair, c.mOr, seed);
  }
  const yA = ySp + Rs;
  box(g, cx - Rs - 0.35, yA, cz - prof / 2 - 0.35, cx + Rs + 0.35, yA + hs * 0.03, cz + prof / 2 + 0.35, { c: c.pierre, m: MAT.PLAIN, seed });
  const yAt = yA + hs * 0.03;
  box(g, cx - Rs - 0.12, yAt, cz - prof / 2 - 0.12, cx + Rs + 0.12, yAt + hs * 0.12, cz + prof / 2 + 0.12, { c: c.gres, m: MAT.PLAIN, seed });
  plaqueDe(c, "+z", cx, cz + prof / 2 + 0.12, yAt + hs * 0.02, hs * 0.08, Rs * 0.58);
  plaqueDe(c, "-z", cx, cz - prof / 2 - 0.12, yAt + hs * 0.02, hs * 0.08, Rs * 0.58);
  // Frise de petits reliefs sur les flancs de l'attique.
  for (const sg of [-1, 1])
    for (let k = 0; k < 5; k++) {
      const zc = cz + (k - 2) * prof * 0.18;
      boite(g, sg > 0 ? "+x" : "-x", zc - 0.18, zc + 0.18, yAt + hs * 0.03, yAt + hs * 0.09, cx + sg * (Rs + 0.12), 0.1, c.orSombre, c.mOr, seed);
    }
  for (const f of ["+z", "-z"] as Face[]) {
    const s = f === "+z" ? 1 : -1;
    disque(g, cx, yAt + hs * 0.06, cz + s * (prof / 2 + 0.17), hs * 0.035, f, c.orClair, c.mOr, 16);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      boite(g, f, cx + Math.cos(a) * hs * 0.055 - 0.08, cx + Math.cos(a) * hs * 0.055 + 0.08, yAt + hs * 0.06 + Math.sin(a) * hs * 0.055 - 0.2, yAt + hs * 0.06 + Math.sin(a) * hs * 0.055 + 0.2, cz + s * (prof / 2 + 0.12), 0.06, c.orClair, c.mOr, seed);
    }
  }
  // Cannelures des piliers : quatre rainures verticales de chaque côté de l'arche.
  for (const sg of [-1, 1])
    for (const k of [0.3, 0.5, 0.7]) {
      const xr = cx + sg * (rIn + (Rs - rIn) * k);
      for (const f of ["+z", "-z"] as Face[]) boite(g, f, xr - 0.04, xr + 0.04, yb + hs * 0.12, ySp - hs * 0.04, cz + (f === "+z" ? 1 : -1) * (prof / 2 + 0.02), 0.05, c.orSombre, c.mOr, seed);
    }
  const yC = yAt + hs * 0.12;
  box(g, cx - Rs - 0.3, yC, cz - prof / 2 - 0.3, cx + Rs + 0.3, yC + hs * 0.03, cz + prof / 2 + 0.3, { c: c.pierre, m: MAT.PLAIN, seed });
  const yG = yC + hs * 0.03;
  box(g, cx - Rs * 0.55, yG, cz - prof * 0.32, cx + Rs * 0.55, yG + hs * 0.04, cz + prof * 0.32, { c: c.pierre, m: MAT.PLAIN, seed });
  // Quadrige : un char doré, quatre chevaux de front, une figure dressée au centre.
  const yQ = yG + hs * 0.04;
  box(g, cx - Rs * 0.14, yQ, cz - prof * 0.2, cx + Rs * 0.14, yQ + hs * 0.035, cz + prof * 0.2, { c: c.or, m: c.mOr, seed });
  for (const k of [-1.5, -0.5, 0.5, 1.5])
    ellipsoide(g, cx + k * Rs * 0.2, yQ + hs * 0.04, cz + prof * 0.18, Rs * 0.07, hs * 0.04, prof * 0.14, c.orSombre, c.mOr, 8, 5);
  tronc(g, cx, yQ + hs * 0.035, cz - prof * 0.05, Rs * 0.07, Rs * 0.03, hs * 0.08, c.or, c.mOr, seed);
  ellipsoide(g, cx, yQ + hs * 0.13, cz - prof * 0.05, hs * 0.02, hs * 0.02, hs * 0.02, c.orClair, c.mOr, 8, 5);
};

/** Horloge municipale : tour à pilastres et fenêtres éclairées la nuit, quatre cadrans, beffroi, toit doré à lucarnes et girouette. */
const horloge: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const w = rb * 0.36;
  const h1 = hs * 0.07,
    h2 = hs * 0.4,
    h3 = hs * 0.025,
    h4 = hs * 0.18,
    h5 = hs * 0.025,
    hBeff = hs * 0.08,
    h6 = hs * 0.08;
  box(g, cx - w * 1.4, yb, cz - w * 1.4, cx + w * 1.4, yb + h1, cz + w * 1.4, { c: c.pierre, m: MAT.PLAIN, seed });
  bandeau(c, yb + h1, w * 1.2, w * 1.2, hs * 0.015, 0.1, c.orSombre, c.mOr);
  const y1 = yb + h1;
  box(g, cx - w, y1, cz - w, cx + w, y1 + h2, cz + w, { c: c.gres, m: MAT.PLAIN, seed });
  // Pilastres d'angle, bandeaux, et trois étages de fenêtres éclairées.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      box(g, cx + sx * w - 0.14 * w, y1, cz + sz * w - 0.14 * w, cx + sx * w + 0.14 * w, y1 + h2, cz + sz * w + 0.14 * w, { c: c.pierre, m: MAT.PLAIN, seed });
  for (const k of [0.33, 0.66]) bandeau(c, y1 + h2 * k, w, w, hs * 0.012, 0.12, c.pierre);
  for (const f of ["+z", "-z", "+x", "-x"] as Face[]) {
    const centre = f[1] === "z" ? cx : cz;
    const plan = f[1] === "z" ? cz + (f[0] === "+" ? w : -w) : cx + (f[0] === "+" ? w : -w);
    for (const y of [0.1, 0.4, 0.72]) {
      boite(g, f, centre - 0.16 * w, centre + 0.16 * w, y1 + h2 * y, y1 + h2 * (y + 0.18), plan - 0.03, 0.12, LANTERNE, MAT.LAMP, seed);
      boite(g, f, centre - 0.2 * w, centre + 0.2 * w, y1 + h2 * (y + 0.18), y1 + h2 * (y + 0.2), plan - 0.03, 0.18, c.orSombre, c.mOr, seed);
    }
  }
  const y2 = y1 + h2;
  box(g, cx - w * 1.2, y2, cz - w * 1.2, cx + w * 1.2, y2 + h3, cz + w * 1.2, { c: c.pierre, m: MAT.PLAIN, seed });
  const y3 = y2 + h3;
  const wc = w * 1.1;
  box(g, cx - wc, y3, cz - wc, cx + wc, y3 + h4, cz + wc, { c: c.gres, m: MAT.PLAIN, seed });
  const yd = y3 + h4 / 2,
    r = Math.min(wc * 0.78, h4 * 0.42);
  for (const f of ["+z", "-z", "+x", "-x"] as Face[]) {
    const s = f[0] === "+" ? 1 : -1;
    const plan = (f[1] === "z" ? cz : cx) + s * wc;
    const centre = f[1] === "z" ? cx : cz;
    disque(g, f[1] === "z" ? cx : plan + s * 0.03, yd, f[1] === "z" ? plan + s * 0.03 : cz, r * 1.2, f, c.or, c.mOr, 28);
    disque(g, f[1] === "z" ? cx : plan + s * 0.06, yd, f[1] === "z" ? plan + s * 0.06 : cz, r, f, CADRAN, MAT.PLAIN, 28);
    // Douze repères sur le cadran.
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const dx = Math.sin(a) * r * 0.86,
        dy = Math.cos(a) * r * 0.86;
      const lg = k % 3 === 0 ? r * 0.14 : r * 0.07;
      const a0 = f[1] === "z" ? centre + (f[0] === "+" ? dx : -dx) : centre + (f[0] === "+" ? -dx : dx);
      boite(g, f, a0 - lg * 0.3, a0 + lg * 0.3, yd + dy - lg * 0.5, yd + dy + lg * 0.5, plan + s * 0.08, 0.04, PLAQUE_FOND, MAT.PLAIN, seed);
    }
    // Aiguilles : une grande vers le haut, une petite vers la droite de qui regarde la face : 3 h partout.
    const sensDroite = f[1] === "z" ? s : -s;
    const a0 = centre,
      a1 = centre + sensDroite * r * 0.55;
    boite(g, f, Math.min(a0, a1), Math.max(a0, a1), yd - r * 0.06, yd + r * 0.06, plan + s * 0.05, 0.1, PLAQUE_FOND, MAT.PLAIN, seed);
    boite(g, f, centre - r * 0.05, centre + r * 0.05, yd, yd + r * 0.8, plan + s * 0.05, 0.14, PLAQUE_FOND, MAT.PLAIN, seed);
  }
  const y4 = y3 + h4;
  box(g, cx - w * 1.2, y4, cz - w * 1.2, cx + w * 1.2, y4 + h5, cz + w * 1.2, { c: c.pierre, m: MAT.PLAIN, seed });
  // Beffroi : quatre piliers d'angle ouverts sur une cloche.
  const y5 = y4 + h5;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) box(g, cx + sx * w * 0.95 - w * 0.17, y5, cz + sz * w * 0.95 - w * 0.17, cx + sx * w * 0.95 + w * 0.17, y5 + hBeff, cz + sz * w * 0.95 + w * 0.17, { c: c.gres, m: MAT.PLAIN, seed });
  cylinder(g, cx, y5 + hBeff * 0.25, cz, w * 0.28, hBeff * 0.6, 10, c.or, c.mOr, null, null, w * 0.12);
  const y6 = y5 + hBeff;
  box(g, cx - w * 1.2, y6, cz - w * 1.2, cx + w * 1.2, y6 + h5, cz + w * 1.2, { c: c.pierre, m: MAT.PLAIN, seed });
  const yT = y6 + h5;
  tronc(g, cx, yT, cz, w * 1.2, 0, h6, c.or, c.mOr, seed);
  // Quatre lucarnes au pied du toit.
  for (const f of ["+z", "-z", "+x", "-x"] as Face[]) {
    const s = f[0] === "+" ? 1 : -1;
    const x = f[1] === "x" ? cx + s * w * 0.62 : cx,
      z = f[1] === "z" ? cz + s * w * 0.62 : cz;
    tronc(g, x, yT, z, w * 0.2, 0, h6 * 0.3, c.orClair, c.mOr, seed);
  }
  // Orrery au sommet : un soleil éclairé, deux anneaux inclinés et des planètes en orbite.
  const yO = yT + h6 + hs * 0.045,
    Ro = hs * 0.04;
  tronc(g, cx, yT + h6, cz, w * 0.06, w * 0.03, yO - (yT + h6), c.orSombre, c.mOr, seed);
  ellipsoide(g, cx, yO, cz, Ro * 0.3, Ro * 0.3, Ro * 0.3, LANTERNE, MAT.LAMP, 10, 7);
  tore(g, [cx, yO, cz], Ro, Ro * 0.045, [0, 1, 0], c.orSombre, c.mOr, { seg: 22, segTube: 4, seed });
  tore(g, [cx, yO, cz], Ro * 0.66, Ro * 0.04, [0.45, 1, 0.25], c.orClair, c.mOr, { seg: 20, segTube: 4, seed });
  ellipsoide(g, cx + Ro, yO, cz, Ro * 0.12, Ro * 0.12, Ro * 0.12, c.orClair, c.mOr, 8, 5);
  ellipsoide(g, cx - Ro * 0.5, yO, cz + Ro * 0.86, Ro * 0.09, Ro * 0.09, Ro * 0.09, c.or, c.mOr, 8, 5);
  ellipsoide(g, cx - Ro * 0.45, yO + Ro * 0.3, cz - Ro * 0.5, Ro * 0.1, Ro * 0.1, Ro * 0.1, c.orClair, c.mOr, 8, 5);
  tronc(g, cx, yO + Ro * 0.3, cz, w * 0.03, 0, yb + 0.98 * hs - (yO + Ro * 0.3), c.orClair, c.mOr, seed);
};

/** Fontaine monumentale : grand bassin à mufles de bronze, vasques étagées, quatre hippocampes crachant l'eau aux angles, et Neptune dressé au sommet, trident levé. */
const fontaineMonumentale: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const R = rb * 0.94,
    b = hs * 0.08;
  cylinder(g, cx, yb, cz, R, b, 20, c.pierre, MAT.PLAIN, MAT.PLAIN, c.gres);
  cylinder(g, cx, yb + b, cz, R, hs * 0.02, 20, c.gres, MAT.PLAIN, null, null, R * 0.97);
  cylinder(g, cx, yb + b, cz, R * 0.92, hs * 0.008, 20, EAU, MAT.WATER, MAT.WATER, EAU);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    ellipsoide(g, cx + Math.cos(a) * R * 0.985, yb + b * 0.55, cz + Math.sin(a) * R * 0.985, rb * 0.04, rb * 0.04, rb * 0.04, c.orSombre, c.mOr, 8, 5);
  }
  // Quatre hippocampes dans le bassin, sur les diagonales : croupe, buste cabré, crinière, queue en volute, jet d'eau.
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    const x = cx + sx * R * 0.55,
      z = cz + sz * R * 0.55;
    const yW = yb + b;
    const dir: V3 = [-sx * 0.7071, 0, -sz * 0.7071]; // il regarde le centre
    const at = (t: number, y: number, side = 0): V3 => [x + dir[0] * t - dir[2] * side, yW + y, z + dir[2] * t + dir[0] * side];
    const p = (v: V3) => v;
    ellipsoide(g, ...p(at(0, hs * 0.04)), rb * 0.1, hs * 0.035, rb * 0.075, c.or, c.mOr, 10, 6);
    ellipsoide(g, ...p(at(rb * 0.1, hs * 0.07)), rb * 0.085, hs * 0.05, rb * 0.07, c.or, c.mOr, 10, 6);
    ellipsoide(g, ...p(at(rb * 0.16, hs * 0.11)), rb * 0.065, hs * 0.05, rb * 0.055, c.orClair, c.mOr, 10, 6);
    ellipsoide(g, ...p(at(rb * 0.2, hs * 0.145)), rb * 0.075, hs * 0.03, rb * 0.04, c.orClair, c.mOr, 8, 5);
    for (const [t, y, r] of [
      [-rb * 0.12, hs * 0.045, 0.06],
      [-rb * 0.2, hs * 0.06, 0.05],
      [-rb * 0.25, hs * 0.085, 0.04],
      [-rb * 0.24, hs * 0.11, 0.03],
    ] as const)
      ellipsoide(g, ...p(at(t, y)), rb * r, rb * r, rb * r, c.orSombre, c.mOr, 8, 5);
    membre(g, at(rb * 0.2, hs * 0.14), at(rb * 0.34, hs * 0.2), 0.06, 0.03, EAU_CLAIRE, MAT.WATER, { seg: 5, seed });
    for (const side of [-1, 1]) membre(g, at(rb * 0.12, hs * 0.07, side * rb * 0.04), at(rb * 0.2, hs * 0.03, side * rb * 0.07), rb * 0.018, rb * 0.012, c.orSombre, c.mOr, { seg: 5, seed });
  }
  let y = yb + b;
  cylinder(g, cx, y, cz, rb * 0.2, hs * 0.2, 14, c.pierre, MAT.PLAIN, null, null, rb * 0.17);
  y += hs * 0.2;
  cylinder(g, cx, y, cz, rb * 0.17, hs * 0.07, 18, c.gres, MAT.PLAIN, MAT.WATER, EAU, rb * 0.64);
  y += hs * 0.07;
  cylinder(g, cx, y, cz, rb * 0.1, hs * 0.1, 12, c.orSombre, c.mOr, null, null);
  y += hs * 0.1;
  cylinder(g, cx, y, cz, rb * 0.1, hs * 0.05, 16, c.or, c.mOr, MAT.WATER, EAU, rb * 0.36);
  y += hs * 0.05;
  // Neptune : jambes, pagne, torse, bras levé avec le trident, tête barbue couronnée, jet d'eau à ses pieds.
  const hN = 0.96 * hs + yb - y;
  const u = hN / 1.14; // le trident monte à 1,12 u
  cylinder(g, cx, y, cz, rb * 0.08, u * 0.05, 10, c.pierre, MAT.PLAIN, null, null);
  const y0 = y + u * 0.05;
  for (const s of [-1, 1]) {
    membre(g, [cx + s * u * 0.06, y0, cz], [cx + s * u * 0.045, y0 + u * 0.3, cz], u * 0.05, u * 0.045, c.or, c.mOr, { seg: 7, seed });
  }
  tronc(g, cx, y0 + u * 0.28, cz, u * 0.1, u * 0.085, u * 0.08, c.orSombre, c.mOr, seed, u * 0.07, u * 0.06);
  tronc(g, cx, y0 + u * 0.36, cz, u * 0.085, u * 0.11, u * 0.26, c.or, c.mOr, seed, u * 0.055, u * 0.07);
  const yE = y0 + u * 0.62;
  ellipsoide(g, cx, yE + u * 0.02, cz, u * 0.1, u * 0.03, u * 0.06, c.or, c.mOr, 10, 6);
  ellipsoide(g, cx, yE + u * 0.11, cz, u * 0.055, u * 0.065, u * 0.055, c.orClair, c.mOr, 12, 8);
  ellipsoide(g, cx, yE + u * 0.06, cz + u * 0.04, u * 0.04, u * 0.05, u * 0.03, c.orSombre, c.mOr, 8, 5); // barbe
  tronc(g, cx, yE + u * 0.16, cz, u * 0.05, u * 0.02, u * 0.04, c.orClair, c.mOr, seed); // couronne
  // Bras droit levé tenant le trident (hampe et trois dents), bras gauche tendu.
  const hand: V3 = [cx + u * 0.15, yE + u * 0.18, cz];
  membre(g, [cx + u * 0.1, yE + u * 0.0, cz], [cx + u * 0.15, yE + u * 0.1, cz], u * 0.026, u * 0.022, c.or, c.mOr, { seg: 6, seed });
  membre(g, [cx + u * 0.15, yE + u * 0.1, cz], hand, u * 0.022, u * 0.02, c.or, c.mOr, { seg: 6, seed });
  membre(g, [hand[0], hand[1] - u * 0.1, hand[2]], [hand[0], hand[1] + u * 0.2, hand[2]], u * 0.012, u * 0.012, c.orSombre, c.mOr, { seg: 6, seed });
  for (const s of [-1, 0, 1]) tronc(g, hand[0] + s * u * 0.035, hand[1] + u * 0.2, hand[2], u * 0.008, 0, u * 0.07, c.orClair, c.mOr, seed);
  membre(g, [cx + u * 0.035, yE + u * 0.06, cz], [cx - u * 0.04, yE + u * 0.05, cz], u * 0.02, u * 0.02, c.or, c.mOr, { seg: 6, seed });
  membre(g, [cx - u * 0.1, yE + u * 0.0, cz], [cx - u * 0.19, yE + u * 0.06, cz + u * 0.05], u * 0.026, u * 0.02, c.or, c.mOr, { seg: 6, seed });
};

/** Statue équestre : haut piédestal à plaques et frise, cheval de bronze CABRÉ (jambes arrière plantées, avant-train dressé, pattes repliées, queue qui flotte) et cavalier penché au sabre levé. */
const statueEquestre: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const hx = rb * 0.56,
    hz = rb * 0.3;
  const h1 = hs * 0.05,
    h2 = hs * 0.24,
    h3 = hs * 0.03;
  box(g, cx - hx * 1.12, yb, cz - hz * 1.15, cx + hx * 1.12, yb + h1, cz + hz * 1.15, { c: c.pierre, m: MAT.PLAIN, seed });
  bandeau(c, yb + h1, hx * 0.98, hz * 0.98, hs * 0.012, 0.08, c.orSombre, c.mOr);
  tronc(g, cx, yb + h1, cz, hx, hx * 0.9, h2, c.gres, MAT.PLAIN, seed, hz, hz * 0.88);
  const dx = demiA(hx, hx * 0.9, h2, h2 * 0.2),
    dz = demiA(hz, hz * 0.88, h2, h2 * 0.2);
  plaques4(c, dx, dz, yb + h1 + h2 * 0.2, h2 * 0.5, hx * 0.5, hz * 0.55);
  bandeau(c, yb + h1 + h2 - hs * 0.012, hx * 0.9, hz * 0.88, hs * 0.012, 0.1, c.orSombre, c.mOr);
  box(g, cx - hx * 0.98, yb + h1 + h2, cz - hz * 0.94, cx + hx * 0.98, yb + h1 + h2 + h3, cz + hz * 0.94, { c: c.pierre, m: MAT.PLAIN, seed });
  const yP = yb + h1 + h2 + h3;
  const U = (0.98 * hs - (yP - yb)) / 1.12;
  const x0 = cx - 0.04 * U;
  const P = (x: number, y: number, z = 0): V3 => [x0 + x * U, yP + y * U, cz + z * U];
  const patte = (a: V3, b: V3, ra: number, rb2: number, col: Couleur = c.orSombre) => membre(g, a, b, ra * U, rb2 * U, col, c.mOr, { seg: 7, seed });
  // Jambes arrière plantées : sabot, paturon, jarret et cuisse.
  for (const sz of [-1, 1]) {
    box(g, x0 - 0.27 * U, yP, cz + sz * 0.065 * U - 0.045 * U, x0 - 0.17 * U, yP + 0.045 * U, cz + sz * 0.065 * U + 0.045 * U, { c: c.pierre, m: MAT.PLAIN, seed });
    patte(P(-0.22, 0.045, sz * 0.065), P(-0.2, 0.2, sz * 0.065), 0.025, 0.03);
    patte(P(-0.2, 0.2, sz * 0.065), P(-0.27, 0.3, sz * 0.07), 0.03, 0.045);
    patte(P(-0.27, 0.3, sz * 0.07), P(-0.22, 0.42, sz * 0.07), 0.045, 0.06);
  }
  // Corps cabré : croupe basse, ventre, poitrail haut ; encolure arquée et tête penchée.
  ellipsoide(g, ...P(-0.22, 0.43), 0.13 * U, 0.12 * U, 0.1 * U, c.or, c.mOr, 14, 9);
  ellipsoide(g, ...P(-0.07, 0.53), 0.15 * U, 0.115 * U, 0.1 * U, c.or, c.mOr, 14, 9);
  ellipsoide(g, ...P(0.08, 0.64), 0.13 * U, 0.12 * U, 0.1 * U, c.or, c.mOr, 14, 9);
  ellipsoide(g, ...P(0.17, 0.78), 0.07 * U, 0.12 * U, 0.06 * U, c.or, c.mOr, 12, 8);
  ellipsoide(g, ...P(0.23, 0.9), 0.06 * U, 0.09 * U, 0.055 * U, c.or, c.mOr, 12, 8);
  ellipsoide(g, ...P(0.3, 0.97), 0.07 * U, 0.05 * U, 0.045 * U, c.orClair, c.mOr, 12, 8);
  ellipsoide(g, ...P(0.37, 0.93), 0.065 * U, 0.032 * U, 0.032 * U, c.orClair, c.mOr, 10, 6);
  for (const sz of [-1, 1]) tronc(g, x0 + 0.29 * U, yP + 1.0 * U, cz + sz * 0.03 * U, 0.012 * U, 0, 0.05 * U, c.orClair, c.mOr, seed);
  // Crinière : six touffes le long de l'encolure.
  for (let k = 0; k < 6; k++) ellipsoide(g, ...P(0.1 + k * 0.035, 0.78 + k * 0.035, 0), 0.022 * U, 0.05 * U, 0.02 * U, c.orSombre, c.mOr, 6, 4);
  // Pattes avant repliées, l'une plus haute : épaule, genou, sabot.
  patte(P(0.1, 0.62, -0.07), P(0.27, 0.62, -0.07), 0.05, 0.035, c.or);
  patte(P(0.27, 0.62, -0.07), P(0.34, 0.5, -0.07), 0.035, 0.028);
  box(g, x0 + 0.32 * U, yP + 0.46 * U, cz - 0.07 * U - 0.035 * U, x0 + 0.4 * U, yP + 0.52 * U, cz - 0.07 * U + 0.035 * U, { c: c.pierre, m: MAT.PLAIN, seed });
  patte(P(0.1, 0.62, 0.07), P(0.24, 0.74, 0.07), 0.05, 0.035, c.or);
  patte(P(0.24, 0.74, 0.07), P(0.32, 0.64, 0.07), 0.035, 0.028);
  box(g, x0 + 0.3 * U, yP + 0.59 * U, cz + 0.07 * U - 0.035 * U, x0 + 0.38 * U, yP + 0.65 * U, cz + 0.07 * U + 0.035 * U, { c: c.pierre, m: MAT.PLAIN, seed });
  // Queue qui flotte en arrière, en cinq nœuds.
  for (const [x, y, r] of [
    [-0.3, 0.45, 0.032],
    [-0.34, 0.4, 0.03],
    [-0.37, 0.32, 0.028],
    [-0.38, 0.22, 0.025],
    [-0.36, 0.13, 0.022],
  ] as const)
    ellipsoide(g, ...P(x, y), r * U, r * 1.6 * U, r * U, c.orSombre, c.mOr, 8, 5);
  // Selle et cavalier penché en avant, sabre levé.
  box(g, x0 - 0.04 * U, yP + 0.6 * U, cz - 0.11 * U, x0 + 0.1 * U, yP + 0.63 * U, cz + 0.11 * U, { c: c.orClair, m: c.mOr, seed });
  ellipsoide(g, ...P(0.03, 0.74), 0.055 * U, 0.12 * U, 0.06 * U, c.orSombre, c.mOr, 12, 8);
  ellipsoide(g, ...P(0.08, 0.9), 0.045 * U, 0.05 * U, 0.045 * U, c.orClair, c.mOr, 12, 8);
  tronc(g, x0 + 0.08 * U, yP + 0.94 * U, cz, 0.01 * U, 0, 0.05 * U, c.orClair, c.mOr, seed);
  patte(P(0.06, 0.82, 0.05), P(0.12, 0.93, 0.05), 0.016, 0.013, c.orSombre);
  patte(P(0.12, 0.93, 0.05), P(0.17, 1.05, 0.05), 0.013, 0.011, c.or);
  patte(P(0.15, 1.0, 0.05), P(0.3, 1.12, 0.05), 0.008, 0.005, c.orClair); // le sabre
  patte(P(0.045, 0.72, -0.04), P(0.16, 0.7, -0.045), 0.016, 0.013, c.orSombre); // la main tenant les rênes
};

/** Mur des remerciements : un mur en S de grès couvert de plaquettes de bronze sur ses deux faces, couronné d'un ruban doré qui suit sa courbe, deux pylônes à braseros, une stèle centrale à médaillon, deux bancs dans les creux de l'onde. */
const murRemerciements: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const Lx = rb * 0.9;
  const ep = 0.8; // demi-épaisseur du mur
  const h1 = hs * 0.05,
    hw = hs * 0.32;
  const n = 13;
  const pas = (2 * (Lx - 0.9)) / n;
  const onde = (t: number) => rb * 0.17 * Math.sin(t * Math.PI * 2);
  const xk = (k: number) => cx - (Lx - 0.9) + (k + 0.5) * pas;
  const zk = (k: number) => cz + onde((k + 0.5) / n);
  // Semelle, puis le mur par tronçons qui suivent l'onde.
  for (let k = 0; k < n; k++) box(g, xk(k) - pas / 2 - 0.02, yb, zk(k) - ep - 0.3, xk(k) + pas / 2 + 0.02, yb + h1, zk(k) + ep + 0.3, { c: c.pierre, m: MAT.PLAIN, seed });
  const y1 = yb + h1;
  for (let k = 0; k < n; k++) {
    box(g, xk(k) - pas / 2, y1, zk(k) - ep, xk(k) + pas / 2, y1 + hw, zk(k) + ep, { c: c.gres, m: MAT.PLAIN, seed });
    box(g, xk(k) - pas / 2 - 0.02, y1 + hw, zk(k) - ep - 0.15, xk(k) + pas / 2 + 0.02, y1 + hw + hs * 0.035, zk(k) + ep + 0.15, { c: c.pierre, m: MAT.PLAIN, seed });
    // Plaquettes : cinq rangées de bronze sur chaque face, quelques-unes dorées.
    const rows = 5,
      ph = (hw * 0.7) / rows,
      yT = y1 + hw * 0.14;
    if (Math.abs(xk(k) - cx) < 1.5) continue; // derrière la stèle
    for (let j = 0; j < rows; j++) {
      const col = (k * 5 + j * 3) % 4 === 0 ? c.orClair : c.orSombre;
      panneau(g, "+z", xk(k) - pas * 0.4, xk(k) + pas * 0.4, yT + j * ph + ph * 0.1, yT + (j + 1) * ph - ph * 0.1, zk(k) + ep + 0.03, col, c.mOr, seed);
      panneau(g, "-z", xk(k) - pas * 0.4, xk(k) + pas * 0.4, yT + j * ph + ph * 0.1, yT + (j + 1) * ph - ph * 0.1, zk(k) - ep - 0.03, col, c.mOr, seed);
    }
  }
  // Ruban de bronze qui court sur le faîte en suivant la courbe.
  for (let k = 0; k < n - 1; k++) membre(g, [xk(k), y1 + hw + hs * 0.06, zk(k)], [xk(k + 1), y1 + hw + hs * 0.06, zk(k + 1)], 0.09, 0.09, c.or, c.mOr, { seg: 6, seed });
  // Pylônes d'extrémité à braseros, couronnés d'une corniche.
  for (const [k, sg] of [
    [0, -1],
    [n - 1, 1],
  ] as const) {
    const xc = xk(k) + sg * 0.3,
      zc = zk(k);
    const hp = hs * 0.52;
    box(g, xc - 0.65, y1, zc - ep - 0.1, xc + 0.65, y1 + hp, zc + ep + 0.1, { c: c.gres, m: MAT.PLAIN, seed });
    box(g, xc - 0.8, y1 + hp * 0.92, zc - ep - 0.22, xc + 0.8, y1 + hp * 0.92 + hs * 0.02, zc + ep + 0.22, { c: c.pierre, m: MAT.PLAIN, seed });
    tronc(g, xc, y1 + hp, zc, 0.78, 0.5, hs * 0.04, c.or, c.mOr, seed, 0.95, 0.65);
    flamme(g, xc, y1 + hp + hs * 0.04, zc, 0.36, hs * 0.08, FLAMME);
  }
  // Stèle centrale à médaillon, plus haute que le mur.
  const hSt = hs * 0.76;
  tronc(g, cx, y1, cz, 1.2, 0.98, hSt, c.gres, MAT.PLAIN, seed, ep * 0.9, ep * 0.76);
  const yCap = y1 + hSt;
  tronc(g, cx, yCap, cz, 1.1, 0.38, hs * 0.08, c.or, c.mOr, seed, ep * 0.8, 0.36);
  flamme(g, cx, yCap + hs * 0.08, cz, 0.4, hs * 0.06, FLAMME);
  const ym = y1 + hSt * 0.62,
    pz = demiA(ep * 0.9, ep * 0.76, hSt, hSt * 0.62);
  for (const f of ["+z", "-z"] as Face[]) {
    const s = f === "+z" ? 1 : -1;
    disque(g, cx, ym, cz + s * (pz + 0.03), 0.9, f, c.or, c.mOr, 24);
    disque(g, cx, ym, cz + s * (pz + 0.06), 0.66, f, PLAQUE_FOND, MAT.PLAIN, 24);
    disque(g, cx, ym, cz + s * (pz + 0.09), 0.38, f, c.orClair, c.mOr, 20);
  }
  plaqueDe(c, "+z", cx, cz + demiA(ep * 0.9, ep * 0.76, hSt, hSt * 0.1), y1 + hSt * 0.1, hs * 0.1, 0.8);
  plaqueDe(c, "-z", cx, cz - demiA(ep * 0.9, ep * 0.76, hSt, hSt * 0.1), y1 + hSt * 0.1, hs * 0.1, 0.8);
  // Deux bancs de pierre dans les creux de l'onde, du côté de la rue.
  for (const k of [2, 10]) {
    const creux = onde((k + 0.5) / n) < 0 ? 1 : -1;
    const bz = zk(k) + creux * (ep + 0.9);
    box(g, xk(k) - 1.1, yb, bz - 0.35, xk(k) + 1.1, yb + hs * 0.05, bz + 0.35, { c: c.pierre, m: MAT.PLAIN, seed });
    box(g, xk(k) - 1.15, yb + hs * 0.05, bz - 0.4, xk(k) + 1.15, yb + hs * 0.065, bz + 0.4, { c: c.or, m: c.mOr, seed });
  }
};

// --------------------------------------------------------------------------
// Rang prestigieux (paliers 10 à 15)
// --------------------------------------------------------------------------

/** Arche monumentale : deux pylônes d'or à aiguilles lumineuses, grand anneau en plein cintre doublé d'un cercle intérieur à rayons (une rosace), clé de voûte, soleil à seize rayons, guirlande d'ampoules sur l'arc, flèche centrale. */
const archeMonumentale: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const rIn = rb * 0.5,
    ep = rb * 0.43,
    prof = rb * 0.46;
  const rOut = rIn + ep;
  const hP = hs * 0.3,
    hS = hs * 0.03;
  box(g, cx - rOut - 0.35, yb, cz - prof / 2 - 0.3, cx + rOut + 0.35, yb + hS, cz + prof / 2 + 0.3, { c: c.pierre, m: MAT.PLAIN, seed });
  const y1 = yb + hS,
    ySp = yb + hP;
  for (const sg of [-1, 1]) {
    const xc = cx + sg * (rIn + ep / 2);
    box(g, sg < 0 ? cx - rOut : cx + rIn, y1, cz - prof / 2, sg < 0 ? cx - rIn : cx + rOut, ySp, cz + prof / 2, { c: c.or, m: c.mOr, seed });
    plaqueDe(c, "+z", xc, cz + prof / 2, y1 + hs * 0.04, (ySp - y1) * 0.55, ep * 0.32);
    plaqueDe(c, "-z", xc, cz - prof / 2, y1 + hs * 0.04, (ySp - y1) * 0.55, ep * 0.32);
    // Bandeaux et losanges de bronze sur le pylône.
    for (const k of [0.8, 0.9]) boite(g, "+z", xc - ep * 0.45, xc + ep * 0.45, y1 + (ySp - y1) * k, y1 + (ySp - y1) * k + hs * 0.012, cz + prof / 2, 0.14, c.orSombre, c.mOr, seed);
    for (const k of [0.15, 0.32, 0.48]) {
      for (const f of ["+z", "-z"] as Face[]) {
        const s = f === "+z" ? 1 : -1;
        disque(g, xc, y1 + (ySp - y1) * (k + 0.2) + hs * 0.05, cz + s * (prof / 2 + 0.05), ep * 0.1, f, c.orClair, c.mOr, 8);
      }
    }
    // Aiguille effilée sur chaque pylône, une boule éclairée à son pied et un fleuron au bout.
    tronc(g, xc, ySp, cz, ep * 0.42, ep * 0.12, hs * 0.3, c.orClair, c.mOr, seed);
    tronc(g, xc, ySp + hs * 0.3, cz, ep * 0.12, 0, hs * 0.07, c.orClair, c.mOr, seed);
    ellipsoide(g, xc, ySp + hs * 0.375, cz, ep * 0.1, ep * 0.1, ep * 0.1, LANTERNE, MAT.LAMP, 8, 6);
    // Contreforts en volute : deux jambes de force obliques de chaque côté du pylône.
    for (const f of [-1, 1]) membre(g, [xc + sg * ep * 0.5, y1, cz + f * prof * 0.5], [xc + sg * ep * 0.2, ySp * 0.82 + yb * 0.18, cz + f * prof * 0.5], ep * 0.09, ep * 0.05, c.orSombre, c.mOr, { seg: 6, seed });
  }
  arche(g, cx, ySp, cz, rIn, rOut, prof, c.or, c.mOr, { seed, seg: 24 });
  // Cercle intérieur à rayons : une rosace dans l'arc, avec douze rayons qui partent de la clé de voûte.
  const rC = rIn * 0.92;
  for (const s of [-1, 1]) {
    arche(g, cx, ySp, cz + s * (prof / 2 - 0.12), rC - 0.1, rC, 0.1, c.orClair, c.mOr, { seed, seg: 20 });
  }
  for (let k = 1; k < 12; k++) {
    const a = (k / 12) * Math.PI;
    membre(g, [cx, ySp + rC * 0.15, cz], [cx + Math.cos(a) * rC, ySp + Math.sin(a) * rC, cz], 0.07, 0.045, c.orSombre, c.mOr, { seg: 5, seed });
  }
  ellipsoide(g, cx, ySp + rC * 0.15, cz, 0.3, 0.3, 0.3, c.orClair, c.mOr, 8, 6);
  // Guirlande d'ampoules sur l'extrados de l'arc (elles s'allument la nuit).
  for (let k = 0; k <= 18; k++) {
    const a = (k / 18) * Math.PI;
    for (const s of [-1, 1]) ellipsoide(g, cx + Math.cos(a) * (rOut + 0.12), ySp + Math.sin(a) * (rOut + 0.12), cz + s * (prof / 2 + 0.1), 0.15, 0.15, 0.15, LANTERNE, MAT.LAMP, 6, 4);
  }
  box(g, cx - 0.45 * ep, ySp + rIn - 0.1, cz - prof / 2 - 0.14, cx + 0.45 * ep, ySp + rOut + 0.4, cz + prof / 2 + 0.14, { c: c.orClair, m: c.mOr, seed });
  const rs = rb * 0.34,
    yS = ySp + rOut + 0.4 + rs * 0.9;
  for (const f of ["+z", "-z"] as Face[]) {
    const s = f === "+z" ? 1 : -1;
    disque(g, cx, yS, cz + s * 0.22, rs, f, c.orClair, c.mOr, 28);
    disque(g, cx, yS, cz + s * 0.26, rs * 0.72, f, c.orSombre, c.mOr, 28);
    disque(g, cx, yS, cz + s * 0.3, rs * 0.4, f, c.orClair, c.mOr, 20);
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const x = cx + Math.cos(a) * rs * 1.18,
        y = yS + Math.sin(a) * rs * 1.18;
      boite(g, f, x - 0.1, x + 0.1, y - rs * 0.1, y + rs * 0.1, cz + s * 0.2, 0.06, c.orClair, c.mOr, seed);
    }
  }
  box(g, cx - 0.28, ySp + rOut + 0.35, cz - 0.22, cx + 0.28, yS, cz + 0.22, { c: c.orClair, m: c.mOr, seed });
  tronc(g, cx, yS + rs, cz, rs * 0.14, 0, yb + 0.98 * hs - (yS + rs), c.orClair, c.mOr, seed);
};

/** Tour d'observatoire : une tour qui vrille d'un tour et demi, dont l'arête est un cordon de lumière, une plate-forme à balustrade, une grande sphère armillaire de bronze braquée sur une lunette, et son axe polaire en guise de mât. */
const tourObservatoire: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const hSo = hs * 0.03,
    hF = hs * 0.66;
  cylinder(g, cx, yb, cz, rb * 0.72, hSo, 14, c.pierre, MAT.PLAIN, MAT.PAVING, COL.paving);
  const y1 = yb + hSo;
  const w0 = rb * 0.34,
    w1 = rb * 0.22;
  const torsion = Math.PI * 3;
  const fut = mixer(c.gres, c.or, 0.4);
  tourVrillee(g, cx, y1, cz, w0, w1, hF, torsion, 36, fut, c.or, MAT.PLAIN, { seed });
  // Un cordon de fenêtres éclairées le long d'une arête, qui suit la torsion : une lumière par tranche.
  for (let i = 0; i < 36; i++) {
    const t = (i + 0.5) / 36;
    const a = torsion * t + Math.PI / 4;
    const w = (w0 + (w1 - w0) * t) * Math.SQRT2;
    const x = cx + Math.cos(a) * w,
      z = cz + Math.sin(a) * w;
    const y = y1 + hF * t;
    box(g, x - 0.17, y - 0.28, z - 0.17, x + 0.17, y + 0.28, z + 0.17, { c: LANTERNE, m: MAT.LAMP, seed });
  }
  // Anneaux de bronze à trois hauteurs.
  for (const k of [0.25, 0.5, 0.75]) tore(g, [cx, y1 + hF * k, cz], (w0 + (w1 - w0) * k) * 1.55, 0.14, [0, 1, 0], c.or, c.mOr, { seg: 20, segTube: 5, seed });
  // Plate-forme et garde-corps.
  const y2 = y1 + hF;
  cylinder(g, cx, y2, cz, rb * 0.62, hs * 0.018, 16, c.pierre, MAT.PLAIN, MAT.PAVING, COL.paving);
  const y3 = y2 + hs * 0.018;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    box(g, cx + Math.cos(a) * rb * 0.6 - 0.07, y3, cz + Math.sin(a) * rb * 0.6 - 0.07, cx + Math.cos(a) * rb * 0.6 + 0.07, y3 + hs * 0.028, cz + Math.sin(a) * rb * 0.6 + 0.07, { c: c.orSombre, m: c.mOr, seed });
  }
  tore(g, [cx, y3 + hs * 0.028, cz], rb * 0.6, 0.06, [0, 1, 0], c.orSombre, c.mOr, { seg: 24, segTube: 4, seed });
  // Sphère armillaire : équateur, deux méridiens, écliptique ; un globe doré au centre ; sa lunette.
  const Rs = hs * 0.085,
    yS = y3 + hs * 0.028 + Rs * 1.2;
  const r = Rs * 0.05;
  ellipsoide(g, cx, yS, cz, Rs * 0.3, Rs * 0.3, Rs * 0.3, c.orClair, c.mOr, 14, 9);
  tore(g, [cx, yS, cz], Rs, r, [0, 1, 0], c.or, c.mOr, { seed });
  tore(g, [cx, yS, cz], Rs * 0.99, r, [1, 0, 0], c.or, c.mOr, { seed });
  tore(g, [cx, yS, cz], Rs * 0.99, r, [Math.cos(0.8), 0, Math.sin(0.8)], c.orSombre, c.mOr, { seed });
  const tilt = 0.41;
  tore(g, [cx, yS, cz], Rs * 1.04, r * 1.3, [Math.sin(tilt), Math.cos(tilt), 0], c.orClair, c.mOr, { seed });
  const pol: V3 = [Math.sin(tilt) * Rs * 1.45, Math.cos(tilt) * Rs * 1.45, 0];
  membre(g, [cx - pol[0], yS - pol[1], cz], [cx + pol[0], yS + pol[1], cz], r * 1.2, r * 1.2, c.orSombre, c.mOr, { seed });
  ellipsoide(g, cx + pol[0], yS + pol[1], cz, r * 2.6, r * 2.6, r * 2.6, c.orClair, c.mOr, 8, 6);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    membre(g, [cx + Math.cos(a) * rb * 0.3, y3 + hs * 0.028, cz + Math.sin(a) * rb * 0.3], [cx + Math.cos(a) * Rs * 0.9, yS - Rs * 0.4, cz + Math.sin(a) * Rs * 0.9], r * 1.3, r, c.orSombre, c.mOr, { seg: 6, seed });
  }
  // Lunette : un long tube conique qui sort de la sphère, objectif au bout.
  membre(g, [cx - Rs * 0.2, yS - Rs * 0.1, cz - Rs * 0.1], [cx + Rs * 1.2, yS + Rs * 0.38, cz + Rs * 0.75], Rs * 0.1, Rs * 0.16, c.orSombre, c.mOr, { seg: 8, seed });
  membre(g, [cx + Rs * 1.2, yS + Rs * 0.38, cz + Rs * 0.75], [cx + Rs * 1.3, yS + Rs * 0.42, cz + Rs * 0.82], Rs * 0.18, Rs * 0.18, c.orClair, c.mOr, { seg: 8, calotteB: true, seed });
};

/** Statue emblématique : haut piédestal de marbre à plaques et contreforts, figure drapée de bronze (plis de la robe, manteau, sandales et chaîne brisée), diadème de sept rayons, bras levé tenant une torche à balcon, tablette contre la hanche. */
const statueEmblematique: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const w = rb * 0.62;
  const h1 = hs * 0.045,
    h2 = hs * 0.03,
    h3 = hs * 0.24,
    h4 = hs * 0.035;
  box(g, cx - w, yb, cz - w, cx + w, yb + h1, cz + w, { c: c.pierre, m: MAT.PLAIN, seed });
  bandeau(c, yb + h1 - hs * 0.01, w * 0.9, w * 0.9, hs * 0.01, 0.1, c.orSombre, c.mOr);
  box(g, cx - w * 0.9, yb + h1, cz - w * 0.9, cx + w * 0.9, yb + h1 + h2, cz + w * 0.9, { c: c.pierre, m: MAT.PLAIN, seed });
  tronc(g, cx, yb + h1 + h2, cz, w * 0.78, w * 0.64, h3, c.gres, MAT.PLAIN, seed);
  const d = demiA(w * 0.78, w * 0.64, h3, h3 * 0.2);
  plaques4(c, d, d, yb + h1 + h2 + h3 * 0.18, h3 * 0.3, w * 0.5);
  plaques4(c, demiA(w * 0.78, w * 0.64, h3, h3 * 0.58), demiA(w * 0.78, w * 0.64, h3, h3 * 0.58), yb + h1 + h2 + h3 * 0.58, h3 * 0.3, w * 0.5);
  bandeau(c, yb + h1 + h2 + h3, w * 0.64, w * 0.64, h4, w * 0.12, c.pierre);
  // Quatre contreforts d'angle sur le soubassement.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      tronc(g, cx + sx * w * 0.8, yb + h1, cz + sz * w * 0.8, w * 0.1, w * 0.05, h2 + h3 * 0.35, c.gres, MAT.PLAIN, seed);
    }
  const yP = yb + h1 + h2 + h3 + h4;
  const H = (yb + 0.98 * hs - yP) / 1.1; // la flamme de la torche monte à 1,1 H
  const P = (x: number, y: number, z = 0): V3 => [cx + x * H, yP + y * H, cz + z * H];
  const m = (a: V3, b: V3, ra: number, rb2: number, col: Couleur = c.or) => membre(g, a, b, ra * H, rb2 * H, col, c.mOr, { seg: 8, seed });
  // Sandales et chaîne brisée sous les pieds.
  for (const s of [-1, 1]) box(g, cx + s * 0.06 * H - 0.055 * H, yP, cz - 0.04 * H, cx + s * 0.06 * H + 0.055 * H, yP + 0.03 * H, cz + 0.14 * H, { c: c.orSombre, m: c.mOr, seed });
  tore(g, [cx, yP + 0.012 * H, cz + 0.05 * H], 0.1 * H, 0.009 * H, [0, 1, 0], c.orClair, c.mOr, { seg: 16, segTube: 4, seed });
  tore(g, [cx + 0.1 * H, yP + 0.012 * H, cz + 0.07 * H], 0.025 * H, 0.008 * H, [0.3, 1, 0], c.orClair, c.mOr, { seg: 10, segTube: 4, seed });
  // Manteau flottant derrière la figure, puis la robe : un cône évasé strié de plis.
  ellipsoide(g, ...P(0, 0.3, -0.085), 0.1 * H, 0.3 * H, 0.03 * H, c.orSombre, c.mOr, 10, 8);
  ellipsoide(g, ...P(0.07, 0.5, -0.08), 0.05 * H, 0.18 * H, 0.025 * H, c.orSombre, c.mOr, 8, 6);
  cylinder(g, cx, yP + 0.03 * H, cz, H * 0.115, H * 0.41, 16, c.or, c.mOr, null, null, H * 0.07);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + 0.1;
    const f = k % 2 ? 0.9 : 1;
    m(P(Math.cos(a) * 0.075 * f, 0.43, Math.sin(a) * 0.075 * f), P(Math.cos(a) * 0.122 * f, 0.03, Math.sin(a) * 0.122 * f), 0.011, 0.009, c.orSombre);
  }
  cylinder(g, cx, yP + 0.44 * H, cz, H * 0.07, H * 0.19, 14, c.or, c.mOr, null, null, H * 0.085);
  ellipsoide(g, ...P(0, 0.645), 0.1 * H, 0.035 * H, 0.06 * H, c.or, c.mOr, 14, 8);
  cylinder(g, cx, yP + 0.65 * H, cz, H * 0.022, H * 0.05, 10, c.or, c.mOr, null, null);
  // Tête : visage, nez, diadème de sept rayons en éventail.
  ellipsoide(g, ...P(0, 0.725), 0.045 * H, 0.058 * H, 0.045 * H, c.orClair, c.mOr, 14, 10);
  box(g, cx - 0.006 * H, yP + 0.715 * H, cz + 0.042 * H, cx + 0.006 * H, yP + 0.735 * H, cz + 0.058 * H, { c: c.orClair, m: c.mOr, seed });
  for (let k = 0; k < 7; k++) {
    const phi = (k - 3) * 0.42;
    const base: V3 = P(Math.sin(phi) * 0.04, 0.765 + Math.cos(phi) * 0.02);
    membre(g, base, [base[0] + Math.sin(phi) * 0.09 * H, base[1] + Math.cos(phi) * 0.09 * H, base[2]], 0.009 * H, 0.002 * H, c.orClair, c.mOr, { seg: 5, seed });
  }
  // Bras droit levé : épaule, coude, main, hampe, balcon de la torche (un anneau), coupe et flamme.
  m(P(0.075, 0.61), P(0.13, 0.72, 0.025), 0.03, 0.024);
  m(P(0.13, 0.72, 0.025), P(0.115, 0.88), 0.024, 0.019);
  ellipsoide(g, ...P(0.115, 0.895), 0.022 * H, 0.025 * H, 0.022 * H, c.orClair, c.mOr, 8, 6);
  m(P(0.115, 0.89), P(0.115, 0.97), 0.014, 0.012, c.orSombre);
  tore(g, P(0.115, 0.955), 0.034 * H, 0.006 * H, [0, 1, 0], c.orClair, c.mOr, { seg: 14, segTube: 4, seed });
  tronc(g, cx + 0.115 * H, yP + 0.96 * H, cz, 0.02 * H, 0.04 * H, 0.03 * H, c.orClair, c.mOr, seed);
  flamme(g, cx + 0.115 * H, yP + 0.99 * H, cz, 0.04 * H, 0.11 * H, FLAMME);
  // Bras gauche plié contre la hanche, portant une tablette (un cadre doré et une dalle sombre).
  m(P(-0.075, 0.61), P(-0.11, 0.5, 0.03), 0.028, 0.023);
  m(P(-0.11, 0.5, 0.03), P(-0.09, 0.53, 0.08), 0.023, 0.02);
  box(g, cx - 0.145 * H, yP + 0.47 * H, cz + 0.03 * H, cx - 0.085 * H, yP + 0.58 * H, cz + 0.05 * H, { c: c.orClair, m: c.mOr, seed });
  box(g, cx - 0.135 * H, yP + 0.485 * H, cz + 0.05 * H, cx - 0.095 * H, yP + 0.565 * H, cz + 0.055 * H, { c: PLAQUE_FOND, m: MAT.PLAIN, seed });
  for (const y of [0.52, 0.54, 0.56]) box(g, cx - 0.13 * H, yP + (y - 0.004) * H, cz + 0.055 * H, cx - 0.1 * H, yP + (y + 0.004) * H, cz + 0.058 * H, { c: c.orClair, m: c.mOr, seed });
};

/** Temple national : stylobate à marches, colonnade, cella à porte dorée, entablement à frise, deux frontons à médaillon, dôme et lanterne éclairée la nuit. */
const temple: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  // Un carré dont le coin (entablement compris) reste dans le cercle du socle.
  const W = rb * 0.78,
    D = rb * 0.78;
  const yS = marchesCarrees(g, cx, yb, cz, W + 0.5, D + 0.5, 3, hs * 0.016, c.pierre, 0.24, seed);
  const Hc = hs * 0.32;
  box(g, cx - (W - 0.55), yS, cz - (D - 0.4), cx + (W - 0.55), yS + Hc, cz + (D - 0.4), { c: c.gres, m: MAT.PLAIN, seed });
  for (const f of ["+z", "-z"] as Face[]) {
    const s = f === "+z" ? 1 : -1;
    boite(g, f, cx - 0.95, cx + 0.95, yS, yS + hs * 0.17, cz + s * (D - 0.4), 0.14, c.or, c.mOr, seed);
    boite(g, f, cx - 0.75, cx + 0.75, yS, yS + hs * 0.15, cz + s * (D - 0.4) + s * 0.1, 0.14, PLAQUE_FOND, MAT.PLAIN, seed);
  }
  const rc = rb * 0.065;
  for (const sz of [-1, 1]) for (let k = 0; k < 6; k++) colonne(g, cx - W + (2 * W * k) / 5, yS, cz + sz * D, rc, Hc, c.pierre, MAT.PLAIN, seed, 12, c.gres);
  for (const sx of [-1, 1]) for (const k of [1, 2, 3, 4]) colonne(g, cx + sx * W, yS, cz - D + (2 * D * k) / 5, rc, Hc, c.pierre, MAT.PLAIN, seed, 12, c.gres);
  const yE = yS + Hc;
  box(g, cx - W - 0.45, yE, cz - D - 0.45, cx + W + 0.45, yE + hs * 0.05, cz + D + 0.45, { c: c.gres, m: MAT.PLAIN, seed });
  // Frise : une rangée de triglyphes dorés sur les quatre faces de l'entablement.
  for (let k = 0; k < 14; k++) {
    const x = cx - W + (2 * W * (k + 0.5)) / 14;
    boite(g, "+z", x - 0.16, x + 0.16, yE + hs * 0.008, yE + hs * 0.042, cz + D + 0.45, 0.07, c.orSombre, c.mOr, seed);
    boite(g, "-z", x - 0.16, x + 0.16, yE + hs * 0.008, yE + hs * 0.042, cz - D - 0.45, 0.07, c.orSombre, c.mOr, seed);
  }
  for (let k = 0; k < 14; k++) {
    const z = cz - D + (2 * D * (k + 0.5)) / 14;
    boite(g, "+x", z - 0.16, z + 0.16, yE + hs * 0.008, yE + hs * 0.042, cx + W + 0.45, 0.07, c.orSombre, c.mOr, seed);
    boite(g, "-x", z - 0.16, z + 0.16, yE + hs * 0.008, yE + hs * 0.042, cx - W - 0.45, 0.07, c.orSombre, c.mOr, seed);
  }
  box(g, cx - W - 0.5, yE + hs * 0.045, cz - D - 0.5, cx + W + 0.5, yE + hs * 0.055 + 0.1, cz + D + 0.5, { c: c.or, m: c.mOr, seed });
  const yT = yE + hs * 0.055;
  const pitch = 0.3;
  const yR = gableRoof(g, cx - W - 0.45, cz + 0.28 * D, cx + W + 0.45, cz + D + 0.45, yT, pitch, 0.12, false, c.or, MARBRE, seed);
  gableRoof(g, cx - W - 0.45, cz - D - 0.45, cx + W + 0.45, cz - 0.28 * D, yT, pitch, 0.12, false, c.or, MARBRE, seed);
  const rise = yR - yT;
  disque(g, cx, yT + rise * 0.4, cz + D + 0.5, rise * 0.34, "+z", c.orClair, c.mOr, 24);
  disque(g, cx, yT + rise * 0.4, cz - D - 0.5, rise * 0.34, "-z", c.orClair, c.mOr, 24);
  // Acrotères : un fleuron au sommet de chaque fronton et à ses angles.
  for (const sz of [-1, 1]) {
    ellipsoide(g, cx, yR + 0.2, cz + sz * (D + 0.2), 0.32, 0.4, 0.32, c.orClair, c.mOr, 8, 6);
    for (const sx of [-1, 1]) ellipsoide(g, cx + sx * (W + 0.3), yT + 0.2, cz + sz * (D + 0.3), 0.26, 0.32, 0.26, c.orClair, c.mOr, 8, 6);
  }
  const rD = W - 0.5;
  cylinder(g, cx, yT, cz, rD, hs * 0.09, 18, c.gres, MAT.PLAIN, MAT.PLAIN, c.gres);
  // Tambour : douze petites fenêtres éclairées autour.
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const x = cx + Math.cos(a) * (rD + 0.02),
      z = cz + Math.sin(a) * (rD + 0.02);
    box(g, x - 0.17, yT + hs * 0.02, z - 0.17, x + 0.17, yT + hs * 0.07, z + 0.17, { c: LANTERNE, m: MAT.LAMP, seed });
  }
  ellipsoide(g, cx, yT + hs * 0.09, cz, rD * 1.04, hs * 0.16, rD * 1.04, c.or, c.mOr, 22, 11);
  // Seize nervures dorées, du pied du dôme à sa lanterne.
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    let prev: V3 = [cx + Math.cos(a) * rD * 1.045, yT + hs * 0.09, cz + Math.sin(a) * rD * 1.045];
    for (let j = 1; j <= 6; j++) {
      const t = (j / 6) * (Math.PI / 2) * 0.96;
      const next: V3 = [cx + Math.cos(a) * rD * 1.045 * Math.cos(t), yT + hs * 0.09 + hs * 0.165 * Math.sin(t), cz + Math.sin(a) * rD * 1.045 * Math.cos(t)];
      membre(g, prev, next, 0.07, 0.07, c.orClair, c.mOr, { seg: 4, seed });
      prev = next;
    }
  }
  const yL = yT + hs * 0.09 + hs * 0.155;
  cylinder(g, cx, yL - 0.1, cz, rD * 0.2, hs * 0.05, 10, c.orSombre, c.mOr, null, null, rD * 0.16);
  box(g, cx - 0.4, yL + hs * 0.04, cz - 0.4, cx + 0.4, yL + hs * 0.085, cz + 0.4, { c: LANTERNE, m: MAT.LAMP, seed });
  tronc(g, cx, yL + hs * 0.085, cz, 0.5, 0.05, yb + 0.98 * hs - (yL + hs * 0.085), c.orClair, c.mOr, seed);
};

/** Statue géante : un colosse qui enjambe un passage, les pieds sur deux socles, jambes en arche, pagne à plis, torse en V, tête couronnée sur son disque solaire, un bras brandissant la flamme, l'autre portant un globe gravé. */
const statueGeante: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const F = 0.98 * hs; // hauteur de la flamme au-dessus de la dernière marche
  const Y = (f: number) => yb + F * f;
  const sx = rb * 0.62; // écartement des pieds
  const hSocle = F * 0.05;
  // Deux socles de pierre à plaques de part et d'autre du passage.
  for (const sg of [-1, 1]) {
    const xc = cx + sg * sx;
    box(g, xc - rb * 0.36, yb, cz - rb * 0.46, xc + rb * 0.36, yb + hSocle, cz + rb * 0.46, { c: c.pierre, m: MAT.PLAIN, seed });
    plaqueDe(c, "+z", xc, cz + rb * 0.46, yb + hSocle * 0.2, hSocle * 0.6, rb * 0.22);
    plaqueDe(c, sg > 0 ? "+x" : "-x", cz, xc + sg * rb * 0.36, yb + hSocle * 0.2, hSocle * 0.6, rb * 0.25);
  }
  const yPied = yb + hSocle;
  // Jambes massives : botte, mollet, genou, cuisse, jusqu'aux hanches (le passage se voit entre elles).
  for (const sg of [-1, 1]) {
    const X = (x: number) => cx + sg * x;
    box(g, X(sx) - rb * 0.3, yPied, cz - rb * 0.3, X(sx) + rb * 0.3, yPied + F * 0.045, cz + rb * 0.42, { c: c.orSombre, m: c.mOr, seed });
    membre(g, [X(sx), yPied + F * 0.04, cz + rb * 0.05], [X(sx * 0.92), Y(0.25), cz + rb * 0.1], rb * 0.27, rb * 0.25, c.or, c.mOr, { seg: 10, seed });
    ellipsoide(g, X(sx * 0.92), Y(0.25), cz + rb * 0.12, rb * 0.27, rb * 0.22, rb * 0.27, c.orClair, c.mOr, 12, 8);
    membre(g, [X(sx * 0.92), Y(0.25), cz + rb * 0.1], [X(sx * 0.45), Y(0.43), cz], rb * 0.25, rb * 0.36, c.or, c.mOr, { seg: 10, seed });
    // Jambière à bandes dorées sur le mollet.
    for (const k of [0.09, 0.14, 0.19]) tore(g, [X(sx * 0.96), Y(k), cz + rb * 0.07], rb * 0.27, rb * 0.03, [0, 1, 0.05], c.orClair, c.mOr, { seg: 14, segTube: 4, seed });
  }
  // Pagne à plis, ceinture à médaillon, torse en V.
  tronc(g, cx, Y(0.41), cz, rb * 0.78, rb * 0.62, F * 0.07, c.orSombre, c.mOr, seed, rb * 0.42, rb * 0.36);
  for (let k = -4; k <= 4; k++) tronc(g, cx + k * rb * 0.16, Y(0.41), cz + rb * 0.4, rb * 0.025, rb * 0.014, F * 0.068, c.orClair, c.mOr, seed, rb * 0.02, rb * 0.012);
  box(g, cx - rb * 0.64, Y(0.48), cz - rb * 0.37, cx + rb * 0.64, Y(0.505), cz + rb * 0.37, { c: c.orClair, m: c.mOr, seed });
  disque(g, cx, Y(0.492), cz + rb * 0.38, rb * 0.13, "+z", c.orSombre, c.mOr, 16);
  // Torse sculpté : abdomen, cage thoracique et pectoraux plutôt qu'un bloc.
  ellipsoide(g, cx, Y(0.545), cz, rb * 0.56, F * 0.06, rb * 0.34, c.or, c.mOr, 14, 8);
  ellipsoide(g, cx, Y(0.625), cz, rb * 0.82, F * 0.09, rb * 0.42, c.or, c.mOr, 16, 10);
  for (const sg of [-1, 1]) {
    ellipsoide(g, cx + sg * rb * 0.34, Y(0.655), cz + rb * 0.22, rb * 0.32, F * 0.045, rb * 0.24, c.orClair, c.mOr, 10, 6);
    membre(g, [cx + sg * rb * 0.08, Y(0.5), cz + rb * 0.3], [cx + sg * rb * 0.02, Y(0.6), cz + rb * 0.4], rb * 0.03, rb * 0.02, c.orSombre, c.mOr, { seg: 5, seed });
  }
  disque(g, cx, Y(0.61), cz + rb * 0.43, rb * 0.12, "+z", c.orClair, c.mOr, 20);
  // Épaules, cou, tête, couronne de rayons, disque solaire dans le dos.
  for (const sg of [-1, 1]) ellipsoide(g, cx + sg * rb * 0.84, Y(0.725), cz, rb * 0.26, rb * 0.2, rb * 0.3, c.orSombre, c.mOr, 10, 7);
  cylinder(g, cx, Y(0.725), cz, rb * 0.2, F * 0.035, 10, c.or, c.mOr, null, null);
  const yT = Y(0.79);
  ellipsoide(g, cx, yT, cz, rb * 0.3, rb * 0.36, rb * 0.3, c.orClair, c.mOr, 16, 10);
  box(g, cx - rb * 0.035, yT - rb * 0.08, cz + rb * 0.29, cx + rb * 0.035, yT + rb * 0.06, cz + rb * 0.38, { c: c.orClair, m: c.mOr, seed });
  couronne(c, cx, yT + rb * 0.33, cz, rb * 0.1, F * 0.06, 7);
  const zH = cz - rb * 0.42;
  for (const f of ["+z", "-z"] as Face[]) {
    const s = f === "+z" ? 1 : -1;
    disque(g, cx, yT, zH + s * 0.04, rb * 0.62, f, c.orClair, c.mOr, 28);
    disque(g, cx, yT, zH + s * 0.08, rb * 0.5, f, c.orSombre, c.mOr, 28);
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      boite(g, f, cx + Math.cos(a) * rb * 0.74 - 0.16, cx + Math.cos(a) * rb * 0.74 + 0.16, yT + Math.sin(a) * rb * 0.74 - 0.4, yT + Math.sin(a) * rb * 0.74 + 0.4, zH + s * 0.03, 0.12, c.orClair, c.mOr, seed);
    }
  }
  // Bras droit levé avec la torche (épaule, coude, main, hampe, coupe, flamme) ; bras gauche portant un globe.
  const R_ = (x: number, y: number, z = 0): V3 => [cx + x, Y(y), cz + z];
  membre(g, R_(rb * 0.86, 0.72), R_(rb * 0.98, 0.78, rb * 0.15), rb * 0.2, rb * 0.17, c.or, c.mOr, { seg: 9, seed });
  membre(g, R_(rb * 0.98, 0.78, rb * 0.15), R_(rb * 0.88, 0.88), rb * 0.17, rb * 0.14, c.or, c.mOr, { seg: 9, seed });
  ellipsoide(g, ...R_(rb * 0.88, 0.9), rb * 0.16, rb * 0.16, rb * 0.16, c.orClair, c.mOr, 8, 6);
  membre(g, R_(rb * 0.88, 0.9), R_(rb * 0.88, 0.955), rb * 0.08, rb * 0.08, c.orSombre, c.mOr, { seg: 6, seed });
  tore(g, [cx + rb * 0.88, Y(0.945), cz], rb * 0.2, rb * 0.03, [0, 1, 0], c.orClair, c.mOr, { seg: 14, segTube: 4, seed });
  tronc(g, cx + rb * 0.88, Y(0.955), cz, rb * 0.1, rb * 0.22, F * 0.02, c.orClair, c.mOr, seed);
  flamme(g, cx + rb * 0.88, Y(0.975), cz, rb * 0.2, F * 0.04, FLAMME);
  membre(g, R_(-rb * 0.86, 0.72), R_(-rb * 0.97, 0.75, rb * 0.25), rb * 0.2, rb * 0.17, c.or, c.mOr, { seg: 9, seed });
  membre(g, R_(-rb * 0.97, 0.75, rb * 0.25), R_(-rb * 0.72, 0.79, rb * 0.45), rb * 0.17, rb * 0.14, c.or, c.mOr, { seg: 9, seed });
  ellipsoide(g, ...R_(-rb * 0.68, 0.85, rb * 0.45), rb * 0.27, rb * 0.27, rb * 0.27, c.orClair, c.mOr, 14, 10);
  tore(g, [cx - rb * 0.68, Y(0.85), cz + rb * 0.45], rb * 0.275, rb * 0.02, [0, 1, 0], c.orSombre, c.mOr, { seg: 20, segTube: 4, seed });
  tore(g, [cx - rb * 0.68, Y(0.85), cz + rb * 0.45], rb * 0.275, rb * 0.02, [1, 0, 0.4], c.orSombre, c.mOr, { seg: 20, segTube: 4, seed });
};

/** Monument ultime : trois gradins aux quatre braseros et petits obélisques, une flèche d'or qui vrille d'un tour et demi, trois anneaux qui l'entourent en orbite, une lanterne et un soleil de rayons à son sommet. */
const monumentUltime: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const he = hs * 0.012;
  const yT = marchesCarrees(g, cx, yb, cz, rb * 0.82, rb * 0.82, 3, he, c.pierre, rb * 0.12, seed);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x = cx + sx * rb * 0.68,
        z = cz + sz * rb * 0.68;
      cylinder(g, x, yb + he, z, rb * 0.07, hs * 0.03, 10, c.orSombre, c.mOr, MAT.PLAIN, c.or, rb * 0.11);
      flamme(g, x, yb + he + hs * 0.03, z, rb * 0.09, hs * 0.035, FLAMME);
      const xo = cx + sx * rb * 0.5,
        zo = cz + sz * rb * 0.5;
      tronc(g, xo, yb + 2 * he, zo, rb * 0.1, rb * 0.045, hs * 0.2, c.or, c.mOr, seed);
      tronc(g, xo, yb + 2 * he + hs * 0.2, zo, rb * 0.045, 0, hs * 0.02, c.orClair, c.mOr, seed);
    }
  // Soubassement carré à plaques, puis la flèche vrillée.
  const hP = hs * 0.07;
  tronc(g, cx, yT, cz, rb * 0.5, rb * 0.44, hP, c.gres, MAT.PLAIN, seed);
  const dP = demiA(rb * 0.5, rb * 0.44, hP, hP * 0.2);
  plaques4(c, dP, dP, yT + hP * 0.2, hP * 0.6, rb * 0.24);
  bandeau(c, yT + hP, rb * 0.44, rb * 0.44, hs * 0.012, rb * 0.04, c.orSombre, c.mOr);
  const yF = yT + hP + hs * 0.012;
  const hF = hs * 0.6;
  const w0 = rb * 0.42,
    w1 = rb * 0.08;
  tourVrillee(g, cx, yF, cz, w0, w1, hF, Math.PI * 3, 48, c.or, c.orClair, c.mOr, { seed });
  // Trois anneaux en orbite, inclinés chacun d'un côté, qui flottent autour de la flèche.
  for (const [k, R, tilt] of [
    [0.3, 0.8, [0.35, 1, 0]],
    [0.52, 0.64, [-0.3, 1, 0.3]],
    [0.72, 0.48, [0.2, 1, -0.4]],
  ] as const) {
    tore(g, [cx, yF + hF * k, cz], rb * R, 0.2, tilt as unknown as V3, c.orClair, c.mOr, { seg: 36, segTube: 6, seed });
    tore(g, [cx, yF + hF * k, cz], rb * R * 0.97, 0.07, tilt as unknown as V3, c.orSombre, c.mOr, { seg: 36, segTube: 4, seed });
  }
  // Sommet : lanterne éclairée, soleil de quatorze rayons, flèche et flamme.
  const yS = yF + hF;
  ellipsoide(g, cx, yS + hs * 0.035, cz, hs * 0.03, hs * 0.035, hs * 0.03, LANTERNE, MAT.LAMP, 14, 9);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    membre(g, [cx + Math.cos(a) * hs * 0.034, yS + hs * 0.035 + Math.sin(a) * hs * 0.034, cz], [cx + Math.cos(a) * hs * 0.065, yS + hs * 0.035 + Math.sin(a) * hs * 0.065, cz], rb * 0.025, rb * 0.012, c.orClair, c.mOr, { seg: 5, seed });
  }
  tronc(g, cx, yS + hs * 0.07, cz, rb * 0.04, 0, yb + 0.98 * hs - (yS + hs * 0.07), c.orClair, c.mOr, seed);
};

/** Silhouette de chaque type du catalogue (src/lib/game/monuments.ts). */
const FORMES: Record<string, Dessin> = {
  borne_commemorative: borne,
  banc_public: banc,
  fontaine_simple: fontaineSimple,
  buste,
  obelisque,
  arc_triomphe_miniature: arcTriomphe,
  horloge_municipale: horloge,
  fontaine_monumentale: fontaineMonumentale,
  statue_equestre: statueEquestre,
  mur_remerciements: murRemerciements,
  arche_monumentale: archeMonumentale,
  tour_observatoire: tourObservatoire,
  statue_emblematique: statueEmblematique,
  temple_national: temple,
  statue_geante: statueGeante,
  monument_ultime: monumentUltime,
};

/** Repli pour un type inconnu : l'une des trois silhouettes d'origine (fût, buste, arche), choisie de façon stable. */
const GENERIQUES: Dessin[] = [obelisque, buste, arcTriomphe];

/** Quatre lampadaires aux angles du socle, pour les monuments prestigieux : ils s'allument la nuit. */
function lampesDAngle(c: Ctx) {
  const d = (c.r * 0.9) / Math.SQRT2;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      lampadaire(c.g, c.cx + sx * d, c.yPied, c.cz + sz * d, 6.5, { fut: c.orSombre, pied: c.pierre, lanterne: LANTERNE, echelle: 2.6, seed: c.seed });
    }
}

/** Angle (radians) qui amène la façade +z d'un monument vers le côté `front` de sa parcelle. */
const ANGLE_FACADE: Record<Face, number> = { "+z": 0, "-z": Math.PI, "+x": Math.PI / 2, "-x": -Math.PI / 2 };

/** Copie `local` (construit autour de l'origine) dans `g`, tourné pour que sa façade regarde `front`, centré en (cx, cz). */
function copierTourne(g: Geo, local: Geo, cx: number, cz: number, front: Face) {
  const a = ANGLE_FACADE[front];
  const co = Math.round(Math.cos(a)),
    si = Math.round(Math.sin(a));
  const base = g.n;
  for (let i = 0; i < local.n; i++) {
    const o = i * 13;
    const V = local.V;
    const x = V[o],
      z = V[o + 2],
      nx = V[o + 3],
      nz = V[o + 5];
    g.v(cx + x * co + z * si, V[o + 1], cz - x * si + z * co, nx * co + nz * si, V[o + 4], -nx * si + nz * co, [V[o + 6], V[o + 7], V[o + 8]], V[o + 9], V[o + 10], V[o + 11], V[o + 12]);
  }
  for (const i of local.I) g.I.push(base + i);
}

export function buildMonument(g: Geo, cx: number, cz: number, type: string, palier: number, ao: TamponAO[], seed: number, front: Face = "+z") {
  const { rayon: rSocle, hauteur: h } = gabaritMonument(type, palier);
  const y0 = 0.15;

  const niveau = rangMonument(palier);
  const t = Math.min(Math.max(palier, 0), 15) / 15;
  const orBase = couleurMetal(t);
  // Le matériau brillant (MAT.PAINT) éclaircit sa couleur (tint = base × 1,3 + 0,1) : un or poli
  // à pleine couleur tourne au jaune citron, on le fonce donc d'autant pour qu'il reste de l'or.
  const or = niveau === 0 ? orBase : shadeC(orBase, niveau === 1 ? 0.8 : 0.7);
  // Pierre chaude pour les modestes, qui tire vers le marbre clair avec le palier ; les corps de
  // monument (« grès ») sont teintés d'or pour que la signature dorée se lise dès le premier regard.
  const pierre = mixer(PIERRE, MARBRE, t);
  // Marches : plus il y en a, plus le monument est posé ; leur épaisseur est comptée dans la hauteur du gabarit.
  const nMarches = niveau + 1;
  const epMarche = [0.6, 0.5, 0.45][niveau];

  // Le monument se construit autour de l'origine, façade vers +z, puis se copie tourné et déplacé.
  const local = new Geo();
  const { haut: yb, rayon: rb } = marchesRondes(local, 0, y0, 0, rSocle, nMarches, epMarche, pierre, 0.11);
  const ctx: Ctx = {
    g: local,
    cx: 0,
    cz: 0,
    seed,
    niveau,
    r: rSocle,
    rb,
    yb,
    yPied: y0 + epMarche,
    hs: y0 + h - yb,
    or,
    orSombre: shadeC(or, 0.72),
    orClair: shadeC(or, 1.15),
    mOr: niveau === 0 ? MAT.PLAIN : MAT.PAINT,
    pierre,
    gres: mixer(pierre, orBase, 0.55),
  };
  (FORMES[type] ?? GENERIQUES[hashType(type) % GENERIQUES.length])(ctx);
  if (niveau === 2) lampesDAngle(ctx);
  copierTourne(g, local, cx, cz, front);

  ao.push({ x0: cx - rSocle, z0: cz - rSocle, x1: cx + rSocle, z1: cz + rSocle, w: 1, h });
}

/**
 * Place pavée qui entoure un monument sur sa parcelle (14,5 m) : un carré de dalles, une bordure basse
 * et quatre jardinières aux angles. Dessinée à part du monument (buildMonument) : elle appartient à la
 * parcelle, qui n'a plus son jardin public (terrain.ts, `lotsMonument`), et reste là même quand le bloc
 * n'est pas encore ouvert.
 */
export function buildPlaceMonument(g: Geo, cx: number, cz: number, ao: TamponAO[], seed: number) {
  const demi = LOT / 2 - 0.55;
  const y = 0.17;
  box(g, cx - demi, 0.15, cz - demi, cx + demi, y, cz + demi, { c: COL.paving, m: MAT.PAVING, seed });
  // Bordure basse tout autour.
  const e = 0.35,
    hb = 0.42;
  box(g, cx - demi, y, cz - demi, cx + demi, y + hb, cz - demi + e, { c: COL.stone, m: MAT.PLAIN, seed });
  box(g, cx - demi, y, cz + demi - e, cx + demi, y + hb, cz + demi, { c: COL.stone, m: MAT.PLAIN, seed });
  box(g, cx - demi, y, cz - demi + e, cx - demi + e, y + hb, cz + demi - e, { c: COL.stone, m: MAT.PLAIN, seed });
  box(g, cx + demi - e, y, cz - demi + e, cx + demi, y + hb, cz + demi - e, { c: COL.stone, m: MAT.PLAIN, seed });
  // Jardinières d'angle : un bac de pierre et un arbuste rond.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x = cx + sx * (demi - 1.15),
        z = cz + sz * (demi - 1.15);
      box(g, x - 0.85, y, z - 0.85, x + 0.85, y + 0.55, z + 0.85, { c: COL.stone, m: MAT.PLAIN, seed });
      ellipsoide(g, x, y + 1.05, z, 0.9, 0.75, 0.9, FEUILLAGE, MAT.FOLIAGE, 10, 6);
      ao.push({ x0: x - 0.9, z0: z - 0.9, x1: x + 0.9, z1: z + 0.9, w: 0.35, h: 0 });
    }
}
