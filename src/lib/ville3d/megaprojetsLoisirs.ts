/**
 * Mégaprojets de loisirs de grande taille : le Stade et le Parc d'attractions (qui a pris la place du Grand stade, retour
 * d'Adrien du 05/10/2026 : « le Grand stade ne sert à rien, il y a déjà le petit, on peut le remplacer par un parc
 * d'attraction »). Le Stade, lui, est redessiné « plus joli, plus futuriste, comme les stades actuels » : une façade en
 * résille (diagrid) de lames blanches autour d'un mur de verre, un toit ondulé qui porte des panneaux solaires, une douve
 * d'eau autour de l'arène, des lignes lumineuses et des pylônes à LED qui s'allument la nuit. Le Parc d'attractions a une
 * grande roue, des montagnes russes, un carrousel, des chaises volantes, une tour de chute et un chapiteau, tous
 * éclairés la nuit (ampoules de couleur en `MAT.BEACON`, qui brille de sa propre couleur).
 *
 * Deux sites de 2 × 2 blocs (136 m de plateforme, megaprojets.ts), dessinés en fractions de R et de H, détails aux vraies
 * cotes. Voir megaprojetsFormes.ts pour les briques communes.
 */
import { COL, MAT, PANNEAU_CELLULE, hex, type Couleur } from "./constantes";
import { box, cylinder } from "./geometrie";
import { panneauxPub, terrainFoot } from "./megaprojetsEquipements";
import {
  BASE,
  STADE_LONGUEUR_MAX,
  allee,
  anneauPente,
  anneauPenteVar,
  eclairerZone,
  murOvale,
  parking,
  pelouse,
  plateforme,
  px,
  pz,
  quad,
  rangeeArbres,
  type Site,
  type V3,
} from "./megaprojetsFormes";
import { ellipsoide, membre, tore } from "./monumentsFormes";

const BLANC = hex("#f2f4f6");
const ARGENT = hex("#c9d0d6");
const BLEU = hex("#2d6bd1");
const VERRE = hex("#2c4258");
/** Verre de façade qui brille la nuit d'un bleu profond (`MAT.BEACON` : il s'éclaire de sa propre couleur). */
const VERRE_LUMINEUX = hex("#0b2a44");
const CYAN = hex("#3aa8d8");
const EAU = hex("#5aa9d6");

/** Point d'un site : (x, y, z) relatifs à son centre. */
const pt = (s: Site, x: number, y: number, z: number): V3 => [s.cx + x, y, s.cz + z];

// --------------------------------------------------------------------------------------------------------------------
// Stade futuriste
// --------------------------------------------------------------------------------------------------------------------

/**
 * Dimensions de l'arène du Stade, en mètres : fonction pure du site (la même pour le dessin et pour les tests). Règle de
 * proportion (megaprojetsFormes.ts, 3ᵉ consigne du 05/10/2026) : l'arène et son toit font au plus `STADE_LONGUEUR_MAX` (1,5 bloc) de
 * long ; le grand axe suit celui du site, le petit axe lui laisse sa marge.
 */
export function dimensionsStade(R: number, Rz: number) {
  /** Le toit et ses colonnes débordent de l'arène de 12 %. */
  const DEBORD = 1.12;
  const A = Math.min(STADE_LONGUEUR_MAX / 2 / DEBORD, 0.64 * R);
  const B = Math.min(0.78 * Rz, A / 1.8);
  return { A, B, longueur: 2 * A * DEBORD, largeur: 2 * B * DEBORD };
}

/**
 * Stade : façade en résille de lames blanches autour d'un mur de verre, toit ondulé à panneaux solaires, deux niveaux de
 * gradins argent et bleus, douve d'eau et ponts, ligne de LED autour de la façade, colonnes en V, pylônes à LED, pavillons
 * d'entrée en verre. Retour d'Adrien du 05/10/2026 (3ᵉ consigne : « le Stade est trop grand ») : il tient dans 2 × 1 blocs (136 × 56 m
 * de plateforme), son arène fait 1,5 bloc de long au plus (≈ 96 m) et 25 m de haut — la hauteur d'un grand immeuble, à
 * moitié de celle de la plus petite tour (megaprojetsFormes.ts) ; le reste du site est son parvis : un parking à un bout, une
 * esplanade plantée à l'autre. Pelouse de 36 × 22 m.
 */
