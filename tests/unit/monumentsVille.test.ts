import { describe, expect, it } from "vitest";
import { generate, planifierBlocs } from "@/lib/ville3d/generer";
import { casesCentrales } from "@/lib/ville3d/cases";
import { BS, LOT, PLAFOND_RENDU_POPULATION, SW, blockX0 } from "@/lib/ville3d/constantes";
import { NB_BLOCS_MONUMENTS, parcellesPourMonument, placesMonuments } from "@/lib/ville3d/monumentsVille";
import { CATALOGUE_MONUMENTS } from "@/lib/game/monuments";
import { GABARITS, RAYON_MAX_MONUMENT, buildMonument } from "@/lib/ville3d/monuments";
import { Geo } from "@/lib/ville3d/geometrie";
import { facadesBloc } from "@/lib/ville3d/terrain";

/**
 * A-INTEGRER §33 : les monuments sont DANS la ville, près du centre, et ne bougent jamais.
 * A-INTEGRER §49 A+B : ils sont sur une PARCELLE DE FAÇADE, au bord de la rue (un jardin public du
 * pourtour d'un bloc), plus dans les cours ; un par bloc, dans les 16 blocs les plus centraux.
 */
const PALIERS = CATALOGUE_MONUMENTS.map((_, i) => i);
const CLES = ["ville-a", "0b7c4f3e-demo", "accueil", "x1", "x2", "3f8a2c1e-7b4d-4e9a-b6c5-1d2e3f4a5b6c"];

