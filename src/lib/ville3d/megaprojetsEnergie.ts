/**
 * Mégaprojets d'Énergie (docs/A-INTEGRER.md §44) : Centrale solaire, Parc éolien, Centrale,
 * Centrale nouvelle génération. Comme le demande la note, les trois premiers REPRENNENT les
 * modèles déjà dessinés pour les installations d'Énergie (energie.ts : fermes de panneaux,
 * éolienne, bâtiments de la centrale) au lieu d'en inventer de nouveaux. Avec la taille réelle du
 * §45 la cour est assez grande pour les poser presque à leur échelle d'origine (une ferme de
 * panneaux n'est plus réduite à trois panneaux : c'est un champ). La centrale « nouvelle
 * génération » est une version enrichie, dessinée ici dans la même palette.
 *
 * Retour d'Adrien du 05/10/2026 (« très peu développés ») : champs, routes d'accès, postes de
 * transformation, clôtures, bâtiments de contrôle, panaches de vapeur.
 */
import type { RNG } from "./aleatoire";
import { CENTRALE_ACCENT, CENTRALE_WALLS, COL, FUMEE, MAT, hex } from "./constantes";
import { box, cylinder, flat, shadeC } from "./geometrie";
import { buildBatimentsCentrale, buildEolienne, buildPanneauSolaire } from "./energie";
import { ellipsoide } from "./monumentsFormes";
import {
  BASE,
  ETAGE,
  acrotere,
  allee,
  haut,
  panneauxSurToit,
  parking,
  pelouse,
  plateforme,
  px,
  pz,
  quad,
  rangeeArbres,
  reutiliser,
  volume,
  zone,
  type Site,
} from "./megaprojetsFormes";

/** Générateur constant : fige les tirages d'un modèle (ici l'orientation d'une ferme solaire) pour poser des rangées parallèles. */
const FIXE: RNG = () => 0.25;
const GRAVIER = hex("#c9c3b3");
const ROUTE = hex("#55585d");

/** Clôture de grillage sur le pourtour d'un rectangle du site (même grillage que la centrale d'Énergie). */
function cloture(s: Site, a0: number, b0: number, a1: number, b1: number, h = 2.2) {
  const [x0, z0, x1, z1] = zone(s, a0, b0, a1, b1);
  const e = 0.06;
  box(s.g, x0, BASE, z0 - e, x1, BASE + h, z0 + e, { c: COL.fence, m: MAT.FENCE, seed: s.seed });
  box(s.g, x0, BASE, z1 - e, x1, BASE + h, z1 + e, { c: COL.fence, m: MAT.FENCE, seed: s.seed });
  box(s.g, x0 - e, BASE, z0, x0 + e, BASE + h, z1, { c: COL.fence, m: MAT.FENCE, seed: s.seed });
  box(s.g, x1 - e, BASE, z0, x1 + e, BASE + h, z1, { c: COL.fence, m: MAT.FENCE, seed: s.seed });
}

/** Route d'accès d'axe (x0, z0) → (x1, z1) et de largeur `w`, posée sur la plateforme (à peine au-dessus du dallage). */
function route(s: Site, x0: number, z0: number, x1: number, z1: number, w: number) {
  const dx = x1 - x0,
    dz = z1 - z0,
    l = Math.hypot(dx, dz) || 1;
  const nx = (-dz / l) * (w / 2),
    nz = (dx / l) * (w / 2);
  const y = BASE + 0.015;
  quad(s.g, [x0 + nx, y, z0 + nz], [x1 + nx, y, z1 + nz], [x1 - nx, y, z1 - nz], [x0 - nx, y, z0 - nz], ROUTE, MAT.PLAIN, [0, 1, 0], s.seed);
}

