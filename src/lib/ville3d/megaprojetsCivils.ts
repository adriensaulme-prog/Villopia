/**
 * Mégaprojets « civils » (docs/A-INTEGRER.md §44) : Grande école, Hôpital, Opéra, Tour
 * emblématique, Siège international, Technopole, Centre de recherche. Chacun a sa propre
 * silhouette et la couleur/matière NATURELLE du bâtiment qu'il représente — pierre claire,
 * verre, cuivre patiné, dorures — plutôt qu'une teinte d'activité ou l'or des monuments.
 *
 * Retour d'Adrien du 05/10/2026 (« très peu développés et moches ») et taille réelle du §45 : les
 * volumes se placent en fractions de R (demi-côté de l'emprise) et de H (hauteur disponible), mais
 * tous les détails — marches, colonnes, voitures, arbres, fenêtres — sont à leurs vraies dimensions
 * en mètres, comme le reste de la ville, et chaque site a ses abords (pelouses, allées, arbres,
 * mobilier). Voir megaprojetsFormes.ts pour les briques.
 */
import { COL, MAT, RECHERCHE_DOME, RECHERCHE_PANNEAU, RECHERCHE_WALLS, SERVICES_BANDEAU, SERVICES_CROIX, hex } from "./constantes";
import { box, cylinder, flat, shadeC } from "./geometrie";
import { banc, fontaine } from "./mobilier";
import { disque, ellipsoide, lampadaire, tronc } from "./monumentsFormes";
import {
  BASE,
  ETAGE,
  acrotere,
  allee,
  colonne,
  escalier,
  haut,
  panneauxSurToit,
  parking,
  pelouse,
  pilastres,
  plateforme,
  px,
  pz,
  quad,
  rangeeArbres,
  toit2pans,
  toitureEquipee,
  volume,
  zone,
  type Site,
} from "./megaprojetsFormes";

const CALCAIRE = hex("#e7dcc4");
const CALCAIRE_OMBRE = hex("#d3c4a3");
const ACIER = hex("#aab2b8");
const BLANC = hex("#f1eee7");
const ARDOISE = hex("#4b525b");
const TOIT_PLAT = { topM: MAT.FLATROOF, topC: COL.roofGray };

/** Lampadaire de parvis aux vraies cotes (4,5 m), pierre et fonte. */
function lampe(s: Site, a: number, b: number) {
  lampadaire(s.g, px(s, a), BASE, pz(s, b), 4.5, { fut: hex("#3b3e42"), pied: CALCAIRE_OMBRE, lanterne: hex("#fff3d6"), echelle: 2.2, seed: s.seed });
}

/** Mât à drapeau de parvis : 9 m, fanion de couleur unie (jamais un drapeau réel). */
function mat(s: Site, a: number, b: number, c: ReturnType<typeof hex>) {
  const x = px(s, a),
    z = pz(s, b);
  box(s.g, x - 0.1, BASE, z - 0.1, x + 0.1, BASE + 9, z + 0.1, { c: COL.metal, m: MAT.PLAIN, seed: s.seed });
  quad(s.g, [x, BASE + 9, z], [x, BASE + 7.4, z], [x + 2.4, BASE + 7.6, z], [x + 2.4, BASE + 9, z], c, MAT.PAINT, [0, 0, 1]);
}

