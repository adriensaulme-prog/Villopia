import { describe, expect, it } from "vitest";
import { casesTriees } from "@/lib/ville3d/cases";
import { ENERGIE_MAX_INSTALLATIONS } from "@/lib/ville3d/constantes";
import { CEINTURE, distanceAuSecteurEnergie, emplacementCentrale, emplacementEnergie } from "@/lib/ville3d/emplacements";
import { DISTANCE_MIN_ENERGIE, placesMegaprojets } from "@/lib/ville3d/megaprojetsVille";
import { NB_BLOCS_MONUMENTS } from "@/lib/ville3d/monumentsVille";
import { rectCourBloc } from "@/lib/ville3d/terrain";
import { CATALOGUE_MEGAPROJETS, PREMIER_PALIER_MEGAPROJET } from "@/lib/game/megaprojets";

/**
 * A-INTEGRER §49 C (retour d'Adrien du 05/10/2026) : « l'Énergie est trop proche
 * du Siège international ». Le secteur d'Énergie (+x, ±30°, à partir de 450 m) est
 * exclu du placement des mégaprojets : aucun n'est à moins de ~150 m d'une
 * installation d'Énergie, quelle que soit la graine.
 */
const PALIERS = CATALOGUE_MEGAPROJETS.map((_, i) => PREMIER_PALIER_MEGAPROJET + i);
const GRAINES = Array.from({ length: 200 }, (_, i) => `graine-${i}`);

/** Toutes les installations d'Énergie qu'une ville peut avoir (au maximum : 24 éoliennes ou panneaux et la centrale). */
function installationsEnergie(cle: string) {
  return [...Array.from({ length: ENERGIE_MAX_INSTALLATIONS }, (_, k) => emplacementEnergie(cle, k)), emplacementCentrale(cle)];
}

describe("les mégaprojets restent loin de l'Énergie (§49 C)", () => {
  it("200 graines × 18 paliers : aucun mégaprojet à moins de 150 m d'une éolienne, d'un panneau ou de la centrale", () => {
    let pire = Infinity;
    for (const cle of GRAINES) {
      const energie = installationsEnergie(cle);
      for (const [palier, p] of placesMegaprojets(cle, PALIERS)) {
        const d = Math.min(...energie.map((e) => Math.hypot(p.x - e.x, p.z - e.z)));
        pire = Math.min(pire, d);
        expect(d, `${cle} palier ${palier}`).toBeGreaterThanOrEqual(DISTANCE_MIN_ENERGIE);
      }
    }
    expect(pire).toBeGreaterThanOrEqual(150);
  });

  it("la distance au secteur est celle du trapèze : nulle dedans, exacte hors du secteur", () => {
    expect(distanceAuSecteurEnergie(500, 0)).toBe(0);
    expect(distanceAuSecteurEnergie(CEINTURE + 249, 200)).toBe(0);
    expect(distanceAuSecteurEnergie(CEINTURE - 100, 0)).toBeCloseTo(100, 9);
    expect(distanceAuSecteurEnergie(-300, 0)).toBeCloseTo(CEINTURE + 300, 9);
    // Chaque installation possible est dans le secteur (c'est ce qui rend le test précédent suffisant).
    for (const cle of GRAINES.slice(0, 40)) for (const e of installationsEnergie(cle)) expect(distanceAuSecteurEnergie(e.x, e.z), cle).toBeLessThan(1e-6);
  });

  it("l'exclusion a un effet, sans rien bouleverser : quelques cases libres près de la ville sont écartées pour l'Énergie, la grande majorité ne l'est pas", () => {
    let ecartees = 0,
      total = 0;
    for (const cle of GRAINES.slice(0, 100)) {
      // Les 40 premières cases après celles des monuments : celles que les 18 mégaprojets (dont deux de 2 × 2 blocs) peuvent prendre.
      for (const c of casesTriees(cle, 12).slice(NB_BLOCS_MONUMENTS, NB_BLOCS_MONUMENTS + 40)) {
        const [x0, z0, x1, z1] = rectCourBloc(cle, c.bi, c.bj)!;
        total++;
        if (distanceAuSecteurEnergie((x0 + x1) / 2, (z0 + z1) / 2) < DISTANCE_MIN_ENERGIE) ecartees++;
      }
    }
    expect(ecartees).toBeGreaterThan(0);
    expect(ecartees / total).toBeLessThan(0.1);
  });

  it("un mégaprojet n'est jamais posé sur une case écartée pour l'Énergie : le centre de sa cour est toujours au-delà des 150 m", () => {
    for (const cle of GRAINES.slice(0, 100)) {
      for (const [palier, p] of placesMegaprojets(cle, PALIERS)) {
        if (p.nx * p.nz > 1) continue; // les sites de plusieurs blocs sont mesurés par leur bord, dans megaprojetsStades.test.ts
        expect(distanceAuSecteurEnergie(p.x, p.z), `${cle} palier ${palier}`).toBeGreaterThanOrEqual(DISTANCE_MIN_ENERGIE);
      }
      expect(new Set([...placesMegaprojets(cle, PALIERS).values()].flatMap((p) => p.blocs.map((b) => b.bi + "," + b.bj))).size, cle).toBe(18 - 2 + 2 + 4);
    }
  });

  it("la place d'un mégaprojet ne dépend que de la graine : pas des autres paliers demandés, ni de l'ordre", () => {
    for (const cle of GRAINES.slice(0, 40)) {
      const tous = placesMegaprojets(cle, PALIERS);
      for (const palier of [PALIERS[0], PALIERS[9], PALIERS[15], PALIERS[17]]) {
        expect(placesMegaprojets(cle, [palier]).get(palier), `${cle} ${palier}`).toEqual(tous.get(palier));
      }
      expect(placesMegaprojets(cle, [...PALIERS].reverse()).get(PALIERS[17])).toEqual(tous.get(PALIERS[17]));
    }
  });
});
