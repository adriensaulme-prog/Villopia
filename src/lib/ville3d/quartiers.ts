/**
 * Bâtiments des quartiers Industrie, Commerce, Services et Recherche
 * (Jalon 19, docs/SYSTEME-DEVELOPPEMENT.md §7). Loisirs réutilise
 * buildPark() (Jalon 6bis) pour son premier stade, et buildStade()
 * ci-dessous pour le second.
 *
 * A-INTEGRER §36 A (05/10/2026) : Commerce, Services et Recherche, restés de
 * simples boîtes à toit plat gris, ont été repris comme l'Énergie et
 * l'Industrie — plusieurs silhouettes par stade, vraies fenêtres, toits,
 * auvents, terrasses, drapeaux, acrotères (voir repere() plus bas).
 *
 * Trois niveaux par vocation (0 simple, 1 développée, 2 grand
 * complexe), au lieu des deux du premier passage — retour de test
 * d'Adrien (docs/A-INTEGRER.md §20 A, 27/09/2026) : le niveau de détail
 * doit se rapprocher de celui des maisons (plusieurs éléments
 * optionnels tirés au sort, pas juste une géométrie mise à l'échelle).
 * Voir docs/DECISIONS.md §4, journal du Jalon 19.
 */
import type { RNG } from "./aleatoire";
import { pick, rr } from "./aleatoire";
import {
  COL,
  COMMERCE_ENSEIGNE,
  COMMERCE_WALLS,
  FUMEE,
  HOUSE_ROOFS,
  INDUSTRIE_ACCENT,
  INDUSTRIE_FENCE,
  INDUSTRIE_WALLS,
  MAT,
  RECHERCHE_DOME,
  RECHERCHE_PANNEAU,
  RECHERCHE_WALLS,
  SERVICES_BANDEAU,
  SERVICES_CROIX,
  SERVICES_ECOLE_WALLS,
  SERVICES_PIERRE_WALLS,
  SERVICES_WALLS,
  hex,
  type Couleur,
} from "./constantes";
import { blob, box, cylinder, flat, gableRoof, shadeC, type Geo, type OptionsBoite } from "./geometrie";
import { car, type TamponAO } from "./mobilier";
import { placeInLot, type Facade, type Rect } from "./batiments";

/** Panache de fumée (deux boules empilées, comme le feuillage d'un arbre) au sommet d'une cheminée. */
function fumee(g: Geo, x: number, y: number, z: number, r: RNG) {
  blob(g, x, y, z, 0.9, 0.7, 0.9, FUMEE, MAT.FOLIAGE, r);
  blob(g, x + rr(r, -0.3, 0.5), y + 0.9, z + rr(r, -0.3, 0.5), 0.65, 0.55, 0.65, shadeC(FUMEE, 1.03), MAT.FOLIAGE, r);
}

/** Petit segment de clôture grillagée, comme autour d'un chantier (batiments.ts) mais plus bas. */
function clotureBasse(g: Geo, x0: number, z0: number, x1: number, z1: number, seed: number) {
  const fh = 1.3,
    ft = 0.08,
    y0 = 0.15;
  if (Math.abs(x1 - x0) > Math.abs(z1 - z0)) {
    box(g, x0, y0, z0 - ft / 2, x1, y0 + fh, z0 + ft / 2, { c: INDUSTRIE_FENCE, m: MAT.FENCE, seed });
  } else {
    box(g, x0 - ft / 2, y0, z0, x0 + ft / 2, y0 + fh, z1, { c: INDUSTRIE_FENCE, m: MAT.FENCE, seed });
  }
}

