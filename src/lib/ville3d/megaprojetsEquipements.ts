/**
 * Mégaprojets « équipements » (docs/A-INTEGRER.md §44) : Parc des sports, Stade, Grand stade,
 * Marché couvert, Zone logistique, Gare TGV, Aéroport. Structures ouvertes, halles, voûtes et
 * hangars, chacun dans la matière naturelle de l'ouvrage réel (béton et gradins colorés, fonte
 * verte et verrière, bardage métallique, acier et verre) plutôt que dans une teinte d'activité.
 *
 * Retour d'Adrien du 05/10/2026 (« très peu développés et moches », le Grand stade en tête) et
 * taille réelle du §45 : volumes en fractions de R et de H, détails aux vraies cotes (marches de
 * 17 cm, voitures de 4,3 m, mâts de 18 cm), abords plantés. Voir megaprojetsFormes.ts.
 */
import { COL, COMMERCE_ENSEIGNE, INDUSTRIE_ACCENT, MAT, hex, type Couleur } from "./constantes";
import { box, cylinder, flat, type Geo } from "./geometrie";
import { banc } from "./mobilier";
import { disque, tronc } from "./monumentsFormes";
import {
  BASE,
  ETAGE,
  acrotere,
  allee,
  anneauPente,
  boutVoute,
  escalier,
  haut,
  matLumineux,
  murOvale,
  parking,
  pelouse,
  pelouseRayee,
  pilastres,
  plateforme,
  px,
  pz,
  quad,
  rangeeArbres,
  toit2pans,
  tri,
  voiture,
  voute,
  volume,
  zone,
  type Site,
} from "./megaprojetsFormes";

const BLANC = hex("#f1eee7");
const LIGNE = hex("#f4f4f0");
const SIEGE_BLEU = hex("#3b6aa8");
const SIEGE_BLANC = hex("#e6e6e3");
const SIEGE_ROUGE = hex("#b4483c");
const TOIT_PLAT = { topM: MAT.FLATROOF, topC: COL.roofGray };

/** Terrain de football aux lignes blanches (périmètre, médiane, rond central, surfaces, buts) sur une pelouse rayée par la tonte. */
function terrainFoot(s: Site, x: number, z: number, dX: number, dZ: number) {
  const { g } = s;
  pelouseRayee(g, [x - dX, z - dZ, x + dX, z + dZ], 10, false, s.seed, 0.03);
  const y = BASE + 0.03,
    e = Math.max(0.14, dX * 0.012);
  const trait = (a0: number, b0: number, a1: number, b1: number) => box(g, a0, y, b0, a1, y + 0.025, b1, { c: LIGNE, m: MAT.PAINT, seed: s.seed });
  trait(x - dX, z - dZ, x + dX, z - dZ + e);
  trait(x - dX, z + dZ - e, x + dX, z + dZ);
  trait(x - dX, z - dZ, x - dX + e, z + dZ);
  trait(x + dX - e, z - dZ, x + dX, z + dZ);
  trait(x - e / 2, z - dZ, x + e / 2, z + dZ);
  const rc = dZ * 0.3;
  anneauPente(g, x, z, rc - e, rc - e, y + 0.025, rc, rc, y + 0.025, 24, LIGNE, MAT.PAINT, s.seed);
  for (const sg of [-1, 1]) {
    const xa = x + sg * dX,
      xb = x + sg * (dX - dX * 0.24),
      zz = dZ * 0.5;
    trait(Math.min(xa, xb), z - zz, Math.max(xa, xb), z - zz + e);
    trait(Math.min(xa, xb), z + zz - e, Math.max(xa, xb), z + zz);
    trait(xb - e / 2, z - zz, xb + e / 2, z + zz);
    // but : deux poteaux et une barre transversale
    const xg = xa + sg * 0.1;
    box(g, xg - 0.06, y, z - 1.8, xg + 0.06, y + 2.4, z - 1.65, { c: LIGNE, m: MAT.PLAIN, seed: s.seed });
    box(g, xg - 0.06, y, z + 1.65, xg + 0.06, y + 2.4, z + 1.8, { c: LIGNE, m: MAT.PLAIN, seed: s.seed });
    box(g, xg - 0.06, y + 2.3, z - 1.8, xg + 0.06, y + 2.45, z + 1.8, { c: LIGNE, m: MAT.PLAIN, seed: s.seed });
  }
}

/** Parc des sports : piste d'athlétisme rouge autour d'une pelouse, tribune à toit léger, club-house, trois courts de tennis et de basket, mâts. */
export function parcSports(s: Site) {
  const { g, R, H } = s;
  plateforme(s, hex("#d6cdbb"));
  for (const r of [zone(s, -1, -1, 1, -0.9), zone(s, -1, -0.9, -0.94, 1), zone(s, 0.94, -0.9, 1, 1)]) pelouse(g, r, s.seed);
  // piste d'athlétisme : anneau rouge à couloirs blancs, pelouse rayée au centre
  const ox = px(s, -0.18),
    oz = pz(s, -0.12),
    yp = BASE + 0.02;
  anneauPente(g, ox, oz, 0.5 * R, 0.31 * R, yp, 0.74 * R, 0.46 * R, yp, 36, hex("#b5563c"), MAT.PLAIN, s.seed);
  for (const k of [0.5, 0.56, 0.62, 0.68, 0.74]) {
    const kz = 0.31 + ((k - 0.5) / 0.24) * 0.15;
    anneauPente(g, ox, oz, k * R - 0.07, kz * R - 0.07, yp + 0.012, k * R, kz * R, yp + 0.012, 36, LIGNE, MAT.PAINT, s.seed);
  }
  terrainFoot(s, ox, oz, 0.34 * R, 0.19 * R);
  // tribune de quatre gradins de béton à sièges bleus, sous un toit léger sur piliers
  const gz = 0.5;
  for (let k = 0; k < 4; k++) {
    const r = zone(s, -0.7, gz + 0.065 * k, 0.34, gz + 0.065 * (k + 1));
    volume(s, r, BASE, BASE + 0.75 * (k + 1), { c: COL.concrete, m: MAT.CONCRETE, top: false });
    volume(s, r, BASE + 0.75 * (k + 1), BASE + 0.75 * (k + 1) + 0.05, { c: SIEGE_BLEU, m: MAT.PLAIN });
  }
  volume(s, zone(s, -0.72, gz + 0.08, 0.36, gz + 0.3), BASE + 4.6, BASE + 4.85, { c: BLANC, m: MAT.PLAIN });
  for (const a of [-0.7, -0.2, 0.3]) box(g, px(s, a) - 0.12, BASE, pz(s, gz + 0.27) - 0.12, px(s, a) + 0.12, BASE + 4.6, pz(s, gz + 0.27) + 0.12, { c: COL.metal, m: MAT.PLAIN, seed: s.seed });
  // club-house de deux niveaux à acrotère rouge
  const club = zone(s, -0.66, 0.78, 0.28, 0.97);
  volume(s, club, BASE, BASE + 2 * ETAGE, { c: BLANC, m: MAT.APART, ...TOIT_PLAT });
  acrotere(g, club, BASE + 2 * ETAGE, hex("#a8402f"), 0.6, 0.3, s.seed);
  // trois courts : deux de tennis, un de basket, entourés d'un grillage
  const court = (r: ReturnType<typeof zone>, c: Couleur, filet: boolean) => {
    flat(g, r[0], r[1], r[2], r[3], BASE + 0.025, c, MAT.PLAIN, s.seed);
    const e = 0.1,
      y = BASE + 0.025;
    for (const t of [
      [r[0] + 0.4, r[1] + 0.4, r[2] - 0.4, r[1] + 0.4 + e],
      [r[0] + 0.4, r[3] - 0.4 - e, r[2] - 0.4, r[3] - 0.4],
      [r[0] + 0.4, r[1] + 0.4, r[0] + 0.4 + e, r[3] - 0.4],
      [r[2] - 0.4 - e, r[1] + 0.4, r[2] - 0.4, r[3] - 0.4],
    ] as const)
      box(g, t[0], y, t[1], t[2], y + 0.015, t[3], { c: LIGNE, m: MAT.PAINT, seed: s.seed });
    if (filet) box(g, r[0] + 0.4, y, (r[1] + r[3]) / 2 - 0.04, r[2] - 0.4, y + 1.0, (r[1] + r[3]) / 2 + 0.04, { c: hex("#262a2f"), m: MAT.PLAIN, seed: s.seed });
    for (const f of [
      [r[0], r[1], r[2], r[1] + 0.06],
      [r[0], r[3] - 0.06, r[2], r[3]],
      [r[0], r[1], r[0] + 0.06, r[3]],
      [r[2] - 0.06, r[1], r[2], r[3]],
    ] as const)
      box(g, f[0], BASE, f[1], f[2], BASE + 3, f[3], { c: COL.fence, m: MAT.FENCE, seed: s.seed });
  };
  court(zone(s, 0.58, -0.82, 0.94, -0.42), hex("#3b79b3"), true);
  court(zone(s, 0.58, -0.36, 0.94, 0.04), hex("#3b79b3"), true);
  court(zone(s, 0.58, 0.1, 0.94, 0.5), hex("#c9733a"), false);
  // mâts d'éclairage et arbres
  for (const [a, b] of [
    [-0.92, -0.82],
    [0.5, -0.82],
    [-0.92, 0.46],
  ] as const)
    matLumineux(g, px(s, a), pz(s, b), BASE, H * 0.95, s.seed);
  rangeeArbres(s, px(s, -0.9), px(s, 0.9), pz(s, -0.95), true, 6);
  rangeeArbres(s, pz(s, 0.5), pz(s, 0.95), px(s, 0.94), false, 6);
}

