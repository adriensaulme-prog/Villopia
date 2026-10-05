/**
 * Monuments d'influence (Jalon 20 3/3, docs/A-INTEGRER.md §19) : des
 * repères dorés/bronze plus petits et plus sobres que des bâtiments civiques,
 * pour qu'on les distingue au premier coup d'œil. A-INTEGRER §43 : la
 * première passe n'avait que trois silhouettes primitives (colonne, statue,
 * arche) choisies par un hachage du nom du type, sans lien avec le vrai
 * monument ; chacun des 16 types a maintenant sa propre silhouette (une borne
 * n'a plus rien d'une horloge) et un détail de surface (marches, plaques
 * d'inscription, cadrans, tuiles de mur, flammes, vasques).
 *
 * Trois rangs, pour que le prestige se lise autrement que par la taille
 * (la taille, elle, suit le palier : ECHELLE_MONUMENT) :
 *   modeste     (paliers 0-4)   une marche, bronze patiné mat, pierre brute ;
 *   notable     (paliers 5-9)   deux marches, plaques encadrées, dorure polie ;
 *   prestigieux (paliers 10-15) trois marches, marbre, or poli, quatre
 *                               lampadaires qui s'allument la nuit, flammes.
 * La teinte or/bronze reste la signature commune : elle glisse seulement du
 * bronze (palier 0) à l'or (milieu) puis à l'or poli (palier 15).
 *
 * Chaque monument tient dans le cercle de son socle (rSocle, ≤ 5,14 m) et sous
 * la hauteur du palier : les emplacements de monumentsVille.ts supposent les
 * deux. Un type inconnu (par exemple un mégaprojet fusionné au catalogue, §41,
 * si on décide de le dessiner ici plutôt que par megaprojets.ts) retombe sur
 * l'une de trois silhouettes génériques ; pour lui en donner une, il suffit
 * d'ajouter une entrée à FORMES.
 */
import { COL, MAT, hex, type Couleur } from "./constantes";
import { box, cylinder, gableRoof, shadeC, type Geo } from "./geometrie";
import type { TamponAO } from "./mobilier";
import {
  arche,
  boite,
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

/**
 * Échelle des monuments. D'abord conçus « modestes » (2 à 6 m de haut pour
 * des blocs de 64 m), ils n'étaient presque pas visibles de loin : Adrien a
 * demandé de les agrandir nettement (02/10/2026). Un seul coefficient, mêmes
 * silhouettes : 4 m (palier 0) à 15 m (derniers paliers) de haut, socle de
 * 2,75 à 5 m de rayon — toujours très en deçà de l'espacement des monuments
 * dans leur secteur (≥ 40 m, voir emplacements.ts).
 */
export const ECHELLE_MONUMENT = 2.5;
const E = ECHELLE_MONUMENT;

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

/** Trois petits traits au sommet d'un fût, couronne de rayons : ray = hauteur de chaque rayon. */
function couronne(c: Ctx, x: number, y: number, z: number, ecart: number, hMax: number, n = 5) {
  for (let k = 0; k < n; k++) {
    const d = k - (n - 1) / 2;
    tronc(c.g, x + d * ecart, y, z, ecart * 0.28, 0, hMax * (1 - 0.18 * Math.abs(d)), c.orClair, c.mOr, c.seed);
  }
}

// --------------------------------------------------------------------------
// Rang modeste (paliers 0 à 4)
// --------------------------------------------------------------------------

/** Borne commémorative : bloc de pierre, fût effilé avec sa plaque, coiffe de bronze et boule. */
const borne: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const w = rb * 0.42;
  const h1 = hs * 0.16,
    h2 = hs * 0.5,
    h3 = hs * 0.05,
    h4 = hs * 0.2;
  box(g, cx - w, yb, cz - w, cx + w, yb + h1, cz + w, { c: c.pierre, m: MAT.PLAIN, seed });
  const y1 = yb + h1;
  tronc(g, cx, y1, cz, w * 0.8, w * 0.66, h2, c.or, c.mOr, seed);
  const d = demiA(w * 0.8, w * 0.66, h2, h2 * 0.25);
  plaques4(c, d, d, y1 + h2 * 0.25, h2 * 0.45, w * 0.4);
  box(g, cx - w * 0.78, y1 + h2, cz - w * 0.78, cx + w * 0.78, y1 + h2 + h3, cz + w * 0.78, { c: c.pierre, m: MAT.PLAIN, seed });
  const y3 = y1 + h2 + h3;
  tronc(g, cx, y3, cz, w * 0.62, w * 0.16, h4, c.orClair, c.mOr, seed);
  ellipsoide(g, cx, y3 + h4 + hs * 0.03, cz, hs * 0.035, hs * 0.035, hs * 0.035, c.orClair, c.mOr);
};

/** Banc public : banc de pierre à lattes de bronze, dossier, et lampadaire derrière lui (qui s'allume la nuit). */
const banc: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const L = rb * 0.72,
    P = rb * 0.17,
    zb = cz + rb * 0.2,
    pw = rb * 0.12;
  const hAss = hs * 0.13;
  for (const sg of [-1, 1]) {
    const xc = cx + sg * (L - pw / 2);
    box(g, xc - pw / 2, yb, zb - P, xc + pw / 2, yb + hAss, zb + P, { c: c.pierre, m: MAT.PLAIN, seed });
    box(g, xc - pw / 2, yb + hAss, zb - P, xc + pw / 2, yb + hAss + hs * 0.2, zb - P + rb * 0.05, { c: c.pierre, m: MAT.PLAIN, seed });
  }
  const pas = (2 * P) / 3;
  for (let i = 0; i < 3; i++) {
    box(g, cx - L + pw, yb + hAss, zb - P + i * pas + rb * 0.008, cx + L - pw, yb + hAss + hs * 0.025, zb - P + (i + 1) * pas - rb * 0.008, {
      c: c.or,
      m: c.mOr,
      seed,
    });
  }
  for (const y of [0.09, 0.16]) {
    box(g, cx - L + pw, yb + hAss + hs * y, zb - P - rb * 0.012, cx + L - pw, yb + hAss + hs * (y + 0.028), zb - P + rb * 0.04, {
      c: c.or,
      m: c.mOr,
      seed,
    });
  }
  lampadaire(g, cx, yb, cz - rb * 0.4, hs, { fut: c.orSombre, pied: c.pierre, lanterne: LANTERNE, echelle: E, seed });
};

