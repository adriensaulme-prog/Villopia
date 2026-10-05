/**
 * Briques communes des 18 mégaprojets (docs/A-INTEGRER.md §44) : tout ce que
 * `box()` et `cylinder()` de geometrie.ts ne savent pas faire seuls (quad et
 * triangle quelconques, toit à deux pans de matière libre, voûte horizontale,
 * gradins et murs ovales), plus le repère du site. Mêmes conventions que
 * geometrie.ts : un sommet est (position, normale, couleur, matériau, u, v,
 * graine) ; la scène dessine en DoubleSide, donc le sens de rotation des faces
 * n'a pas d'importance, seule la normale compte pour la lumière.
 */
import type { RNG } from "./aleatoire";
import type { Rect } from "./catalogue";
import { COL, MAT, PANNEAU_CADRE, PANNEAU_CELLULE, type Couleur } from "./constantes";
import { box, cylinder, norm, type Geo } from "./geometrie";
import { ellipsoide } from "./monumentsFormes";

export type V3 = [number, number, number];

/**
 * Le site d'un mégaprojet : le centre de la cour (cx, cz), le demi-côté de son
 * emprise carrée `R` et la hauteur `H` dont il dispose. Les modèles se dessinent
 * en FRACTIONS de R et de H (voir `zone()` et `haut()`), jamais en mètres : la
 * même silhouette se calcule donc à n'importe quel stade.
 */
export interface Site {
  g: Geo;
  cx: number;
  cz: number;
  R: number;
  H: number;
  r: RNG;
  seed: number;
}

/** Niveau du sol (comme le reste de la ville) et dessus de la plateforme pavée sur laquelle tout est posé. */
export const SOL = 0.15;
export const BASE = SOL + 0.12;

/** Rectangle du site, en fractions de R : (a0, b0) → (a1, b1), a le long de x, b le long de z. */
export function zone(s: Site, a0: number, b0: number, a1: number, b1: number): Rect {
  return [s.cx + a0 * s.R, s.cz + b0 * s.R, s.cx + a1 * s.R, s.cz + b1 * s.R];
}

/** Altitude à la fraction `f` de la hauteur du site, au-dessus de la plateforme. */
export function haut(s: Site, f: number): number {
  return BASE + f * s.H;
}

/** Position le long de x (ou z) à la fraction `a` de R. */
export const px = (s: Site, a: number) => s.cx + a * s.R;
export const pz = (s: Site, b: number) => s.cz + b * s.R;

/** Plateforme carrée dallée, de l'emprise du mégaprojet : l'empreinte au sol, d'un seul tenant. */
export function plateforme(s: Site, dessus: Couleur = COL.paving, flanc: Couleur = COL.stone) {
  box(s.g, s.cx - s.R, SOL, s.cz - s.R, s.cx + s.R, BASE, s.cz + s.R, {
    c: flanc,
    m: MAT.PLAIN,
    topM: MAT.PAVING,
    topC: dessus,
    seed: s.seed,
  });
}

/** Boîte sur un rectangle du site. */
export function volume(s: Site, r: Rect, y0: number, y1: number, o: Parameters<typeof box>[7]) {
  box(s.g, r[0], y0, r[1], r[2], y1, r[3], { seed: s.seed, base: y0, ...o });
}

function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/** Normale du plan (a, b, d), retournée si besoin pour regarder du côté de `vers`. */
function normale(a: V3, b: V3, d: V3, vers: V3): V3 {
  const n = norm(cross(sub(b, a), sub(d, a)));
  return n[0] * vers[0] + n[1] * vers[1] + n[2] * vers[2] < 0 ? [-n[0], -n[1], -n[2]] : n;
}

/** Quad quelconque (a, b, c, d dans l'ordre du contour) ; `vers` oriente la normale (côté éclairé). */
export function quad(g: Geo, a: V3, b: V3, c: V3, d: V3, col: Couleur, m: number, vers: V3, seed = 0) {
  const n = normale(a, b, d, vers);
  const lu = Math.hypot(...sub(b, a)),
    lv = Math.hypot(...sub(d, a));
  g.q(
    g.v(...a, ...n, col, m, 0, 0, seed),
    g.v(...b, ...n, col, m, lu, 0, seed),
    g.v(...c, ...n, col, m, lu, lv, seed),
    g.v(...d, ...n, col, m, 0, lv, seed)
  );
}

/** Triangle quelconque (pignon, nez de train, aile). */
export function tri(g: Geo, a: V3, b: V3, c: V3, col: Couleur, m: number, vers: V3, seed = 0) {
  const n = normale(a, b, c, vers);
  g.t(
    g.v(...a, ...n, col, m, 0, 0, seed),
    g.v(...b, ...n, col, m, Math.hypot(...sub(b, a)), 0, seed),
    g.v(...c, ...n, col, m, 0, Math.hypot(...sub(c, a)), seed)
  );
}

