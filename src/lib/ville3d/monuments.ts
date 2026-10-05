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
  mixer,
  panneau,
  plaque,
  tronc,
  type Face,
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

/** Borne commémorative : deux assises de pierre, fût effilé à plaques et listels, corniche, coiffe de bronze et boule, quatre bornes basses autour. */
const borne: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const w = rb * 0.5;
  const h1 = hs * 0.09,
    h1b = hs * 0.07,
    h2 = hs * 0.5,
    h3 = hs * 0.04,
    h4 = hs * 0.2;
  box(g, cx - w, yb, cz - w, cx + w, yb + h1, cz + w, { c: c.pierre, m: MAT.PLAIN, seed });
  box(g, cx - w * 0.9, yb + h1, cz - w * 0.9, cx + w * 0.9, yb + h1 + h1b, cz + w * 0.9, { c: c.gres, m: MAT.PLAIN, seed });
  const y1 = yb + h1 + h1b;
  const w0 = w * 0.74,
    w1 = w * 0.58;
  tronc(g, cx, y1, cz, w0, w1, h2, c.or, c.mOr, seed);
  const d = demiA(w0, w1, h2, h2 * 0.2);
  plaques4(c, d, d, y1 + h2 * 0.2, h2 * 0.5, w * 0.34);
  // Deux listels de bronze, au pied et en haut du fût.
  for (const k of [0.05, 0.9]) bandeau(c, y1 + h2 * k, demiA(w0, w1, h2, h2 * k), demiA(w0, w1, h2, h2 * k), h2 * 0.035, 0.07, c.orSombre, c.mOr);
  bandeau(c, y1 + h2, w1, w1, h3, w * 0.2, c.pierre);
  const y3 = y1 + h2 + h3;
  tronc(g, cx, y3, cz, w * 0.66, w * 0.14, h4, c.orClair, c.mOr, seed);
  ellipsoide(g, cx, y3 + h4 + hs * 0.035, cz, hs * 0.04, hs * 0.04, hs * 0.04, c.orClair, c.mOr);
  // Quatre bornes basses aux angles de la marche.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x = cx + sx * rb * 0.66,
        z = cz + sz * rb * 0.66;
      cylinder(g, x, yb, z, rb * 0.05, hs * 0.09, 8, c.orSombre, c.mOr, MAT.PLAIN, c.or, rb * 0.04);
      ellipsoide(g, x, yb + hs * 0.1, z, rb * 0.045, rb * 0.045, rb * 0.045, c.or, c.mOr, 8, 5);
    }
};

/** Banc public : grand banc de pierre à lattes de bronze et dossier, joues sculptées, deux lampadaires derrière lui (qui s'allument la nuit). */
const banc: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const L = rb * 0.8,
    P = rb * 0.22,
    pw = rb * 0.14;
  const hAss = hs * 0.19,
    hDos = hs * 0.26;
  for (const sg of [-1, 1]) {
    const xc = cx + sg * (L - pw / 2);
    // Joue : un pied massif, un accoudoir et un volute de bronze.
    box(g, xc - pw / 2, yb, cz - P, xc + pw / 2, yb + hAss, cz + P, { c: c.pierre, m: MAT.PLAIN, seed });
    box(g, xc - pw * 0.6, yb + hAss, cz - P, xc + pw * 0.6, yb + hAss + hs * 0.035, cz + P * 0.9, { c: c.gres, m: MAT.PLAIN, seed });
    box(g, xc - pw / 2, yb + hAss, cz - P, xc + pw / 2, yb + hAss + hDos, cz - P + rb * 0.06, { c: c.pierre, m: MAT.PLAIN, seed });
    ellipsoide(g, xc, yb + hAss + hDos + hs * 0.015, cz - P + rb * 0.03, pw * 0.55, hs * 0.03, rb * 0.05, c.orSombre, c.mOr, 8, 5);
    // Patte avant en forme de griffe.
    cylinder(g, xc, yb, cz + P - rb * 0.03, pw * 0.5, hAss * 0.45, 8, c.gres, MAT.PLAIN, null, null, pw * 0.38);
  }
  const lat = 5,
    pas = (2 * (P - rb * 0.03)) / lat;
  for (let i = 0; i < lat; i++) {
    box(g, cx - L + pw, yb + hAss, cz - P + rb * 0.03 + i * pas + rb * 0.008, cx + L - pw, yb + hAss + hs * 0.03, cz - P + rb * 0.03 + (i + 1) * pas - rb * 0.008, {
      c: c.or,
      m: c.mOr,
      seed,
    });
  }
  for (const y of [0.1, 0.19]) {
    box(g, cx - L + pw, yb + hAss + hs * y, cz - P - rb * 0.012, cx + L - pw, yb + hAss + hs * (y + 0.04), cz - P + rb * 0.05, { c: c.or, m: c.mOr, seed });
  }
  // Une plaque dédicace sur le dossier, côté rue.
  plaqueDe(c, "+z", cx, cz - P + rb * 0.06, yb + hAss + hs * 0.115, hs * 0.05, L * 0.3, 1);
  for (const sg of [-1, 1]) lampadaire(g, cx + sg * L * 0.92, yb, cz - P - rb * 0.18, hs * 0.97, { fut: c.orSombre, pied: c.pierre, lanterne: LANTERNE, echelle: 2.6, seed });
};

