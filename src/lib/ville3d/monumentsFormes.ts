/**
 * Formes de base des monuments (docs/A-INTEGRER.md §43). Tout ce que
 * `box()` et `cylinder()` de geometrie.ts ne savent pas faire seuls : tronc
 * de pyramide (obélisques, piédestaux effilés), arche, disque vertical
 * (cadrans, soleils), ellipsoïde lisse (têtes, dômes, croupes), plaques
 * d'inscription, marches. Mêmes conventions que geometrie.ts : un sommet est
 * (position, normale, couleur, matériau, u, v, graine), la scène dessine en
 * DoubleSide donc le sens de rotation des faces n'a pas d'importance.
 */
import type { Couleur } from "./constantes";
import { COL, MAT } from "./constantes";
import { box, cylinder, norm, type Geo } from "./geometrie";

export type Face = "+z" | "-z" | "+x" | "-x";

export function mixer(a: Couleur, b: Couleur, t: number): Couleur {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * Ellipsoïde lisse (méridiens et parallèles, normales exactes) : têtes, dômes, croupes de cheval, globes.
 * Depuis le §49 les monuments font jusqu'à 60 m : l'icosphère de 42 sommets qu'on utilisait avant se
 * voyait facettée dès qu'un dôme dépassait quelques mètres.
 */
export function ellipsoide(g: Geo, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, c: Couleur, m: number, nLon = 14, nLat = 8) {
  const lignes: number[][] = [];
  for (let j = 0; j <= nLat; j++) {
    const phi = -Math.PI / 2 + (Math.PI * j) / nLat;
    const cp = Math.cos(phi),
      sp = Math.sin(phi);
    const ligne: number[] = [];
    for (let i = 0; i <= nLon; i++) {
      const th = (2 * Math.PI * i) / nLon;
      const ux = cp * Math.cos(th),
        uz = cp * Math.sin(th),
        uy = sp;
      const n = norm([ux / rx, uy / ry, uz / rz]);
      ligne.push(g.v(cx + ux * rx, cy + uy * ry, cz + uz * rz, n[0], n[1], n[2], c, m, 0, 0, 0));
    }
    lignes.push(ligne);
  }
  for (let j = 0; j < nLat; j++) for (let i = 0; i < nLon; i++) g.q(lignes[j][i], lignes[j][i + 1], lignes[j + 1][i + 1], lignes[j + 1][i]);
}

/**
 * Tronc de pyramide à base rectangulaire : demi-côtés (w0, p0) en bas, (w1, p1)
 * en haut ; p0/p1 valent w0/w1 par défaut (base carrée). w1 = p1 = 0 donne une
 * pyramide ; w1 > w0 un volume qui s'évase vers le haut (épaules d'un colosse).
 */
export function tronc(
  g: Geo,
  cx: number,
  y0: number,
  cz: number,
  w0: number,
  w1: number,
  h: number,
  c: Couleur,
  m: number,
  seed = 0,
  p0 = w0,
  p1 = w1
) {
  const y1 = y0 + h;
  const xa0 = cx - w0,
    xa1 = cx + w0,
    za0 = cz - p0,
    za1 = cz + p0;
  const xb0 = cx - w1,
    xb1 = cx + w1,
    zb0 = cz - p1,
    zb1 = cz + p1;
  const sx = w0 - w1,
    sz = p0 - p1;
  const sw = seed + Math.min(2 * w0, 99) / 100;
  const sp = seed + Math.min(2 * p0, 99) / 100;
  let n = norm([0, sz, -h]);
  g.q(
    g.v(xa0, y0, za0, n[0], n[1], n[2], c, m, 0, 0, sw),
    g.v(xa1, y0, za0, n[0], n[1], n[2], c, m, 2 * w0, 0, sw),
    g.v(xb1, y1, zb0, n[0], n[1], n[2], c, m, 2 * w1, h, sw),
    g.v(xb0, y1, zb0, n[0], n[1], n[2], c, m, 0, h, sw)
  );
  n = norm([0, sz, h]);
  g.q(
    g.v(xa1, y0, za1, n[0], n[1], n[2], c, m, 0, 0, sw),
    g.v(xa0, y0, za1, n[0], n[1], n[2], c, m, 2 * w0, 0, sw),
    g.v(xb0, y1, zb1, n[0], n[1], n[2], c, m, 2 * w1, h, sw),
    g.v(xb1, y1, zb1, n[0], n[1], n[2], c, m, 0, h, sw)
  );
  n = norm([-h, sx, 0]);
  g.q(
    g.v(xa0, y0, za1, n[0], n[1], n[2], c, m, 0, 0, sp),
    g.v(xa0, y0, za0, n[0], n[1], n[2], c, m, 2 * p0, 0, sp),
    g.v(xb0, y1, zb0, n[0], n[1], n[2], c, m, 2 * p1, h, sp),
    g.v(xb0, y1, zb1, n[0], n[1], n[2], c, m, 0, h, sp)
  );
  n = norm([h, sx, 0]);
  g.q(
    g.v(xa1, y0, za0, n[0], n[1], n[2], c, m, 0, 0, sp),
    g.v(xa1, y0, za1, n[0], n[1], n[2], c, m, 2 * p0, 0, sp),
    g.v(xb1, y1, zb1, n[0], n[1], n[2], c, m, 2 * p1, h, sp),
    g.v(xb1, y1, zb0, n[0], n[1], n[2], c, m, 0, h, sp)
  );
  if (w1 > 1e-6 && p1 > 1e-6) {
    g.q(
      g.v(xb0, y1, zb0, 0, 1, 0, c, m, xb0, zb0, seed),
      g.v(xb1, y1, zb0, 0, 1, 0, c, m, xb1, zb0, seed),
      g.v(xb1, y1, zb1, 0, 1, 0, c, m, xb1, zb1, seed),
      g.v(xb0, y1, zb1, 0, 1, 0, c, m, xb0, zb1, seed)
    );
  }
}

/** Disque posé verticalement, tourné vers `face` : cadrans d'horloge, soleils, médaillons. */
export function disque(g: Geo, cx: number, cy: number, cz: number, r: number, face: Face, c: Couleur, m: number, seg = 16) {
  const sens = face[0] === "+" ? 1 : -1;
  const n: [number, number, number] = face[1] === "z" ? [0, 0, sens] : [sens, 0, 0];
  const ctr = g.v(cx, cy, cz, n[0], n[1], n[2], c, m, 0, 0, 0);
  const rim: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const dx = Math.cos(a) * r,
      dy = Math.sin(a) * r;
    rim.push(g.v(face[1] === "z" ? cx + dx : cx, cy + dy, face[1] === "z" ? cz : cz + dx, n[0], n[1], n[2], c, m, dx, dy, 0));
  }
  for (let i = 0; i < seg; i++) g.t(ctr, rim[i], rim[i + 1]);
}