/**
 * Toit à deux pans de matière libre (gableRoof() de geometrie.ts ne sait faire que des tuiles) :
 * égout à `yE`, faîtage à `yR`, faîtage le long de X si `alongX`, sinon le long de Z ;
 * pignons triangulaires pleins de la matière `wallM`.
 */
export function toit2pans(
  g: Geo,
  r: Rect,
  yE: number,
  yR: number,
  alongX: boolean,
  roofC: Couleur,
  roofM: number,
  wallC: Couleur,
  wallM: number,
  seed = 0,
  debord = 0
) {
  const [x0, z0, x1, z1] = r;
  const xc = (x0 + x1) / 2,
    zc = (z0 + z1) / 2,
    d = debord;
  if (alongX) {
    quad(g, [x0 - d, yE, z0 - d], [x1 + d, yE, z0 - d], [x1 + d, yR, zc], [x0 - d, yR, zc], roofC, roofM, [0, 1, -1], seed);
    quad(g, [x0 - d, yE, z1 + d], [x1 + d, yE, z1 + d], [x1 + d, yR, zc], [x0 - d, yR, zc], roofC, roofM, [0, 1, 1], seed);
    tri(g, [x0, yE, z0], [x0, yE, z1], [x0, yR, zc], wallC, wallM, [-1, 0, 0], seed);
    tri(g, [x1, yE, z0], [x1, yE, z1], [x1, yR, zc], wallC, wallM, [1, 0, 0], seed);
  } else {
    quad(g, [x0 - d, yE, z0 - d], [x0 - d, yE, z1 + d], [xc, yR, z1 + d], [xc, yR, z0 - d], roofC, roofM, [-1, 1, 0], seed);
    quad(g, [x1 + d, yE, z0 - d], [x1 + d, yE, z1 + d], [xc, yR, z1 + d], [xc, yR, z0 - d], roofC, roofM, [1, 1, 0], seed);
    tri(g, [x0, yE, z0], [x1, yE, z0], [xc, yR, z0], wallC, wallM, [0, 0, -1], seed);
    tri(g, [x0, yE, z1], [x1, yE, z1], [xc, yR, z1], wallC, wallM, [0, 0, 1], seed);
  }
}

/**
 * Voûte : demi-cylindre horizontal le long de X, de x0 à x1, centré en z = zc ; `a` est son
 * demi-largeur (le long de z), `b` sa hauteur sous clef. Normales lisses, vers l'extérieur.
 */
export function voute(g: Geo, x0: number, x1: number, zc: number, y0: number, a: number, b: number, seg: number, col: Couleur, m: number, seed = 0) {
  const anneau = (x: number) => {
    const ids: number[] = [];
    for (let i = 0; i <= seg; i++) {
      const t = (Math.PI * i) / seg,
        c = Math.cos(t),
        sn = Math.sin(t);
      const n = norm([0, sn / b, c / a]);
      ids.push(g.v(x, y0 + b * sn, zc + a * c, n[0], n[1], n[2], col, m, x, t * a, seed));
    }
    return ids;
  };
  const r0 = anneau(x0),
    r1 = anneau(x1);
  for (let i = 0; i < seg; i++) g.q(r0[i], r0[i + 1], r1[i + 1], r1[i]);
}

/** Fermeture plane d'une voûte (pignon vitré, mur de bout) : demi-disque elliptique en x = `x`. */
export function boutVoute(g: Geo, x: number, zc: number, y0: number, a: number, b: number, seg: number, col: Couleur, m: number, sens: 1 | -1, seed = 0) {
  const n: V3 = [sens, 0, 0];
  const ctr = g.v(x, y0, zc, ...n, col, m, 0, 0, seed);
  const rim: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const t = (Math.PI * i) / seg;
    rim.push(g.v(x, y0 + b * Math.sin(t), zc + a * Math.cos(t), ...n, col, m, a * Math.cos(t), b * Math.sin(t), seed));
  }
  for (let i = 0; i < seg; i++) g.t(ctr, rim[i], rim[i + 1]);
}

type CouleurOuFn = Couleur | ((i: number) => Couleur);
const teinte = (c: CouleurOuFn, i: number): Couleur => (typeof c === "function" ? c(i) : c);

