/**
 * Mégaprojets « équipements » (docs/A-INTEGRER.md §44) : Parc des sports, Stade, Grand stade,
 * Marché couvert, Zone logistique, Gare TGV, Aéroport. Structures ouvertes, halles, voûtes et
 * hangars, chacun dans la matière naturelle de l'ouvrage réel (béton et gradins colorés,
 * fonte verte et verrière, bardage métallique, acier et verre) plutôt que dans une teinte
 * d'activité. Dessinés en fractions de R et de H, voir megaprojetsFormes.ts.
 */
import { COL, COMMERCE_ENSEIGNE, INDUSTRIE_ACCENT, MAT, hex, type Couleur } from "./constantes";
import { box, cylinder, flat, shadeC } from "./geometrie";
import { disque, marchesCarrees, tronc } from "./monumentsFormes";
import { BASE, anneauPente, arbre, boutVoute, haut, matLumineux, murOvale, plateforme, px, pz, quad, tri, toit2pans, voute, volume, zone, type Site } from "./megaprojetsFormes";

const BLANC = hex("#f1eee7");
const TOIT_PLAT = { topM: MAT.FLATROOF, topC: COL.roofGray };
const SIEGE_BLEU = hex("#3b6aa8");
const SIEGE_BLANC = hex("#e6e6e3");
const SIEGE_ROUGE = hex("#b4483c");
const LIGNE = hex("#f4f4f0");

/** Terrain de sport : pelouse tondue bordée de lignes blanches (périmètre, médiane) à la hauteur `y`. */
function terrain(s: Site, a: number, b: number, y: number) {
  const { g } = s;
  const [x0, z0, x1, z1] = zone(s, -a, -b, a, b);
  flat(g, x0, z0, x1, z1, y, COL.lawn, MAT.LAWN, s.seed);
  const e = 0.012 * s.R + 0.012;
  const trait = (r: [number, number, number, number]) => box(g, r[0], y, r[1], r[2], y + 0.012, r[3], { c: LIGNE, m: MAT.PAINT, seed: s.seed });
  trait([x0, z0, x1, z0 + e]);
  trait([x0, z1 - e, x1, z1]);
  trait([x0, z0, x0 + e, z1]);
  trait([x1 - e, z0, x1, z1]);
  trait([(x0 + x1) / 2 - e / 2, z0, (x0 + x1) / 2 + e / 2, z1]);
  cylinder(s.g, (x0 + x1) / 2, y, (z0 + z1) / 2, 0.16 * s.R, 0.012, 16, LIGNE, MAT.PAINT, null, null);
  cylinder(s.g, (x0 + x1) / 2, y + 0.003, (z0 + z1) / 2, 0.16 * s.R - e, 0.012, 16, COL.lawn, MAT.LAWN, MAT.LAWN, COL.lawn);
}

/** Parc des sports : terrain entouré d'une piste rouge, petite tribune à toit léger, deux mâts d'éclairage. */
export function parcSports(s: Site) {
  const { g } = s;
  plateforme(s);
  const [tx0, tz0, tx1, tz1] = zone(s, -0.98, -0.72, 0.98, 0.7);
  flat(g, tx0, tz0, tx1, tz1, BASE + 0.012, hex("#b5563c"), MAT.PLAIN, s.seed);
  terrain(s, 0.7, 0.44, BASE + 0.03);
  // tribune de trois gradins de béton, assises bleues, sous un toit léger
  for (let k = 0; k < 3; k++) {
    const z0 = 0.74 + k * 0.08;
    volume(s, zone(s, -0.7, z0, 0.7, 0.98), BASE, haut(s, 0.12 + 0.1 * k), { c: COL.concrete, m: MAT.CONCRETE, top: false });
    volume(s, zone(s, -0.7, z0, 0.7, z0 + 0.08), haut(s, 0.12 + 0.1 * k), haut(s, 0.12 + 0.1 * k) + 0.02, { c: SIEGE_BLEU, m: MAT.PLAIN, top: true });
  }
  volume(s, zone(s, -0.74, 0.84, 0.74, 1.0), haut(s, 0.46), haut(s, 0.49), { c: BLANC, m: MAT.PLAIN });
  for (const a of [-0.72, 0.72]) box(g, px(s, a) - 0.03, BASE, pz(s, 0.97) - 0.03, px(s, a) + 0.03, haut(s, 0.46), pz(s, 0.97) + 0.03, { c: COL.metal, m: MAT.PLAIN });
  for (const a of [-0.88, 0.88]) matLumineux(g, px(s, a), pz(s, -0.84), BASE, 0.85 * s.H, s.seed);
}