describe("monuments sur une parcelle de façade (§33, §49 B)", () => {
  it("les 16 monuments se partagent les 16 blocs les plus centraux : un par bloc", () => {
    expect(NB_BLOCS_MONUMENTS).toBe(PALIERS.length);
    for (const cle of CLES) {
      const places = placesMonuments(cle, PALIERS);
      expect(places.size).toBe(16);
      const blocs = [...places.values()].map((p) => p.bi + "," + p.bj);
      expect(new Set(blocs).size).toBe(16);
      expect(new Set(blocs)).toEqual(new Set(casesCentrales(cle, 16).map((c) => c.bi + "," + c.bj)));
    }
  });

  it("le monument est sur une parcelle du pourtour de son bloc, jamais dans la cour : au bord de la rue", () => {
    for (const cle of CLES) {
      for (const p of placesMonuments(cle, PALIERS).values()) {
        const bx = blockX0(p.bi),
          bz = blockX0(p.bj);
        // Parcelle du pourtour : sur la première ou la dernière colonne, ou rangée, de la grille 4 × 4.
        expect(p.lc === 0 || p.lc === 3 || p.lr === 0 || p.lr === 3, `${cle} ${p.bi},${p.bj}`).toBe(true);
        const [x0, z0, x1, z1] = p.rect;
        // Le centre de la parcelle est à une demi-parcelle d'un trottoir du bloc : à moins de 3 + 14,5 + 7,25 m du bord.
        expect(Math.min(p.x - bx, bx + BS - p.x, p.z - bz, bz + BS - p.z)).toBeCloseTo(SW + LOT / 2, 9);
        expect(x1 - x0).toBeCloseTo(LOT, 9);
        expect(z1 - z0).toBeCloseTo(LOT, 9);
        expect(p.x).toBeCloseTo((x0 + x1) / 2, 9);
        expect(p.z).toBeCloseTo((z0 + z1) / 2, 9);
      }
    }
  });

  it("la façade du monument regarde la rue : le côté de sa parcelle qui touche le bord du bloc", () => {
    for (const cle of CLES) {
      for (const p of placesMonuments(cle, PALIERS).values()) {
        const surLeBord = { "-z": p.lr === 0, "+z": p.lr === 3, "-x": p.lc === 0, "+x": p.lc === 3 }[p.front];
        expect(surLeBord, `${cle} ${p.bi},${p.bj} lot ${p.lc},${p.lr} front ${p.front}`).toBe(true);
      }
    }
  });

  it("c'est un jardin public à la place duquel il se pose : jamais une maison, un immeuble, le parking ni le gratte-ciel", () => {
    for (const cle of CLES) {
      for (const p of placesMonuments(cle, PALIERS).values()) {
        const { lots, parkingIdx } = facadesBloc(cle, p.bi, p.bj);
        const lot = lots.find((l) => l.lc === p.lc && l.lr === p.lr);
        expect(lot, `${cle} ${p.bi},${p.bj}`).toBeDefined();
        // Les rangs 0 à 3 sont les maisons, 4 et 5 les immeubles : un monument n'en déloge aucun.
        expect(lot!.idx).toBeGreaterThanOrEqual(6);
        expect(lot!.idx).not.toBe(parkingIdx);
        expect(parcellesPourMonument(cle, p.bi, p.bj).map((l) => l.idx)).toContain(lot!.idx);
      }
    }
  });

  it("deux monuments ne se touchent jamais, même les plus grands : un bloc de 64 m les sépare", () => {
    for (const cle of CLES) {
      const places = [...placesMonuments(cle, PALIERS).values()];
      for (let i = 0; i < places.length; i++)
        for (let j = i + 1; j < places.length; j++) {
          expect(Math.hypot(places[i].x - places[j].x, places[i].z - places[j].z)).toBeGreaterThan(2 * RAYON_MAX_MONUMENT);
        }
    }
  });

  it("le plus grand monument tient dans sa parcelle de 14,5 m", () => {
    const rayonMax = Math.max(...Object.values(GABARITS).map((g) => g.rayon));
    expect(rayonMax).toBeLessThanOrEqual(RAYON_MAX_MONUMENT);
    expect(2 * rayonMax).toBeLessThan(LOT);
  });

  it("la position d'un palier ne dépend ni des autres paliers débloqués ni de la population", () => {
    for (const cle of CLES) {
      const tous = placesMonuments(cle, PALIERS);
      for (const palier of [0, 9, 14]) expect(placesMonuments(cle, [palier]).get(palier)).toEqual(tous.get(palier));
    }
    // Même case quelle que soit la population : les cases centrales ne dépendent que de la graine.
    const petite = planifierBlocs("ville-a", 300).blocks.slice(0, 16).map((b) => b.bi + "," + b.bj);
    const grande = planifierBlocs("ville-a", PLAFOND_RENDU_POPULATION).blocks.slice(0, 16).map((b) => b.bi + "," + b.bj);
    expect(petite).toEqual(grande);
    expect(petite).toEqual(casesCentrales("ville-a", 16).map((c) => c.bi + "," + c.bj));
  });

  it("les monuments sont à l'intérieur de la ville (la plus petite enveloppe de blocs) : à moins de 3 blocs du centre", () => {
    for (const cle of CLES) {
      for (const p of placesMonuments(cle, PALIERS).values()) {
        expect(Math.max(Math.abs(p.x), Math.abs(p.z))).toBeLessThan(3 * 80);
      }
    }
  });

  describe("dans la scène", () => {
    const monumentsDe = (paliers: number[]) => paliers.map((palier) => ({ palier, type: CATALOGUE_MONUMENTS[palier].type }));
    const dansLaParcelle = (rect: [number, number, number, number]) => (r: { x0: number; z0: number; x1: number; z1: number }) =>
      r.x0 >= rect[0] - 0.01 && r.x1 <= rect[2] + 0.01 && r.z0 >= rect[1] - 0.01 && r.z1 <= rect[3] + 0.01;

    it("le monument remplace le jardin public de sa parcelle, et rien d'autre : maisons, immeubles, tour et cour restent exactement les mêmes", () => {
      const cle = "ville-a";
      const place = placesMonuments(cle, [3]).get(3)!;
      const sans = generate(cle, PLAFOND_RENDU_POPULATION);
      const avec = generate(cle, PLAFOND_RENDU_POPULATION, undefined, 0, [], 0, monumentsDe([3]));
      const dedans = dansLaParcelle(place.rect);
      // Hors de la parcelle : mêmes empreintes au sol (maisons, immeubles, arbres, cour...), à l'unité près.
      expect(avec.ao.filter((r) => !dedans(r))).toEqual(sans.ao.filter((r) => !dedans(r)));
      // Dans la parcelle : le jardin (arbres, bancs) a laissé la place au monument et à sa place pavée.
      expect(avec.ao.filter(dedans).some((r) => r.h > 0)).toBe(true);
      expect(sans.ao.filter(dedans).every((r) => r.h === 0)).toBe(true);
    });

    it("la cour du bloc n'est plus réservée aux monuments : elle garde sa fontaine et ses arbres", () => {
      const cle = "ville-a";
      const place = placesMonuments(cle, [3]).get(3)!;
      const sans = generate(cle, PLAFOND_RENDU_POPULATION);
      const avec = generate(cle, PLAFOND_RENDU_POPULATION, undefined, 0, [], 0, monumentsDe([3]));
      const bx = blockX0(place.bi),
        bz = blockX0(place.bj);
      const cour = (r: { x0: number; z0: number; x1: number; z1: number }) =>
        r.x0 > bx + SW + LOT - 0.01 && r.x1 < bx + SW + 3 * LOT + 0.01 && r.z0 > bz + SW + LOT - 0.01 && r.z1 < bz + SW + 3 * LOT + 0.01;
      expect(avec.ao.filter(cour)).toEqual(sans.ao.filter(cour));
      expect(avec.ao.filter(cour).length).toBeGreaterThan(0);
    });

    it("un monument s'affiche aussi sur une friche (bloc pas encore ouvert) : sa place pavée vient avec lui", () => {
      const cle = "ville-a";
      const place = placesMonuments(cle, [14]).get(14)!;
      const ville = generate(cle, 300, undefined, 0, [], 0, monumentsDe([14]));
      const dedans = dansLaParcelle(place.rect);
      const empreintes = ville.ao.filter(dedans);
      // Le monument lui-même (h = 56 m) et ses quatre jardinières d'angle.
      expect(empreintes.some((r) => r.h > 50)).toBe(true);
      expect(empreintes.filter((r) => r.h === 0).length).toBeGreaterThanOrEqual(4);
    });

    it("la génération est déterministe avec des monuments", () => {
      const a = generate("ville-a", 30000, undefined, 0, [], 0, monumentsDe(PALIERS));
      const b = generate("ville-a", 30000, undefined, 0, [], 0, monumentsDe(PALIERS));
      expect(b.g.V).toEqual(a.g.V);
      expect(b.g.I).toEqual(a.g.I);
      expect(a.g.V.length).toBeGreaterThan(generate("ville-a", 30000).g.V.length);
    });
  });
});