/** Mur vertical en ellipse (rx, rz) de y0 à y1, tourné vers l'extérieur ou vers l'intérieur. */
export function murOvale(g: Geo, cx: number, cz: number, rx: number, rz: number, y0: number, y1: number, seg: number, col: CouleurOuFn, m: number, dehors: boolean, seed = 0) {
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2,
      a1 = ((i + 1) / seg) * Math.PI * 2,
      am = (a0 + a1) / 2;
    const nn = norm([Math.cos(am) / rx, 0, Math.sin(am) / rz]);
    const n: V3 = dehors ? nn : [-nn[0], 0, -nn[2]];
    const c = teinte(col, i);
    g.q(
      g.v(cx + Math.cos(a0) * rx, y0, cz + Math.sin(a0) * rz, ...n, c, m, a0 * rx, 0, seed),
      g.v(cx + Math.cos(a1) * rx, y0, cz + Math.sin(a1) * rz, ...n, c, m, a1 * rx, 0, seed),
      g.v(cx + Math.cos(a1) * rx, y1, cz + Math.sin(a1) * rz, ...n, c, m, a1 * rx, y1 - y0, seed),
      g.v(cx + Math.cos(a0) * rx, y1, cz + Math.sin(a0) * rz, ...n, c, m, a0 * rx, y1 - y0, seed)
    );
  }
}

/**
 * Surface inclinée entre deux ellipses : gradins d'un stade (de l'ellipse intérieure basse à
 * l'ellipse extérieure haute) ou toit-couronne (le contraire). Une couleur par tronçon si `col`
 * est une fonction (alternance de sièges).
 */
export function anneauPente(g: Geo, cx: number, cz: number, rxI: number, rzI: number, yI: number, rxO: number, rzO: number, yO: number, seg: number, col: CouleurOuFn, m: number, seed = 0) {
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2,
      a1 = ((i + 1) / seg) * Math.PI * 2;
    quad(
      g,
      [cx + Math.cos(a0) * rxI, yI, cz + Math.sin(a0) * rzI],
      [cx + Math.cos(a1) * rxI, yI, cz + Math.sin(a1) * rzI],
      [cx + Math.cos(a1) * rxO, yO, cz + Math.sin(a1) * rzO],
      [cx + Math.cos(a0) * rxO, yO, cz + Math.sin(a0) * rzO],
      teinte(col, i),
      m,
      [0, 1, 0],
      seed
    );
  }
}

/** Mât d'éclairage (stades, pistes, parkings) : fût métallique et tête en `MAT.LAMP`, qui s'allume la nuit. */
export function matLumineux(g: Geo, x: number, z: number, y0: number, h: number, seed = 0) {
  box(g, x - 0.06, y0, z - 0.06, x + 0.06, y0 + h, z + 0.06, { c: COL.metal, m: MAT.PLAIN, seed });
  box(g, x - 0.22, y0 + h, z - 0.09, x + 0.22, y0 + h + 0.13, z + 0.09, { c: [1, 0.96, 0.85], m: MAT.LAMP, seed });
}

/** Petit arbre (tronc et houppier lisse) : verdure des abords. */
export function arbre(g: Geo, x: number, z: number, h: number, feuillage: Couleur, seed = 0) {
  cylinder(g, x, BASE, z, Math.max(0.05, h * 0.05), h * 0.5, 6, COL.trunk, MAT.TRUNK, null, null);
  ellipsoide(g, x, BASE + h * 0.72, z, h * 0.3, h * 0.3, h * 0.3, feuillage, MAT.FOLIAGE);
  void seed;
}

/** Rangées de panneaux solaires inclinés posées sur un toit plat (bâtiments modernes). */
export function panneauxSurToit(g: Geo, x0: number, z0: number, x1: number, z1: number, y: number, rangs: number, seed = 0) {
  const pas = (z1 - z0) / rangs;
  for (let k = 0; k < rangs; k++) {
    const za = z0 + k * pas + pas * 0.12,
      zb = za + pas * 0.62;
    quad(g, [x0, y + 0.05, za], [x1, y + 0.05, za], [x1, y + 0.05 + pas * 0.3, zb], [x0, y + 0.05 + pas * 0.3, zb], PANNEAU_CELLULE, MAT.PLAIN, [0, 1, -0.6], seed);
    box(g, x0, y, za, x1, y + 0.06, za + 0.05, { c: PANNEAU_CADRE, m: MAT.PLAIN, top: false, seed });
  }
}

/**
 * Réutilise un modèle déjà dessiné (Énergie) à une autre échelle : `construire` le dessine
 * autour de l'origine (0, 0) à sa taille d'origine, puis tout ce qu'il vient d'ajouter à `g`
 * est réduit de `echelle` et posé en (x, z), le sol du modèle devenant le dessus de la
 * plateforme. Les normales ne bougent pas (échelle uniforme) ; les coordonnées de texture non
 * plus : elles gardent la taille réelle des motifs.
 */
export function reutiliser(g: Geo, x: number, z: number, echelle: number, construire: () => void) {
  const depuis = g.V.length;
  construire();
  for (let i = depuis; i < g.V.length; i += 13) {
    g.V[i] = x + g.V[i] * echelle;
    g.V[i + 1] = BASE + g.V[i + 1] * echelle;
    g.V[i + 2] = z + g.V[i + 2] * echelle;
  }
}