/** Cuvette de stade : mur extérieur, gradins inclinés à sièges alternés, bord de pelouse. Renvoie les rayons utiles. */
function cuvette(s: Site, o: { rxO: number; rzO: number; rxI: number; rzI: number; yHaut: number; seg: number; mur: Couleur; sieges: [Couleur, Couleur] }) {
  const { g, cx, cz, R } = s;
  const yBas = haut(s, 0.06);
  murOvale(g, cx, cz, o.rxO * R, o.rzO * R, BASE, haut(s, o.yHaut), o.seg, (i) => (i % 2 ? shadeC(o.mur, 0.95) : o.mur), MAT.PLAIN, true, s.seed);
  anneauPente(g, cx, cz, o.rxI * R, o.rzI * R, yBas, o.rxO * R * 0.99, o.rzO * R * 0.99, haut(s, o.yHaut), o.seg, (i) => o.sieges[Math.floor(i / 2) % 2], MAT.PLAIN, s.seed);
  murOvale(g, cx, cz, o.rxI * R, o.rzI * R, BASE, yBas, o.seg, SIEGE_BLANC, MAT.PLAIN, false, s.seed);
}

/** Stade : cuvette ovale de gradins bleus et blancs, pelouse tracée, quatre mâts d'éclairage. */
export function stade(s: Site) {
  const { g } = s;
  plateforme(s);
  cuvette(s, { rxO: 0.95, rzO: 0.78, rxI: 0.6, rzI: 0.42, yHaut: 0.5, seg: 24, mur: hex("#cfcdc6"), sieges: [SIEGE_BLEU, SIEGE_BLANC] });
  terrain(s, 0.54, 0.35, BASE + 0.03);
  // deux porches sombres sur le mur extérieur, quatre mâts d'éclairage aux angles
  for (const cote of [-1, 1]) volume(s, [px(s, cote * 0.95) - 0.05, pz(s, -0.1), px(s, cote * 0.95) + 0.05, pz(s, 0.1)], BASE, haut(s, 0.2), { c: hex("#2b3036"), m: MAT.PLAIN, top: false });
  for (const [a, b] of [
    [-0.84, -0.66],
    [0.84, -0.66],
    [-0.84, 0.66],
    [0.84, 0.66],
  ] as const)
    matLumineux(g, px(s, a), pz(s, b), BASE, 0.98 * s.H, s.seed);
}

