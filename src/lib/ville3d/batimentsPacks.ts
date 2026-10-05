/**
 * Modèles 3D des cinq packs de thème d'A-INTEGRER §40, bâtis sur le modèle du
 * pack « haussmannien » (batiments.ts) :
 *
 *   bord_de_mer          — maisons    : villas pastel, terrasses de bois, cabane sur pilotis
 *   village_de_pierre    — maisons    : pierre sèche, ardoise, grange, tourelle
 *   quartier_industriel  — immeubles  : brique rouge, ossature d'acier, verrières
 *   futuriste_eco        — tours      : terrasses plantées, panneaux solaires, structure claire
 *   nordique             — maisons, immeubles et tours : bois clair, toits pentus, couleurs sourdes
 *
 * Un pack est PUREMENT cosmétique (BATIMENTS-ET-PACKS §4) : ces fonctions ne
 * dessinent que de la géométrie, elles ne lisent aucune donnée de jeu. Chaque
 * modèle respecte le contrat de sa famille (catalogue.ts) et reste dans la
 * parcelle, comme ceux du pack de base. batiments.ts les inscrit au catalogue
 * (`MODELES_MAISONS`, `MODELES_IMMEUBLES`, `MODELES_TOURS`) avec leurs poids.
 *
 * Dépendance circulaire assumée avec batiments.ts (qui importe ce fichier pour
 * remplir ses tableaux) : ici, tout ce qui vient de batiments.ts n'est utilisé
 * qu'à l'intérieur de fonctions déclarées (function), donc déjà disponibles quelle
 * que soit l'entrée du cycle.
 */
import type { RNG } from "./aleatoire";
import { pick, rr } from "./aleatoire";
import { COL, FLOOR_H, MAT, PANNEAU_CELLULE, PODIUM_H, hex, type Couleur } from "./constantes";
import { box, cylinder, gableRoof, shadeC, type Geo } from "./geometrie";
import { type TamponAO } from "./mobilier";
import { boite, repere } from "./repere";
import {
  chantierGratteCiel,
  decorJardin,
  edicule,
  grueChantier,
  placeInLot,
  type Facade,
  type Rect,
} from "./batiments";

const Y0 = 0.15;

// ---------------------------------------------------------------------
// Outils communs
// ---------------------------------------------------------------------

/** Corps de bâtiment : murs de maison (fenêtres à volets, porte) ou matière unie, sans toit. */
function corps(
  g: Geo,
  fp: Rect,
  front: Facade,
  c: Couleur,
  h: number,
  seed: number,
  opts: { y?: number; m?: number; frontM?: number | null } = {}
) {
  const y = opts.y ?? Y0;
  const m = opts.m ?? MAT.HOUSE;
  const frontM = opts.frontM === undefined ? (m === MAT.HOUSE ? MAT.HOUSE_FRONT : m === MAT.APART ? MAT.APART_FRONT : null) : opts.frontM;
  box(g, fp[0], y, fp[1], fp[2], y + h, fp[3], {
    c,
    m,
    front: frontM == null ? undefined : front,
    frontM: frontM == null ? undefined : frontM,
    top: false,
    seed,
    base: y,
  });
}

/** Vrai quand le faîtage d'un toit parallèle à la rue court le long de x (façade sur -z ou +z). */
const faitageAlongX = (front: Facade) => front === "-z" || front === "+z";

/** Parasol de terrasse : pied, mât et toile. */
function parasol(g: Geo, x: number, z: number, y: number, toile: Couleur) {
  cylinder(g, x, y, z, 0.06, 2.3, 6, COL.metal, MAT.PLAIN, null, null);
  cylinder(g, x, y + 2.15, z, 1.2, 0.35, 10, toile, MAT.PLAIN, MAT.PLAIN, toile, 0.08);
}

/** Garde-corps léger (main courante et poteaux) le long d'un côté de terrasse, avec une ouverture centrale. */
function gardeCorps(g: Geo, R: ReturnType<typeof repere>, a0: number, a1: number, o: number, y: number, c: Couleur, ouverture = 0) {
  const h = 1.0;
  const segments: [number, number][] = ouverture > 0 ? [[a0, -ouverture / 2], [ouverture / 2, a1]] : [[a0, a1]];
  for (const [s0, s1] of segments) {
    if (s1 - s0 < 0.2) continue;
    boite(g, R.rect(s0, s1, o - 0.04, o + 0.04), y + h - 0.1, y + h, { c, m: MAT.PLAIN });
    const n = Math.max(1, Math.round((s1 - s0) / 1.6));
    for (let i = 0; i <= n; i++) {
      const a = s0 + ((s1 - s0) * i) / n;
      boite(g, R.rect(a - 0.04, a + 0.04, o - 0.04, o + 0.04), y, y + h, { c, m: MAT.PLAIN });
    }
  }
}

// ---------------------------------------------------------------------
// Pack « bord_de_mer » — maisons
// ---------------------------------------------------------------------

const MER_MURS = ["#f4f1e8", "#e3eef4", "#cfe3ee", "#f0e6d0", "#bcd7e6"].map(hex);
const MER_TOITS = ["#7f9db0", "#a3bccb", "#b9694a", "#5f7f95"].map(hex);
const MER_BOIS = ["#c9a77c", "#d5b98f", "#b99468"].map(hex);
const MER_TOILES = ["#e0735a", "#3f7fa6", "#f2c14e", "#f4f1e8"].map(hex);

/** maison-balneaire : villa pastel à toit en pente douce, terrasse en bois sur le devant, parasol. */
export function construireMaisonBalneaire(g: Geo, rect: Rect, front: Facade, r: RNG, ao: TamponAO[], seed: number) {
  const wallC = pick(r, MER_MURS),
    roofC = pick(r, MER_TOITS),
    bois = pick(r, MER_BOIS);
  const etage = r() < 0.55;
  const wallH = etage ? 5.6 : 3.0;
  const width = rr(r, 8.0, 9.2),
    depth = rr(r, 7.0, 8.0);
  const fp = placeInLot(rect, front, width, depth, 4.4, rr(r, -0.7, 0.7));
  corps(g, fp, front, wallC, wallH, seed);
  gableRoof(g, fp[0], fp[1], fp[2], fp[3], Y0 + wallH, 0.3, 0.6, faitageAlongX(front), roofC, wallC, seed);
  const R = repere(front, fp);
  // terrasse en bois devant la façade, garde-corps avec une ouverture sur l'allée
  const demi = width / 2 + 0.4;
  boite(g, R.rect(-demi, demi, 0, 2.3), Y0, Y0 + 0.2, { c: bois, m: MAT.PLAIN, seed });
  gardeCorps(g, R, -demi, demi, 2.25, Y0 + 0.2, shadeC(bois, 1.12), 1.8);
  const [px, pz] = R.point(demi - 1.2, 1.4);
  parasol(g, px, pz, Y0 + 0.2, pick(r, MER_TOILES));
  if (etage) {
    // balcon filant à l'étage
    boite(g, R.rect(-width * 0.34, width * 0.34, 0, 1.2), Y0 + 2.9, Y0 + 3.05, { c: bois, m: MAT.PLAIN, seed });
    gardeCorps(g, R, -width * 0.34, width * 0.34, 1.16, Y0 + 3.05, shadeC(bois, 1.12));
  }
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h: wallH });
  decorJardin(g, rect, fp, front, r, ao, false);
}