/**
 * Pylône d'éclairage de stade (A-INTEGRER §49 D, taille réelle) : fût métallique de 60 cm, deux rangées de
 * projecteurs en `MAT.LAMP` (ils s'allument la nuit), échelle d'accès. Un mât de 20 cm (matLumineux) ne se
 * voit plus à côté d'une cuvette de 120 m.
 */
function pylone(g: Geo, x: number, z: number, y0: number, h: number, seed: number, face: "x" | "z") {
  box(g, x - 0.3, y0, z - 0.3, x + 0.3, y0 + h, z + 0.3, { c: COL.metal, m: MAT.PLAIN, seed });
  box(g, x - 0.9, y0, z - 0.9, x + 0.9, y0 + 1.2, z + 0.9, { c: hex("#aab0b6"), m: MAT.PLAIN, seed });
  // Deux rangées de quatre projecteurs, orientées vers le terrain.
  for (const dy of [0, 1.7])
    for (let k = 0; k < 4; k++) {
      const t = (k - 1.5) * 1.5;
      const [px0, pz0] = face === "x" ? [x, z + t] : [x + t, z];
      box(g, px0 - (face === "x" ? 0.35 : 0.65), y0 + h - 1.6 + dy, pz0 - (face === "x" ? 0.65 : 0.35), px0 + (face === "x" ? 0.35 : 0.65), y0 + h - 0.6 + dy, pz0 + (face === "x" ? 0.65 : 0.35), {
        c: [1, 0.96, 0.85],
        m: MAT.LAMP,
        seed,
      });
    }
  box(g, x - 3.4, y0 + h - 2, z - 0.15, x + 3.4, y0 + h - 1.85, z + 0.15, { c: COL.metal, m: MAT.PLAIN, seed });
}

/** Panneaux publicitaires bas autour de la pelouse : une file de caissons colorés, côté touche et derrière chaque but. */
function panneauxPub(s: Site, x: number, z: number, dX: number, dZ: number) {
  const { g } = s;
  const couleurs = [SIEGE_BLEU, SIEGE_ROUGE, SIEGE_BLANC, hex("#d9a441")];
  const pas = 4.2;
  const y = BASE;
  for (const sg of [-1, 1]) {
    const zz = z + sg * (dZ + 1.4);
    const n = Math.floor((2 * dX) / pas);
    for (let k = 0; k < n; k++) {
      const xa = x - dX + k * pas + 0.1;
      box(g, xa, y, zz - 0.2, xa + pas - 0.2, y + 0.9, zz + 0.2, { c: couleurs[(k + (sg > 0 ? 1 : 0)) % 4], m: MAT.PAINT, seed: s.seed });
    }
    const xx = x + sg * (dX + 1.4);
    const m = Math.floor((2 * dZ) / pas);
    for (let k = 0; k < m; k++) {
      const za = z - dZ + k * pas + 0.1;
      box(g, xx - 0.2, y, za, xx + 0.2, y + 0.9, za + pas - 0.2, { c: couleurs[(k + 2) % 4], m: MAT.PAINT, seed: s.seed });
    }
  }
}

/** Abris de touche : deux bancs couverts, côté +z de la pelouse, de part et d'autre de la médiane. */
function abrisTouche(s: Site, x: number, z: number, dZ: number) {
  const { g } = s;
  for (const sg of [-1, 1]) {
    const xc = x + sg * 9,
      zc = z + dZ + 4.5;
    box(g, xc - 4, BASE, zc - 0.9, xc + 4, BASE + 0.55, zc + 0.9, { c: SIEGE_BLEU, m: MAT.PAINT, seed: s.seed });
    box(g, xc - 4.4, BASE + 2.3, zc - 1.3, xc + 4.4, BASE + 2.45, zc + 1.3, { c: hex("#d7dee5"), m: MAT.GLASS, seed: s.seed });
    for (const e of [-1, 1]) box(g, xc + e * 4.2 - 0.07, BASE, zc - 1.2, xc + e * 4.2 + 0.07, BASE + 2.4, zc - 1.1, { c: COL.metal, m: MAT.PLAIN, seed: s.seed });
  }
}