/** Grand stade : deux anneaux de gradins, galerie vitrée entre les deux, toit-couronne blanc sur seize mâts, couronne lumineuse. Bas et large, comme un vrai stade. */
export function grandStade(s: Site) {
  const { g, cx, cz, R } = s;
  plateforme(s);
  const SEG = 28;
  const place = (i: number) => [SIEGE_BLEU, SIEGE_ROUGE][Math.floor(i / 2) % 2];
  murOvale(g, cx, cz, 0.96 * R, 0.8 * R, BASE, haut(s, 0.4), SEG, (i) => (i % 2 ? hex("#e1dfd9") : hex("#ebe9e3")), MAT.PLAIN, true, s.seed);
  // anneau bas, galerie vitrée, anneau haut
  anneauPente(g, cx, cz, 0.62 * R, 0.42 * R, haut(s, 0.04), 0.8 * R, 0.6 * R, haut(s, 0.18), SEG, place, MAT.PLAIN, s.seed);
  murOvale(g, cx, cz, 0.805 * R, 0.605 * R, haut(s, 0.18), haut(s, 0.23), SEG, hex("#33495c"), MAT.DARKGLASS, true, s.seed);
  anneauPente(g, cx, cz, 0.82 * R, 0.62 * R, haut(s, 0.23), 0.95 * R, 0.79 * R, haut(s, 0.4), SEG, place, MAT.PLAIN, s.seed);
  murOvale(g, cx, cz, 0.62 * R, 0.42 * R, BASE, haut(s, 0.04), SEG, SIEGE_BLANC, MAT.PLAIN, false, s.seed);
  terrain(s, 0.55, 0.36, BASE + 0.03);
  // toit-couronne : du bord extérieur haut vers l'intérieur plus bas, et sa tranche
  anneauPente(g, cx, cz, 0.68 * R, 0.48 * R, haut(s, 0.47), 0.97 * R, 0.82 * R, haut(s, 0.58), SEG, hex("#f3f1ea"), MAT.PLAIN, s.seed);
  murOvale(g, cx, cz, 0.97 * R, 0.82 * R, haut(s, 0.4), haut(s, 0.58), SEG, hex("#d9d7d0"), MAT.PLAIN, true, s.seed);
  // seize mâts d'appui sur le pourtour, et couronne de feux sous le bord intérieur du toit
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    box(g, cx + Math.cos(a) * 0.97 * R - 0.05, BASE, cz + Math.sin(a) * 0.82 * R - 0.05, cx + Math.cos(a) * 0.97 * R + 0.05, haut(s, 0.58), cz + Math.sin(a) * 0.82 * R + 0.05, { c: COL.metal, m: MAT.PLAIN, top: false, seed: s.seed });
  }
  for (let k = 0; k < SEG; k += 2) {
    const a = ((k + 0.5) / SEG) * Math.PI * 2;
    box(g, cx + Math.cos(a) * 0.685 * R - 0.08, haut(s, 0.46), cz + Math.sin(a) * 0.485 * R - 0.08, cx + Math.cos(a) * 0.685 * R + 0.08, haut(s, 0.46) + 0.03 * s.H, cz + Math.sin(a) * 0.485 * R + 0.08, { c: [1, 0.96, 0.85], m: MAT.LAMP, seed: s.seed });
  }
  // quatre grands mâts d'éclairage aux angles, qui dépassent le toit
  for (const [a, b] of [
    [-0.9, -0.75],
    [0.9, -0.75],
    [-0.9, 0.75],
    [0.9, 0.75],
  ] as const)
    matLumineux(g, px(s, a), pz(s, b), BASE, 0.85 * s.H, s.seed);
}

/** Marché couvert : halle de pierre et de fonte verte, nef haute à verrière, bas-côtés, entrée sous enseigne, quelques étals. */
export function marcheCouvert(s: Site) {
  const { g, R } = s;
  plateforme(s);
  const brique = hex("#a95f47"),
    fer = hex("#3f5a4c"),
    verriere = hex("#9fc4c0");
  // soubassement de brique, nef haute vitrée, toit à deux pans de verre, bas-côtés de zinc
  volume(s, zone(s, -0.95, -0.62, 0.95, 0.62), BASE, haut(s, 0.3), { c: brique, m: MAT.PLAIN, top: false });
  volume(s, zone(s, -0.95, -0.4, 0.95, 0.4), haut(s, 0.3), haut(s, 0.52), { c: hex("#cfe3e0"), m: MAT.GLASS, top: false });
  toit2pans(g, zone(s, -0.95, -0.4, 0.95, 0.4), haut(s, 0.52), haut(s, 0.78), true, verriere, MAT.DARKGLASS, fer, MAT.PLAIN, s.seed, 0.04 * R);
  for (const cote of [-1, 1]) {
    quad(g, [px(s, -0.97), haut(s, 0.3), pz(s, cote * 0.64)], [px(s, 0.97), haut(s, 0.3), pz(s, cote * 0.64)], [px(s, 0.97), haut(s, 0.36), pz(s, cote * 0.4)], [px(s, -0.97), haut(s, 0.36), pz(s, cote * 0.4)], hex("#8f9aa0"), MAT.PLAIN, [0, 1, cote], s.seed);
    // poteaux de fonte régulièrement espacés le long de chaque long côté
    for (let k = 0; k < 6; k++) box(g, px(s, -0.9 + k * 0.36) - 0.04 * R, BASE, pz(s, cote * 0.62) - 0.04 * R, px(s, -0.9 + k * 0.36) + 0.04 * R, haut(s, 0.3), pz(s, cote * 0.62) + 0.04 * R, { c: fer, m: MAT.PLAIN, top: false, seed: s.seed });
  }
  // grande entrée en bout de nef : ouverture sombre sous une enseigne
  volume(s, [px(s, 0.95), pz(s, -0.26), px(s, 0.95) + 0.03, pz(s, 0.26)], BASE, haut(s, 0.26), { c: hex("#3a2f2a"), m: MAT.PLAIN, top: false });
  volume(s, [px(s, 0.95), pz(s, -0.32), px(s, 0.95) + 0.04, pz(s, 0.32)], haut(s, 0.3), haut(s, 0.38), { c: COMMERCE_ENSEIGNE[0], m: MAT.PAINT, top: false });
  // trois étals sous auvent rayé, devant
  [-0.55, -0.1, 0.35].forEach((a, k) => {
    volume(s, zone(s, a, 0.74, a + 0.3, 0.92), BASE, haut(s, 0.1), { c: hex("#8a6a4a"), m: MAT.PLAIN });
    volume(s, zone(s, a - 0.02, 0.7, a + 0.32, 0.94), haut(s, 0.22), haut(s, 0.25), { c: COMMERCE_ENSEIGNE[(k + 1) % 4], m: MAT.PAINT });
  });
}

