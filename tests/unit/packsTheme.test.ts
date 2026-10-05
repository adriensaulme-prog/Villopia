import { describe, expect, it } from "vitest";
import { rngFrom } from "@/lib/ville3d/aleatoire";
import { LOT } from "@/lib/ville3d/constantes";
import { Geo } from "@/lib/ville3d/geometrie";
import type { TamponAO } from "@/lib/ville3d/mobilier";
import { choisirModele } from "@/lib/ville3d/catalogue";
import { MODELES_IMMEUBLES, MODELES_MAISONS, MODELES_TOURS, type Facade, type Rect } from "@/lib/ville3d/batiments";
import { PACKS, THEMES } from "@/lib/game/themes";

/**
 * Les cinq packs d'A-INTEGRER §40 (bord_de_mer, village_de_pierre, quartier_industriel,
 * futuriste_eco, nordique) : chaque pack a de vrais modèles pour les familles qu'il
 * annonce, jamais pour les autres ; ses modèles tiennent dans la parcelle, sont
 * déterministes, restent légers, et le pack est choisi pour toute sa famille.
 */
const NOUVEAUX = ["bord_de_mer", "village_de_pierre", "quartier_industriel", "futuriste_eco", "nordique"] as const;
const FAMILLES_ATTENDUES: Record<(typeof NOUVEAUX)[number], string[]> = {
  bord_de_mer: ["maison"],
  village_de_pierre: ["maison"],
  quartier_industriel: ["immeuble"],
  futuriste_eco: ["tour"],
  nordique: ["immeuble", "maison", "tour"],
};

const LOTS: Rect = [100, 200, 100 + LOT, 200 + LOT];
const TOURS: Rect = [100, 200, 100 + 2 * LOT, 200 + 2 * LOT];
const FRONTS: Facade[] = ["-z", "+z", "-x", "+x"];

function modelesDuPack(pack: string) {
  return [
    ...MODELES_MAISONS.filter((m) => m.pack === pack).map((m) => ({ famille: "maison" as const, m })),
    ...MODELES_IMMEUBLES.filter((m) => m.pack === pack).map((m) => ({ famille: "immeuble" as const, m })),
    ...MODELES_TOURS.filter((m) => m.pack === pack).map((m) => ({ famille: "tour" as const, m })),
  ];
}

function construire(entree: ReturnType<typeof modelesDuPack>[number], front: Facade, i: number, floors = 5, F = 24, cap = 24) {
  const g = new Geo();
  const ao: TamponAO[] = [];
  const r = rngFrom(`pack|${entree.m.id}|${front}|${i}`);
  const m = entree.m;
  if (entree.famille === "maison") (m.construire as (...a: unknown[]) => void)(g, LOTS, front, r, ao, 7 + i);
  else if (entree.famille === "immeuble") (m.construire as (...a: unknown[]) => void)(g, LOTS, front, floors, r, ao, 7 + i);
  else (m.construire as (...a: unknown[]) => void)(g, TOURS, front, F, cap, r, ao, 7 + i);
  return { g, ao };
}