/** maison-cabane-pilotis : plain-pied sur pilotis, escalier et coursive en bois, toit à faible pente. */
export function construireMaisonCabanePilotis(g: Geo, rect: Rect, front: Facade, r: RNG, ao: TamponAO[], seed: number) {
  const wallC = pick(r, [hex("#bcd7e6"), hex("#cfe3ee"), hex("#f4f1e8"), hex("#a9cbe0")]),
    roofC = pick(r, MER_TOITS),
    bois = pick(r, MER_BOIS);
  const surelev = 0.9,
    wallH = 2.9;
  const width = rr(r, 7.4, 8.6),
    depth = rr(r, 6.2, 7.2);
  const fp = placeInLot(rect, front, width, depth, 4.6, rr(r, -0.5, 0.5));
  corps(g, fp, front, wallC, wallH, seed, { y: Y0 + surelev });
  const yMurs = Y0 + surelev + wallH;
  gableRoof(g, fp[0], fp[1], fp[2], fp[3], yMurs, 0.24, 0.55, faitageAlongX(front), roofC, wallC, seed);
  // pilotis et plancher
  const R = repere(front, fp);
  boite(g, R.rect(-width / 2 - 0.2, width / 2 + 0.2, -depth - 0.2, 0), Y0 + surelev - 0.2, Y0 + surelev, { c: bois, m: MAT.PLAIN, seed });
  for (const a of [-width / 2, -width / 6, width / 6, width / 2]) {
    for (const o of [-0.1, -depth + 0.1]) {
      boite(g, R.rect(a - 0.14, a + 0.14, o - 0.14, o + 0.14), Y0, Y0 + surelev, { c: shadeC(bois, 0.8), m: MAT.PLAIN });
    }
  }
  // coursive devant, escalier de trois marches au centre
  boite(g, R.rect(-width / 2 - 0.2, width / 2 + 0.2, 0, 1.6), Y0 + surelev - 0.2, Y0 + surelev, { c: bois, m: MAT.PLAIN, seed });
  gardeCorps(g, R, -width / 2 - 0.2, width / 2 + 0.2, 1.56, Y0 + surelev, shadeC(bois, 1.12), 1.5);
  for (let i = 0; i < 3; i++) {
    boite(g, R.rect(-0.7, 0.7, 1.6 + i * 0.35, 1.95 + i * 0.35), Y0, Y0 + surelev - 0.2 - i * 0.28, { c: bois, m: MAT.PLAIN });
  }
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h: wallH + surelev });
  decorJardin(g, rect, fp, front, r, ao, false);
}

/** maison-balneaire-vigie : villa blanche flanquée d'une petite tour de vigie rayée, toit en cône bleu. */
export function construireMaisonVigie(g: Geo, rect: Rect, front: Facade, r: RNG, ao: TamponAO[], seed: number) {
  const wallC = pick(r, [hex("#f4f1e8"), hex("#f0e6d0"), hex("#e3eef4")]),
    roofC = pick(r, MER_TOITS);
  const wallH = 5.5;
  const width = rr(r, 7.6, 8.6),
    depth = rr(r, 6.8, 7.6);
  const fp = placeInLot(rect, front, width, depth, 4.2, rr(r, -0.4, 0.4));
  corps(g, fp, front, wallC, wallH, seed);
  gableRoof(g, fp[0], fp[1], fp[2], fp[3], Y0 + wallH, 0.34, 0.5, faitageAlongX(front), roofC, wallC, seed);
  const R = repere(front, fp);
  // tour de vigie à un coin du fond : fût rayé blanc / bleu, lanterne vitrée, cône
  const [tx, tz] = R.point(-width / 2 + 0.4, -depth * 0.55);
  const hTour = wallH + 3.0;
  const bande = pick(r, [hex("#3f7fa6"), hex("#e0735a")]);
  for (let i = 0; i < 3; i++) {
    cylinder(g, tx, Y0 + (hTour * i) / 3, tz, 1.55, hTour / 3, 12, i % 2 === 0 ? hex("#f4f1e8") : bande, MAT.PLAIN, null, null);
  }
  cylinder(g, tx, Y0 + hTour, tz, 1.3, 1.1, 12, hex("#a9cbe0"), MAT.GLASS, null, null);
  cylinder(g, tx, Y0 + hTour + 1.1, tz, 1.8, 1.8, 12, bande, MAT.TILES, null, null, 0.12);
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h: wallH });
  decorJardin(g, rect, fp, front, r, ao, false);
}

// ---------------------------------------------------------------------
// Pack « village_de_pierre » — maisons
// ---------------------------------------------------------------------

const PIERRE_MURS = ["#9a9b96", "#8c8e89", "#a39f94", "#85888a", "#a8a59b"].map(hex);
const ARDOISE = ["#454a52", "#3d424a", "#50555c", "#383d44"].map(hex);
const BOIS_BRUT = ["#7a5a3e", "#6b4e35", "#8a6a48"].map(hex);

/** Muret de pierre sèche le long de la rue, interrompu par l'allée (axe `dc`). */
function muretPierre(g: Geo, rect: Rect, front: Facade, dc: number, c: Couleur, seed: number) {
  const [x0, z0, x1, z1] = rect;
  const h = 0.75,
    t = 0.45,
    gap = 0.9,
    marge = 0.3;
  const o = { c, m: MAT.CONCRETE, seed };
  if (front === "-z" || front === "+z") {
    const za = front === "-z" ? z0 + 0.2 : z1 - 0.2 - t;
    box(g, x0 + marge, Y0, za, dc - gap, Y0 + h, za + t, o);
    box(g, dc + gap, Y0, za, x1 - marge, Y0 + h, za + t, o);
  } else {
    const xa = front === "-x" ? x0 + 0.2 : x1 - 0.2 - t;
    box(g, xa, Y0, z0 + marge, xa + t, Y0 + h, dc - gap, o);
    box(g, xa, Y0, dc + gap, xa + t, Y0 + h, z1 - marge, o);
  }
}

/** Cheminée de pierre en bout de toit : traverse le faîtage au pignon du côté donné. */
function chemineePierre(g: Geo, fp: Rect, front: Facade, yFaite: number, yMur: number, c: Couleur, cote: number, seed: number) {
  const alongX = faitageAlongX(front);
  const cx = alongX ? (cote < 0 ? fp[0] + 1.1 : fp[2] - 1.1) : (fp[0] + fp[2]) / 2;
  const cz = alongX ? (fp[1] + fp[3]) / 2 : cote < 0 ? fp[1] + 1.1 : fp[3] - 1.1;
  box(g, cx - 0.5, yMur - 0.3, cz - 0.5, cx + 0.5, yFaite + 1.3, cz + 0.5, { c: shadeC(c, 0.92), m: MAT.CONCRETE, seed });
  box(g, cx - 0.62, yFaite + 1.3, cz - 0.62, cx + 0.62, yFaite + 1.5, cz + 0.62, { c: shadeC(c, 0.7), m: MAT.PLAIN, seed });
}

