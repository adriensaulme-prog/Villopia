import { describe, expect, it } from "vitest";
import {
  AXE_ENERGIE,
  CEINTURE,
  GARDE_ROUTE_ENERGIE,
  cleDe,
  emplacementCentrale,
  emplacementEnergie,
} from "@/lib/ville3d/emplacements";
import { rngFrom, rr } from "@/lib/ville3d/aleatoire";
import { generate } from "@/lib/ville3d/generer";
import { PLAFOND_RENDU_POPULATION } from "@/lib/ville3d/constantes";
import { DEMI_BANDE_ROUTE_CAMPAGNE, DEMI_ROUTE_CAMPAGNE, ENERGIE_MAX_INSTALLATIONS } from "@/lib/ville3d/constantes";

/**
 * A-INTEGRER §25 : Énergie a son secteur fixe, au-delà de la ville la plus
 * grande qu'on dessine, et §37 B : elle reste hors de la route de campagne
 * qui traverse ce secteur. (Les monuments sont dans la ville depuis le §33 :
 * voir tests/unit/monumentsVille.test.ts ; les mégaprojets sont à sa bordure
 * depuis le §37 : voir tests/unit/megaprojetsVille.test.ts.)
 */
const normeMax = (p: { x: number; z: number }) => Math.max(Math.abs(p.x), Math.abs(p.z));
/** Angle (degrés, −180..180) de l'axe de secteur le plus proche, écart au centre du secteur. */
const ecartAAxe = (p: { x: number; z: number }, axeDeg: number) => {
  const a = (Math.atan2(p.z, p.x) * 180) / Math.PI;
  return Math.abs(((a - axeDeg + 540) % 360) - 180);
};

const CLES = ["ville-a", "0b7c4f3e-demo", "accueil"];

describe("emplacements de la campagne (§25)", () => {
  it("la ceinture est au-delà du rayon de la ville au plafond de rendu", () => {
    for (const cle of CLES) {
      const { stats } = generate(cle, PLAFOND_RENDU_POPULATION);
      expect(stats.cityR + 20).toBeLessThanOrEqual(CEINTURE);
    }
  });

  it("l'énergie reste dans son secteur (±30°) et hors de la ville", () => {
    for (const cle of CLES) {
      for (let k = 0; k < ENERGIE_MAX_INSTALLATIONS; k++) {
        const p = emplacementEnergie(cle, k);
        expect(normeMax(p)).toBeGreaterThanOrEqual(CEINTURE - 0.01);
        expect(ecartAAxe(p, AXE_ENERGIE)).toBeLessThanOrEqual(30.01);
      }
      const c = emplacementCentrale(cle);
      expect(normeMax(c)).toBeGreaterThanOrEqual(CEINTURE - 0.01);
      expect(ecartAAxe(c, AXE_ENERGIE)).toBeLessThanOrEqual(30.01);
    }
  });

  it("la position d'une installation ne dépend que de la ville et de son numéro : stable quand d'autres se débloquent", () => {
    expect(emplacementEnergie("ville-a", 5)).toEqual(emplacementEnergie("ville-a", 5));
    expect(emplacementCentrale("ville-a")).toEqual(emplacementCentrale("ville-a"));
  });

  it("la garde de route couvre la chaussée, ses arbres d'alignement et l'emprise d'une ferme solaire (§37 B)", () => {
    expect(DEMI_BANDE_ROUTE_CAMPAGNE).toBeGreaterThan(DEMI_ROUTE_CAMPAGNE);
    expect(GARDE_ROUTE_ENERGIE).toBeGreaterThanOrEqual(DEMI_BANDE_ROUTE_CAMPAGNE + 11.6);
  });

  it("la centrale et les installations d'énergie ne touchent jamais la route de campagne (§37 B)", () => {
    // La route occupe |z| < 5, ses arbres jusqu'à |z| ≈ 13 ; avant le correctif, ~1 tirage sur 10 y tombait.
    for (let i = 0; i < 400; i++) {
      const cle = "ville-" + i;
      const c = emplacementCentrale(cle);
      expect(Math.abs(c.z)).toBeGreaterThanOrEqual(GARDE_ROUTE_ENERGIE);
      // La centrale (clôture, réservoirs) s'étend jusqu'à 8,5 m de son centre en z.
      expect(Math.abs(c.z) - 8.5).toBeGreaterThan(DEMI_BANDE_ROUTE_CAMPAGNE);
      for (let k = 0; k < ENERGIE_MAX_INSTALLATIONS; k++) {
        expect(Math.abs(emplacementEnergie(cle, k).z)).toBeGreaterThanOrEqual(GARDE_ROUTE_ENERGIE);
      }
    }
  });

  it("le correctif ne déplace que les tirages qui tombaient sur la route : les autres gardent leur place", () => {
    // Le tirage brut, rejoué ici comme dans emplacementEnergie() avant le correctif.
    const brut = (cle: string, k: number) => {
      const r = rngFrom(cle + "|energie|" + k);
      const a = ((r() * 2 - 1) * 30 * Math.PI) / 180;
      const d = CEINTURE + rr(r, 0, 250);
      const m = d / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
      return { x: Math.cos(a) * m, z: Math.sin(a) * m };
    };
    let deplaces = 0;
    let gardes = 0;
    const zDeplaces = new Set<number>();
    for (let i = 0; i < 200; i++) {
      for (let k = 0; k < ENERGIE_MAX_INSTALLATIONS; k++) {
        const cle = "ville-" + i;
        const avant = brut(cle, k);
        const apres = emplacementEnergie(cle, k);
        if (Math.abs(avant.z) >= GARDE_ROUTE_ENERGIE) {
          expect(apres.x).toBeCloseTo(avant.x, 6);
          expect(apres.z).toBeCloseTo(avant.z, 6);
          gardes++;
        } else {
          // Même x (même distance), repoussé du même côté de la route.
          expect(apres.x).toBeCloseTo(avant.x, 6);
          expect(Math.sign(apres.z)).toBe(avant.z < 0 ? -1 : 1);
          zDeplaces.add(Math.round(apres.z));
          deplaces++;
        }
      }
    }
    expect(deplaces).toBeGreaterThan(0); // le cas existe bel et bien (sinon ce test ne prouve rien)
    expect(gardes).toBeGreaterThan(deplaces * 3); // et reste minoritaire : la grande majorité ne bouge pas
    expect(zDeplaces.size).toBeGreaterThan(5); // les déplacés ne s'alignent pas sur une même ligne
  });

  it("la clé de ville normalisée (cleDe) est la même que celle du rendu : casse et espaces ignorés", () => {
    expect(cleDe("  Ville-A ")).toBe("ville-a");
    expect(cleDe("")).toBe("ville");
  });

  it("la géométrie générée est déterministe, quels que soient les monuments débloqués", () => {
    const avec = generate("ville-a", 20_000, undefined, 0, [], 0, [{ palier: 0, type: "borne_commemorative" }]);
    const avec2 = generate("ville-a", 20_000, undefined, 0, [], 0, [{ palier: 0, type: "borne_commemorative" }]);
    expect(avec2.g.V.length).toBe(avec.g.V.length);
  });
});