/** Fontaine simple : margelle de pierre, eau, colonne de bronze, vasque et jet. */
const fontaineSimple: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb } = c;
  const R = rb * 0.86,
    b = hs * 0.13;
  cylinder(g, cx, yb, cz, R, b, 16, c.pierre, MAT.PLAIN, MAT.PLAIN, c.gres);
  cylinder(g, cx, yb + b, cz, R * 0.82, hs * 0.008, 16, EAU, MAT.WATER, MAT.WATER, EAU);
  const y1 = yb + b;
  cylinder(g, cx, y1, cz, rb * 0.1, hs * 0.34, 10, c.orSombre, c.mOr, null, null);
  const y2 = y1 + hs * 0.34;
  cylinder(g, cx, y2, cz, rb * 0.1, hs * 0.1, 14, c.or, c.mOr, MAT.WATER, EAU, rb * 0.4);
  cylinder(g, cx, y2 + hs * 0.1, cz, rb * 0.05, hs * 0.38, 8, EAU_CLAIRE, MAT.WATER, null, null, 0);
  // Quatre bornes basses sur la margelle : c'est elles qui disent « fontaine » de loin avec le jet.
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    cylinder(g, cx + dx * R * 0.97, yb, cz + dz * R * 0.97, rb * 0.05, hs * 0.2, 8, c.orSombre, c.mOr, MAT.PLAIN, c.or, rb * 0.035);
  }
};

/** Buste : piédestal de pierre à plaque, buste de bronze (épaules, cou, tête). */
const buste: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const w = rb * 0.44;
  const h1 = hs * 0.07,
    h2 = hs * 0.48,
    h3 = hs * 0.04;
  box(g, cx - w, yb, cz - w, cx + w, yb + h1, cz + w, { c: c.pierre, m: MAT.PLAIN, seed });
  tronc(g, cx, yb + h1, cz, w * 0.8, w * 0.66, h2, c.gres, MAT.PLAIN, seed);
  const d = demiA(w * 0.8, w * 0.66, h2, h2 * 0.2);
  plaques4(c, d, d, yb + h1 + h2 * 0.2, h2 * 0.5, w * 0.42);
  box(g, cx - w * 0.82, yb + h1 + h2, cz - w * 0.82, cx + w * 0.82, yb + h1 + h2 + h3, cz + w * 0.82, { c: c.pierre, m: MAT.PLAIN, seed });
  const yP = yb + h1 + h2 + h3;
  const hb = (0.98 * hs - (yP - yb)) / 0.76; // la tête du buste affleure la hauteur du palier
  ellipsoide(g, cx, yP + 0.15 * hb, cz, 0.3 * hb, 0.15 * hb, 0.17 * hb, c.or, c.mOr);
  cylinder(g, cx, yP + 0.2 * hb, cz, 0.07 * hb, 0.2 * hb, 8, c.or, c.mOr, null, null);
  ellipsoide(g, cx, yP + 0.56 * hb, cz, 0.15 * hb, 0.2 * hb, 0.16 * hb, c.orClair, c.mOr);
};

/** Obélisque : deux assises, fût effilé à cartouches, pyramidion poli et pointe. */
const obelisque: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const w = rb * 0.46;
  const h1 = hs * 0.06,
    h2 = hs * 0.12,
    hF = hs * 0.64,
    hP = hs * 0.12;
  box(g, cx - w, yb, cz - w, cx + w, yb + h1, cz + w, { c: c.pierre, m: MAT.PLAIN, seed });
  box(g, cx - w * 0.82, yb + h1, cz - w * 0.82, cx + w * 0.82, yb + h1 + h2, cz + w * 0.82, { c: c.gres, m: MAT.PLAIN, seed });
  plaques4(c, w * 0.82, w * 0.82, yb + h1 + h2 * 0.18, h2 * 0.64, w * 0.4);
  const ys = yb + h1 + h2;
  const w0 = w * 0.62,
    w1 = w * 0.34;
  tronc(g, cx, ys, cz, w0, w1, hF, c.or, c.mOr, seed);
  const d = demiA(w0, w1, hF, hF * 0.15);
  plaques4(c, d, d, ys + hF * 0.15, hF * 0.22, w0 * 0.3);
  tronc(g, cx, ys + hF, cz, w1, 0, hP, c.orClair, c.mOr, seed);
  tronc(g, cx, ys + hF + hP, cz, w1 * 0.1, 0, hs * 0.04, c.orClair, c.mOr, seed);
};

// --------------------------------------------------------------------------
// Rang notable (paliers 5 à 9)
// --------------------------------------------------------------------------

/** Arc de triomphe miniature : piliers à reliefs, massif percé d'une arche, archivolte dorée, attique à inscription, groupe sculpté au sommet. */
const arcTriomphe: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const Rs = Math.min(rb * 0.76, hs * 0.26),
    rIn = Rs * 0.52,
    prof = Rs * 0.85;
  const ySp = yb + hs * 0.33;
  for (const sg of [-1, 1]) {
    box(g, sg < 0 ? cx - Rs : cx + rIn, yb, cz - prof / 2, sg < 0 ? cx - rIn : cx + Rs, ySp, cz + prof / 2, { c: c.gres, m: MAT.PLAIN, seed });
    const xc = cx + sg * ((Rs + rIn) / 2);
    plaqueDe(c, "+z", xc, cz + prof / 2, yb + hs * 0.04, (ySp - yb) * 0.7, (Rs - rIn) * 0.3, 0);
    plaqueDe(c, "-z", xc, cz - prof / 2, yb + hs * 0.04, (ySp - yb) * 0.7, (Rs - rIn) * 0.3, 0);
  }
  arche(g, cx, ySp, cz, rIn, Rs, prof, c.gres, MAT.PLAIN, { carre: true, seed, seg: 12 });
  // Archivolte : un liseré d'or qui souligne l'ouverture sur les deux faces.
  for (const sg of [-1, 1]) arche(g, cx, ySp, cz + (sg * prof) / 2, rIn - 0.05, rIn + 0.32, 0.2, c.or, c.mOr, { seed });
  const yA = ySp + Rs;
  box(g, cx - Rs - 0.25, yA, cz - prof / 2 - 0.25, cx + Rs + 0.25, yA + hs * 0.025, cz + prof / 2 + 0.25, { c: c.pierre, m: MAT.PLAIN, seed });
  const yAt = yA + hs * 0.025;
  box(g, cx - Rs - 0.1, yAt, cz - prof / 2 - 0.1, cx + Rs + 0.1, yAt + hs * 0.12, cz + prof / 2 + 0.1, { c: c.gres, m: MAT.PLAIN, seed });
  plaqueDe(c, "+z", cx, cz + prof / 2 + 0.1, yAt + hs * 0.02, hs * 0.08, Rs * 0.55);
  plaqueDe(c, "-z", cx, cz - prof / 2 - 0.1, yAt + hs * 0.02, hs * 0.08, Rs * 0.55);
  const yC = yAt + hs * 0.12;
  box(g, cx - Rs - 0.25, yC, cz - prof / 2 - 0.25, cx + Rs + 0.25, yC + hs * 0.03, cz + prof / 2 + 0.25, { c: c.pierre, m: MAT.PLAIN, seed });
  const yG = yC + hs * 0.03;
  box(g, cx - Rs * 0.5, yG, cz - prof * 0.3, cx + Rs * 0.5, yG + hs * 0.04, cz + prof * 0.3, { c: c.pierre, m: MAT.PLAIN, seed });
  tronc(g, cx, yG + hs * 0.04, cz, Rs * 0.14, Rs * 0.06, hs * 0.12, c.or, c.mOr, seed);
  ellipsoide(g, cx, yG + hs * 0.19, cz, hs * 0.03, hs * 0.03, hs * 0.03, c.orClair, c.mOr);
  for (const sg of [-1, 1]) tronc(g, cx + sg * Rs * 0.34, yG + hs * 0.04, cz, Rs * 0.07, Rs * 0.03, hs * 0.07, c.orSombre, c.mOr, seed);
};