/** Fontaine simple : margelle de pierre, eau, colonne de bronze, deux vasques, jet et couronne de petits jets. */
const fontaineSimple: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb } = c;
  const R = rb * 0.9,
    b = hs * 0.1;
  cylinder(g, cx, yb, cz, R, b, 16, c.pierre, MAT.PLAIN, MAT.PLAIN, c.gres);
  // Margelle : un anneau plus étroit et plus haut sur le bord du bassin.
  cylinder(g, cx, yb + b, cz, R, hs * 0.025, 16, c.gres, MAT.PLAIN, null, null, R * 0.96);
  cylinder(g, cx, yb + b, cz, R * 0.93, hs * 0.012, 16, EAU, MAT.WATER, MAT.WATER, EAU);
  const y1 = yb + b;
  cylinder(g, cx, y1, cz, rb * 0.09, hs * 0.3, 10, c.orSombre, c.mOr, null, null, rb * 0.07);
  const y2 = y1 + hs * 0.3;
  cylinder(g, cx, y2, cz, rb * 0.08, hs * 0.08, 14, c.or, c.mOr, MAT.WATER, EAU, rb * 0.5);
  cylinder(g, cx, y2 + hs * 0.08, cz, rb * 0.06, hs * 0.16, 10, c.orSombre, c.mOr, null, null, rb * 0.04);
  const y3 = y2 + hs * 0.24;
  cylinder(g, cx, y3, cz, rb * 0.05, hs * 0.05, 12, c.or, c.mOr, MAT.WATER, EAU, rb * 0.24);
  cylinder(g, cx, y3 + hs * 0.05, cz, rb * 0.04, 0.97 * hs + yb - (y3 + hs * 0.05), 8, EAU_CLAIRE, MAT.WATER, null, null, 0);
  // Couronne de jets sur le bassin.
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const x = cx + Math.cos(a) * R * 0.62,
      z = cz + Math.sin(a) * R * 0.62;
    cylinder(g, x, y1, z, rb * 0.03, hs * 0.04, 6, c.orSombre, c.mOr, null, null);
    cylinder(g, x, y1 + hs * 0.04, z, rb * 0.022, hs * 0.14, 6, EAU_CLAIRE, MAT.WATER, null, null, 0);
  }
  // Quatre bornes basses sur la margelle : c'est elles qui disent « fontaine » de loin avec le jet.
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    cylinder(g, cx + dx * R * 0.97, yb, cz + dz * R * 0.97, rb * 0.055, hs * 0.2, 8, c.orSombre, c.mOr, MAT.PLAIN, c.or, rb * 0.04);
    ellipsoide(g, cx + dx * R * 0.97, yb + hs * 0.21, cz + dz * R * 0.97, rb * 0.05, rb * 0.05, rb * 0.05, c.or, c.mOr, 8, 5);
  }
};

/** Buste : piédestal de pierre à plaques et corniche, buste de bronze à épaules drapées, tête, chevelure et médaillon. */
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
  const hb = (0.98 * hs - (yP - yb)) / 0.78; // la tête du buste affleure la hauteur du palier
  // Épaules et drapé : un volume large, deux plis latéraux, un médaillon sur la poitrine.
  ellipsoide(g, cx, yP + 0.15 * hb, cz, 0.3 * hb, 0.15 * hb, 0.17 * hb, c.or, c.mOr);
  for (const sg of [-1, 1]) ellipsoide(g, cx + sg * 0.22 * hb, yP + 0.1 * hb, cz + 0.04 * hb, 0.11 * hb, 0.1 * hb, 0.15 * hb, c.orSombre, c.mOr, 10, 6);
  disque(g, cx, yP + 0.16 * hb, cz + 0.172 * hb, 0.045 * hb, "+z", c.orClair, c.mOr);
  cylinder(g, cx, yP + 0.2 * hb, cz, 0.07 * hb, 0.2 * hb, 8, c.or, c.mOr, null, null);
  // Tête : crâne, visage (nez, menton), chevelure, oreilles.
  ellipsoide(g, cx, yP + 0.56 * hb, cz, 0.15 * hb, 0.2 * hb, 0.16 * hb, c.orClair, c.mOr, 16, 10);
  ellipsoide(g, cx, yP + 0.63 * hb, cz - 0.01 * hb, 0.16 * hb, 0.15 * hb, 0.165 * hb, c.orSombre, c.mOr, 14, 8);
  box(g, cx - 0.018 * hb, yP + 0.5 * hb, cz + 0.14 * hb, cx + 0.018 * hb, yP + 0.58 * hb, cz + 0.2 * hb, { c: c.orClair, m: c.mOr, seed });
  ellipsoide(g, cx, yP + 0.42 * hb, cz + 0.08 * hb, 0.06 * hb, 0.04 * hb, 0.05 * hb, c.orClair, c.mOr, 8, 5);
  for (const sg of [-1, 1]) ellipsoide(g, cx + sg * 0.155 * hb, yP + 0.56 * hb, cz, 0.02 * hb, 0.045 * hb, 0.03 * hb, c.orClair, c.mOr, 6, 4);
};

