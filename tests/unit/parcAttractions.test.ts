import { describe, expect, it } from "vitest";
import { rngFrom } from "@/lib/ville3d/aleatoire";
import { MAT } from "@/lib/ville3d/constantes";
import { Geo } from "@/lib/ville3d/geometrie";
import { generate } from "@/lib/ville3d/generer";
import { buildMegaprojet, tailleMegaprojet } from "@/lib/ville3d/megaprojets";
import { BASE, NIVEAU_LOISIRS_MAX, niveauLoisirs } from "@/lib/ville3d/megaprojetsFormes";
import { NB_DISPOSITIONS_PARC, varianteParc } from "@/lib/ville3d/megaprojetsParc";
import { EMPRISE_MONTAGNES, circuitMontagnes, longueurCircuit } from "@/lib/ville3d/montagnesRusses";
import type { VocationQuartier } from "@/lib/ville3d/quartiers";

/**
 * Parc d'attractions (3ᵉ consigne du 05/10/2026, retour d'Adrien du 05/10/2026) : « beaucoup plus de détail (entrée monumentale, vraies
 * montagnes russes avec rails et wagons, chute libre, chaises volantes, manège, autos tamponneuses, allées sinueuses,
 * éclairage de nuit, plusieurs dispositions selon la graine). Il s'étoffe avec le niveau du quartier Loisirs. »
 */
const STRIDE = 13;
const T = tailleMegaprojet("grand_stade", 4);

function parc(seed: number, niveau?: number) {
  const g = new Geo();
  const glow: { x: number; z: number }[] = [];
  buildMegaprojet(g, 0, 0, "grand_stade", 4, rngFrom("parc|" + seed), [], seed, Infinity, glow, niveau);
  return { g, glow };
}

/** Les sommets d'une géométrie, un par chaîne (position, matière, couleur, graine) : pour comparer deux niveaux. */
function sommets(g: Geo): string[] {
  const out: string[] = [];
  for (let i = 0; i < g.n; i++) out.push([0, 1, 2, 6, 7, 8, 9].map((k) => g.V[i * STRIDE + k].toFixed(3)).join(","));
  return out;
}

function comptes(g: Geo) {
  const m = new Map<number, number>();
  for (let i = 0; i < g.n; i++) m.set(g.V[i * STRIDE + 9], (m.get(g.V[i * STRIDE + 9]) ?? 0) + 1);
  return m;
}

describe("le circuit de montagnes russes", () => {
  const pts = circuitMontagnes();
  const n = pts.length;
  const cum = [0];
  for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i % n][0] - pts[i - 1][0], pts[i % n][1] - pts[i - 1][1], pts[i % n][2] - pts[i - 1][2]));

  it("est une courbe fermée d'environ 250 m, échantillonnée finement (jamais plus de 2,5 m entre deux points)", () => {
    expect(n).toBeGreaterThan(100);
    expect(longueurCircuit(pts)).toBeGreaterThan(220);
    expect(longueurCircuit(pts)).toBeLessThan(280);
    for (let i = 0; i < n; i++) expect(Math.hypot(pts[(i + 1) % n][0] - pts[i][0], pts[(i + 1) % n][1] - pts[i][1], pts[(i + 1) % n][2] - pts[i][2])).toBeLessThan(2.5);
  });

  it("tient dans son emprise de 52 × 44 m et monte à plus de 30 m (sous la plus petite tour)", () => {
    const xs = pts.map((p) => p[0]),
      ys = pts.map((p) => p[1]),
      zs = pts.map((p) => p[2]);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(EMPRISE_MONTAGNES.largeur);
    expect(Math.min(...zs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...zs)).toBeLessThanOrEqual(EMPRISE_MONTAGNES.profondeur);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(1.5); // la voie ne passe jamais sous le sol
    expect(Math.max(...ys)).toBeGreaterThan(30);
    expect(Math.max(...ys)).toBeLessThan(40);
  });

  it("ne se recoupe jamais : deux points éloignés de plus de 10 m le long de la voie sont à plus de 2,5 m l'un de l'autre (looping compris)", () => {
    const L = cum[n];
    let min = Infinity;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const s = Math.min(cum[j] - cum[i], L - (cum[j] - cum[i]));
        if (s < 10) continue;
        min = Math.min(min, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1], pts[i][2] - pts[j][2]));
      }
    expect(min).toBeGreaterThan(2.5);
  });

  it("a un vrai looping : une boucle verticale où la voie dépasse la verticale (la hauteur monte de plus de 10 m sur moins de 14 m de plan)", () => {
    let trouve = false;
    for (let i = 0; i < n && !trouve; i++)
      for (let j = i + 1; j < Math.min(n, i + 22); j++) {
        const dy = pts[j][1] - pts[i][1],
          plan = Math.hypot(pts[j][0] - pts[i][0], pts[j][2] - pts[i][2]);
        if (dy > 10 && plan < 5) trouve = true;
      }
    expect(trouve).toBe(true);
  });
});

