import { describe, expect, it } from "vitest";
import { RAYON_PAYSAGE, generate, generatePaysage } from "@/lib/ville3d/generer";
import { DEMI_ROUTE_CAMPAGNE } from "@/lib/ville3d/constantes";
import { Geo } from "@/lib/ville3d/geometrie";
import { buildCountryRoads } from "@/lib/ville3d/terrain";
import type { TamponAO } from "@/lib/ville3d/mobilier";

/**
 * A-INTEGRER §49 E (retour d'Adrien du 05/10/2026) : le fond de /pays est un paysage de campagne,
 * sans aucune ville (avant : /pays montrait la ville de la dernière page visitée, au hasard).
 */
const PAYS = ["8f1c2a54-0b7e-4d36-9a21-5c3e7b8d9f10", "pays-b", "france"];

describe("paysage de campagne sans ville (§49 E)", () => {
  it("aucun bloc, aucun bâtiment : seulement de la prairie, une route et des arbres", () => {
    for (const pays of PAYS) {
      const { stats, ao } = generatePaysage(pays);
      expect(stats.active, pays).toBe(0);
      expect(stats.towers, pays).toBe(0);
      expect(stats.maxFloors, pays).toBe(0);
      // Chaque empreinte d'ombre au sol est celle d'un arbre (hauteur 0) ; un bâtiment aurait une hauteur.
      expect(ao.length, pays).toBeGreaterThan(100);
      expect(ao.every((r) => r.h === 0), pays).toBe(true);
    }
  });

  it("la caméra est cadrée sur le centre, avec un rayon propre (brouillard, ombres, occlusion)", () => {
    const { stats } = generatePaysage("pays-b");
    expect(stats.center).toEqual([0, 0]);
    expect(stats.cityR).toBe(RAYON_PAYSAGE);
    expect(stats.extent).toBeGreaterThan(0);
    expect(stats.next).toBe(Infinity);
  });

  it("un pays donne toujours le même paysage, et deux pays n'ont pas le même", () => {
    const a = generatePaysage("pays-b");
    const a2 = generatePaysage("  PAYS-B ");
    const b = generatePaysage("france");
    expect(a2.g.V).toEqual(a.g.V);
    expect(a2.g.I).toEqual(a.g.I);
    expect(b.g.V).not.toEqual(a.g.V);
  });

  it("rien n'est planté sur la chaussée de la route de campagne ; des arbres bordent la route dès le premier plan", () => {
    for (const pays of PAYS) {
      const { ao } = generatePaysage(pays);
      const centres = ao.map((r) => ({ x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 }));
      for (const c of centres) {
        expect(Math.min(Math.abs(c.x), Math.abs(c.z)), pays).toBeGreaterThan(DEMI_ROUTE_CAMPAGNE);
      }
      // Du premier plan : des arbres à moins de 190 m du centre (les villes n'en ont pas là, c'est leur ville).
      expect(centres.some((c) => Math.hypot(c.x, c.z) < 120), pays).toBe(true);
    }
  });

  it("reste léger : moins de sommets qu'une petite ville", () => {
    const paysage = generatePaysage("pays-b").g.n;
    const ville = generate("pays-b", 20_000).g.n;
    expect(paysage).toBeLessThan(ville);
  });

  it("les villes gardent leurs arbres d'alignement à partir de 190 m : seul le paysage les rapproche", () => {
    const route = (cityR: number, premier?: number) => {
      const g = new Geo();
      const ao: TamponAO[] = [];
      if (premier === undefined) buildCountryRoads(g, "ville-a", ao, cityR);
      else buildCountryRoads(g, "ville-a", ao, cityR, premier);
      // Distance au centre de l'arbre d'alignement le plus proche.
      const proche = Math.min(...ao.map((r) => Math.hypot((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2)));
      return { g, proche };
    };
    expect(route(0, 190).g.V).toEqual(route(0).g.V);
    expect(route(0).proche).toBeGreaterThan(180);
    expect(route(0, 30).proche).toBeLessThan(60);
  });
});