export function buildIndustrie(
  g: Geo,
  rect: Rect,
  front: Facade,
  niveau: number,
  r: RNG,
  ao: TamponAO[],
  seed: number
) {
  const wallC = pick(r, INDUSTRIE_WALLS);
  const width = rr(r, 8.6, 9.6) + niveau * rr(r, 0.5, 1.1),
    depth = rr(r, 7.6, 9.2) + niveau * rr(r, 0.4, 1.0);
  const fp = placeInLot(rect, front, width, depth, 3.0, rr(r, -1, 1));
  const y0 = 0.15,
    h = niveau === 0 ? rr(r, 3.4, 4.0) : niveau === 1 ? rr(r, 5.2, 6.0) : rr(r, 6.6, 7.6);
  box(g, fp[0], y0, fp[1], fp[2], y0 + h, fp[3], {
    c: wallC,
    m: MAT.CONCRETE,
    topM: MAT.FLATROOF,
    topC: COL.roofGray,
    seed,
    base: y0,
  });
  // bandeau clair sous le toit, façon entrepôt
  box(g, fp[0], y0 + h - 0.6, fp[1], fp[2], y0 + h, fp[3], { c: shadeC(wallC, 1.08), m: MAT.PLAIN, top: false, seed });
  if (niveau >= 1) {
    // lanterneaux en shed sur le toit (rythme de type usine)
    const n = 2 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const lx = fp[0] + (fp[2] - fp[0]) * ((i + 0.5) / n);
      box(g, lx - 0.9, y0 + h, fp[1] + 1, lx + 0.9, y0 + h + 0.7, fp[3] - 1, {
        c: shadeC(wallC, 1.15),
        m: MAT.PLAIN,
        seed: seed + i,
      });
    }
    const cx = fp[0] + (fp[2] - fp[0]) * rr(r, 0.2, 0.35),
      cz = fp[1] + (fp[3] - fp[1]) * rr(r, 0.2, 0.35);
    cylinder(g, cx, y0 + h, cz, 0.55, rr(r, 4, 5.5), 10, INDUSTRIE_ACCENT, MAT.PLAIN, MAT.PLAIN, INDUSTRIE_ACCENT);
    // silo secondaire
    const sx = fp[0] + (fp[2] - fp[0]) * rr(r, 0.65, 0.8);
    cylinder(g, sx, y0, cz, 1.1, h * 0.85, 12, shadeC(wallC, 1.1), MAT.PLAIN, MAT.FLATROOF, COL.roofGray);
  }
  if (niveau >= 2) {
    // grand complexe : cheminée fumante + réservoirs de stockage + palettes + clôture
    const cheminee = shadeC(COL.concrete, 0.88);
    const chx = fp[0] + (fp[2] - fp[0]) * rr(r, 0.82, 0.92),
      chz = fp[1] + (fp[3] - fp[1]) * rr(r, 0.72, 0.85);
    const chH = h + rr(r, 4, 6);
    cylinder(g, chx, y0, chz, 0.7, chH, 10, cheminee, MAT.PLAIN, MAT.PLAIN, cheminee);
    fumee(g, chx, y0 + chH + 0.3, chz, r);
    for (let i = 0; i < 2; i++) {
      const tx = fp[0] + (fp[2] - fp[0]) * (0.08 + i * 0.12),
        tz = fp[3] + rr(r, 1.4, 2.2);
      if (tz < rect[3] - 1) {
        cylinder(g, tx, y0, tz, 0.9, rr(r, 3.2, 4.2), 10, shadeC(wallC, 1.05), MAT.PLAIN, MAT.PLAIN, shadeC(wallC, 1.05));
      }
    }
    const palette = hex("#7a5a3e");
    for (let i = 0; i < 3; i++) {
      const px = rr(r, fp[0] - 2.5, fp[0] - 0.5),
        pz = rr(r, fp[1] + 1, fp[3] - 1);
      if (px > rect[0] + 0.5) {
        box(g, px, y0, pz, px + rr(r, 0.9, 1.4), y0 + rr(r, 0.5, 1.1), pz + rr(r, 0.9, 1.3), {
          c: pick(r, [palette, shadeC(palette, 1.15)]),
          m: MAT.CONCRETE,
        });
      }
    }
    if (r() < 0.7) clotureBasse(g, rect[0] + 0.4, rect[1] + 0.4, rect[0] + 0.4, rect[3] - 0.4, seed);
  }
  if (niveau >= 1 && r() < 0.5) car(g, fp[0] - rr(r, 1.8, 2.6), (fp[1] + fp[3]) / 2, false, r, 0.15);
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h });
}

// ---------------------------------------------------------------------
// Repère local d'une parcelle (A-INTEGRER §36 A) : permet de poser auvents,
// perrons, terrasses… « devant » ou « derrière » la façade quel que soit le
// côté de la rue, sans quatre cas par élément.
// ---------------------------------------------------------------------

/**
 * `rect(a0, a1, o0, o1)` : rectangle monde où `a` est le décalage le long de la
 * façade depuis son centre et `o` la distance à la façade, positive vers la
 * rue, négative vers l'intérieur du bâtiment (o0 < o1).
 */
function repere(front: Facade, fp: Rect) {
  const lateral = front === "-z" || front === "+z";
  const centre = lateral ? (fp[0] + fp[2]) / 2 : (fp[1] + fp[3]) / 2;
  const face = front === "-z" ? fp[1] : front === "+z" ? fp[3] : front === "-x" ? fp[0] : fp[2];
  const sens = front === "-z" || front === "-x" ? -1 : 1;
  const rect = (a0: number, a1: number, o0: number, o1: number): Rect => {
    const d0 = face + sens * o0,
      d1 = face + sens * o1;
    const lo = Math.min(d0, d1),
      hi = Math.max(d0, d1);
    return lateral ? [centre + a0, lo, centre + a1, hi] : [lo, centre + a0, hi, centre + a1];
  };
  /** Point monde (x, z) à (a, o). */
  const point = (a: number, o: number): [number, number] =>
    lateral ? [centre + a, face + sens * o] : [face + sens * o, centre + a];
  return { lateral, centre, face, sens, rect, point };
}

function boite(g: Geo, R: Rect, y0: number, y1: number, o: OptionsBoite) {
  box(g, R[0], y0, R[1], R[2], y1, R[3], o);
}

/** Acrotère : un rebord bas sur les quatre côtés d'un toit plat. */
function parapet(g: Geo, fp: Rect, yToit: number, c: Couleur, seed: number, h = 0.55, t = 0.22) {
  const o = { c, m: MAT.PLAIN, seed };
  box(g, fp[0], yToit, fp[1], fp[2], yToit + h, fp[1] + t, o);
  box(g, fp[0], yToit, fp[3] - t, fp[2], yToit + h, fp[3], o);
  box(g, fp[0], yToit, fp[1] + t, fp[0] + t, yToit + h, fp[3] - t, o);
  box(g, fp[2] - t, yToit, fp[1] + t, fp[2], yToit + h, fp[3] - t, o);
}

