/**
 * Parc d'attractions (ex-Grand stade, identifiant `grand_stade`) — 3ᵉ consigne du 05/10/2026, retour d'Adrien du 05/10/2026 : « beaucoup
 * plus de détail : une entrée monumentale, de vraies montagnes russes avec rails et wagons, une chute libre, des chaises
 * volantes, un manège, des autos tamponneuses, des allées sinueuses, un éclairage de nuit, plusieurs dispositions selon la
 * graine ; il s'étoffe avec le niveau du quartier Loisirs ».
 *
 * Un site de 2 × 2 blocs (136 m de plateforme, 44 m de haut au plus : sous la plus petite tour, megaprojetsFormes.ts).
 *
 * DISPOSITIONS. Deux gabarits (positions des attractions et tracé des allées) × huit symétries (quatre quarts de tour,
 * avec ou sans miroir) = seize parcs différents, tirés de la graine du site : `varianteParc(seed)`. Tout se dessine dans un
 * repère local (x vers l'est, z vers le sud, l'entrée au sud) que le `Pinceau` retourne et fait tourner. Une attraction a
 * son emplacement fixe, quel que soit le niveau : un parc qui s'étoffe n'ajoute que des choses, il ne déplace rien.
 *
 * NIVEAU DU QUARTIER LOISIRS (`Site.niveau`, 0 à 3, `niveauLoisirs()` de megaprojets.ts) :
 *   0  l'entrée monumentale, la fontaine, les allées, un carrousel, la grande roue, le chapiteau, des stands ;
 *   1  + les montagnes russes (rails, wagons, looping) et les chaises volantes ;
 *   2  + la chute libre et les autos tamponneuses ;
 *   3  + le bateau pirate, le lac et ses pédalos, les parterres de fleurs et les guirlandes.
 * Sans niveau (tests, showroom) : le plus riche.
 *
 * Éclairage de nuit : ampoules de couleur (`MAT.BEACON`, qui brille de sa propre couleur) sur chaque attraction,
 * lampadaires allumés (`MAT.LAMP`) le long de chaque allée, halos au sol (`Site.glow`). Aucune marque, aucun texte.
 */
import { rngFrom, type RNG } from "./aleatoire";
import { COL, MAT, hex, type Couleur } from "./constantes";
import { box, cylinder, flat } from "./geometrie";
import {
  BASE,
  NIVEAU_LOISIRS_MAX,
  anneauPente,
  arbre,
  eclairerZone,
  plateforme,
  quad,
  type Site,
  type V3,
} from "./megaprojetsFormes";
import { circuitMontagnes, catmullRom, EMPRISE_MONTAGNES, type P3 } from "./montagnesRusses";
import { ellipsoide, membre, tore } from "./monumentsFormes";

// ---------------------------------------------------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------------------------------------------------

const BLANC = hex("#f4f1ea");
const ARGENT = hex("#c9d0d6");
const EAU = hex("#5aa9d6");
const PIERRE = hex("#d9cdb4");
const CHEMIN = hex("#f3d9a8");
const BORDURE = hex("#b9a98a");
const GAI: Couleur[] = [hex("#e84a5f"), hex("#ffbe3d"), hex("#2f9ee8"), hex("#52c17a"), hex("#9b59d0"), hex("#ff8c42")];
const OR = hex("#f0c040");
const ACIER = hex("#6a7480");

// ---------------------------------------------------------------------------------------------------------------------
// Niveau du quartier Loisirs et variante
// ---------------------------------------------------------------------------------------------------------------------

/** Variante du parc : le gabarit (0 ou 1) et la symétrie (0 à 7) que tire la graine du site. Fonction pure. */
export function varianteParc(seed: number): { gabarit: number; symetrie: number } {
  const n = Math.abs(Math.floor(seed));
  return { gabarit: n % 2, symetrie: Math.floor(n / 2) % 8 };
}

/** Nombre de dispositions différentes (gabarits × symétries). */
export const NB_DISPOSITIONS_PARC = 16;

// ---------------------------------------------------------------------------------------------------------------------
// Pinceau : dessine dans le repère local du parc, retourné et tourné selon la symétrie
// ---------------------------------------------------------------------------------------------------------------------

class Pinceau {
  constructor(
    readonly s: Site,
    readonly k: number
  ) {}

