import { describe, expect, it } from "vitest";
import { rngFrom } from "@/lib/ville3d/aleatoire";
import { BS, FLOOR_H, MAT } from "@/lib/ville3d/constantes";
import { Geo } from "@/lib/ville3d/geometrie";
import { buildMegaprojet, tailleMegaprojet } from "@/lib/ville3d/megaprojets";
import { BASE, HAUTEUR_TOUR_MIN, STADE_HAUTEUR_MAX, STADE_LONGUEUR_MAX } from "@/lib/ville3d/megaprojetsFormes";
import { dimensionsStade } from "@/lib/ville3d/megaprojetsLoisirs";

/**
 * 3ᵉ consigne du 05/10/2026 (retour d'Adrien du 05/10/2026) : « le Stade est trop grand ». La règle de proportion est écrite dans le
 * code (megaprojetsFormes.ts) : un stade a une arène de 1 à 1,5 bloc de long, toit compris, sur un site de 2 × 1 blocs au
 * plus ; sa hauteur reste sous celle des tours voisines (la moitié de la plus petite tour qu'une ville puisse bâtir) ; le
 * Parc d'attractions, le plus grand des deux sites, tient dans 2 × 2 blocs et reste sous cette même tour.
 */
function construire(type: string, stade: number) {
  const g = new Geo();
  const r = rngFrom("proportions|" + type);
  buildMegaprojet(g, 0, 0, type, stade, r, [], Math.floor(r() * 900) + 50);
  return g;
}

describe("la règle de proportion des stades (3ᵉ consigne)", () => {
  it("les constantes de la règle : 1,5 bloc de long, la moitié de la plus petite tour (14 étages de 3,6 m) de haut", () => {
    expect(STADE_LONGUEUR_MAX).toBe(1.5 * BS);
    expect(HAUTEUR_TOUR_MIN).toBeCloseTo(14 * FLOOR_H, 9);
    expect(STADE_HAUTEUR_MAX).toBeCloseTo(HAUTEUR_TOUR_MIN / 2, 9);
    // Un grand immeuble de la ville a 7 étages d'environ 3 m : le Stade ne le dépasse que de peu.
    expect(STADE_HAUTEUR_MAX).toBeGreaterThan(7 * 3);
    expect(STADE_HAUTEUR_MAX).toBeLessThan(HAUTEUR_TOUR_MIN);
  });

  it("l'arène fait de 1 à 1,5 bloc de long, toit compris, et tient dans la largeur du site", () => {
    const { R, Rz } = tailleMegaprojet("stade", 1);
    const d = dimensionsStade(R, Rz);
    expect(d.longueur).toBeLessThanOrEqual(STADE_LONGUEUR_MAX + 1e-9);
    expect(d.longueur).toBeGreaterThanOrEqual(BS); // au moins un bloc
    expect(d.largeur).toBeLessThan(2 * Rz);
    expect(d.longueur).toBeGreaterThan(d.largeur); // plus long que large, comme un stade
    // Un site plus grand (ou plus petit) ne change pas la règle : jamais plus de 1,5 bloc.
    for (const [R2, Rz2] of [[68, 68], [68, 28], [120, 28], [200, 100]] as const) expect(dimensionsStade(R2, Rz2).longueur).toBeLessThanOrEqual(STADE_LONGUEUR_MAX + 1e-9);
  });

  it("dans la scène : l'eau de la douve, qui borde l'arène, ne dépasse pas 1,5 bloc de long, et rien du Stade ne dépasse la hauteur permise", () => {
    const g = construire("stade", 1);
    let x0 = Infinity,
      x1 = -Infinity,
      yMax = -Infinity;
    for (let i = 0; i < g.n; i++) {
      const y = g.V[i * 13 + 1];
      yMax = Math.max(yMax, y);
      if (g.V[i * 13 + 9] === MAT.WATER) {
        x0 = Math.min(x0, g.V[i * 13]);
        x1 = Math.max(x1, g.V[i * 13]);
      }
    }
    expect(x1 - x0).toBeLessThanOrEqual(STADE_LONGUEUR_MAX);
    expect(x1 - x0).toBeGreaterThan(BS);
    expect(yMax - BASE).toBeLessThanOrEqual(STADE_HAUTEUR_MAX + 1e-6);
  });

  it("le Parc d'attractions tient dans 2 × 2 blocs et reste sous la plus petite tour : ni la grande roue ni la chute libre ne la dépassent", () => {
    const t = tailleMegaprojet("grand_stade", 4);
    expect([t.nx, t.nz]).toEqual([2, 2]);
    expect(t.H).toBeLessThan(HAUTEUR_TOUR_MIN);
    const g = construire("grand_stade", 4);
    let yMax = -Infinity;
    for (let i = 0; i < g.n; i++) yMax = Math.max(yMax, g.V[i * 13 + 1]);
    expect(yMax - BASE).toBeLessThanOrEqual(t.H + 1e-6);
    expect(yMax - BASE).toBeLessThan(HAUTEUR_TOUR_MIN);
  });

  it("le Stade est nettement plus petit que le Parc, et que l'ancien Stade de 2 × 2 blocs de 36 m", () => {
    const st = tailleMegaprojet("stade", 1),
      pa = tailleMegaprojet("grand_stade", 4);
    expect(st.R * st.Rz).toBeLessThan((pa.R * pa.Rz) / 2 + 1);
    expect(st.R * st.Rz).toBeLessThan((68 * 68) / 2 + 1); // moins de la moitié de l'ancienne emprise
    expect(st.H).toBeLessThan(36);
  });
});
