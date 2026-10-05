/**
 * Mégaprojets « civils » (docs/A-INTEGRER.md §44) : Grande école, Hôpital, Opéra, Tour
 * emblématique, Siège international, Technopole, Centre de recherche. Chacun a sa propre
 * silhouette et la couleur/matière NATURELLE du bâtiment qu'il représente — pierre claire,
 * verre, cuivre patiné, dorures — plutôt qu'une teinte d'activité ou l'or des monuments.
 * Tout est dessiné en fractions de R (demi-côté de l'emprise) et de H (hauteur disponible),
 * voir megaprojetsFormes.ts.
 */
import { COL, MAT, RECHERCHE_DOME, RECHERCHE_PANNEAU, RECHERCHE_WALLS, SERVICES_BANDEAU, SERVICES_CROIX, hex } from "./constantes";
import { box, cylinder, shadeC } from "./geometrie";
import { disque, ellipsoide, marchesCarrees, tronc } from "./monumentsFormes";
import { BASE, arbre, haut, panneauxSurToit, plateforme, px, pz, quad, toit2pans, volume, zone, type Site } from "./megaprojetsFormes";

const CALCAIRE = hex("#e7dcc4");
const CALCAIRE_OMBRE = hex("#d3c4a3");
const ACIER = hex("#aab2b8");
const VERT_ARBRE = hex("#5d9a3f");
const TOIT_PLAT = { topM: MAT.FLATROOF, topC: COL.roofGray };

/** Grande école : deux ailes de pierre claire autour d'un atrium vitré, perron et portique d'entrée. */
export function grandeEcole(s: Site) {
  const { g, cx, cz, R, H } = s;
  plateforme(s);
  const aile = { c: CALCAIRE, m: MAT.APART, ...TOIT_PLAT };
  volume(s, zone(s, -0.98, -0.6, -0.32, 0.55), BASE, haut(s, 0.6), aile);
  volume(s, zone(s, 0.32, -0.6, 0.98, 0.55), BASE, haut(s, 0.6), aile);
  // corniche des ailes
  for (const [a0, a1] of [
    [-1.0, -0.3],
    [0.3, 1.0],
  ] as const)
    volume(s, zone(s, a0, -0.62, a1, 0.57), haut(s, 0.57), haut(s, 0.62), { c: CALCAIRE_OMBRE, m: MAT.PLAIN, top: false });
  // atrium vitré, plus haut, avec son lanterneau
  volume(s, zone(s, -0.4, -0.7, 0.4, 0.7), BASE, haut(s, 0.88), { c: hex("#8db6cf"), m: MAT.GLASS, ...TOIT_PLAT });
  volume(s, zone(s, -0.16, -0.3, 0.16, 0.3), haut(s, 0.88), haut(s, 1.0), { c: hex("#a9c9dc"), m: MAT.GLASS, ...TOIT_PLAT });
  // perron à deux marches et portique sur deux colonnes
  marchesCarrees(g, cx, BASE, pz(s, 0.84), 0.36 * R, 0.1 * R, 2, 0.04 * H, CALCAIRE, 0.03 * R, s.seed);
  for (const a of [-0.24, 0.24]) cylinder(g, px(s, a), BASE + 0.08 * H, pz(s, 0.84), 0.035 * R, 0.34 * H, 8, CALCAIRE, MAT.PLAIN, null, null);
  volume(s, zone(s, -0.32, 0.7, 0.32, 0.94), haut(s, 0.45), haut(s, 0.49), { c: CALCAIRE_OMBRE, m: MAT.PLAIN });
  // mât et fanion sur l'aile gauche
  box(g, px(s, -0.78) - 0.05, haut(s, 0.62), pz(s, 0.2) - 0.05, px(s, -0.78) + 0.05, haut(s, 0.62) + 0.4 * H, pz(s, 0.2) + 0.05, { c: COL.metal, m: MAT.PLAIN });
  quad(g, [px(s, -0.78), haut(s, 0.62) + 0.4 * H, pz(s, 0.2)], [px(s, -0.78), haut(s, 0.62) + 0.33 * H, pz(s, 0.2)], [px(s, -0.78) + 0.3 * R, haut(s, 0.62) + 0.365 * H, pz(s, 0.2)], [px(s, -0.78) + 0.3 * R, haut(s, 0.62) + 0.4 * H, pz(s, 0.2)], hex("#2f5f9e"), MAT.PAINT, [0, 0, 1]);
  arbre(g, px(s, 0.78), pz(s, 0.78), 0.3 * H, VERT_ARBRE);
  arbre(g, px(s, -0.76), pz(s, 0.74), 0.3 * H, VERT_ARBRE);
}