/** Auvent de bois sur poteaux au-dessus de la porte. */
function auventBois(g: Geo, R: ReturnType<typeof repere>, y: number, bois: Couleur) {
  boite(g, R.rect(-1.25, 1.25, 0, 1.2), y, y + 0.14, { c: bois, m: MAT.PLAIN });
  for (const a of [-1.1, 1.1]) boite(g, R.rect(a - 0.07, a + 0.07, 1.05, 1.19), Y0, y, { c: shadeC(bois, 0.85), m: MAT.PLAIN });
}

/** maison-pierre-bloc : maison de pierre à faible pente d'ardoise, cheminée massive, auvent de bois, muret. */
export function construireMaisonPierreBloc(g: Geo, rect: Rect, front: Facade, r: RNG, ao: TamponAO[], seed: number) {
  const wallC = pick(r, PIERRE_MURS),
    roofC = pick(r, ARDOISE),
    bois = pick(r, BOIS_BRUT);
  const etage = r() < 0.6;
  const wallH = etage ? 5.5 : 3.0;
  const width = rr(r, 8.0, 9.2),
    depth = rr(r, 7.0, 8.2);
  const fp = placeInLot(rect, front, width, depth, 3.8, rr(r, -0.8, 0.8));
  corps(g, fp, front, wallC, wallH, seed);
  const yFaite = gableRoof(g, fp[0], fp[1], fp[2], fp[3], Y0 + wallH, 0.36, 0.3, faitageAlongX(front), roofC, wallC, seed);
  chemineePierre(g, fp, front, yFaite, Y0 + wallH, wallC, r() < 0.5 ? -1 : 1, seed);
  const R = repere(front, fp);
  auventBois(g, R, Y0 + 2.55, bois);
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h: wallH });
  const dc = R.lateral ? (fp[0] + fp[2]) / 2 : (fp[1] + fp[3]) / 2;
  muretPierre(g, rect, front, dc, shadeC(wallC, 0.95), seed);
  decorJardin(g, rect, fp, front, r, ao, false);
}

/** maison-pierre-grange : longue maison de pierre prolongée d'une grange basse en bois brut. */
export function construireMaisonPierreGrange(g: Geo, rect: Rect, front: Facade, r: RNG, ao: TamponAO[], seed: number) {
  const wallC = pick(r, PIERRE_MURS),
    roofC = pick(r, ARDOISE),
    bois = pick(r, BOIS_BRUT);
  const width = rr(r, 10.8, 11.6),
    depth = rr(r, 6.0, 6.8);
  const fp = placeInLot(rect, front, width, depth, 4.0, rr(r, -0.4, 0.4));
  const longueurMaison = width * 0.62;
  const alongX = faitageAlongX(front);
  // la grange est du côté tiré au sort : on découpe l'empreinte le long de la façade
  const sens = r() < 0.5 ? 1 : -1;
  const [a0, a1] = alongX ? [fp[0], fp[2]] : [fp[1], fp[3]];
  const coupe = sens > 0 ? a0 + longueurMaison : a1 - longueurMaison;
  const maison: Rect = alongX
    ? sens > 0
      ? [a0, fp[1], coupe, fp[3]]
      : [coupe, fp[1], a1, fp[3]]
    : sens > 0
      ? [fp[0], a0, fp[2], coupe]
      : [fp[0], coupe, fp[2], a1];
  const grange: Rect = alongX
    ? sens > 0
      ? [coupe, fp[1], a1, fp[3]]
      : [a0, fp[1], coupe, fp[3]]
    : sens > 0
      ? [fp[0], coupe, fp[2], a1]
      : [fp[0], a0, fp[2], coupe];
  const hMaison = 3.1,
    hGrange = 2.7;
  corps(g, maison, front, wallC, hMaison, seed);
  const yFaite = gableRoof(g, maison[0], maison[1], maison[2], maison[3], Y0 + hMaison, 0.34, 0.3, alongX, roofC, wallC, seed);
  chemineePierre(g, maison, front, yFaite, Y0 + hMaison, wallC, sens > 0 ? -1 : 1, seed);
  corps(g, grange, front, bois, hGrange, seed, { m: MAT.PLAIN, frontM: null });
  gableRoof(g, grange[0], grange[1], grange[2], grange[3], Y0 + hGrange, 0.3, 0.3, alongX, shadeC(roofC, 1.1), bois, seed);
  // grande porte de grange en façade
  const Rg = repere(front, grange);
  boite(g, Rg.rect(-1.5, 1.5, -0.02, 0.07), Y0, Y0 + 2.3, { c: shadeC(bois, 0.6), m: MAT.PLAIN });
  const Rm = repere(front, maison);
  auventBois(g, Rm, Y0 + 2.55, bois);
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h: hMaison });
  const dc = Rm.lateral ? (maison[0] + maison[2]) / 2 : (maison[1] + maison[3]) / 2;
  muretPierre(g, rect, front, dc, shadeC(wallC, 0.95), seed);
  decorJardin(g, rect, fp, front, r, ao, false);
}

/** maison-pierre-tourelle : maison de pierre à deux niveaux, ronde tourelle d'angle coiffée d'ardoise. */
export function construireMaisonPierreTourelle(g: Geo, rect: Rect, front: Facade, r: RNG, ao: TamponAO[], seed: number) {
  const wallC = pick(r, PIERRE_MURS),
    roofC = pick(r, ARDOISE);
  const wallH = 5.4;
  const width = rr(r, 7.8, 8.8),
    depth = rr(r, 7.2, 8.0);
  const fp = placeInLot(rect, front, width, depth, 4.2, rr(r, -0.4, 0.4));
  corps(g, fp, front, wallC, wallH, seed);
  const yFaite = gableRoof(g, fp[0], fp[1], fp[2], fp[3], Y0 + wallH, 0.38, 0.3, faitageAlongX(front), roofC, wallC, seed);
  chemineePierre(g, fp, front, yFaite, Y0 + wallH, wallC, r() < 0.5 ? -1 : 1, seed);
  const R = repere(front, fp);
  // tourelle ronde, saillante, sur l'un des angles côté rue
  const cote = r() < 0.5 ? -1 : 1;
  const [tx, tz] = R.point(cote * (width / 2 - 0.2), 0.3);
  const hT = wallH + 1.2;
  cylinder(g, tx, Y0, tz, 1.75, hT, 12, shadeC(wallC, 1.04), MAT.HOUSE, null, null);
  cylinder(g, tx, Y0 + hT, tz, 2.05, 2.8, 12, roofC, MAT.TILES, null, null, 0.1);
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h: wallH });
  const dc = R.lateral ? (fp[0] + fp[2]) / 2 : (fp[1] + fp[3]) / 2;
  muretPierre(g, rect, front, dc, shadeC(wallC, 0.95), seed);
  decorJardin(g, rect, fp, front, r, ao, false);
}