/** Un seul quad vertical (un carreau de mur, sans épaisseur) : a..b le long du mur, `plan` = position de la face. */
export function panneau(g: Geo, face: Face, a: number, b: number, y0: number, y1: number, plan: number, c: Couleur, m: number, seed = 0) {
  const sens = face[0] === "+" ? 1 : -1;
  if (face[1] === "z") {
    g.q(
      g.v(a, y0, plan, 0, 0, sens, c, m, 0, 0, seed),
      g.v(b, y0, plan, 0, 0, sens, c, m, b - a, 0, seed),
      g.v(b, y1, plan, 0, 0, sens, c, m, b - a, y1 - y0, seed),
      g.v(a, y1, plan, 0, 0, sens, c, m, 0, y1 - y0, seed)
    );
  } else {
    g.q(
      g.v(plan, y0, a, sens, 0, 0, c, m, 0, 0, seed),
      g.v(plan, y0, b, sens, 0, 0, c, m, b - a, 0, seed),
      g.v(plan, y1, b, sens, 0, 0, c, m, b - a, y1 - y0, seed),
      g.v(plan, y1, a, sens, 0, 0, c, m, 0, y1 - y0, seed)
    );
  }
}

/** Boîte collée sur une face verticale (`plan`), qui en sort de `ep` ; a0..a1 le long du mur. */
export function boite(g: Geo, face: Face, a0: number, a1: number, y0: number, y1: number, plan: number, ep: number, c: Couleur, m: number, seed = 0) {
  const sens = face[0] === "+" ? 1 : -1;
  const p0 = sens > 0 ? plan : plan - ep,
    p1 = sens > 0 ? plan + ep : plan;
  if (face[1] === "z") box(g, a0, y0, p0, a1, y1, p1, { c, m, seed });
  else box(g, p0, y0, a0, p1, y1, a1, { c, m, seed });
}