/** Hôpital : bloc blanc à bandeau turquoise, grande croix rouge (même langage que buildServices()), urgences, hélistation. */
export function hopital(s: Site) {
  const { g, R, H } = s;
  plateforme(s);
  const blanc = hex("#f2efe8");
  const toitBlanc = { c: blanc, m: MAT.APART, ...TOIT_PLAT };
  const corps = zone(s, -0.85, -0.65, 0.55, 0.35);
  volume(s, corps, BASE, haut(s, 0.78), toitBlanc);
  volume(s, zone(s, 0.45, -0.55, 1, 0.15), BASE, haut(s, 0.5), { ...toitBlanc, c: shadeC(blanc, 0.97) });
  // bandeau turquoise autour du bloc principal
  volume(s, zone(s, -0.87, -0.67, 0.57, 0.37), haut(s, 0.5), haut(s, 0.56), { c: SERVICES_BANDEAU, m: MAT.PLAIN, top: false });
  // grande croix rouge au-dessus de l'entrée : deux boîtes qui se croisent, légèrement en saillie
  const L = 0.3 * H,
    t = 0.08 * R,
    yc = haut(s, 0.66);
  const zf = pz(s, 0.35);
  box(g, px(s, -0.15) - t, yc - L / 2, zf, px(s, -0.15) + t, yc + L / 2, zf + 0.06 * R, { c: SERVICES_CROIX, m: MAT.PLAIN, seed: s.seed });
  box(g, px(s, -0.15) - L / 2, yc - t, zf, px(s, -0.15) + L / 2, yc + t, zf + 0.06 * R, { c: SERVICES_CROIX, m: MAT.PLAIN, seed: s.seed });
  // auvent rouge des urgences, sur deux piliers, et l'ambulance
  volume(s, zone(s, -0.85, 0.35, -0.3, 0.8), haut(s, 0.27), haut(s, 0.3), { c: SERVICES_CROIX, m: MAT.PLAIN });
  for (const a of [-0.82, -0.33]) box(g, px(s, a) - 0.04, BASE, pz(s, 0.78) - 0.04, px(s, a) + 0.04, haut(s, 0.27), pz(s, 0.78) + 0.04, { c: COL.metal, m: MAT.PLAIN });
  volume(s, zone(s, -0.72, 0.5, -0.4, 0.66), BASE + 0.02, haut(s, 0.2), { c: hex("#f4f4f2"), m: MAT.PAINT });
  volume(s, zone(s, -0.72, 0.5, -0.4, 0.66), haut(s, 0.1), haut(s, 0.13), { c: SERVICES_CROIX, m: MAT.PAINT, top: false });
  // hélistation sur le toit de l'aile haute et local technique
  const hx = px(s, -0.1),
    hz = pz(s, -0.2),
    yt = haut(s, 0.78);
  quad(g, [hx - 0.3 * R, yt + 0.03, hz - 0.3 * R], [hx + 0.3 * R, yt + 0.03, hz - 0.3 * R], [hx + 0.3 * R, yt + 0.03, hz + 0.3 * R], [hx - 0.3 * R, yt + 0.03, hz + 0.3 * R], COL.helipad, MAT.HELIPAD, [0, 1, 0]);
  box(g, hx - 0.1 * R, yt + 0.04, hz - 0.03 * R, hx + 0.1 * R, yt + 0.07, hz + 0.03 * R, { c: SERVICES_CROIX, m: MAT.PLAIN, top: false });
  volume(s, zone(s, 0.2, -0.55, 0.45, -0.25), yt, yt + 0.1 * H, { c: shadeC(blanc, 0.9), m: MAT.PLAIN });
  arbre(g, px(s, 0.75), pz(s, 0.6), 0.28 * H, VERT_ARBRE);
}