/** Obélisque : trois assises, fût effilé à cartouches et colonnes de signes, pyramidion poli et pointe. */
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
    w1 = w * 0.32;
  tronc(g, cx, ys, cz, w0, w1, hF, c.or, c.mOr, seed);
  const d = demiA(w0, w1, hF, hF * 0.12);
  plaques4(c, d, d, ys + hF * 0.12, hF * 0.2, w0 * 0.3);
  // Colonnes de signes : trois rainures verticales par face, au-dessus du cartouche.
  for (const k of [-0.5, 0, 0.5]) {
    const y0 = ys + hF * 0.38,
      y1 = ys + hF * 0.9;
    for (const [f, sgn] of [
      ["+z", 1],
      ["-z", -1],
    ] as [Face, number][]) {
      const half = demiA(w0, w1, hF, hF * 0.5) * 0.86;
      boite(g, f, cx + k * half - 0.07, cx + k * half + 0.07, y0, y1, cz + sgn * (demiA(w0, w1, hF, hF * 0.5) - 0.02), 0.07, c.orSombre, c.mOr, seed);
    }
    for (const [f, sgn] of [
      ["+x", 1],
      ["-x", -1],
    ] as [Face, number][]) {
      const half = demiA(w0, w1, hF, hF * 0.5) * 0.86;
      boite(g, f, cz + k * half - 0.07, cz + k * half + 0.07, ys + hF * 0.38, ys + hF * 0.9, cx + sgn * (demiA(w0, w1, hF, hF * 0.5) - 0.02), 0.07, c.orSombre, c.mOr, seed);
    }
  }
  tronc(g, cx, ys + hF, cz, w1, 0, hP, c.orClair, c.mOr, seed);
  tronc(g, cx, ys + hF + hP, cz, w1 * 0.1, 0, hs * 0.04, c.orClair, c.mOr, seed);
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
    h6 = hs * 0.13;
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
  ellipsoide(g, cx, yT + h6 + hs * 0.012, cz, hs * 0.02, hs * 0.02, hs * 0.02, c.orClair, c.mOr, 8, 5);
  tronc(g, cx, yT + h6, cz, w * 0.07, 0, hs * 0.04, c.orClair, c.mOr, seed);
};

/** Fontaine monumentale : grand bassin à gradins et balustrade, trois vasques étagées, mufles de bronze, jets satellites et jet central. */
const fontaineMonumentale: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb } = c;
  const R = rb * 0.94,
    b = hs * 0.08;
  cylinder(g, cx, yb, cz, R, b, 20, c.pierre, MAT.PLAIN, MAT.PLAIN, c.gres);
  cylinder(g, cx, yb + b, cz, R, hs * 0.02, 20, c.gres, MAT.PLAIN, null, null, R * 0.97);
  cylinder(g, cx, yb + b, cz, R * 0.92, hs * 0.008, 20, EAU, MAT.WATER, MAT.WATER, EAU);
  // Mufles de bronze sur le pourtour du bassin, et quatre jets satellites.
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    ellipsoide(g, cx + Math.cos(a) * R * 0.985, yb + b * 0.55, cz + Math.sin(a) * R * 0.985, rb * 0.04, rb * 0.04, rb * 0.04, c.orSombre, c.mOr, 8, 5);
  }
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const x = cx + dx * R * 0.62,
      z = cz + dz * R * 0.62;
    cylinder(g, x, yb + b, z, rb * 0.05, hs * 0.07, 8, c.orSombre, c.mOr, null, null);
    cylinder(g, x, yb + b + hs * 0.07, z, rb * 0.035, hs * 0.14, 8, EAU_CLAIRE, MAT.WATER, null, null, 0);
  }
  let y = yb + b;
  cylinder(g, cx, y, cz, rb * 0.2, hs * 0.2, 14, c.pierre, MAT.PLAIN, null, null, rb * 0.17);
  // Quatre dauphins de bronze au pied de la colonne.
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ])
    ellipsoide(g, cx + dx * rb * 0.24, y + hs * 0.07, cz + dz * rb * 0.24, rb * 0.055, hs * 0.05, rb * 0.055, c.or, c.mOr, 8, 5);
  y += hs * 0.2;
  cylinder(g, cx, y, cz, rb * 0.17, hs * 0.07, 18, c.gres, MAT.PLAIN, MAT.WATER, EAU, rb * 0.64);
  y += hs * 0.07;
  cylinder(g, cx, y, cz, rb * 0.1, hs * 0.15, 12, c.orSombre, c.mOr, null, null);
  y += hs * 0.15;
  cylinder(g, cx, y, cz, rb * 0.1, hs * 0.06, 16, c.or, c.mOr, MAT.WATER, EAU, rb * 0.4);
  y += hs * 0.06;
  cylinder(g, cx, y, cz, rb * 0.06, hs * 0.14, 10, c.orSombre, c.mOr, null, null);
  y += hs * 0.14;
  cylinder(g, cx, y, cz, rb * 0.06, hs * 0.05, 14, c.orClair, c.mOr, MAT.WATER, EAU, rb * 0.22);
  y += hs * 0.05;
  cylinder(g, cx, y, cz, rb * 0.05, 0.97 * hs + yb - y, 10, EAU_CLAIRE, MAT.WATER, null, null, 0);
};

