import { describe, expect, it } from "vitest";
import { Geo } from "@/lib/ville3d/geometrie";
import { MAT } from "@/lib/ville3d/constantes";
import { buildMonument, couleurMetal, gabaritMonument, rangMonument } from "@/lib/ville3d/monuments";
import type { TamponAO } from "@/lib/ville3d/mobilier";
import { CATALOGUE_MONUMENTS } from "@/lib/game/monuments";

/**
 * A-INTEGRER §43 (et §49 A+B pour la taille) : les monuments ne sont plus trois
 * silhouettes primitives recyclées. Chaque type a la sienne, le rang (modeste / notable /
 * prestigieux) se lit autrement que par la taille, et la teinte or/bronze
 * reste la signature commune.
 */
function construire(type: string, palier: number, seed = 1) {
  const g = new Geo();
  const ao: TamponAO[] = [];
  buildMonument(g, 0, 0, type, palier, ao, seed);
  return { g, ao };
}

/** Lecture d'un sommet : x, y, z, couleur, matériau (voir geometrie.ts, 13 flottants par sommet). */
function sommets(g: Geo) {
  const out: { x: number; y: number; z: number; c: [number, number, number]; m: number }[] = [];
  for (let i = 0; i < g.n; i++) {
    const o = i * 13;
    out.push({ x: g.V[o], y: g.V[o + 1], z: g.V[o + 2], c: [g.V[o + 6], g.V[o + 7], g.V[o + 8]], m: g.V[o + 9] });
  }
  return out;
}

/** Silhouette : étendue horizontale du monument par tranche de hauteur (arrondie au quart de mètre). */
function silhouette(g: Geo): string {
  const vs = sommets(g);
  const haut = Math.max(...vs.map((v) => v.y));
  const bas = Math.min(...vs.map((v) => v.y));
  const tranches = 14;
  const lignes: string[] = [];
  for (let k = 0; k < tranches; k++) {
    const y0 = bas + ((haut - bas) * k) / tranches,
      y1 = bas + ((haut - bas) * (k + 1)) / tranches;
    const dans = vs.filter((v) => v.y >= y0 - 1e-9 && v.y <= y1 + 1e-9);
    if (dans.length === 0) {
      lignes.push("-");
      continue;
    }
    const q = (n: number) => Math.round(n * 4) / 4;
    lignes.push(
      [Math.min(...dans.map((v) => v.x)), Math.max(...dans.map((v) => v.x)), Math.min(...dans.map((v) => v.z)), Math.max(...dans.map((v) => v.z))]
        .map(q)
        .join(",")
    );
  }
  return lignes.join("|");
}

const PAIRES = CATALOGUE_MONUMENTS.map((m, palier) => ({ type: m.type, palier }));

describe("silhouette propre à chaque type de monument (§43)", () => {
  it("les 16 types, au même palier, donnent 16 silhouettes différentes (plus de hachage modulo 3)", () => {
    const vues = new Map<string, string>();
    for (const { type } of PAIRES) {
      const s = silhouette(construire(type, 8).g);
      expect(vues.has(s), `${type} a la même silhouette que ${vues.get(s)}`).toBe(false);
      vues.set(s, type);
    }
    expect(vues.size).toBe(16);
  });

  it("à chaque palier réel, le monument est bien plus riche en détail qu'un cylindre et deux boîtes", () => {
    for (const { type, palier } of PAIRES) {
      expect(construire(type, palier).g.n, type).toBeGreaterThan(250);
    }
  });

  it("un type inconnu (futurs mégaprojets fusionnés, §41) retombe sur une silhouette de repli, stable", () => {
    const a = construire("type_pas_encore_dessine", 3).g;
    const b = construire("type_pas_encore_dessine", 3).g;
    expect(a.n).toBeGreaterThan(250);
    expect(a.V).toEqual(b.V);
    expect(a.I).toEqual(b.I);
  });

  it("la graine n'agit que sur le shader : la forme ne change pas", () => {
    const a = construire("temple_national", 13, 1).g;
    const b = construire("temple_national", 13, 777).g;
    expect(sommets(a).map((v) => [v.x, v.y, v.z])).toEqual(sommets(b).map((v) => [v.x, v.y, v.z]));
  });
});