/** Mât de drapeau avec son drapeau (côté droit du mât, vu de la rue). */
function drapeau(g: Geo, x: number, z: number, h: number, c: Couleur, alongX: boolean) {
  box(g, x - 0.05, 0.15, z - 0.05, x + 0.05, 0.15 + h, z + 0.05, { c: COL.metal, m: MAT.PLAIN });
  if (alongX) box(g, x + 0.05, 0.15 + h - 0.8, z - 0.02, x + 1.15, 0.15 + h - 0.05, z + 0.02, { c, m: MAT.PLAIN });
  else box(g, x - 0.02, 0.15 + h - 0.8, z + 0.05, x + 0.02, 0.15 + h - 0.05, z + 1.15, { c, m: MAT.PLAIN });
}

// ---------------------------------------------------------------------
// Commerce
// ---------------------------------------------------------------------

/** Auvent rayé (bandes alternées) devant une vitrine, sur la largeur donnée. */
function auventRaye(g: Geo, R: ReturnType<typeof repere>, demiLargeur: number, sortie: number, y: number, c1: Couleur, c2: Couleur) {
  const n = 6,
    pas = (2 * demiLargeur) / n;
  for (let i = 0; i < n; i++) {
    boite(g, R.rect(-demiLargeur + i * pas, -demiLargeur + (i + 1) * pas, 0, sortie), y, y + 0.14, {
      c: i % 2 === 0 ? c1 : c2,
      m: MAT.PLAIN,
    });
  }
}

/** Table ronde et parasol de terrasse. */
function tableTerrasse(g: Geo, x: number, z: number, parasol: Couleur) {
  cylinder(g, x, 0.17, z, 0.5, 0.75, 10, hex("#7a5a3e"), MAT.PLAIN, MAT.PLAIN, hex("#7a5a3e"));
  cylinder(g, x, 0.17, z, 0.06, 2.3, 6, COL.metal, MAT.PLAIN, null, null);
  cylinder(g, x, 2.15, z, 1.25, 0.35, 10, parasol, MAT.PLAIN, MAT.PLAIN, parasol, 0.08);
}