/** Poste de transformation : bâtiment de béton, trois transformateurs sur socle, portique de ligne, clôture. */
function poste(s: Site, a0: number, b0: number, a1: number, b1: number) {
  const { g } = s;
  const r = zone(s, a0, b0, a1, b1);
  volume(s, [r[0], r[1], r[0] + (r[2] - r[0]) * 0.34, r[3]], BASE, BASE + 3.8, { c: COL.concrete, m: MAT.CONCRETE, topM: MAT.FLATROOF, topC: COL.roofGray });
  for (let k = 0; k < 3; k++) {
    const x = r[0] + (r[2] - r[0]) * (0.45 + k * 0.18),
      z = (r[1] + r[3]) / 2;
    box(g, x - 1.1, BASE, z - 1.3, x + 1.1, BASE + 0.35, z + 1.3, { c: COL.concrete, m: MAT.CONCRETE, seed: s.seed });
    box(g, x - 0.9, BASE + 0.35, z - 1.1, x + 0.9, BASE + 2.8, z + 1.1, { c: hex("#6f7f8c"), m: MAT.PLAIN, seed: s.seed });
    for (const d of [-0.5, 0, 0.5]) box(g, x + d - 0.08, BASE + 2.8, z - 0.08, x + d + 0.08, BASE + 3.6, z + 0.08, { c: hex("#cfd3d6"), m: MAT.PLAIN, seed: s.seed });
  }
  // portique de raccordement : deux pylônes et une traverse
  const xp = r[2] - 1,
    z0 = r[1] + 1.5,
    z1 = r[3] - 1.5;
  for (const z of [z0, z1]) box(g, xp - 0.15, BASE, z - 0.15, xp + 0.15, BASE + 7, z + 0.15, { c: COL.metal, m: MAT.LATTICE, seed: s.seed });
  box(g, xp - 0.12, BASE + 6.6, z0, xp + 0.12, BASE + 7, z1, { c: COL.metal, m: MAT.LATTICE, seed: s.seed });
  cloture(s, a0, b0, a1, b1, 2.4);
}

/** Centrale solaire : un champ de rangées de la ferme de panneaux d'Énergie (panneaux inclinés sur pieds, onduleur en bout), piste d'entretien, poste de transformation, bâtiment de contrôle, clôture. */
export function centraleSolaire(s: Site) {
  const { g, cx, cz, R } = s;
  plateforme(s, GRAVIER);
  // Une rangée d'Énergie (3 panneaux, FIXE → orientée le long de z) mesure ~12,4 m sur ~2 m : des rangées espacées de 3,6 m, en deux colonnes.
  const nx = Math.max(3, Math.floor((1.3 * R) / 3.6)),
    nz = Math.max(1, Math.floor((1.9 * R) / 13.5));
  const x0 = px(s, -0.92);
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const x = x0 + i * 3.6 + 1,
        z = cz + (j - (nz - 1) / 2) * 13.6;
      reutiliser(g, x, z, 1, () => buildPanneauSolaire(g, 0, 0, FIXE, [], s.seed + i * 7 + j));
    }
  // piste d'entretien entre les colonnes et le long du champ, poste, bâtiment de contrôle à toit solaire, clôture
  route(s, x0 - 1, cz, px(s, 0.52), cz, 3.2);
  route(s, px(s, 0.52), pz(s, -0.9), px(s, 0.52), pz(s, 0.9), 3.2);
  poste(s, 0.6, -0.55, 0.96, -0.05);
  const bur = zone(s, 0.6, 0.12, 0.92, 0.5);
  volume(s, bur, BASE, BASE + 2 * ETAGE, { c: hex("#ebe8e0"), m: MAT.APART, topM: MAT.FLATROOF, topC: COL.roofGray });
  acrotere(g, bur, BASE + 2 * ETAGE, hex("#cfd3d6"), 0.5, 0.25, s.seed);
  panneauxSurToit(g, bur[0] + 1, bur[1] + 1, bur[2] - 1, bur[3] - 1, BASE + 2 * ETAGE + 0.5, 3, s.seed);
  parking(s, zone(s, 0.56, 0.6, 0.96, 0.95), true, 0.5);
  cloture(s, -0.97, -0.97, 0.53, 0.97);
  rangeeArbres(s, px(s, 0.6), px(s, 0.96), pz(s, 0.99), true, 8);
}