/** Statue équestre : haut piédestal à plaques et frise, cheval de bronze (corps, encolure, tête, crinière, jambes à sabots, queue) et cavalier au sabre levé. */
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
  const U = 0.98 * hs - (yP - yb);
  const x0 = cx - 0.05 * U; // le cheval déborde un peu du piédestal, la tête vers +x
  // Corps, poitrail, encolure en deux temps, tête, oreilles, crinière.
  ellipsoide(g, x0 - 0.02 * U, yP + 0.4 * U, cz, 0.28 * U, 0.12 * U, 0.1 * U, c.or, c.mOr, 16, 10);
  ellipsoide(g, x0 + 0.19 * U, yP + 0.46 * U, cz, 0.13 * U, 0.13 * U, 0.095 * U, c.or, c.mOr, 12, 8);
  ellipsoide(g, x0 + 0.25 * U, yP + 0.57 * U, cz, 0.075 * U, 0.12 * U, 0.06 * U, c.or, c.mOr, 12, 8);
  ellipsoide(g, x0 + 0.31 * U, yP + 0.69 * U, cz, 0.07 * U, 0.1 * U, 0.055 * U, c.or, c.mOr, 12, 8);
  ellipsoide(g, x0 + 0.34 * U, yP + 0.76 * U, cz, 0.06 * U, 0.05 * U, 0.045 * U, c.orClair, c.mOr, 12, 8);
  ellipsoide(g, x0 + 0.4 * U, yP + 0.73 * U, cz, 0.065 * U, 0.032 * U, 0.032 * U, c.orClair, c.mOr, 10, 6);
  for (const sz of [-1, 1]) tronc(g, x0 + 0.32 * U, yP + 0.79 * U, cz + sz * 0.03 * U, 0.012 * U, 0, 0.05 * U, c.orClair, c.mOr, seed);
  ellipsoide(g, x0 + 0.25 * U, yP + 0.65 * U, cz, 0.025 * U, 0.14 * U, 0.02 * U, c.orSombre, c.mOr, 8, 6);
  // Jambes à sabots : les antérieures droites, les postérieures un peu repliées.
  for (const [sx, sz] of [
    [1, -1],
    [1, 1],
    [-1, -1],
    [-1, 1],
  ]) {
    const x = x0 + (sx > 0 ? 0.2 : -0.21) * U,
      z = cz + sz * 0.065 * U;
    tronc(g, x, yP + 0.05 * U, z, 0.04 * U, 0.028 * U, sx > 0 ? 0.3 * U : 0.26 * U, c.orSombre, c.mOr, seed);
    box(g, x - 0.04 * U, yP, z - 0.04 * U, x + 0.04 * U, yP + 0.055 * U, z + 0.04 * U, { c: c.pierre, m: MAT.PLAIN, seed });
  }
  // Queue en trois nœuds.
  ellipsoide(g, x0 - 0.3 * U, yP + 0.38 * U, cz, 0.03 * U, 0.06 * U, 0.03 * U, c.orSombre, c.mOr, 8, 6);
  ellipsoide(g, x0 - 0.33 * U, yP + 0.28 * U, cz, 0.026 * U, 0.07 * U, 0.026 * U, c.orSombre, c.mOr, 8, 6);
  ellipsoide(g, x0 - 0.34 * U, yP + 0.19 * U, cz, 0.022 * U, 0.06 * U, 0.022 * U, c.orSombre, c.mOr, 8, 6);
  // Tapis de selle, puis le cavalier au sabre levé : buste, tête casquée à plumet, bras.
  box(g, x0 - 0.08 * U, yP + 0.5 * U, cz - 0.11 * U, x0 + 0.1 * U, yP + 0.53 * U, cz + 0.11 * U, { c: c.orClair, m: c.mOr, seed });
  ellipsoide(g, x0 + 0.01 * U, yP + 0.65 * U, cz, 0.055 * U, 0.12 * U, 0.06 * U, c.orSombre, c.mOr, 12, 8);
  ellipsoide(g, x0 + 0.01 * U, yP + 0.82 * U, cz, 0.045 * U, 0.05 * U, 0.045 * U, c.orClair, c.mOr, 12, 8);
  tronc(g, x0 + 0.01 * U, yP + 0.86 * U, cz, 0.01 * U, 0, 0.06 * U, c.orClair, c.mOr, seed);
  box(g, x0 + 0.08 * U - 0.01 * U, yP + 0.7 * U, cz - 0.01 * U, x0 + 0.08 * U + 0.01 * U, yP + 0.99 * U, cz + 0.01 * U, { c: c.orClair, m: c.mOr, seed });
  box(g, x0 + 0.04 * U, yP + 0.7 * U, cz - 0.02 * U, x0 + 0.09 * U, yP + 0.73 * U, cz + 0.02 * U, { c: c.or, m: c.mOr, seed });
};