  /** (x, z) local → décalage par rapport au centre du site. */
  rel(x: number, z: number): [number, number] {
    const mx = this.k & 4 ? -x : x;
    switch (this.k & 3) {
      case 1:
        return [-z, mx];
      case 2:
        return [-mx, -z];
      case 3:
        return [z, -mx];
      default:
        return [mx, z];
    }
  }
  mon(x: number, z: number): [number, number] {
    const [a, b] = this.rel(x, z);
    return [this.s.cx + a, this.s.cz + b];
  }
  /** Point 3D du monde ; `y` est une hauteur au-dessus de la plateforme. */
  v(x: number, y: number, z: number): V3 {
    const [a, b] = this.mon(x, z);
    return [a, BASE + y, b];
  }
  dir(d: V3): V3 {
    const [a, b] = this.rel(d[0], d[2]);
    return [a, d[1], b];
  }
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, o: Omit<Parameters<typeof box>[7], "seed">) {
    const [a, b] = this.mon(x0, z0),
      [c, d] = this.mon(x1, z1);
    box(this.s.g, Math.min(a, c), BASE + y0, Math.min(b, d), Math.max(a, c), BASE + y1, Math.max(b, d), { seed: this.s.seed, ...o });
  }
  cyl(x: number, y: number, z: number, r: number, h: number, seg: number, c: Couleur, m: number, topM: number | null = null, topC: Couleur | null = null, rTop?: number) {
    const [a, b] = this.mon(x, z);
    cylinder(this.s.g, a, BASE + y, b, r, h, seg, c, m, topM, topC, rTop);
  }
  membre(a: V3, b: V3, ra: number, rb: number, c: Couleur, m: number, o: { seg?: number; calotteA?: boolean; calotteB?: boolean } = {}) {
    membre(this.s.g, this.v(...a), this.v(...b), ra, rb, c, m, { seed: this.s.seed, ...o });
  }
  tore(c: V3, R: number, r: number, axe: V3, col: Couleur, m: number, o: { seg?: number; segTube?: number } = {}) {
    tore(this.s.g, this.v(...c), R, r, this.dir(axe), col, m, { seed: this.s.seed, ...o });
  }
  ell(x: number, y: number, z: number, rx: number, ry: number, rz: number, c: Couleur, m: number, a = 8, b = 6) {
    const [X, Z] = this.mon(x, z);
    const impair = this.k & 1;
    ellipsoide(this.s.g, X, BASE + y, Z, impair ? rz : rx, ry, impair ? rx : rz, c, m, a, b);
  }
  quad(a: V3, b: V3, c: V3, d: V3, col: Couleur, m: number, vers: V3) {
    quad(this.s.g, this.v(...a), this.v(...b), this.v(...c), this.v(...d), col, m, this.dir(vers), this.s.seed);
  }
  plat(x0: number, z0: number, x1: number, z1: number, y: number, col: Couleur, m: number) {
    const [a, b] = this.mon(x0, z0),
      [c, d] = this.mon(x1, z1);
    flat(this.s.g, Math.min(a, c), Math.min(b, d), Math.max(a, c), Math.max(b, d), BASE + y, col, m, this.s.seed);
  }
  /** Une lueur de nuit au sol. */
  lueur(x: number, z: number) {
    const [a, b] = this.mon(x, z);
    this.s.glow?.push({ x: a, z: b });
  }
  /** Ampoule qui brille la nuit de sa propre couleur. */
  ampoule(x: number, y: number, z: number, col: Couleur, r = 0.2) {
    const e = r * 1.7; // une ampoule de 0,3 m se voit à peine d'en haut : on la grossit
    this.box(x - e, y - e, z - e, x + e, y + e, z + e, { c: col, m: MAT.BEACON });
  }
  /** Lampadaire d'allée : un mât de 4,4 m et une tête allumée la nuit, plus sa lueur. */
  lampe(x: number, z: number, h = 4.4) {
    this.box(x - 0.07, 0, z - 0.07, x + 0.07, h, z + 0.07, { c: hex("#3b4148"), m: MAT.PLAIN });
    this.box(x - 0.34, h - 0.1, z - 0.34, x + 0.34, h + 0.12, z + 0.34, { c: [1, 0.95, 0.8], m: MAT.LAMP });
    this.lueur(x, z);
  }
  arbre(x: number, z: number, e: number, r: RNG) {
    const [a, b] = this.mon(x, z);
    arbre(this.s.g, a, b, e, r);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Gabarits : où est quoi (repère local, l'entrée au sud : z = +60)
// ---------------------------------------------------------------------------------------------------------------------

type Pt = [number, number];

interface Gabarit {
  montagnes: Pt; // coin nord-ouest de l'emprise de 52 × 44 m
  roue: Pt;
  tour: Pt;
  chaises: Pt;
  carrousel: Pt;
  autos: Pt; // centre d'un hall de 24 × 18 m
  cirque: Pt;
  pirate: Pt;
  lac: Pt;
  /** Allées : points de contrôle, du plus proche de l'entrée au plus loin. */
  allees: Pt[][];
  /** Où va le chemin qui mène à la gare des montagnes russes. */
  gare: Pt;
}

const FONTAINE: Pt = [0, 36];
/** Axe z des deux tours de l'entrée : le parvis, les guichets et les barrières de file d'attente tiennent entre 56 et 66 m. */
const ENTREE_Z = 56;

/** Boucle autour de la fontaine, de l'entrée au carrefour central. */
const PROMENADE: Pt[][] = [
  [[0, 53], [-9, 48], [-15, 38], [-11, 28], [-3, 19], [0, 10]],
  [[0, 53], [9, 48], [15, 38], [11, 28], [3, 19], [0, 10]],
];

const GABARITS: Gabarit[] = [
  {
    montagnes: [-62, -60],
    roue: [44, -36],
    tour: [54, 4],
    chaises: [40, 28],
    carrousel: [-36, 26],
    autos: [20, -6],
    cirque: [14, -46],
    pirate: [-46, 50],
    lac: [44, 54],
    gare: [-54, -13],
    allees: [
      ...PROMENADE,
      [[0, 10], [0, 4], [-14, 2], [-30, -2], [-46, -8], [-54, -13]],
      [[0, 4], [5, 2], [8, -2]],
      [[0, 4], [4, -10], [8, -22], [12, -32], [14, -37]],
      [[0, 10], [14, 10], [28, 6], [38, -4], [44, -19]],
      [[38, -4], [48, 0], [53, 3]],
      [[3, 19], [14, 26], [26, 28], [29, 28]],
      [[-3, 19], [-14, 24], [-26, 26], [-29, 26]],
      [[-15, 38], [-26, 47], [-37, 50]],
      [[15, 38], [26, 47], [33, 52]],
    ],
  },
  {
    montagnes: [-66, -6],
    roue: [40, -36],
    tour: [56, -6],
    chaises: [40, 34],
    carrousel: [-40, -40],
    autos: [22, 6],
    cirque: [-8, -46],
    pirate: [-44, 54],
    lac: [46, 56],
    gare: [-57, 37],
    allees: [
      ...PROMENADE,
      [[0, 10], [0, 0]],
      [[-15, 38], [-26, 41], [-38, 43], [-52, 41], [-57, 37]],
      [[0, 0], [-10, -10], [-22, -24], [-32, -34], [-37, -37]],
      [[0, 0], [-3, -14], [-6, -26], [-8, -36]],
      [[0, 0], [6, 3], [9, 5]],
      [[0, 0], [10, -14], [22, -20], [34, -22], [40, -21]],
      [[22, -20], [36, -16], [48, -12], [56, -9]],
      [[3, 19], [14, 28], [26, 32], [29, 33]],
      [[-9, 48], [-24, 52], [-33, 54]],
      [[9, 48], [26, 52], [32, 55]],
    ],
  },
];

/** Disques et rectangles réservés aux attractions (aucun arbre dedans), qu'elles soient construites ou non. */
function zonesReservees(gb: Gabarit): { x: number; z: number; rx: number; rz: number }[] {
  const L = EMPRISE_MONTAGNES;
  return [
    { x: gb.montagnes[0] + L.largeur / 2, z: gb.montagnes[1] + L.profondeur / 2, rx: L.largeur / 2 + 2, rz: L.profondeur / 2 + 2 },
    { x: gb.roue[0], z: gb.roue[1], rx: 18, rz: 18 },
    { x: gb.tour[0], z: gb.tour[1], rx: 7, rz: 7 },
    { x: gb.chaises[0], z: gb.chaises[1], rx: 13, rz: 13 },
    { x: gb.carrousel[0], z: gb.carrousel[1], rx: 11, rz: 11 },
    { x: gb.autos[0], z: gb.autos[1], rx: 15, rz: 11 },
    { x: gb.cirque[0], z: gb.cirque[1], rx: 13, rz: 13 },
    { x: gb.pirate[0], z: gb.pirate[1], rx: 14, rz: 9 },
    { x: gb.lac[0], z: gb.lac[1], rx: 16, rz: 10 },
    { x: FONTAINE[0], z: FONTAINE[1], rx: 12, rz: 12 },
    { x: 0, z: 57, rx: 34, rz: 10 }, // l'entrée et son parvis
  ];
}

// ---------------------------------------------------------------------------------------------------------------------
// Allées sinueuses
// ---------------------------------------------------------------------------------------------------------------------

/** Courbe lisse (Catmull-Rom centripète) à travers les points de contrôle, un point tous les ~2 m. */
function lisser(pts: Pt[], pas = 2): Pt[] {
  const c: P3[] = pts.map(([x, z]) => [x, 0, z]);
  const ext = [c[0], ...c, c[c.length - 1]];
  const sortie: Pt[] = [];
  for (let i = 1; i < ext.length - 2; i++) {
    const L = Math.hypot(ext[i + 1][0] - ext[i][0], ext[i + 1][2] - ext[i][2]);
    const m = Math.max(2, Math.round(L / pas));
    for (let k = 0; k < m; k++) {
      const p = catmullRom(ext[i - 1], ext[i], ext[i + 1], ext[i + 2], k / m);
      sortie.push([p[0], p[2]]);
    }
  }
  sortie.push(pts[pts.length - 1]);
  return sortie;
}

/** Ruban dallé le long d'une courbe, avec sa bordure de pierre. */
function ruban(P: Pinceau, courbe: Pt[], largeur: number, y: number, col: Couleur, m: number) {
  for (let i = 0; i + 1 < courbe.length; i++) {
    const a = courbe[Math.max(0, i - 1)],
      b = courbe[i],
      c = courbe[i + 1],
      d = courbe[Math.min(courbe.length - 1, i + 2)];
    const normale = (p: Pt, q: Pt): Pt => {
      const t = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      return [-(q[1] - p[1]) / t, (q[0] - p[0]) / t];
    };
    const n0 = normale(a, c),
      n1 = normale(b, d);
    const w = largeur / 2;
    P.quad([b[0] + n0[0] * w, y, b[1] + n0[1] * w], [b[0] - n0[0] * w, y, b[1] - n0[1] * w], [c[0] - n1[0] * w, y, c[1] - n1[1] * w], [c[0] + n1[0] * w, y, c[1] + n1[1] * w], col, m, [0, 1, 0]);
  }
}

/** Dessine une allée (bordure + dallage), place un lampadaire tous les ~15 m en alternant les côtés, et rend les points de la courbe. */
function allee(P: Pinceau, pts: Pt[], largeur = 4): Pt[] {
  const courbe = lisser(pts);
  ruban(P, courbe, largeur + 1.1, 0.022, BORDURE, MAT.PAVING);
  ruban(P, courbe, largeur, 0.034, CHEMIN, MAT.PAVING);
  let cote = 1;
  for (let i = 6; i < courbe.length - 2; i += 7) {
    const p = courbe[i],
      q = courbe[i + 1];
    const t = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    P.lampe(p[0] - ((q[1] - p[1]) / t) * (largeur / 2 + 1.3) * cote, p[1] + ((q[0] - p[0]) / t) * (largeur / 2 + 1.3) * cote);
    cote = -cote;
  }
  return courbe;
}

// ---------------------------------------------------------------------------------------------------------------------
// Entrée monumentale, fontaine, parvis
// ---------------------------------------------------------------------------------------------------------------------

function entree(P: Pinceau, niveau: number) {
  const zE = ENTREE_Z;
  // Parvis dallé, de part et d'autre de l'entrée.
  P.plat(-34, 47, 34, 66.5, 0.018, hex("#efe6d2"), MAT.PAVING);
  P.plat(-32, 49, 32, 65, 0.03, hex("#f7f0e0"), MAT.PAVING);
  // Deux tours rayées à coupole, une poutre-enseigne éclairée, l'emblème doré (anneau, étoile) : pas un mot, pas une marque.
  for (const sg of [-1, 1]) {
    const x = sg * 12.5;
    P.box(x - 3.2, 0, zE - 3.2, x + 3.2, 18, zE + 3.2, { c: BLANC, m: MAT.PLAIN });
    for (const [y0, y1, c] of [
      [0.6, 2.4, GAI[sg > 0 ? 0 : 2]],
      [6, 7.2, GAI[1]],
      [11.5, 12.7, GAI[sg > 0 ? 0 : 2]],
      [16.2, 17.4, GAI[1]],
    ] as const)
      P.box(x - 3.45, y0, zE - 3.45, x + 3.45, y1, zE + 3.45, { c, m: MAT.PAINT });
    P.ell(x, 19.4, zE, 3.9, 2.9, 3.9, GAI[sg > 0 ? 0 : 2], MAT.PAINT, 12, 8);
    P.membre([x, 21.6, zE], [x, 26, zE], 0.14, 0.05, COL.metal, MAT.PLAIN, { seg: 5 });
    P.quad([x, 26, zE], [x + sg * 3, 25.4, zE], [x + sg * 3, 24, zE], [x, 24.4, zE], GAI[1], MAT.PAINT, [0, 0.3, 1]);
    for (const [dx, dz] of [[-3.3, -3.3], [3.3, -3.3], [-3.3, 3.3], [3.3, 3.3]] as const) for (let y = 3; y < 17; y += 3.4) P.ampoule(x + dx, y, zE + dz, GAI[(y / 3) % GAI.length | 0], 0.17);
  }
  P.box(-12.5, 12.2, zE - 1.7, 12.5, 15.6, zE + 1.7, { c: GAI[1], m: MAT.BEACON });
  P.box(-12.5, 11.4, zE - 1.1, 12.5, 12.2, zE + 1.1, { c: BLANC, m: MAT.PLAIN });
  for (let k = 0; k < 26; k++) for (const dz of [-1.78, 1.78]) P.ampoule(-12.2 + k * 0.98, 14, zE + dz, GAI[k % GAI.length], 0.15);
  P.tore([0, 20, zE], 4.2, 0.34, [0, 0, 1], OR, MAT.BEACON, { seg: 30, segTube: 5 });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    P.membre([0, 20, zE], [Math.cos(a) * 3.9, 20 + Math.sin(a) * 3.9, zE], 0.16, 0.1, OR, MAT.PAINT, { seg: 4 });
  }
  P.ell(0, 20, zE, 1.3, 1.3, 1.3, GAI[0], MAT.BEACON, 10, 6);
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    for (const dz of [-0.6, 0.6]) P.ampoule(Math.cos(a) * 4.7, 20 + Math.sin(a) * 4.7, zE + dz, GAI[k % GAI.length], 0.14);
  }
  P.box(-12.5, 15.6, zE - 1.4, 12.5, 16.2, zE + 1.4, { c: OR, m: MAT.PAINT });
  // Guichets rayés de part et d'autre, tourniquets et barrières de file d'attente devant la porte.
  for (const sg of [-1, 1])
    for (let k = 0; k < 2; k++) {
      const x = sg * (20 + k * 5.4);
      P.box(x - 1.5, 0, zE - 1.4, x + 1.5, 2.8, zE + 1.4, { c: BLANC, m: MAT.PLAIN });
      P.box(x - 2, 2.8, zE - 1.9, x + 2, 3.3, zE + 1.9, { c: GAI[(k + (sg > 0 ? 1 : 0)) % 2 ? 0 : 2], m: MAT.PAINT });
      P.box(x - 1.1, 1.1, zE - 1.45, x + 1.1, 2.1, zE - 1.38, { c: hex("#9fc4d6"), m: MAT.GLASS });
      P.ampoule(x - 1.7, 3.1, zE + 1.95, GAI[(k + 3) % GAI.length], 0.14);
      P.ampoule(x + 1.7, 3.1, zE + 1.95, GAI[(k + 4) % GAI.length], 0.14);
    }
  for (let k = -3; k <= 3; k++) P.box(k * 1.9 - 0.2, 0, zE + 4.6, k * 1.9 + 0.2, 1.1, zE + 5, { c: ACIER, m: MAT.PLAIN });
  P.box(-6, 1.05, zE + 4.66, 6, 1.12, zE + 4.94, { c: ACIER, m: MAT.PLAIN });
  for (const sg of [-1, 1]) {
    for (let k = 0; k < 4; k++) P.box(sg * 9.5 - 0.1, 0, zE + 5 + k * 1.6, sg * 9.5 + 0.1, 1.1, zE + 5.2 + k * 1.6, { c: ACIER, m: MAT.PLAIN });
    P.box(sg * 9.5 - 0.05, 1.05, zE + 5, sg * 9.5 + 0.05, 1.12, zE + 9.4, { c: ACIER, m: MAT.PLAIN });
  }
  // Mâts à fanions le long du parvis.
  for (const x of [-30, -22, 22, 30]) {
    P.membre([x, 0, zE + 5], [x, 10, zE + 5], 0.12, 0.07, COL.metal, MAT.PLAIN, { seg: 5 });
    P.quad([x, 10, zE + 5], [x + 2.4, 9.6, zE + 5], [x + 2.4, 8.4, zE + 5], [x, 8.8, zE + 5], GAI[((x + 30) / 8) % GAI.length | 0], MAT.PAINT, [0, 0.3, 1]);
    P.ampoule(x, 10.3, zE + 5, GAI[(x + 40) % GAI.length | 0], 0.18);
  }
  if (niveau >= 3)
    for (const sg of [-1, 1])
      for (const [x0, z0, x1, z1] of [[sg * 15, 50, sg * 25, 53], [sg * 15, 60.5, sg * 24, 63.5]] as const) {
        const [a, b] = x0 < x1 ? [x0, x1] : [x1, x0];
        P.box(a, 0, z0, b, 0.5, z1, { c: hex("#8a6b4a"), m: MAT.PLAIN });
        for (let k = 0; k < Math.floor((b - a) / 1.4); k++) {
          const c = GAI[(k + (sg > 0 ? 2 : 0)) % GAI.length];
          P.box(a + 0.2 + k * 1.4, 0.5, z0 + 0.3, a + 1.3 + k * 1.4, 0.95, z1 - 0.3, { c, m: MAT.PAINT });
        }
      }
}

