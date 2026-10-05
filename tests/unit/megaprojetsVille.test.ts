import { describe, expect, it } from "vitest";
import { generate, planifierBlocs } from "@/lib/ville3d/generer";
import { rngFrom } from "@/lib/ville3d/aleatoire";
import { Geo } from "@/lib/ville3d/geometrie";
import { buildMegaprojet } from "@/lib/ville3d/megaprojets";
import { buildCourtyard, rectCourBloc } from "@/lib/ville3d/terrain";
import { BS, CITY_R_MIN, PLAFOND_RENDU_POPULATION, blockX0 } from "@/lib/ville3d/constantes";
import { CEINTURE } from "@/lib/ville3d/emplacements";
import { indiceCaseMegaprojet, placesMegaprojets } from "@/lib/ville3d/megaprojetsVille";
import { seuilMegaprojet } from "@/lib/game/megaprojets";
import type { VocationQuartier } from "@/lib/ville3d/quartiers";

/**
 * A-INTEGRER §37 A : les mégaprojets viennent à la bordure de la ville (la
 * case juste hors de la ville quand leur palier s'ouvre), dans la cour de
 * cette case, et ne bougent plus jamais — même quand la ville les rejoint.
 */
const CLES = ["ville-a", "0b7c4f3e-demo", "accueil", "x1", "x2", "3f8a2c1e-7b4d-4e9a-b6c5-1d2e3f4a5b6c"];
const PALIERS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const VOCS: VocationQuartier[] = ["residentiel", "commerce", "industrie", "loisirs", "recherche", "services", "residentiel", "residentiel"];
/** Vocations pseudo-aléatoires mais stables, un mélange comme en production (toutes les activités, rang par rang). */
function vocationsDe(cle: string, graine: number): Map<number, VocationQuartier> {
  let h = graine;
  for (const ch of cle) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const m = new Map<number, VocationQuartier>();
  for (let rang = 0; rang < 120; rang++) {
    h = (h * 1103515245 + 12345) >>> 0;
    m.set(rang, VOCS[(h >>> 16) % VOCS.length]);
  }
  return m;
}

const normeMax = (p: { x: number; z: number }) => Math.max(Math.abs(p.x), Math.abs(p.z));