/** Mâts à fanions sur le haut du mur : une hampe de 7 m et une flamme de couleur toutes les `pas` positions angulaires. */
function fanions(s: Site, rx: number, rz: number, y: number, n: number, cols: Couleur[]) {
  const { g, cx, cz } = s;
  for (let k = 0; k < n; k++) {
    const a = ((k + 0.5) / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx,
      z = cz + Math.sin(a) * rz;
    box(g, x - 0.07, y, z - 0.07, x + 0.07, y + 6.5, z + 0.07, { c: COL.metal, m: MAT.PLAIN, seed: s.seed });
    const c = cols[k % cols.length];
    const dir: [number, number, number] = [-Math.sin(a), 0, Math.cos(a)];
    quad(g, [x, y + 6.4, z], [x + dir[0] * 2.2, y + 6.2, z + dir[2] * 2.2], [x + dir[0] * 2.2, y + 5.1, z + dir[2] * 2.2], [x, y + 5.0, z], c, MAT.PAINT, [Math.cos(a), 0.3, Math.sin(a)], s.seed);
  }
}

/** Entrée de stade : porche sombre surmonté d'une enseigne, guichets et portiques sur le parvis (de profondeur `prof`, jusqu'au bord de la plateforme), allée dallée vers la rue. */
function entree(s: Site, x: number, z: number, sens: "+x" | "-x" | "+z" | "-z", largeur: number, prof: number) {
  const { g } = s;
  const sg = sens[0] === "+" ? 1 : -1;
  const surX = sens[1] === "x";
  const demi = largeur / 2;
  // porche et enseigne (axe de l'entrée = axe du mur à cet endroit)
  const porche = (a: number, b: number, c: number, d: number, y0: number, y1: number, col: Couleur, m: number) =>
    surX ? box(g, x + sg * a, y0, z - d, x + sg * b, y1, z + d, { c: col, m, top: false, seed: s.seed }) : box(g, x - d, y0, z + sg * a, x + d, y1, z + sg * b, { c: col, m, top: false, seed: s.seed });
  porche(-1.5, 1.6, 0, demi, BASE, BASE + 6.2, hex("#2b3036"), MAT.PLAIN);
  porche(-1.9, 2.2, 0, demi + 0.7, BASE + 6.2, BASE + 7.8, SIEGE_ROUGE, MAT.PAINT);
  porche(2.2, 2.5, 0, demi + 0.7, BASE + 6.4, BASE + 7.6, hex("#f1eee7"), MAT.PAINT);
  // guichets et portiques sur le parvis
  for (let k = 0; k < 4; k++) {
    const t = (k - 1.5) * (largeur / 4.2);
    const a = prof * 0.42;
    if (surX) {
      box(g, x + sg * a - 0.6, BASE, z + t - 0.8, x + sg * a + 0.6, BASE + 2.3, z + t + 0.8, { c: hex("#cfd5da"), m: MAT.PLAIN, seed: s.seed });
      box(g, x + sg * (a + prof * 0.38) - 0.1, BASE, z + t - 0.6, x + sg * (a + prof * 0.38) + 0.1, BASE + 1.1, z + t + 0.6, { c: COL.metal, m: MAT.PLAIN, seed: s.seed });
    } else {
      box(g, x + t - 0.8, BASE, z + sg * a - 0.6, x + t + 0.8, BASE + 2.3, z + sg * a + 0.6, { c: hex("#cfd5da"), m: MAT.PLAIN, seed: s.seed });
      box(g, x + t - 0.6, BASE, z + sg * (a + prof * 0.38) - 0.1, x + t + 0.6, BASE + 1.1, z + sg * (a + prof * 0.38) + 0.1, { c: COL.metal, m: MAT.PLAIN, seed: s.seed });
    }
  }
  allee(g, surX ? [Math.min(x, x + sg * prof), z - demi - 1, Math.max(x, x + sg * prof), z + demi + 1] : [x - demi - 1, Math.min(z, z + sg * prof), x + demi + 1, Math.max(z, z + sg * prof)], s.seed);
}

/**
 * Cuvette de stade : gradins inclinés à sièges par secteurs avec allées d'escalier, déambulatoire sombre à mi-hauteur,
 * mur extérieur à pilastres et vomitoires, corniche et garde-corps de pelouse.
 */
function cuvette(
  s: Site,
  o: { rxO: number; rzO: number; rxI: number; rzI: number; hauteur: number; seg: number; mur: Couleur; sieges: [Couleur, Couleur]; pilastres: number; vomitoires: number }
) {
  const { g, cx, cz, R } = s;
  const yBas = BASE + 0.8;
  const yHaut = BASE + o.hauteur;
  const rxM = (o.rxI + o.rxO) / 2,
    rzM = (o.rzI + o.rzO) / 2;
  const yM = BASE + 0.8 + (o.hauteur - 0.8) * 0.5;
  murOvale(g, cx, cz, o.rxO * R, o.rzO * R, BASE, yHaut, o.seg, (i) => (i % 2 ? hex("#d9d6ce") : o.mur), MAT.PLAIN, true, s.seed);
  // Deux niveaux de gradins séparés par un déambulatoire sombre (un mur vitré, vu de l'intérieur du stade).
  const sieges = (i: number) => (i % 6 === 0 ? hex("#4a4e55") : o.sieges[Math.floor(i / 6) % 2]);
  anneauPente(g, cx, cz, o.rxI * R, o.rzI * R, yBas, rxM * R, rzM * R, yM, o.seg, sieges, MAT.PLAIN, s.seed);
  murOvale(g, cx, cz, rxM * R, rzM * R, yM, yM + 1.6, o.seg, hex("#33495c"), MAT.DARKGLASS, false, s.seed);
  anneauPente(g, cx, cz, rxM * R, rzM * R, yM + 1.6, o.rxO * R * 0.995, o.rzO * R * 0.995, yHaut, o.seg, sieges, MAT.PLAIN, s.seed);
  murOvale(g, cx, cz, o.rxI * R, o.rzI * R, BASE, yBas, o.seg, SIEGE_BLANC, MAT.PLAIN, false, s.seed);
  // Corniche : un bandeau saillant tout autour du haut du mur.
  murOvale(g, cx, cz, o.rxO * R + 0.5, o.rzO * R + 0.5, yHaut - 0.9, yHaut + 0.3, o.seg, hex("#f4f2ec"), MAT.PLAIN, true, s.seed);
  // Bandeau vitré sombre sur le mur, à hauteur du déambulatoire.
  murOvale(g, cx, cz, o.rxO * R + 0.1, o.rzO * R + 0.1, BASE + o.hauteur * 0.46, BASE + o.hauteur * 0.62, o.seg, hex("#33495c"), MAT.DARKGLASS, true, s.seed);
  // Pilastres verticaux sur le mur extérieur, qui dépassent d'un mètre, et vomitoires sombres entre eux.
  for (let k = 0; k < o.pilastres; k++) {
    const a = (k / o.pilastres) * Math.PI * 2;
    const x = cx + Math.cos(a) * o.rxO * R,
      z = cz + Math.sin(a) * o.rzO * R;
    box(g, x - 0.45, BASE, z - 0.45, x + 0.45, yHaut + 1, z + 0.45, { c: BLANC, m: MAT.PLAIN, top: true, seed: s.seed });
  }
  for (let k = 0; k < o.vomitoires; k++) {
    const a = ((k + 0.5) / o.vomitoires) * Math.PI * 2;
    const x = cx + Math.cos(a) * (o.rxO * R + 0.1),
      z = cz + Math.sin(a) * (o.rzO * R + 0.1);
    box(g, x - 1.1, BASE, z - 1.1, x + 1.1, BASE + o.hauteur * 0.3, z + 1.1, { c: hex("#2b3036"), m: MAT.PLAIN, top: false, seed: s.seed });
  }
}

/** Stade (A-INTEGRER §49 D : 2 × 2 blocs, 136 m de plateforme) : cuvette à deux niveaux, toitures des tribunes, quatre pylônes, entrées, parkings, panneaux publicitaires. */
export function stade(s: Site) {
  const { g, cx, cz, R, H } = s;
  plateforme(s, hex("#cdc7b8"));
  const hW = 0.34 * H;
  const SEG = 72;
  // Pelouses aux extrémités, parkings le long des deux grands côtés.
  for (const r of [zone(s, -1, -1, -0.94, 1), zone(s, 0.94, -1, 1, 1)]) pelouse(g, r, s.seed);
  parking(s, zone(s, -0.86, 0.82, 0.86, 0.97), true, 0.45);
  parking(s, zone(s, -0.86, -0.97, 0.86, -0.82), true, 0.45);
  cuvette(s, { rxO: 0.9, rzO: 0.74, rxI: 0.62, rzI: 0.43, hauteur: hW, seg: SEG, mur: hex("#e6e3dc"), sieges: [SIEGE_BLEU, SIEGE_BLANC], pilastres: 48, vomitoires: 24 });
  terrainFoot(s, cx, cz, 0.46 * R, 0.28 * R);
  panneauxPub(s, cx, cz, 0.46 * R, 0.28 * R);
  abrisTouche(s, cx, cz, 0.28 * R);
  // Toits des deux tribunes latérales (côtés +z et -z), sur mâts d'appui, avec un bord de toit plus épais.
  for (const [a0, a1] of [
    [Math.PI * 0.1, Math.PI * 0.9],
    [Math.PI * 1.1, Math.PI * 1.9],
  ] as const) {
    anneauPente(g, cx, cz, 0.7 * R, 0.5 * R, BASE + hW + 1.5, 0.93 * R, 0.77 * R, BASE + hW + 4.2, 24, hex("#f3f1ea"), MAT.PLAIN, s.seed, a0, a1);
    anneauPente(g, cx, cz, 0.925 * R, 0.765 * R, BASE + hW + 4.2, 0.93 * R, 0.77 * R, BASE + hW + 4.2, 24, hex("#d9d7d0"), MAT.PLAIN, s.seed, a0, a1);
    for (let k = 0; k <= 10; k++) {
      const a = a0 + ((a1 - a0) * k) / 10;
      const x = cx + Math.cos(a) * 0.92 * R,
        z = cz + Math.sin(a) * 0.76 * R;
      box(g, x - 0.28, BASE, z - 0.28, x + 0.28, BASE + hW + 4.2, z + 0.28, { c: COL.metal, m: MAT.PLAIN, top: false, seed: s.seed });
    }
  }
  fanions(s, 0.9 * R, 0.74 * R, BASE + hW + 1, 12, [SIEGE_BLEU, SIEGE_ROUGE, SIEGE_BLANC]);
  // Quatre pylônes d'éclairage dans les angles du site, plus hauts que le toit.
  for (const [a, b] of [
    [-0.9, -0.88],
    [0.9, -0.88],
    [-0.9, 0.88],
    [0.9, 0.88],
  ] as const)
    pylone(g, px(s, a), pz(s, b), BASE, 0.9 * H, s.seed, b > 0 ? "z" : "z");
  // Entrées : aux deux bouts du stade, et au milieu de chacun des deux grands côtés.
  for (const sg of [-1, 1] as const) {
    entree(s, px(s, sg * 0.9), cz, sg > 0 ? "+x" : "-x", 8, 0.1 * R);
    entree(s, cx + sg * 0.22 * R, pz(s, 0.74), "+z", 8, 0.07 * R);
    entree(s, cx + sg * 0.22 * R, pz(s, -0.74), "-z", 8, 0.07 * R);
  }
  // Tableau d'affichage au bout ouest de la cuvette.
  box(g, px(s, -0.86) - 0.4, BASE + hW + 2.5, cz - 6, px(s, -0.86) + 0.4, BASE + hW + 7.6, cz + 6, { c: hex("#1b2128"), m: MAT.DARKGLASS, seed: s.seed });
  box(g, px(s, -0.86) - 0.45, BASE + hW + 5.4, cz - 5, px(s, -0.86) + 0.45, BASE + hW + 6.4, cz + 5, { c: [1, 0.85, 0.55], m: MAT.LAMP, seed: s.seed });
  for (const zz of [-5.5, 5.5]) box(g, px(s, -0.86) - 0.2, BASE + hW, cz + zz - 0.25, px(s, -0.86) + 0.2, BASE + hW + 2.5, cz + zz + 0.25, { c: COL.metal, m: MAT.PLAIN, seed: s.seed });
  rangeeArbres(s, px(s, -0.9), px(s, 0.9), pz(s, 0.985), true, 11, 1.3);
  rangeeArbres(s, px(s, -0.9), px(s, 0.9), pz(s, -0.985), true, 11, 1.3);
}

/**
 * Grand stade (A-INTEGRER §49 D : 3 × 2 blocs, plateforme de 216 × 136 m) : arène à deux niveaux, façade à pilastres et
 * bannières, toit-couronne blanc sur 24 mâts, pelouse de 87 × 55 m, parvis, parkings aux deux bouts. Bas et plus long
 * que large, comme un vrai stade. Retour d'Adrien du 05/10/2026 (« trop grand, disproportionné ») : la cuvette fait
 * 168 × 122 m, au lieu de 203 × 168 m dans le site de 3 × 3 blocs de la première version.
 */
export function grandStade(s: Site) {
  const { g, cx, cz, R, Rz, H } = s;
  plateforme(s, hex("#cfc8b8"));
  const hb = 0.3 * H,
    SEG = 88;
  const place = (i: number) => [SIEGE_BLEU, SIEGE_ROUGE][Math.floor(i / 6) % 2];
  // Demi-axes de la façade (l'ellipse extérieure) : tout le reste s'en déduit.
  const A = 0.78 * R,
    B = 0.9 * Rz;
  // Parvis dallé en couronne autour de l'arène, parkings aux deux bouts, avec une allée centrale pour l'entrée.
  anneauPente(g, cx, cz, A, B, BASE + 0.02, 1.07 * A, 1.1 * B, BASE + 0.02, SEG, hex("#e6dfcf"), MAT.PAVING, s.seed);
  for (const sx of [-1, 1] as const)
    for (const sz of [-1, 1] as const) {
      const r = zone(s, sx > 0 ? 0.86 : -0.98, sz > 0 ? 0.22 : -0.85, sx > 0 ? 0.98 : -0.86, sz > 0 ? 0.85 : -0.22);
      parking(s, r, false, 0.45);
    }
  // Façade basse : panneaux blancs, bandeaux vitrés sombres, pilastres rythmant le pourtour.
  murOvale(g, cx, cz, A, B, BASE, BASE + hb, SEG, (i) => (i % 2 ? hex("#e1dfd9") : hex("#ece9e3")), MAT.PLAIN, true, s.seed);
  murOvale(g, cx, cz, A + 0.15, B + 0.15, BASE + 0.14 * hb, BASE + 0.34 * hb, SEG, hex("#33495c"), MAT.DARKGLASS, true, s.seed);
  murOvale(g, cx, cz, A + 0.15, B + 0.15, BASE + 0.58 * hb, BASE + 0.76 * hb, SEG, hex("#33495c"), MAT.DARKGLASS, true, s.seed);
  const NP = 80;
  for (let k = 0; k < NP; k++) {
    const a = (k / NP) * Math.PI * 2;
    const x = cx + Math.cos(a) * A,
      z = cz + Math.sin(a) * B;
    box(g, x - 0.5, BASE, z - 0.5, x + 0.5, BASE + hb + 1.4, z + 0.5, { c: BLANC, m: MAT.PLAIN, top: true, seed: s.seed });
  }
  // Vomitoires : vingt portes sombres au pied de la façade.
  for (let k = 0; k < 20; k++) {
    const a = ((k + 0.5) / 20) * Math.PI * 2;
    const x = cx + Math.cos(a) * (A + 0.1),
      z = cz + Math.sin(a) * (B + 0.1);
    box(g, x - 1.4, BASE, z - 1.4, x + 1.4, BASE + 0.2 * hb, z + 1.4, { c: hex("#2b3036"), m: MAT.PLAIN, top: false, seed: s.seed });
  }
  // Bannières aux couleurs du club, une sur cinq pilastres.
  for (let k = 0; k < 16; k++) {
    const a0 = ((k * 5 + 1.2) / NP) * Math.PI * 2,
      a1 = ((k * 5 + 2.8) / NP) * Math.PI * 2;
    const p = (a: number, y: number): [number, number, number] => [cx + Math.cos(a) * (A + 0.4), y, cz + Math.sin(a) * (B + 0.4)];
    quad(g, p(a0, BASE + 0.38 * hb), p(a1, BASE + 0.38 * hb), p(a1, BASE + 0.54 * hb), p(a0, BASE + 0.54 * hb), k % 2 ? SIEGE_ROUGE : SIEGE_BLEU, MAT.PAINT, [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)], s.seed);
  }
  // Cuvette intérieure à deux niveaux (vue par l'ouverture du toit), pelouse tracée (87 × 55 m).
  const rxI = 0.787 * A,
    rzI = 0.667 * B;
  const yM = BASE + 0.8 + (0.62 * hb - 0.8) * 0.5;
  anneauPente(g, cx, cz, rxI, rzI, BASE + 0.8, 0.904 * A, 0.82 * B, yM, SEG, place, MAT.PLAIN, s.seed);
  murOvale(g, cx, cz, 0.904 * A, 0.82 * B, yM, yM + 1.8, SEG, hex("#33495c"), MAT.DARKGLASS, false, s.seed);
  anneauPente(g, cx, cz, 0.904 * A, 0.82 * B, yM + 1.8, 0.99 * A, 0.99 * B, BASE + 0.62 * hb, SEG, place, MAT.PLAIN, s.seed);
  murOvale(g, cx, cz, rxI, rzI, BASE, BASE + 0.8, SEG, SIEGE_BLANC, MAT.PLAIN, false, s.seed);
  terrainFoot(s, cx, cz, 0.52 * A, 0.45 * B);
  panneauxPub(s, cx, cz, 0.52 * A, 0.45 * B);
  abrisTouche(s, cx, cz, 0.45 * B);
  // Toit-couronne : du bord extérieur haut vers l'intérieur plus bas, tranches blanches, couronne de feux.
  anneauPente(g, cx, cz, 0.83 * A, 0.72 * B, BASE + hb - 0.5, 1.015 * A, 1.02 * B, BASE + hb + 3.2, SEG, hex("#f3f1ea"), MAT.PLAIN, s.seed);
  murOvale(g, cx, cz, 0.83 * A, 0.72 * B, BASE + hb - 1.8, BASE + hb - 0.5, SEG, hex("#d9d7d0"), MAT.PLAIN, false, s.seed);
  murOvale(g, cx, cz, 1.015 * A, 1.02 * B, BASE + hb, BASE + hb + 3.2, SEG, hex("#d9d7d0"), MAT.PLAIN, true, s.seed);
  for (let k = 0; k < SEG; k += 2) {
    const a = ((k + 0.5) / SEG) * Math.PI * 2;
    const x = cx + Math.cos(a) * 0.84 * A,
      z = cz + Math.sin(a) * 0.73 * B;
    box(g, x - 0.5, BASE + hb - 2.0, z - 0.5, x + 0.5, BASE + hb - 1.8, z + 0.5, { c: [1, 0.96, 0.85], m: MAT.LAMP, seed: s.seed });
  }
  // Vingt-quatre mâts d'appui du toit, qui le dépassent de huit mètres, et quatre pylônes d'éclairage dans les angles.
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    const x = cx + Math.cos(a) * 1.037 * A,
      z = cz + Math.sin(a) * 1.045 * B;
    box(g, x - 0.35, BASE, z - 0.35, x + 0.35, BASE + hb + 8, z + 0.35, { c: COL.metal, m: MAT.PLAIN, top: true, seed: s.seed });
  }
  fanions(s, 1.015 * A, 1.02 * B, BASE + hb + 3, 14, [SIEGE_BLEU, SIEGE_ROUGE, SIEGE_BLANC]);
  for (const [a, b] of [
    [-0.93, -0.93],
    [0.93, -0.93],
    [-0.93, 0.93],
    [0.93, 0.93],
  ] as const)
    pylone(g, px(s, a), pz(s, b), BASE, 0.62 * H, s.seed, "z");
  // Entrées : une au milieu de chaque bout, trois sur chaque grand côté.
  entree(s, cx + A, cz, "+x", 14, R - A);
  entree(s, cx - A, cz, "-x", 14, R - A);
  for (const sg of [-1, 1] as const)
    for (const t of [-0.45, 0, 0.45] as const) entree(s, cx + t * A, cz + sg * B, sg > 0 ? "+z" : "-z", 12, Rz - B);
  for (const sx of [-1, 1] as const) rangeeArbres(s, pz(s, -0.9), pz(s, 0.9), px(s, sx * 0.99), false, 13, 1.4);
}