function fontaine(P: Pinceau, niveau: number) {
  const [fx, fz] = FONTAINE;
  const [wx, wz] = P.mon(fx, fz);
  anneauPente(P.s.g, wx, wz, 7.6, 7.6, BASE + 0.03, 11.2, 11.2, BASE + 0.03, 28, hex("#f3e8cf"), MAT.PAVING, P.s.seed);
  P.cyl(fx, 0, fz, 7.8, 0.9, 28, PIERRE, MAT.PLAIN, MAT.WATER, EAU);
  P.cyl(fx, 0.9, fz, 2.4, 1.8, 14, ARGENT, MAT.PLAIN, MAT.PLAIN, ARGENT, 1.4);
  P.cyl(fx, 2.7, fz, 4.2, 0.4, 20, PIERRE, MAT.PLAIN, MAT.WATER, EAU);
  P.cyl(fx, 3.1, fz, 1.1, 2, 10, ARGENT, MAT.PLAIN, MAT.PLAIN, ARGENT, 0.7);
  P.cyl(fx, 5.1, fz, 0.2, 5.5, 6, EAU, MAT.WATER, null, null, 0.04);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    P.membre([fx + Math.cos(a) * 5.6, 0.9, fz + Math.sin(a) * 5.6], [fx + Math.cos(a) * 3.4, 4.1, fz + Math.sin(a) * 3.4], 0.1, 0.05, EAU, MAT.WATER, { seg: 4 });
  }
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    P.ampoule(fx + Math.cos(a) * 7.8, 1.1, fz + Math.sin(a) * 7.8, GAI[k % GAI.length], 0.17);
  }
  P.lueur(fx + 9, fz);
  P.lueur(fx - 9, fz);
  P.lueur(fx, fz + 9);
  P.lueur(fx, fz - 9);
  if (niveau >= 3) for (let k = 0; k < 12; k++) {
    const a = ((k + 0.5) / 12) * Math.PI * 2;
    P.box(fx + Math.cos(a) * 9.6 - 0.5, 0, fz + Math.sin(a) * 9.6 - 0.5, fx + Math.cos(a) * 9.6 + 0.5, 0.45, fz + Math.sin(a) * 9.6 + 0.5, { c: GAI[k % GAI.length], m: MAT.PAINT });
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Attractions
// ---------------------------------------------------------------------------------------------------------------------

/** Grande roue : deux jantes, seize rayons croisés, douze nacelles, deux pieds en A, des guirlandes d'ampoules. */
function grandeRoue(P: Pinceau, wx: number, wz: number) {
  const Rw = 15,
    yH = Rw + 3.6;
  for (const dz of [-1.1, 1.1]) {
    P.tore([wx, yH, wz + dz], Rw, 0.4, [0, 0, 1], BLANC, MAT.PLAIN, { seg: 36, segTube: 4 });
    P.tore([wx, yH, wz + dz], Rw * 0.5, 0.22, [0, 0, 1], GAI[2], MAT.BEACON, { seg: 24, segTube: 4 });
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      P.membre([wx, yH, wz + dz], [wx + Math.cos(a) * Rw, yH + Math.sin(a) * Rw, wz + dz], 0.14, 0.1, ARGENT, MAT.PLAIN, { seg: 4 });
    }
  }
  P.membre([wx, yH, wz - 2], [wx, yH, wz + 2], 0.95, 0.95, GAI[0], MAT.PAINT, { seg: 8, calotteA: true, calotteB: true });
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const x = wx + Math.cos(a) * Rw,
      y = yH + Math.sin(a) * Rw;
    P.box(x - 1, y - 2.5, wz - 1.1, x + 1, y - 0.5, wz + 1.1, { c: GAI[k % GAI.length], m: MAT.PAINT });
    P.box(x - 1.1, y - 0.5, wz - 1.2, x + 1.1, y - 0.3, wz + 1.2, { c: BLANC, m: MAT.PLAIN });
    P.membre([x, y, wz], [x, y - 0.5, wz], 0.07, 0.07, ARGENT, MAT.PLAIN, { seg: 4 });
  }
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2;
    for (const dz of [-1.1, 1.1]) P.ampoule(wx + Math.cos(a) * (Rw + 0.5), yH + Math.sin(a) * (Rw + 0.5), wz + dz, GAI[k % GAI.length], 0.15);
  }
  for (const dz of [-3, 3]) for (const sx of [-1, 1]) P.membre([wx + sx * 11, 0, wz + dz], [wx, yH, wz + dz * 0.55], 0.6, 0.42, BLANC, MAT.PLAIN, { seg: 6 });
  P.box(wx - 12.5, 0, wz - 4.5, wx + 12.5, 0.4, wz + 4.5, { c: PIERRE, m: MAT.PAVING });
  P.lueur(wx - 8, wz + 5);
  P.lueur(wx + 8, wz + 5);
}