/** Grande école : quatre corps de pierre claire autour d'un atrium vitré, tour d'horloge, portique et parvis planté. */
export function grandeEcole(s: Site) {
  const { g, cx, R } = s;
  plateforme(s, hex("#d9d2c0"));
  const yH = haut(s, 0.9),
    yA = haut(s, 0.74);
  // pelouses des quatre angles et allée axiale
  for (const r of [zone(s, -1, -1, -0.66, 0.1), zone(s, 0.66, -1, 1, 0.1), zone(s, -1, 0.5, -0.1, 1), zone(s, 0.1, 0.5, 1, 1)]) pelouse(g, r, s.seed);
  allee(g, zone(s, -0.16, 0.45, 0.16, 1), s.seed);
  const aile = { c: CALCAIRE, m: MAT.APART, ...TOIT_PLAT };
  volume(s, zone(s, -0.84, -0.92, 0.84, -0.4), BASE, yH, aile);
  volume(s, zone(s, -0.84, -0.4, -0.52, 0.4), BASE, yA, aile);
  volume(s, zone(s, 0.52, -0.4, 0.84, 0.4), BASE, yA, aile);
  // atrium de verre à toit en pente de verre
  const atrium = zone(s, -0.52, -0.4, 0.52, 0.3);
  volume(s, atrium, BASE, haut(s, 0.6), { c: hex("#8db6cf"), m: MAT.GLASS, top: false });
  toit2pans(g, atrium, haut(s, 0.6), haut(s, 0.6) + 0.2 * R, true, hex("#a9c9dc"), MAT.DARKGLASS, hex("#8db6cf"), MAT.GLASS, s.seed);
  // corniches et toitures équipées
  for (const [r, y] of [
    [zone(s, -0.84, -0.92, 0.84, -0.4), yH],
    [zone(s, -0.84, -0.4, -0.52, 0.4), yA],
    [zone(s, 0.52, -0.4, 0.84, 0.4), yA],
  ] as const)
    acrotere(g, r, y, CALCAIRE_OMBRE, 0.6, 0.3, s.seed);
  toitureEquipee(s, zone(s, -0.84, -0.92, 0.84, -0.4), yH + 0.6, 3);
  // tour d'horloge au centre de l'aile arrière : fût, quatre cadrans, flèche d'ardoise
  const th = haut(s, 1.28),
    z0 = pz(s, -0.75),
    z1 = pz(s, -0.55),
    x0 = px(s, -0.13),
    x1 = px(s, 0.13);
  volume(s, [x0, z0, x1, z1], yH, th, { c: CALCAIRE, m: MAT.PLAIN, top: false });
  const yc = th - 1.6,
    zm = (z0 + z1) / 2;
  disque(g, cx, yc, z1 + 0.03, 0.055 * R + 0.4, "+z", BLANC, MAT.PLAIN, 16);
  disque(g, cx, yc, z0 - 0.03, 0.055 * R + 0.4, "-z", BLANC, MAT.PLAIN, 16);
  disque(g, x1 + 0.03, yc, zm, 0.055 * R + 0.4, "+x", BLANC, MAT.PLAIN, 16);
  disque(g, x0 - 0.03, yc, zm, 0.055 * R + 0.4, "-x", BLANC, MAT.PLAIN, 16);
  tronc(g, cx, th, zm, (x1 - x0) / 2 + 0.2, 0, 0.18 * R + 2, ARDOISE, MAT.PLAIN, s.seed, (z1 - z0) / 2 + 0.2, 0);
  // portique à quatre colonnes, fronton et escalier devant l'atrium
  const yp = BASE + 4 * 0.17,
    zc = pz(s, 0.44);
  escalier(g, px(s, -0.4), px(s, 0.4), pz(s, 0.36), "+z", 4, CALCAIRE_OMBRE, s.seed);
  for (const a of [-0.3, -0.1, 0.1, 0.3]) colonne(g, px(s, a), zc, yp, haut(s, 0.6) - yp - 0.7, 0.4, CALCAIRE, s.seed);
  volume(s, zone(s, -0.4, 0.36, 0.4, 0.52), haut(s, 0.6) - 0.7, haut(s, 0.6), { c: CALCAIRE_OMBRE, m: MAT.PLAIN });
  toit2pans(g, zone(s, -0.4, 0.36, 0.4, 0.52), haut(s, 0.6), haut(s, 0.6) + 0.12 * R, false, hex("#8d8a82"), MAT.PLAIN, CALCAIRE, MAT.PLAIN, s.seed);
  // parvis : mâts à fanions, lampadaires, bancs, arbres
  mat(s, -0.55, 0.78, hex("#2f5f9e"));
  mat(s, 0, 0.9, hex("#e8e6df"));
  mat(s, 0.55, 0.78, hex("#b04a3f"));
  for (const a of [-0.3, 0.3]) lampe(s, a, 0.62);
  banc(g, px(s, -0.3), pz(s, 0.7), true);
  banc(g, px(s, 0.3) - 0.8, pz(s, 0.7), true);
  rangeeArbres(s, px(s, -0.95), px(s, -0.7), pz(s, 0.92), true, 6);
  rangeeArbres(s, px(s, 0.7), px(s, 0.95), pz(s, 0.92), true, 6);
  rangeeArbres(s, pz(s, -0.9), pz(s, 0.3), px(s, -0.94), false, 8);
  rangeeArbres(s, pz(s, -0.9), pz(s, 0.3), px(s, 0.94), false, 8);
}

/** Ambulance : caisson blanc à bande rouge et gyrophare, sur la plateforme. */
function ambulance(s: Site, x: number, z: number) {
  const { g } = s;
  box(g, x - 2.6, BASE + 0.45, z - 1.05, x + 1.2, BASE + 2.5, z + 1.05, { c: BLANC, m: MAT.PAINT, seed: s.seed });
  box(g, x + 1.2, BASE + 0.45, z - 1.0, x + 2.7, BASE + 1.6, z + 1.0, { c: BLANC, m: MAT.PAINT, seed: s.seed });
  box(g, x + 1.3, BASE + 1.15, z - 1.02, x + 2.5, BASE + 1.55, z + 1.02, { c: hex("#233042"), m: MAT.DARKGLASS, top: false, seed: s.seed });
  box(g, x - 2.62, BASE + 1.0, z - 1.07, x + 2.72, BASE + 1.45, z + 1.07, { c: SERVICES_CROIX, m: MAT.PAINT, top: false, seed: s.seed });
  box(g, x - 0.3, BASE + 2.5, z - 0.5, x + 0.3, BASE + 2.75, z + 0.5, { c: hex("#2f6fdc"), m: MAT.BEACON });
  for (const dx of [-1.6, 1.8]) for (const dz of [-1, 1]) cylinder(g, x + dx, BASE, z + dz * 1.05, 0.42, 0.34, 10, hex("#202226"), MAT.PLAIN, null, null);
}