export interface OptionsPlaque {
  /** Fond de la plaque (sombre : pierre noire, bronze patiné). */
  fond: Couleur;
  /** Couleur des lignes d'« inscription » et du cadre. */
  trait: Couleur;
  mTrait: number;
  /** Cadre doré autour du fond (monuments notables et prestigieux seulement). */
  cadre: boolean;
  /** Nombre de lignes d'inscription (1 à 3). */
  lignes: number;
  seed?: number;
}

const EP_PLAQUE = 0.12;

/**
 * Plaque d'inscription collée sur une face verticale : fond sombre, cadre
 * éventuel et quelques traits qui font « texte » de loin. `centre` est la
 * position le long du mur, `plan` celle de la face.
 */
export function plaque(g: Geo, face: Face, centre: number, plan: number, y0: number, h: number, demi: number, o: OptionsPlaque) {
  const s = o.seed ?? 0;
  const e = EP_PLAQUE;
  if (o.cadre) {
    const f = Math.min(h, demi * 2) * 0.09;
    boite(g, face, centre - demi - f, centre + demi + f, y0 - f, y0 + h + f, plan - 0.02, e, o.trait, o.mTrait, s);
  }
  boite(g, face, centre - demi, centre + demi, y0, y0 + h, plan - 0.02, e * 1.5, o.fond, MAT.PLAIN, s);
  const largeurs = [0.78, 0.58, 0.68];
  for (let i = 0; i < o.lignes; i++) {
    const yc = y0 + h * (o.lignes === 1 ? 0.5 : 0.78 - (0.56 * i) / (o.lignes - 1));
    const lh = h * 0.07;
    const lw = demi * largeurs[i % 3];
    boite(g, face, centre - lw, centre + lw, yc - lh / 2, yc + lh / 2, plan - 0.02, e * 2, o.trait, o.mTrait, s);
  }
}

/**
 * Arche : un anneau d'arc de cercle (180°) extrudé sur `prof`, passage en x
 * (ou en z si `versX`). `ySpring` est la hauteur de la naissance de l'arc.
 * Rond : couronne de rayons rIn à rOut. Carré (`carre`) : le dessus est un
 * rectangle de demi-côté rOut, donc l'arc est percé dans un massif plein
 * (arc de triomphe) ; `seg` doit alors être multiple de 4 pour que les angles
 * de 45° et 135° tombent sur un sommet.
 */