export function buildCommerce(
  g: Geo,
  rect: Rect,
  front: Facade,
  niveau: number,
  r: RNG,
  ao: TamponAO[],
  seed: number
) {
  const wallC = pick(r, COMMERCE_WALLS);
  const enseigneC = pick(r, COMMERCE_ENSEIGNE);
  const y0 = 0.15;

  // Niveau 0 : deux silhouettes — la boutique de quartier (toit de tuiles, auvent rayé,
  // terrasse) ou la supérette (vitrine, enseigne dressée sur le toit, voitures devant).
  if (niveau === 0 && r() < 0.5) {
    const roofC = pick(r, HOUSE_ROOFS);
    const floors = r() < 0.5 ? 2 : 1;
    const wallH = floors === 2 ? 5.8 : 3.4;
    const width = rr(r, 6.6, 7.8),
      depth = rr(r, 6.6, 7.8);
    const fp = placeInLot(rect, front, width, depth, 3.4, rr(r, -0.6, 0.6));
    box(g, fp[0], y0, fp[1], fp[2], y0 + wallH, fp[3], {
      c: wallC,
      m: MAT.HOUSE,
      front,
      frontM: MAT.HOUSE_FRONT,
      top: false,
      seed,
      base: y0,
    });
    const alongX = front === "-z" || front === "+z";
    gableRoof(g, fp[0], fp[1], fp[2], fp[3], y0 + wallH, 0.5, 0.4, alongX, roofC, wallC, seed);
    const R = repere(front, fp);
    // bandeau d'enseigne au rez-de-chaussée + auvent rayé + terrasse
    boite(g, R.rect(-width / 2, width / 2, -0.02, 0.06), y0 + 2.7, y0 + 3.3, { c: enseigneC, m: MAT.PLAIN, seed });
    auventRaye(g, R, width / 2 - 0.4, 1.5, y0 + 2.3, enseigneC, hex("#f1ead8"));
    const parasol = pick(r, COMMERCE_ENSEIGNE);
    for (const a of [-width * 0.22, width * 0.22]) {
      const [tx, tz] = R.point(a, 2.35);
      tableTerrasse(g, tx, tz, parasol);
    }
    ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h: wallH });
    return;
  }

  const width = rr(r, 8.2, 9.4) + niveau * rr(r, 0.5, 1.2),
    depth = rr(r, 7.4, 8.8) + niveau * rr(r, 0.3, 0.8);
  const fp = placeInLot(rect, front, width, depth, 3.2, rr(r, -1, 1));
  const floors = niveau === 0 ? 1 : niveau === 1 ? 3 + Math.floor(r() * 2) : 4 + Math.floor(r() * 2),
    h = floors * (niveau === 0 ? 3.8 : 3.0);
  box(g, fp[0], y0, fp[1], fp[2], y0 + h, fp[3], {
    c: wallC,
    m: MAT.APART,
    front,
    frontM: niveau >= 1 ? MAT.GLASS : MAT.APART_FRONT,
    topM: MAT.FLATROOF,
    topC: COL.roofGray,
    seed,
    base: y0,
  });
  // acrotère et bandeau enseigne coloré au rez-de-chaussée
  parapet(g, fp, y0 + h, shadeC(wallC, 0.9), seed, 0.5);
  box(g, fp[0], y0 + 0.1, fp[1], fp[2], y0 + 0.85, fp[3], { c: enseigneC, m: MAT.PLAIN, top: false, seed });
  const R = repere(front, fp);
  if (niveau === 0) {
    // supérette : enseigne dressée sur le toit, côté rue, auvent sur la vitrine, voitures devant
    boite(g, R.rect(-width * 0.34, width * 0.34, -0.25, 0.05), y0 + h, y0 + h + 1.7, {
      c: enseigneC,
      m: MAT.PLAIN,
      seed,
    });
    boite(g, R.rect(-width / 2 + 0.3, width / 2 - 0.3, 0, 1.4), y0 + 0.95, y0 + 1.12, { c: enseigneC, m: MAT.PLAIN });
    for (const a of [-width * 0.22, width * 0.2]) {
      const [cx, cz] = R.point(a, 2.1);
      if (r() < 0.75) car(g, cx, cz, R.lateral, r, 0.17);
    }
  }
  if (niveau >= 1) {
    // second bandeau, près du toit — silhouette "grand magasin"
    box(g, fp[0], y0 + h - 0.55, fp[1], fp[2], y0 + h - 0.1, fp[3], {
      c: shadeC(enseigneC, 1.1),
      m: MAT.PLAIN,
      top: false,
      seed,
    });
    // enseigne en lettres hautes sur le toit
    boite(g, R.rect(-width * 0.28, width * 0.28, -0.3, 0), y0 + h, y0 + h + 1.9, { c: enseigneC, m: MAT.PLAIN, seed });
    // marquise d'entrée : dalle saillante sur deux piliers, centrée sur la façade
    const marquiseH = 3.3,
      sortieM = 2.2;
    boite(g, R.rect(-width * 0.4, width * 0.4, 0, sortieM), y0 + marquiseH, y0 + marquiseH + 0.22, {
      c: shadeC(enseigneC, 0.85),
      m: MAT.PLAIN,
    });
    for (const a of [-width * 0.4 + 0.2, width * 0.4 - 0.2]) {
      boite(g, R.rect(a - 0.12, a + 0.12, sortieM - 0.3, sortieM - 0.06), y0, y0 + marquiseH, { c: COL.metal, m: MAT.PLAIN });
    }
    // gradin en retrait au sommet (silhouette étagée) et lanterneau vitré d'un côté
    const retrait = 1.1,
      hGradin = rr(r, 1.8, 2.6);
    box(g, fp[0] + retrait, y0 + h, fp[1] + retrait, fp[2] - retrait, y0 + h + hGradin, fp[3] - retrait, {
      c: shadeC(wallC, 1.12),
      m: MAT.APART,
      topM: MAT.FLATROOF,
      topC: COL.roofGray,
      seed: seed + 3,
      base: y0 + h,
    });
    const coteVitre = r() < 0.5 ? -1 : 1;
    const lant = R.rect(coteVitre * width * 0.18 - 1.6, coteVitre * width * 0.18 + 1.6, -depth * 0.55, -depth * 0.2);
    box(g, lant[0], y0 + h + hGradin, lant[1], lant[2], y0 + h + hGradin + 0.9, lant[3], {
      c: RECHERCHE_DOME,
      m: MAT.GLASS,
      topM: MAT.GLASS,
      seed: seed + 5,
    });
  }
  if (niveau >= 2) {
    // centre commercial : parvis pavé + quelques voitures + climatiseurs en toiture
    const parvis = R.rect(-width / 2 - 1, width / 2 + 1, 0, 2.6);
    flat(g, parvis[0], parvis[1], parvis[2], parvis[3], 0.17, COL.paving, MAT.PAVING);
    for (let i = 0; i < 2; i++) {
      const [cx, cz] = R.point(-width * 0.25 + i * width * 0.45, 1.4);
      car(g, cx, cz, R.lateral, r, 0.17);
    }
    for (let i = 0; i < 2 + Math.floor(r() * 2); i++) {
      const ax = rr(r, fp[0] + 1, fp[2] - 2),
        az = rr(r, fp[1] + 1, fp[3] - 2);
      box(g, ax, y0 + h, az, ax + 1.1, y0 + h + 0.8, az + 0.8, { c: COL.metal, m: MAT.PLAIN });
    }
  }
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h });
}

// ---------------------------------------------------------------------
// Services : école, mairie, collège, clinique, hôpital
// ---------------------------------------------------------------------

/** Croix de façade (clinique / hôpital), posée juste devant le mur. */
function croixFacade(g: Geo, R: ReturnType<typeof repere>, a: number, yBase: number, taille: number) {
  boite(g, R.rect(a - taille * 0.15, a + taille * 0.15, -0.02, 0.06), yBase, yBase + taille, { c: SERVICES_CROIX, m: MAT.PLAIN });
  boite(g, R.rect(a - taille * 0.5, a + taille * 0.5, -0.02, 0.06), yBase + taille * 0.35, yBase + taille * 0.65, {
    c: SERVICES_CROIX,
    m: MAT.PLAIN,
  });
}