/** Mur des remerciements : mur de grès couvert de plaquettes, deux pylônes à braseros et une stèle centrale à médaillon. */
const murRemerciements: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const Lx = rb * 0.9;
  const ep = 1.05; // demi-épaisseur du mur
  const h1 = hs * 0.05,
    hw = hs * 0.32;
  box(g, cx - Lx, yb, cz - ep - 0.3, cx + Lx, yb + h1, cz + ep + 0.3, { c: c.pierre, m: MAT.PLAIN, seed });
  const y1 = yb + h1;
  box(g, cx - Lx + 0.4, y1, cz - ep, cx + Lx - 0.4, y1 + hw, cz + ep, { c: c.gres, m: MAT.PLAIN, seed });
  box(g, cx - Lx + 0.3, y1 + hw, cz - ep - 0.15, cx + Lx - 0.3, y1 + hw + hs * 0.035, cz + ep + 0.15, { c: c.pierre, m: MAT.PLAIN, seed });
  // Plaquettes : des rangées de plaques de bronze, quelques-unes dorées, sur les deux faces.
  const cols = 11,
    rows = 5,
    x0 = cx - (Lx - 1.4),
    pas = (2 * (Lx - 1.4)) / cols,
    ph = (hw * 0.7) / rows,
    yT = y1 + hw * 0.14;
  for (let i = 0; i < cols; i++) {
    const xc = x0 + (i + 0.5) * pas;
    if (Math.abs(xc - cx) < 1.5) continue; // derrière la stèle
    for (let j = 0; j < rows; j++) {
      const col = (i * 5 + j * 3) % 4 === 0 ? c.orClair : c.orSombre;
      panneau(g, "+z", xc - pas * 0.42, xc + pas * 0.42, yT + j * ph + ph * 0.1, yT + (j + 1) * ph - ph * 0.1, cz + ep + 0.03, col, c.mOr, seed);
      panneau(g, "-z", xc - pas * 0.42, xc + pas * 0.42, yT + j * ph + ph * 0.1, yT + (j + 1) * ph - ph * 0.1, cz - ep - 0.03, col, c.mOr, seed);
    }
  }
  // Pylônes d'extrémité à braseros, couronnés d'une corniche.
  for (const sg of [-1, 1]) {
    const xc = cx + sg * (Lx - 0.65);
    const hp = hs * 0.52;
    box(g, xc - 0.65, y1, cz - ep - 0.1, xc + 0.65, y1 + hp, cz + ep + 0.1, { c: c.gres, m: MAT.PLAIN, seed });
    bandeau(c, y1 + hp * 0.9, 0, 0, hs * 0.012, 0, c.pierre);
    box(g, xc - 0.8, y1 + hp * 0.92, cz - ep - 0.22, xc + 0.8, y1 + hp * 0.92 + hs * 0.02, cz + ep + 0.22, { c: c.pierre, m: MAT.PLAIN, seed });
    tronc(g, xc, y1 + hp, cz, 0.78, 0.5, hs * 0.04, c.or, c.mOr, seed, 0.95, 0.65);
    flamme(g, xc, y1 + hp + hs * 0.04, cz, 0.36, hs * 0.08, FLAMME);
  }
  // Stèle centrale à médaillon, plus haute que le mur.
  const hSt = hs * 0.76;
  tronc(g, cx, y1, cz, 1.2, 0.98, hSt, c.gres, MAT.PLAIN, seed, ep * 0.8, ep * 0.66);
  const yCap = y1 + hSt;
  tronc(g, cx, yCap, cz, 1.1, 0.38, hs * 0.08, c.or, c.mOr, seed, ep * 0.72, 0.36);
  flamme(g, cx, yCap + hs * 0.08, cz, 0.4, hs * 0.06, FLAMME);
  const ym = y1 + hSt * 0.62,
    pz = demiA(ep * 0.8, ep * 0.66, hSt, hSt * 0.62);
  for (const f of ["+z", "-z"] as Face[]) {
    const s = f === "+z" ? 1 : -1;
    disque(g, cx, ym, cz + s * (pz + 0.03), 0.9, f, c.or, c.mOr, 24);
    disque(g, cx, ym, cz + s * (pz + 0.06), 0.66, f, PLAQUE_FOND, MAT.PLAIN, 24);
    disque(g, cx, ym, cz + s * (pz + 0.09), 0.38, f, c.orClair, c.mOr, 20);
  }
  plaqueDe(c, "+z", cx, cz + demiA(ep * 0.8, ep * 0.66, hSt, hSt * 0.1), y1 + hSt * 0.1, hs * 0.1, 0.8);
  plaqueDe(c, "-z", cx, cz - demiA(ep * 0.8, ep * 0.66, hSt, hSt * 0.1), y1 + hSt * 0.1, hs * 0.1, 0.8);
};

// --------------------------------------------------------------------------
// Rang prestigieux (paliers 10 à 15)
// --------------------------------------------------------------------------