/** Montagnes russes : la voie (deux rails, une poutre, des traverses), ses piles, la gare, un train de cinq wagons. */
function montagnesRusses(P: Pinceau, coin: Pt, niveau: number, r: RNG) {
  const brut = circuitMontagnes(1.7);
  const pts: P3[] = brut.map(([x, y, z]) => [coin[0] + x, y, coin[1] + z]);
  const n = pts.length;
  const lat: P3[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i + n - 1) % n],
      b = pts[(i + 1) % n];
    const tx = b[0] - a[0],
      tz = b[2] - a[2];
    const plan = Math.hypot(tx, tz);
    let l: P3 = plan > 0.45 ? [-tz / plan, 0, tx / plan] : i > 0 ? lat[i - 1] : [0, 0, 1];
    if (i > 0 && l[0] * lat[i - 1][0] + l[2] * lat[i - 1][2] < 0) l = [-l[0], 0, -l[2]];
    lat.push(l);
  }
  const rail = GAI[0];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = pts[i],
      b = pts[j];
    for (const sg of [-0.62, 0.62]) P.membre([a[0] + lat[i][0] * sg, a[1], a[2] + lat[i][2] * sg], [b[0] + lat[j][0] * sg, b[1], b[2] + lat[j][2] * sg], 0.13, 0.13, rail, MAT.PAINT, { seg: 4 });
    P.membre([a[0], a[1] - 0.55, a[2]], [b[0], b[1] - 0.55, b[2]], 0.17, 0.17, hex("#8fc4ff"), MAT.BEACON, { seg: 4 });
    if (i % 2 === 0) P.membre([a[0] + lat[i][0] * 0.78, a[1] - 0.1, a[2] + lat[i][2] * 0.78], [a[0] - lat[i][0] * 0.78, a[1] - 0.1, a[2] - lat[i][2] * 0.78], 0.07, 0.07, ACIER, MAT.PLAIN, { seg: 3 });
    // piles : une toutes les quatre mailles, plus fines au ras du sol
    if (i % 4 === 0 && a[1] > 2.6) {
      const e = a[1] > 12 ? 0.3 : 0.22;
      P.box(a[0] - e, 0, a[2] - e, a[0] + e, a[1] - 0.7, a[2] + e, { c: BLANC, m: MAT.PLAIN });
      if (i % 12 === 0) P.ampoule(a[0], a[1] + 0.45, a[2], GAI[(i / 12) % GAI.length | 0], 0.2);
      if (a[1] > 9 && i % 8 === 0) {
        const s = lat[i];
        P.membre([a[0] + s[0] * 0.5, a[1] - 0.7, a[2] + s[2] * 0.5], [a[0] + s[0] * 2.1, 0, a[2] + s[2] * 2.1], 0.12, 0.2, BLANC, MAT.PLAIN, { seg: 4 });
        P.membre([a[0] - s[0] * 0.5, a[1] - 0.7, a[2] - s[2] * 0.5], [a[0] - s[0] * 2.1, 0, a[2] - s[2] * 2.1], 0.12, 0.2, BLANC, MAT.PLAIN, { seg: 4 });
      }
    }
  }
  // La gare : quai, toit léger sur quatre piliers, bandeau de LED.
  const gx0 = coin[0] + 4.5,
    gx1 = coin[0] + 17,
    gz = coin[1] + 40;
  P.box(gx0, 0, gz - 3.2, gx1, 1.15, gz - 1.2, { c: PIERRE, m: MAT.PAVING });
  P.box(gx0, 0, gz + 1.2, gx1, 1.15, gz + 3.2, { c: PIERRE, m: MAT.PAVING });
  P.box(gx0 - 0.5, 5.6, gz - 3.8, gx1 + 0.5, 6.2, gz + 3.8, { c: GAI[2], m: MAT.PAINT });
  P.box(gx0 - 0.5, 6.2, gz - 3.8, gx1 + 0.5, 6.5, gz + 3.8, { c: BLANC, m: MAT.PLAIN });
  for (const x of [gx0, gx1]) for (const z of [gz - 3.4, gz + 3.4]) P.box(x - 0.25, 0, z - 0.25, x + 0.25, 5.6, z + 0.25, { c: BLANC, m: MAT.PLAIN });
  for (let k = 0; k < 14; k++) for (const dz of [-3.9, 3.9]) P.ampoule(gx0 + k * ((gx1 - gx0) / 13), 5.9, gz + dz, GAI[k % GAI.length], 0.15);
  // Le train : cinq wagons de 2,3 m, au sortir de la gare, deux places par wagon.
  const i0 = Math.round(n * 0.05);
  const couleurs = [GAI[0], GAI[1], GAI[2], GAI[3], GAI[4]];
  for (let w = 0; w < 5; w++) {
    const a = pts[i0 + w * 2],
      b = pts[i0 + w * 2 + 2];
    P.membre([a[0], a[1] + 0.62, a[2]], [b[0], b[1] + 0.62, b[2]], 0.66, 0.66, couleurs[w], MAT.PAINT, { seg: 6, calotteA: true, calotteB: true });
    const c: P3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 1.2, (a[2] + b[2]) / 2];
    for (const s of [-0.28, 0.28]) P.ell(c[0] + lat[i0 + w * 2 + 1][0] * s, c[1], c[2] + lat[i0 + w * 2 + 1][2] * s, 0.2, 0.22, 0.2, w % 2 ? hex("#f2c9a0") : hex("#d9a37a"), MAT.PAINT, 6, 4);
  }
  if (niveau >= 3) {
    // une seconde rame, plus loin sur la voie, dans le vallon avant la dernière bosse
    const j0 = Math.round(n * 0.66);
    for (let w = 0; w < 4; w++) {
      const a = pts[(j0 + w * 2) % n],
        b = pts[(j0 + w * 2 + 2) % n];
      P.membre([a[0], a[1] + 0.62, a[2]], [b[0], b[1] + 0.62, b[2]], 0.66, 0.66, couleurs[(w + 2) % 5], MAT.PAINT, { seg: 6, calotteA: true, calotteB: true });
    }
  }
  // Pelouse et fleurs sous le circuit.
  const L = EMPRISE_MONTAGNES;
  P.plat(coin[0], coin[1], coin[0] + L.largeur, coin[1] + L.profondeur, 0.018, hex("#8cbf63"), MAT.LAWN);
  for (let k = 0; k < 14; k++) {
    const x = coin[0] + 6 + r() * (L.largeur - 12),
      z = coin[1] + 6 + r() * (L.profondeur - 14);
    if (z > coin[1] + 34 && x < coin[0] + 20) continue;
    P.box(x - 0.5, 0, z - 0.5, x + 0.5, 0.4, z + 0.5, { c: GAI[k % GAI.length], m: MAT.PAINT });
  }
}