/** Marché couvert : halle de brique et de fonte verte, arcades, nef à verrière et lanterneau, bas-côtés de zinc, enseigne, étals sous auvents rayés. */
export function marcheCouvert(s: Site) {
  const { g } = s;
  plateforme(s, hex("#d6cdbb"));
  const brique = hex("#a95f47"),
    fer = hex("#3f5a4c"),
    verriere = hex("#9fc4c0");
  for (const r of [zone(s, -1, -1, 1, -0.7), zone(s, -1, -0.7, -0.98, 1), zone(s, 0.98, -0.7, 1, 1)]) pelouse(g, r, s.seed);
  const hall = zone(s, -0.84, -0.58, 0.84, 0.58);
  // soubassement de brique à arcades sombres, nef haute vitrée, toit de verre à deux pans
  volume(s, hall, BASE, haut(s, 0.36), { c: brique, m: MAT.PLAIN, top: false });
  for (const cote of [-1, 1]) {
    const face = pz(s, cote * 0.58);
    for (let k = 0; k < 8; k++) {
      const a = -0.8 + k * 0.215;
      volume(s, cote > 0 ? [px(s, a), face, px(s, a + 0.12), face + 0.05] : [px(s, a), face - 0.05, px(s, a + 0.12), face], BASE, BASE + 3.2, { c: hex("#3a2f2a"), m: MAT.PLAIN, top: false });
    }
    pilastres(g, px(s, -0.84), px(s, 0.84), cote > 0 ? face : face - 0.4, true, BASE, haut(s, 0.36), 9, 0.4, 0.5, fer, s.seed);
  }
  volume(s, zone(s, -0.84, -0.38, 0.84, 0.38), haut(s, 0.36), haut(s, 0.58), { c: hex("#cfe3e0"), m: MAT.GLASS, top: false });
  const nef = zone(s, -0.86, -0.4, 0.86, 0.4);
  toit2pans(g, nef, haut(s, 0.58), haut(s, 0.86), true, verriere, MAT.DARKGLASS, fer, MAT.PLAIN, s.seed, 0.3);
  // faîtière de fonte et lanterneau de ventilation
  volume(s, [nef[0], pz(s, -0.03), nef[2], pz(s, 0.03)], haut(s, 0.86), haut(s, 0.86) + 0.5, { c: fer, m: MAT.PLAIN });
  volume(s, zone(s, -0.2, -0.1, 0.2, 0.1), haut(s, 0.86), haut(s, 0.86) + 2.2, { c: fer, m: MAT.PLAIN, top: false });
  toit2pans(g, zone(s, -0.2, -0.1, 0.2, 0.1), haut(s, 0.86) + 2.2, haut(s, 0.86) + 3.6, true, hex("#b8c9c4"), MAT.PLAIN, fer, MAT.PLAIN, s.seed);
  // bas-côtés de zinc
  for (const cote of [-1, 1])
    quad(g, [px(s, -0.86), haut(s, 0.36), pz(s, cote * 0.62)], [px(s, 0.86), haut(s, 0.36), pz(s, cote * 0.62)], [px(s, 0.86), haut(s, 0.44), pz(s, cote * 0.4)], [px(s, -0.86), haut(s, 0.44), pz(s, cote * 0.4)], hex("#8f9aa0"), MAT.PLAIN, [0, 1, cote], s.seed);
  // grande entrée en bout de nef : portail sombre, enseigne, cadran, perron
  volume(s, [px(s, 0.84), pz(s, -0.2), px(s, 0.84) + 0.1, pz(s, 0.2)], BASE, BASE + 5, { c: hex("#3a2f2a"), m: MAT.PLAIN, top: false });
  volume(s, [px(s, 0.84), pz(s, -0.3), px(s, 0.84) + 0.2, pz(s, 0.3)], BASE + 5.4, BASE + 6.8, { c: COMMERCE_ENSEIGNE[0], m: MAT.PAINT, top: false });
  disque(g, px(s, 0.84) + 0.25, haut(s, 0.7), pz(s, 0), 1.1, "+x", BLANC, MAT.PLAIN, 16);
  escalier(g, pz(s, -0.25), pz(s, 0.25), px(s, 0.84) + 0.2, "+x", 3, hex("#bdb3a0"), s.seed);
  // étals sous auvents rayés, caisses de fruits, banc, arbres
  [-0.78, -0.38, 0.02, 0.42].forEach((a, k) => {
    volume(s, zone(s, a, 0.7, a + 0.3, 0.86), BASE, BASE + 1.1, { c: hex("#8a6a4a"), m: MAT.PLAIN });
    volume(s, zone(s, a - 0.02, 0.66, a + 0.32, 0.9), BASE + 2.6, BASE + 2.8, { c: COMMERCE_ENSEIGNE[(k + 1) % 4], m: MAT.PAINT });
    for (const dx of [0.0, 0.3]) box(g, px(s, a + dx) - 0.07, BASE, pz(s, 0.9) - 0.07, px(s, a + dx) + 0.07, BASE + 2.6, pz(s, 0.9) + 0.07, { c: COL.metal, m: MAT.PLAIN, seed: s.seed });
    for (let c = 0; c < 3; c++) volume(s, [px(s, a) + 0.3 + c * 1.05, pz(s, 0.7) + 0.2, px(s, a) + 1.15 + c * 1.05, pz(s, 0.7) + 0.9], BASE + 1.1, BASE + 1.6, { c: [hex("#c9733a"), hex("#b04a3f"), hex("#6b9a3f")][(c + k) % 3], m: MAT.PAINT });
  });
  banc(g, px(s, -0.9), pz(s, 0.95), true);
  rangeeArbres(s, px(s, -0.95), px(s, 0.95), pz(s, -0.8), true, 7);
}