/** Arche monumentale : deux pylônes d'or à aiguilles, grand anneau en plein cintre, clé de voûte, soleil et flèche centrale. */
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
    // Contreforts à pans coupés et bandeaux de bronze sur le pylône.
    for (const k of [0.25, 0.5, 0.75]) bandeau(c, y1 + (ySp - y1) * k, 0, 0, 0, 0, c.or);
    for (const k of [0.8, 0.9]) boite(g, "+z", xc - ep * 0.45, xc + ep * 0.45, y1 + (ySp - y1) * k, y1 + (ySp - y1) * k + hs * 0.012, cz + prof / 2, 0.14, c.orSombre, c.mOr, seed);
    // Aiguille sur chaque pylône.
    tronc(g, xc, ySp, cz, ep * 0.42, ep * 0.12, hs * 0.3, c.orClair, c.mOr, seed);
    tronc(g, xc, ySp + hs * 0.3, cz, ep * 0.12, 0, hs * 0.07, c.orClair, c.mOr, seed);
  }
  arche(g, cx, ySp, cz, rIn, rOut, prof, c.or, c.mOr, { seed, seg: 24 });
  box(g, cx - 0.45 * ep, ySp + rIn - 0.1, cz - prof / 2 - 0.14, cx + 0.45 * ep, ySp + rOut + 0.4, cz + prof / 2 + 0.14, { c: c.orClair, m: c.mOr, seed });
  const rs = rb * 0.34,
    yS = ySp + rOut + 0.4 + rs * 0.9;
  for (const f of ["+z", "-z"] as Face[]) {
    const s = f === "+z" ? 1 : -1;
    disque(g, cx, yS, cz + s * 0.22, rs, f, c.orClair, c.mOr, 28);
    disque(g, cx, yS, cz + s * 0.26, rs * 0.72, f, c.orSombre, c.mOr, 28);
    disque(g, cx, yS, cz + s * 0.3, rs * 0.4, f, c.orClair, c.mOr, 20);
    // Rayons du soleil.
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

/** Tour d'observatoire : fût à fenêtres éclairées et balcons, plate-forme à garde-corps, grand dôme doré braquant sa lunette, mât au sommet. */
const tourObservatoire: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const rB = rb * 0.46,
    rH = rb * 0.36;
  const hSo = hs * 0.04,
    hF = hs * 0.66;
  cylinder(g, cx, yb, cz, rb * 0.66, hSo, 14, c.pierre, MAT.PLAIN, MAT.PAVING, COL.paving);
  const y1 = yb + hSo;
  cylinder(g, cx, y1, cz, rB, hF, 14, mixer(c.gres, c.or, 0.4), MAT.PLAIN, null, null, rH);
  const rAt = (dy: number) => rB + ((rH - rB) * dy) / hF;
  for (const k of [0.2, 0.5, 0.8]) {
    cylinder(g, cx, y1 + hF * k, cz, rAt(hF * k) + 0.2, hs * 0.012, 14, c.or, c.mOr, MAT.PLAIN, c.orClair);
  }
  // Sept étages de fenêtres éclairées, sur les quatre faces.
  for (const f of ["+z", "-z", "+x", "-x"] as Face[]) {
    const centre = f[1] === "z" ? cx : cz;
    for (let k = 0; k < 7; k++) {
      const dy = hF * (0.06 + k * 0.13);
      const plan = (f[1] === "z" ? cz : cx) + (f[0] === "+" ? 1 : -1) * (rAt(dy) - 0.05);
      boite(g, f, centre - 0.2, centre + 0.2, y1 + dy, y1 + dy + hs * 0.045, plan, 0.12, LANTERNE, MAT.LAMP, seed);
    }
  }
  const y2 = y1 + hF;
  cylinder(g, cx, y2, cz, rH, hs * 0.03, 14, c.gres, MAT.PLAIN, null, null, rb * 0.7);
  const y3 = y2 + hs * 0.03;
  cylinder(g, cx, y3, cz, rb * 0.7, hs * 0.02, 14, c.pierre, MAT.PLAIN, MAT.PAVING, COL.paving);
  const y4 = y3 + hs * 0.02;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const x = cx + Math.cos(a) * rb * 0.67,
      z = cz + Math.sin(a) * rb * 0.67;
    box(g, x - 0.08, y4, z - 0.08, x + 0.08, y4 + hs * 0.03, z + 0.08, { c: c.orSombre, m: c.mOr, seed });
  }
  cylinder(g, cx, y4 + hs * 0.027, cz, rb * 0.67, hs * 0.006, 18, c.orSombre, c.mOr, null, null);
  const rD = rb * 0.52,
    hD = hs * 0.045,
    ry = hs * 0.1;
  cylinder(g, cx, y4, cz, rD, hD, 16, c.gres, MAT.PLAIN, MAT.PLAIN, c.gres);
  const y5 = y4 + hD;
  ellipsoide(g, cx, y5, cz, rD * 1.04, ry, rD * 1.04, c.or, c.mOr, 20, 10);
  // Nervures du dôme, et une fente d'où sort la lunette : un long tube horizontal, objectif au bout.
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    box(g, cx + Math.cos(a) * rD * 0.62 - 0.07, y5 + ry * 0.55, cz + Math.sin(a) * rD * 0.62 - 0.07, cx + Math.cos(a) * rD * 0.62 + 0.07, y5 + ry * 0.62, cz + Math.sin(a) * rD * 0.62 + 0.07, { c: c.orClair, m: c.mOr, seed });
  }
  const yL = y5 + ry * 0.35;
  box(g, cx - 0.4, yL, cz + rD * 0.4, cx + 0.4, yL + 0.8, cz + rD * 1.45, { c: c.orSombre, m: c.mOr, seed });
  box(g, cx - 0.5, yL - 0.06, cz + rD * 1.4, cx + 0.5, yL + 0.86, cz + rD * 1.55, { c: c.orClair, m: c.mOr, seed });
  const hMat = yb + 0.98 * hs - (y5 + ry);
  cylinder(g, cx, y5 + ry, cz, 0.1, hMat, 6, c.orSombre, c.mOr, null, null, 0.04);
  ellipsoide(g, cx, y5 + ry + hMat * 0.8, cz, 0.22, 0.22, 0.22, c.orClair, c.mOr, 8, 6);
};