/** Chute libre : un fût en treillis rayé, une nacelle annulaire à huit sièges, un chapeau, une balise. */
function chuteLibre(P: Pinceau, tx: number, tz: number) {
  const H = 36;
  P.cyl(tx, 0, tz, 4.6, 0.5, 20, PIERRE, MAT.PAVING, MAT.PAVING, PIERRE);
  for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]] as const)
    for (let k = 0; k < 6; k++) P.box(tx + dx - 0.28, k * 6, tz + dz - 0.28, tx + dx + 0.28, (k + 1) * 6, tz + dz + 0.28, { c: k % 2 ? BLANC : GAI[0], m: MAT.PAINT });
  for (let k = 0; k < 6; k++) {
    const y0 = k * 6,
      y1 = y0 + 6;
    for (const [ax, az, bx, bz] of [[-1.4, -1.4, 1.4, -1.4], [-1.4, 1.4, 1.4, 1.4], [-1.4, -1.4, -1.4, 1.4], [1.4, -1.4, 1.4, 1.4]] as const) {
      P.membre([tx + ax, y0, tz + az], [tx + bx, y1, tz + bz], 0.07, 0.07, ARGENT, MAT.PLAIN, { seg: 3 });
      P.membre([tx + ax, y1, tz + az], [tx + bx, y0, tz + bz], 0.07, 0.07, ARGENT, MAT.PLAIN, { seg: 3 });
    }
    P.box(tx - 1.75, y1 - 0.1, tz - 1.75, tx + 1.75, y1 + 0.1, tz + 1.75, { c: ACIER, m: MAT.PLAIN });
  }
  // nacelle : un anneau de sièges, à mi-hauteur de la chute
  const yN = 24;
  P.tore([tx, yN, tz], 3.1, 0.5, [0, 1, 0], GAI[1], MAT.PAINT, { seg: 18, segTube: 5 });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const x = tx + Math.cos(a) * 3.1,
      z = tz + Math.sin(a) * 3.1;
    P.box(x - 0.45, yN - 1.6, z - 0.45, x + 0.45, yN - 0.3, z + 0.45, { c: GAI[(k + 2) % GAI.length], m: MAT.PAINT });
    P.membre([x, yN - 0.3, z], [x + Math.cos(a) * 0.5, yN - 1.3, z + Math.sin(a) * 0.5], 0.06, 0.06, ARGENT, MAT.PLAIN, { seg: 3 });
  }
  P.box(tx - 2.6, H, tz - 2.6, tx + 2.6, H + 1.6, tz + 2.6, { c: GAI[2], m: MAT.BEACON });
  P.box(tx - 1.8, H + 1.6, tz - 1.8, tx + 1.8, H + 2.4, tz + 1.8, { c: OR, m: MAT.PAINT });
  P.membre([tx, H + 2.4, tz], [tx, H + 6.4, tz], 0.18, 0.05, COL.metal, MAT.PLAIN, { seg: 5 });
  P.ampoule(tx, H + 6.6, tz, GAI[0], 0.3);
  for (let y = 4; y < H; y += 4) for (const [dx, dz] of [[-2, 0], [2, 0], [0, -2], [0, 2]] as const) P.ampoule(tx + dx, y, tz + dz, GAI[(y / 4) % GAI.length | 0], 0.17);
  P.lueur(tx - 6, tz);
  P.lueur(tx + 6, tz);
}