/** Horloge municipale : tour à pilastres et fenêtres éclairées la nuit, quatre cadrans, toit doré. */
const horloge: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const w = rb * 0.34;
  const h1 = hs * 0.06,
    h2 = hs * 0.45,
    h3 = hs * 0.03,
    h4 = hs * 0.17,
    h5 = hs * 0.03,
    h6 = hs * 0.2;
  box(g, cx - w * 1.35, yb, cz - w * 1.35, cx + w * 1.35, yb + h1, cz + w * 1.35, { c: c.pierre, m: MAT.PLAIN, seed });
  const y1 = yb + h1;
  box(g, cx - w, y1, cz - w, cx + w, y1 + h2, cz + w, { c: c.gres, m: MAT.PLAIN, seed });
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      box(g, cx + sx * w - 0.12 * w, y1, cz + sz * w - 0.12 * w, cx + sx * w + 0.12 * w, y1 + h2, cz + sz * w + 0.12 * w, { c: c.pierre, m: MAT.PLAIN, seed });
  for (const f of ["+z", "-z", "+x", "-x"] as Face[]) {
    const centre = f[1] === "z" ? cx : cz;
    const plan = f[1] === "z" ? cz + (f[0] === "+" ? w : -w) : cx + (f[0] === "+" ? w : -w);
    for (const y of [0.2, 0.62]) boite(g, f, centre - 0.11 * w, centre + 0.11 * w, y1 + h2 * y, y1 + h2 * (y + 0.2), plan - 0.02, 0.1, LANTERNE, MAT.LAMP, seed);
  }
  const y2 = y1 + h2;
  box(g, cx - w * 1.18, y2, cz - w * 1.18, cx + w * 1.18, y2 + h3, cz + w * 1.18, { c: c.pierre, m: MAT.PLAIN, seed });
  const y3 = y2 + h3;
  const wc = w * 1.1;
  box(g, cx - wc, y3, cz - wc, cx + wc, y3 + h4, cz + wc, { c: c.gres, m: MAT.PLAIN, seed });
  const yd = y3 + h4 / 2,
    r = Math.min(wc * 0.78, h4 * 0.42);
  for (const f of ["+z", "-z", "+x", "-x"] as Face[]) {
    const s = f[0] === "+" ? 1 : -1;
    const plan = (f[1] === "z" ? cz : cx) + s * wc;
    const centre = f[1] === "z" ? cx : cz;
    disque(g, f[1] === "z" ? cx : plan + s * 0.03, yd, f[1] === "z" ? plan + s * 0.03 : cz, r * 1.18, f, c.or, c.mOr);
    disque(g, f[1] === "z" ? cx : plan + s * 0.06, yd, f[1] === "z" ? plan + s * 0.06 : cz, r, f, CADRAN, MAT.PLAIN);
    // Aiguilles : une grande vers le haut, une petite vers la droite de qui regarde la face : 3 h partout.
    const sensDroite = f[1] === "z" ? s : -s;
    const a0 = centre,
      a1 = centre + sensDroite * r * 0.55;
    boite(g, f, Math.min(a0, a1), Math.max(a0, a1), yd - r * 0.06, yd + r * 0.06, plan + s * 0.05, 0.05, PLAQUE_FOND, MAT.PLAIN, seed);
    boite(g, f, centre - r * 0.05, centre + r * 0.05, yd, yd + r * 0.8, plan + s * 0.05, 0.08, PLAQUE_FOND, MAT.PLAIN, seed);
  }
  const y4 = y3 + h4;
  box(g, cx - w * 1.18, y4, cz - w * 1.18, cx + w * 1.18, y4 + h5, cz + w * 1.18, { c: c.pierre, m: MAT.PLAIN, seed });
  const y5 = y4 + h5;
  tronc(g, cx, y5, cz, w * 1.15, 0, h6, c.or, c.mOr, seed);
  ellipsoide(g, cx, y5 + h6 + hs * 0.012, cz, hs * 0.02, hs * 0.02, hs * 0.02, c.orClair, c.mOr);
  tronc(g, cx, y5 + h6, cz, w * 0.08, 0, hs * 0.05, c.orClair, c.mOr, seed);
};