export function arche(
  g: Geo,
  cx: number,
  ySpring: number,
  cz: number,
  rIn: number,
  rOut: number,
  prof: number,
  c: Couleur,
  m: number,
  o: { carre?: boolean; versX?: boolean; seed?: number; seg?: number } = {}
) {
  const seg = o.seg ?? 12;
  const s = o.seed ?? 0;
  const demi = prof / 2;
  const P = (lx: number, ly: number, lz: number): [number, number, number] =>
    o.versX ? [cx + lz, ySpring + ly, cz + lx] : [cx + lx, ySpring + ly, cz + lz];
  const N = (nx: number, ny: number, nz: number): [number, number, number] => (o.versX ? [nz, ny, nx] : [nx, ny, nz]);
  const sommet = (lx: number, ly: number, lz: number, nx: number, ny: number, nz: number) => {
    const p = P(lx, ly, lz),
      n = N(nx, ny, nz);
    return g.v(p[0], p[1], p[2], n[0], n[1], n[2], c, m, lx, ly, s);
  };
  const point = (i: number, ext: boolean): [number, number] => {
    const a = (Math.PI * i) / seg,
      ca = Math.cos(a),
      sa = Math.sin(a);
    if (!ext) return [rIn * ca, rIn * sa];
    if (!o.carre) return [rOut * ca, rOut * sa];
    const k = rOut / Math.max(Math.abs(ca), Math.abs(sa));
    return [k * ca, k * sa];
  };
  for (let i = 0; i < seg; i++) {
    const a0 = (Math.PI * i) / seg,
      a1 = (Math.PI * (i + 1)) / seg;
    const [ix0, iy0] = point(i, false),
      [ix1, iy1] = point(i + 1, false);
    const [ox0, oy0] = point(i, true),
      [ox1, oy1] = point(i + 1, true);
    for (const [lz, nz] of [
      [-demi, -1],
      [demi, 1],
    ]) {
      g.q(sommet(ix0, iy0, lz, 0, 0, nz), sommet(ox0, oy0, lz, 0, 0, nz), sommet(ox1, oy1, lz, 0, 0, nz), sommet(ix1, iy1, lz, 0, 0, nz));
    }
    // Intrados : la normale regarde vers l'axe du passage.
    g.q(
      sommet(ix0, iy0, -demi, -Math.cos(a0), -Math.sin(a0), 0),
      sommet(ix1, iy1, -demi, -Math.cos(a1), -Math.sin(a1), 0),
      sommet(ix1, iy1, demi, -Math.cos(a1), -Math.sin(a1), 0),
      sommet(ix0, iy0, demi, -Math.cos(a0), -Math.sin(a0), 0)
    );
    // Extrados : radial pour un anneau rond, plat (côté ou dessus) pour un massif carré.
    if (o.carre) {
      const am = (a0 + a1) / 2;
      const [nx, ny] = Math.abs(Math.cos(am)) > Math.abs(Math.sin(am)) ? [Math.sign(Math.cos(am)), 0] : [0, 1];
      g.q(sommet(ox0, oy0, -demi, nx, ny, 0), sommet(ox1, oy1, -demi, nx, ny, 0), sommet(ox1, oy1, demi, nx, ny, 0), sommet(ox0, oy0, demi, nx, ny, 0));
    } else {
      g.q(
        sommet(ox0, oy0, -demi, Math.cos(a0), Math.sin(a0), 0),
        sommet(ox1, oy1, -demi, Math.cos(a1), Math.sin(a1), 0),
        sommet(ox1, oy1, demi, Math.cos(a1), Math.sin(a1), 0),
        sommet(ox0, oy0, demi, Math.cos(a0), Math.sin(a0), 0)
      );
    }
  }
}

/**
 * Marches rondes concentriques, chacune plus étroite que la précédente. Même
 * dallage que l'ancien socle (côté en `PLAIN`, dessus en `PAVING`). Renvoie la
 * hauteur du dessus et le rayon de la dernière marche.
 */
export function marchesRondes(g: Geo, cx: number, y0: number, cz: number, r: number, n: number, e: number, c: Couleur, retrait: number) {
  let y = y0,
    rayon = r;
  for (let i = 0; i < n; i++) {
    rayon = r * (1 - retrait * i);
    cylinder(g, cx, y, cz, rayon, e, 16, c, MAT.PLAIN, MAT.PAVING, COL.paving);
    y += e;
  }
  return { haut: y, rayon };
}

/** Marches rectangulaires concentriques (temple, mur). Renvoie la hauteur du dessus. */
export function marchesCarrees(g: Geo, cx: number, y0: number, cz: number, hx: number, hz: number, n: number, e: number, c: Couleur, retrait: number, seed = 0) {
  let y = y0;
  for (let i = 0; i < n; i++) {
    const dx = Math.max(hx - retrait * i, 0.1),
      dz = Math.max(hz - retrait * i, 0.1);
    box(g, cx - dx, y, cz - dz, cx + dx, y + e, cz + dz, { c, m: MAT.PLAIN, topM: MAT.PAVING, topC: COL.paving, seed });
    y += e;
  }
  return y;
}

/**
 * Lampadaire : pied de pierre, fût, lanterne en `MAT.LAMP` (elle s'allume la
 * nuit comme les lampadaires de la ville) et petit chapeau. `h` est la hauteur
 * totale au-dessus de y0.
 */