// ---------------------------------------------------------------------
// Pack « quartier_industriel » — immeubles
// ---------------------------------------------------------------------

const BRIQUE = ["#a8493a", "#9a4234", "#b55a43", "#8c3d30"].map(hex);
const ACIER = hex("#25282c");
const VERRE_INDUS = ["#7fa6ae", "#8aaeb5", "#6f98a3"].map(hex);

/** Poteaux d'acier apparents contre la façade, répartis sur sa largeur, avec une ceinture haute. */
function ossatureFacade(g: Geo, R: ReturnType<typeof repere>, largeur: number, h: number, nbTravees: number, seed: number) {
  const pas = largeur / nbTravees;
  for (let i = 0; i <= nbTravees; i++) {
    const a = -largeur / 2 + i * pas;
    boite(g, R.rect(a - 0.11, a + 0.11, -0.02, 0.26), Y0, Y0 + h, { c: ACIER, m: MAT.PLAIN, seed });
  }
  for (const y of [Y0 + h * 0.5, Y0 + h - 0.35]) {
    boite(g, R.rect(-largeur / 2, largeur / 2, -0.02, 0.2), y, y + 0.22, { c: ACIER, m: MAT.PLAIN, seed });
  }
}

/** Cheminée de brique tronquée (sans fumée : l'usine est reconvertie), en coin du toit. */
function chemineeUsine(g: Geo, x: number, z: number, yBase: number, h: number, brique: Couleur) {
  cylinder(g, x, yBase, z, 0.95, h, 12, shadeC(brique, 0.95), MAT.PLAIN, null, null, 0.62);
  cylinder(g, x, yBase + h, z, 0.7, 0.35, 12, ACIER, MAT.PLAIN, MAT.PLAIN, ACIER);
}

/** immeuble-loft-briques : ancienne usine de brique, poteaux d'acier, grande verrière centrale, cheminée. */
export function construireImmeubleLoftBriques(g: Geo, rect: Rect, front: Facade, floors: number, r: RNG, ao: TamponAO[], seed: number) {
  const wallC = pick(r, BRIQUE),
    verre = pick(r, VERRE_INDUS);
  const width = 12.0,
    depth = 10.6;
  const fp = placeInLot(rect, front, width, depth, 1.0, 0);
  const h = Math.max(2, floors) * 3.0;
  box(g, fp[0], Y0, fp[1], fp[2], Y0 + h, fp[3], {
    c: wallC,
    m: MAT.APART,
    front,
    frontM: MAT.APART_FRONT,
    topM: MAT.FLATROOF,
    topC: shadeC(COL.roofGray, 0.85),
    seed,
    base: Y0,
  });
  const R = repere(front, fp);
  ossatureFacade(g, R, width, h, 4, seed);
  // grande verrière : travée centrale entièrement vitrée, du deuxième niveau à la corniche
  boite(g, R.rect(-width / 8, width / 8, 0.0, 0.1), Y0 + 3.0, Y0 + h - 0.6, { c: verre, m: MAT.GLASS, seed });
  // toit : deux sheds vitrés à poutre d'acier, cheminée en coin
  const yt = Y0 + h;
  for (const a of [-width * 0.22, width * 0.22]) {
    boite(g, R.rect(a - 2.0, a + 2.0, -depth * 0.7, -depth * 0.2), yt, yt + 1.1, { c: verre, m: MAT.GLASS, topM: MAT.PLAIN, topC: ACIER, seed });
  }
  const [cx, cz] = R.point(width / 2 - 1.8, -depth + 1.8);
  chemineeUsine(g, cx, cz, yt, rr(r, 6.5, 8.5), wallC);
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h });
}

/** immeuble-loft-verriere : socle de brique, étage-atelier vitré en retrait, château d'eau et conduits sur le toit. */
export function construireImmeubleLoftVerriere(g: Geo, rect: Rect, front: Facade, floors: number, r: RNG, ao: TamponAO[], seed: number) {
  const wallC = pick(r, BRIQUE),
    verre = pick(r, VERRE_INDUS);
  const fp = placeInLot(rect, front, 12.2, 10.8, 1.0, 0);
  const nBas = Math.max(2, floors - 1);
  const hBas = nBas * 3.0;
  box(g, fp[0], Y0, fp[1], fp[2], Y0 + hBas, fp[3], {
    c: wallC,
    m: MAT.APART,
    front,
    frontM: MAT.APART_FRONT,
    top: false,
    seed,
    base: Y0,
  });
  const R = repere(front, fp);
  // poutre d'acier apparente au sommet du socle
  boite(g, R.rect(-6.2, 6.2, -0.02, 0.3), Y0 + hBas - 0.5, Y0 + hBas, { c: ACIER, m: MAT.PLAIN, seed });
  // étage-atelier vitré en retrait, ceinturé d'acier
  const retrait = 1.2;
  const fpH: Rect = [fp[0] + retrait, fp[1] + retrait, fp[2] - retrait, fp[3] - retrait];
  const hAtelier = 3.6;
  const yA = Y0 + hBas;
  box(g, fpH[0], yA, fpH[1], fpH[2], yA + hAtelier, fpH[3], {
    c: verre,
    m: MAT.GLASS,
    topM: MAT.FLATROOF,
    topC: ACIER,
    seed,
    base: yA,
  });
  const RH = repere(front, fpH);
  const demiH = (fpH[R.lateral ? 2 : 3] - fpH[R.lateral ? 0 : 1]) / 2;
  for (const a of [-demiH, 0, demiH]) boite(g, RH.rect(a - 0.1, a + 0.1, -0.02, 0.18), yA, yA + hAtelier, { c: ACIER, m: MAT.PLAIN, seed });
  // château d'eau : cuve sur pieds, coiffée d'un cône, plus conduits de ventilation
  const yT = yA + hAtelier;
  const [wx, wz] = RH.point(-demiH + 2.0, -3.0);
  for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
    box(g, wx + dx - 0.08, yT, wz + dz - 0.08, wx + dx + 0.08, yT + 2.0, wz + dz + 0.08, { c: ACIER, m: MAT.PLAIN });
  }
  cylinder(g, wx, yT + 2.0, wz, 1.3, 2.0, 12, shadeC(wallC, 0.8), MAT.PLAIN, null, null);
  cylinder(g, wx, yT + 4.0, wz, 1.4, 1.0, 12, ACIER, MAT.PLAIN, null, null, 0.1);
  edicule(g, fpH, yT, shadeC(wallC, 0.85), r, seed);
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h: hBas });
}

// ---------------------------------------------------------------------
// Pack « nordique » — maisons, immeubles, tours
// ---------------------------------------------------------------------

const NORD_BOIS = ["#d9b98a", "#cfae7e", "#e0c79f", "#c9a56f"].map(hex);
const NORD_PEINT = ["#f2efe8", "#a3b3bf", "#8da2b3", "#c7d0d6"].map(hex);
const NORD_TOITS = ["#4b4f54", "#5a5f66", "#6b6f75"].map(hex);
const TERRACOTTA = hex("#b5573a");

