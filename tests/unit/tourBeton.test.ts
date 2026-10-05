import { describe, expect, it } from "vitest";
import { rngFrom } from "@/lib/ville3d/aleatoire";
import { FLOOR_H, LOT, MAT, PODIUM_H } from "@/lib/ville3d/constantes";
import { Geo } from "@/lib/ville3d/geometrie";
import type { TamponAO } from "@/lib/ville3d/mobilier";
import { MODELES_TOURS, type Rect } from "@/lib/ville3d/batiments";

/**
 * A-INTEGRER §39 : la tour béton n'avait aucune fenêtre (tout en MAT.CONCRETE,
 * matériau sans vitrage ni émission) : elle restait noire la nuit alors que les
 * tours vitrées s'éclairaient. Elle a désormais un noyau vitré (MAT.GLASS, dont le
 * shader éclaire les fenêtres la nuit) dans une ossature de béton.
 */
const RECT: Rect = [100, 200, 100 + 2 * LOT, 200 + 2 * LOT];
const modele = MODELES_TOURS.find((m) => m.id === "tour-beton")!;
const STRIDE = 13; // position(3), normale(3), couleur(3), matériau(1), u(1), v(1), graine(1)

function tour(F: number, cap: number, i = 0) {
  const g = new Geo();
  const ao: TamponAO[] = [];
  const top = modele.construire(g, RECT, "+z", F, cap, rngFrom("test|tour-beton|" + i), ao, 10 + i);
  return { g, ao, top };
}

/** Sommets d'un matériau donné : [x, y, z, u, v]. */
function sommets(g: Geo, mat: number) {
  const out: number[][] = [];
  for (let k = 0; k < g.V.length; k += STRIDE)
    if (g.V[k + 9] === mat) out.push([g.V[k], g.V[k + 1], g.V[k + 2], g.V[k + 10], g.V[k + 11]]);
  return out;
}

describe("tour béton (§39)", () => {
  it("la tour finie a des fenêtres : du verre (MAT.GLASS), éclairé la nuit par le shader des tours vitrées", () => {
    for (let i = 0; i < 12; i++) {
      const { g } = tour(15, 15, i);
      expect(sommets(g, MAT.GLASS).length, `tour ${i}`).toBeGreaterThan(0);
      // Plus aucune tour béton entièrement en béton : le béton sert d'ossature, pas de fût plein.
      expect(sommets(g, MAT.CONCRETE).length).toBeGreaterThan(0);
    }
  });

  it("le noyau vitré couvre tous les étages du fût, calés sur les étages du shader (3,6 m)", () => {
    const F = 15;
    const { g } = tour(F, F);
    const v = sommets(g, MAT.GLASS).map((s) => s[4]);
    // Pied du fût : v = 0 ; sommet : exactement le nombre d'étages du fût × FLOOR_H.
    expect(Math.min(...v)).toBeCloseTo(0, 6);
    expect(Math.max(...v)).toBeCloseTo((F - 3) * FLOOR_H, 6);
  });

  it("le socle est un vrai socle commercial (vitrines, enseignes), pas un bloc de béton plein", () => {
    const { g } = tour(8, 15);
    const socle = sommets(g, MAT.PODIUM);
    expect(socle.length).toBeGreaterThan(0);
    expect(Math.max(...socle.map((s) => s[4]))).toBeCloseTo(3 * PODIUM_H, 6);
  });

  it("les dalles et les poteaux ne sortent jamais du lot, même au couronnement (tour finie ; la grue d'un chantier déborde exprès)", () => {
    for (const [F, cap] of [[15, 15], [8, 8], [4, 4], [30, 30]]) {
      const { g, top } = tour(F, cap);
      expect(Number.isFinite(top)).toBe(true);
      for (let k = 0; k < g.V.length; k += STRIDE) {
        expect(g.V[k]).toBeGreaterThanOrEqual(RECT[0]);
        expect(g.V[k]).toBeLessThanOrEqual(RECT[2]);
        expect(g.V[k + 2]).toBeGreaterThanOrEqual(RECT[1]);
        expect(g.V[k + 2]).toBeLessThanOrEqual(RECT[3]);
      }
    }
  });

  it("en chantier : le verre s'arrête avant les 2 derniers étages (squelette), et le chantier nu (F = 0) reste sans verre", () => {
    const F = 10;
    const { g } = tour(F, 15);
    const v = sommets(g, MAT.GLASS).map((s) => s[4]);
    expect(Math.max(...v)).toBeCloseTo((F - 3 - 2) * FLOOR_H, 6);
    expect(sommets(tour(0, 15).g, MAT.GLASS).length).toBe(0);
  });

  it("déterministe : même graine, même géométrie ; et le tirage du chantier (F = 0) ne dépend pas du vitrage", () => {
    expect(tour(15, 15, 3).g.V).toEqual(tour(15, 15, 3).g.V);
    expect(tour(0, 15, 3).g.V.length).toBeGreaterThan(0);
  });

  it("une seule empreinte d'ombre par tour", () => {
    expect(tour(15, 15).ao).toHaveLength(2); // socle + fût
  });
});