/** Zone logistique : deux hangars bardés à toit bas, quais de chargement sous auvent, camion et piles de conteneurs. */
export function zoneLogistique(s: Site) {
  const { g, R } = s;
  plateforme(s, hex("#bdbab3"));
  const bardage = hex("#b9c4cb"),
    toit = hex("#8f979d");
  const hangars: [number, number, number, number][] = [
    [-0.97, -0.95, -0.05, 0.1],
    [0.05, -0.95, 0.97, 0.1],
  ];
  hangars.forEach(([a0, b0, a1, b1], k) => {
    const hMur = k === 0 ? 0.5 : 0.6;
    const r = zone(s, a0, b0, a1, b1);
    volume(s, r, BASE, haut(s, hMur), { c: bardage, m: MAT.PLAIN, top: false });
    toit2pans(g, r, haut(s, hMur), haut(s, hMur + 0.12), true, toit, MAT.PLAIN, bardage, MAT.PLAIN, s.seed, 0.02 * R);
    // bandeau jaune sous l'égout
    volume(s, zone(s, a0 - 0.01, b0 - 0.01, a1 + 0.01, b1 + 0.01), haut(s, hMur - 0.1), haut(s, hMur - 0.05), { c: INDUSTRIE_ACCENT, m: MAT.PAINT, top: false });
  });
  // quais : plate-forme, portes sombres et auvent sur poteaux
  volume(s, zone(s, -1, 0.1, 1, 0.28), BASE, haut(s, 0.1), { c: COL.concrete, m: MAT.CONCRETE });
  for (const a of [-0.85, -0.55, 0.15, 0.45, 0.75]) volume(s, [px(s, a), pz(s, 0.1), px(s, a + 0.18), pz(s, 0.1) + 0.03], haut(s, 0.1), haut(s, 0.32), { c: hex("#2b3036"), m: MAT.PLAIN, top: false });
  volume(s, zone(s, -1, 0.12, 1, 0.4), haut(s, 0.36), haut(s, 0.39), { c: toit, m: MAT.PLAIN });
  for (const a of [-0.95, -0.3, 0.3, 0.95]) box(g, px(s, a) - 0.03, haut(s, 0.1), pz(s, 0.38) - 0.03, px(s, a) + 0.03, haut(s, 0.36), pz(s, 0.38) + 0.03, { c: COL.metal, m: MAT.PLAIN, top: false });
  // camion à quai : remorque blanche et cabine bleue
  volume(s, zone(s, -0.35, 0.44, 0.2, 0.62), BASE, haut(s, 0.2), { c: BLANC, m: MAT.PAINT });
  volume(s, zone(s, 0.2, 0.46, 0.38, 0.62), BASE, haut(s, 0.17), { c: hex("#2e5b9b"), m: MAT.PAINT });
  // conteneurs en piles de deux
  const couleurs = [hex("#b04a3f"), hex("#2e5b9b"), hex("#3e7a4e"), COL.container, hex("#d27b2a")];
  [
    [0.5, 0.66],
    [0.5, 0.84],
    [-0.1, 0.72],
    [-0.1, 0.84],
    [-0.7, 0.78],
  ].forEach(([a, b], k) => {
    volume(s, zone(s, a, b, a + 0.36, b + 0.12), BASE, haut(s, 0.09), { c: couleurs[k % couleurs.length], m: MAT.PAINT });
    if (k % 2 === 0) volume(s, zone(s, a, b, a + 0.36, b + 0.12), haut(s, 0.09), haut(s, 0.18), { c: couleurs[(k + 2) % couleurs.length], m: MAT.PAINT });
  });
}