/** Chaises volantes : un mât, un toit conique, quatorze chaînes et leurs sièges écartés par la rotation. */
function chaisesVolantes(P: Pinceau, kx: number, kz: number) {
  P.cyl(kx, 0, kz, 9.5, 0.5, 24, PIERRE, MAT.PAVING, MAT.PAVING, PIERRE);
  P.cyl(kx, 0.5, kz, 0.9, 20, 8, ARGENT, MAT.PLAIN, null, null, 0.6);
  P.cyl(kx, 18.5, kz, 7.2, 2.3, 18, GAI[2], MAT.BEACON, null, null, 7);
  P.cyl(kx, 20.8, kz, 7, 2.2, 18, GAI[1], MAT.PAINT, null, null, 1.4);
  P.cyl(kx, 23, kz, 1.2, 1.4, 8, GAI[0], MAT.PAINT, null, null, 0.2);
  P.membre([kx, 24.4, kz], [kx, 27.4, kz], 0.1, 0.04, COL.metal, MAT.PLAIN, { seg: 4 });
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const hx = kx + Math.cos(a) * 6.8,
      hz = kz + Math.sin(a) * 6.8;
    const sx = kx + Math.cos(a) * 10.2,
      sz = kz + Math.sin(a) * 10.2;
    P.membre([hx, 18.5, hz], [sx, 8.2, sz], 0.05, 0.05, ARGENT, MAT.PLAIN, { seg: 4 });
    P.box(sx - 0.45, 7.6, sz - 0.45, sx + 0.45, 8.2, sz + 0.45, { c: GAI[k % GAI.length], m: MAT.PAINT });
    P.box(sx - 0.45, 8.2, sz - 0.45, sx + 0.45, 8.9, sz - 0.2, { c: GAI[k % GAI.length], m: MAT.PAINT });
    P.ampoule(hx, 18.3, hz, GAI[(k + 2) % GAI.length], 0.16);
  }
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    P.ampoule(kx + Math.cos(a) * 7.25, 18.6, kz + Math.sin(a) * 7.25, GAI[k % GAI.length], 0.14);
  }
  P.lueur(kx - 7, kz);
  P.lueur(kx + 7, kz);
}

/** Manège : deux rangs de chevaux sur leurs barres, un toit à festons rayés, des miroirs, une couronne d'ampoules. */
function carrousel(P: Pinceau, kx: number, kz: number) {
  P.cyl(kx, 0, kz, 8.2, 0.9, 24, hex("#d9c9a6"), MAT.PLAIN, MAT.PAVING, hex("#d9c9a6"));
  P.cyl(kx, 0.9, kz, 0.8, 6.1, 8, GAI[1], MAT.PAINT, null, null);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    P.box(kx + Math.cos(a) * 1.2 - 0.5, 1.2, kz + Math.sin(a) * 1.2 - 0.5, kx + Math.cos(a) * 1.2 + 0.5, 5.6, kz + Math.sin(a) * 1.2 + 0.5, { c: ARGENT, m: MAT.PLAIN });
  }
  for (const [ray, nb, dec] of [[3.4, 8, 0.5], [5.8, 12, 0]] as const)
    for (let k = 0; k < nb; k++) {
      const a = (k / nb) * Math.PI * 2 + dec;
      const x = kx + Math.cos(a) * ray,
        z = kz + Math.sin(a) * ray;
      const y = 1.6 + (k % 2) * 0.8;
      P.membre([x, 0.9, z], [x, 6.4, z], 0.07, 0.07, ARGENT, MAT.PLAIN, { seg: 4 });
      P.ell(x, y + 0.7, z, 0.95, 0.6, 0.4, GAI[k % GAI.length], MAT.PAINT, 8, 6);
      P.ell(x + Math.cos(a + Math.PI / 2) * 0.75, y + 1.3, z + Math.sin(a + Math.PI / 2) * 0.75, 0.32, 0.32, 0.32, BLANC, MAT.PAINT, 6, 4);
    }
  P.cyl(kx, 6.4, kz, 8.6, 0.9, 24, GAI[0], MAT.BEACON, null, null);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2,
      b = ((k + 1) / 16) * Math.PI * 2;
    P.quad(
      [kx + Math.cos(a) * 8.6, 6.4, kz + Math.sin(a) * 8.6],
      [kx + Math.cos(b) * 8.6, 6.4, kz + Math.sin(b) * 8.6],
      [kx + Math.cos((a + b) / 2) * 8.4, 4.9, kz + Math.sin((a + b) / 2) * 8.4],
      [kx + Math.cos((a + b) / 2) * 8.4, 4.9, kz + Math.sin((a + b) / 2) * 8.4],
      k % 2 ? GAI[1] : BLANC,
      MAT.PAINT,
      [Math.cos((a + b) / 2), 0, Math.sin((a + b) / 2)]
    );
  }
  P.cyl(kx, 7.3, kz, 8.2, 3.6, 24, BLANC, MAT.PAINT, null, null, 0.7);
  P.ell(kx, 11.3, kz, 0.7, 0.7, 0.7, GAI[1], MAT.PAINT, 6, 4);
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2;
    P.ampoule(kx + Math.cos(a) * 8.8, 6.85, kz + Math.sin(a) * 8.8, GAI[k % GAI.length], 0.16);
  }
  P.lueur(kx - 9, kz);
  P.lueur(kx + 9, kz);
}