function serviceEcole(g: Geo, rect: Rect, front: Facade, r: RNG, ao: TamponAO[], seed: number) {
  const wallC = pick(r, SERVICES_ECOLE_WALLS),
    roofC = pick(r, HOUSE_ROOFS);
  const width = rr(r, 9.2, 10.4),
    depth = rr(r, 5.4, 6.2);
  const fp = placeInLot(rect, front, width, depth, 3.0, rr(r, -0.8, 0.8));
  const y0 = 0.15,
    wallH = 3.3;
  box(g, fp[0], y0, fp[1], fp[2], y0 + wallH, fp[3], {
    c: wallC,
    m: MAT.HOUSE,
    front,
    frontM: MAT.HOUSE_FRONT,
    top: false,
    seed,
    base: y0,
  });
  const alongX = front === "-z" || front === "+z";
  gableRoof(g, fp[0], fp[1], fp[2], fp[3], y0 + wallH, 0.5, 0.35, alongX, roofC, wallC, seed);
  const R = repere(front, fp);
  // aile basse à toit plat derrière (salles de classe), cour pavée et mât de drapeau devant
  boite(g, R.rect(-width * 0.32, width * 0.32, -depth - 3.0, -depth + 0.3), y0, y0 + 2.8, {
    c: shadeC(wallC, 0.95),
    m: MAT.HOUSE,
    topM: MAT.FLATROOF,
    topC: COL.roofGray,
    seed,
    base: y0,
  });
  const cour = R.rect(-width / 2, width / 2, 0, 2.6);
  flat(g, cour[0], cour[1], cour[2], cour[3], 0.17, COL.paving, MAT.PAVING);
  const [mx, mz] = R.point(-width / 2 + 0.8, 1.7);
  drapeau(g, mx, mz, 5.2, hex("#2b5fa8"), R.lateral);
  boite(g, R.rect(-1.1, 1.1, 0, 1.2), y0 + 2.5, y0 + 2.65, { c: hex("#3f6fa8"), m: MAT.PLAIN }); // auvent de l'entrée
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h: wallH });
}

function serviceMairie(g: Geo, rect: Rect, front: Facade, r: RNG, ao: TamponAO[], seed: number) {
  const wallC = pick(r, SERVICES_PIERRE_WALLS);
  const width = rr(r, 8.6, 9.6),
    depth = rr(r, 7.0, 7.8);
  const fp = placeInLot(rect, front, width, depth, 3.0, rr(r, -0.8, 0.8));
  const y0 = 0.15,
    wallH = 5.8;
  box(g, fp[0], y0, fp[1], fp[2], y0 + wallH, fp[3], {
    c: wallC,
    m: MAT.APART,
    front,
    frontM: MAT.APART_FRONT,
    top: false,
    seed,
    base: y0,
  });
  const alongX = front === "-z" || front === "+z";
  const roofC = hex("#4a4f57");
  const yR = gableRoof(g, fp[0], fp[1], fp[2], fp[3], y0 + wallH, 0.55, 0.4, alongX, roofC, wallC, seed);
  // clocheton au centre du faîtage, surmonté d'une flèche
  const cx = (fp[0] + fp[2]) / 2,
    cz = (fp[1] + fp[3]) / 2;
  box(g, cx - 0.8, yR - 0.5, cz - 0.8, cx + 0.8, yR + 2.2, cz + 0.8, { c: shadeC(wallC, 0.95), m: MAT.PLAIN, seed });
  cylinder(g, cx, yR + 2.2, cz, 1.0, 1.9, 8, roofC, MAT.PLAIN, null, null, 0.06);
  const R = repere(front, fp);
  // perron à deux marches et deux drapeaux
  boite(g, R.rect(-2.2, 2.2, 0, 1.0), y0, y0 + 0.28, { c: COL.stone, m: MAT.CONCRETE });
  boite(g, R.rect(-1.7, 1.7, 1.0, 1.7), y0, y0 + 0.14, { c: COL.stone, m: MAT.CONCRETE });
  for (const a of [-3.4, 3.4]) {
    const [fx, fz] = R.point(a, 1.5);
    drapeau(g, fx, fz, 5.6, a < 0 ? hex("#2b5fa8") : hex("#c23b2c"), R.lateral);
  }
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h: wallH });
}

