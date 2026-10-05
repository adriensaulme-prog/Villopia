import { describe, expect, it } from "vitest";
import { generate, planifierBlocs } from "@/lib/ville3d/generer";
import { rngFrom } from "@/lib/ville3d/aleatoire";
import { Geo } from "@/lib/ville3d/geometrie";
import { buildMegaprojet, hauteurMegaprojet, rayonMegaprojet } from "@/lib/ville3d/megaprojets";
import { rectCourBloc } from "@/lib/ville3d/terrain";
import { BS, CITY_R_MIN, PLAFOND_RENDU_POPULATION, blockX0 } from "@/lib/ville3d/constantes";
import { CEINTURE } from "@/lib/ville3d/emplacements";
import { casesCentrales } from "@/lib/ville3d/cases";
import { indiceCaseMegaprojet, indiceCaseStade, placesMegaprojets } from "@/lib/ville3d/megaprojetsVille";
import {
  CATALOGUE_MEGAPROJETS,
  POPULATION_STADE,
  PREMIER_PALIER_MEGAPROJET,
  megaprojetDuPalier,
  rangDansLeStade,
} from "@/lib/game/megaprojets";
import type { VocationQuartier } from "@/lib/ville3d/quartiers";

/**
 * A-INTEGRER §37 A, repris par le §41 : les mégaprojets viennent à la bordure
 * de la ville (la case juste hors de la ville quand elle atteint la population
 * de leur stade), dans la cour de cette case, et ne bougent plus jamais — même
 * quand la ville les rejoint. Depuis le §41 ils se débloquent par le record
 * d'influence : leur place ne dépend plus d'une population courante mais du
 * stade qu'ils avaient (megaprojets.ts), et des mégaprojets du même stade se
 * rangent sur des cases voisines.
 */
const CLES = ["ville-a", "0b7c4f3e-demo", "accueil", "x1", "x2", "3f8a2c1e-7b4d-4e9a-b6c5-1d2e3f4a5b6c"];
/** Les 18 paliers du catalogue unifié qui sont des mégaprojets : 16 à 33. */
const PALIERS = CATALOGUE_MEGAPROJETS.map((_, i) => PREMIER_PALIER_MEGAPROJET + i);
const PREMIER = PREMIER_PALIER_MEGAPROJET;

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
const stadeDe = (palier: number) => megaprojetDuPalier(palier)!.stade;

