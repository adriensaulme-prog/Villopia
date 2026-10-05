import { describe, expect, it } from "vitest";
import { casesTriees } from "@/lib/ville3d/cases";
import { ENERGIE_MAX_INSTALLATIONS } from "@/lib/ville3d/constantes";
import { CEINTURE, distanceAuSecteurEnergie, emplacementCentrale, emplacementEnergie } from "@/lib/ville3d/emplacements";
import { DISTANCE_MIN_ENERGIE, indiceCaseMegaprojet, placesMegaprojets } from "@/lib/ville3d/megaprojetsVille";
import { planifierBlocs } from "@/lib/ville3d/generer";
import { rectCourBloc } from "@/lib/ville3d/terrain";
import { CATALOGUE_MEGAPROJETS, POPULATION_STADE, PREMIER_PALIER_MEGAPROJET, megaprojetDuPalier } from "@/lib/game/megaprojets";

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

/** Où le mégaprojet était posé avant le §49 : le centre de la cour de la case d'indice « de stade » (sans exclusion). */
function placeAvantLe49(cases: ReturnType<typeof casesTriees>, cle: string, palier: number) {
  const c = cases[indiceCaseMegaprojet(palier)!];
  const [x0, z0, x1, z1] = rectCourBloc(cle, c.bi, c.bj)!;
  return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, bi: c.bi, bj: c.bj };
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

  it("seuls les mégaprojets qui étaient trop près bougent ; les autres gardent exactement leur place", () => {
    let deplaces = 0,
      total = 0;
    for (const cle of GRAINES.slice(0, 100)) {
      const places = placesMegaprojets(cle, PALIERS);
      const cases = casesTriees(cle, 12);
      for (const palier of PALIERS) {
        const apres = places.get(palier)!;
        // Le Stade et le Grand stade ont changé de place pour une autre raison : ils occupent plusieurs blocs (§49 D, megaprojetsStades.test.ts).
        if (apres.nx * apres.nz > 1) continue;
        const avant = placeAvantLe49(cases, cle, palier);
        const tropPres = distanceAuSecteurEnergie(avant.x, avant.z) < DISTANCE_MIN_ENERGIE;
        total++;
        if (tropPres) {
          deplaces++;
          expect(`${apres.bi},${apres.bj}`, `${cle} palier ${palier}`).not.toBe(`${avant.bi},${avant.bj}`);
        } else {
          expect(apres.x, `${cle} palier ${palier}`).toBe(avant.x);
          expect(apres.z, `${cle} palier ${palier}`).toBe(avant.z);
          expect(apres.bi).toBe(avant.bi);
          expect(apres.bj).toBe(avant.bj);
        }
      }
    }
    // Une minorité seulement (le secteur ne couvre que 60° sur 360°, et seuls les trois derniers stades arrivent
    // jusque-là : environ 4 % des 3 600 couples graine × palier au moment de l'écriture) : le déplacement n'est pas un remaniement général.
    expect(deplaces).toBeGreaterThan(0);
    expect(deplaces / total).toBeLessThan(0.1);
  });

  it("un mégaprojet déplacé va plus loin dans l'ordre des cases, sur une case libre : jamais celle d'un autre", () => {
    for (const cle of GRAINES.slice(0, 100)) {
      const places = placesMegaprojets(cle, PALIERS);
      expect(new Set([...places.values()].map((p) => p.bi + "," + p.bj)).size, cle).toBe(PALIERS.length);
      const cases = casesTriees(cle, 12);
      const rang = (p: { bi: number; bj: number }) => cases.findIndex((c) => c.bi === p.bi && c.bj === p.bj);
      for (const palier of PALIERS) {
        expect(rang(places.get(palier)!), `${cle} palier ${palier}`).toBeGreaterThanOrEqual(indiceCaseMegaprojet(palier)!);
      }
    }
  });

  it("la case reste libre quand la ville atteint la population de son stade (jamais dans la ville)", () => {
    for (const cle of GRAINES.slice(0, 12)) {
      const places = placesMegaprojets(cle, PALIERS);
      for (let stade = 0; stade < POPULATION_STADE.length; stade++) {
        const { blocks } = planifierBlocs(cle, POPULATION_STADE[stade], new Map(), 0);
        for (const palier of PALIERS.filter((p) => megaprojetDuPalier(p)!.stade === stade)) {
          const p = places.get(palier)!;
          expect(blocks.some((b) => b.active && b.bi === p.bi && b.bj === p.bj), `${cle} palier ${palier}`).toBe(false);
        }
      }
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