/** Statue emblématique : haut piédestal de marbre à plaques, figure drapée de bronze à diadème de rayons, torche levée, tablette et plis de la robe. */
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
  const yP = yb + h1 + h2 + h3 + h4;
  const H = (yb + 0.98 * hs - yP) / 1.1; // la flamme de la torche monte à 1,1 H
  // Manteau derrière la figure, puis la robe : un cône évasé, une taille, un buste.
  tronc(g, cx, yP + H * 0.04, cz - H * 0.07, H * 0.1, H * 0.07, H * 0.62, c.orSombre, c.mOr, seed, H * 0.025, H * 0.02);
  cylinder(g, cx, yP, cz, H * 0.115, H * 0.44, 16, c.or, c.mOr, null, null, H * 0.07);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2;
    tronc(g, cx + Math.cos(a) * H * 0.1, yP + H * 0.02, cz + Math.sin(a) * H * 0.1, H * 0.012, H * 0.006, H * 0.4, c.orSombre, c.mOr, seed);
  }
  cylinder(g, cx, yP + H * 0.44, cz, H * 0.07, H * 0.19, 14, c.or, c.mOr, null, null, H * 0.085);
  ellipsoide(g, cx, yP + H * 0.64, cz, H * 0.1, H * 0.035, H * 0.06, c.or, c.mOr, 14, 8);
  cylinder(g, cx, yP + H * 0.65, cz, H * 0.022, H * 0.05, 10, c.or, c.mOr, null, null);
  ellipsoide(g, cx, yP + H * 0.72, cz, H * 0.045, H * 0.058, H * 0.045, c.orClair, c.mOr, 14, 10);
  // Diadème : sept rayons en éventail.
  couronne(c, cx, yP + H * 0.77, cz, H * 0.018, H * 0.1, 7);
  // Bras droit levé avec la torche : manche, avant-bras, main, manche évasée, flamme.
  const xb = cx + H * 0.09;
  tronc(g, xb, yP + H * 0.6, cz, H * 0.026, H * 0.02, H * 0.15, c.or, c.mOr, seed);
  tronc(g, xb, yP + H * 0.75, cz, H * 0.02, H * 0.016, H * 0.17, c.or, c.mOr, seed);
  ellipsoide(g, xb, yP + H * 0.93, cz, H * 0.022, H * 0.025, H * 0.022, c.orClair, c.mOr, 8, 6);
  cylinder(g, xb, yP + H * 0.94, cz, H * 0.014, H * 0.04, 8, c.orSombre, c.mOr, null, null);
  cylinder(g, xb, yP + H * 0.975, cz, H * 0.022, H * 0.03, 12, c.orClair, c.mOr, MAT.PLAIN, c.orSombre, H * 0.05);
  flamme(g, xb, yP + H * 1.0, cz, H * 0.04, H * 0.09, FLAMME);
  // Bras gauche plié, portant une tablette contre le flanc.
  tronc(g, cx - H * 0.09, yP + H * 0.5, cz, H * 0.024, H * 0.022, H * 0.12, c.or, c.mOr, seed);
  box(g, cx - H * 0.14, yP + H * 0.47, cz - H * 0.015, cx - H * 0.1, yP + H * 0.56, cz + H * 0.07, { c: c.orClair, m: c.mOr, seed });
  box(g, cx - H * 0.142, yP + H * 0.49, cz + H * 0.07, cx - H * 0.098, yP + H * 0.54, cz + H * 0.075, { c: PLAQUE_FOND, m: MAT.PLAIN, seed });
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
  const yL = yT + hs * 0.09 + hs * 0.155;
  cylinder(g, cx, yL - 0.1, cz, rD * 0.2, hs * 0.05, 10, c.orSombre, c.mOr, null, null, rD * 0.16);
  box(g, cx - 0.4, yL + hs * 0.04, cz - 0.4, cx + 0.4, yL + hs * 0.085, cz + 0.4, { c: LANTERNE, m: MAT.LAMP, seed });
  tronc(g, cx, yL + hs * 0.085, cz, 0.5, 0.05, yb + 0.98 * hs - (yL + hs * 0.085), c.orClair, c.mOr, seed);
};