describe("mégaprojets à la bordure de la ville (§37 A, §41)", () => {
  it("la case d'un mégaprojet est libre quand la ville atteint la population de son stade, quelles que soient les vocations des blocs (zonage ou non)", () => {
    for (const cle of CLES) {
      const places = placesMegaprojets(cle, PALIERS);
      for (let stade = 0; stade < POPULATION_STADE.length; stade++) {
        const duStade = PALIERS.filter((p) => stadeDe(p) === stade);
        for (const graine of [1, 2, 3]) {
          for (const zonage of [0, undefined]) {
            const { blocks } = planifierBlocs(cle, POPULATION_STADE[stade], vocationsDe(cle, graine), zonage);
            for (const palier of duStade) {
              const place = places.get(palier)!;
              const occupee = blocks.some((b) => b.active && b.bi === place.bi && b.bj === place.bj);
              expect(occupee, `${cle} palier ${palier} graine ${graine} zonage ${zonage}`).toBe(false);
            }
          }
        }
      }
    }
  });

  it("le mégaprojet est à quelques cases de la ville quand elle atteint son stade, pas à 450 m", () => {
    for (const cle of CLES) {
      const places = placesMegaprojets(cle, PALIERS);
      for (const palier of PALIERS) {
        const place = places.get(palier)!;
        const { blocks } = planifierBlocs(cle, POPULATION_STADE[stadeDe(palier)], vocationsDe(cle, 7), 0);
        const dmin = Math.min(
          ...blocks.filter((b) => b.active).map((b) => Math.max(Math.abs(b.bi - place.bi), Math.abs(b.bj - place.bj)))
        );
        expect(dmin, `${cle} palier ${palier}`).toBeGreaterThanOrEqual(1);
        // Le premier du stade est à une à trois cases ; chaque voisin de stade s'écarte d'une case de plus au plus.
        expect(dmin, `${cle} palier ${palier}`).toBeLessThanOrEqual(3 + rangDansLeStade(palier));
        // Beaucoup plus près que l'ancienne ceinture fixe à 450 m.
        expect(normeMax(place), `${cle} palier ${palier}`).toBeLessThan(CEINTURE - 50);
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

  it("deux mégaprojets n'ont jamais la même case, ni ne se touchent, même les quatre d'un même stade", () => {
    for (const cle of CLES) {
      const places = [...placesMegaprojets(cle, PALIERS).values()];
      expect(places).toHaveLength(PALIERS.length);
      expect(new Set(places.map((p) => p.bi + "," + p.bj)).size).toBe(PALIERS.length);
      for (let i = 0; i < places.length; i++)
        for (let j = i + 1; j < places.length; j++)
          expect(Math.hypot(places[i].x - places[j].x, places[i].z - places[j].z)).toBeGreaterThan(40);
    }
  });

  it("aucun mégaprojet ne tombe dans la cour d'un monument (les 8 cases les plus centrales)", () => {
    for (const cle of CLES) {
      const centrales = new Set(casesCentrales(cle, 8).map((c) => c.bi + "," + c.bj));
      for (const [palier, p] of placesMegaprojets(cle, PALIERS)) {
        expect(centrales.has(p.bi + "," + p.bj), `${cle} palier ${palier}`).toBe(false);
      }
    }
  });

  it("les indices de case croissent avec le palier : plus loin dans le catalogue = plus loin de la ville", () => {
    let precedent = -1;
    for (const palier of PALIERS) {
      const i = indiceCaseMegaprojet(palier)!;
      expect(i).toBeGreaterThan(precedent);
      precedent = i;
    }
  });

  it("les mégaprojets d'un même stade occupent des cases consécutives, à partir de la première case du stade", () => {
    for (let stade = 0; stade < POPULATION_STADE.length; stade++) {
      const duStade = PALIERS.filter((p) => stadeDe(p) === stade);
      duStade.forEach((p, rang) => expect(indiceCaseMegaprojet(p)).toBe(indiceCaseStade(stade) + rang));
    }
  });

  it("la position ne dépend que de la ville et du palier : ni des autres paliers, ni de la population", () => {
    for (const cle of CLES) {
      const seul = placesMegaprojets(cle, [PREMIER + 3]).get(PREMIER + 3)!;
      expect(placesMegaprojets(cle, PALIERS).get(PREMIER + 3)).toEqual(seul);
      expect(placesMegaprojets(cle, [PREMIER + 9, PREMIER + 3, PREMIER]).get(PREMIER + 3)).toEqual(seul);
    }
  });

  it("un palier qui n'est pas un mégaprojet (monument, inconnu) n'a pas de place : ignoré", () => {
    for (const palier of [0, 5, 15, 34, 99, -1]) expect(indiceCaseMegaprojet(palier)).toBeNull();
    expect(placesMegaprojets("ville-a", [0, 5, 15, 34, 99, -1]).size).toBe(0);
    expect([...placesMegaprojets("ville-a", [0, PREMIER, 99]).keys()]).toEqual([PREMIER]);
  });

  it("dans la scène, le mégaprojet reste exactement au même endroit quand la ville grandit puis l'englobe", () => {
    const cle = "ville-a";
    const mega = [{ palier: PREMIER, type: "grande_ecole", activite: "services" }];
    const place = placesMegaprojets(cle, [PREMIER]).get(PREMIER)!;
    const rSocle = place.rayon; // stade 0
    // Centre de l'empreinte du socle (ao), l'un des rectangles posés par buildMegaprojet().
    const empreinte = (ao: { x0: number; z0: number; x1: number; z1: number }[]) =>
      ao.filter((r) => Math.abs((r.x0 + r.x1) / 2 - place.x) < 0.01 && Math.abs((r.z0 + r.z1) / 2 - place.z) < 0.01 && Math.abs(r.x1 - r.x0 - 2 * rSocle) < 0.01);
    for (const pop of [5_000, 15_000, 40_000, 100_000, PLAFOND_RENDU_POPULATION, 9_000_000]) {
      const { ao } = generate(cle, pop, vocationsDe(cle, 5), 0, mega, 0, [], "classique", 0);
      expect(empreinte(ao).length, `population ${pop}`).toBe(1);
    }
  });

  it("la taille d'un mégaprojet suit son stade, jamais son palier (16 à 33 donnerait des tours démesurées)", () => {
    const hauteur = (palier: number) => {
      const def = megaprojetDuPalier(palier)!;
      const g = new Geo();
      const ao: { h: number }[] = [];
      buildMegaprojet(g, 0, 0, def.type, def.stade, rngFrom("t"), ao as never, 1);
      return ao[0].h;
    };
    // Taille réelle (§45) : au plus 55 m de haut au stade 4 — jamais les 33 × 4 m qu'un palier brut donnerait.
    for (const palier of PALIERS) expect(hauteur(palier), `palier ${palier}`).toBeLessThanOrEqual(55 + 1e-9);
    expect(hauteur(PALIERS.at(-1)!)).toBeGreaterThan(hauteur(PREMIER)); // le stade 4 est plus grand que le stade 0
  });

  describe("taille réelle (§45) : un mégaprojet occupe un bloc entier, sans jamais bouger", () => {
    it("le rayon et la hauteur croissent avec le stade, et sont nettement plus grands qu'une maison (≈ 9 m) ou un immeuble (12 m)", () => {
      let r = 0,
        h = 0;
      for (let stade = 0; stade <= 4; stade++) {
        expect(rayonMegaprojet(stade)).toBeGreaterThan(r);
        expect(hauteurMegaprojet(stade)).toBeGreaterThan(h);
        r = rayonMegaprojet(stade);
        h = hauteurMegaprojet(stade);
      }
      // Dès le stade 0 : près du double d'un immeuble (12 m) de large ; avant le §45 : 4,8 m (plus petit qu'un arbre).
      expect(2 * rayonMegaprojet(0)).toBeGreaterThanOrEqual(20);
      // Au stade 4 : presque un bloc entier (64 m), 4 à 5 fois la hauteur d'un immeuble.
      expect(2 * rayonMegaprojet(4)).toBeGreaterThanOrEqual(50);
      expect(hauteurMegaprojet(4)).toBeGreaterThanOrEqual(50);
    });

    it("la position n'a pas changé d'un mètre : toujours le centre de la cour de la case (celle d'avant le §45)", () => {
      for (const cle of CLES)
        for (const [, p] of placesMegaprojets(cle, PALIERS)) {
          const rect = rectCourBloc(cle, p.bi, p.bj)!;
          expect(p.x).toBeCloseTo((rect[0] + rect[2]) / 2, 9);
          expect(p.z).toBeCloseTo((rect[1] + rect[3]) / 2, 9);
        }
    });

    it("l'emprise tient dans le bloc : jamais de débord sur une rue ni sur le bloc voisin, quelle que soit la ville", () => {
      for (const cle of CLES)
        for (const [palier, p] of placesMegaprojets(cle, PALIERS)) {
          const bx = blockX0(p.bi),
            bz = blockX0(p.bj);
          const msg = `${cle} palier ${palier}`;
          expect(p.x - p.rayon, msg).toBeGreaterThanOrEqual(bx - 1e-9);
          expect(p.x + p.rayon, msg).toBeLessThanOrEqual(bx + BS + 1e-9);
          expect(p.z - p.rayon, msg).toBeGreaterThanOrEqual(bz - 1e-9);
          expect(p.z + p.rayon, msg).toBeLessThanOrEqual(bz + BS + 1e-9);
          expect(p.rayon, msg).toBeLessThanOrEqual(rayonMegaprojet(stadeDe(palier)));
        }
    });

    it("les plus gros (stade 3 et 4) sont réduits à la place qu'ils ont plutôt que de déborder ; les petits gardent leur rayon de stade", () => {
      for (const cle of CLES)
        for (const [palier, p] of placesMegaprojets(cle, PALIERS)) {
          if (stadeDe(palier) <= 2) expect(p.rayon, `${cle} ${palier}`).toBe(rayonMegaprojet(stadeDe(palier)));
          // 24,75 m : la distance minimale entre le centre d'une cour et le bord de son bloc (cour de 14,5 × 29 m décalée de 7,25 m).
          expect(p.rayon, `${cle} ${palier}`).toBeCloseTo(Math.min(rayonMegaprojet(stadeDe(palier)), 24.75), 9);
        }
    });

    it("le bâtiment dessiné est réduit avec son rayon, hauteur comprise (mêmes proportions)", () => {
      const mesure = (rayonMax?: number) => {
        const g = new Geo();
        const ao: { x0: number; x1: number; h: number }[] = [];
        buildMegaprojet(g, 0, 0, "grand_stade", 4, rngFrom("t"), ao as never, 1, rayonMax);
        return { largeur: ao[0].x1 - ao[0].x0, h: ao[0].h };
      };
      const plein = mesure();
      const reduit = mesure(20);
      expect(plein.largeur).toBeCloseTo(2 * rayonMegaprojet(4), 9);
      expect(reduit.largeur).toBeCloseTo(40, 9);
      expect(reduit.h / plein.h).toBeCloseTo(20 / rayonMegaprojet(4), 9);
      // Un rayonMax plus grand que celui du stade ne l'agrandit jamais.
      expect(mesure(1000)).toEqual(plein);
    });

    it("quand la ville atteint la case, le bloc est réservé : aucun lot, aucune maison, rien que le mégaprojet", () => {
      const cle = "ville-a";
      const vocations = vocationsDe(cle, 5);
      const place = placesMegaprojets(cle, [PREMIER]).get(PREMIER)!;
      const { blocks } = planifierBlocs(cle, PLAFOND_RENDU_POPULATION, vocations, 0);
      expect(blocks.some((b) => b.active && b.bi === place.bi && b.bj === place.bj)).toBe(true);
      const bx = blockX0(place.bi),
        bz = blockX0(place.bj);
      const dansLeBloc = (r: { x0: number; z0: number; x1: number; z1: number }) =>
        r.x0 >= bx - 0.01 && r.x1 <= bx + BS + 0.01 && r.z0 >= bz - 0.01 && r.z1 <= bz + BS + 0.01;
      const sans = generate(cle, PLAFOND_RENDU_POPULATION, vocations, 0, [], 0, [], "classique", 0);
      const avec = generate(cle, PLAFOND_RENDU_POPULATION, vocations, 0, [{ palier: PREMIER, type: "grande_ecole", activite: "services" }], 0, [], "classique", 0);
      // Sans mégaprojet : ce bloc est une vraie parcelle de la ville (maisons, arbres, cour...).
      expect(sans.ao.filter(dansLeBloc).length).toBeGreaterThan(5);
      // Avec : seule l'empreinte du mégaprojet (un seul rectangle d'ombre) occupe le bloc.
      const dedans = avec.ao.filter(dansLeBloc);
      expect(dedans).toHaveLength(1);
      expect(dedans[0].x1 - dedans[0].x0).toBeCloseTo(2 * place.rayon, 6);
      // Et la ville autour, elle, n'a pas bougé : tout ce qui est à plus de 20 m du bloc a les mêmes empreintes
      // (la campagne seule évite le site : quelques arbres de moins juste autour).
      const loin = (r: { x0: number; z0: number; x1: number; z1: number }) =>
        r.x1 < bx - 20 || r.x0 > bx + BS + 20 || r.z1 < bz - 20 || r.z0 > bz + BS + 20;
      expect(avec.ao.filter(loin)).toEqual(sans.ao.filter(loin));
    });

    it("le bloc réservé garde ses lampadaires et sa pelouse : la rue reste éclairée", () => {
      const cle = "ville-a";
      const vocations = vocationsDe(cle, 5);
      const place = placesMegaprojets(cle, [PREMIER]).get(PREMIER)!;
      const sans = generate(cle, PLAFOND_RENDU_POPULATION, vocations, 0, [], 0, [], "classique", 0);
      const avec = generate(cle, PLAFOND_RENDU_POPULATION, vocations, 0, [{ palier: PREMIER, type: "grande_ecole", activite: "services" }], 0, [], "classique", 0);
      const bx = blockX0(place.bi),
        bz = blockX0(place.bj);
      const lueurs = (glow: { x: number; z: number }[]) => glow.filter((l) => l.x > bx - 3 && l.x < bx + BS + 3 && l.z > bz - 3 && l.z < bz + BS + 3).length;
      expect(lueurs(avec.glow)).toBe(lueurs(sans.glow));
      expect(lueurs(avec.glow)).toBeGreaterThan(0);
    });
  });

  it("rien d'autre ne se superpose au mégaprojet : ni arbre de la cour, ni de forêt, ni de friche, quelle que soit la population", () => {
    for (const cle of ["ville-a", "accueil", "x1"]) {
      const place = placesMegaprojets(cle, [PREMIER]).get(PREMIER)!;
      const mega = [{ palier: PREMIER, type: "grande_ecole", activite: "services" }];
      for (const pop of [5_000, 15_000, 40_000, PLAFOND_RENDU_POPULATION]) {
        const { ao } = generate(cle, pop, vocationsDe(cle, 5), 0, mega, 0, [], "classique", 0);
        const rSocle = place.rayon;
        const ici = ao.filter(
          (r) => r.x1 > place.x - rSocle && r.x0 < place.x + rSocle && r.z1 > place.z - rSocle && r.z0 < place.z + rSocle
        );
        // Seule l'empreinte du mégaprojet lui-même.
        expect(ici.length, `${cle} population ${pop}`).toBe(1);
      }
    }
  });

  it("la géométrie générée est déterministe avec des mégaprojets, et change quand on en débloque un", () => {
    const mega = [{ palier: PREMIER + 3, type: "hopital", activite: "services" }];
    const sans = generate("ville-a", 20_000);
    const avec = generate("ville-a", 20_000, undefined, 0, mega);
    const avec2 = generate("ville-a", 20_000, undefined, 0, mega);
    expect(avec2.g.V.length).toBe(avec.g.V.length);
    expect(avec.g.V.length).not.toBe(sans.g.V.length);
  });

  it("débloquer les 18 d'un coup dessine bien les 18, chacun à sa place", () => {
    const cle = "ville-a";
    const tous = PALIERS.map((palier) => {
      const def = megaprojetDuPalier(palier)!;
      return { palier, type: def.type, activite: def.activite };
    });
    const un = generate(cle, 20_000, undefined, 0, [tous[0]]);
    const tous18 = generate(cle, 20_000, undefined, 0, tous);
    // Les mégaprojets ajoutent de la géométrie à celle de la ville (qui domine largement) : plus avec 18 qu'avec un seul.
    expect(tous18.g.V.length).toBeGreaterThan(un.g.V.length);
    const places = placesMegaprojets(cle, PALIERS);
    for (const palier of PALIERS) {
      const p = places.get(palier)!;
      const rSocle = p.rayon;
      const empreintes = tous18.ao.filter(
        (r) => Math.abs((r.x0 + r.x1) / 2 - p.x) < 0.01 && Math.abs((r.z0 + r.z1) / 2 - p.z) < 0.01 && Math.abs(r.x1 - r.x0 - 2 * rSocle) < 0.01
      );
      expect(empreintes.length, `palier ${palier}`).toBe(1);
    }
  });
});
