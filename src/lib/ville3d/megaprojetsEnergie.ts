/**
 * Mégaprojets d'Énergie (docs/A-INTEGRER.md §44) : Centrale solaire, Parc éolien, Centrale,
 * Centrale nouvelle génération. Comme le demande la note, les trois premiers REPRENNENT les
 * modèles déjà dessinés pour les installations d'Énergie (energie.ts : fermes de panneaux,
 * éolienne, bâtiments de la centrale) à une autre échelle, au lieu d'en inventer de nouveaux —
 * c'est déjà la bonne silhouette. Ces modèles ont été dessinés pour le plein champ, bien plus
 * grands que la cour d'un bloc : on les réduit pour qu'ils y tiennent (`reutiliser()`). La
 * centrale « nouvelle génération » est une version enrichie, dessinée ici dans la même palette.
 */
import type { RNG } from "./aleatoire";
import { CENTRALE_ACCENT, CENTRALE_WALLS, COL, FUMEE, MAT, hex } from "./constantes";
import { box, cylinder, shadeC } from "./geometrie";
import { buildBatimentsCentrale, buildEolienne, buildPanneauSolaire } from "./energie";
import { ellipsoide } from "./monumentsFormes";
import { BASE, haut, panneauxSurToit, plateforme, px, pz, reutiliser, volume, zone, type Site } from "./megaprojetsFormes";

/** Générateur constant : fige les tirages d'un modèle (ici l'orientation d'une ferme solaire) pour poser des rangées parallèles. */
const FIXE: RNG = () => 0.25;
const GRAVIER = hex("#c9c3b3");

/** Clôture basse sur le pourtour d'un rectangle du site (même grillage que la centrale d'Énergie). */
function cloture(s: Site, a0: number, b0: number, a1: number, b1: number) {
  const [x0, z0, x1, z1] = zone(s, a0, b0, a1, b1);
  const e = 0.03,
    h = 0.12 * s.H;
  box(s.g, x0, BASE, z0 - e, x1, BASE + h, z0 + e, { c: COL.fence, m: MAT.FENCE, seed: s.seed });
  box(s.g, x0, BASE, z1 - e, x1, BASE + h, z1 + e, { c: COL.fence, m: MAT.FENCE, seed: s.seed });
  box(s.g, x0 - e, BASE, z0, x0 + e, BASE + h, z1, { c: COL.fence, m: MAT.FENCE, seed: s.seed });
  box(s.g, x1 - e, BASE, z0, x1 + e, BASE + h, z1, { c: COL.fence, m: MAT.FENCE, seed: s.seed });
}

/** Centrale solaire : trois rangées de la ferme de panneaux d'Énergie (panneaux inclinés sur pieds, onduleur en bout), poste de transformation, grillage. */
export function centraleSolaire(s: Site) {
  const { g, cx, cz, R } = s;
  plateforme(s, GRAVIER);
  // Une rangée d'Énergie (3 panneaux, FIXE → orientée le long de z) mesure ~12,4 m sur ~2 m ; trois rangées espacées de 3,6 m.
  const echelle = (0.92 * R) / 6.5;
  for (let k = -1; k <= 1; k++) reutiliser(g, cx + k * 3.6 * echelle - 0.1 * R, cz, echelle, () => buildPanneauSolaire(g, 0, 0, FIXE, [], s.seed + k));
  // poste de transformation et son transformateur, au bord de la cour
  volume(s, zone(s, 0.68, -0.4, 0.94, 0.0), BASE, haut(s, 0.2), { c: COL.concrete, m: MAT.CONCRETE, topM: MAT.FLATROOF, topC: COL.roofGray });
  box(g, px(s, 0.74), haut(s, 0.2), pz(s, -0.32), px(s, 0.88), haut(s, 0.3), pz(s, -0.1), { c: hex("#6f7f8c"), m: MAT.PLAIN, seed: s.seed });
  cloture(s, -0.97, -0.97, 0.97, 0.97);
}

/** Parc éolien : trois éoliennes d'Énergie (mât, bande rouge et blanche, nacelle, trois pales, balise) sur un socle de béton, local technique. */
export function parcEolien(s: Site) {
  const { g, R, H } = s;
  plateforme(s);
  // Une éolienne d'Énergie : 10 à 14 m de mât et pales de ~5,6 m, soit ~17,6 m au plus haut ; on la réduit pour qu'elle tienne en hauteur et en largeur.
  const echelle = Math.min((0.85 * H) / 17.6, (0.5 * R) / 5.6);
  [
    [-0.45, 0.4],
    [0.45, 0.05],
    [-0.05, -0.55],
  ].forEach(([a, b], k) => reutiliser(g, px(s, a), pz(s, b), echelle, () => buildEolienne(g, 0, 0, s.r, [], s.seed + 7 * k)));
  volume(s, zone(s, 0.55, 0.6, 0.85, 0.85), BASE, haut(s, 0.12), { c: COL.concrete, m: MAT.CONCRETE, topM: MAT.FLATROOF, topC: COL.roofGray });
}