/** Statue géante : colosse sur son haut piédestal, jambes écartées, bras levés (flamme à droite, globe à gauche), couronne de rayons et disque solaire dans le dos. */
const statueGeante: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const w = rb * 0.66;
  const h1 = hs * 0.04,
    h2 = hs * 0.025,
    h3 = hs * 0.25,
    h4 = hs * 0.03;
  box(g, cx - w, yb, cz - w, cx + w, yb + h1, cz + w, { c: c.pierre, m: MAT.PLAIN, seed });
  box(g, cx - w * 0.9, yb + h1, cz - w * 0.9, cx + w * 0.9, yb + h1 + h2, cz + w * 0.9, { c: c.pierre, m: MAT.PLAIN, seed });
  tronc(g, cx, yb + h1 + h2, cz, w * 0.8, w * 0.62, h3, c.gres, MAT.PLAIN, seed);
  const d = demiA(w * 0.8, w * 0.62, h3, h3 * 0.2);
  plaques4(c, d, d, yb + h1 + h2 + h3 * 0.16, h3 * 0.3, w * 0.46);
  plaques4(c, demiA(w * 0.8, w * 0.62, h3, h3 * 0.58), demiA(w * 0.8, w * 0.62, h3, h3 * 0.58), yb + h1 + h2 + h3 * 0.58, h3 * 0.3, w * 0.46);
  for (const k of [0.04, 0.5, 0.96]) bandeau(c, yb + h1 + h2 + h3 * k - hs * 0.004, demiA(w * 0.8, w * 0.62, h3, h3 * k), demiA(w * 0.8, w * 0.62, h3, h3 * k), hs * 0.008, 0.1, c.orSombre, c.mOr);
  bandeau(c, yb + h1 + h2 + h3, w * 0.62, w * 0.62, h4, w * 0.12, c.pierre);
  const yP = yb + h1 + h2 + h3 + h4;
  const H = yb + 0.98 * hs - yP;
  // Jambes écartées : cuisses et mollets effilés, bottes.
  for (const sg of [-1, 1]) {
    const xj = cx + sg * H * 0.07;
    tronc(g, xj, yP + H * 0.06, cz, H * 0.042, H * 0.034, H * 0.34, c.or, c.mOr, seed, H * 0.048, H * 0.04);
    box(g, xj - H * 0.05, yP, cz - H * 0.05, xj + H * 0.05, yP + H * 0.07, cz + H * 0.1, { c: c.orSombre, m: c.mOr, seed });
  }
  // Pagne, ceinture, torse en V, épaules.
  tronc(g, cx, yP + H * 0.32, cz, H * 0.125, H * 0.09, H * 0.1, c.orSombre, c.mOr, seed, H * 0.065, H * 0.055);
  box(g, cx - H * 0.09, yP + H * 0.42, cz - H * 0.058, cx + H * 0.09, yP + H * 0.44, cz + H * 0.058, { c: c.orClair, m: c.mOr, seed });
  tronc(g, cx, yP + H * 0.44, cz, H * 0.08, H * 0.115, H * 0.22, c.or, c.mOr, seed, H * 0.05, H * 0.062);
  // Médaillon solaire sur la poitrine.
  disque(g, cx, yP + H * 0.58, cz + H * 0.062, H * 0.03, "+z", c.orClair, c.mOr, 20);
  ellipsoide(g, cx - H * 0.115, yP + H * 0.66, cz, H * 0.032, H * 0.03, H * 0.042, c.orSombre, c.mOr, 8, 6);
  ellipsoide(g, cx + H * 0.115, yP + H * 0.66, cz, H * 0.032, H * 0.03, H * 0.042, c.orSombre, c.mOr, 8, 6);
  cylinder(g, cx, yP + H * 0.665, cz, H * 0.028, H * 0.045, 10, c.or, c.mOr, null, null);
  ellipsoide(g, cx, yP + H * 0.745, cz, H * 0.058, H * 0.07, H * 0.058, c.orClair, c.mOr, 16, 10);
  couronne(c, cx, yP + H * 0.805, cz, H * 0.02, H * 0.09, 7);
  // Disque solaire dans le dos de la tête : un plan derrière elle, visible de face comme de dos.
  const yH = yP + H * 0.75;
  const zH = cz - H * 0.075;
  for (const f of ["+z", "-z"] as Face[]) {
    const s = f === "+z" ? 1 : -1;
    disque(g, cx, yH, zH + s * 0.03, H * 0.125, f, c.orClair, c.mOr, 28);
    disque(g, cx, yH, zH + s * 0.06, H * 0.1, f, c.orSombre, c.mOr, 28);
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      const x = cx + Math.cos(a) * H * 0.15,
        y = yH + Math.sin(a) * H * 0.15;
      boite(g, f, x - H * 0.008, x + H * 0.008, y - H * 0.02, y + H * 0.02, zH + s * 0.02, 0.05, c.orClair, c.mOr, seed);
    }
  }
  // Bras levés le long du corps : la flamme à droite, le globe à gauche.
  const yA = yP + H * 0.62;
  for (const sg of [-1, 1]) {
    const xs = cx + sg * H * 0.12;
    tronc(g, xs, yA, cz, H * 0.026, H * 0.022, H * 0.14, c.or, c.mOr, seed);
    box(g, xs - H * 0.02, yA + H * 0.14 - H * 0.005, cz - H * 0.02, xs + H * 0.02, yA + H * 0.16, cz + H * 0.02, { c: c.orClair, m: c.mOr, seed });
    tronc(g, xs + sg * H * 0.01, yA + H * 0.14, cz, H * 0.02, H * 0.017, H * 0.12, c.or, c.mOr, seed);
  }
  flamme(g, cx + H * 0.125, yA + H * 0.275, cz, H * 0.033, H * 0.1, FLAMME);
  cylinder(g, cx + H * 0.125, yA + H * 0.26, cz, H * 0.012, H * 0.02, 8, c.orSombre, c.mOr, null, null);
  ellipsoide(g, cx - H * 0.125, yA + H * 0.3, cz, H * 0.042, H * 0.042, H * 0.042, c.orClair, c.mOr, 14, 10);
  cylinder(g, cx - H * 0.125, yA + H * 0.26, cz, H * 0.018, H * 0.02, 8, c.orSombre, c.mOr, null, null);
};

/** Monument ultime : trois gradins de marbre aux quatre braseros, grand pylône d'or à plaques, bandeaux et pilastres, quatre obélisques d'angle, lanterne, globe et flèche. */
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
  const hF = hs * 0.64,
    w0 = rb * 0.5,
    w1 = rb * 0.2;
  tronc(g, cx, yT, cz, w0, w1, hF, c.or, c.mOr, seed);
  // Pilastres d'angle et quatre étages de bandeaux, plaques sur deux niveaux.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const dx = demiA(w0, w1, hF, 0);
      tronc(g, cx + sx * (dx - w0 * 0.07), yT, cz + sz * (dx - w0 * 0.07), w0 * 0.08, w1 * 0.1, hF * 0.97, c.orClair, c.mOr, seed);
    }
  const d = demiA(w0, w1, hF, hF * 0.08);
  plaques4(c, d, d, yT + hF * 0.08, hs * 0.1, w0 * 0.5);
  const d2 = demiA(w0, w1, hF, hF * 0.3);
  plaques4(c, d2, d2, yT + hF * 0.3, hs * 0.08, w0 * 0.38);
  for (const k of [0.22, 0.45, 0.62, 0.8, 0.92]) {
    const half = demiA(w0, w1, hF, hF * k) + rb * 0.03;
    box(g, cx - half, yT + hF * k, cz - half, cx + half, yT + hF * k + hs * 0.01, cz + half, { c: c.orClair, m: c.mOr, seed });
  }
  const yS = yT + hF;
  box(g, cx - rb * 0.2, yS, cz - rb * 0.2, cx + rb * 0.2, yS + hs * 0.045, cz + rb * 0.2, { c: LANTERNE, m: MAT.LAMP, seed });
  tronc(g, cx, yS + hs * 0.045, cz, rb * 0.26, rb * 0.17, hs * 0.012, c.orClair, c.mOr, seed);
  const yG = yS + hs * 0.057;
  ellipsoide(g, cx, yG + hs * 0.035, cz, hs * 0.035, hs * 0.035, hs * 0.035, c.orClair, c.mOr, 16, 10);
  tronc(g, cx, yG + hs * 0.07, cz, rb * 0.06, 0, yb + 0.98 * hs - (yG + hs * 0.07), c.orClair, c.mOr, seed);
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