export function lampadaire(
  g: Geo,
  x: number,
  y0: number,
  z: number,
  h: number,
  o: { fut: Couleur; pied: Couleur; lanterne: Couleur; echelle: number; seed?: number }
) {
  const e = o.echelle,
    seed = o.seed ?? 0;
  const hPied = 0.35 * e,
    hLant = 0.55 * e,
    hChap = 0.18 * e;
  box(g, x - 0.12 * e, y0, z - 0.12 * e, x + 0.12 * e, y0 + hPied, z + 0.12 * e, { c: o.pied, m: MAT.PLAIN, seed });
  const yFut = y0 + hPied,
    yLant = y0 + h - hLant - hChap;
  cylinder(g, x, yFut, z, 0.045 * e, yLant - yFut, 8, o.fut, MAT.PLAIN, null, null, 0.035 * e);
  box(g, x - 0.1 * e, yLant, z - 0.1 * e, x + 0.1 * e, yLant + hLant, z + 0.1 * e, { c: o.lanterne, m: MAT.LAMP, seed });
  tronc(g, x, yLant + hLant, z, 0.13 * e, 0.02 * e, hChap, o.fut, MAT.PLAIN, seed);
}

/** Flamme (braséro, torche, lanterne sommitale) : un cône émissif, qui brille la nuit comme le feu rouge des tours. */
export function flamme(g: Geo, cx: number, y0: number, cz: number, r: number, h: number, c: Couleur) {
  cylinder(g, cx, y0, cz, r, h, 8, c, MAT.BEACON, null, null, 0);
}

/**
 * Colonne : plinthe, fût légèrement effilé (`seg` pans), chapiteau et abaque. `r` est le rayon du fût
 * en bas, `h` la hauteur totale.
 */
export function colonne(g: Geo, x: number, y0: number, z: number, r: number, h: number, c: Couleur, m: number, seed = 0, seg = 12, chapiteau: Couleur = c) {
  const hBase = h * 0.07,
    hChap = h * 0.08,
    hAb = h * 0.03;
  box(g, x - r * 1.35, y0, z - r * 1.35, x + r * 1.35, y0 + hBase, z + r * 1.35, { c, m, seed });
  cylinder(g, x, y0 + hBase, z, r, h - hBase - hChap - hAb, seg, c, m, null, null, r * 0.86);
  const yc = y0 + h - hChap - hAb;
  cylinder(g, x, yc, z, r * 0.86, hChap, seg, chapiteau, m, null, null, r * 1.2);
  box(g, x - r * 1.45, yc + hChap, z - r * 1.45, x + r * 1.45, yc + hChap + hAb, z + r * 1.45, { c: chapiteau, m, seed });
}

/** Balustrade le long d'un segment parallèle à un axe : lisse basse, lisse haute et balustres tous les `pas` mètres. */
export function balustrade(g: Geo, xa: number, za: number, xb: number, zb: number, y0: number, h: number, c: Couleur, m: number, seed = 0, pas = 0.9) {
  const selonX = Math.abs(xb - xa) >= Math.abs(zb - za);
  const L = selonX ? Math.abs(xb - xa) : Math.abs(zb - za);
  const n = Math.max(1, Math.round(L / pas));
  const ep = Math.max(0.1, h * 0.09);
  const posee = (t: number, y1: number, y2: number, demi: number) => {
    const x = selonX ? Math.min(xa, xb) + t : xa,
      z = selonX ? za : Math.min(za, zb) + t;
    box(g, x - demi, y1, z - demi, x + demi, y2, z + demi, { c, m, seed });
  };
  const lisse = (y1: number, y2: number, demi: number) => {
    if (selonX) box(g, Math.min(xa, xb), y1, za - demi, Math.max(xa, xb), y2, za + demi, { c, m, seed });
    else box(g, xa - demi, y1, Math.min(za, zb), xa + demi, y2, Math.max(za, zb), { c, m, seed });
  };
  lisse(y0, y0 + h * 0.12, ep * 0.9);
  lisse(y0 + h * 0.88, y0 + h, ep);
  for (let k = 0; k <= n; k++) posee((L * k) / n, y0, y0 + h, k === 0 || k === n ? ep * 1.2 : ep * 0.55);
}

// --------------------------------------------------------------------------
// Briques pour les formes atypiques (retour d'Adrien du 05/10/2026 : « plus de détail et atypiques ») :
// membres inclinés (bras, jambes, rayons), tores (anneaux), tour vrillée.
// --------------------------------------------------------------------------

export type V3 = [number, number, number];