/** Centrale : les bâtiments de la centrale d'Énergie (hall à bandeau jaune, deux réservoirs, poste de contrôle, grillage), sans ses pylônes. */
export function centrale(s: Site) {
  const { g, cx, cz, R } = s;
  plateforme(s);
  // Ces bâtiments occupent x ∈ [-13,6 ; 8], z ∈ [-8 ; 6,5] autour de leur origine : on les réduit et on recentre l'ensemble.
  const echelle = (0.92 * R) / 10.8;
  reutiliser(g, cx + 2.8 * echelle, cz + 0.75 * echelle, echelle, () => buildBatimentsCentrale(g, 0, 0, s.r, [], s.seed));
}

/**
 * Centrale nouvelle génération : version enrichie de la centrale d'Énergie, dans sa palette (murs
 * clairs, bandeau jaune) — enceinte à dôme, deux tours de refroidissement et leur vapeur, halle
 * des turbines à toit solaire, salle de contrôle vitrée, rangée de batteries de stockage.
 */
export function centraleNouvelleGeneration(s: Site) {
  const { g, R, H } = s;
  plateforme(s);
  const mur = CENTRALE_WALLS[0],
    mur2 = CENTRALE_WALLS[1];
  // enceinte du réacteur : tambour de béton clair, bandeau jaune, dôme
  const rx = px(s, -0.4),
    rz = pz(s, -0.4);
  cylinder(g, rx, BASE, rz, 0.34 * R, 0.36 * H, 20, mur, MAT.PLAIN, null, null);
  cylinder(g, rx, haut(s, 0.3), rz, 0.345 * R, 0.04 * H, 20, CENTRALE_ACCENT, MAT.PLAIN, null, null);
  ellipsoide(g, rx, haut(s, 0.36), rz, 0.34 * R, 0.2 * H, 0.34 * R, shadeC(mur, 1.02), MAT.PLAIN);
  // deux tours de refroidissement (profil resserré à mi-hauteur), panaches de vapeur
  for (const [a, b] of [
    [0.55, -0.5],
    [0.55, 0.0],
  ] as const) {
    const x = px(s, a),
      z = pz(s, b);
    cylinder(g, x, BASE, z, 0.27 * R, 0.3 * H, 18, mur2, MAT.PLAIN, null, null, 0.2 * R);
    cylinder(g, x, haut(s, 0.3), z, 0.2 * R, 0.3 * H, 18, mur2, MAT.PLAIN, null, null, 0.24 * R);
    cylinder(g, x, haut(s, 0.6), z, 0.24 * R, 0.04 * H, 18, shadeC(mur2, 0.9), MAT.PLAIN, MAT.PLAIN, shadeC(mur2, 0.9));
    ellipsoide(g, x, haut(s, 0.7), z, 0.2 * R, 0.1 * H, 0.2 * R, FUMEE, MAT.PLAIN);
    ellipsoide(g, x + 0.05 * R, haut(s, 0.82), z, 0.14 * R, 0.08 * H, 0.14 * R, shadeC(FUMEE, 1.03), MAT.PLAIN);
  }
  // halle des turbines : toit plat à panneaux solaires, bandeau jaune
  const halle = zone(s, -0.95, 0.15, 0.2, 0.8);
  volume(s, halle, BASE, haut(s, 0.3), { c: mur, m: MAT.CONCRETE, topM: MAT.FLATROOF, topC: COL.roofGray });
  volume(s, zone(s, -0.96, 0.14, 0.21, 0.81), haut(s, 0.25), haut(s, 0.29), { c: CENTRALE_ACCENT, m: MAT.PLAIN, top: false });
  panneauxSurToit(g, halle[0] + 0.15 * R, halle[1] + 0.1 * R, halle[2] - 0.15 * R, halle[3] - 0.1 * R, haut(s, 0.3), 3, s.seed);
  // salle de contrôle vitrée, rangée de batteries de stockage
  volume(s, zone(s, 0.35, 0.3, 0.8, 0.78), BASE, haut(s, 0.22), { c: hex("#7d9fb8"), m: MAT.GLASS, topM: MAT.FLATROOF, topC: COL.roofGray });
  for (let k = 0; k < 5; k++) volume(s, zone(s, -0.9 + k * 0.27, 0.88, -0.9 + k * 0.27 + 0.23, 0.98), BASE, haut(s, 0.1), { c: k % 2 ? COL.container : hex("#3e7a4e"), m: MAT.PAINT });
}