/** Opéra : façade classique à six colonnes et fronton, dôme de cuivre patiné, tour de scène. */
export function opera(s: Site) {
  const { g, cx, R, H } = s;
  plateforme(s);
  const cuivre = hex("#76a28e"),
    or = hex("#c9a63e");
  // grand corps de pierre, corniche, fenêtres hautes sur les côtés
  const yH = haut(s, 0.55);
  volume(s, zone(s, -0.88, -0.8, 0.88, 0.34), BASE, yH, { c: CALCAIRE, m: MAT.PLAIN, ...TOIT_PLAT });
  volume(s, zone(s, -0.9, -0.82, 0.9, 0.36), yH - 0.05 * H, yH, { c: CALCAIRE_OMBRE, m: MAT.PLAIN, top: false });
  for (const cote of [-1, 1])
    for (let k = 0; k < 4; k++) {
      const z0 = -0.62 + k * 0.26;
      volume(s, [px(s, cote * 0.88) + (cote > 0 ? 0 : -0.04), pz(s, z0), px(s, cote * 0.88) + (cote > 0 ? 0.04 : 0), pz(s, z0 + 0.12)], haut(s, 0.2), haut(s, 0.42), { c: hex("#2a3a4a"), m: MAT.DARKGLASS });
    }
  // tour de scène, derrière le dôme
  volume(s, zone(s, -0.5, -0.82, 0.5, -0.45), yH, haut(s, 0.74), { c: CALCAIRE_OMBRE, m: MAT.PLAIN, ...TOIT_PLAT });
  // dôme de cuivre sur un tambour de pierre, avec sa lanterne dorée
  const dz = pz(s, -0.05);
  cylinder(g, cx, yH, dz, 0.48 * R, 0.08 * H, 18, CALCAIRE, MAT.PLAIN, null, null);
  ellipsoide(g, cx, yH + 0.08 * H, dz, 0.48 * R, 0.24 * H, 0.48 * R, cuivre, MAT.PLAIN);
  box(g, cx - 0.04 * R, yH + 0.3 * H, dz - 0.04 * R, cx + 0.04 * R, yH + 0.4 * H, dz + 0.04 * R, { c: or, m: MAT.PLAIN, seed: s.seed });
  // perron, six colonnes, entablement et fronton (le triangle regarde la place)
  const yP = marchesCarrees(g, cx, BASE, pz(s, 0.6), 0.72 * R, 0.32 * R, 3, 0.04 * H, CALCAIRE, 0.07 * R, s.seed);
  const hCol = 0.4 * H;
  for (let k = 0; k < 6; k++) {
    const a = -0.6 + k * 0.24;
    cylinder(g, px(s, a), yP, pz(s, 0.58), 0.05 * R, hCol, 10, CALCAIRE, MAT.PLAIN, null, null, 0.042 * R);
    box(g, px(s, a) - 0.065 * R, yP + hCol, pz(s, 0.58) - 0.065 * R, px(s, a) + 0.065 * R, yP + hCol + 0.03 * H, pz(s, 0.58) + 0.065 * R, { c: CALCAIRE_OMBRE, m: MAT.PLAIN, seed: s.seed });
  }
  const yE = yP + hCol + 0.03 * H;
  volume(s, zone(s, -0.7, 0.3, 0.7, 0.68), yE, yE + 0.05 * H, { c: CALCAIRE_OMBRE, m: MAT.PLAIN });
  toit2pans(g, zone(s, -0.7, 0.3, 0.7, 0.68), yE + 0.05 * H, yE + 0.05 * H + 0.15 * H, false, hex("#8aa39a"), MAT.PLAIN, CALCAIRE, MAT.PLAIN, s.seed);
  // statues dorées aux angles et au sommet du fronton
  for (const a of [-0.7, 0.7]) box(g, px(s, a) - 0.03 * R, yE + 0.05 * H, pz(s, 0.66) - 0.03 * R, px(s, a) + 0.03 * R, yE + 0.12 * H, pz(s, 0.66) + 0.03 * R, { c: or, m: MAT.PLAIN, seed: s.seed });
  box(g, cx - 0.03 * R, yE + 0.2 * H, pz(s, 0.66) - 0.03 * R, cx + 0.03 * R, yE + 0.29 * H, pz(s, 0.66) + 0.03 * R, { c: or, m: MAT.PLAIN, seed: s.seed });
}