describe("orientation : la façade du monument regarde la rue de sa parcelle (§49 B)", () => {
  const sommets = (g: Geo) => {
    const out: { x: number; y: number; z: number; nx: number; nz: number }[] = [];
    for (let i = 0; i < g.n; i++) out.push({ x: g.V[i * 13], y: g.V[i * 13 + 1], z: g.V[i * 13 + 2], nx: g.V[i * 13 + 3], nz: g.V[i * 13 + 5] });
    return out;
  };
  const construire = (type: string, palier: number, front: "+z" | "-z" | "+x" | "-x", cx = 0, cz = 0) => {
    const g = new Geo();
    buildMonument(g, cx, cz, type, palier, [], 1, front);
    return g;
  };

  it("+z est la construction d'origine ; les trois autres côtés sont des rotations de 90° autour du centre", () => {
    for (const [type, palier] of [
      ["statue_geante", 14],
      ["temple_national", 13],
      ["arc_triomphe_miniature", 5],
    ] as const) {
      const base = sommets(construire(type, palier, "+z"));
      const tourne: Record<string, (v: { x: number; z: number }) => [number, number]> = {
        "-z": (v) => [-v.x, -v.z],
        "+x": (v) => [v.z, -v.x],
        "-x": (v) => [-v.z, v.x],
      };
      for (const front of ["-z", "+x", "-x"] as const) {
        const autre = sommets(construire(type, palier, front));
        expect(autre.length).toBe(base.length);
        for (let i = 0; i < base.length; i += 7) {
          const [x, z] = tourne[front](base[i]);
          expect(autre[i].x).toBeCloseTo(x, 6);
          expect(autre[i].z).toBeCloseTo(z, 6);
          expect(autre[i].y).toBeCloseTo(base[i].y, 9);
        }
      }
    }
  });

  it("le monument se pose au centre de sa parcelle : tourner ne le décale pas", () => {
    for (const front of ["+z", "-z", "+x", "-x"] as const) {
      const vs = sommets(construire("obelisque", 4, front, 100, -40));
      const cx = (Math.min(...vs.map((v) => v.x)) + Math.max(...vs.map((v) => v.x))) / 2;
      const cz = (Math.min(...vs.map((v) => v.z)) + Math.max(...vs.map((v) => v.z))) / 2;
      expect(cx).toBeCloseTo(100, 6);
      expect(cz).toBeCloseTo(-40, 6);
    }
  });
});