/** Petit auvent d'entrée en terracotta sur deux poteaux de bois clair. */
function porcheNordique(g: Geo, R: ReturnType<typeof repere>, bois: Couleur) {
  boite(g, R.rect(-1.2, 1.2, 0, 1.3), Y0 + 2.5, Y0 + 2.68, { c: TERRACOTTA, m: MAT.PLAIN });
  for (const a of [-1.05, 1.05]) boite(g, R.rect(a - 0.07, a + 0.07, 1.1, 1.24), Y0, Y0 + 2.5, { c: bois, m: MAT.PLAIN });
}

/** maison-nordique-bois : maison au bardage de bois clair, toit pentu sombre, porche terracotta, tas de bûches. */
export function construireMaisonNordiqueBois(g: Geo, rect: Rect, front: Facade, r: RNG, ao: TamponAO[], seed: number) {
  const wallC = pick(r, NORD_BOIS),
    roofC = pick(r, NORD_TOITS);
  const wallH = r() < 0.5 ? 5.4 : 3.0;
  const width = rr(r, 7.4, 8.4),
    depth = rr(r, 6.8, 7.8);
  const fp = placeInLot(rect, front, width, depth, 4.0, rr(r, -0.7, 0.7));
  corps(g, fp, front, wallC, wallH, seed);
  gableRoof(g, fp[0], fp[1], fp[2], fp[3], Y0 + wallH, 0.82, 0.55, faitageAlongX(front), roofC, shadeC(wallC, 0.95), seed);
  const R = repere(front, fp);
  porcheNordique(g, R, shadeC(wallC, 1.1));
  // bûcher contre le mur latéral
  const c = r() < 0.5 ? -1 : 1;
  const a0 = c * (width / 2 + 0.15),
    a1 = c * (width / 2 + 1.35);
  boite(g, R.rect(Math.min(a0, a1), Math.max(a0, a1), -depth * 0.7, -depth * 0.2), Y0, Y0 + 1.3, { c: hex("#a9824f"), m: MAT.PLAIN, seed });
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h: wallH });
  decorJardin(g, rect, fp, front, r, ao, false, "conifere");
}

/** maison-nordique-pastel : murs peints blanc ou bleu-gris, toit terracotta pentu, lucarne et terrasse de bois. */
export function construireMaisonNordiquePastel(g: Geo, rect: Rect, front: Facade, r: RNG, ao: TamponAO[], seed: number) {
  const wallC = pick(r, NORD_PEINT);
  const bois = pick(r, NORD_BOIS);
  const wallH = 5.3;
  const width = rr(r, 7.6, 8.6),
    depth = rr(r, 7.0, 8.0);
  const fp = placeInLot(rect, front, width, depth, 4.4, rr(r, -0.6, 0.6));
  corps(g, fp, front, wallC, wallH, seed);
  const alongX = faitageAlongX(front);
  const yFaite = gableRoof(g, fp[0], fp[1], fp[2], fp[3], Y0 + wallH, 0.78, 0.5, alongX, TERRACOTTA, shadeC(wallC, 0.95), seed);
  const R = repere(front, fp);
  // lucarne côté rue : petit volume plaqué sur le pan de toit
  const a = rr(r, -width * 0.2, width * 0.2);
  boite(g, R.rect(a - 0.9, a + 0.9, -1.1, 0.0), yFaite - 2.4, yFaite - 0.9, { c: shadeC(wallC, 1.02), m: MAT.PLAIN, seed });
  boite(g, R.rect(a - 1.05, a + 1.05, -1.2, 0.1), yFaite - 0.9, yFaite - 0.72, { c: TERRACOTTA, m: MAT.PLAIN });
  // terrasse de bois devant
  boite(g, R.rect(-width * 0.45, width * 0.45, 0, 1.8), Y0, Y0 + 0.18, { c: bois, m: MAT.PLAIN, seed });
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h: wallH });
  decorJardin(g, rect, fp, front, r, ao, false, "conifere");
}

/** maison-nordique-cabane : cabane en A, grand toit pentu jusqu'au sol, pignon vitré sur la rue. */
export function construireMaisonNordiqueCabane(g: Geo, rect: Rect, front: Facade, r: RNG, ao: TamponAO[], seed: number) {
  const wallC = pick(r, NORD_BOIS),
    roofC = pick(r, [hex("#4b4f54"), hex("#5c4a3a"), TERRACOTTA]);
  const width = rr(r, 7.0, 8.0),
    depth = rr(r, 7.4, 8.6);
  const fp = placeInLot(rect, front, width, depth, 4.2, rr(r, -0.5, 0.5));
  const wallH = 0.9;
  corps(g, fp, front, wallC, wallH, seed);
  // faîtage perpendiculaire à la rue : le pignon fait face à la voie
  const yFaite = gableRoof(g, fp[0], fp[1], fp[2], fp[3], Y0 + wallH, 1.0, 0.35, !faitageAlongX(front), roofC, wallC, seed);
  const R = repere(front, fp);
  const demi = width / 2;
  const hv = Math.min(yFaite - (Y0 + wallH), demi * 0.5) * 0.92;
  boite(g, R.rect(-demi * 0.5, demi * 0.5, -0.04, 0.08), Y0 + wallH, Y0 + wallH + hv * 1.0, { c: hex("#a1b4c6"), m: MAT.GLASS, seed });
  boite(g, R.rect(-0.55, 0.55, -0.04, 0.1), Y0, Y0 + wallH + 1.2, { c: shadeC(wallC, 0.55), m: MAT.PLAIN });
  // petite terrasse devant
  boite(g, R.rect(-demi * 0.7, demi * 0.7, 0.0, 1.6), Y0, Y0 + 0.16, { c: shadeC(wallC, 0.9), m: MAT.PLAIN, seed });
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h: wallH + 1.6 });
  decorJardin(g, rect, fp, front, r, ao, false, "conifere");
}

/** immeuble-nordique-bois : bardage de bois clair, balcons de bois à chaque étage, toit pentu à lucarnes. */
export function construireImmeubleNordiqueBois(g: Geo, rect: Rect, front: Facade, floors: number, r: RNG, ao: TamponAO[], seed: number) {
  const wallC = pick(r, NORD_BOIS),
    roofC = pick(r, NORD_TOITS);
  const width = 12.0,
    depth = 10.4;
  const fp = placeInLot(rect, front, width, depth, 1.2, 0);
  const n = Math.max(2, floors - 1);
  const h = n * 3.0;
  box(g, fp[0], Y0, fp[1], fp[2], Y0 + h, fp[3], { c: wallC, m: MAT.APART, front, frontM: MAT.APART_FRONT, top: false, seed, base: Y0 });
  const alongX = faitageAlongX(front);
  const yFaite = gableRoof(g, fp[0], fp[1], fp[2], fp[3], Y0 + h, 0.6, 0.55, alongX, roofC, shadeC(wallC, 0.95), seed);
  const R = repere(front, fp);
  const clair = shadeC(wallC, 1.12);
  for (let f = 1; f < n; f++) {
    const y = Y0 + f * 3.0 - 0.1;
    boite(g, R.rect(-width * 0.38, width * 0.38, 0, 1.2), y, y + 0.14, { c: clair, m: MAT.PLAIN, seed });
    boite(g, R.rect(-width * 0.38, width * 0.38, 1.12, 1.2), y + 0.14, y + 0.95, { c: clair, m: MAT.PLAIN, seed });
  }
  // deux lucarnes sur le pan de toit côté rue
  for (const a of [-width * 0.22, width * 0.22]) {
    boite(g, R.rect(a - 0.8, a + 0.8, -1.4, -0.2), yFaite - 2.0, yFaite - 0.7, { c: shadeC(wallC, 1.02), m: MAT.PLAIN, seed });
    boite(g, R.rect(a - 0.95, a + 0.95, -1.5, -0.1), yFaite - 0.7, yFaite - 0.52, { c: TERRACOTTA, m: MAT.PLAIN });
  }
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h: h + 2.5 });
}