/** Hôpital : tour de chambres à bandeaux turquoise et grande croix rouge, deux ailes, hall vitré sous auvent rouge, urgences, hélistation, parking. */
export function hopital(s: Site) {
  const { g, R, H } = s;
  plateforme(s, hex("#d9d6cf"));
  const blanc = hex("#f2efe8"),
    corps = { c: blanc, m: MAT.APART, ...TOIT_PLAT };
  for (const r of [zone(s, -1, -1, -0.34, -0.5), zone(s, 0.34, -1, 1, -0.5), zone(s, -1, -0.5, -0.5, 0.0), zone(s, 0.5, 0.95, 1, 1)]) pelouse(g, r, s.seed);
  // tour de soins, deux ailes basses et hall d'accueil
  const tour = zone(s, -0.3, -0.62, 0.3, 0.0);
  volume(s, tour, BASE, haut(s, 0.98), corps);
  const gauche = zone(s, -0.96, -0.5, -0.3, 0.06),
    droite = zone(s, 0.3, -0.5, 0.96, 0.06);
  volume(s, gauche, BASE, haut(s, 0.5), corps);
  volume(s, droite, BASE, haut(s, 0.5), corps);
  volume(s, zone(s, -0.3, 0.0, 0.3, 0.42), BASE, haut(s, 0.2), { c: hex("#8fb4c8"), m: MAT.GLASS, ...TOIT_PLAT });
  // bandeaux turquoise (tous les deux étages) et acrotères
  for (const f of [0.33, 0.66]) volume(s, zone(s, -0.32, -0.64, 0.32, 0.02), haut(s, f), haut(s, f) + 0.7, { c: SERVICES_BANDEAU, m: MAT.PLAIN, top: false });
  acrotere(g, tour, haut(s, 0.98), SERVICES_BANDEAU, 0.8, 0.3, s.seed);
  acrotere(g, gauche, haut(s, 0.5), SERVICES_BANDEAU, 0.7, 0.3, s.seed);
  acrotere(g, droite, haut(s, 0.5), SERVICES_BANDEAU, 0.7, 0.3, s.seed);
  toitureEquipee(s, droite, haut(s, 0.5), 3);
  // grande croix rouge sur la façade de la tour (même langage que buildServices())
  const L = Math.max(4.6, 0.3 * H),
    t = L * 0.26,
    yc = haut(s, 0.66),
    zf = pz(s, 0.0),
    xc = px(s, 0);
  box(g, xc - t / 2, yc - L / 2, zf, xc + t / 2, yc + L / 2, zf + 0.35, { c: SERVICES_CROIX, m: MAT.PLAIN, seed: s.seed });
  box(g, xc - L / 2, yc - t / 2, zf, xc + L / 2, yc + t / 2, zf + 0.35, { c: SERVICES_CROIX, m: MAT.PLAIN, seed: s.seed });
  // auvent rouge de l'entrée principale sur piliers
  volume(s, zone(s, -0.34, 0.38, 0.34, 0.66), haut(s, 0.22), haut(s, 0.22) + 0.45, { c: SERVICES_CROIX, m: MAT.PLAIN });
  for (const a of [-0.32, 0.32]) for (const b of [0.44, 0.64]) box(g, px(s, a) - 0.18, BASE, pz(s, b) - 0.18, px(s, a) + 0.18, haut(s, 0.22), pz(s, b) + 0.18, { c: COL.metal, m: MAT.PLAIN, seed: s.seed });
  allee(g, zone(s, -0.3, 0.42, 0.3, 1), s.seed);
  // urgences : voie, auvent rouge sur piliers, deux ambulances
  allee(g, zone(s, -0.96, 0.1, -0.4, 0.46), s.seed, hex("#d6c6c0"));
  volume(s, zone(s, -0.96, 0.1, -0.4, 0.46), haut(s, 0.24), haut(s, 0.24) + 0.4, { c: SERVICES_CROIX, m: MAT.PLAIN });
  for (const a of [-0.94, -0.42]) for (const b of [0.12, 0.44]) box(g, px(s, a) - 0.18, BASE, pz(s, b) - 0.18, px(s, a) + 0.18, haut(s, 0.24), pz(s, b) + 0.18, { c: COL.metal, m: MAT.PLAIN, seed: s.seed });
  ambulance(s, px(s, -0.78), pz(s, 0.22));
  ambulance(s, px(s, -0.5), pz(s, 0.36) - 0.4);
  // hélistation sur le toit de l'aile droite
  const hx = px(s, 0.62),
    hz = pz(s, -0.22),
    yt = haut(s, 0.5) + 0.7;
  flat(g, hx - 0.17 * R, hz - 0.17 * R, hx + 0.17 * R, hz + 0.17 * R, yt, COL.helipad, MAT.HELIPAD, s.seed);
  box(g, hx - 0.07 * R, yt, hz - 0.02 * R, hx + 0.07 * R, yt + 0.04, hz + 0.02 * R, { c: SERVICES_CROIX, m: MAT.PLAIN, top: true });
  // parking visiteurs et arbres
  parking(s, zone(s, 0.4, 0.25, 0.98, 0.9), true, 0.75);
  rangeeArbres(s, pz(s, -0.95), pz(s, 0.9), px(s, -0.97), false, 7);
  rangeeArbres(s, px(s, -0.3), px(s, 0.3), pz(s, 0.95), true, 6);
}

