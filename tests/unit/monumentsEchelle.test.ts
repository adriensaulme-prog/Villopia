import { describe, expect, it } from "vitest";
import { Geo } from "@/lib/ville3d/geometrie";
import { GABARITS, RAYON_MAX_MONUMENT, buildMonument, gabaritMonument, rangMonument } from "@/lib/ville3d/monuments";
import { LOT } from "@/lib/ville3d/constantes";
import type { TamponAO } from "@/lib/ville3d/mobilier";
import { CATALOGUE_MONUMENTS } from "@/lib/game/monuments";

/**
 * Monuments agrandis (demande d'Adrien du 02/10/2026, puis A-INTEGRER §49 A+B du 05/10/2026) : de 7 à
 * 62 m de haut — la statue géante à plus de 50 m — dans une parcelle de façade de 14,5 m. C'est en
 * hauteur qu'ils grandissent : l'emprise, elle, ne dépasse jamais la parcelle.
 */
function mesure(type: string, palier: number) {
  const ao: TamponAO[] = [];
  const g = new Geo();
  buildMonument(g, 0, 0, type, palier, ao, 1);
  let haut = 0,
    rayon = 0;
  for (let i = 0; i < g.n; i++) {
    haut = Math.max(haut, g.V[i * 13 + 1]);
    rayon = Math.max(rayon, Math.hypot(g.V[i * 13], g.V[i * 13 + 2]));
  }
  return { ao, haut, rayon };
}

const PAIRES = CATALOGUE_MONUMENTS.map((m, palier) => ({ type: m.type, palier }));

describe("taille des monuments (§49 A)", () => {
  it("chaque type du catalogue a son gabarit", () => {
    expect(Object.keys(GABARITS).sort()).toEqual(CATALOGUE_MONUMENTS.map((m) => m.type).sort());
  });

  it("de 7 m (le banc) à 62 m (le monument ultime) de haut, jamais plus large que la parcelle", () => {
    expect(RAYON_MAX_MONUMENT).toBeLessThan(LOT / 2);
    for (const { type, palier } of PAIRES) {
      const { ao, haut, rayon } = mesure(type, palier);
      expect(ao).toHaveLength(1);
      const { x0, x1, z0, z1, h } = ao[0];
      // L'ombre au sol couvre le cercle du socle, qui tient avec sa marge dans la parcelle de 14,5 m.
      expect(x1 - x0, type).toBeLessThanOrEqual(LOT - 1.3 + 1e-9);
      expect(z1 - z0, type).toBeLessThanOrEqual(LOT - 1.3 + 1e-9);
      expect(rayon, type).toBeLessThanOrEqual(RAYON_MAX_MONUMENT + 1e-6);
      expect(h, type).toBeGreaterThanOrEqual(7);
      expect(h, type).toBeLessThanOrEqual(62);
      expect(haut, type).toBeLessThanOrEqual(0.15 + h + 1e-6);
      expect(haut, `${type} n'utilise pas sa hauteur`).toBeGreaterThan((0.15 + h) * 0.9);
    }
  });

  it("la statue géante fait plus de 50 m, et le monument ultime la dépasse", () => {
    const geante = mesure("statue_geante", 14).haut;
    const ultime = mesure("monument_ultime", 15).haut;
    expect(geante).toBeGreaterThan(50);
    expect(ultime).toBeGreaterThan(geante);
  });

  it("chaque monument prestigieux domine les immeubles qui l'entourent (au moins 22 m) ; chaque modeste reste de plain-pied avec eux (moins de 25 m)", () => {
    for (const { type, palier } of PAIRES) {
      const { haut } = mesure(type, palier);
      if (rangMonument(palier) === 2) expect(haut, type).toBeGreaterThan(22);
      if (rangMonument(palier) === 0) expect(haut, type).toBeLessThan(25);
    }
  });

  it("les prestigieux sont en moyenne bien plus hauts que les notables, eux-mêmes plus hauts que les modestes", () => {
    const moyenne = (rang: number) => {
      const hs = PAIRES.filter((p) => rangMonument(p.palier) === rang).map((p) => mesure(p.type, p.palier).haut);
      return hs.reduce((s, h) => s + h, 0) / hs.length;
    };
    expect(moyenne(1)).toBeGreaterThan(moyenne(0));
    expect(moyenne(2)).toBeGreaterThan(moyenne(1));
  });

  it("un type inconnu (futur mégaprojet fusionné) a un gabarit qui grandit avec le palier, toujours dans la parcelle", () => {
    let h = 0,
      r = 0;
    for (let palier = 0; palier <= 15; palier++) {
      const gab = gabaritMonument("type_pas_encore_dessine", palier);
      expect(gab.hauteur).toBeGreaterThan(h);
      expect(gab.rayon).toBeGreaterThan(r);
      expect(gab.rayon).toBeLessThanOrEqual(RAYON_MAX_MONUMENT);
      h = gab.hauteur;
      r = gab.rayon;
    }
  });
});