export function stade(s: Site) {
  const { g, cx, cz, R, Rz, H } = s;
  plateforme(s, hex("#dfe3e6"));
  const SEG = 64;
  const { A, B } = dimensionsStade(R, Rz);
  // L'arène est décalée vers le bout ouest : le parking occupe le bout est, plus long.
  const bx = cx - 8;
  const hF = 0.5 * H;
  const sin2 = (a: number) => Math.sin(a) ** 2;

  // Douve : un anneau d'eau autour de la façade, deux ponts dallés aux bouts, des bornes lumineuses sur sa rive.
  anneauPente(g, bx, cz, A * 1.03, B * 1.03, BASE + 0.03, A * 1.1, B * 1.12, BASE + 0.03, SEG, EAU, MAT.WATER, s.seed);
  for (const sg of [-1, 1]) allee(g, [bx + sg * A * 1.065 - 2.2, cz - 4, bx + sg * A * 1.065 + 2.2, cz + 4], s.seed, hex("#eef0f2"));
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * Math.PI * 2;
    const x = bx + Math.cos(a) * A * 1.115,
      z = cz + Math.sin(a) * B * 1.135;
    box(g, x - 0.18, BASE, z - 0.18, x + 0.18, BASE + 0.6, z + 0.18, { c: CYAN, m: MAT.BEACON, seed: s.seed });
    s.glow?.push({ x: bx + Math.cos(a) * A * 1.2, z: cz + Math.sin(a) * B * 1.22 });
  }

  // Façade : un mur de verre sombre, la résille de lames blanches (deux familles qui se croisent), des anneaux, une ligne de LED.
  murOvale(g, bx, cz, A * 0.985, B * 0.985, BASE, BASE + hF, SEG, VERRE_LUMINEUX, MAT.BEACON, true, s.seed);
  const N = 30;
  for (let k = 0; k < N; k++) {
    const a0 = (k / N) * Math.PI * 2;
    for (const sg of [-1, 1]) {
      const a1 = a0 + sg * ((3 / N) * Math.PI * 2);
      membre(g, [bx + Math.cos(a0) * A, BASE, cz + Math.sin(a0) * B], [bx + Math.cos(a1) * A * 0.985, BASE + hF, cz + Math.sin(a1) * B * 0.985], 0.26, 0.26, BLANC, MAT.PLAIN, { seg: 5, seed: s.seed });
    }
  }
  for (const f of [0.02, 0.34, 0.68, 1]) murOvale(g, bx, cz, A + 0.2, B + 0.2, BASE + hF * f - 0.25, BASE + hF * f + 0.25, SEG, BLANC, MAT.PLAIN, true, s.seed);
  murOvale(g, bx, cz, A + 0.3, B + 0.3, BASE + hF * 0.5 - 0.4, BASE + hF * 0.5 + 0.4, SEG, CYAN, MAT.BEACON, true, s.seed);

  // Gradins : deux niveaux argent et bleus séparés par un déambulatoire vitré.
  const rxI = 0.7 * A,
    rzI = 0.64 * B;
  const yH = BASE + 0.78 * hF;
  const yM = BASE + 0.8 + (yH - BASE - 0.8) * 0.5;
  const place = (i: number) => (i % 6 === 0 ? hex("#3a4150") : Math.floor(i / 6) % 2 ? BLEU : ARGENT);
  anneauPente(g, bx, cz, rxI, rzI, BASE + 0.8, 0.86 * A, 0.84 * B, yM, SEG, place, MAT.PLAIN, s.seed);
  murOvale(g, bx, cz, 0.86 * A, 0.84 * B, yM, yM + 1.6, SEG, VERRE, MAT.DARKGLASS, false, s.seed);
  anneauPente(g, bx, cz, 0.86 * A, 0.84 * B, yM + 1.6, 0.96 * A, 0.96 * B, yH, SEG, place, MAT.PLAIN, s.seed);
  murOvale(g, bx, cz, rxI, rzI, BASE, BASE + 0.8, SEG, BLANC, MAT.PLAIN, false, s.seed);
  const dx = 0.6 * rxI,
    dz = 0.78 * rzI;
  terrainFoot(s, bx, cz, dx, dz);
  panneauxPub(s, bx, cz, dx, dz);
  // La pelouse est éclairée la nuit (projecteurs du toit) ; deux liserés de LED soulignent les gradins.
  eclairerZone(s, [bx - dx - 3, cz - dz - 3, bx + dx + 3, cz + dz + 3], 5);
  murOvale(g, bx, cz, rxI + 0.1, rzI + 0.1, BASE + 0.8, BASE + 1.2, SEG, CYAN, MAT.BEACON, false, s.seed);
  murOvale(g, bx, cz, 0.96 * A, 0.96 * B, yH - 0.4, yH, SEG, CYAN, MAT.BEACON, false, s.seed);

  // Toit ondulé : plus haut au milieu des grands côtés qu'aux bouts, avec ses panneaux solaires et son liseré de LED.
  const yO = (a: number) => BASE + hF + 0.1 * H + 0.3 * H * sin2(a);
  const yI = (a: number) => BASE + hF - 0.04 * H + 0.1 * H * sin2(a);
  anneauPenteVar(g, bx, cz, 0.78 * A, 0.72 * B, yI, 1.1 * A, 1.1 * B, yO, SEG, BLANC, MAT.PLAIN, s.seed);
  anneauPenteVar(g, bx, cz, 0.86 * A, 0.8 * B, (a) => yI(a) + 0.5, 1.04 * A, 1.04 * B, (a) => yO(a) - 0.5, SEG, (i) => (i % 3 === 0 ? BLANC : PANNEAU_CELLULE), MAT.PLAIN, s.seed);
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * Math.PI * 2,
      a1 = ((i + 1) / SEG) * Math.PI * 2;
    const p = (a: number, y: number): V3 => [bx + Math.cos(a) * A * 1.1, y, cz + Math.sin(a) * B * 1.1];
    quad(g, p(a0, yO(a0)), p(a1, yO(a1)), p(a1, yO(a1) + 0.8), p(a0, yO(a0) + 0.8), CYAN, MAT.BEACON, [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)], s.seed);
  }
  for (let k = 0; k < SEG; k += 2) {
    const a = ((k + 0.5) / SEG) * Math.PI * 2;
    const x = bx + Math.cos(a) * 0.8 * A,
      z = cz + Math.sin(a) * 0.74 * B;
    box(g, x - 0.5, yI(a) - 0.6, z - 0.5, x + 0.5, yI(a) - 0.4, z + 0.5, { c: [1, 0.96, 0.85], m: MAT.LAMP, seed: s.seed });
  }
  // Colonnes en V qui portent le toit : un pied au sol, deux bras vers le liseré.
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2;
    const pied: V3 = [bx + Math.cos(a) * A * 1.12, BASE, cz + Math.sin(a) * B * 1.14];
    for (const d of [-0.06, 0.06]) {
      const b = a + d;
      membre(g, pied, [bx + Math.cos(b) * A * 1.1, yO(b) - 0.4, cz + Math.sin(b) * B * 1.1], 0.4, 0.28, BLANC, MAT.PLAIN, { seg: 6, seed: s.seed });
    }
  }
  // Quatre pylônes à LED aux angles du site : un mât blanc, un anneau et une couronne de lumière cyan, sous la hauteur du toit.
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    const x = px(s, sx * 0.93),
      z = pz(s, sz * 0.86);
    box(g, x - 0.3, BASE, z - 0.3, x + 0.3, BASE + 0.8 * H, z + 0.3, { c: BLANC, m: MAT.PLAIN, seed: s.seed });
    tore(g, [x, BASE + 0.78 * H, z], 2.2, 0.2, [0, 1, 0], CYAN, MAT.BEACON, { seg: 16, segTube: 4, seed: s.seed });
    tore(g, [x, BASE + 0.6 * H, z], 1.6, 0.16, [0, 1, 0], CYAN, MAT.BEACON, { seg: 14, segTube: 4, seed: s.seed });
    box(g, x - 1, BASE + 0.8 * H, z - 1, x + 1, BASE + 0.8 * H + 0.7, z + 1, { c: [1, 0.96, 0.85], m: MAT.LAMP, seed: s.seed });
  }
  // Parvis. À l'ouest : une esplanade plantée et un banc ; à l'est : le parking, devant le pavillon d'entrée.
  const pavillon = (x: number, z: number, aX: number, aZ: number) => {
    box(g, x - aX, BASE, z - aZ, x + aX, BASE + 4.2, z + aZ, { c: VERRE, m: MAT.DARKGLASS, seed: s.seed });
    box(g, x - aX - 0.4, BASE + 4.2, z - aZ - 0.4, x + aX + 0.4, BASE + 4.7, z + aZ + 0.4, { c: BLANC, m: MAT.PLAIN, seed: s.seed });
    box(g, x - aX * 0.7, BASE + 4.7, z - aZ * 0.7, x + aX * 0.7, BASE + 5.1, z + aZ * 0.7, { c: CYAN, m: MAT.BEACON, seed: s.seed });
  };
  pavillon(bx + A * 1.12 + 4.5, cz, 2, 4.5);
  pavillon(bx - A * 1.12 - 4, cz, 2, 4.5);
  const parc: [number, number, number, number] = [bx + A * 1.12 + 9, cz - Rz + 3, cx + R - 1.5, cz + Rz - 3];
  parking(s, parc, false, 0.75);
  eclairerZone(s, parc, 8);
  allee(g, [cx - R + 1.5, cz - 5, bx - A * 1.12 - 6, cz + 5], s.seed, hex("#eef0f2"));
  rangeeArbres(s, pz(s, -0.8), pz(s, 0.8), px(s, -0.9), false, 11, 1);
  rangeeArbres(s, pz(s, -0.8), pz(s, 0.8), px(s, -0.78), false, 11, 0.9);
}
