import { describe, expect, it } from "vitest";
import { MAT } from "@/lib/ville3d/constantes";
import { Geo } from "@/lib/ville3d/geometrie";
import { membre, tore, tourVrillee, type V3 } from "@/lib/ville3d/monumentsFormes";
import { buildMonument, gabaritMonument } from "@/lib/ville3d/monuments";
import { CATALOGUE_MONUMENTS } from "@/lib/game/monuments";

/**
 * Retour d'Adrien du 05/10/2026 (suite du §49 A+B) : « certains monuments ne sont pas assez bien faits, fais des
 * choses avec plus de détail et atypiques ». Dix monuments sont redessinés avec de nouvelles briques : membres
 * inclinés (bras, jambes, rayons), tores (anneaux de sphères armillaires, orbites) et tours vrillées.
 */
const STRIDE = 13;
const sommets = (g: Geo) => {
  const out: { p: V3; n: V3 }[] = [];
  for (let i = 0; i < g.n; i++) out.push({ p: [g.V[i * STRIDE], g.V[i * STRIDE + 1], g.V[i * STRIDE + 2]], n: [g.V[i * STRIDE + 3], g.V[i * STRIDE + 4], g.V[i * STRIDE + 5]] });
  return out;
};
const longueur = (v: V3) => Math.hypot(v[0], v[1], v[2]);
const BRONZE: [number, number, number] = [0.6, 0.4, 0.2];

describe("briques des formes atypiques", () => {
  it("membre : un cylindre effilé entre deux points quelconques, normales unitaires, indices valides", () => {
    const g = new Geo();
    const a: V3 = [1, 2, 3],
      b: V3 = [4, 9, -2];
    membre(g, a, b, 0.5, 0.2, BRONZE, 0, { seg: 8, calotteA: true, calotteB: true });
    expect(g.n).toBeGreaterThan(18);
    for (const i of g.I) expect(i >= 0 && i < g.n).toBe(true);
    const axe: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const L = longueur(axe);
    for (const { p, n } of sommets(g)) {
      expect(longueur(n)).toBeCloseTo(1, 6);
      // Tout sommet est dans la tranche entre les deux extrémités, à une distance de l'axe d'au plus le grand rayon.
      const v: V3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
      const t = (v[0] * axe[0] + v[1] * axe[1] + v[2] * axe[2]) / (L * L);
      expect(t).toBeGreaterThanOrEqual(-1e-9);
      expect(t).toBeLessThanOrEqual(1 + 1e-9);
      const perp = longueur([v[0] - axe[0] * t, v[1] - axe[1] * t, v[2] - axe[2] * t]);
      expect(perp).toBeLessThanOrEqual(0.5 + 1e-9);
      if (perp > 1e-9) expect(perp).toBeCloseTo(0.5 + (0.2 - 0.5) * t, 6); // le rayon varie linéairement (hors centres des calottes)
    }
  });

  it("membre vertical comme horizontal : pas de base dégénérée", () => {
    for (const b of [
      [0, 5, 0],
      [5, 0, 0],
      [0, 0, 5],
      [0, -5, 0],
    ] as V3[]) {
      const g = new Geo();
      membre(g, [0, 0, 0], b, 0.3, 0.3, BRONZE, 0);
      expect(g.V.every(Number.isFinite)).toBe(true);
      expect(g.n).toBe(18);
    }
  });

  it("tore : un anneau de rayon R et de section r autour de son axe, normales unitaires", () => {
    const g = new Geo();
    const c: V3 = [2, 3, 4];
    const axe: V3 = [0.3, 1, -0.2];
    tore(g, c, 3, 0.25, axe, BRONZE, 0, { seg: 24, segTube: 6 });
    const na = longueur(axe);
    const ax: V3 = [axe[0] / na, axe[1] / na, axe[2] / na];
    for (const { p, n } of sommets(g)) {
      expect(longueur(n)).toBeCloseTo(1, 6);
      const v: V3 = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
      const h = v[0] * ax[0] + v[1] * ax[1] + v[2] * ax[2]; // hauteur au-dessus du plan de l'anneau
      const radial = Math.hypot(v[0] - ax[0] * h, v[1] - ax[1] * h, v[2] - ax[2] * h);
      // La section est un cercle de rayon r centré à R du centre.
      expect(Math.hypot(radial - 3, h)).toBeCloseTo(0.25, 6);
    }
  });

  it("tourVrillee : la section tourne de `torsion` sur la hauteur, normales vers l'extérieur, sommet plat", () => {
    const g = new Geo();
    const torsion = Math.PI;
    tourVrillee(g, 0, 0, 0, 2, 1, 20, torsion, 10, BRONZE, [0.9, 0.7, 0.3], 0);
    const vs = sommets(g);
    // La base est un carré de demi-côté 2 (rayon des coins 2√2), le haut un carré de demi-côté 1 tourné d'un demi-tour.
    const bas = vs.filter((v) => v.p[1] < 1e-9);
    const haut = vs.filter((v) => Math.abs(v.p[1] - 20) < 1e-9 && v.n[1] !== 1);
    for (const v of bas) expect(Math.hypot(v.p[0], v.p[2])).toBeCloseTo(2 * Math.SQRT2, 6);
    for (const v of haut) expect(Math.hypot(v.p[0], v.p[2])).toBeCloseTo(Math.SQRT2, 6);
    // Une tour vrillée d'un demi-tour a ses coins du haut face à ceux du bas (angle + 180°) : la section carrée tourne vraiment.
    const angleBas = Math.atan2(bas[0].p[2], bas[0].p[0]);
    const coinsHaut = haut.map((v) => Math.atan2(v.p[2], v.p[0]));
    const attendu = angleBas + torsion;
    expect(coinsHaut.some((a) => Math.abs(Math.cos(a - attendu) - 1) < 1e-6)).toBe(true);
    // Les faces latérales regardent vers l'extérieur de la tour ; la face du haut regarde en l'air.
    for (const v of vs) {
      if (v.n[1] === 1) continue;
      expect(v.n[0] * v.p[0] + v.n[2] * v.p[2]).toBeGreaterThan(-1e-9);
    }
    expect(vs.some((v) => v.n[1] === 1 && Math.abs(v.p[1] - 20) < 1e-9)).toBe(true);
    for (const i of g.I) expect(i >= 0 && i < g.n).toBe(true);
  });

  it("tourVrillee sans sommet plat quand la tour finit en pointe (w1 = 0)", () => {
    const g = new Geo();
    tourVrillee(g, 0, 0, 0, 2, 0, 5, 0, 1, BRONZE, BRONZE, 0, { angle0: 1 });
    expect(sommets(g).some((v) => v.n[1] === 1)).toBe(false);
  });
});