/** immeuble-nordique-pastel : façade peinte bleu-gris et blanc, rez de bois, deux bow-windows, toit terracotta pentu. */
export function construireImmeubleNordiquePastel(g: Geo, rect: Rect, front: Facade, floors: number, r: RNG, ao: TamponAO[], seed: number) {
  const wallC = pick(r, NORD_PEINT),
    bois = pick(r, NORD_BOIS);
  const width = 12.2,
    depth = 10.6;
  const fp = placeInLot(rect, front, width, depth, 1.2, 0);
  const n = Math.max(2, floors - 1);
  const h = n * 3.0;
  box(g, fp[0], Y0, fp[1], fp[2], Y0 + h, fp[3], { c: wallC, m: MAT.APART, front, frontM: MAT.APART_FRONT, top: false, seed, base: Y0 });
  const alongX = faitageAlongX(front);
  gableRoof(g, fp[0], fp[1], fp[2], fp[3], Y0 + h, 0.52, 0.5, alongX, TERRACOTTA, shadeC(wallC, 0.95), seed);
  const R = repere(front, fp);
  // soubassement de bois clair et deux bow-windows saillants sur toute la hauteur du corps
  boite(g, R.rect(-width / 2, width / 2, -0.02, 0.1), Y0, Y0 + 1.1, { c: bois, m: MAT.PLAIN, seed });
  for (const a of [-width * 0.26, width * 0.26]) {
    boite(g, R.rect(a - 1.4, a + 1.4, 0.0, 0.8), Y0 + 3.0, Y0 + h, { c: shadeC(wallC, 1.06), m: MAT.APART, seed, base: Y0 + 3.0 });
    boite(g, R.rect(a - 1.5, a + 1.5, -0.05, 0.9), Y0 + h - 0.2, Y0 + h, { c: TERRACOTTA, m: MAT.PLAIN });
  }
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h: h + 2.2 });
}

// ---------------------------------------------------------------------
// Tours : trame commune (chantier, podium, ossature en cours de construction)
// ---------------------------------------------------------------------

interface Noyau {
  cx: number;
  cz: number;
  hs: number;
}

interface ContexteFut {
  cx: number;
  cz: number;
  base: number;
  /** Nombre d'étages finis (vitrés) du fût. */
  etages: number;
  noyaux: Noyau[];
}

interface ProfilTour {
  /** Demi-côté du podium de base, en retrait de la parcelle. */
  podium: { c: Couleur; m: number; topC: Couleur };
  /** Noyaux du fût (un seul pour la plupart, deux pour les tours jumelles). */
  noyaux: (cx: number, cz: number) => Noyau[];
  /** Dessine les étages finis du fût. */
  fut: (g: Geo, ctx: ContexteFut, r: RNG, seed: number) => void;
  /** Couronnement d'une tour achevée ; `top` est la hauteur du dernier plancher. */
  couronnement: (g: Geo, ctx: ContexteFut, top: number, r: RNG, seed: number) => void;
}

function tourModulaire(
  g: Geo,
  rect: Rect,
  innerSide: Facade,
  F: number,
  cap: number,
  r: RNG,
  ao: TamponAO[],
  seed: number,
  p: ProfilTour
): number {
  const [x0, z0, x1, z1] = rect;
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  if (F === 0) {
    chantierGratteCiel(g, x0, z0, x1, z1, r, seed);
    return 6;
  }
  const underConstruction = F < cap;
  const podFloors = Math.min(F, 3);
  const podH = podFloors * PODIUM_H;
  box(g, x0 + 1, Y0, z0 + 1, x1 - 1, Y0 + podH, z1 - 1, {
    c: p.podium.c,
    m: p.podium.m,
    topM: MAT.FLATROOF,
    topC: p.podium.topC,
    seed,
    base: Y0,
  });
  ao.push({ x0: x0 + 1, z0: z0 + 1, x1: x1 - 1, z1: z1 - 1, w: 1, h: podH });
  let top = Y0 + podH;

  const shaftFloors = Math.max(0, F - 3);
  const shaftBase = Y0 + 3 * PODIUM_H;
  const noyaux = p.noyaux(cx, cz);
  const ctxBase = { cx, cz, base: shaftBase, noyaux };
  if (shaftFloors > 0) {
    const skeleton = underConstruction ? Math.min(2, shaftFloors) : 0;
    const glassTo = shaftFloors - skeleton;
    const ctx: ContexteFut = { ...ctxBase, etages: glassTo };
    if (glassTo > 0) {
      p.fut(g, ctx, r, seed);
      for (const n of noyaux) {
        ao.push({ x0: n.cx - n.hs, z0: n.cz - n.hs, x1: n.cx + n.hs, z1: n.cz + n.hs, w: 1, h: shaftBase + glassTo * FLOOR_H });
      }
    }
    top = shaftBase + glassTo * FLOOR_H;
    // ossature de béton en attendant les façades, comme les autres tours
    for (let k = 0; k < skeleton; k++) {
      const yb = shaftBase + (glassTo + k) * FLOOR_H;
      for (const n of noyaux) {
        box(g, n.cx - n.hs, yb, n.cz - n.hs, n.cx + n.hs, yb + 0.35, n.cz + n.hs, { c: COL.concrete, m: MAT.CONCRETE });
        const m = Math.max(2, Math.round((n.hs * 2) / 5));
        for (let i = 0; i <= m; i++) {
          for (let j = 0; j <= m; j++) {
            if (i !== 0 && i !== m && j !== 0 && j !== m) continue;
            const px = n.cx - n.hs + 0.35 + (i / m) * (n.hs * 2 - 0.7),
              pz = n.cz - n.hs + 0.35 + (j / m) * (n.hs * 2 - 0.7);
            box(g, px - 0.35, yb + 0.35, pz - 0.35, px + 0.35, yb + FLOOR_H, pz + 0.35, { c: COL.concrete, m: MAT.CONCRETE, top: false });
          }
        }
      }
      top = yb + FLOOR_H;
    }
    if (skeleton > 0) {
      for (const n of noyaux) {
        box(g, n.cx - n.hs, top, n.cz - n.hs, n.cx + n.hs, top + 0.35, n.cz + n.hs, { c: COL.concrete, m: MAT.CONCRETE });
      }
    }
  }
  if (!underConstruction) p.couronnement(g, { ...ctxBase, etages: Math.max(0, shaftFloors) }, top, r, seed);
  else grueChantier(g, rect, innerSide, top, seed);
  return top;
}