/** Zone logistique : deux grands hangars bardés, quais de chargement sous auvent, camions à quai, parc à conteneurs, bureaux et parking, silos. */
export function zoneLogistique(s: Site) {
  const { g, R, H } = s;
  plateforme(s, hex("#bdbab3"));
  const bardage = hex("#b9c4cb"),
    toit = hex("#8f979d"),
    fer = hex("#6f7a82");
  const hangars: [number, number, number, number, number][] = [
    [-0.96, -0.92, -0.04, 0.0, 0.5],
    [0.04, -0.92, 0.96, 0.0, 0.6],
  ];
  hangars.forEach(([a0, b0, a1, b1, hMur], k) => {
    const r = zone(s, a0, b0, a1, b1);
    volume(s, r, BASE, haut(s, hMur), { c: bardage, m: MAT.PLAIN, top: false });
    pilastres(g, r[0], r[2], r[3], true, BASE, haut(s, hMur), 12, 0.3, 0.45, fer, s.seed);
    toit2pans(g, r, haut(s, hMur), haut(s, hMur) + 0.1 * H, true, toit, MAT.PLAIN, bardage, MAT.PLAIN, s.seed, 0.4);
    // bande de lanterneaux sur le faîtage et bandeau d'enseigne
    volume(s, [r[0] + 1, (r[1] + r[3]) / 2 - 0.9, r[2] - 1, (r[1] + r[3]) / 2 + 0.9], haut(s, hMur) + 0.1 * H, haut(s, hMur) + 0.1 * H + 0.9, { c: hex("#cfe0e6"), m: MAT.DARKGLASS });
    volume(s, [r[0], r[3], r[2], r[3] + 0.12], haut(s, hMur) - 1.9, haut(s, hMur) - 0.7, { c: k ? INDUSTRIE_ACCENT : hex("#2f6fb2"), m: MAT.PAINT, top: false });
  });
  // quais : plate-forme, portes sectionnelles sombres à numéro de couleur, auvent sur poteaux
  volume(s, zone(s, -0.98, 0.0, 0.98, 0.16), BASE, BASE + 1.2, { c: COL.concrete, m: MAT.CONCRETE });
  for (let k = 0; k < 9; k++) {
    const a = -0.9 + k * 0.2;
    volume(s, [px(s, a), pz(s, 0.0), px(s, a + 0.13), pz(s, 0.0) + 0.1], BASE + 1.2, BASE + 4.6, { c: hex("#2b3036"), m: MAT.PLAIN, top: false });
    volume(s, [px(s, a + 0.02), pz(s, 0.0) + 0.1, px(s, a + 0.11), pz(s, 0.0) + 0.14], BASE + 4.7, BASE + 5.1, { c: [INDUSTRIE_ACCENT, hex("#2f6fb2"), hex("#b04a3f")][k % 3], m: MAT.PAINT, top: false });
  }
  volume(s, zone(s, -0.98, 0.02, 0.98, 0.34), BASE + 5.4, BASE + 5.65, { c: toit, m: MAT.PLAIN });
  for (let k = 0; k < 6; k++) box(g, px(s, -0.95 + k * 0.38) - 0.15, BASE + 1.2, pz(s, 0.32) - 0.15, px(s, -0.95 + k * 0.38) + 0.15, BASE + 5.4, pz(s, 0.32) + 0.15, { c: COL.metal, m: MAT.PLAIN, seed: s.seed });
  // deux camions à quai : remorque blanche, cabine de couleur
  const Lr = Math.min(12, 0.55 * R);
  [-0.78, -0.18].forEach((a, k) => {
    volume(s, [px(s, a), pz(s, 0.17), px(s, a) + 2.6, pz(s, 0.17) + Lr], BASE, BASE + 3.4, { c: BLANC, m: MAT.PAINT });
    volume(s, [px(s, a) + 0.1, pz(s, 0.17) + Lr + 0.4, px(s, a) + 2.5, pz(s, 0.17) + Lr + 2.4], BASE, BASE + 2.8, { c: [hex("#2e5b9b"), hex("#b04a3f")][k], m: MAT.PAINT });
    for (const dx of [0.2, 2.4]) for (const dz of [2, Lr * 0.55, Lr - 1.2, Lr + 1.6]) cylinder(g, px(s, a) + dx, BASE, pz(s, 0.17) + dz, 0.5, 0.3, 10, hex("#202226"), MAT.PLAIN, null, null);
  });
  // parc à conteneurs : piles de deux à trois, cinq couleurs
  const couleurs = [hex("#b04a3f"), hex("#2e5b9b"), hex("#3e7a4e"), COL.container, hex("#d27b2a")];
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) {
      const x0 = px(s, 0.14) + i * 7.2,
        z0 = pz(s, 0.2) + j * 3.4;
      if (x0 + 6.4 > px(s, 0.98)) continue;
      const nb = 2 + ((i + j) % 2);
      for (let h = 0; h < nb; h++) volume(s, [x0, z0, x0 + 6.4, z0 + 2.6], BASE + h * 2.6, BASE + (h + 1) * 2.6, { c: couleurs[(i * 2 + j + h) % couleurs.length], m: MAT.PAINT });
    }
  // bureaux à deux niveaux, parking, silos de stockage
  const bur = zone(s, 0.45, 0.66, 0.95, 0.94);
  volume(s, bur, BASE, BASE + 2 * ETAGE, { c: hex("#e1ddd2"), m: MAT.APART, ...TOIT_PLAT });
  acrotere(g, bur, BASE + 2 * ETAGE, hex("#2f6fb2"), 0.6, 0.3, s.seed);
  parking(s, zone(s, 0.15, 0.62, 0.42, 0.98), false, 0.7);
  for (const a of [-0.78, -0.62, -0.46]) cylinder(g, px(s, a), BASE, pz(s, -0.98) + 2.6, 2.2, 0.55 * H, 16, hex("#d9dcdf"), MAT.PLAIN, MAT.FLATROOF, COL.roofGray);
  voiture(s, px(s, 0.2), pz(s, 0.55), true);
  rangeeArbres(s, px(s, 0.45), px(s, 0.95), pz(s, 0.97), true, 7);
}