/** Opéra : façade à huit colonnes, fronton, grand escalier, dôme de cuivre patiné, tour de scène, ailes à fenêtres hautes, fontaine. */
export function opera(s: Site) {
  const { g, cx, R, H } = s;
  plateforme(s, hex("#d9d2c0"));
  const cuivre = hex("#76a28e"),
    or = hex("#c9a63e"),
    yH = haut(s, 0.52);
  for (const r of [zone(s, -1, -1, -0.9, 0.3), zone(s, 0.9, -1, 1, 0.3), zone(s, -1, 0.3, -0.62, 1), zone(s, 0.62, 0.3, 1, 1)]) pelouse(g, r, s.seed);
  // grand corps de pierre, corniche, fenêtres hautes sur les ailes
  volume(s, zone(s, -0.9, -0.92, 0.9, 0.3), BASE, yH, { c: CALCAIRE, m: MAT.PLAIN, ...TOIT_PLAT });
  volume(s, zone(s, -0.92, -0.94, 0.92, 0.32), yH - 1.4, yH, { c: CALCAIRE_OMBRE, m: MAT.PLAIN, top: false });
  for (const cote of [-1, 1])
    for (let k = 0; k < 5; k++) {
      const z0 = -0.8 + k * 0.28;
      volume(s, [px(s, cote * 0.9) + (cote > 0 ? 0 : -0.1), pz(s, z0), px(s, cote * 0.9) + (cote > 0 ? 0.1 : 0), pz(s, z0 + 0.12)], haut(s, 0.14), haut(s, 0.4), { c: hex("#2a3a4a"), m: MAT.DARKGLASS });
    }
  // tour de scène à l'arrière et dôme de cuivre sur son tambour de pierre
  volume(s, zone(s, -0.55, -0.94, 0.55, -0.5), yH, haut(s, 0.8), { c: CALCAIRE_OMBRE, m: MAT.PLAIN, ...TOIT_PLAT });
  const dz = pz(s, -0.1);
  cylinder(g, cx, yH, dz, 0.46 * R, 0.1 * H, 22, CALCAIRE, MAT.PLAIN, null, null);
  ellipsoide(g, cx, yH + 0.1 * H, dz, 0.46 * R, 0.24 * H, 0.46 * R, cuivre, MAT.PLAIN);
  cylinder(g, cx, yH + 0.32 * H, dz, 0.08 * R, 0.1 * H, 10, CALCAIRE, MAT.PLAIN, null, null, 0.05 * R);
  ellipsoide(g, cx, yH + 0.44 * H, dz, 0.05 * R, 0.04 * H, 0.05 * R, or, MAT.PLAIN);
  // grand escalier, huit colonnes, entablement et fronton (le triangle regarde la place)
  const nb = 7,
    yP = BASE + nb * 0.17,
    zFace = pz(s, 0.3);
  escalier(g, px(s, -0.78), px(s, 0.78), zFace + 0.1, "+z", nb, CALCAIRE, s.seed);
  volume(s, zone(s, -0.78, 0.3, 0.78, 0.66), BASE, yP, { c: CALCAIRE, m: MAT.PLAIN });
  const hCol = Math.min(0.42 * H, 11);
  for (let k = 0; k < 8; k++) colonne(g, px(s, -0.66 + k * (1.32 / 7)), pz(s, 0.58), yP, hCol, 0.5, CALCAIRE, s.seed);
  const yE = yP + hCol;
  volume(s, zone(s, -0.76, 0.3, 0.76, 0.68), yE, yE + 1.3, { c: CALCAIRE_OMBRE, m: MAT.PLAIN });
  toit2pans(g, zone(s, -0.76, 0.3, 0.76, 0.68), yE + 1.3, yE + 1.3 + 0.16 * R, false, hex("#8aa39a"), MAT.PLAIN, CALCAIRE, MAT.PLAIN, s.seed);
  for (const a of [-0.74, 0.74]) volume(s, [px(s, a) - 0.5, pz(s, 0.62), px(s, a) + 0.5, pz(s, 0.62) + 1], yE + 1.3, yE + 3.6, { c: or, m: MAT.PLAIN });
  volume(s, [cx - 0.5, pz(s, 0.64), cx + 0.5, pz(s, 0.64) + 1], yE + 1.3 + 0.16 * R, yE + 3.8 + 0.16 * R, { c: or, m: MAT.PLAIN });
  // parvis : fontaine, lampadaires, arbres
  fontaine(g, cx, pz(s, 0.78));
  for (const a of [-0.55, 0.55]) lampe(s, a, 0.8);
  rangeeArbres(s, px(s, -0.95), px(s, -0.66), pz(s, 0.95), true, 6);
  rangeeArbres(s, px(s, 0.66), px(s, 0.95), pz(s, 0.95), true, 6);
}