// ---------------------------------------------------------------------
// Pack « futuriste_eco » — tours
// ---------------------------------------------------------------------

const ECO_BLANC = hex("#f2f4f3");
const ECO_METAL = hex("#a9b4bc");
const ECO_VERT = ["#6fae6a", "#5c9e5b", "#7bbb70"].map(hex);
const ECO_VERRE = ["#a9d6cc", "#bfe0d8", "#9fcdc2"].map(hex);

/** Panneau solaire plaqué ou posé à plat : cadre clair et cellules sombres. */
function panneauSolaire(g: Geo, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, seed: number) {
  box(g, x0, y0, z0, x1, y1, z1, { c: PANNEAU_CELLULE, m: MAT.PLAIN, seed });
}

/** Éolienne à axe vertical : mât, deux pales verticales croisées. */
function eolienneVerticale(g: Geo, x: number, z: number, y: number, h: number) {
  box(g, x - 0.12, y, z - 0.12, x + 0.12, y + h, z + 0.12, { c: ECO_BLANC, m: MAT.PLAIN });
  box(g, x - 0.9, y + 0.3, z - 0.07, x + 0.9, y + h - 0.3, z + 0.07, { c: ECO_METAL, m: MAT.PLAIN });
  box(g, x - 0.07, y + 0.3, z - 0.9, x + 0.07, y + h - 0.3, z + 0.9, { c: ECO_METAL, m: MAT.PLAIN });
}

/** tour-eco-vegetale : noyau vitré vert-d'eau, terrasses plantées en quinconce, ossature claire, toit solaire. */
export function construireTourEcoVegetale(
  g: Geo,
  rect: Rect,
  innerSide: Facade,
  F: number,
  cap: number,
  r: RNG,
  ao: TamponAO[],
  seed: number
): number {
  const verre = pick(r, ECO_VERRE),
    vert = pick(r, ECO_VERT);
  const hs = 8.2;
  return tourModulaire(g, rect, innerSide, F, cap, r, ao, seed, {
    podium: { c: ECO_BLANC, m: MAT.PODIUM, topC: vert },
    noyaux: (cx, cz) => [{ cx, cz, hs }],
    fut: (g2, ctx, r2, s2) => {
      const { cx, cz, base, etages } = ctx;
      box(g2, cx - hs, base, cz - hs, cx + hs, base + etages * FLOOR_H, cz + hs, {
        c: verre,
        m: MAT.GLASS,
        topM: MAT.FLATROOF,
        topC: vert,
        seed: s2,
        base,
      });
      // structure claire : quatre poteaux d'angle sur toute la hauteur
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const px = cx + sx * (hs + 0.1),
          pz = cz + sz * (hs + 0.1);
        box(g2, px - 0.3, base, pz - 0.3, px + 0.3, base + etages * FLOOR_H, pz + 0.3, { c: ECO_BLANC, m: MAT.PLAIN });
      }
      // une terrasse plantée tous les 3 étages, sur une face différente à chaque fois
      const faces: [number, number][] = [[0, 1], [1, 0], [0, -1], [-1, 0]];
      for (let k = 0, f = 2; f < etages; f += 3, k++) {
        const y = base + f * FLOOR_H;
        const [dx, dz] = faces[k % 4];
        const x0 = dx === 0 ? cx - hs : dx > 0 ? cx + hs : cx - hs - 1.9;
        const x1 = dx === 0 ? cx + hs : dx > 0 ? cx + hs + 1.9 : cx - hs;
        const z0 = dz === 0 ? cz - hs : dz > 0 ? cz + hs : cz - hs - 1.9;
        const z1 = dz === 0 ? cz + hs : dz > 0 ? cz + hs + 1.9 : cz - hs;
        box(g2, x0, y - 0.35, z0, x1, y, z1, { c: ECO_BLANC, m: MAT.PLAIN, seed: s2 });
        box(g2, x0 + 0.15, y, z0 + 0.15, x1 - 0.15, y + 0.9, z1 - 0.15, { c: shadeC(vert, 0.9 + 0.2 * r2()), m: MAT.FOLIAGE, seed: s2 });
        box(g2, x0 + 0.5, y + 0.9, z0 + 0.5, x1 - 0.5, y + 1.4, z1 - 0.5, { c: shadeC(vert, 1.1), m: MAT.FOLIAGE, seed: s2 });
      }
    },
    couronnement: (g2, ctx, top) => {
      const { cx, cz } = ctx;
      // toit végétal, panneaux solaires sur pieds, éolienne à axe vertical
      box(g2, cx - hs, top, cz - hs, cx + hs, top + 0.5, cz + hs, { c: shadeC(vert, 0.9), m: MAT.FOLIAGE });
      for (const dz of [-3.6, 0, 3.6]) {
        panneauSolaire(g2, cx - 5.6, top + 1.5, cz + dz - 1.0, cx + 1.0, top + 1.62, cz + dz + 1.0, seed);
        for (const px of [-5.2, 0.6]) box(g2, cx + px - 0.08, top + 0.5, cz + dz - 0.08, cx + px + 0.08, top + 1.5, cz + dz + 0.08, { c: ECO_METAL, m: MAT.PLAIN });
      }
      eolienneVerticale(g2, cx + 5.0, cz - 4.5, top + 0.5, 4.5);
    },
  });
}