/** Autos tamponneuses : un hall ouvert à piste lisse, des voitures aux antennes, un toit à bandeau lumineux. */
function autosTamponneuses(P: Pinceau, hx: number, hz: number, r: RNG) {
  const [x0, x1, z0, z1] = [hx - 12, hx + 12, hz - 9, hz + 9];
  P.box(x0, 0, z0, x1, 0.25, z1, { c: hex("#3e4650"), m: MAT.PARKING });
  P.box(x0, 0.25, z0, x1, 0.32, z1, { c: hex("#566170"), m: MAT.PARKING });
  for (const [a, b, c, d] of [[x0, z0, x1, z0 + 0.5], [x0, z1 - 0.5, x1, z1], [x0, z0, x0 + 0.5, z1], [x1 - 0.5, z0, x1, z1]] as const) P.box(a, 0.25, b, c, 1.1, d, { c: GAI[0], m: MAT.PAINT });
  for (const [x, z] of [[x0 + 0.6, z0 + 0.6], [x1 - 0.6, z0 + 0.6], [x0 + 0.6, z1 - 0.6], [x1 - 0.6, z1 - 0.6], [hx, z0 + 0.6], [hx, z1 - 0.6]] as const) P.box(x - 0.3, 0, z - 0.3, x + 0.3, 5.8, z + 0.3, { c: BLANC, m: MAT.PLAIN });
  P.box(x0 - 0.6, 5.8, z0 - 0.6, x1 + 0.6, 6.5, z1 + 0.6, { c: GAI[2], m: MAT.PAINT });
  P.box(x0 - 0.6, 6.5, z0 - 0.6, x1 + 0.6, 6.8, z1 + 0.6, { c: BLANC, m: MAT.PLAIN });
  for (let k = 0; k < 20; k++) for (const [z, dz] of [[z0, -0.7], [z1, 0.7]] as const) P.ampoule(x0 + 0.6 + k * 1.2, 6.15, z + dz, GAI[k % GAI.length], 0.15);
  P.box(x0 + 3, 5.2, z0 + 3, x1 - 3, 5.28, z1 - 3, { c: ACIER, m: MAT.FENCE });
  // une dizaine de voitures, aux positions de la graine, avec leur perche vers le plafond grillagé
  const pos: Pt[] = [];
  for (let k = 0; k < 11; k++) {
    for (let essai = 0; essai < 12; essai++) {
      const x = x0 + 2.4 + r() * (x1 - x0 - 4.8),
        z = z0 + 2.2 + r() * (z1 - z0 - 4.4);
      if (pos.every((p) => Math.hypot(p[0] - x, p[1] - z) > 3.4)) {
        pos.push([x, z]);
        break;
      }
    }
  }
  pos.forEach(([x, z], k) => {
    const a = r() * Math.PI * 2;
    const dx = Math.cos(a) * 0.95,
      dz = Math.sin(a) * 0.95;
    const col = GAI[k % GAI.length];
    P.membre([x - dx, 0.65, z - dz], [x + dx, 0.65, z + dz], 0.62, 0.55, col, MAT.PAINT, { seg: 6, calotteA: true, calotteB: true });
    P.ell(x, 1.35, z, 0.42, 0.34, 0.42, hex("#f2d6b3"), MAT.PAINT, 6, 4);
    P.membre([x - dx * 0.7, 1.1, z - dz * 0.7], [x - dx * 0.7, 5.2, z - dz * 0.7], 0.03, 0.03, ARGENT, MAT.PLAIN, { seg: 3 });
  });
  P.lueur(hx - 8, hz);
  P.lueur(hx + 8, hz);
}

/** Chapiteau : un tambour rouge et blanc, un toit conique, des fanions, une entrée dorée. */
function chapiteau(P: Pinceau, cx: number, cz: number) {
  P.cyl(cx, 0, cz, 10, 4.6, 22, GAI[0], MAT.PAINT, null, null);
  P.cyl(cx, 4.6, cz, 10.1, 1, 22, BLANC, MAT.PAINT, null, null);
  P.cyl(cx, 5.6, cz, 10.2, 6.6, 22, BLANC, MAT.PAINT, null, null, 0.9);
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2;
    P.cyl(cx + Math.cos(a) * 10.4, 0, cz + Math.sin(a) * 10.4, 0.26, 6, 6, GAI[(k % 2) * 2 + 1], MAT.PAINT, null, null);
  }
  P.membre([cx, 12.2, cz], [cx, 16.4, cz], 0.1, 0.06, COL.metal, MAT.PLAIN, { seg: 5 });
  P.quad([cx, 16.4, cz], [cx + 3, 15.9, cz], [cx + 3, 14.6, cz], [cx, 15, cz], GAI[1], MAT.PAINT, [0, 0.3, 1]);
  P.box(cx - 2.2, 0, cz + 9.6, cx + 2.2, 4.4, cz + 10.8, { c: OR, m: MAT.BEACON });
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2;
    P.ampoule(cx + Math.cos(a) * 10.3, 5.1, cz + Math.sin(a) * 10.3, GAI[k % GAI.length], 0.16);
  }
  P.lueur(cx, cz + 12);
}

/** Bateau pirate : deux portiques, un balancier, une coque en croissant en plein élan, un mât et son fanion noir. */
function bateauPirate(P: Pinceau, px: number, pz: number) {
  P.box(px - 11, 0, pz - 6, px + 11, 0.4, pz + 6, { c: PIERRE, m: MAT.PAVING });
  const yP = 12;
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) P.membre([px + sx * 2.6, 0, pz + sz * 5], [px, yP, pz + sz * 1.2], 0.5, 0.34, BLANC, MAT.PLAIN, { seg: 6 });
  P.membre([px, yP, pz - 1.6], [px, yP, pz + 1.6], 0.4, 0.4, ACIER, MAT.PLAIN, { seg: 6 });
  const phi = (38 * Math.PI) / 180,
    Lb = 9.4;
  const hx = px + Math.sin(phi) * Lb,
    hy = yP - Math.cos(phi) * Lb;
  for (const dz of [-1.1, 1.1]) P.membre([px, yP, pz + dz], [hx, hy + 1, pz + dz], 0.15, 0.15, ARGENT, MAT.PLAIN, { seg: 4 });
  const ux = Math.cos(phi),
    uy = Math.sin(phi);
  P.membre([hx - ux * 5.2, hy + 0.5 - uy * 5.2 + 1.4, pz], [hx + ux * 5.2, hy + 0.5 + uy * 5.2 + 1.4, pz], 1.9, 1.9, hex("#7a4a2c"), MAT.PAINT, { seg: 8, calotteA: true, calotteB: true });
  P.membre([hx - ux * 5.2, hy + 0.5 - uy * 5.2 + 2.9, pz], [hx + ux * 5.2, hy + 0.5 + uy * 5.2 + 2.9, pz], 0.5, 0.5, GAI[1], MAT.PAINT, { seg: 4 });
  P.membre([hx, hy + 2.6, pz], [hx - uy * 0.4, hy + 8.4, pz], 0.14, 0.08, hex("#4a3320"), MAT.PAINT, { seg: 4 });
  P.quad([hx - uy * 0.4, hy + 8.4, pz], [hx - uy * 0.4 + 2.2, hy + 8, pz], [hx - uy * 0.4 + 2.2, hy + 6.7, pz], [hx - uy * 0.4, hy + 7.1, pz], hex("#2a2e33"), MAT.PAINT, [0, 0, 1]);
  for (let k = 0; k < 12; k++) P.ampoule(hx + ux * (-4.4 + k * 0.8), hy + uy * (-4.4 + k * 0.8) + 3.2, pz + 1.95, GAI[k % GAI.length], 0.14);
  for (let k = 0; k < 6; k++) P.ampoule(px, yP + 0.4, pz - 1.6 + k * 0.64, GAI[k % GAI.length], 0.15);
  P.lueur(px - 9, pz);
  P.lueur(px + 9, pz);
}