function serviceCollege(g: Geo, rect: Rect, front: Facade, r: RNG, ao: TamponAO[], seed: number) {
  const wallC = pick(r, SERVICES_ECOLE_WALLS);
  const width = rr(r, 9.4, 10.4),
    depth = rr(r, 6.2, 7.0);
  const fp = placeInLot(rect, front, width, depth, 3.0, rr(r, -0.6, 0.6));
  const y0 = 0.15,
    h = rr(r, 6.6, 7.2);
  box(g, fp[0], y0, fp[1], fp[2], y0 + h, fp[3], {
    c: wallC,
    m: MAT.APART,
    front,
    frontM: MAT.APART_FRONT,
    topM: MAT.FLATROOF,
    topC: COL.roofGray,
    seed,
    base: y0,
  });
  parapet(g, fp, y0 + h, shadeC(wallC, 0.85), seed);
  const R = repere(front, fp);
  // gymnase derrière : volume bas à toit en berceau approché par un toit à deux pans très plat
  const gym = R.rect(-width * 0.3, width * 0.3, -depth - 3.4, -depth + 0.3);
  boite(g, gym, y0, y0 + 4.2, { c: shadeC(wallC, 1.08), m: MAT.PLAIN, topM: MAT.FLATROOF, topC: COL.roofGray, seed, base: y0 });
  // porche d'entrée coloré, cour pavée, drapeau
  boite(g, R.rect(-1.5, 1.5, 0, 1.5), y0 + 2.7, y0 + 2.88, { c: hex("#3f6fa8"), m: MAT.PLAIN });
  const cour = R.rect(-width / 2, width / 2, 0, 2.6);
  flat(g, cour[0], cour[1], cour[2], cour[3], 0.17, COL.paving, MAT.PAVING);
  const [mx, mz] = R.point(width / 2 - 0.8, 1.8);
  drapeau(g, mx, mz, 6.0, hex("#2b5fa8"), R.lateral);
  // matériel de toiture
  const ax = rr(r, fp[0] + 1.2, fp[2] - 2.4),
    az = rr(r, fp[1] + 1.2, fp[3] - 2.0);
  box(g, ax, y0 + h, az, ax + 1.2, y0 + h + 0.75, az + 0.9, { c: COL.metal, m: MAT.PLAIN });
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h });
}

function serviceClinique(g: Geo, rect: Rect, front: Facade, r: RNG, ao: TamponAO[], seed: number) {
  const wallC = pick(r, SERVICES_WALLS);
  const width = rr(r, 9.0, 10.0),
    depth = rr(r, 7.0, 8.0);
  const fp = placeInLot(rect, front, width, depth, 3.0, rr(r, -0.6, 0.6));
  const y0 = 0.15,
    h = rr(r, 6.6, 7.4);
  box(g, fp[0], y0, fp[1], fp[2], y0 + h, fp[3], {
    c: wallC,
    m: MAT.APART,
    front,
    frontM: MAT.APART_FRONT,
    topM: MAT.FLATROOF,
    topC: COL.roofGray,
    seed,
    base: y0,
  });
  parapet(g, fp, y0 + h, SERVICES_BANDEAU, seed);
  const R = repere(front, fp);
  // bandeau turquoise, croix bien visible, auvent des urgences, ambulance
  boite(g, R.rect(-width / 2 - 0.05, width / 2 + 0.05, -depth - 0.05, 0.05), y0 + h - 1.1, y0 + h - 0.5, {
    c: SERVICES_BANDEAU,
    m: MAT.PLAIN,
    top: false,
    seed,
  });
  croixFacade(g, R, 0, y0 + h * 0.5, 1.3);
  const urgences = R.rect(width * 0.12, width * 0.46, 0, 2.2);
  boite(g, urgences, y0 + 2.6, y0 + 2.8, { c: SERVICES_CROIX, m: MAT.PLAIN });
  if (r() < 0.7) {
    const [ax, az] = R.point(width * 0.29, 1.5);
    car(g, ax, az, R.lateral, r, 0.17);
  }
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h });
}

function serviceHopital(g: Geo, rect: Rect, front: Facade, r: RNG, ao: TamponAO[], seed: number) {
  const wallC = pick(r, SERVICES_WALLS);
  const width = rr(r, 8.4, 9.2),
    depth = rr(r, 8.0, 9.0);
  // pas de décalage latéral : l'aile latérale reste dans la parcelle
  const fp = placeInLot(rect, front, width, depth, 3.0, 0);
  const y0 = 0.15,
    h = rr(r, 9.0, 10.2);
  box(g, fp[0], y0, fp[1], fp[2], y0 + h, fp[3], {
    c: wallC,
    m: MAT.APART,
    front,
    frontM: MAT.APART_FRONT,
    topM: MAT.FLATROOF,
    topC: COL.roofGray,
    seed,
    base: y0,
  });
  parapet(g, fp, y0 + h, SERVICES_BANDEAU, seed);
  const R = repere(front, fp);
  // aile latérale basse (deux étages) du côté tiré au sort, restant dans la parcelle
  const cote = r() < 0.5 ? -1 : 1;
  const aile = cote > 0 ? R.rect(width / 2 - 0.3, width / 2 + 2.4, -depth * 0.75, -depth * 0.1) : R.rect(-width / 2 - 2.4, -width / 2 + 0.3, -depth * 0.75, -depth * 0.1);
  boite(g, aile, y0, y0 + 5.6, {
    c: shadeC(wallC, 0.97),
    m: MAT.APART,
    topM: MAT.FLATROOF,
    topC: COL.roofGray,
    seed,
    base: y0,
  });
  // bandeau turquoise à mi-hauteur, grande croix, auvent des urgences rouge, ambulance
  boite(g, R.rect(-width / 2 - 0.05, width / 2 + 0.05, -depth - 0.05, 0.05), y0 + h * 0.55, y0 + h * 0.55 + 0.5, {
    c: SERVICES_BANDEAU,
    m: MAT.PLAIN,
    top: false,
    seed,
  });
  croixFacade(g, R, 0, y0 + h * 0.64, 1.9);
  boite(g, R.rect(-1.9, 1.9, 0, 2.3), y0 + 2.7, y0 + 2.9, { c: SERVICES_CROIX, m: MAT.PLAIN });
  // hélistation sur le toit, côté arrière
  const cx = (fp[0] + fp[2]) / 2,
    cz = (fp[1] + fp[3]) / 2;
  const [hx, hz] = R.point(0, -depth * 0.55);
  flat(g, hx - 1.7, hz - 1.7, hx + 1.7, hz + 1.7, y0 + h + 0.02, COL.helipad, MAT.HELIPAD);
  box(g, hx - 0.5, y0 + h + 0.03, hz - 0.15, hx + 0.5, y0 + h + 0.06, hz + 0.15, { c: SERVICES_CROIX, m: MAT.PLAIN, top: false });
  void cx;
  void cz;
  if (r() < 0.8) {
    const [ax, az] = R.point(cote < 0 ? width * 0.3 : -width * 0.3, 1.6);
    car(g, ax, az, R.lateral, r, 0.17);
  }
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h });
}