describe("catalogue des cinq packs (§40)", () => {
  it("les cinq packs sont déclarés comme thèmes, avec une fiche chacun", () => {
    for (const id of NOUVEAUX) {
      expect(THEMES as readonly string[]).toContain(id);
      expect(PACKS.find((p) => p.id === id), id).toBeDefined();
    }
  });

  for (const id of NOUVEAUX) {
    it(`${id} : des modèles dédiés exactement pour les familles annoncées`, () => {
      const familles = [...new Set(modelesDuPack(id).map((e) => e.famille))].sort();
      expect(familles).toEqual(FAMILLES_ATTENDUES[id]);
      expect(PACKS.find((p) => p.id === id)!.familles.slice().sort()).toEqual(FAMILLES_ATTENDUES[id]);
    });

    it(`${id} : chaque parcelle de ses familles reçoit un modèle du pack, les autres familles retombent sur « classique »`, () => {
      const catalogues: Record<string, readonly { id: string; pack: string; poids: number; stadeMin: number }[]> = {
        maison: MODELES_MAISONS,
        immeuble: MODELES_IMMEUBLES,
        tour: MODELES_TOURS,
      };
      for (const [famille, modeles] of Object.entries(catalogues)) {
        for (let i = 0; i < 30; i++) {
          const m = choisirModele(`ville-${id}|${famille}|${i}`, modeles, 0, id);
          expect(m.pack, `${id}/${famille}`).toBe(FAMILLES_ATTENDUES[id].includes(famille) ? id : "classique");
        }
      }
    });
  }

  it("deux packs de la même famille sont concurrents d'office : un thème par ville, jamais un mélange", () => {
    // Bord de mer et Village de pierre couvrent tous deux « maison » ; Quartier industriel et Haussmannien « immeuble ».
    // Une ville ne porte qu'un seul thème : avec l'un, jamais un modèle de l'autre.
    for (let i = 0; i < 40; i++) {
      expect(choisirModele(`mer|${i}`, MODELES_MAISONS, 0, "bord_de_mer").pack).toBe("bord_de_mer");
      expect(choisirModele(`pierre|${i}`, MODELES_MAISONS, 0, "village_de_pierre").pack).toBe("village_de_pierre");
      expect(choisirModele(`indus|${i}`, MODELES_IMMEUBLES, 0, "quartier_industriel").pack).toBe("quartier_industriel");
      expect(choisirModele(`hauss|${i}`, MODELES_IMMEUBLES, 0, "haussmannien").pack).toBe("haussmannien");
    }
  });

  it("identifiants de modèles uniques dans tout le catalogue", () => {
    const ids = [...MODELES_MAISONS, ...MODELES_IMMEUBLES, ...MODELES_TOURS].map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("géométrie des modèles de packs (§40)", () => {
  for (const id of NOUVEAUX) {
    for (const entree of modelesDuPack(id)) {
      it(`${entree.m.id} : dans la parcelle, sans valeur absurde, une empreinte d'ombre`, () => {
        const rect = entree.famille === "tour" ? TOURS : LOTS;
        for (const front of FRONTS)
          for (let i = 0; i < 12; i++) {
            const { g, ao } = construire(entree, front, i);
            expect(ao.length, `${entree.m.id} ao`).toBeGreaterThan(0);
            for (let k = 0; k < g.V.length; k += 13) {
              const x = g.V[k],
                y = g.V[k + 1],
                z = g.V[k + 2];
              expect(Number.isFinite(x + y + z)).toBe(true);
              // débords tolérés : avant-toit, terrasse, auvent, et le décor partagé des maisons (cime
              // d'arbre, voiture garée — jusqu'à 2,3 m pour la longère du pack de base) ; jamais plus
              const tol = entree.famille === "maison" ? 1.8 : 1.5;
              expect(x).toBeGreaterThanOrEqual(rect[0] - tol);
              expect(x).toBeLessThanOrEqual(rect[2] + tol);
              expect(z).toBeGreaterThanOrEqual(rect[1] - tol);
              expect(z).toBeLessThanOrEqual(rect[3] + tol);
              expect(y).toBeGreaterThanOrEqual(0);
              expect(y).toBeLessThan(entree.famille === "tour" ? 120 : 30);
            }
          }
      });

      it(`${entree.m.id} : déterministe, et plus riche qu'une simple boîte`, () => {
        const a = construire(entree, "+x", 3).g;
        const b = construire(entree, "+x", 3).g;
        expect(b.V).toEqual(a.V);
        expect(a.V.length / 13, entree.m.id).toBeGreaterThan(24 * 4);
      });

      it(`${entree.m.id} : reste léger (budget de triangles du catalogue)`, () => {
        const limite = entree.famille === "tour" ? 1800 : 600;
        for (const front of FRONTS) {
          const { g } = construire(entree, front, 1);
          expect(g.I.length / 3, `${entree.m.id} ${front}`).toBeLessThan(limite);
        }
      });
    }
  }

  it("les tours des packs gèrent le chantier (F = 0) et la construction en cours, comme les tours du pack de base", () => {
    for (const entree of modelesDuPack("futuriste_eco").concat(modelesDuPack("nordique").filter((e) => e.famille === "tour"))) {
      const chantier = construire(entree, "+z", 0, 5, 0, 20);
      expect(chantier.g.V.length, `${entree.m.id} chantier`).toBeGreaterThan(0);
      const enCours = construire(entree, "+z", 0, 5, 9, 20);
      const fini = construire(entree, "+z", 0, 5, 20, 20);
      expect(fini.g.V.length, `${entree.m.id}`).toBeGreaterThan(0);
      expect(enCours.g.V.length).toBeGreaterThan(0);
      // un fût fini est plus haut qu'un fût commencé
      const hauteur = (v: number[]) => v.reduce((mx, _x, k) => (k % 13 === 1 ? Math.max(mx, v[k]) : mx), 0);
      expect(hauteur(fini.g.V)).toBeGreaterThan(hauteur(enCours.g.V));
    }
  });

  it("plusieurs silhouettes par pack et par famille (pas une seule forme répétée)", () => {
    for (const id of NOUVEAUX) {
      for (const famille of ["maison", "immeuble", "tour"] as const) {
        const entrees = modelesDuPack(id).filter((e) => e.famille === famille);
        if (entrees.length === 0) continue;
        expect(entrees.length, `${id}/${famille}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