/** Lac et pédalos : une pièce d'eau ovale bordée de pierre, des cygnes, un ponton, des lanternes sur la rive. */
function lac(P: Pinceau, lx: number, lz: number) {
  const [X, Z] = P.mon(lx, lz);
  const impair = P.k & 1;
  const rx = impair ? 8 : 14,
    rz = impair ? 14 : 8;
  anneauPente(P.s.g, X, Z, rx, rz, BASE + 0.03, rx + 1.2, rz + 1.2, BASE + 0.05, 28, BORDURE, MAT.PAVING, P.s.seed);
  anneauPente(P.s.g, X, Z, 0, 0, BASE + 0.045, rx, rz, BASE + 0.045, 28, EAU, MAT.WATER, P.s.seed);
  P.box(lx - 14, 0, lz - 1.2, lx - 10.5, 0.45, lz + 1.2, { c: hex("#8a6b4a"), m: MAT.PLAIN });
  for (const [x, z, c] of [[-3, -2, GAI[0]], [4, 2.5, GAI[2]], [-6, 3, GAI[1]]] as const) {
    P.membre([lx + x - 0.9, 0.5, lz + z], [lx + x + 0.9, 0.5, lz + z], 0.55, 0.5, c, MAT.PAINT, { seg: 6, calotteA: true, calotteB: true });
    P.ell(lx + x - 0.7, 1.5, lz + z, 0.3, 0.9, 0.3, BLANC, MAT.PAINT, 6, 4);
    P.ell(lx + x - 0.7, 2.5, lz + z, 0.34, 0.3, 0.3, BLANC, MAT.PAINT, 6, 4);
  }
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    P.ampoule(lx + Math.cos(a) * (14.6), 0.9, lz + Math.sin(a) * 8.6, GAI[k % GAI.length], 0.16);
    P.lueur(lx + Math.cos(a) * 16, lz + Math.sin(a) * 10);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Le parc
// ---------------------------------------------------------------------------------------------------------------------

/** Parc d'attractions : voir l'en-tête du fichier. */
export function parcAttractions(s: Site) {
  const { g, cx, cz, R, Rz } = s;
  const niveau = Math.max(0, Math.min(NIVEAU_LOISIRS_MAX, Math.round(s.niveau ?? NIVEAU_LOISIRS_MAX)));
  const { gabarit, symetrie } = varianteParc(s.seed);
  const gb = GABARITS[gabarit];
  const P = new Pinceau(s, symetrie);
  const rng = (nom: string) => rngFrom(`${s.seed}|parc|${nom}`);
  plateforme(s, hex("#efe5cf"));

  // Pelouse sur tout le site et lueur de nuit au sol.
  flat(g, cx - R + 1.5, cz - Rz + 1.5, cx + R - 1.5, cz + Rz - 1.5, BASE + 0.012, COL.lawn, MAT.LAWN, s.seed);
  eclairerZone(s, [cx - R + 2, cz - Rz + 2, cx + R - 2, cz + Rz - 2], 9);

  // Les allées sinueuses, puis ce qu'elles desservent.
  const courbes: Pt[][] = [];
  for (const pts of gb.allees) courbes.push(allee(P, pts, pts === gb.allees[0] || pts === gb.allees[1] ? 5 : 3.6));

  entree(P, niveau);
  fontaine(P, niveau);
  carrousel(P, gb.carrousel[0], gb.carrousel[1]);
  grandeRoue(P, gb.roue[0], gb.roue[1]);
  chapiteau(P, gb.cirque[0], gb.cirque[1]);
  if (niveau >= 1) {
    montagnesRusses(P, gb.montagnes, niveau, rng("montagnes"));
    chaisesVolantes(P, gb.chaises[0], gb.chaises[1]);
  }
  if (niveau >= 2) {
    chuteLibre(P, gb.tour[0], gb.tour[1]);
    autosTamponneuses(P, gb.autos[0], gb.autos[1], rng("autos"));
  }
  if (niveau >= 3) {
    bateauPirate(P, gb.pirate[0], gb.pirate[1]);
    lac(P, gb.lac[0], gb.lac[1]);
  }

  // Stands à auvents rayés et bouquets de ballons le long de la promenade, autour du parvis.
  const rs = rng("stands");
  const stands: Pt[] = [[-18, 50], [18, 50], [-19, 36], [19, 36], [-8, 24], [8, 24]];
  stands.forEach(([x, z], k) => {
    P.box(x - 1.8, 0, z - 1.3, x + 1.8, 2.4, z + 1.3, { c: BLANC, m: MAT.PLAIN });
    P.box(x - 2.2, 2.4, z - 1.8, x + 2.2, 2.9, z + 1.8, { c: GAI[k % GAI.length], m: MAT.PAINT });
    P.ampoule(x - 1.6, 2.2, z + 1.35, GAI[(k + 2) % GAI.length], 0.14);
    P.ampoule(x + 1.6, 2.2, z + 1.35, GAI[(k + 3) % GAI.length], 0.14);
  });
  for (const [bx, bz] of [[-6, 52], [6, 52], [-18, 22], [18, 22]] as const)
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rs();
      const top: V3 = [bx + Math.cos(a) * 0.9, 6 + (k % 2) * 0.7, bz + Math.sin(a) * 0.9];
      P.membre([bx, 0.4, bz], top, 0.03, 0.03, ARGENT, MAT.PLAIN, { seg: 3 });
      P.ell(top[0], top[1] + 0.8, top[2], 0.7, 0.85, 0.7, GAI[(k + 1) % GAI.length], MAT.PAINT, 8, 6);
    }

  // Parterres de fleurs (niveau 3).
  if (niveau >= 3) {
    const rf = rng("fleurs");
    for (const sg of [-1, 1]) for (let k = 0; k < 6; k++) {
      const x = sg * (13 + (k % 2) * 3.5),
        z = 10 + k * 4.8;
      P.box(x - 1.6, 0, z - 1.1, x + 1.6, 0.38, z + 1.1, { c: hex("#6b4f34"), m: MAT.PLAIN });
      for (let f = 0; f < 6; f++) P.box(x - 1.4 + f * 0.55, 0.38, z - 0.9 + rf() * 1.8, x - 1.0 + f * 0.55, 0.78, z - 0.5 + rf() * 1.8, { c: GAI[(k + f) % GAI.length], m: MAT.PAINT });
    }
  }

  // Arbres : tirés de la graine, hors des allées et des emplacements réservés (construits ou non).
  const libres = zonesReservees(gb);
  const sentiers = courbes.flat();
  const ra = rng("arbres");
  const arbres: Pt[] = [];
  for (let essai = 0; essai < 700 && arbres.length < 70; essai++) {
    const x = -Rz + 5 + ra() * (2 * Rz - 10),
      z = -Rz + 5 + ra() * (2 * Rz - 10);
    if (libres.some((c) => Math.abs(x - c.x) < c.rx && Math.abs(z - c.z) < c.rz)) continue;
    if (sentiers.some((p) => Math.hypot(p[0] - x, p[1] - z) < 4.8)) continue;
    if (arbres.some((p) => Math.hypot(p[0] - x, p[1] - z) < 7)) continue;
    arbres.push([x, z]);
  }
  for (const [x, z] of arbres) P.arbre(x, z, 0.85 + ra() * 0.45, ra);
  // Une haie d'arbres tout autour, sur le bord de la plateforme.
  for (let t = -60; t <= 60; t += 12) for (const [x, z] of [[t, -61], [t, 61], [-61, t], [61, t]] as const) {
    if (Math.abs(x) < 38 && z > 50) continue;
    P.arbre(x, z, 0.8, ra);
  }
}