/** Fontaine monumentale : grand bassin, trois vasques étagées, jets satellites et jet central. */
const fontaineMonumentale: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb } = c;
  const R = rb * 0.94,
    b = hs * 0.08;
  cylinder(g, cx, yb, cz, R, b, 20, c.pierre, MAT.PLAIN, MAT.PLAIN, c.gres);
  cylinder(g, cx, yb + b, cz, R * 0.88, hs * 0.006, 20, EAU, MAT.WATER, MAT.WATER, EAU);
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const x = cx + dx * R * 0.6,
      z = cz + dz * R * 0.6;
    cylinder(g, x, yb + b, z, rb * 0.05, hs * 0.07, 8, c.orSombre, c.mOr, null, null);
    cylinder(g, x, yb + b + hs * 0.07, z, rb * 0.035, hs * 0.12, 8, EAU_CLAIRE, MAT.WATER, null, null, 0);
  }
  let y = yb + b;
  cylinder(g, cx, y, cz, rb * 0.17, hs * 0.2, 12, c.pierre, MAT.PLAIN, null, null);
  y += hs * 0.2;
  cylinder(g, cx, y, cz, rb * 0.17, hs * 0.07, 16, c.gres, MAT.PLAIN, MAT.WATER, EAU, rb * 0.62);
  y += hs * 0.07;
  cylinder(g, cx, y, cz, rb * 0.1, hs * 0.15, 10, c.orSombre, c.mOr, null, null);
  y += hs * 0.15;
  cylinder(g, cx, y, cz, rb * 0.1, hs * 0.06, 14, c.or, c.mOr, MAT.WATER, EAU, rb * 0.38);
  y += hs * 0.06;
  cylinder(g, cx, y, cz, rb * 0.06, hs * 0.14, 8, c.orSombre, c.mOr, null, null);
  y += hs * 0.14;
  cylinder(g, cx, y, cz, rb * 0.06, hs * 0.05, 12, c.orClair, c.mOr, MAT.WATER, EAU, rb * 0.2);
  y += hs * 0.05;
  cylinder(g, cx, y, cz, rb * 0.05, 0.97 * hs + yb - y, 8, EAU_CLAIRE, MAT.WATER, null, null, 0);
};

/** Statue équestre : haut piédestal à plaques, cheval de bronze (corps, encolure, tête, jambes, queue) et cavalier au sabre levé. */
const statueEquestre: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const hx = rb * 0.5,
    hz = rb * 0.27;
  const h1 = hs * 0.07,
    h2 = hs * 0.3,
    h3 = hs * 0.035;
  box(g, cx - hx * 1.1, yb, cz - hz * 1.1, cx + hx * 1.1, yb + h1, cz + hz * 1.1, { c: c.pierre, m: MAT.PLAIN, seed });
  tronc(g, cx, yb + h1, cz, hx, hx * 0.88, h2, c.gres, MAT.PLAIN, seed, hz, hz * 0.85);
  const dx = demiA(hx, hx * 0.88, h2, h2 * 0.2),
    dz = demiA(hz, hz * 0.85, h2, h2 * 0.2);
  plaques4(c, dx, dz, yb + h1 + h2 * 0.2, h2 * 0.5, hx * 0.5, hz * 0.55);
  box(g, cx - hx * 0.95, yb + h1 + h2, cz - hz * 0.9, cx + hx * 0.95, yb + h1 + h2 + h3, cz + hz * 0.9, { c: c.pierre, m: MAT.PLAIN, seed });
  const yP = yb + h1 + h2 + h3;
  const H = 0.98 * hs - (yP - yb);
  // Cheval de profil (tête vers +x) : corps, poitrail et encolure en deux ellipsoïdes, tête, jambes trapues, queue.
  ellipsoide(g, cx - 0.01 * H, yP + 0.38 * H, cz, 0.3 * H, 0.13 * H, 0.1 * H, c.or, c.mOr);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      box(g, cx + sx * 0.2 * H - 0.035 * H, yP, cz + sz * 0.06 * H - 0.035 * H, cx + sx * 0.2 * H + 0.035 * H, yP + 0.32 * H, cz + sz * 0.06 * H + 0.035 * H, {
        c: c.orSombre,
        m: c.mOr,
        seed,
      });
  ellipsoide(g, cx + 0.25 * H, yP + 0.5 * H, cz, 0.09 * H, 0.12 * H, 0.07 * H, c.or, c.mOr);
  ellipsoide(g, cx + 0.31 * H, yP + 0.6 * H, cz, 0.08 * H, 0.1 * H, 0.06 * H, c.or, c.mOr);
  ellipsoide(g, cx + 0.37 * H, yP + 0.66 * H, cz, 0.09 * H, 0.05 * H, 0.045 * H, c.or, c.mOr);
  ellipsoide(g, cx - 0.32 * H, yP + 0.3 * H, cz, 0.03 * H, 0.11 * H, 0.03 * H, c.orSombre, c.mOr);
  // Cavalier au sabre levé.
  ellipsoide(g, cx + 0.02 * H, yP + 0.6 * H, cz, 0.06 * H, 0.12 * H, 0.065 * H, c.orSombre, c.mOr);
  ellipsoide(g, cx + 0.02 * H, yP + 0.78 * H, cz, 0.05 * H, 0.055 * H, 0.05 * H, c.orClair, c.mOr);
  box(g, cx + 0.09 * H - 0.012 * H, yP + 0.62 * H, cz - 0.012 * H, cx + 0.09 * H + 0.012 * H, yP + 0.98 * H, cz + 0.012 * H, { c: c.orClair, m: c.mOr, seed });
};