describe("monuments atypiques", () => {
  const construire = (type: string) => {
    const palier = CATALOGUE_MONUMENTS.findIndex((m) => m.type === type);
    const g = new Geo();
    buildMonument(g, 0, 0, type, palier, [], 1);
    return { g, palier, gab: gabaritMonument(type, palier) };
  };

  it("le colosse enjambe un passage : entre ses jambes, au-dessus des socles, il n'y a rien", () => {
    const { g, gab } = construire("statue_geante");
    const vs = sommets(g);
    const basses = vs.filter((v) => v.p[1] > 4 && v.p[1] < 0.25 * gab.hauteur);
    expect(basses.length).toBeGreaterThan(200); // les jambes sont bien là
    const dansLePassage = basses.filter((v) => Math.abs(v.p[0]) < 1 && Math.abs(v.p[2]) < 2);
    expect(dansLePassage).toHaveLength(0);
  });

  it("l'obélisque vrille : à deux hauteurs du fût, les coins ne sont pas aux mêmes angles", () => {
    const { g, gab } = construire("obelisque");
    const angles = (y0: number, y1: number) =>
      sommets(g)
        .filter((v) => v.p[1] > y0 && v.p[1] < y1 && Math.hypot(v.p[0], v.p[2]) > 0.8)
        .map((v) => Math.atan2(v.p[2], v.p[0]));
    const bas = angles(0.3 * gab.hauteur, 0.31 * gab.hauteur);
    const haut = angles(0.6 * gab.hauteur, 0.61 * gab.hauteur);
    // Un obélisque droit aurait les mêmes angles de coin à toute hauteur (multiples de 90° + 45°).
    expect(bas.length).toBeGreaterThan(0);
    expect(haut.length).toBeGreaterThan(0);
    expect(Math.max(...bas.map((a) => Math.min(...haut.map((b) => Math.abs(Math.cos(a - b) - 1)))))).toBeGreaterThan(0.02);
  });

  it("les tours vrillées (observatoire, monument ultime) ont un cordon de lumière ou un sommet éclairé : MAT.LAMP présent", () => {
    for (const type of ["tour_observatoire", "monument_ultime"]) {
      const { g } = construire(type);
      let lampes = 0;
      for (let i = 0; i < g.n; i++) if (g.V[i * STRIDE + 9] === MAT.LAMP) lampes++;
      expect(lampes, type).toBeGreaterThan(0);
    }
  });
});