/** tour-eco-solaire : deux fines tours jumelles reliées par une passerelle, façades bardées de panneaux solaires. */
export function construireTourEcoSolaire(
  g: Geo,
  rect: Rect,
  innerSide: Facade,
  F: number,
  cap: number,
  r: RNG,
  ao: TamponAO[],
  seed: number
): number {
  const verre = pick(r, [hex("#d5e4ec"), hex("#cfe3ee"), hex("#dfe9ee")]),
    vert = pick(r, ECO_VERT);
  const hs = 4.4,
    ecart = 6.2;
  return tourModulaire(g, rect, innerSide, F, cap, r, ao, seed, {
    podium: { c: ECO_BLANC, m: MAT.PODIUM, topC: vert },
    noyaux: (cx, cz) => [
      { cx: cx - ecart, cz, hs },
      { cx: cx + ecart, cz, hs },
    ],
    fut: (g2, ctx, _r2, s2) => {
      const { cz, base, etages, noyaux } = ctx;
      const H = etages * FLOOR_H;
      noyaux.forEach((n, i) => {
        box(g2, n.cx - hs, base, n.cz - hs, n.cx + hs, base + H, n.cz + hs, {
          c: verre,
          m: MAT.GLASS,
          topM: MAT.FLATROOF,
          topC: ECO_METAL,
          seed: s2 + i,
          base,
        });
        // panneaux solaires intégrés sur la face extérieure et la face arrière, de l'étage 2 à l'avant-dernier
        const sens = i === 0 ? -1 : 1;
        const yA = base + Math.min(2, etages - 1) * FLOOR_H,
          yB = base + Math.max(Math.min(2, etages - 1) + 1, etages - 1) * FLOOR_H;
        const xf = n.cx + sens * (hs + 0.07);
        panneauSolaire(g2, Math.min(xf, xf + sens * 0.12), yA, n.cz - hs * 0.55, Math.max(xf, xf + sens * 0.12), yB, n.cz + hs * 0.55, s2);
        panneauSolaire(g2, n.cx - hs * 0.55, yA, n.cz + hs + 0.07, n.cx + hs * 0.55, yB, n.cz + hs + 0.19, s2);
        // arêtes claires
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const px = n.cx + sx * (hs + 0.05),
            pz = n.cz + sz * (hs + 0.05);
          box(g2, px - 0.18, base, pz - 0.18, px + 0.18, base + H, pz + 0.18, { c: ECO_METAL, m: MAT.PLAIN });
        }
      });
      // passerelles vitrées tous les 10 étages, plus une au sommet
      const gauche = noyaux[0],
        droite = noyaux[1];
      for (let f = 6; f < etages; f += 10) {
        const y = base + f * FLOOR_H;
        box(g2, gauche.cx + hs, y, cz - 1.4, droite.cx - hs, y + 2.8, cz + 1.4, { c: verre, m: MAT.GLASS, topM: MAT.PLAIN, topC: ECO_BLANC, seed: s2, base: y });
      }
    },
    couronnement: (g2, ctx, top) => {
      const { cz, noyaux } = ctx;
      noyaux.forEach((n, i) => {
        box(g2, n.cx - hs, top, n.cz - hs, n.cx + hs, top + 0.6, n.cz + hs, { c: shadeC(vert, 0.9), m: MAT.FOLIAGE });
        if (i === 0) eolienneVerticale(g2, n.cx, n.cz, top + 0.6, 5.0);
        else {
          panneauSolaire(g2, n.cx - 3.2, top + 1.4, n.cz - 2.6, n.cx + 3.2, top + 1.52, n.cz + 2.6, seed);
          box(g2, n.cx - 0.1, top + 0.6, cz - 0.1, n.cx + 0.1, top + 1.4, cz + 0.1, { c: ECO_METAL, m: MAT.PLAIN });
        }
      });
    },
  });
}

// ---------------------------------------------------------------------
// Pack « nordique » — tours
// ---------------------------------------------------------------------

/** tour-nordique-bois : tour en bois lamellé, noyau vitré bleu-gris, poteaux et ceintures de bois, cap pentu terracotta. */
export function construireTourNordiqueBois(
  g: Geo,
  rect: Rect,
  innerSide: Facade,
  F: number,
  cap: number,
  r: RNG,
  ao: TamponAO[],
  seed: number
): number {
  const bois = pick(r, NORD_BOIS),
    verre = pick(r, [hex("#8da2b3"), hex("#a1b4c6"), hex("#9fb3c2")]);
  const hs = 7.4;
  return tourModulaire(g, rect, innerSide, F, cap, r, ao, seed, {
    podium: { c: bois, m: MAT.APART, topC: shadeC(COL.roofGray, 0.9) },
    noyaux: (cx, cz) => [{ cx, cz, hs }],
    fut: (g2, ctx, _r2, s2) => {
      const { cx, cz, base, etages } = ctx;
      const H = etages * FLOOR_H;
      box(g2, cx - hs + 0.4, base, cz - hs + 0.4, cx + hs - 0.4, base + H, cz + hs - 0.4, { c: verre, m: MAT.GLASS, topM: MAT.FLATROOF, topC: COL.roofGray, seed: s2, base });
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        box(g2, cx + sx * hs - 0.55, base, cz + sz * hs - 0.55, cx + sx * hs + 0.55, base + H, cz + sz * hs + 0.55, { c: bois, m: MAT.PLAIN });
      }
      for (let f = 4; f <= etages; f += 4) {
        const y = base + f * FLOOR_H - 0.5;
        box(g2, cx - hs - 0.2, y, cz - hs - 0.2, cx + hs + 0.2, y + 0.5, cz + hs + 0.2, { c: shadeC(bois, 0.92), m: MAT.PLAIN, top: false });
      }
    },
    couronnement: (g2, ctx, top, _r2, s2) => {
      const { cx, cz } = ctx;
      // étage-belvédère en bois et cap de toit à deux pans terracotta
      box(g2, cx - hs + 0.6, top, cz - hs + 0.6, cx + hs - 0.6, top + 2.6, cz + hs - 0.6, { c: bois, m: MAT.PLAIN, top: false, seed: s2 });
      gableRoof(g2, cx - hs + 0.6, cz - hs + 0.6, cx + hs - 0.6, cz + hs - 0.6, top + 2.6, 0.55, 0.9, true, TERRACOTTA, bois, s2);
    },
  });
}

/** tour-nordique-clocher : fût étroit aux murs peints, arêtes de bois, grand toit pentu en ardoise. */
export function construireTourNordiqueClocher(
  g: Geo,
  rect: Rect,
  innerSide: Facade,
  F: number,
  cap: number,
  r: RNG,
  ao: TamponAO[],
  seed: number
): number {
  const mur = pick(r, NORD_PEINT),
    bois = pick(r, NORD_BOIS),
    ardoise = pick(r, NORD_TOITS);
  const hs = 5.6;
  return tourModulaire(g, rect, innerSide, F, cap, r, ao, seed, {
    podium: { c: bois, m: MAT.APART, topC: shadeC(COL.roofGray, 0.9) },
    noyaux: (cx, cz) => [{ cx, cz, hs }],
    fut: (g2, ctx, _r2, s2) => {
      const { cx, cz, base, etages } = ctx;
      const H = etages * FLOOR_H;
      box(g2, cx - hs, base, cz - hs, cx + hs, base + H, cz + hs, { c: mur, m: MAT.APART, front: "+z", frontM: MAT.APART_FRONT, topM: MAT.FLATROOF, topC: COL.roofGray, seed: s2, base });
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        box(g2, cx + sx * hs - 0.25, base, cz + sz * hs - 0.25, cx + sx * hs + 0.25, base + H, cz + sz * hs + 0.25, { c: shadeC(bois, 0.92), m: MAT.PLAIN });
      }
    },
    couronnement: (g2, ctx, top, _r2, s2) => {
      const { cx, cz } = ctx;
      box(g2, cx - hs - 0.3, top, cz - hs - 0.3, cx + hs + 0.3, top + 0.5, cz + hs + 0.3, { c: shadeC(mur, 0.85), m: MAT.PLAIN, top: false, seed: s2 });
      gableRoof(g2, cx - hs - 0.3, cz - hs - 0.3, cx + hs + 0.3, cz + hs + 0.3, top + 0.5, 1.05, 0.7, false, ardoise, mur, s2);
    },
  });
}