/** Train à grande vitesse : caisse blanche à bande de couleur et vitres, nez effilé vers +x (axe X), entre x0 et x1, sur la voie de coordonnée z. */
function rame(s: Site, x0: number, x1: number, z: number, couleurBande: Couleur) {
  const { g } = s;
  const y0 = BASE + 0.45,
    h = 3.3,
    w = 1.45;
  box(g, x0, y0, z - w, x1, y0 + h, z + w, { c: hex("#eef0f2"), m: MAT.PAINT, seed: s.seed });
  box(g, x0, y0 + 0.5, z - w - 0.03, x1, y0 + 1.1, z + w + 0.03, { c: couleurBande, m: MAT.PAINT, top: false, seed: s.seed });
  box(g, x0, y0 + 1.7, z - w - 0.03, x1, y0 + 2.6, z + w + 0.03, { c: hex("#232b33"), m: MAT.DARKGLASS, top: false, seed: s.seed });
  // bogies
  for (let x = x0 + 2; x < x1 - 2; x += 6) box(g, x - 1.1, BASE, z - w * 0.8, x + 1.1, y0, z + w * 0.8, { c: hex("#2a2d31"), m: MAT.PLAIN, seed: s.seed });
  // nez : toit qui plonge, flancs qui se resserrent
  const xp = x1 + 5;
  quad(g, [x1, y0 + h, z - w], [x1, y0 + h, z + w], [xp, y0 + 1.0, z + 0.3], [xp, y0 + 1.0, z - 0.3], hex("#eef0f2"), MAT.PAINT, [0.5, 1, 0], s.seed);
  tri(g, [x1, y0, z - w], [x1, y0 + h, z - w], [xp, y0 + 0.5, z - 0.3], hex("#eef0f2"), MAT.PAINT, [0, 0, -1], s.seed);
  tri(g, [x1, y0, z + w], [x1, y0 + h, z + w], [xp, y0 + 0.5, z + 0.3], hex("#eef0f2"), MAT.PAINT, [0, 0, 1], s.seed);
  quad(g, [x1 + 0.4, y0 + 2.7, z - w + 0.1], [x1 + 0.4, y0 + 2.7, z + w - 0.1], [xp - 1.4, y0 + 1.35, z + 0.28], [xp - 1.4, y0 + 1.35, z - 0.28], hex("#232b33"), MAT.DARKGLASS, [0.5, 1, 0], s.seed);
}