/** Mur des remerciements : mur de grès couvert de plaquettes, deux pylônes à braseros et une stèle centrale à médaillon. */
const murRemerciements: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const Lx = rb * 0.9;
  const h1 = hs * 0.05,
    hw = hs * 0.3;
  box(g, cx - Lx, yb, cz - 0.75, cx + Lx, yb + h1, cz + 0.75, { c: c.pierre, m: MAT.PLAIN, seed });
  const y1 = yb + h1;
  box(g, cx - Lx + 0.4, y1, cz - 0.5, cx + Lx - 0.4, y1 + hw, cz + 0.5, { c: c.gres, m: MAT.PLAIN, seed });
  box(g, cx - Lx + 0.3, y1 + hw, cz - 0.62, cx + Lx - 0.3, y1 + hw + hs * 0.03, cz + 0.62, { c: c.pierre, m: MAT.PLAIN, seed });
  // Plaquettes : des rangées de petites plaques de bronze, quelques-unes dorées, sur les deux faces.
  const cols = 7,
    rows = 3,
    x0 = cx - (Lx - 1.5),
    pas = (2 * (Lx - 1.5)) / cols,
    ph = (hw * 0.62) / rows,
    yT = y1 + hw * 0.16;
  for (let i = 0; i < cols; i++) {
    const xc = x0 + (i + 0.5) * pas;
    if (Math.abs(xc - cx) < 1.1) continue; // derrière la stèle
    for (let j = 0; j < rows; j++) {
      const col = (i * 5 + j * 3) % 4 === 0 ? c.orClair : c.orSombre;
      panneau(g, "+z", xc - pas * 0.42, xc + pas * 0.42, yT + j * ph + ph * 0.1, yT + (j + 1) * ph - ph * 0.1, cz + 0.54, col, c.mOr, seed);
      panneau(g, "-z", xc - pas * 0.42, xc + pas * 0.42, yT + j * ph + ph * 0.1, yT + (j + 1) * ph - ph * 0.1, cz - 0.54, col, c.mOr, seed);
    }
  }
  for (const sg of [-1, 1]) {
    const xc = cx + sg * (Lx - 0.5);
    const hp = hs * 0.5;
    box(g, xc - 0.5, y1, cz - 0.7, xc + 0.5, y1 + hp, cz + 0.7, { c: c.gres, m: MAT.PLAIN, seed });
    tronc(g, xc, y1 + hp, cz, 0.62, 0.36, hs * 0.04, c.or, c.mOr, seed, 0.78, 0.5);
    flamme(g, xc, y1 + hp + hs * 0.04, cz, 0.28, hs * 0.07, FLAMME);
  }
  const hSt = hs * 0.78;
  tronc(g, cx, y1, cz, 0.95, 0.8, hSt, c.gres, MAT.PLAIN, seed, 0.68, 0.55);
  const yCap = y1 + hSt;
  tronc(g, cx, yCap, cz, 0.9, 0.3, hs * 0.1, c.or, c.mOr, seed, 0.62, 0.3);
  flamme(g, cx, yCap + hs * 0.1, cz, 0.32, hs * 0.06, FLAMME);
  const ym = y1 + hSt * 0.62,
    pz = demiA(0.68, 0.55, hSt, hSt * 0.62);
  for (const f of ["+z", "-z"] as Face[]) {
    const s = f === "+z" ? 1 : -1;
    disque(g, cx, ym, cz + s * (pz + 0.03), 0.72, f, c.or, c.mOr);
    disque(g, cx, ym, cz + s * (pz + 0.06), 0.52, f, PLAQUE_FOND, MAT.PLAIN);
    disque(g, cx, ym, cz + s * (pz + 0.09), 0.3, f, c.orClair, c.mOr);
  }
  plaqueDe(c, "+z", cx, cz + demiA(0.68, 0.55, hSt, hSt * 0.1), y1 + hSt * 0.1, hs * 0.1, 0.6);
  plaqueDe(c, "-z", cx, cz - demiA(0.68, 0.55, hSt, hSt * 0.1), y1 + hSt * 0.1, hs * 0.1, 0.6);
};

// --------------------------------------------------------------------------
// Rang prestigieux (paliers 10 à 15)
// --------------------------------------------------------------------------

/** Arche monumentale : deux pylônes d'or, grand anneau en plein cintre, clé de voûte, soleil et flèche. */
const archeMonumentale: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const rIn = Math.min(rb * 0.46, hs * 0.14),
    ep = rb * 0.26,
    prof = rb * 0.34;
  const rOut = rIn + ep;
  const hP = hs * 0.36,
    hS = hs * 0.04;
  box(g, cx - rOut - 0.35, yb, cz - prof / 2 - 0.3, cx + rOut + 0.35, yb + hS, cz + prof / 2 + 0.3, { c: c.pierre, m: MAT.PLAIN, seed });
  const y1 = yb + hS,
    ySp = yb + hP;
  for (const sg of [-1, 1]) {
    box(g, sg < 0 ? cx - rOut : cx + rIn, y1, cz - prof / 2, sg < 0 ? cx - rIn : cx + rOut, ySp, cz + prof / 2, { c: c.or, m: c.mOr, seed });
    box(g, sg < 0 ? cx - rOut - 1 : cx + rOut, y1, cz - prof / 2, sg < 0 ? cx - rOut : cx + rOut + 1, y1 + hs * 0.12, cz + prof / 2, { c: c.gres, m: MAT.PLAIN, seed });
    plaqueDe(c, "+z", cx + sg * (rIn + ep / 2), cz + prof / 2, y1 + hs * 0.04, (ySp - y1) * 0.55, ep * 0.32);
    plaqueDe(c, "-z", cx + sg * (rIn + ep / 2), cz - prof / 2, y1 + hs * 0.04, (ySp - y1) * 0.55, ep * 0.32);
  }
  arche(g, cx, ySp, cz, rIn, rOut, prof, c.or, c.mOr, { seed, seg: 16 });
  box(g, cx - 0.45 * ep, ySp + rIn - 0.1, cz - prof / 2 - 0.12, cx + 0.45 * ep, ySp + rOut + 0.35, cz + prof / 2 + 0.12, { c: c.orClair, m: c.mOr, seed });
  const rs = rb * 0.3,
    yS = ySp + rOut + 0.35 + rs * 0.9;
  for (const f of ["+z", "-z"] as Face[]) {
    const s = f === "+z" ? 1 : -1;
    disque(g, cx, yS, cz + s * 0.2, rs, f, c.orClair, c.mOr, 20);
    disque(g, cx, yS, cz + s * 0.23, rs * 0.72, f, c.orSombre, c.mOr, 20);
    disque(g, cx, yS, cz + s * 0.26, rs * 0.4, f, c.orClair, c.mOr, 16);
  }
  box(g, cx - 0.25, ySp + rOut + 0.3, cz - 0.2, cx + 0.25, yS, cz + 0.2, { c: c.orClair, m: c.mOr, seed });
  tronc(g, cx, yS + rs, cz, rs * 0.12, 0, yb + 0.98 * hs - (yS + rs), c.orClair, c.mOr, seed);
};