/** Tour emblématique : socle de pierre, fût de verre effilé en deux volumes séparés d'un étage technique, ailerons d'acier, couronne en pyramide, flèche et feu rouge. */
export function tourEmblematique(s: Site) {
  const { g, cx, cz, R, H } = s;
  plateforme(s, hex("#d9d2c0"));
  const verre = hex("#5aa0b4"),
    verreHaut = hex("#6fb3c4");
  for (const r of [zone(s, -1, -1, -0.92, 1), zone(s, 0.92, -1, 1, 1), zone(s, -0.92, 0.92, 0.92, 1)]) pelouse(g, r, s.seed);
  // socle de trois niveaux, entrée vitrée, parvis
  const ySocle = BASE + 3 * ETAGE + 1;
  volume(s, zone(s, -0.7, -0.7, 0.7, 0.7), BASE, ySocle, { c: hex("#d9d3c8"), m: MAT.PODIUM, ...TOIT_PLAT });
  escalier(g, px(s, -0.3), px(s, 0.3), pz(s, 0.7), "+z", 3, CALCAIRE_OMBRE, s.seed);
  // fût effilé en deux volumes (le haut plus clair) séparés par un étage technique en béton
  const y1 = haut(s, 0.52),
    y2 = haut(s, 0.56),
    y3 = haut(s, 0.95);
  tronc(g, cx, ySocle, cz, 0.42 * R, 0.34 * R, y1 - ySocle, verre, MAT.GLASS, s.seed);
  tronc(g, cx, y1, cz, 0.35 * R, 0.35 * R, y2 - y1, hex("#b9b6b0"), MAT.CONCRETE, s.seed);
  tronc(g, cx, y2, cz, 0.3 * R, 0.2 * R, y3 - y2, verreHaut, MAT.GLASS, s.seed);
  // ailerons d'acier aux quatre angles du bas du fût et de son haut
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const) {
    box(g, px(s, sx * 0.42) - 0.5 + sx * 0.0, ySocle, pz(s, sz * 0.42) - 0.5, px(s, sx * 0.42) + 0.5, y1 - 2, pz(s, sz * 0.42) + 0.5, { c: ACIER, m: MAT.PLAIN, top: false, seed: s.seed });
  }
  volume(s, zone(s, -0.32, -0.32, 0.32, 0.32), y1 - 0.4, y1 + 0.4, { c: COL.concrete, m: MAT.CONCRETE });
  // couronne en pyramide de verre, flèche d'acier et feu rouge
  tronc(g, cx, y3, cz, 0.2 * R, 0, 0.24 * H, hex("#9fd0dc"), MAT.DARKGLASS, s.seed);
  cylinder(g, cx, y3 + 0.24 * H, cz, 0.45, 0.22 * H, 8, COL.metal, MAT.PLAIN, null, null, 0.12);
  box(g, cx - 0.4, y3 + 0.46 * H, cz - 0.4, cx + 0.4, y3 + 0.46 * H + 0.8, cz + 0.4, { c: COL.beacon, m: MAT.BEACON });
  // abords : bassins, lampadaires, arbres
  fontaine(g, px(s, 0.62), pz(s, 0.58));
  fontaine(g, px(s, -0.62), pz(s, 0.58));
  for (const a of [-0.2, 0.2]) lampe(s, a, 0.9);
  rangeeArbres(s, px(s, -0.92), px(s, 0.92), pz(s, 0.97), true, 7);
}