/** Gare TGV : halle en voûte de verre sur nervures d'acier, quatre voies sous caténaires, quais couverts, deux rames, passerelle, bâtiment voyageurs à tour d'horloge, parvis. */
export function gareTgv(s: Site) {
  const { g, cx, R, H } = s;
  plateforme(s, hex("#cdc7b8"));
  const verre = hex("#b7d3e0"),
    acier = hex("#8f9ba3"),
    pierre = hex("#e0d6c0");
  const zc = pz(s, -0.06),
    a = 0.46 * R,
    b = Math.min(0.5 * H, 0.7 * R),
    x0 = px(s, -0.6),
    x1 = px(s, 0.6);
  // quatre voies sur ballast, rails, quais entre les paires de voies
  volume(s, zone(s, -1, -0.55, 1, 0.4), BASE, BASE + 0.12, { c: hex("#6e6a64"), m: MAT.PLAIN });
  const voies = [-0.42, -0.2, 0.06, 0.28];
  for (const v of voies) for (const dz of [-0.025, 0.025]) volume(s, zone(s, -1, v + dz, 1, v + dz + 0.012), BASE + 0.12, BASE + 0.3, { c: COL.metal, m: MAT.PLAIN });
  for (const [z0, z1] of [
    [-0.34, -0.26],
    [0.12, 0.2],
  ] as const) {
    volume(s, zone(s, -0.94, z0, 0.94, z1), BASE + 0.12, BASE + 1.0, { c: COL.concrete, m: MAT.CONCRETE });
    volume(s, zone(s, -0.94, z0, 0.94, z0 + 0.012), BASE + 1.0, BASE + 1.02, { c: hex("#e3b236"), m: MAT.PAINT });
  }
  // voûte de verre, nervures d'acier et pignons vitrés
  voute(g, x0, x1, zc, BASE, a, b, 16, verre, MAT.DARKGLASS, s.seed);
  for (let k = 0; k < 8; k++) {
    const xr = x0 + ((x1 - x0) * k) / 7;
    voute(g, xr - 0.25, xr + 0.25, zc, BASE, a * 1.015, b * 1.015, 16, acier, MAT.PLAIN, s.seed);
  }
  boutVoute(g, x0, zc, BASE, a, b, 16, verre, MAT.DARKGLASS, -1, s.seed);
  boutVoute(g, x1, zc, BASE, a, b, 16, verre, MAT.DARKGLASS, 1, s.seed);
  // quais couverts prolongeant la halle de chaque côté, sur colonnes
  for (const [xa, xb] of [
    [px(s, 0.6), px(s, 0.96)],
    [px(s, -0.96), px(s, -0.6)],
  ] as const) {
    volume(s, [xa, pz(s, -0.4), xb, pz(s, 0.24)], BASE + 6.2, BASE + 6.6, { c: hex("#dcd8cc"), m: MAT.PLAIN });
    for (const x of [xa + 0.5, (xa + xb) / 2, xb - 0.5]) for (const z of [pz(s, -0.37), pz(s, 0.0), pz(s, 0.21)]) box(g, x - 0.18, BASE, z - 0.18, x + 0.18, BASE + 6.2, z + 0.18, { c: COL.metal, m: MAT.PLAIN, seed: s.seed });
  }
  // deux rames : l'une dans la halle, nez dehors, l'autre sur la voie extérieure
  rame(s, px(s, -0.9), px(s, 0.52), pz(s, voies[0]), hex("#2f5f9e"));
  rame(s, px(s, -0.5), px(s, 0.62), pz(s, voies[3]), hex("#b4483c"));
  // caténaires : mâts régulièrement espacés et fil sur chaque voie
  for (let k = 0; k < 9; k++) {
    const x = px(s, -0.96 + k * 0.24);
    for (const z of [pz(s, -0.5), pz(s, 0.36)]) box(g, x - 0.12, BASE, z - 0.12, x + 0.12, BASE + 8.5, z + 0.12, { c: COL.metal, m: MAT.LATTICE, seed: s.seed });
  }
  for (const v of voies) volume(s, zone(s, -0.96, v - 0.004, 0.96, v + 0.004), BASE + 7.2, BASE + 7.3, { c: hex("#2a2d31"), m: MAT.PLAIN });
  // passerelle vitrée au-dessus des voies et ses deux tours d'escalier
  volume(s, [px(s, 0.66), pz(s, -0.5), px(s, 0.72), pz(s, 0.36)], BASE + 8.2, BASE + 10.6, { c: hex("#a9c9dc"), m: MAT.GLASS, ...TOIT_PLAT });
  for (const z of [pz(s, -0.52), pz(s, 0.38)]) volume(s, [px(s, 0.62), z - 1.4, px(s, 0.76), z + 1.4], BASE, BASE + 10.6, { c: pierre, m: MAT.PLAIN, ...TOIT_PLAT });
  // bâtiment voyageurs : long corps de pierre, tour d'horloge centrale, auvent vitré, parvis avec taxis
  const bat = zone(s, -0.9, 0.52, 0.9, 0.82);
  volume(s, bat, BASE, BASE + 3 * ETAGE, { c: pierre, m: MAT.APART, ...TOIT_PLAT });
  acrotere(g, bat, BASE + 3 * ETAGE, hex("#cdbf9f"), 0.7, 0.3, s.seed);
  volume(s, zone(s, -0.12, 0.54, 0.12, 0.74), BASE + 3 * ETAGE, BASE + 3 * ETAGE + 0.3 * H, { c: pierre, m: MAT.PLAIN, top: false });
  const yc = BASE + 3 * ETAGE + 0.3 * H - 2;
  disque(g, cx, yc, pz(s, 0.74) + 0.04, 1.5, "+z", BLANC, MAT.PLAIN, 18);
  disque(g, cx, yc, pz(s, 0.54) - 0.04, 1.5, "-z", BLANC, MAT.PLAIN, 18);
  tronc(g, cx, BASE + 3 * ETAGE + 0.3 * H, pz(s, 0.64), 0.13 * R + 0.2, 0, 0.14 * H + 2, hex("#6f7a7d"), MAT.PLAIN, s.seed, 0.1 * R + 0.2, 0);
  volume(s, zone(s, -0.4, 0.82, 0.4, 0.92), BASE + 4.4, BASE + 4.7, { c: hex("#9fc4d6"), m: MAT.DARKGLASS });
  for (const a2 of [-0.38, 0.38]) box(g, px(s, a2) - 0.15, BASE, pz(s, 0.9) - 0.15, px(s, a2) + 0.15, BASE + 4.4, pz(s, 0.9) + 0.15, { c: COL.metal, m: MAT.PLAIN, seed: s.seed });
  escalier(g, px(s, -0.3), px(s, 0.3), pz(s, 0.82), "+z", 3, hex("#cdbf9f"), s.seed);
  allee(g, zone(s, -0.9, 0.92, 0.9, 1), s.seed);
  [-0.7, -0.45, 0.45, 0.7].forEach((a2) => voiture(s, px(s, a2), pz(s, 0.93), true));
  rangeeArbres(s, px(s, -0.95), px(s, -0.6), pz(s, 0.9), true, 8);
  rangeeArbres(s, px(s, 0.6), px(s, 0.95), pz(s, 0.9), true, 8);
}

/** Avion de ligne à l'arrêt, axe le long de Z, nez vers -z : fuselage, nez, ailes en flèche, réacteurs, dérive et plans arrière. */
function avion(s: Site, x: number, zNez: number, echelle = 1) {
  const { g } = s;
  const L = 15 * echelle,
    w = 1.1 * echelle,
    hf = 2.2 * echelle,
    y = BASE + 1.6 * echelle,
    blanc = hex("#f2f2ef"),
    bleu = hex("#2f5f9e");
  const z0 = zNez + 3 * echelle,
    z1 = zNez + L;
  box(g, x - w, y, z0, x + w, y + hf, z1, { c: blanc, m: MAT.PAINT, seed: s.seed });
  box(g, x - w - 0.03, y + hf * 0.35, z0, x + w + 0.03, y + hf * 0.5, z1, { c: bleu, m: MAT.PAINT, top: false, seed: s.seed });
  box(g, x - w - 0.03, y + hf * 0.62, z0, x + w + 0.03, y + hf * 0.8, z1 - 3 * echelle, { c: hex("#232b33"), m: MAT.DARKGLASS, top: false, seed: s.seed });
  const pt = (xx: number, yy: number, zz: number): [number, number, number] => [xx, yy, zz];
  tri(g, pt(x - w, y, z0), pt(x - w, y + hf, z0), pt(x, y + hf * 0.35, zNez), blanc, MAT.PAINT, [-1, 0, -0.3], s.seed);
  tri(g, pt(x + w, y, z0), pt(x + w, y + hf, z0), pt(x, y + hf * 0.35, zNez), blanc, MAT.PAINT, [1, 0, -0.3], s.seed);
  tri(g, pt(x - w, y + hf, z0), pt(x + w, y + hf, z0), pt(x, y + hf * 0.35, zNez), blanc, MAT.PAINT, [0, 1, -0.3], s.seed);
  tri(g, pt(x - w, y, z0), pt(x + w, y, z0), pt(x, y + hf * 0.35, zNez), blanc, MAT.PAINT, [0, -1, -0.3], s.seed);
  const zw = z0 + 3.5 * echelle;
  for (const sg of [-1, 1]) {
    quad(g, pt(x + sg * w, y + hf * 0.3, zw), pt(x + sg * w, y + hf * 0.3, zw + 3 * echelle), pt(x + sg * 8 * echelle, y + hf * 0.2, zw + 7 * echelle), pt(x + sg * 8 * echelle, y + hf * 0.2, zw + 5.2 * echelle), hex("#d9dcdf"), MAT.PLAIN, [0, 1, 0], s.seed);
    cylinder(g, x + sg * 3.4 * echelle, y - 0.2 * echelle, zw + 2.5 * echelle, 0.6 * echelle, 2.2 * echelle, 10, hex("#8a9097"), MAT.PLAIN, null, null);
    quad(g, pt(x + sg * w, y + hf * 0.6, z1 - 0.2), pt(x + sg * w, y + hf * 0.6, z1 - 2 * echelle), pt(x + sg * 4.2 * echelle, y + hf * 0.6, z1 + 1.6 * echelle), pt(x + sg * 4.2 * echelle, y + hf * 0.6, z1 + 0.2), hex("#d9dcdf"), MAT.PLAIN, [0, 1, 0], s.seed);
  }
  tri(g, pt(x, y + hf, z1 - 3.2 * echelle), pt(x, y + hf, z1), pt(x, y + hf + 3.6 * echelle, z1 + 0.6 * echelle), bleu, MAT.PAINT, [1, 0, 0], s.seed);
  tri(g, pt(x, y + hf, z1 - 3.2 * echelle), pt(x, y + hf, z1), pt(x, y + hf + 3.6 * echelle, z1 + 0.6 * echelle), bleu, MAT.PAINT, [-1, 0, 0], s.seed);
}