/** Tour d'observatoire : fût trapu à fenêtres éclairées, plate-forme à garde-corps, grand dôme doré braquant sa lunette, mât au sommet. */
const tourObservatoire: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const rB = rb * 0.38,
    rH = rb * 0.3;
  const hSo = hs * 0.05,
    hF = hs * 0.46;
  cylinder(g, cx, yb, cz, rb * 0.52, hSo, 12, c.pierre, MAT.PLAIN, MAT.PAVING, COL.paving);
  const y1 = yb + hSo;
  cylinder(g, cx, y1, cz, rB, hF, 12, c.gres, MAT.PLAIN, null, null, rH);
  const rAt = (dy: number) => rB + ((rH - rB) * dy) / hF;
  for (const k of [0.22, 0.62]) cylinder(g, cx, y1 + hF * k, cz, rAt(hF * k) + 0.14, hs * 0.02, 12, c.or, c.mOr, MAT.PLAIN, c.orClair);
  for (const f of ["+z", "-z", "+x", "-x"] as Face[]) {
    const centre = f[1] === "z" ? cx : cz;
    for (const k of [0.12, 0.4, 0.78]) {
      const plan = (f[1] === "z" ? cz : cx) + (f[0] === "+" ? 1 : -1) * (rAt(hF * k) - 0.05);
      boite(g, f, centre - 0.11, centre + 0.11, y1 + hF * k, y1 + hF * k + hs * 0.06, plan, 0.1, LANTERNE, MAT.LAMP, seed);
    }
  }
  const y2 = y1 + hF;
  cylinder(g, cx, y2, cz, rH, hs * 0.04, 12, c.gres, MAT.PLAIN, null, null, rb * 0.62);
  const y3 = y2 + hs * 0.04;
  cylinder(g, cx, y3, cz, rb * 0.62, hs * 0.025, 12, c.pierre, MAT.PLAIN, MAT.PAVING, COL.paving);
  const y4 = y3 + hs * 0.025;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = cx + Math.cos(a) * rb * 0.59,
      z = cz + Math.sin(a) * rb * 0.59;
    box(g, x - 0.07, y4, z - 0.07, x + 0.07, y4 + hs * 0.035, z + 0.07, { c: c.orSombre, m: c.mOr, seed });
  }
  const rD = rb * 0.46,
    hD = hs * 0.09,
    ry = hs * 0.2;
  cylinder(g, cx, y4, cz, rD, hD, 14, c.gres, MAT.PLAIN, MAT.PLAIN, c.gres);
  const y5 = y4 + hD;
  ellipsoide(g, cx, y5, cz, rD * 1.06, ry, rD * 1.06, c.or, c.mOr);
  // Lunette : un long tube horizontal qui sort de la fente du dôme, objectif au bout.
  const yL = y5 + ry * 0.35;
  box(g, cx - 0.3, yL, cz + rD * 0.4, cx + 0.3, yL + 0.6, cz + rD * 1.55, { c: c.orSombre, m: c.mOr, seed });
  box(g, cx - 0.4, yL - 0.05, cz + rD * 1.5, cx + 0.4, yL + 0.65, cz + rD * 1.62, { c: c.orClair, m: c.mOr, seed });
  const hMat = yb + 0.98 * hs - (y5 + ry);
  cylinder(g, cx, y5 + ry, cz, 0.06, hMat, 6, c.orSombre, c.mOr, null, null, 0.03);
  ellipsoide(g, cx, y5 + ry + hMat * 0.8, cz, 0.16, 0.16, 0.16, c.orClair, c.mOr);
};

/** Statue emblématique : piédestal de marbre à plaques, figure de bronze drapée, couronne de rayons, torche levée et tablette. */
const statueEmblematique: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const w = rb * 0.5;
  const h1 = hs * 0.04,
    h2 = hs * 0.05,
    h3 = hs * 0.22,
    h4 = hs * 0.035;
  box(g, cx - w, yb, cz - w, cx + w, yb + h1, cz + w, { c: c.pierre, m: MAT.PLAIN, seed });
  box(g, cx - w * 0.88, yb + h1, cz - w * 0.88, cx + w * 0.88, yb + h1 + h2, cz + w * 0.88, { c: c.pierre, m: MAT.PLAIN, seed });
  tronc(g, cx, yb + h1 + h2, cz, w * 0.72, w * 0.6, h3, c.gres, MAT.PLAIN, seed);
  const d = demiA(w * 0.72, w * 0.6, h3, h3 * 0.2);
  plaques4(c, d, d, yb + h1 + h2 + h3 * 0.2, h3 * 0.55, w * 0.42);
  box(g, cx - w * 0.74, yb + h1 + h2 + h3, cz - w * 0.74, cx + w * 0.74, yb + h1 + h2 + h3 + h4, cz + w * 0.74, { c: c.pierre, m: MAT.PLAIN, seed });
  const yP = yb + h1 + h2 + h3 + h4;
  const H = yb + 0.98 * hs - yP;
  // Manteau derrière la figure.
  tronc(g, cx, yP + H * 0.04, cz - rb * 0.13, rb * 0.18, rb * 0.1, H * 0.6, c.orSombre, c.mOr, seed, rb * 0.025, rb * 0.025);
  cylinder(g, cx, yP, cz, rb * 0.2, H * 0.42, 12, c.or, c.mOr, null, null, rb * 0.12);
  cylinder(g, cx, yP + H * 0.42, cz, rb * 0.12, H * 0.22, 12, c.or, c.mOr, null, null, rb * 0.14);
  ellipsoide(g, cx, yP + H * 0.65, cz, rb * 0.16, H * 0.05, rb * 0.1, c.or, c.mOr);
  cylinder(g, cx, yP + H * 0.66, cz, rb * 0.04, H * 0.06, 8, c.or, c.mOr, null, null);
  ellipsoide(g, cx, yP + H * 0.76, cz, rb * 0.075, H * 0.065, rb * 0.07, c.orClair, c.mOr);
  couronne(c, cx, yP + H * 0.81, cz, rb * 0.04, H * 0.1);
  // Bras droit levé avec la torche, bras gauche portant une tablette.
  const xb = cx + rb * 0.2;
  box(g, xb - rb * 0.03, yP + H * 0.6, cz - rb * 0.03, xb + rb * 0.03, yP + H * 0.9, cz + rb * 0.03, { c: c.or, m: c.mOr, seed });
  cylinder(g, xb, yP + H * 0.9, cz, rb * 0.04, H * 0.04, 8, c.orClair, c.mOr, null, null, rb * 0.07);
  flamme(g, xb, yP + H * 0.94, cz, rb * 0.055, H * 0.06, FLAMME);
  box(g, cx - rb * 0.19, yP + H * 0.5, cz - rb * 0.03, cx - rb * 0.15, yP + H * 0.64, cz + rb * 0.03, { c: c.or, m: c.mOr, seed });
  box(g, cx - rb * 0.25, yP + H * 0.45, cz - rb * 0.08, cx - rb * 0.13, yP + H * 0.56, cz + rb * 0.08, { c: c.orClair, m: c.mOr, seed });
};