/** Parc éolien : trois éoliennes d'Énergie (mât, bande rouge et blanche, nacelle, trois pales, balise) sur leurs plates-formes, piste d'accès, poste de livraison, bâtiment de contrôle. */
export function parcEolien(s: Site) {
  const { g, R, H } = s;
  plateforme(s, hex("#cdc7b8"));
  pelouse(g, zone(s, -1, -1, 1, 1), s.seed, hex("#8aae5c"));
  // Une éolienne d'Énergie : 10 à 14 m de mât et pales de ~5,6 m, soit ~17,6 m au plus haut ; on la réduit juste ce qu'il faut pour qu'elle tienne.
  const echelle = Math.min((0.85 * H) / 17.6, (0.5 * R) / 5.6);
  const pos: [number, number][] = [
    [-0.5, 0.4],
    [0.45, 0.05],
    [-0.05, -0.55],
  ];
  // pistes d'accès (gravier) du poste de livraison à chaque éolienne, plates-formes de levage
  const poste0: [number, number] = [px(s, 0.62), pz(s, 0.7)];
  for (const [a, b] of pos) route(s, poste0[0], poste0[1], px(s, a), pz(s, b), 3.4);
  route(s, px(s, -1), poste0[1], poste0[0], poste0[1], 3.4);
  for (const [a, b] of pos) cylinder(g, px(s, a), BASE + 0.01, pz(s, b), 4.2 * echelle + 1.5, 0.04, 20, hex("#bdb6a3"), MAT.PLAIN, MAT.PLAIN, hex("#bdb6a3"));
  pos.forEach(([a, b], k) => reutiliser(g, px(s, a), pz(s, b), echelle, () => buildEolienne(g, 0, 0, s.r, [], s.seed + 7 * k)));
  // poste de livraison et bâtiment de contrôle
  poste(s, 0.5, 0.45, 0.94, 0.78);
  const bur = zone(s, 0.55, 0.84, 0.9, 0.98);
  volume(s, bur, BASE, BASE + 3.2, { c: hex("#ebe8e0"), m: MAT.APART, topM: MAT.FLATROOF, topC: COL.roofGray });
  rangeeArbres(s, px(s, -0.95), px(s, -0.2), pz(s, 0.95), true, 8);
  rangeeArbres(s, px(s, -0.95), px(s, -0.6), pz(s, -0.95), true, 8);
}

/** Centrale : les bâtiments de la centrale d'Énergie (hall à bandeau jaune, deux réservoirs, poste de contrôle, grillage), sans ses pylônes, panaches de vapeur, parking. */
export function centrale(s: Site) {
  const { g, cx, cz, R } = s;
  plateforme(s, hex("#cdc7b8"));
  // Ces bâtiments occupent x ∈ [-13,6 ; 8], z ∈ [-8 ; 6,5] autour de leur origine : on les réduit et on recentre l'ensemble.
  const echelle = (0.92 * R) / 10.8;
  const ox = cx + 2.8 * echelle,
    oz = cz + 0.75 * echelle;
  reutiliser(g, ox, oz, echelle, () => buildBatimentsCentrale(g, 0, 0, s.r, [], s.seed));
  // panaches de vapeur au-dessus des deux réservoirs (positions du modèle : x = 4,3 et 1,1 ; sommets à 12,6 m et 8,5 m)
  ellipsoide(g, ox + 4.3 * echelle, BASE + 15 * echelle, oz, 2.4 * echelle, 1.6 * echelle, 2.4 * echelle, FUMEE, MAT.PLAIN);
  ellipsoide(g, ox + 4.8 * echelle, BASE + 18 * echelle, oz, 1.9 * echelle, 1.4 * echelle, 1.9 * echelle, shadeC(FUMEE, 1.03), MAT.PLAIN);
  ellipsoide(g, ox + 1.1 * echelle, BASE + 11 * echelle, oz - 9.9 * echelle, 1.8 * echelle, 1.2 * echelle, 1.8 * echelle, FUMEE, MAT.PLAIN);
  // piste d'accès et parking visiteurs devant la clôture
  route(s, px(s, -0.9), pz(s, 0.9), px(s, 0.9), pz(s, 0.9), 4);
  parking(s, zone(s, -0.6, 0.62, 0.5, 0.85), true, 0.55);
  rangeeArbres(s, px(s, -0.95), px(s, 0.95), pz(s, 0.97), true, 8);
  rangeeArbres(s, px(s, -0.95), px(s, 0.95), pz(s, -0.97), true, 8);
}

/**
 * Centrale nouvelle génération : version enrichie de la centrale d'Énergie, dans sa palette (murs
 * clairs, bandeau jaune) — enceinte à dôme, deux tours de refroidissement et leurs panaches, halle
 * des turbines à toit solaire, salle de contrôle vitrée, rangée de batteries de stockage, poste de
 * transformation, route d'accès et clôture.
 */