/** Gare TGV : grande halle en voûte de verre sur nervures d'acier, quais et voies, rame blanche à nez effilé, bâtiment voyageurs et horloge. */
export function gareTgv(s: Site) {
  const { g, cx, R, H } = s;
  plateforme(s);
  const verre = hex("#b7d3e0"),
    acier = hex("#8f9ba3"),
    pierre = hex("#e0d6c0");
  const zc = pz(s, -0.1),
    a = 0.48 * R,
    b = 0.62 * H,
    x0 = px(s, -0.78),
    x1 = px(s, 0.78);
  // voies (ballast, rails), quai entre les deux voies
  volume(s, zone(s, -1, -0.56, 1, 0.34), BASE, BASE + 0.03, { c: hex("#6e6a64"), m: MAT.PLAIN });
  for (const [z0, z1] of [
    [-0.4, -0.2],
    [0.04, 0.24],
  ])
    for (const dz of [0.02, 0.17]) volume(s, zone(s, -1, z0 + dz, 1, z0 + dz + 0.025), BASE + 0.03, BASE + 0.07, { c: COL.metal, m: MAT.PLAIN });
  volume(s, zone(s, -0.9, -0.17, 0.9, 0.01), BASE + 0.03, BASE + 0.13, { c: COL.concrete, m: MAT.CONCRETE });
  volume(s, zone(s, -0.9, -0.17, 0.9, -0.15), BASE + 0.13, BASE + 0.135, { c: hex("#e3b236"), m: MAT.PAINT, top: true });
  // voûte de verre, nervures d'acier et pignons vitrés
  voute(g, x0, x1, zc, BASE, a, b, 14, verre, MAT.DARKGLASS, s.seed);
  for (let k = 0; k < 6; k++) {
    const xr = x0 + ((x1 - x0) * k) / 5;
    voute(g, xr - 0.03 * R, xr + 0.03 * R, zc, BASE, a * 1.015, b * 1.015, 14, acier, MAT.PLAIN, s.seed);
  }
  boutVoute(g, x0, zc, BASE, a, b, 14, verre, MAT.DARKGLASS, -1, s.seed);
  boutVoute(g, x1, zc, BASE, a, b, 14, verre, MAT.DARKGLASS, 1, s.seed);
  // rame : caisse blanche à bande bleue, vitres sombres, nez effilé vers +x
  const yc0 = BASE + 0.07,
    yc1 = yc0 + 0.2 * H,
    zA = pz(s, -0.37),
    zB = pz(s, -0.23),
    xN = px(s, 0.56);
  box(g, px(s, -0.95), yc0, zA, xN, yc1, zB, { c: hex("#eef0f2"), m: MAT.PAINT, seed: s.seed });
  box(g, px(s, -0.95), yc0 + 0.05 * H, zA - 0.01, xN, yc0 + 0.09 * H, zB + 0.01, { c: hex("#2f5f9e"), m: MAT.PAINT, top: false, seed: s.seed });
  box(g, px(s, -0.95), yc0 + 0.12 * H, zA - 0.01, xN, yc0 + 0.17 * H, zB + 0.01, { c: hex("#232b33"), m: MAT.DARKGLASS, top: false, seed: s.seed });
  const xP = px(s, 0.92),
    yP = yc0 + 0.08 * H;
  quad(g, [xN, yc1, zA], [xN, yc1, zB], [xP, yP + 0.03 * H, zB + 0.03 * R], [xP, yP + 0.03 * H, zA - 0.03 * R + 0.06 * R], hex("#eef0f2"), MAT.PAINT, [0.4, 1, 0], s.seed);
  tri(g, [xN, yc0, zA], [xN, yc1, zA], [xP, yP, (zA + zB) / 2], hex("#eef0f2"), MAT.PAINT, [0, 0, -1], s.seed);
  tri(g, [xN, yc0, zB], [xN, yc1, zB], [xP, yP, (zA + zB) / 2], hex("#eef0f2"), MAT.PAINT, [0, 0, 1], s.seed);
  // bâtiment voyageurs de pierre, tour d'horloge au centre
  volume(s, zone(s, -0.9, 0.5, 0.9, 0.95), BASE, haut(s, 0.4), { c: pierre, m: MAT.APART, ...TOIT_PLAT });
  volume(s, zone(s, -0.14, 0.56, 0.14, 0.84), haut(s, 0.4), haut(s, 0.7), { c: pierre, m: MAT.PLAIN });
  tronc(g, cx, haut(s, 0.7), pz(s, 0.7), 0.17 * R, 0, 0.14 * H, hex("#6f7a7d"), MAT.PLAIN, s.seed, 0.17 * R, 0);
  disque(g, cx, haut(s, 0.55), pz(s, 0.84) + 0.01, 0.08 * R, "+z", BLANC, MAT.PLAIN, 14);
  volume(s, zone(s, -0.35, 0.95, 0.35, 1.0), haut(s, 0.2), haut(s, 0.23), { c: hex("#9fc4d6"), m: MAT.DARKGLASS });
  marchesCarrees(g, cx, BASE, pz(s, 0.95), 0.3 * R, 0.04 * R, 1, 0.03 * H, pierre, 0, s.seed);
}