const sous = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const croix = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unitaire = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** Deux axes unitaires perpendiculaires à `axe` (qui est supposé unitaire). */
function baseOrthogonale(axe: V3): [V3, V3] {
  const ref: V3 = Math.abs(axe[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const ex = unitaire(croix(ref, axe));
  const ey = croix(axe, ex);
  return [ex, ey];
}

/**
 * Membre : un cylindre effilé entre deux points quelconques (`a` de rayon `ra`, `b` de rayon `rb`), avec ses
 * calottes si demandé. Bras, jambes, rayons, hampes, pattes de cheval : tout ce que `cylinder()` (vertical) et
 * `tronc()` (à base rectangulaire) ne savent pas faire quand la pièce est penchée.
 */
export function membre(g: Geo, a: V3, b: V3, ra: number, rb: number, c: Couleur, m: number, o: { seg?: number; calotteA?: boolean; calotteB?: boolean; seed?: number } = {}) {
  const seg = o.seg ?? 8;
  const s = o.seed ?? 0;
  const d = sous(b, a);
  const L = Math.hypot(d[0], d[1], d[2]);
  if (L < 1e-9) return;
  const axe = unitaire(d);
  const [ex, ey] = baseOrthogonale(axe);
  const anneauA: number[] = [],
    anneauB: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const t = (i / seg) * Math.PI * 2;
    const r: V3 = [Math.cos(t) * ex[0] + Math.sin(t) * ey[0], Math.cos(t) * ex[1] + Math.sin(t) * ey[1], Math.cos(t) * ex[2] + Math.sin(t) * ey[2]];
    const n = unitaire([r[0] * L + axe[0] * (ra - rb), r[1] * L + axe[1] * (ra - rb), r[2] * L + axe[2] * (ra - rb)]);
    anneauA.push(g.v(a[0] + r[0] * ra, a[1] + r[1] * ra, a[2] + r[2] * ra, n[0], n[1], n[2], c, m, t * ra, 0, s));
    anneauB.push(g.v(b[0] + r[0] * rb, b[1] + r[1] * rb, b[2] + r[2] * rb, n[0], n[1], n[2], c, m, t * ra, L, s));
  }
  for (let i = 0; i < seg; i++) g.q(anneauA[i], anneauA[i + 1], anneauB[i + 1], anneauB[i]);
  const calotte = (p: V3, r: number, sens: number) => {
    const n: V3 = [axe[0] * sens, axe[1] * sens, axe[2] * sens];
    const ctr = g.v(p[0], p[1], p[2], n[0], n[1], n[2], c, m, 0, 0, s);
    const rim: number[] = [];
    for (let i = 0; i <= seg; i++) {
      const t = (i / seg) * Math.PI * 2;
      rim.push(g.v(p[0] + (Math.cos(t) * ex[0] + Math.sin(t) * ey[0]) * r, p[1] + (Math.cos(t) * ex[1] + Math.sin(t) * ey[1]) * r, p[2] + (Math.cos(t) * ex[2] + Math.sin(t) * ey[2]) * r, n[0], n[1], n[2], c, m, 0, 0, s));
    }
    for (let i = 0; i < seg; i++) g.t(ctr, rim[i], rim[i + 1]);
  };
  if (o.calotteA) calotte(a, ra, -1);
  if (o.calotteB) calotte(b, rb, 1);
}

/**
 * Tore : un anneau de rayon `R` et de section circulaire `r`, centré en `c`, dans le plan perpendiculaire à
 * `axe` (anneaux d'une sphère armillaire, orbites autour d'une flèche, couronnes de lauriers).
 */
export function tore(g: Geo, c: V3, R: number, r: number, axe: V3, col: Couleur, m: number, o: { seg?: number; segTube?: number; seed?: number } = {}) {
  const seg = o.seg ?? 28;
  const segT = o.segTube ?? 6;
  const s = o.seed ?? 0;
  const ax = unitaire(axe);
  const [ex, ey] = baseOrthogonale(ax);
  const lignes: number[][] = [];
  for (let i = 0; i <= seg; i++) {
    const t = (i / seg) * Math.PI * 2;
    const radial: V3 = [Math.cos(t) * ex[0] + Math.sin(t) * ey[0], Math.cos(t) * ex[1] + Math.sin(t) * ey[1], Math.cos(t) * ex[2] + Math.sin(t) * ey[2]];
    const ligne: number[] = [];
    for (let j = 0; j <= segT; j++) {
      const p = (j / segT) * Math.PI * 2;
      const n: V3 = [Math.cos(p) * radial[0] + Math.sin(p) * ax[0], Math.cos(p) * radial[1] + Math.sin(p) * ax[1], Math.cos(p) * radial[2] + Math.sin(p) * ax[2]];
      ligne.push(g.v(c[0] + radial[0] * R + n[0] * r, c[1] + radial[1] * R + n[1] * r, c[2] + radial[2] * R + n[2] * r, n[0], n[1], n[2], col, m, t * R, p * r, s));
    }
    lignes.push(ligne);
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < segT; j++) g.q(lignes[i][j], lignes[i + 1][j], lignes[i + 1][j + 1], lignes[i][j + 1]);
}

/**
 * Tour vrillée : une section carrée (demi-côté `w0` en bas, `w1` en haut) qui tourne de `torsion` radians sur la
 * hauteur `h`, en `tranches` tranches dont les couleurs alternent (`c`, puis `c2`). `angle0` est l'angle de la base ;
 * une pyramide qui prolonge la tour part de l'angle où elle s'arrête. Un sommet plat ferme le haut si `w1 > 0`.
 */
export function tourVrillee(
  g: Geo,
  cx: number,
  y0: number,
  cz: number,
  w0: number,
  w1: number,
  h: number,
  torsion: number,
  tranches: number,
  c: Couleur,
  c2: Couleur,
  m: number,
  o: { angle0?: number; seed?: number } = {}
) {
  const a0 = o.angle0 ?? 0;
  const s = o.seed ?? 0;
  const coins = (i: number): [number, number][] => {
    const t = i / tranches;
    const w = (w0 + (w1 - w0) * t) * Math.SQRT2;
    const a = a0 + torsion * t + Math.PI / 4;
    return [0, 1, 2, 3].map((k) => [cx + Math.cos(a + (k * Math.PI) / 2) * w, cz + Math.sin(a + (k * Math.PI) / 2) * w]);
  };
  for (let i = 0; i < tranches; i++) {
    const A = coins(i),
      B = coins(i + 1);
    const ya = y0 + (h * i) / tranches,
      yb = y0 + (h * (i + 1)) / tranches;
    const col = i % 2 ? c2 : c;
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      const p: V3[] = [
        [A[k][0], ya, A[k][1]],
        [A[k2][0], ya, A[k2][1]],
        [B[k2][0], yb, B[k2][1]],
        [B[k][0], yb, B[k][1]],
      ];
      let n = unitaire(croix(sous(p[1], p[0]), sous(p[3], p[0])));
      // La normale regarde vers l'extérieur de la tour.
      const mx = (p[0][0] + p[1][0] + p[2][0] + p[3][0]) / 4 - cx,
        mz = (p[0][2] + p[1][2] + p[2][2] + p[3][2]) / 4 - cz;
      if (n[0] * mx + n[2] * mz < 0) n = [-n[0], -n[1], -n[2]];
      g.q(
        g.v(p[0][0], p[0][1], p[0][2], n[0], n[1], n[2], col, m, 0, 0, s),
        g.v(p[1][0], p[1][1], p[1][2], n[0], n[1], n[2], col, m, w0 * 2, 0, s),
        g.v(p[2][0], p[2][1], p[2][2], n[0], n[1], n[2], col, m, w0 * 2, h / tranches, s),
        g.v(p[3][0], p[3][1], p[3][2], n[0], n[1], n[2], col, m, 0, h / tranches, s)
      );
    }
  }
  if (w1 > 1e-6) {
    const T = coins(tranches);
    const yT = y0 + h;
    const col = tranches % 2 ? c2 : c;
    g.q(
      g.v(T[0][0], yT, T[0][1], 0, 1, 0, col, m, 0, 0, s),
      g.v(T[1][0], yT, T[1][1], 0, 1, 0, col, m, 1, 0, s),
      g.v(T[2][0], yT, T[2][1], 0, 1, 0, col, m, 1, 1, s),
      g.v(T[3][0], yT, T[3][1], 0, 1, 0, col, m, 0, 1, s)
    );
  }
}