/** Tour emblématique : trois volumes vitrés en retrait sur un socle de pierre, ailerons d'acier, couronne en pyramide et flèche. */
export function tourEmblematique(s: Site) {
  const { g, cx, cz, R, H } = s;
  plateforme(s);
  const verre = hex("#5aa0b4"),
    verreHaut = hex("#6fb3c4");
  volume(s, zone(s, -0.9, -0.9, 0.9, 0.9), BASE, haut(s, 0.12), { c: hex("#d9d3c8"), m: MAT.PODIUM, ...TOIT_PLAT });
  const etages: [number, number, number, number, ReturnType<typeof hex>][] = [
    [0.62, 0.12, 0.5, 0.7, verre],
    [0.46, 0.5, 0.78, 0.54, verre],
    [0.31, 0.78, 0.95, 0.36, verreHaut],
  ];
  for (const [demi, f0, f1, terrasse, c] of etages) {
    volume(s, zone(s, -demi, -demi, demi, demi), haut(s, f0), haut(s, f1), { c, m: MAT.GLASS, ...TOIT_PLAT });
    // terrasse en saillie au pied du volume suivant, et ailerons d'acier aux quatre angles
    volume(s, zone(s, -terrasse, -terrasse, terrasse, terrasse), haut(s, f1), haut(s, f1) + 0.025 * H, { c: COL.concrete, m: MAT.CONCRETE });
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const)
      box(g, px(s, sx * demi) - 0.035 * R, haut(s, f0), pz(s, sz * demi) - 0.035 * R, px(s, sx * demi) + 0.035 * R, haut(s, f1), pz(s, sz * demi) + 0.035 * R, { c: ACIER, m: MAT.PLAIN, top: false, seed: s.seed });
  }
  // couronne en pyramide de verre, flèche et feu rouge
  tronc(g, cx, haut(s, 0.95), cz, 0.31 * R, 0, 0.16 * H, hex("#9fd0dc"), MAT.DARKGLASS, s.seed);
  cylinder(g, cx, haut(s, 0.95) + 0.16 * H, cz, 0.03 * R, 0.14 * H, 8, COL.metal, MAT.PLAIN, null, null, 0.015 * R);
  box(g, cx - 0.04 * R, haut(s, 0.95) + 0.3 * H, cz - 0.04 * R, cx + 0.04 * R, haut(s, 0.95) + 0.3 * H + 0.06 * R, cz + 0.04 * R, { c: COL.beacon, m: MAT.BEACON });
}