describe("mégaprojets à la bordure de la ville (§37 A)", () => {
  it("la case d'un palier est libre quand ce palier s'ouvre, quelles que soient les vocations des blocs (zonage ou non)", () => {
    for (const cle of CLES) {
      for (const palier of PALIERS) {
        const place = placesMegaprojets(cle, [palier]).get(palier)!;
        for (const graine of [1, 2, 3]) {
          for (const zonage of [0, undefined]) {
            const { blocks } = planifierBlocs(cle, seuilMegaprojet(palier), vocationsDe(cle, graine), zonage);
            const occupee = blocks.some((b) => b.active && b.bi === place.bi && b.bj === place.bj);
            expect(occupee, `${cle} palier ${palier} graine ${graine} zonage ${zonage}`).toBe(false);
          }
        }
      }
    }
  });

  it("le mégaprojet est à une à trois cases de la ville à l'ouverture de son palier, pas à 450 m", () => {
    for (const cle of CLES) {
      for (const palier of PALIERS) {
        const place = placesMegaprojets(cle, [palier]).get(palier)!;
        const { blocks } = planifierBlocs(cle, seuilMegaprojet(palier), vocationsDe(cle, 7), 0);
        const dmin = Math.min(
          ...blocks.filter((b) => b.active).map((b) => Math.max(Math.abs(b.bi - place.bi), Math.abs(b.bj - place.bj)))
        );
        expect(dmin, `${cle} palier ${palier}`).toBeGreaterThanOrEqual(1);
        expect(dmin, `${cle} palier ${palier}`).toBeLessThanOrEqual(3);
        // Paliers atteints avant le plafond de rendu : beaucoup plus près que l'ancienne ceinture fixe à 450 m.
        // (Au-delà, la ville dessinée est figée à ~400 m de rayon : les paliers suivants se rangent juste après.)
        if (palier <= 4) expect(normeMax(place), `${cle} palier ${palier}`).toBeLessThan(CEINTURE - 50);
        expect(normeMax(place)).toBeGreaterThanOrEqual(CITY_R_MIN - BS);
      }
    }
  });

  it("chaque mégaprojet est au centre de la cour de son bloc, loin des rues", () => {
    for (const cle of CLES) {
      for (const [, p] of placesMegaprojets(cle, PALIERS)) {
        const x0 = blockX0(p.bi),
          z0 = blockX0(p.bj);
        expect(p.x).toBeGreaterThan(x0 + 14);
        expect(p.x).toBeLessThan(x0 + BS - 14);
        expect(p.z).toBeGreaterThan(z0 + 14);
        expect(p.z).toBeLessThan(z0 + BS - 14);
      }
    }
  });

  it("deux paliers n'ont jamais la même case, même au-delà du plafond de rendu", () => {
    const paliers = Array.from({ length: 60 }, (_, i) => i);
    for (const cle of CLES) {
      const places = [...placesMegaprojets(cle, paliers).values()];
      expect(new Set(places.map((p) => p.bi + "," + p.bj)).size).toBe(paliers.length);
      for (let i = 0; i < places.length; i++)
        for (let j = i + 1; j < places.length; j++)
          expect(Math.hypot(places[i].x - places[j].x, places[i].z - places[j].z)).toBeGreaterThan(40);
    }
  });

  it("les indices de case croissent avec le palier (ouverture plus tardive = plus loin)", () => {
    let precedent = -1;
    for (let palier = 0; palier < 60; palier++) {
      const i = indiceCaseMegaprojet(palier);
      expect(i).toBeGreaterThan(precedent);
      precedent = i;
    }
  });

  it("la position ne dépend que de la ville et du palier : ni des autres paliers, ni de la population", () => {
    for (const cle of CLES) {
      const seul = placesMegaprojets(cle, [2]).get(2)!;
      expect(placesMegaprojets(cle, PALIERS).get(2)).toEqual(seul);
      expect(placesMegaprojets(cle, [4, 2, 0]).get(2)).toEqual(seul);
    }
  });

  it("dans la scène, le mégaprojet reste exactement au même endroit quand la ville grandit puis l'englobe", () => {
    const cle = "ville-a";
    const mega = [{ palier: 0, type: "grande_ecole", activite: "services" }];
    const place = placesMegaprojets(cle, [0]).get(0)!;
    const rSocle = 2.4;
    // Centre de l'empreinte du socle (ao), l'un des rectangles posés par buildMegaprojet().
    const empreinte = (ao: { x0: number; z0: number; x1: number; z1: number }[]) =>
      ao.filter((r) => Math.abs((r.x0 + r.x1) / 2 - place.x) < 0.01 && Math.abs((r.z0 + r.z1) / 2 - place.z) < 0.01 && Math.abs(r.x1 - r.x0 - 2 * rSocle) < 0.01);
    for (const pop of [5_000, 15_000, 40_000, 100_000, PLAFOND_RENDU_POPULATION, 9_000_000]) {
      const { ao } = generate(cle, pop, vocationsDe(cle, 5), 0, mega, 0, [], "classique", 0);
      expect(empreinte(ao).length, `population ${pop}`).toBe(1);
    }
  });

  it("rien d'autre ne se superpose au mégaprojet : ni arbre de la cour, ni de forêt, ni de friche, quelle que soit la population", () => {
    for (const cle of ["ville-a", "accueil", "x1"]) {
      const place = placesMegaprojets(cle, [0]).get(0)!;
      const mega = [{ palier: 0, type: "grande_ecole", activite: "services" }];
      for (const pop of [5_000, 15_000, 40_000, PLAFOND_RENDU_POPULATION]) {
        const { ao } = generate(cle, pop, vocationsDe(cle, 5), 0, mega, 0, [], "classique", 0);
        const rSocle = 2.4;
        const ici = ao.filter(
          (r) => r.x1 > place.x - rSocle && r.x0 < place.x + rSocle && r.z1 > place.z - rSocle && r.z0 < place.z + rSocle
        );
        // Seule l'empreinte du mégaprojet lui-même.
        expect(ici.length, `${cle} population ${pop}`).toBe(1);
      }
    }
  });

  it("quand la ville atteint la case du mégaprojet, sa cour n'est plus décorée : le bloc se construit autour", () => {
    const cle = "ville-a";
    const vocations = vocationsDe(cle, 5);
    const place = placesMegaprojets(cle, [0]).get(0)!;
    // À 250 000 habitants, la ville a dépassé la case du palier 0 : son bloc est ouvert.
    const { blocks } = planifierBlocs(cle, PLAFOND_RENDU_POPULATION, vocations, 0);
    expect(blocks.some((b) => b.active && b.bi === place.bi && b.bj === place.bj)).toBe(true);
    const sans = generate(cle, PLAFOND_RENDU_POPULATION, vocations, 0, [], 0, [], "classique", 0);
    const avec = generate(cle, PLAFOND_RENDU_POPULATION, vocations, 0, [{ palier: 0, type: "grande_ecole", activite: "services" }], 0, [], "classique", 0);
    // Géométrie du mégaprojet seul, et de la cour (fontaine, pavés, arbres) qu'il remplace.
    const gm = new Geo();
    const rm = rngFrom(cle + "|megaprojet|type|0");
    buildMegaprojet(gm, place.x, place.z, "grande_ecole", "services", 0, rm, [], Math.floor(rm() * 900) + 50);
    const gc = new Geo();
    buildCourtyard(gc, rectCourBloc(cle, place.bi, place.bj)!, rngFrom(`${cle}|lot|${place.bi},${place.bj}|9,9`), []);
    expect(gc.V.length).toBeGreaterThan(0);
    expect(avec.g.V.length - sans.g.V.length).toBe(gm.V.length - gc.V.length);
  });

  it("la géométrie générée est déterministe avec des mégaprojets, et change quand on en construit un", () => {
    const mega = [{ palier: 1, type: "hopital", activite: "services" }];
    const sans = generate("ville-a", 20_000);
    const avec = generate("ville-a", 20_000, undefined, 0, mega);
    const avec2 = generate("ville-a", 20_000, undefined, 0, mega);
    expect(avec2.g.V.length).toBe(avec.g.V.length);
    expect(avec.g.V.length).not.toBe(sans.g.V.length);
  });
});