/** Aéroport : piste marquée et balisée, aire de stationnement, terminal à toit en voûte avec passerelles, deux avions, tour de contrôle, hangar, parking. */
export function aeroport(s: Site) {
  const { g, R, H } = s;
  plateforme(s, hex("#bab8b1"));
  const asphalte = hex("#3f4348"),
    beton = hex("#a9a8a2");
  // piste au fond : bande d'asphalte, axe en tirets, seuils à bandes, bords, balises
  const yL = BASE + 0.02;
  const [qx0, qz0, qx1, qz1] = zone(s, -1, -0.99, 1, -0.76);
  flat(g, qx0, qz0, qx1, qz1, yL, asphalte, MAT.PLAIN, s.seed);
  const ligne = (x0: number, z0: number, x1: number, z1: number) => box(g, x0, yL, z0, x1, yL + 0.02, z1, { c: LIGNE, m: MAT.PAINT, seed: s.seed });
  const zAxe = (qz0 + qz1) / 2;
  for (let k = 0; k < 12; k++) ligne(px(s, -0.9 + k * 0.16), zAxe - 0.2, px(s, -0.9 + k * 0.16 + 0.08), zAxe + 0.2);
  ligne(qx0, qz0 + 0.25, qx1, qz0 + 0.5);
  ligne(qx0, qz1 - 0.5, qx1, qz1 - 0.25);
  for (const sg of [-1, 1])
    for (let k = 0; k < 6; k++) {
      const zb = qz0 + 0.9 + k * 0.7;
      const xa = sg > 0 ? px(s, 0.86) : px(s, -0.96);
      ligne(xa, zb, xa + 0.1 * R, zb + 0.35);
    }
  for (let k = 0; k < 14; k++) box(g, px(s, -0.95 + k * 0.146) - 0.1, yL, qz1 + 0.5, px(s, -0.95 + k * 0.146) + 0.1, yL + 0.4, qz1 + 0.7, { c: hex("#f5c518"), m: MAT.LAMP, seed: s.seed });
  // bretelle de liaison et aire de stationnement
  flat(g, px(s, -0.5) - 2.2, qz1, px(s, -0.5) + 2.2, pz(s, -0.7), yL, hex("#4a4d52"), MAT.PLAIN, s.seed);
  const [ax0, az0, ax1, az1] = zone(s, -0.9, -0.7, 0.42, -0.2);
  flat(g, ax0, az0, ax1, az1, BASE + 0.01, beton, MAT.PLAIN, s.seed);
  // deux avions à leur poste, nez vers la piste
  avion(s, px(s, -0.5), pz(s, -0.66), 0.62 + R / 60);
  avion(s, px(s, 0.04), pz(s, -0.6), 0.62 + R / 60);
  // terminal : socle, façades vitrées, toit en voûte d'acier
  const term = zone(s, -0.88, -0.18, 0.42, 0.34);
  const yT = BASE + 8;
  volume(s, term, BASE, yT, { c: hex("#d8d6d0"), m: MAT.PLAIN, top: false });
  volume(s, [term[0], term[1] - 0.1, term[2], term[1]], BASE, yT, { c: hex("#7d9fb8"), m: MAT.GLASS, top: false });
  volume(s, [term[0], term[3], term[2], term[3] + 0.1], BASE, yT, { c: hex("#7d9fb8"), m: MAT.GLASS, top: false });
  const zt = (term[1] + term[3]) / 2,
    at = (term[3] - term[1]) / 2;
  voute(g, term[0], term[2], zt, yT, at, 0.22 * H, 14, hex("#cfd6dc"), MAT.PLAIN, s.seed);
  boutVoute(g, term[0], zt, yT, at, 0.22 * H, 14, hex("#9fc4d6"), MAT.DARKGLASS, -1, s.seed);
  boutVoute(g, term[2], zt, yT, at, 0.22 * H, 14, hex("#9fc4d6"), MAT.DARKGLASS, 1, s.seed);
  // passerelles d'embarquement entre le terminal et les avions
  for (const a of [-0.5, 0.04]) volume(s, [px(s, a) - 1.1, pz(s, -0.66) + 7, px(s, a) + 1.1, term[1]], BASE + 3.4, BASE + 5.6, { c: hex("#cfd6dc"), m: MAT.PLAIN, ...TOIT_PLAT });
  // tour de contrôle : fût, cabine vitrée évasée, toit, antenne et feu rouge
  const tx = px(s, 0.78),
    tz = pz(s, 0.1),
    ht = Math.min(0.8 * H, 30);
  cylinder(g, tx, BASE, tz, 1.9, ht, 14, hex("#e4e2dc"), MAT.PLAIN, null, null, 1.5);
  cylinder(g, tx, BASE + ht, tz, 3.2, 3.6, 16, hex("#33495c"), MAT.DARKGLASS, null, null, 4.4);
  cylinder(g, tx, BASE + ht + 3.6, tz, 4.7, 0.7, 16, hex("#e4e2dc"), MAT.PLAIN, MAT.FLATROOF, COL.roofGray);
  box(g, tx - 0.12, BASE + ht + 4.3, tz - 0.12, tx + 0.12, BASE + ht + 8.5, tz + 0.12, { c: COL.metal, m: MAT.PLAIN });
  box(g, tx - 0.3, BASE + ht + 8.5, tz - 0.3, tx + 0.3, BASE + ht + 9.1, tz + 0.3, { c: COL.beacon, m: MAT.BEACON });
  // hangar à toit en voûte, réservoirs de carburant, parking et arbres
  const hang = zone(s, 0.5, -0.62, 0.96, -0.24);
  volume(s, hang, BASE, BASE + 6, { c: hex("#c9ced2"), m: MAT.PLAIN, top: false });
  voute(g, hang[0], hang[2], (hang[1] + hang[3]) / 2, BASE + 6, (hang[3] - hang[1]) / 2, 4.5, 12, hex("#b9c0c6"), MAT.PLAIN, s.seed);
  volume(s, [hang[0], (hang[1] + hang[3]) / 2 - 3.2, hang[0] + 0.12, (hang[1] + hang[3]) / 2 + 3.2], BASE, BASE + 5.4, { c: hex("#2b3036"), m: MAT.PLAIN, top: false });
  for (const dz of [0, 1]) cylinder(g, px(s, 0.88), BASE, pz(s, 0.55) + dz * 0.12 * R, 2.2, 5.5, 16, hex("#d9dcdf"), MAT.PLAIN, MAT.FLATROOF, COL.roofGray);
  parking(s, zone(s, -0.88, 0.48, 0.5, 0.97), true, 0.65);
  rangeeArbres(s, px(s, -0.95), px(s, 0.9), pz(s, 0.99), true, 8);
}