/** Siège international : longue lame de verre, salle des assemblées sous une voûte vitrée, bassin et rang de mâts à fanions. */
export function siegeInternational(s: Site) {
  const { g, cx, R, H } = s;
  plateforme(s);
  const verre = hex("#6f9fb8"),
    pierre = hex("#d8d3c8");
  // la lame : grande tour plate, vitrée, ceinte d'une couronne blanche
  volume(s, zone(s, -0.8, -0.8, 0.8, -0.42), BASE, haut(s, 1.0), { c: verre, m: MAT.GLASS, ...TOIT_PLAT });
  volume(s, zone(s, -0.82, -0.82, 0.82, -0.4), haut(s, 0.94), haut(s, 1.0), { c: hex("#eeece6"), m: MAT.PLAIN, top: false });
  for (const a of [-0.8, 0.8]) volume(s, zone(s, a - 0.03, -0.82, a + 0.03, -0.4), BASE, haut(s, 0.94), { c: hex("#eeece6"), m: MAT.PLAIN, top: false });
  // salle des assemblées : socle de pierre et voûte vitrée à pignons de verre
  const zc = pz(s, -0.05);
  volume(s, zone(s, -0.76, -0.4, 0.76, 0.3), BASE, haut(s, 0.16), { c: pierre, m: MAT.PLAIN, top: false });
  const xA = px(s, -0.76),
    xB = px(s, 0.76),
    y0 = haut(s, 0.16),
    b = 0.17 * H;
  const seg = 12;
  for (let i = 0; i < seg; i++) {
    const t0 = (Math.PI * i) / seg,
      t1 = (Math.PI * (i + 1)) / seg;
    quad(g, [xA, y0 + b * Math.sin(t0), zc + 0.35 * R * Math.cos(t0)], [xB, y0 + b * Math.sin(t0), zc + 0.35 * R * Math.cos(t0)], [xB, y0 + b * Math.sin(t1), zc + 0.35 * R * Math.cos(t1)], [xA, y0 + b * Math.sin(t1), zc + 0.35 * R * Math.cos(t1)], hex("#a9c6d6"), MAT.DARKGLASS, [0, Math.sin((t0 + t1) / 2), Math.cos((t0 + t1) / 2)], s.seed);
  }
  // bassin devant la salle, et mâts à fanions (couleurs neutres, aucun emblème réel)
  cylinder(g, cx, BASE, pz(s, 0.62), 0.2 * R, 0.05 * H, 18, pierre, MAT.PLAIN, MAT.WATER, COL.water);
  const fanions = ["#3f6fa8", "#e8e6df", "#4b8a5a", "#b04a3f", "#d8b341", "#6a5a9a", "#2f3b4a"].map((h) => hex(h));
  const yMat = BASE + 0.5 * H;
  fanions.forEach((c, k) => {
    const x = px(s, -0.78 + k * 0.26),
      z = pz(s, 0.86);
    box(g, x - 0.025 * R, BASE, z - 0.025 * R, x + 0.025 * R, yMat, z + 0.025 * R, { c: COL.metal, m: MAT.PLAIN, seed: s.seed });
    quad(g, [x, yMat, z], [x, yMat - 0.08 * H, z], [x + 0.18 * R, yMat - 0.04 * H, z], [x + 0.18 * R, yMat, z], c, MAT.PAINT, [0, 0, 1]);
  });
}

/** Technopole : campus de deux ailes (l'une toute vitrée, l'autre blanche) autour d'un atrium de verre, galerie couverte, dôme et panneaux solaires. */
export function technopole(s: Site) {
  const { g, cx, R, H } = s;
  plateforme(s);
  const blanc = hex("#e3e8ea");
  volume(s, zone(s, -1, -0.5, -0.5, 0.3), BASE, haut(s, 0.52), { c: RECHERCHE_PANNEAU, m: MAT.GLASS, ...TOIT_PLAT });
  volume(s, zone(s, 0.5, -0.5, 1, 0.3), BASE, haut(s, 0.52), { c: blanc, m: MAT.APART, ...TOIT_PLAT });
  volume(s, zone(s, -0.4, -0.4, 0.4, 0.4), BASE, haut(s, 1.0), { c: hex("#82b4de"), m: MAT.GLASS, ...TOIT_PLAT });
  // galerie couverte devant les trois volumes
  volume(s, zone(s, -1, 0.4, 1, 0.62), haut(s, 0.22), haut(s, 0.25), { c: blanc, m: MAT.PLAIN });
  for (let k = 0; k < 6; k++) box(g, px(s, -0.95 + k * 0.38) - 0.025 * R, BASE, pz(s, 0.58) - 0.025 * R, px(s, -0.95 + k * 0.38) + 0.025 * R, haut(s, 0.22), pz(s, 0.58) + 0.025 * R, { c: COL.metal, m: MAT.PLAIN, seed: s.seed });
  // dôme d'observatoire sur l'aile vitrée, panneaux solaires sur l'aile blanche
  const dx = px(s, -0.75),
    dz = pz(s, -0.1),
    yt = haut(s, 0.52);
  cylinder(g, dx, yt, dz, 0.2 * R, 0.05 * H, 14, shadeC(RECHERCHE_DOME, 0.9), MAT.PLAIN, null, null);
  ellipsoide(g, dx, yt + 0.05 * H, dz, 0.2 * R, 0.1 * H, 0.2 * R, RECHERCHE_DOME, MAT.GLASS);
  panneauxSurToit(g, px(s, 0.58), pz(s, -0.45), px(s, 0.92), pz(s, 0.25), yt, 3, s.seed);
  // antenne de l'atrium et deux arbres sur la pelouse
  const ya = haut(s, 1.0);
  box(g, cx - 0.02 * R, ya, pz(s, 0) - 0.02 * R, cx + 0.02 * R, ya + 0.18 * H, pz(s, 0) + 0.02 * R, { c: COL.metal, m: MAT.PLAIN });
  box(g, cx - 0.035 * R, ya + 0.18 * H, pz(s, 0) - 0.035 * R, cx + 0.035 * R, ya + 0.18 * H + 0.05 * R, pz(s, 0) + 0.035 * R, { c: COL.beacon, m: MAT.BEACON });
  arbre(g, px(s, -0.7), pz(s, 0.72), 0.3 * H, VERT_ARBRE);
  arbre(g, px(s, 0.7), pz(s, 0.72), 0.3 * H, VERT_ARBRE);
}