/** Aéroport : piste marquée, terminal à toit en voûte d'acier et de verre, tour de contrôle, avion sur l'aire de stationnement. */
export function aeroport(s: Site) {
  const { g, R, H } = s;
  plateforme(s, hex("#bab8b1"));
  const asphalte = hex("#3f4348"),
    beton = hex("#a9a8a2");
  // piste : bande d'asphalte, axe en pointillés, seuils à bandes, bords
  const [px0, pz0, px1, pz1] = zone(s, -1, 0.56, 1, 0.97);
  flat(g, px0, pz0, px1, pz1, BASE + 0.012, asphalte, MAT.PLAIN, s.seed);
  const yL = BASE + 0.012;
  const ligne = (r: [number, number, number, number]) => box(g, r[0], yL, r[1], r[2], yL + 0.012, r[3], { c: LIGNE, m: MAT.PAINT, seed: s.seed });
  for (let k = 0; k < 9; k++) ligne([px(s, -0.86 + k * 0.2), pz(s, 0.755), px(s, -0.86 + k * 0.2 + 0.1), pz(s, 0.775)]);
  ligne([px0, pz0 + 0.02, px1, pz0 + 0.04]);
  ligne([px0, pz1 - 0.04, px1, pz1 - 0.02]);
  for (const cote of [-1, 1]) for (let k = 0; k < 5; k++) ligne([cote > 0 ? px(s, 0.88) : px(s, -0.97), pz(s, 0.6 + k * 0.07), cote > 0 ? px(s, 0.97) : px(s, -0.88), pz(s, 0.62 + k * 0.07)]);
  // aire de stationnement
  const [ap0, aq0, ap1, aq1] = zone(s, -0.9, 0.1, 0.5, 0.54);
  flat(g, ap0, aq0, ap1, aq1, BASE + 0.008, beton, MAT.PLAIN, s.seed);
  // terminal : socle, façade vitrée, toit en voûte
  const yT = haut(s, 0.22);
  volume(s, zone(s, -0.9, -0.75, 0.55, 0), BASE, yT, { c: hex("#d8d6d0"), m: MAT.PLAIN, top: false });
  volume(s, zone(s, -0.88, -0.02, 0.53, 0.02), BASE, yT, { c: hex("#7d9fb8"), m: MAT.GLASS, top: false });
  const zt = pz(s, -0.375);
  voute(g, px(s, -0.9), px(s, 0.55), zt, yT, 0.375 * R, 0.22 * H, 12, hex("#cfd6dc"), MAT.PLAIN, s.seed);
  boutVoute(g, px(s, -0.9), zt, yT, 0.375 * R, 0.22 * H, 12, hex("#9fc4d6"), MAT.DARKGLASS, -1, s.seed);
  boutVoute(g, px(s, 0.55), zt, yT, 0.375 * R, 0.22 * H, 12, hex("#9fc4d6"), MAT.DARKGLASS, 1, s.seed);
  // tour de contrôle : fût, cabine vitrée évasée, toit, antenne et feu rouge
  const tx = px(s, 0.8),
    tz = pz(s, -0.5);
  cylinder(g, tx, BASE, tz, 0.07 * R, 0.66 * H, 12, hex("#e4e2dc"), MAT.PLAIN, null, null, 0.06 * R);
  cylinder(g, tx, haut(s, 0.66), tz, 0.12 * R, 0.12 * H, 14, hex("#33495c"), MAT.DARKGLASS, null, null, 0.17 * R);
  cylinder(g, tx, haut(s, 0.78), tz, 0.18 * R, 0.025 * H, 14, hex("#e4e2dc"), MAT.PLAIN, MAT.FLATROOF, COL.roofGray);
  box(g, tx - 0.015 * R, haut(s, 0.805), tz - 0.015 * R, tx + 0.015 * R, haut(s, 0.805) + 0.14 * H, tz + 0.015 * R, { c: COL.metal, m: MAT.PLAIN });
  box(g, tx - 0.03 * R, haut(s, 0.945), tz - 0.03 * R, tx + 0.03 * R, haut(s, 0.945) + 0.05 * R, tz + 0.03 * R, { c: COL.beacon, m: MAT.BEACON });
  // avion à l'arrêt sur l'aire : fuselage, nez, ailes en flèche, dérive et plans arrière (axe le long de x, nez vers +x)
  const ay = BASE + 0.015,
    az = pz(s, 0.32),
    ax0 = px(s, -0.62),
    ax1 = px(s, 0.12),
    fh = 0.07 * H,
    fw = 0.075 * R;
  box(g, ax0, ay, az - fw, ax1, ay + fh, az + fw, { c: hex("#f2f2ef"), m: MAT.PAINT, seed: s.seed });
  box(g, ax0, ay + fh * 0.35, az - fw - 0.01, ax1, ay + fh * 0.55, az + fw + 0.01, { c: hex("#2f5f9e"), m: MAT.PAINT, top: false, seed: s.seed });
  const axn = px(s, 0.28);
  tri(g, [ax1, ay, az - fw], [ax1, ay + fh, az - fw], [axn, ay + fh * 0.35, az], hex("#f2f2ef"), MAT.PAINT, [0, 0, -1], s.seed);
  tri(g, [ax1, ay, az + fw], [ax1, ay + fh, az + fw], [axn, ay + fh * 0.35, az], hex("#f2f2ef"), MAT.PAINT, [0, 0, 1], s.seed);
  tri(g, [ax1, ay + fh, az - fw], [ax1, ay + fh, az + fw], [axn, ay + fh * 0.35, az], hex("#f2f2ef"), MAT.PAINT, [0, 1, 0], s.seed);
  const xa = (ax0 + ax1) / 2;
  quad(g, [xa + 0.06 * R, ay + fh * 0.4, az - fw], [xa - 0.1 * R, ay + fh * 0.4, az - fw], [xa - 0.22 * R, ay + fh * 0.3, az - 0.42 * R], [xa - 0.1 * R, ay + fh * 0.3, az - 0.42 * R], hex("#d9dcdf"), MAT.PLAIN, [0, 1, 0], s.seed);
  quad(g, [xa + 0.06 * R, ay + fh * 0.4, az + fw], [xa - 0.1 * R, ay + fh * 0.4, az + fw], [xa - 0.22 * R, ay + fh * 0.3, az + 0.42 * R], [xa - 0.1 * R, ay + fh * 0.3, az + 0.42 * R], hex("#d9dcdf"), MAT.PLAIN, [0, 1, 0], s.seed);
  tri(g, [ax0, ay + fh, az], [ax0 + 0.14 * R, ay + fh, az], [ax0 - 0.02 * R, ay + fh * 2.2, az], hex("#2f5f9e"), MAT.PAINT, [0, 0, 1], s.seed);
  tri(g, [ax0, ay + fh, az], [ax0 + 0.14 * R, ay + fh, az], [ax0 - 0.02 * R, ay + fh * 2.2, az], hex("#2f5f9e"), MAT.PAINT, [0, 0, -1], s.seed);
  arbre(g, px(s, -0.78), pz(s, 0.42), 0.26 * H, hex("#5d9a3f"));
}