/** Siège international : lame de verre et aile basse en équerre, salle des assemblées sous voûte, grand bassin, rang de mâts à fanions neutres. */
export function siegeInternational(s: Site) {
  const { g, cx, R, H } = s;
  plateforme(s, hex("#d9d2c0"));
  const verre = hex("#6f9fb8"),
    verre2 = hex("#7fb0c9"),
    pierre = hex("#d8d3c8"),
    blanc = hex("#eeece6");
  for (const r of [zone(s, -1, -1, -0.9, 0.5), zone(s, 0.9, -1, 1, 0.5), zone(s, -0.9, -1, 0.9, -0.94)]) pelouse(g, r, s.seed);
  // la lame : grande tour plate, vitrée, avec ses ailerons verticaux blancs et sa couronne
  const lame = zone(s, -0.84, -0.86, 0.5, -0.52);
  volume(s, lame, BASE, haut(s, 1.0), { c: verre, m: MAT.GLASS, ...TOIT_PLAT });
  pilastres(g, lame[0], lame[2], lame[3], true, BASE + 2, haut(s, 0.97), 10, 0.7, 0.55, blanc, s.seed);
  acrotere(g, lame, haut(s, 1.0), blanc, 1.4, 0.5, s.seed);
  toitureEquipee(s, lame, haut(s, 1.0) + 1.4, 3);
  // aile basse en équerre, à l'est, et bloc d'ascenseurs
  const aile = zone(s, 0.5, -0.86, 0.88, -0.1);
  volume(s, aile, BASE, haut(s, 0.52), { c: verre2, m: MAT.GLASS, ...TOIT_PLAT });
  acrotere(g, aile, haut(s, 0.52), blanc, 1.0, 0.4, s.seed);
  volume(s, zone(s, -0.2, -0.52, 0.1, -0.44), BASE, haut(s, 1.0), { c: pierre, m: MAT.PLAIN, top: false });
  // salle des assemblées : socle de pierre, voûte vitrée à pignons de verre
  const salle = zone(s, -0.78, -0.4, 0.34, 0.3);
  const y0 = BASE + 7;
  volume(s, salle, BASE, y0, { c: pierre, m: MAT.PLAIN, top: false });
  const xA = salle[0],
    xB = salle[2],
    zc = (salle[1] + salle[3]) / 2,
    a = (salle[3] - salle[1]) / 2,
    b = 0.17 * H;
  const seg = 14;
  for (let i = 0; i < seg; i++) {
    const t0 = (Math.PI * i) / seg,
      t1 = (Math.PI * (i + 1)) / seg;
    quad(g, [xA, y0 + b * Math.sin(t0), zc + a * Math.cos(t0)], [xB, y0 + b * Math.sin(t0), zc + a * Math.cos(t0)], [xB, y0 + b * Math.sin(t1), zc + a * Math.cos(t1)], [xA, y0 + b * Math.sin(t1), zc + a * Math.cos(t1)], hex("#a9c6d6"), MAT.DARKGLASS, [0, Math.sin((t0 + t1) / 2), Math.cos((t0 + t1) / 2)], s.seed);
  }
  for (const [x, sens] of [
    [xA, -1],
    [xB, 1],
  ] as const) {
    const n = [sens, 0, 0] as [number, number, number];
    const ctr = g.v(x, y0, zc, ...n, hex("#8fb4c8"), MAT.DARKGLASS, 0, 0, s.seed);
    const rim: number[] = [];
    for (let i = 0; i <= seg; i++) {
      const t = (Math.PI * i) / seg;
      rim.push(g.v(x, y0 + b * Math.sin(t), zc + a * Math.cos(t), ...n, hex("#8fb4c8"), MAT.DARKGLASS, 0, 0, s.seed));
    }
    for (let i = 0; i < seg; i++) g.t(ctr, rim[i], rim[i + 1]);
  }
  // grand bassin avec jet, parvis dallé, rang de mâts à fanions (couleurs unies, aucun drapeau réel)
  allee(g, zone(s, -0.9, 0.3, 0.9, 1), s.seed);
  cylinder(g, cx, BASE, pz(s, 0.62), 0.28 * R, 0.5, 24, pierre, MAT.PLAIN, MAT.WATER, COL.water);
  cylinder(g, cx, BASE, pz(s, 0.62), 0.04 * R, 3.2, 8, COL.water, MAT.WATER, MAT.WATER, COL.water, 0.01);
  const fanions = ["#3f6fa8", "#e8e6df", "#4b8a5a", "#b04a3f", "#d8b341", "#6a5a9a", "#2f3b4a", "#3f8fa8", "#c9733a"].map((h) => hex(h));
  fanions.forEach((c, k) => mat(s, -0.84 + k * 0.21, 0.92, c));
  for (const a2 of [-0.5, 0.5]) lampe(s, a2, 0.4);
  rangeeArbres(s, px(s, -0.95), px(s, -0.6), pz(s, 0.62), true, 6);
  rangeeArbres(s, px(s, 0.6), px(s, 0.95), pz(s, 0.62), true, 6);
}

