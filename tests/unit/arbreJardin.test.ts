import { describe, expect, it } from "vitest";
import { LOT } from "@/lib/ville3d/constantes";
import {
  MARGE_ARBRE_BORD,
  MARGE_ARBRE_MUR,
  placeInLot,
  placerArbreJardin,
  type Facade,
  type Rect,
} from "@/lib/ville3d/batiments";

/**
 * A-INTEGRER §36 B : l'arbre du jardin garde une marge minimale avec le mur
 * de la maison, quelle que soit la largeur réelle du bâtiment (l'ancien
 * décalage latéral fixe de ±3,5 m pouvait le coller au mur arrière).
 */
const FRONTS: Facade[] = ["-z", "+z", "-x", "+x"];
const LOTS: Rect = [100, 200, 100 + LOT, 200 + LOT];

function distanceARect(x: number, z: number, [a, b, c, d]: Rect): number {
  const dx = Math.max(a - x, 0, x - c),
    dz = Math.max(b - z, 0, z - d);
  return Math.hypot(dx, dz);
}

describe("placerArbreJardin", () => {
  it("garde la marge au mur et au bord de la parcelle pour toutes les tailles de maison, sur les 4 façades", () => {
    let total = 0,
      sans = 0;
    for (const front of FRONTS)
      for (const width of [6.4, 7.4, 8.2, 9.4, 11.5, 13.2])
        for (const depth of [5.8, 6.8, 7.6, 9.0, 9.4])
          for (const setback of [3.2, 3.6])
            for (const lateral of [-1.2, 0, 1.2])
              for (const echelle of [0.8, 1.05])
                for (const [u, t] of [[0, 0], [0.5, 0.5], [1, 1], [0, 1], [1, 0]]) {
                  const fp = placeInLot(LOTS, front, width, depth, setback, lateral);
                  const arbre = placerArbreJardin(LOTS, fp, front, echelle, u, t);
                  total++;
                  if (!arbre) {
                    sans++;
                    continue;
                  }
                  expect(arbre.echelle).toBeLessThanOrEqual(echelle + 1e-9);
                  expect(arbre.echelle).toBeGreaterThanOrEqual(0.65 - 1e-9);
                  // jamais dans la maison, et marge constante tronc <-> mur
                  expect(distanceARect(arbre.x, arbre.z, fp)).toBeGreaterThanOrEqual(MARGE_ARBRE_MUR * arbre.echelle - 1e-9);
                  // le tronc reste dans la parcelle, à la marge du bord
                  expect(arbre.x).toBeGreaterThanOrEqual(LOTS[0] + MARGE_ARBRE_BORD - 1e-9);
                  expect(arbre.x).toBeLessThanOrEqual(LOTS[2] - MARGE_ARBRE_BORD + 1e-9);
                  expect(arbre.z).toBeGreaterThanOrEqual(LOTS[1] + MARGE_ARBRE_BORD - 1e-9);
                  expect(arbre.z).toBeLessThanOrEqual(LOTS[3] - MARGE_ARBRE_BORD + 1e-9);
                }
    // Les parcelles trop étroites perdent leur arbre plutôt que de le coller au mur — mais rarement.
    expect(sans / total).toBeLessThan(0.2);
  });

  it("jamais côté rue (le jardin de devant garde son allée, sa haie et ses voitures)", () => {
    const fp = placeInLot(LOTS, "-z", 7, 7, 3.4, 0);
    for (const u of [0, 0.5, 1])
      for (const t of [0, 0.5, 1]) {
        const arbre = placerArbreJardin(LOTS, fp, "-z", 1, u, t)!;
        expect(arbre.z).toBeGreaterThan(fp[1]); // plus loin de la rue que la façade
      }
  });

  it("une maison étroite laisse de la place sur les côtés, une maison profonde et large n'en laisse pas : pas d'arbre plutôt qu'un arbre dans le mur", () => {
    const etroite = placeInLot(LOTS, "-z", 6.4, 6, 3.2, 0);
    expect(placerArbreJardin(LOTS, etroite, "-z", 1, 0.5, 0.5)).not.toBeNull();
    const pleine = placeInLot(LOTS, "-z", 14, 9.4, 3.2, 0); // presque toute la parcelle
    expect(placerArbreJardin(LOTS, pleine, "-z", 1, 0.5, 0.5)).toBeNull();
  });

  it("déterministe : mêmes entrées, même position", () => {
    const fp = placeInLot(LOTS, "+x", 8.4, 8, 3.4, 0.7);
    expect(placerArbreJardin(LOTS, fp, "+x", 0.9, 0.3, 0.8)).toEqual(placerArbreJardin(LOTS, fp, "+x", 0.9, 0.3, 0.8));
  });
});
