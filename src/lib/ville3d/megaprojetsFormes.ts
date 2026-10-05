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
import { BS, COL, FLOOR_H, MAT, PANNEAU_CADRE, PANNEAU_CELLULE, hex, type Couleur } from "./constantes";
import { box, cylinder, flat, norm, type Geo } from "./geometrie";
import { car, tree } from "./mobilier";

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
  /** Demi-côté le long de z : égal à R, sauf pour un site rectangulaire (A-INTEGRER §49 D). */
  Rz: number;
  H: number;
  r: RNG;
  seed: number;
  /** Halos de lumière au sol (la nuit) : generate() les lit pour sa carte d'occlusion et de lueur ; absent dans les tests isolés. */
  glow?: { x: number; z: number }[];
  /**
   * Niveau du quartier Loisirs de la ville (0 à `NIVEAU_LOISIRS_MAX`, `niveauLoisirs()`) : le Parc d'attractions s'étoffe avec
   * lui (3ᵉ consigne du 05/10/2026). Absent (tests isolés, showroom) = le plus riche.
   */
  niveau?: number;
}

/** Niveau maximal du quartier Loisirs : celui du Parc d'attractions au complet. */
export const NIVEAU_LOISIRS_MAX = 3;

/**
 * Niveau du quartier Loisirs d'une ville, d'après le nombre de stades de loisirs construits dans ses blocs (le second
 * stade de chaque bloc Loisirs, terrain.ts : `buildStade`). Croît avec la ville et ne redescend jamais tant que les
 * vocations ne changent pas : 0 aucun, 1 de un à deux, 2 de trois à cinq, 3 six ou plus.
 */
export function niveauLoisirs(stades: number): number {
  if (stades >= 6) return 3;
  if (stades >= 3) return 2;
  return stades >= 1 ? 1 : 0;
}

/**
 * RÈGLE DE PROPORTION des stades et des parcs (retour d'Adrien du 05/10/2026, 3ᵉ consigne du 05/10/2026 : « le Stade est trop grand »).
 * Un site de loisirs ne doit pas écraser les maisons et les tours autour de lui :
 *  - un stade a une arène de 1 à 1,5 bloc de long, toit compris (`STADE_LONGUEUR_MAX`, 96 m), sur un site de 2 × 1 blocs au
 *    plus ; le Parc d'attractions, le plus grand des deux, tient dans 2 × 2 blocs au plus (`SITES_MULTI_BLOCS`, megaprojets.ts) ;
 *  - sa hauteur reste sous celle des tours voisines : au plus la moitié de la plus petite tour qu'une ville puisse bâtir
 *    (`HAUTEUR_TOUR_MIN`, 14 étages de 3,6 m, terrain.ts : `cap`) pour le Stade, et moins que cette tour pour les attractions
 *    les plus hautes du parc.
 */
export const HAUTEUR_TOUR_MIN = 14 * FLOOR_H;
export const STADE_LONGUEUR_MAX = 1.5 * BS;
export const STADE_HAUTEUR_MAX = HAUTEUR_TOUR_MIN / 2;

/** Niveau du sol (comme le reste de la ville) et dessus de la plateforme pavée sur laquelle tout est posé. */
export const SOL = 0.15;
export const BASE = SOL + 0.12;

/** Rectangle du site, en fractions de R : (a0, b0) → (a1, b1), a le long de x, b le long de z. */
export function zone(s: Site, a0: number, b0: number, a1: number, b1: number): Rect {
  return [s.cx + a0 * s.R, s.cz + b0 * s.Rz, s.cx + a1 * s.R, s.cz + b1 * s.Rz];
}

/** Altitude à la fraction `f` de la hauteur du site, au-dessus de la plateforme. */
export function haut(s: Site, f: number): number {
  return BASE + f * s.H;
}

/** Position le long de x (ou z) à la fraction `a` de R. */
export const px = (s: Site, a: number) => s.cx + a * s.R;
export const pz = (s: Site, b: number) => s.cz + b * s.Rz;

