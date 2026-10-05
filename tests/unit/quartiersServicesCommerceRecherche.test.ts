import { describe, expect, it } from "vitest";
import { rngFrom } from "@/lib/ville3d/aleatoire";
import { LOT } from "@/lib/ville3d/constantes";
import { Geo } from "@/lib/ville3d/geometrie";
import type { TamponAO } from "@/lib/ville3d/mobilier";
import { buildCommerce, buildRecherche, buildServices } from "@/lib/ville3d/quartiers";
import type { Facade, Rect } from "@/lib/ville3d/batiments";

/**
 * A-INTEGRER §36 A : Commerce, Services et Recherche ne sont plus de simples
 * boîtes à toit plat gris. Garanties vérifiables : plusieurs silhouettes par
 * stade, du détail (bien plus de géométrie qu'une boîte), et jamais de
 * débordement hors de la parcelle (aucun mur ni auvent sur le voisin ou la rue).
 */
const LOTS: Rect = [100, 200, 100 + LOT, 200 + LOT];
const FRONTS: Facade[] = ["-z", "+z", "-x", "+x"];
const CONSTRUCTEURS = { commerce: buildCommerce, services: buildServices, recherche: buildRecherche } as const;

function construire(nom: keyof typeof CONSTRUCTEURS, niveau: number, front: Facade, i: number) {
  const g = new Geo();
  const ao: TamponAO[] = [];
  CONSTRUCTEURS[nom](g, LOTS, front, niveau, rngFrom(`test|${nom}|${niveau}|${front}|${i}`), ao, 7 + i);
  return { g, ao };
}

describe("Commerce, Services, Recherche (§36 A)", () => {
  for (const nom of Object.keys(CONSTRUCTEURS) as (keyof typeof CONSTRUCTEURS)[]) {
    for (const niveau of [0, 1, 2]) {
      it(`${nom}, stade ${niveau} : reste dans la parcelle, sans valeur absurde, et pose son empreinte d'ombre`, () => {
        for (const front of FRONTS)
          for (let i = 0; i < 25; i++) {
            const { g, ao } = construire(nom, niveau, front, i);
            expect(ao).toHaveLength(1);
            for (let k = 0; k < g.V.length; k += 13) {
              const x = g.V[k],
                y = g.V[k + 1],
                z = g.V[k + 2];
              expect(Number.isFinite(x + y + z)).toBe(true);
              // débords tolérés : avant-toit/auvent/parvis (1,2 m) ; jamais plus
              expect(x).toBeGreaterThanOrEqual(LOTS[0] - 1.2);
              expect(x).toBeLessThanOrEqual(LOTS[2] + 1.2);
              expect(z).toBeGreaterThanOrEqual(LOTS[1] - 1.2);
              expect(z).toBeLessThanOrEqual(LOTS[3] + 1.2);
              expect(y).toBeGreaterThanOrEqual(0);
              expect(y).toBeLessThan(30);
            }
          }
      });
    }
  }

  it("plusieurs silhouettes aux stades où le §36 les demandait (formes différentes, pas la même boîte)", () => {
    // Services / Commerce : les deux archétypes ont des nombres de sommets très différents.
    for (const [nom, niveau] of [["services", 0], ["services", 1], ["commerce", 0]] as const) {
      const t = Array.from({ length: 40 }, (_, i) => construire(nom, niveau, "-z", i).g.V.length);
      expect(Math.max(...t), `${nom} stade ${niveau}`).toBeGreaterThan(Math.min(...t) * 1.15);
    }
    // Recherche stade 1 : la rotonde est ronde (beaucoup de normales en diagonale), le bloc non.
    const diagonales = (i: number) => {
      const v = construire("recherche", 1, "-z", i).g.V;
      let n = 0;
      for (let k = 0; k < v.length; k += 13) {
        const [nx, ny, nz] = [Math.abs(v[k + 3]), Math.abs(v[k + 4]), Math.abs(v[k + 5])];
        if (nx < 0.9 && ny < 0.9 && nz < 0.9) n++;
      }
      return n;
    };
    const d = Array.from({ length: 40 }, (_, i) => diagonales(i));
    expect(Math.max(...d)).toBeGreaterThan(Math.min(...d) * 1.5);
  });

  it("bien plus de détail qu'une boîte à toit plat (une boîte = 6 faces = 24 sommets)", () => {
    for (const nom of Object.keys(CONSTRUCTEURS) as (keyof typeof CONSTRUCTEURS)[])
      for (const niveau of [0, 1, 2]) {
        const moyenne = Array.from({ length: 20 }, (_, i) => construire(nom, niveau, "-z", i).g.V.length / 13).reduce((a, b) => a + b, 0) / 20;
        expect(moyenne, `${nom} stade ${niveau}`).toBeGreaterThan(24 * 6);
      }
  });

  it("déterministe : mêmes entrées, même géométrie", () => {
    const a = construire("services", 1, "+x", 3).g.V;
    const b = construire("services", 1, "+x", 3).g.V;
    expect(b).toEqual(a);
  });
});