export function buildServices(
  g: Geo,
  rect: Rect,
  front: Facade,
  niveau: number,
  r: RNG,
  ao: TamponAO[],
  seed: number
) {
  // Une silhouette différente par stade — et deux variantes pour les deux premiers
  // (A-INTEGRER §36 A : plus de simples boîtes à toit plat gris) : école ou mairie
  // (stade 0), collège ou clinique (stade 1), hôpital (stade 2).
  if (niveau <= 0) {
    if (r() < 0.5) serviceEcole(g, rect, front, r, ao, seed);
    else serviceMairie(g, rect, front, r, ao, seed);
  } else if (niveau === 1) {
    if (r() < 0.5) serviceCollege(g, rect, front, r, ao, seed);
    else serviceClinique(g, rect, front, r, ao, seed);
  } else {
    serviceHopital(g, rect, front, r, ao, seed);
  }
}

// ---------------------------------------------------------------------
// Recherche : laboratoire, rotonde, campus
// ---------------------------------------------------------------------

/** Rangée de panneaux solaires inclinés à plat sur un toit. */
function panneauxToit(g: Geo, x: number, z: number, yToit: number, l: number, p: number, seed: number) {
  box(g, x - l / 2, yToit, z - p / 2, x + l / 2, yToit + 0.14, z + p / 2, { c: shadeC(RECHERCHE_DOME, 0.5), m: MAT.PLAIN, seed });
  box(g, x - l / 2 + 0.1, yToit + 0.14, z - p / 2 + 0.1, x + l / 2 - 0.1, yToit + 0.17, z + p / 2 - 0.1, {
    c: RECHERCHE_PANNEAU,
    m: MAT.GLASS,
    seed,
  });
}