/** Technopole : campus de deux ailes (verre, pierre blanche) autour d'un atrium, passerelles, auditorium à dôme, bassin, ombrières solaires. */
export function technopole(s: Site) {
  const { g, cx, R, H } = s;
  plateforme(s, hex("#d9d6cf"));
  const blanc = hex("#e3e8ea");
  for (const r of [zone(s, -1, -1, -0.5, -0.5), zone(s, 0.5, -1, 1, -0.5)]) pelouse(g, r, s.seed);
  // trois volumes : aile vitrée, atrium de verre haut, aile blanche à bandeaux sombres
  const gauche = zone(s, -0.96, -0.55, -0.42, 0.2),
    droite = zone(s, 0.42, -0.55, 0.96, 0.2),
    centre = zone(s, -0.42, -0.45, 0.42, 0.3);
  volume(s, gauche, BASE, haut(s, 0.56), { c: RECHERCHE_PANNEAU, m: MAT.GLASS, ...TOIT_PLAT });
  volume(s, droite, BASE, haut(s, 0.56), { c: blanc, m: MAT.APART, ...TOIT_PLAT });
  for (const f of [0.2, 0.38]) volume(s, zone(s, 0.4, -0.57, 0.98, 0.22), haut(s, f), haut(s, f) + 0.8, { c: RECHERCHE_PANNEAU, m: MAT.PLAIN, top: false });
  volume(s, centre, BASE, haut(s, 1.0), { c: hex("#82b4de"), m: MAT.GLASS, top: false });
  toit2pans(g, centre, haut(s, 1.0), haut(s, 1.0) + 0.16 * R, true, hex("#9cc5e8"), MAT.DARKGLASS, hex("#82b4de"), MAT.GLASS, s.seed);
  acrotere(g, gauche, haut(s, 0.56), blanc, 0.8, 0.3, s.seed);
  acrotere(g, droite, haut(s, 0.56), blanc, 0.8, 0.3, s.seed);
  // passerelles vitrées entre les ailes et l'atrium, à deux niveaux
  for (const f of [0.28, 0.44]) {
    volume(s, [gauche[2], pz(s, -0.15), centre[0], pz(s, 0.05)], haut(s, f), haut(s, f) + 2.6, { c: hex("#a9c9dc"), m: MAT.GLASS, ...TOIT_PLAT });
    volume(s, [centre[2], pz(s, -0.15), droite[0], pz(s, 0.05)], haut(s, f), haut(s, f) + 2.6, { c: hex("#a9c9dc"), m: MAT.GLASS, ...TOIT_PLAT });
  }
  // auditorium rond à dôme d'observatoire, devant l'aile gauche
  const ax = px(s, -0.68),
    az = pz(s, 0.55);
  cylinder(g, ax, BASE, az, 0.2 * R, 0.3 * H, 20, blanc, MAT.APART, MAT.FLATROOF, COL.roofGray);
  cylinder(g, ax, haut(s, 0.3), az, 0.21 * R, 0.8, 20, RECHERCHE_PANNEAU, MAT.PLAIN, null, null);
  ellipsoide(g, ax, haut(s, 0.3) + 0.8, az, 0.18 * R, 0.1 * H, 0.18 * R, RECHERCHE_DOME, MAT.GLASS);
  // ombrières solaires sur le parking de l'aile droite, panneaux sur son toit
  parking(s, zone(s, 0.4, 0.4, 0.98, 0.95), true, 0.7);
  const yo = BASE + 3.6;
  for (let k = 0; k < 4; k++) volume(s, zone(s, 0.42 + k * 0.14, 0.45, 0.52 + k * 0.14, 0.92), yo, yo + 0.3, { c: hex("#1f3a5f"), m: MAT.PLAIN });
  for (const a of [0.43, 0.97]) for (const b of [0.46, 0.9]) box(g, px(s, a) - 0.15, BASE, pz(s, b) - 0.15, px(s, a) + 0.15, yo, pz(s, b) + 0.15, { c: COL.metal, m: MAT.PLAIN, seed: s.seed });
  panneauxSurToit(g, droite[0] + 2, droite[1] + 2, droite[2] - 2, droite[3] - 2, haut(s, 0.56) + 0.8, 4, s.seed);
  // bassin et allées devant l'atrium, antenne de l'atrium, arbres
  cylinder(g, cx, BASE, pz(s, 0.62), 0.2 * R, 0.4, 22, COL.stone, MAT.PLAIN, MAT.WATER, COL.water);
  allee(g, zone(s, -0.1, 0.3, 0.1, 0.4), s.seed);
  const ya = haut(s, 1.0) + 0.16 * R;
  box(g, cx - 0.12, ya, pz(s, -0.07) - 0.12, cx + 0.12, ya + 0.3 * H, pz(s, -0.07) + 0.12, { c: COL.metal, m: MAT.PLAIN });
  box(g, cx - 0.3, ya + 0.3 * H, pz(s, -0.07) - 0.3, cx + 0.3, ya + 0.3 * H + 0.6, pz(s, -0.07) + 0.3, { c: COL.beacon, m: MAT.BEACON });
  rangeeArbres(s, px(s, -0.95), px(s, -0.3), pz(s, 0.95), true, 7);
  rangeeArbres(s, pz(s, -0.95), pz(s, -0.6), px(s, 0), false, 8);
}