export function centraleNouvelleGeneration(s: Site) {
  const { g, R, H } = s;
  plateforme(s, hex("#cdc7b8"));
  const mur = CENTRALE_WALLS[0],
    mur2 = CENTRALE_WALLS[1];
  pelouse(g, zone(s, -1, -1, 1, -0.9), s.seed);
  // enceinte du réacteur : tambour de béton clair, bandeau jaune, dôme et sa lanterne
  const rx = px(s, -0.45),
    rz = pz(s, -0.45),
    hT = Math.min(0.2 * H, 0.45 * R);
  cylinder(g, rx, BASE, rz, 0.27 * R, hT, 28, mur, MAT.PLAIN, null, null);
  cylinder(g, rx, BASE + hT * 0.82, rz, 0.275 * R, 0.8, 28, CENTRALE_ACCENT, MAT.PLAIN, null, null);
  ellipsoide(g, rx, BASE + hT, rz, 0.27 * R, 0.17 * R, 0.27 * R, shadeC(mur, 1.02), MAT.PLAIN);
  // deux tours de refroidissement (profil resserré à mi-hauteur) et leurs panaches
  const hTour = Math.min(0.42 * H, 0.9 * R);
  for (const [a, b] of [
    [0.52, -0.5],
    [0.52, 0.0],
  ] as const) {
    const x = px(s, a),
      z = pz(s, b);
    cylinder(g, x, BASE, z, 0.23 * R, hTour * 0.45, 22, mur2, MAT.PLAIN, null, null, 0.17 * R);
    cylinder(g, x, BASE + hTour * 0.45, z, 0.17 * R, hTour * 0.45, 22, mur2, MAT.PLAIN, null, null, 0.2 * R);
    cylinder(g, x, BASE + hTour * 0.9, z, 0.2 * R, hTour * 0.1, 22, shadeC(mur2, 0.9), MAT.PLAIN, MAT.PLAIN, shadeC(mur2, 0.9));
    ellipsoide(g, x, BASE + hTour + 0.12 * R, z, 0.2 * R, 0.1 * R, 0.2 * R, FUMEE, MAT.PLAIN);
    ellipsoide(g, x + 0.05 * R, BASE + hTour + 0.3 * R, z, 0.15 * R, 0.09 * R, 0.15 * R, shadeC(FUMEE, 1.03), MAT.PLAIN);
  }
  // halle des turbines : toit plat à panneaux solaires, bandeau jaune
  const halle = zone(s, -0.95, 0.05, 0.1, 0.7);
  const hH = Math.min(0.26 * H, 14);
  volume(s, halle, BASE, BASE + hH, { c: mur, m: MAT.CONCRETE, topM: MAT.FLATROOF, topC: COL.roofGray });
  volume(s, zone(s, -0.96, 0.04, 0.11, 0.71), BASE + hH * 0.82, BASE + hH * 0.9, { c: CENTRALE_ACCENT, m: MAT.PLAIN, top: false });
  panneauxSurToit(g, halle[0] + 2, halle[1] + 2, halle[2] - 2, halle[3] - 2, BASE + hH, 5, s.seed);
  // salle de contrôle vitrée, poste de transformation
  volume(s, zone(s, 0.3, 0.2, 0.82, 0.68), BASE, BASE + 2 * ETAGE, { c: hex("#7d9fb8"), m: MAT.GLASS, topM: MAT.FLATROOF, topC: COL.roofGray });
  poste(s, 0.35, -0.98, 0.9, -0.78);
  // rangée de batteries de stockage, route d'accès, clôture, arbres
  for (let k = 0; k < 7; k++) volume(s, zone(s, -0.9 + k * 0.2, 0.8, -0.9 + k * 0.2 + 0.16, 0.95), BASE, BASE + 2.8, { c: k % 2 ? COL.container : hex("#3e7a4e"), m: MAT.PAINT });
  route(s, px(s, -1), pz(s, 0.74), px(s, 1), pz(s, 0.74), 4);
  cloture(s, -0.99, -0.8, 0.99, 0.99, 2.4);
  rangeeArbres(s, px(s, -0.95), px(s, 0.95), pz(s, -0.97), true, 8);
  allee(g, zone(s, 0.3, 0.7, 0.82, 0.78), s.seed);
  void flat;
}