/** Temple national : stylobate à marches, colonnade, cella à porte dorée, deux frontons à médaillon, dôme et lanterne éclairée la nuit. */
const temple: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const W = rb * 0.6,
    D = rb * 0.72;
  const yS = marchesCarrees(g, cx, yb, cz, W + 0.35, D + 0.35, 2, hs * 0.02, c.pierre, 0.18, seed);
  const Hc = hs * 0.4;
  box(g, cx - (W - 0.45), yS, cz - (D - 0.3), cx + (W - 0.45), yS + Hc, cz + (D - 0.3), { c: c.gres, m: MAT.PLAIN, seed });
  for (const f of ["+z", "-z"] as Face[]) {
    const s = f === "+z" ? 1 : -1;
    boite(g, f, cx - 0.7, cx + 0.7, yS, yS + hs * 0.2, cz + s * (D - 0.3), 0.1, c.or, c.mOr, seed);
    boite(g, f, cx - 0.55, cx + 0.55, yS, yS + hs * 0.18, cz + s * (D - 0.3) + s * 0.08, 0.1, PLAQUE_FOND, MAT.PLAIN, seed);
  }
  const rc = rb * 0.075;
  const colonne = (x: number, z: number) => {
    cylinder(g, x, yS, z, rc, Hc, 8, c.pierre, MAT.PLAIN, null, null, rc * 0.85);
    box(g, x - rc * 1.4, yS + Hc - hs * 0.025, z - rc * 1.4, x + rc * 1.4, yS + Hc, z + rc * 1.4, { c: c.gres, m: MAT.PLAIN, seed });
  };
  for (const sz of [-1, 1]) for (const x of [-W, -W / 3, W / 3, W]) colonne(cx + x, cz + sz * D);
  for (const sx of [-1, 1]) for (const z of [-D / 3, D / 3]) colonne(cx + sx * W, cz + z);
  const yE = yS + Hc;
  box(g, cx - W - 0.35, yE, cz - D - 0.35, cx + W + 0.35, yE + hs * 0.06, cz + D + 0.35, { c: c.gres, m: MAT.PLAIN, seed });
  box(g, cx - W - 0.4, yE + hs * 0.05, cz - D - 0.4, cx + W + 0.4, yE + hs * 0.06 + 0.1, cz + D + 0.4, { c: c.or, m: c.mOr, seed });
  const yT = yE + hs * 0.06;
  const pitch = 0.38;
  const yR = gableRoof(g, cx - W - 0.35, cz + 0.3 * D, cx + W + 0.35, cz + D + 0.35, yT, pitch, 0.12, false, c.or, MARBRE, seed);
  gableRoof(g, cx - W - 0.35, cz - D - 0.35, cx + W + 0.35, cz - 0.3 * D, yT, pitch, 0.12, false, c.or, MARBRE, seed);
  const rise = yR - yT;
  disque(g, cx, yT + rise * 0.4, cz + D + 0.38, rise * 0.34, "+z", c.orClair, c.mOr);
  disque(g, cx, yT + rise * 0.4, cz - D - 0.38, rise * 0.34, "-z", c.orClair, c.mOr);
  const rD = W - 0.3;
  cylinder(g, cx, yT, cz, rD, hs * 0.1, 14, c.gres, MAT.PLAIN, MAT.PLAIN, c.gres);
  ellipsoide(g, cx, yT + hs * 0.1, cz, rD * 1.05, hs * 0.17, rD * 1.05, c.or, c.mOr);
  const yL = yT + hs * 0.1 + hs * 0.16;
  box(g, cx - 0.3, yL, cz - 0.3, cx + 0.3, yL + hs * 0.04, cz + 0.3, { c: LANTERNE, m: MAT.LAMP, seed });
  tronc(g, cx, yL + hs * 0.04, cz, 0.4, 0.04, yb + 0.98 * hs - (yL + hs * 0.04), c.orClair, c.mOr, seed);
};

/** Statue géante : colosse jambes écartées sur son piédestal, bras ouverts (flamme à droite, globe à gauche), couronne de rayons et disque solaire dans le dos. */
const statueGeante: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const w = rb * 0.52;
  const h1 = hs * 0.05,
    h2 = hs * 0.2,
    h3 = hs * 0.03;
  box(g, cx - w, yb, cz - w, cx + w, yb + h1, cz + w, { c: c.pierre, m: MAT.PLAIN, seed });
  tronc(g, cx, yb + h1, cz, w * 0.8, w * 0.62, h2, c.gres, MAT.PLAIN, seed);
  const d = demiA(w * 0.8, w * 0.62, h2, h2 * 0.2);
  plaques4(c, d, d, yb + h1 + h2 * 0.2, h2 * 0.55, w * 0.42);
  box(g, cx - w * 0.7, yb + h1 + h2, cz - w * 0.7, cx + w * 0.7, yb + h1 + h2 + h3, cz + w * 0.7, { c: c.pierre, m: MAT.PLAIN, seed });
  const yP = yb + h1 + h2 + h3;
  const H = yb + 0.98 * hs - yP;
  for (const sg of [-1, 1]) {
    const xj = cx + sg * rb * 0.17;
    box(g, xj - rb * 0.08, yP + H * 0.04, cz - rb * 0.07, xj + rb * 0.08, yP + H * 0.32, cz + rb * 0.07, { c: c.or, m: c.mOr, seed });
    box(g, xj - rb * 0.1, yP, cz - rb * 0.1, xj + rb * 0.1, yP + H * 0.05, cz + rb * 0.16, { c: c.orSombre, m: c.mOr, seed });
  }
  box(g, cx - rb * 0.27, yP + H * 0.3, cz - rb * 0.1, cx + rb * 0.27, yP + H * 0.38, cz + rb * 0.1, { c: c.orSombre, m: c.mOr, seed });
  box(g, cx - rb * 0.28, yP + H * 0.37, cz - rb * 0.11, cx + rb * 0.28, yP + H * 0.4, cz + rb * 0.11, { c: c.orClair, m: c.mOr, seed });
  tronc(g, cx, yP + H * 0.4, cz, rb * 0.22, rb * 0.3, H * 0.26, c.or, c.mOr, seed, rb * 0.1, rb * 0.13);
  disque(g, cx, yP + H * 0.56, cz + rb * 0.13 + 0.03, rb * 0.1, "+z", c.orClair, c.mOr);
  cylinder(g, cx, yP + H * 0.66, cz, rb * 0.05, H * 0.05, 8, c.or, c.mOr, null, null);
  ellipsoide(g, cx, yP + H * 0.74, cz, rb * 0.09, H * 0.075, rb * 0.085, c.orClair, c.mOr);
  couronne(c, cx, yP + H * 0.8, cz, rb * 0.05, H * 0.1);
  const yH = yP + H * 0.76;
  for (const f of ["+z", "-z"] as Face[]) {
    const s = f === "+z" ? 1 : -1;
    disque(g, cx, yH, cz + s * (rb * 0.12 + 0.02), rb * 0.32, f, c.orClair, c.mOr, 20);
    disque(g, cx, yH, cz + s * (rb * 0.12 + 0.05), rb * 0.26, f, c.orSombre, c.mOr, 20);
  }
  for (const sg of [-1, 1]) {
    const yA = yP + H * 0.62;
    box(g, sg < 0 ? cx - rb * 0.5 : cx + rb * 0.3, yA - H * 0.03, cz - rb * 0.05, sg < 0 ? cx - rb * 0.3 : cx + rb * 0.5, yA + H * 0.03, cz + rb * 0.05, { c: c.or, m: c.mOr, seed });
    const xa = cx + sg * rb * 0.46;
    box(g, xa - rb * 0.04, yA + H * 0.03, cz - rb * 0.04, xa + rb * 0.04, yA + H * 0.22, cz + rb * 0.04, { c: c.or, m: c.mOr, seed });
  }
  flamme(g, cx + rb * 0.46, yP + H * 0.84, cz, rb * 0.06, H * 0.16, FLAMME);
  ellipsoide(g, cx - rb * 0.46, yP + H * 0.9, cz, rb * 0.075, H * 0.06, rb * 0.075, c.orClair, c.mOr);
};