describe("rang visuel : modeste, notable, prestigieux (§43)", () => {
  it("rangs : paliers 0-4 modestes, 5-9 notables, 10-15 prestigieux", () => {
    expect(PAIRES.map((p) => rangMonument(p.palier))).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2]);
  });

  it("plus le rang est haut, plus le détail est riche : tout prestigieux dépasse tout modeste", () => {
    const n = (r: number) => PAIRES.filter((p) => rangMonument(p.palier) === r).map((p) => construire(p.type, p.palier).g.n);
    const [modestes, notables, prestigieux] = [n(0), n(1), n(2)];
    expect(Math.min(...prestigieux)).toBeGreaterThan(Math.max(...modestes));
    const moy = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
    expect(moy(notables)).toBeGreaterThan(moy(modestes));
    expect(moy(prestigieux)).toBeGreaterThan(moy(notables));
  });

  it("seuls les prestigieux ont leurs quatre lampadaires d'angle, éclairés la nuit (MAT.LAMP)", () => {
    const lampes = (type: string, palier: number) => sommets(construire(type, palier).g).filter((v) => v.m === MAT.LAMP).length;
    for (const { type, palier } of PAIRES.filter((p) => rangMonument(p.palier) === 2)) {
      expect(lampes(type, palier), type).toBeGreaterThanOrEqual(4 * 20); // une lanterne = une boîte = 5 faces = 20 sommets
    }
    // Les modestes n'en ont pas, à une exception près : le banc, qui a son propre lampadaire.
    for (const { type, palier } of PAIRES.filter((p) => rangMonument(p.palier) === 0 && p.type !== "banc_public")) {
      expect(lampes(type, palier), type).toBe(0);
    }
  });

  it("le métal est un bronze patiné (MAT.BRONZE) chez les modestes, un or poli (MAT.OR) à partir des notables", () => {
    // Retour d'Adrien du 05/10/2026 (« trop simplistes et pas assez beaux ») : de vraies matières de métal (shaders.ts) au lieu
    // d'une peinture jaune unie ; la signature or et bronze du §43 reste.
    const compte = (type: string, palier: number, m: number) => sommets(construire(type, palier).g).filter((v) => v.m === m).length;
    for (const { type, palier } of PAIRES) {
      if (rangMonument(palier) === 0) {
        expect(compte(type, palier, MAT.OR), type).toBe(0);
        expect(compte(type, palier, MAT.BRONZE), type).toBeGreaterThan(0);
      } else expect(compte(type, palier, MAT.OR), type).toBeGreaterThan(0);
      // Plus de « peinture » jaune unie sur un monument.
      expect(compte(type, palier, MAT.PAINT), type).toBe(0);
    }
  });

  it("la pierre est une vraie matière : pierre de taille chez les modestes, marbre veiné ensuite", () => {
    const compte = (type: string, palier: number, m: number) => sommets(construire(type, palier).g).filter((v) => v.m === m).length;
    for (const { type, palier } of PAIRES) {
      if (rangMonument(palier) === 0) expect(compte(type, palier, MAT.PIERRE), type).toBeGreaterThan(0);
      else expect(compte(type, palier, MAT.MARBRE), type).toBeGreaterThan(0);
    }
  });

  it("le nombre de marches du socle grandit avec le rang (1, 2 puis 3 gradins)", () => {
    // Un gradin = un disque pavé (MAT.PAVING) à sa propre hauteur : on compte les hauteurs distinctes.
    const gradins = (palier: number) => {
      const ys = new Set(
        sommets(construire("obelisque", palier).g)
          .filter((v) => v.m === MAT.PAVING && v.y < 3)
          .map((v) => v.y.toFixed(3))
      );
      return ys.size;
    };
    expect(gradins(2)).toBe(1);
    expect(gradins(7)).toBe(2);
    expect(gradins(12)).toBe(3);
  });
});

describe("la teinte or/bronze reste la signature commune (§43)", () => {
  it("l'échelle du métal va du bronze à l'or poli, toujours dans les tons chauds (rouge > vert > bleu), en s'éclaircissant", () => {
    const lum = (c: number[]) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
    let prec = -1;
    for (let palier = 0; palier <= 15; palier++) {
      const c = couleurMetal(palier / 15);
      expect(c[0], `palier ${palier}`).toBeGreaterThan(c[1]);
      expect(c[1], `palier ${palier}`).toBeGreaterThan(c[2] + 0.1);
      expect(lum(c)).toBeGreaterThanOrEqual(prec - 1e-9);
      prec = lum(c);
    }
    expect(lum(couleurMetal(1))).toBeGreaterThan(lum(couleurMetal(0)));
  });

  it("chaque monument est dominé par des tons chauds (or, bronze, grès doré, flammes), pas par de la pierre grise", () => {
    for (const { type, palier } of PAIRES) {
      const vs = sommets(construire(type, palier).g);
      const chauds = vs.filter((v) => v.c[0] > v.c[1] && v.c[1] > v.c[2] && v.c[0] - v.c[2] > 0.15).length;
      expect(chauds / vs.length, type).toBeGreaterThan(0.3);
    }
  });
});

describe("chaque monument reste dans son emprise et sous la hauteur de son gabarit (§43, §49)", () => {
  it("à l'intérieur du cercle du socle, au-dessus du sol, sous la hauteur du gabarit, sans valeur absurde", () => {
    for (const { type, palier } of PAIRES) {
      const { g, ao } = construire(type, palier);
      const { rayon: rSocle, hauteur } = gabaritMonument(type, palier);
      const sommet = 0.15 + hauteur;
      const vs = sommets(g);
      for (const v of vs) {
        expect(Number.isFinite(v.x + v.y + v.z), type).toBe(true);
      }
      expect(Math.max(...vs.map((v) => Math.hypot(v.x, v.z))), `${type} déborde de son socle`).toBeLessThanOrEqual(rSocle + 1e-6);
      expect(Math.min(...vs.map((v) => v.y)), type).toBeGreaterThanOrEqual(0.15 - 1e-9);
      const haut = Math.max(...vs.map((v) => v.y));
      expect(haut, `${type} dépasse la hauteur de son gabarit`).toBeLessThanOrEqual(sommet + 1e-6);
      expect(haut, `${type} n'utilise pas sa hauteur`).toBeGreaterThan(sommet * 0.9);
      expect(ao).toHaveLength(1);
      for (const i of g.I) expect(i >= 0 && i < g.n).toBe(true);
    }
  });
});