describe("les dispositions du parc (la graine du site)", () => {
  it("varianteParc : deux gabarits et huit symétries, soit seize dispositions, toutes atteintes", () => {
    expect(NB_DISPOSITIONS_PARC).toBe(16);
    const vus = new Set<string>();
    for (let seed = 50; seed < 950; seed++) {
      const v = varianteParc(seed);
      expect(v.gabarit).toBeGreaterThanOrEqual(0);
      expect(v.gabarit).toBeLessThan(2);
      expect(v.symetrie).toBeGreaterThanOrEqual(0);
      expect(v.symetrie).toBeLessThan(8);
      vus.add(v.gabarit + "/" + v.symetrie);
    }
    expect(vus.size).toBe(16);
    // Fonction pure.
    expect(varianteParc(321)).toEqual(varianteParc(321));
  });

  it("les seize dispositions donnent seize géométries différentes, toutes dans l'emprise de la plateforme et sous la hauteur permise", () => {
    const signatures = new Set<string>();
    for (let seed = 0; seed < 16; seed++) {
      const { g } = parc(seed);
      let h = 0;
      for (let i = 0; i < g.n; i++) {
        const x = g.V[i * STRIDE],
          y = g.V[i * STRIDE + 1],
          z = g.V[i * STRIDE + 2];
        expect(Math.abs(x), `seed ${seed} x`).toBeLessThanOrEqual(T.R + 0.05);
        expect(Math.abs(z), `seed ${seed} z`).toBeLessThanOrEqual(T.Rz + 0.05);
        h = Math.max(h, y - BASE);
      }
      expect(h, `seed ${seed}`).toBeLessThanOrEqual(T.H + 1e-6);
      signatures.add(sommets(g).slice(0, 3000).join("|"));
    }
    expect(signatures.size).toBe(16);
  });

  it("à graine égale, la géométrie est la même (déterministe)", () => {
    expect(sommets(parc(7).g)).toEqual(sommets(parc(7).g));
  });
});

describe("le parc s'étoffe avec le niveau du quartier Loisirs, sans jamais rien déplacer", () => {
  it("niveauLoisirs : 0 sans stade de loisirs, 1 de un à deux, 2 de trois à cinq, 3 à partir de six", () => {
    expect([0, 1, 2, 3, 5, 6, 40].map(niveauLoisirs)).toEqual([0, 1, 1, 2, 2, 3, 3]);
    expect(NIVEAU_LOISIRS_MAX).toBe(3);
    let precedent = 0;
    for (let n = 0; n < 30; n++) {
      expect(niveauLoisirs(n)).toBeGreaterThanOrEqual(precedent);
      precedent = niveauLoisirs(n);
    }
  });

  it("plus le niveau monte, plus il y a de sommets ; sans niveau (tests, showroom) c'est le niveau maximal", () => {
    for (const seed of [3, 10]) {
      const n = [0, 1, 2, 3].map((nv) => parc(seed, nv).g.n);
      for (let k = 1; k < 4; k++) expect(n[k], `seed ${seed} niveau ${k}`).toBeGreaterThan(n[k - 1]);
      expect(parc(seed).g.n).toBe(n[3]);
    }
  });

  it("tout ce qui existe à un niveau existe, à l'identique, au niveau suivant : un objet posé ne bouge plus", () => {
    for (const seed of [4, 9, 12]) {
      const niveaux = [0, 1, 2, 3].map((nv) => sommets(parc(seed, nv).g));
      for (let k = 0; k < 3; k++) {
        const suivant = new Map<string, number>();
        for (const v of niveaux[k + 1]) suivant.set(v, (suivant.get(v) ?? 0) + 1);
        let manquants = 0;
        for (const v of niveaux[k]) {
          const c = suivant.get(v) ?? 0;
          if (c === 0) manquants++;
          else suivant.set(v, c - 1);
        }
        expect(manquants, `seed ${seed} : niveau ${k} → ${k + 1}`).toBe(0);
      }
    }
  });

  it("les attractions arrivent dans l'ordre promis : montagnes russes et chaises au niveau 1, chute libre et autos au 2, bateau pirate et lac au 3", () => {
    const eau = (nv: number) => comptes(parc(2, nv).g).get(MAT.WATER) ?? 0;
    const peinture = (nv: number) => comptes(parc(2, nv).g).get(MAT.PAINT) ?? 0;
    const parking = (nv: number) => comptes(parc(2, nv).g).get(MAT.PARKING) ?? 0;
    // Le lac (eau) n'arrive qu'au niveau 3 ; les autos tamponneuses (piste en MAT.PARKING) au niveau 2.
    expect(eau(2)).toBe(eau(0));
    expect(eau(3)).toBeGreaterThan(eau(2));
    expect(parking(1)).toBe(parking(0));
    expect(parking(2)).toBeGreaterThan(parking(1));
    // Chaque niveau ajoute de la peinture (rails, nacelles, wagons...).
    for (let k = 1; k < 4; k++) expect(peinture(k)).toBeGreaterThan(peinture(k - 1));
  });
});