/** Centre de recherche : rotonde vitrée sous un dôme d'observatoire, aile de laboratoires, tour technique, parabole et mât radio. */
export function centreRecherche(s: Site) {
  const { g, R, H } = s;
  plateforme(s);
  const mur = RECHERCHE_WALLS[0];
  // rotonde : tambour blanc, ceinture vitrée, dôme d'observatoire
  const rx = px(s, -0.3),
    rz = pz(s, 0.05),
    hr = 0.62 * H;
  cylinder(g, rx, BASE, rz, 0.46 * R, hr, 20, mur, MAT.APART, MAT.FLATROOF, COL.roofGray);
  cylinder(g, rx, haut(s, 0.2), rz, 0.465 * R, 0.24 * H, 20, RECHERCHE_PANNEAU, MAT.GLASS, null, null);
  cylinder(g, rx, BASE + hr, rz, 0.5 * R, 0.04 * H, 20, shadeC(mur, 0.85), MAT.PLAIN, MAT.PLAIN, shadeC(mur, 0.85));
  cylinder(g, rx, BASE + hr + 0.04 * H, rz, 0.3 * R, 0.04 * H, 16, shadeC(RECHERCHE_DOME, 0.9), MAT.PLAIN, null, null);
  ellipsoide(g, rx, BASE + hr + 0.08 * H, rz, 0.3 * R, 0.16 * H, 0.3 * R, RECHERCHE_DOME, MAT.GLASS);
  // aile de laboratoires à façade vitrée, panneaux solaires et parabole sur son toit
  const aile = zone(s, 0.2, -0.25, 1, 0.45);
  volume(s, aile, BASE, haut(s, 0.5), { c: mur, m: MAT.APART, ...TOIT_PLAT });
  volume(s, zone(s, 0.2, 0.43, 1, 0.47), BASE, haut(s, 0.5), { c: RECHERCHE_PANNEAU, m: MAT.GLASS, top: false });
  const yt = haut(s, 0.5);
  panneauxSurToit(g, px(s, 0.3), pz(s, -0.2), px(s, 0.62), pz(s, 0.38), yt, 2, s.seed);
  box(g, px(s, 0.85) - 0.02 * R, yt, pz(s, 0.1) - 0.02 * R, px(s, 0.85) + 0.02 * R, yt + 0.16 * H, pz(s, 0.1) + 0.02 * R, { c: COL.metal, m: MAT.PLAIN });
  disque(g, px(s, 0.85), yt + 0.22 * H, pz(s, 0.12), 0.13 * R, "+z", hex("#e9ecee"), MAT.PLAIN, 14);
  // tour technique vitrée au fond, surmontée d'un mât radio à feu rouge
  volume(s, zone(s, 0.5, -0.95, 0.95, -0.5), BASE, haut(s, 0.92), { c: hex("#7d9fb8"), m: MAT.GLASS, ...TOIT_PLAT });
  const mx = px(s, 0.72),
    mz = pz(s, -0.72),
    ym = haut(s, 0.92);
  cylinder(g, mx, ym, mz, 0.03 * R, 0.32 * H, 8, COL.metal, MAT.PLAIN, null, null, 0.012 * R);
  box(g, mx - 0.035 * R, ym + 0.32 * H, mz - 0.035 * R, mx + 0.035 * R, ym + 0.32 * H + 0.05 * R, mz + 0.035 * R, { c: COL.beacon, m: MAT.BEACON });
  arbre(g, px(s, -0.76), pz(s, 0.74), 0.3 * H, VERT_ARBRE);
}