/** Monument ultime : trois gradins de marbre aux quatre braseros, pylône d'or à plaques et bandeaux, quatre obélisques d'angle, lanterne, globe et flèche. */
const monumentUltime: Dessin = (c) => {
  const { g, cx, cz, yb, hs, rb, seed } = c;
  const he = hs * 0.045;
  const yT = marchesCarrees(g, cx, yb, cz, rb * 0.66, rb * 0.66, 3, he, c.pierre, rb * 0.14, seed);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x = cx + sx * rb * 0.55,
        z = cz + sz * rb * 0.55;
      cylinder(g, x, yb + he, z, rb * 0.05, hs * 0.07, 10, c.orSombre, c.mOr, MAT.PLAIN, c.or, rb * 0.09);
      flamme(g, x, yb + he + hs * 0.07, z, rb * 0.075, hs * 0.07, FLAMME);
      const xo = cx + sx * rb * 0.41,
        zo = cz + sz * rb * 0.41;
      tronc(g, xo, yb + 2 * he, zo, rb * 0.045, rb * 0.02, hs * 0.2, c.or, c.mOr, seed);
      tronc(g, xo, yb + 2 * he + hs * 0.2, zo, rb * 0.02, 0, hs * 0.025, c.orClair, c.mOr, seed);
    }
  const hF = hs * 0.58,
    w0 = rb * 0.3,
    w1 = rb * 0.12;
  tronc(g, cx, yT, cz, w0, w1, hF, c.or, c.mOr, seed);
  const d = demiA(w0, w1, hF, hF * 0.1);
  plaques4(c, d, d, yT + hF * 0.1, hs * 0.14, w0 * 0.4);
  for (const k of [0.38, 0.58, 0.78]) {
    const half = demiA(w0, w1, hF, hF * k) + rb * 0.03;
    box(g, cx - half, yT + hF * k, cz - half, cx + half, yT + hF * k + hs * 0.012, cz + half, { c: c.orClair, m: c.mOr, seed });
  }
  const yS = yT + hF;
  box(g, cx - rb * 0.1, yS, cz - rb * 0.1, cx + rb * 0.1, yS + hs * 0.06, cz + rb * 0.1, { c: LANTERNE, m: MAT.LAMP, seed });
  tronc(g, cx, yS + hs * 0.06, cz, rb * 0.14, rb * 0.1, hs * 0.015, c.orClair, c.mOr, seed);
  const yG = yS + hs * 0.075;
  ellipsoide(g, cx, yG + hs * 0.05, cz, hs * 0.05, hs * 0.05, hs * 0.05, c.orClair, c.mOr);
  tronc(g, cx, yG + hs * 0.1, cz, rb * 0.04, 0, yb + 0.98 * hs - (yG + hs * 0.1), c.orClair, c.mOr, seed);
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
      lampadaire(c.g, c.cx + sx * d, c.yPied, c.cz + sz * d, c.hs * 0.3, { fut: c.orSombre, pied: c.pierre, lanterne: LANTERNE, echelle: E, seed: c.seed });
    }
}

export function buildMonument(g: Geo, cx: number, cz: number, type: string, palier: number, ao: TamponAO[], seed: number) {
  const rSocle = (1.1 + Math.min(palier, 8) * 0.12) * E;
  const h = (1.6 + Math.min(palier, 8) * 0.55) * E;
  const y0 = 0.15;
  const epaisseurSocle = 0.3 * E;

  const niveau = rangMonument(palier);
  const t = Math.min(Math.max(palier, 0), 15) / 15;
  const orBase = couleurMetal(t);
  // Le matériau brillant (MAT.PAINT) éclaircit sa couleur (tint = base × 1,3 + 0,1) : un or poli
  // à pleine couleur tourne au jaune citron, on le fonce donc d'autant pour qu'il reste de l'or.
  const or = niveau === 0 ? orBase : shadeC(orBase, niveau === 1 ? 0.8 : 0.7);
  // Pierre chaude pour les modestes, qui tire vers le marbre clair avec le palier ; les corps de
  // monument (« grès ») sont teintés d'or pour que la signature dorée se lise dès le premier regard.
  const pierre = mixer(PIERRE, MARBRE, t);
  // Marches : plus il y en a, plus le monument est posé. L'épaisseur totale est celle de l'ancien socle
  // pour le rang modeste (0,75 m) ; la hauteur utile s'en déduit pour que le sommet reste à celle du palier.
  const nMarches = niveau + 1;
  const epMarche = [0.3, 0.22, 0.2][niveau] * E;
  const { haut: yb, rayon: rb } = marchesRondes(g, cx, y0, cz, rSocle, nMarches, epMarche, pierre, 0.11);

  const ctx: Ctx = {
    g,
    cx,
    cz,
    seed,
    niveau,
    r: rSocle,
    rb,
    yb,
    yPied: y0 + epMarche,
    hs: y0 + epaisseurSocle + h - yb,
    or,
    orSombre: shadeC(or, 0.72),
    orClair: shadeC(or, 1.15),
    mOr: niveau === 0 ? MAT.PLAIN : MAT.PAINT,
    pierre,
    gres: mixer(pierre, orBase, 0.55),
  };
  (FORMES[type] ?? GENERIQUES[hashType(type) % GENERIQUES.length])(ctx);
  if (niveau === 2) lampesDAngle(ctx);

  ao.push({ x0: cx - rSocle, z0: cz - rSocle, x1: cx + rSocle, z1: cz + rSocle, w: 1, h });
}