describe("l'éclairage de nuit du parc", () => {
  it("ampoules de couleur partout (MAT.BEACON), lampadaires le long des allées (MAT.LAMP) et des centaines de lueurs au sol", () => {
    const { g, glow } = parc(5);
    const m = comptes(g);
    expect(m.get(MAT.BEACON) ?? 0).toBeGreaterThan(2000);
    expect(m.get(MAT.LAMP) ?? 0).toBeGreaterThan(40 * 20);
    expect(glow.length).toBeGreaterThan(300);
    for (const l of glow) {
      expect(Math.abs(l.x)).toBeLessThanOrEqual(T.R + 1);
      expect(Math.abs(l.z)).toBeLessThanOrEqual(T.Rz + 1);
    }
  });

  it("même au niveau 0 le parc est éclairé : entrée, fontaine et allées", () => {
    const { g, glow } = parc(5, 0);
    expect(comptes(g).get(MAT.BEACON) ?? 0).toBeGreaterThan(300);
    expect(comptes(g).get(MAT.LAMP) ?? 0).toBeGreaterThan(0);
    expect(glow.length).toBeGreaterThan(200);
  });
});

describe("le niveau du quartier Loisirs dans la ville (generate)", () => {
  const loisirs = new Map<number, VocationQuartier>(Array.from({ length: 160 }, (_, i) => [i, "loisirs" as VocationQuartier]));
  const mega = [{ palier: 31, type: "grand_stade", activite: "loisirs" }];

  it("une ville sans quartier Loisirs n'a aucun stade de loisirs ; une ville de Loisirs en a, et son parc est plus riche", () => {
    const sans = generate("ville-a", 60_000, new Map<number, VocationQuartier>(), 0, mega, 0, [], "classique", 0);
    const avec = generate("ville-a", 60_000, loisirs, 0, mega, 0, [], "classique", 0);
    expect(sans.stats.stadesLoisirs ?? 0).toBe(0);
    expect(avec.stats.stadesLoisirs ?? 0).toBeGreaterThanOrEqual(6);
    expect(niveauLoisirs(avec.stats.stadesLoisirs ?? 0)).toBe(3);
    // Le parc au niveau 0 (ville sans Loisirs) est plus pauvre : moins de sommets au total à ville égale (les blocs Loisirs changent
    // aussi la ville, on compare donc le parc seul dans les tests précédents) ; ici on vérifie seulement que la scène se génère.
    expect(sans.g.n).toBeGreaterThan(0);
    expect(avec.g.n).toBeGreaterThan(0);
  });

  it("le niveau ne dépend que de la population et des vocations : il ne baisse jamais quand la ville grandit", () => {
    let precedent = 0;
    for (const pop of [5_000, 15_000, 30_000, 60_000]) {
      const n = niveauLoisirs(generate("ville-a", pop, loisirs, 0, [], 0, [], "classique", 0).stats.stadesLoisirs ?? 0);
      expect(n).toBeGreaterThanOrEqual(precedent);
      precedent = n;
    }
  });
});