/** Centre de recherche : rotonde vitrée sous dôme, aile de laboratoires à parabole, tour technique à mât radio, jardin, parking. */
export function centreRecherche(s: Site) {
  const { g, R, H } = s;
  plateforme(s, hex("#d9d6cf"));
  const mur = RECHERCHE_WALLS[0];
  for (const r of [zone(s, -1, -1, -0.2, -0.45), zone(s, -1, 0.5, 0.1, 1)]) pelouse(g, r, s.seed);
  // rotonde : tambour blanc à ceinture vitrée, dôme d'observatoire sur sa couronne
  const rx = px(s, -0.4),
    rz = pz(s, 0.05),
    hr = 0.6 * H;
  cylinder(g, rx, BASE, rz, 0.42 * R, hr, 28, mur, MAT.APART, MAT.FLATROOF, COL.roofGray);
  cylinder(g, rx, haut(s, 0.18), rz, 0.425 * R, 0.24 * H, 28, RECHERCHE_PANNEAU, MAT.GLASS, null, null);
  cylinder(g, rx, BASE + hr, rz, 0.47 * R, 0.8, 28, shadeC(mur, 0.85), MAT.PLAIN, MAT.PLAIN, shadeC(mur, 0.85));
  cylinder(g, rx, BASE + hr + 0.8, rz, 0.28 * R, 0.08 * H, 20, shadeC(RECHERCHE_DOME, 0.9), MAT.PLAIN, null, null);
  ellipsoide(g, rx, BASE + hr + 0.8 + 0.08 * H, rz, 0.28 * R, 0.14 * H, 0.28 * R, RECHERCHE_DOME, MAT.GLASS);
  // aile de laboratoires : façade sud entièrement vitrée, panneaux solaires et parabole sur le toit
  const aile = zone(s, 0.15, -0.3, 0.98, 0.4);
  volume(s, aile, BASE, haut(s, 0.48), { c: mur, m: MAT.APART, ...TOIT_PLAT });
  volume(s, zone(s, 0.15, 0.38, 0.98, 0.43), BASE, haut(s, 0.48), { c: RECHERCHE_PANNEAU, m: MAT.GLASS, top: false });
  acrotere(g, aile, haut(s, 0.48), shadeC(mur, 0.85), 0.7, 0.3, s.seed);
  const yt = haut(s, 0.48) + 0.7;
  panneauxSurToit(g, px(s, 0.25), pz(s, -0.25), px(s, 0.6), pz(s, 0.3), yt, 3, s.seed);
  box(g, px(s, 0.82) - 0.15, yt, pz(s, 0.1) - 0.15, px(s, 0.82) + 0.15, yt + 0.12 * H, pz(s, 0.1) + 0.15, { c: COL.metal, m: MAT.PLAIN });
  disque(g, px(s, 0.82), yt + 0.16 * H, pz(s, 0.1) + 0.2, 0.1 * R, "+z", hex("#e9ecee"), MAT.PLAIN, 18);
  // tour technique vitrée au fond, mât radio à feu rouge
  const tour = zone(s, 0.45, -0.96, 0.92, -0.5);
  volume(s, tour, BASE, haut(s, 0.9), { c: hex("#7d9fb8"), m: MAT.GLASS, ...TOIT_PLAT });
  acrotere(g, tour, haut(s, 0.9), hex("#dfe5ea"), 0.9, 0.35, s.seed);
  const mx = px(s, 0.68),
    mz = pz(s, -0.73),
    ym = haut(s, 0.9) + 0.9;
  cylinder(g, mx, ym, mz, 0.35, 0.3 * H, 8, COL.metal, MAT.PLAIN, null, null, 0.1);
  box(g, mx - 0.25, ym + 0.3 * H, mz - 0.25, mx + 0.25, ym + 0.3 * H + 0.5, mz + 0.25, { c: COL.beacon, m: MAT.BEACON });
  toitureEquipee(s, tour, haut(s, 0.9) + 0.9, 2);
  // passerelle vitrée entre la rotonde et l'aile, parking, arbres
  volume(s, [rx + 0.42 * R, pz(s, -0.05), aile[0], pz(s, 0.15)], haut(s, 0.25), haut(s, 0.25) + 2.8, { c: hex("#a9c9dc"), m: MAT.GLASS, ...TOIT_PLAT });
  parking(s, zone(s, 0.2, 0.5, 0.98, 0.95), true, 0.6);
  rangeeArbres(s, px(s, -0.95), px(s, 0.1), pz(s, 0.97), true, 7);
  rangeeArbres(s, pz(s, -0.9), pz(s, 0.5), px(s, -0.95), false, 8);
  allee(g, zone(s, -0.45, 0.45, -0.35, 1), s.seed);
}