export function buildRecherche(
  g: Geo,
  rect: Rect,
  front: Facade,
  niveau: number,
  r: RNG,
  ao: TamponAO[],
  seed: number
) {
  const wallC = pick(r, RECHERCHE_WALLS);
  const y0 = 0.15;
  // Stade 1 : deux silhouettes — le bloc de laboratoires ou la rotonde vitrée.
  if (niveau === 1 && r() < 0.45) {
    const rayon = rr(r, 4.1, 4.6);
    const fp = placeInLot(rect, front, rayon * 2, rayon * 2, 3.0, rr(r, -0.6, 0.6));
    const cx = (fp[0] + fp[2]) / 2,
      cz = (fp[1] + fp[3]) / 2;
    const h = rr(r, 6.0, 6.8);
    cylinder(g, cx, y0, cz, rayon, h, 20, wallC, MAT.APART, MAT.FLATROOF, COL.roofGray);
    // ceinture vitrée et corniche
    cylinder(g, cx, y0 + h * 0.35, cz, rayon + 0.04, h * 0.3, 20, RECHERCHE_PANNEAU, MAT.GLASS, null, null);
    cylinder(g, cx, y0 + h, cz, rayon + 0.25, 0.4, 20, shadeC(wallC, 0.85), MAT.PLAIN, MAT.PLAIN, shadeC(wallC, 0.85));
    // dôme d'observatoire au centre
    cylinder(g, cx, y0 + h + 0.4, cz, 2.0, 0.3, 16, shadeC(RECHERCHE_DOME, 0.9), MAT.PLAIN, null, null);
    cylinder(g, cx, y0 + h + 0.7, cz, 1.9, 1.5, 16, RECHERCHE_DOME, MAT.GLASS, MAT.GLASS, RECHERCHE_DOME, 0.2);
    ao.push({ x0: cx - rayon, z0: cz - rayon, x1: cx + rayon, z1: cz + rayon, w: 1, h });
    return;
  }

  // Largeur plafonnée : au stade campus, l'aile latérale doit rester dans la parcelle de 14,5 m.
  const width = Math.min(9.8, rr(r, 8.4, 9.4) + niveau * rr(r, 0.5, 1.1)),
    depth = rr(r, 7.4, 8.8) + niveau * rr(r, 0.4, 0.9);
  const fp = placeInLot(rect, front, width, depth, 3.0, rr(r, -0.4, 0.4));
  const h = niveau === 0 ? rr(r, 4.0, 4.6) : niveau === 1 ? rr(r, 6.4, 7.2) : rr(r, 7.6, 8.6);
  box(g, fp[0], y0, fp[1], fp[2], y0 + h, fp[3], {
    c: wallC,
    m: MAT.APART,
    front,
    frontM: MAT.GLASS, // façade côté rue entièrement vitrée
    topM: MAT.FLATROOF,
    topC: COL.roofGray,
    seed,
    base: y0,
  });
  parapet(g, fp, y0 + h, RECHERCHE_PANNEAU, seed);
  const R = repere(front, fp);
  // annexe basse accolée côté rue (sas d'entrée vitré) et bandeau sombre sous le toit
  boite(g, R.rect(-2.0, 2.0, 0, 1.6), y0, y0 + 2.8, { c: RECHERCHE_PANNEAU, m: MAT.GLASS, topM: MAT.FLATROOF, topC: COL.roofGray, seed, base: y0 });
  box(g, fp[0], y0 + h - 0.8, fp[1], fp[2], y0 + h - 0.35, fp[3], { c: RECHERCHE_PANNEAU, m: MAT.PLAIN, top: false, seed });
  // panneaux solaires sur tous les stades, au centre du toit
  panneauxToit(g, (fp[0] + fp[2]) / 2 - width * 0.12, (fp[1] + fp[3]) / 2, y0 + h, Math.min(3.4, width * 0.4), 2.2, seed);
  if (niveau >= 1) {
    // dôme d'observatoire, décalé sur un coin du toit
    const dx = fp[0] + (fp[2] - fp[0]) * rr(r, 0.65, 0.8),
      dz = fp[1] + (fp[3] - fp[1]) * rr(r, 0.2, 0.35);
    cylinder(g, dx, y0 + h, dz, 1.4, 0.3, 14, shadeC(RECHERCHE_DOME, 0.9), MAT.PLAIN, null, null);
    cylinder(g, dx, y0 + h + 0.3, dz, 1.3, 1.1, 14, RECHERCHE_DOME, MAT.GLASS, MAT.GLASS, RECHERCHE_DOME, 0.15);
  }
  if (niveau >= 2) {
    // campus : aile latérale basse, second dôme, antenne
    const aile = R.rect(width / 2 - 0.3, width / 2 + 2.0, -depth * 0.7, -depth * 0.15);
    boite(g, aile, y0, y0 + 4.4, { c: shadeC(wallC, 0.96), m: MAT.APART, topM: MAT.FLATROOF, topC: COL.roofGray, seed, base: y0 });
    const dx2 = fp[0] + (fp[2] - fp[0]) * rr(r, 0.18, 0.32),
      dz2 = fp[1] + (fp[3] - fp[1]) * rr(r, 0.65, 0.8);
    cylinder(g, dx2, y0 + h, dz2, 0.85, 0.7, 12, RECHERCHE_DOME, MAT.GLASS, MAT.GLASS, RECHERCHE_DOME, 0.1);
    const ax = fp[0] + (fp[2] - fp[0]) * 0.92;
    box(g, ax - 0.08, y0 + h, dz2, ax + 0.08, y0 + h + 2.4, dz2 + 0.16, { c: COL.metal, m: MAT.PLAIN });
  }
  ao.push({ x0: fp[0], z0: fp[1], x1: fp[2], z1: fp[3], w: 1, h });
}

/** Loisirs, second stade : un stade simplifié (gradins ovales + pelouse). */
export function buildStade(g: Geo, rect: Rect, r: RNG, ao: TamponAO[], seed: number) {
  const [x0, z0, x1, z1] = rect;
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  const rx = (x1 - x0) / 2 - 1.5,
    rz = (z1 - z0) / 2 - 1.5;
  flat(g, cx - rx * 0.6, cz - rz * 0.4, cx + rx * 0.6, cz + rz * 0.4, 0.17, COL.lawn, MAT.LAWN, seed);
  const segs = 16;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2,
      a1 = ((i + 1) / segs) * Math.PI * 2;
    const ex0 = cx + Math.cos(a0) * rx,
      ez0 = cz + Math.sin(a0) * rz * 0.85;
    const ex1 = cx + Math.cos(a1) * rx,
      ez1 = cz + Math.sin(a1) * rz * 0.85;
    const ix0 = cx + Math.cos(a0) * rx * 0.78,
      iz0 = cz + Math.sin(a0) * rz * 0.68;
    const ix1 = cx + Math.cos(a1) * rx * 0.78,
      iz1 = cz + Math.sin(a1) * rz * 0.68;
    box(g, Math.min(ex0, ix0, ex1, ix1) - 0.02, 0.15, Math.min(ez0, iz0, ez1, iz1) - 0.02, Math.max(ex0, ix0, ex1, ix1) + 0.02, 2.4, Math.max(ez0, iz0, ez1, iz1) + 0.02, {
      c: shadeC(COL.concrete, 0.95 + 0.05 * ((i % 2) as number)),
      m: MAT.CONCRETE,
      seed: seed + i,
    });
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rr(r, -0.1, 0.1);
    const px = cx + Math.cos(a) * rx * 1.05,
      pz = cz + Math.sin(a) * rz * 0.95;
    box(g, px - 0.25, 2.4, pz - 0.25, px + 0.25, 8.5, pz + 0.25, { c: COL.metal, m: MAT.PLAIN });
  }
  ao.push({ x0: cx - rx, z0: cz - rz, x1: cx + rx, z1: cz + rz, w: 1, h: 2.4 });
}

export type VocationQuartier = "residentiel" | "industrie" | "commerce" | "loisirs" | "services" | "recherche";