/** Plateforme carrée dallée, de l'emprise du mégaprojet : l'empreinte au sol, d'un seul tenant. */
export function plateforme(s: Site, dessus: Couleur = COL.paving, flanc: Couleur = COL.stone) {
  box(s.g, s.cx - s.R, SOL, s.cz - s.Rz, s.cx + s.R, BASE, s.cz + s.Rz, {
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
export function anneauPente(
  g: Geo,
  cx: number,
  cz: number,
  rxI: number,
  rzI: number,
  yI: number,
  rxO: number,
  rzO: number,
  yO: number,
  seg: number,
  col: CouleurOuFn,
  m: number,
  seed = 0,
  /** Secteur d'angles (radians, 0 = +x, π/2 = +z) : tout l'anneau par défaut. */
  debut = 0,
  fin = Math.PI * 2
) {
  for (let i = 0; i < seg; i++) {
    const a0 = debut + ((fin - debut) * i) / seg,
      a1 = debut + ((fin - debut) * (i + 1)) / seg;
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

/** Mât d'éclairage (stades, pistes, parkings) : fût métallique de 18 cm et couronne de projecteurs en `MAT.LAMP`, qui s'allument la nuit. */
export function matLumineux(g: Geo, x: number, z: number, y0: number, h: number, seed = 0) {
  box(g, x - 0.09, y0, z - 0.09, x + 0.09, y0 + h, z + 0.09, { c: COL.metal, m: MAT.PLAIN, seed });
  box(g, x - 0.9, y0 + h - 0.1, z - 0.12, x + 0.9, y0 + h + 0.55, z + 0.12, { c: [1, 0.96, 0.85], m: MAT.LAMP, seed });
  box(g, x - 0.12, y0 + h - 0.1, z - 0.9, x + 0.12, y0 + h + 0.55, z + 0.9, { c: [1, 0.96, 0.85], m: MAT.LAMP, seed });
}

/** Hauteur d'un étage de bâtiment, en mètres (FLOOR_H de constantes.ts) : les fenêtres du shader suivent ce pas. */
export const ETAGE = 3.6;

/** Arbre de ville aux vraies proportions (4,5 à 7 m, comme ceux des parcelles), au pied de la plateforme. `echelle` 1 = normal. */
export function arbre(g: Geo, x: number, z: number, echelle = 1, r: RNG = () => 0.5) {
  tree(g, x, z, BASE, echelle, r, []);
}

/**
 * Rangée d'arbres de `depuis` à `vers` (le long de X ou de Z) avec un pas d'environ `pas` mètres, sur la
 * ligne `fixe`. Les arbres rapetissent avec la plateforme (un houppier de 2,5 m ne tient pas sur 22 m) et
 * leur pied est ramené à l'intérieur de l'emprise : aucun feuillage ne sort du carré du site.
 */
export function rangeeArbres(s: Site, depuis: number, vers: number, fixe: number, alongX: boolean, pas = 7, echelle = 1) {
  const e = echelle * Math.min(1, s.R / 19);
  const marge = 3.0 * e + 0.2; // houppier principal (≤ 2,5 m) et second houppier décalé (jusqu'à 2,7 m du tronc)
  const dans = (v: number, c: number, R: number) => Math.min(c + R - marge, Math.max(c - R + marge, v));
  const n = Math.max(1, Math.round(Math.abs(vers - depuis) / pas));
  for (let i = 0; i <= n; i++) {
    const t = depuis + ((vers - depuis) * i) / n;
    if (alongX) arbre(s.g, dans(t, s.cx, s.R), dans(fixe, s.cz, s.Rz), e, s.r);
    else arbre(s.g, dans(fixe, s.cx, s.R), dans(t, s.cz, s.Rz), e, s.r);
  }
}

const eclaircir = (c: Couleur, f: number): Couleur => [Math.min(1, c[0] * f), Math.min(1, c[1] * f), Math.min(1, c[2] * f)];

/** Pelouse tondue à plat sur un rectangle, à peine au-dessus de la plateforme. */
export function pelouse(g: Geo, r: Rect, seed = 0, c: Couleur = COL.lawn, dy = 0.012) {
  flat(g, r[0], r[1], r[2], r[3], BASE + dy, c, MAT.LAWN, seed);
}

/** Pelouse rayée par la tonte : `n` bandes alternées de deux verts, le long de X ou de Z. */
export function pelouseRayee(g: Geo, r: Rect, n: number, alongX: boolean, seed = 0, dy = 0.02) {
  const a = COL.lawn,
    b = eclaircir(COL.lawn, 1.1);
  for (let i = 0; i < n; i++) {
    const t0 = i / n,
      t1 = (i + 1) / n;
    const bande: Rect = alongX
      ? [r[0], r[1] + (r[3] - r[1]) * t0, r[2], r[1] + (r[3] - r[1]) * t1]
      : [r[0] + (r[2] - r[0]) * t0, r[1], r[0] + (r[2] - r[0]) * t1, r[3]];
    flat(g, bande[0], bande[1], bande[2], bande[3], BASE + dy, i % 2 ? b : a, MAT.LAWN, seed);
  }
}

/** Allée dallée (plus claire que la plateforme) : chemins, parvis, trottoirs du site. */
export function allee(g: Geo, r: Rect, seed = 0, c: Couleur = hex("#e6dfcf")) {
  flat(g, r[0], r[1], r[2], r[3], BASE + 0.02, c, MAT.PAVING, seed);
}

/**
 * Escalier large : `nb` marches (contremarche 0,17 m, giron 0,34 m) qui descendent depuis la façade
 * (`faceCoord`, sur l'axe z si `sens` est "+z"/"-z", sur l'axe x sinon) vers `sens`, entre `a0` et `a1`.
 */
export function escalier(g: Geo, a0: number, a1: number, faceCoord: number, sens: "+z" | "-z" | "+x" | "-x", nb: number, c: Couleur, seed = 0) {
  const sg = sens[0] === "+" ? 1 : -1;
  for (let i = 0; i < nb; i++) {
    const prof = (nb - i) * 0.34;
    const [d0, d1] = sg > 0 ? [faceCoord, faceCoord + prof] : [faceCoord - prof, faceCoord];
    const yTop = BASE + (nb - i) * 0.17;
    const o = { c, m: MAT.PLAIN, topM: MAT.PAVING, topC: eclaircir(c, 1.05), seed, base: BASE };
    if (sens[1] === "z") box(g, a0, BASE, d0, a1, yTop, d1, o);
    else box(g, d0, BASE, a0, d1, yTop, a1, o);
  }
}

/** Colonne droite à base et chapiteau, de la hauteur `y0` sur `h` mètres. */
export function colonne(g: Geo, x: number, z: number, y0: number, h: number, rayon: number, c: Couleur, seed = 0) {
  box(g, x - rayon * 1.5, y0, z - rayon * 1.5, x + rayon * 1.5, y0 + rayon, z + rayon * 1.5, { c: eclaircir(c, 0.97), m: MAT.PLAIN, seed });
  cylinder(g, x, y0 + rayon, z, rayon, h - 2.4 * rayon, 12, c, MAT.PLAIN, null, null, rayon * 0.88);
  box(g, x - rayon * 1.6, y0 + h - 1.4 * rayon, z - rayon * 1.6, x + rayon * 1.6, y0 + h, z + rayon * 1.6, { c: eclaircir(c, 0.97), m: MAT.PLAIN, seed });
}

/** Acrotère : rebord plein au bord d'un toit plat. */
export function acrotere(g: Geo, r: Rect, y: number, c: Couleur, h = 0.9, e = 0.35, seed = 0) {
  box(g, r[0], y, r[1], r[2], y + h, r[1] + e, { c, m: MAT.PLAIN, top: true, seed });
  box(g, r[0], y, r[3] - e, r[2], y + h, r[3], { c, m: MAT.PLAIN, top: true, seed });
  box(g, r[0], y, r[1] + e, r[0] + e, y + h, r[3] - e, { c, m: MAT.PLAIN, top: true, seed });
  box(g, r[2] - e, y, r[1] + e, r[2], y + h, r[3] - e, { c, m: MAT.PLAIN, top: true, seed });
}

/** Groupes de climatisation et caissons d'extraction sur un toit plat : `n` blocs de tailles variées, tirés avec le générateur du site. */
export function toitureEquipee(s: Site, r: Rect, y: number, n: number) {
  const gris = hex("#aeb3b8");
  for (let i = 0; i < n; i++) {
    const w = 1.6 + s.r() * 2.2,
      d = 1.4 + s.r() * 1.8,
      h = 0.9 + s.r() * 1.3;
    const x = r[0] + 1.2 + s.r() * Math.max(0.5, r[2] - r[0] - 2.4 - w),
      z = r[1] + 1.2 + s.r() * Math.max(0.5, r[3] - r[1] - 2.4 - d);
    box(s.g, x, y, z, x + w, y + h, z + d, { c: gris, m: MAT.PLAIN, seed: s.seed });
    box(s.g, x + w * 0.2, y + h, z + d * 0.2, x + w * 0.8, y + h + 0.12, z + d * 0.8, { c: hex("#6e7378"), m: MAT.PLAIN, seed: s.seed });
  }
}

/** Parking : nappe d'enrobé et rangées de voitures (4,3 m de long) sur un rectangle ; `alongX` donne l'axe des places. */
export function parking(s: Site, r: Rect, alongX: boolean, remplissage = 0.7) {
  const { g } = s;
  flat(g, r[0], r[1], r[2], r[3], BASE + 0.015, hex("#4a4d52"), MAT.PARKING, s.seed);
  const L = 5,
    W = 2.7;
  if (alongX) {
    for (let z = r[1] + 1.6; z + 2 * W + 1.6 < r[3] + 0.01; z += 2 * W + 6)
      for (let k = 0; k < 2; k++) {
        const zc = z + (k ? W : 0) + W / 2;
        for (let x = r[0] + L / 2 + 0.6; x + L / 2 < r[2]; x += L + 0.4) if (s.r() < remplissage) car(g, x, zc, true, s.r, BASE);
      }
  } else {
    for (let x = r[0] + 1.6; x + 2 * W + 1.6 < r[2] + 0.01; x += 2 * W + 6)
      for (let k = 0; k < 2; k++) {
        const xc = x + (k ? W : 0) + W / 2;
        for (let z = r[1] + L / 2 + 0.6; z + L / 2 < r[3]; z += L + 0.4) if (s.r() < remplissage) car(g, xc, z, false, s.r, BASE);
      }
  }
}

/** Voiture isolée posée sur la plateforme. */
export function voiture(s: Site, x: number, z: number, alongX: boolean) {
  car(s.g, x, z, alongX, s.r, BASE);
}

/** Pilastres : `n` poteaux verticaux saillants régulièrement répartis le long d'une façade (axe X ou Z). */
export function pilastres(g: Geo, depuis: number, vers: number, fixe: number, alongX: boolean, y0: number, y1: number, n: number, saillie: number, larg: number, c: Couleur, seed = 0) {
  for (let i = 0; i < n; i++) {
    const t = depuis + ((vers - depuis) * (i + 0.5)) / n;
    if (alongX) box(g, t - larg / 2, y0, fixe, t + larg / 2, y1, fixe + saillie, { c, m: MAT.PLAIN, top: false, seed });
    else box(g, fixe, y0, t - larg / 2, fixe + saillie, y1, t + larg / 2, { c, m: MAT.PLAIN, top: false, seed });
  }
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

/**
 * Surface inclinée entre deux ellipses dont la hauteur varie avec l'angle : toits ondulés des stades modernes,
 * plus hauts au milieu des grands côtés qu'aux extrémités (`yI(a)` au bord intérieur, `yO(a)` au bord extérieur).
 */
export function anneauPenteVar(
  g: Geo,
  cx: number,
  cz: number,
  rxI: number,
  rzI: number,
  yI: (a: number) => number,
  rxO: number,
  rzO: number,
  yO: (a: number) => number,
  seg: number,
  col: CouleurOuFn,
  m: number,
  seed = 0
) {
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2,
      a1 = ((i + 1) / seg) * Math.PI * 2;
    quad(
      g,
      [cx + Math.cos(a0) * rxI, yI(a0), cz + Math.sin(a0) * rzI],
      [cx + Math.cos(a1) * rxI, yI(a1), cz + Math.sin(a1) * rzI],
      [cx + Math.cos(a1) * rxO, yO(a1), cz + Math.sin(a1) * rzO],
      [cx + Math.cos(a0) * rxO, yO(a0), cz + Math.sin(a0) * rzO],
      teinte(col, i),
      m,
      [0, 1, 0],
      seed
    );
  }
}

/**
 * Lampadaire d'un site (retour d'Adrien du 05/10/2026 : « je veux un éclairage de nuit ») : un mât de 5,4 m et une
 * tête en `MAT.LAMP` qui s'allume la nuit, plus un halo de lumière au sol si le site sait où les enregistrer.
 */
export function lampadaireSite(s: Site, x: number, z: number, h = 5.4) {
  const { g } = s;
  box(g, x - 0.07, BASE, z - 0.07, x + 0.07, BASE + h, z + 0.07, { c: hex("#3b4148"), m: MAT.PLAIN, seed: s.seed });
  box(g, x - 0.35, BASE + h - 0.1, z - 0.35, x + 0.35, BASE + h + 0.12, z + 0.35, { c: [1, 0.95, 0.8], m: MAT.LAMP, seed: s.seed });
  s.glow?.push({ x, z });
}

/** Lueur de nuit sur un rectangle (pelouse, parvis, allées) : un halo au sol tous les `pas` mètres, sans géométrie. */
export function eclairerZone(s: Site, r: Rect, pas = 7) {
  if (!s.glow) return;
  for (let x = r[0] + pas / 2; x < r[2]; x += pas) for (let z = r[1] + pas / 2; z < r[3]; z += pas) s.glow.push({ x, z });
}

/**
 * Éclairage commun à tous les mégaprojets : une rangée de lampadaires tout autour de la plateforme (un tous les
 * ~12 m, à 1,3 m du bord), qui éclaire la rue et les abords la nuit.
 */
export function eclairerPourtour(s: Site, pas = 12) {
  const marge = 1.3;
  const nx = Math.max(1, Math.round((2 * (s.R - marge)) / pas)),
    nz = Math.max(1, Math.round((2 * (s.Rz - marge)) / pas));
  for (let i = 0; i <= nx; i++) {
    const x = s.cx - (s.R - marge) + (2 * (s.R - marge) * i) / nx;
    lampadaireSite(s, x, s.cz - (s.Rz - marge));
    lampadaireSite(s, x, s.cz + (s.Rz - marge));
  }
  for (let j = 1; j < nz; j++) {
    const z = s.cz - (s.Rz - marge) + (2 * (s.Rz - marge) * j) / nz;
    lampadaireSite(s, s.cx - (s.R - marge), z);
    lampadaireSite(s, s.cx + (s.R - marge), z);
  }
}
