import { describe, expect, it } from "vitest";
import { generate, planifierBlocs } from "@/lib/ville3d/generer";
import { rngFrom } from "@/lib/ville3d/aleatoire";
import { Geo } from "@/lib/ville3d/geometrie";
import { buildMegaprojet, hauteurMegaprojet, rayonMegaprojet, tailleMegaprojet } from "@/lib/ville3d/megaprojets";
import { rectCourBloc } from "@/lib/ville3d/terrain";
import { BS, MAT, PLAFOND_RENDU_POPULATION, blockX0 } from "@/lib/ville3d/constantes";
import { casesCentrales, casesTriees } from "@/lib/ville3d/cases";
import { CEINTURE, distanceAuSecteurEnergie, distanceRectAuSecteurEnergie } from "@/lib/ville3d/emplacements";
import { DISTANCE_MIN_ENERGIE, blocsDeLiaison, blocsDuSite, placesMegaprojets } from "@/lib/ville3d/megaprojetsVille";
import { NB_BLOCS_MONUMENTS } from "@/lib/ville3d/monumentsVille";
import { CATALOGUE_MEGAPROJETS, PREMIER_PALIER_MEGAPROJET, megaprojetDuPalier } from "@/lib/game/megaprojets";
import type { VocationQuartier } from "@/lib/ville3d/quartiers";

/**
 * Place des mégaprojets. Historique : §37 A les posait « à la bordure de la ville », §41 selon le stade de
 * population où ils se débloquaient ; le retour d'Adrien du 05/10/2026 (« les mégaprojets doivent être dans les
 * villes, là ils sont loin des villes et pas toujours à côté d'une route ») les met DANS la ville : chacun prend
 * la première case libre après les 16 blocs des monuments (megaprojetsVille.ts), avec ses rues, et ne bouge plus
 * jamais — même quand la ville le rejoint.
 */
const CLES = ["ville-a", "0b7c4f3e-demo", "accueil", "x1", "x2", "3f8a2c1e-7b4d-4e9a-b6c5-1d2e3f4a5b6c"];
const GRAINES = Array.from({ length: 60 }, (_, i) => `graine-${i}`);
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

describe("mégaprojets dans la ville, contre les monuments (retour d'Adrien du 05/10/2026)", () => {
  it("les mégaprojets sont DANS la ville : à cinq blocs du croisement central au plus, dans la ceinture d'Énergie, jamais perdus dans les champs", () => {
    for (const cle of GRAINES) {
      for (const [palier, p] of placesMegaprojets(cle, PALIERS)) {
        for (const b of p.blocs) {
          expect(Math.abs(b.bi + 0.5), `${cle} palier ${palier}`).toBeLessThanOrEqual(5.5);
          expect(Math.abs(b.bj + 0.5), `${cle} palier ${palier}`).toBeLessThanOrEqual(5.5);
        }
        expect(normeMax({ x: p.rect[0], z: p.rect[1] }), `${cle} palier ${palier}`).toBeLessThan(CEINTURE);
        expect(normeMax({ x: p.rect[2], z: p.rect[3] }), `${cle} palier ${palier}`).toBeLessThan(CEINTURE);
      }
    }
  });

  it("le premier mégaprojet est contre les monuments : la 17e case de la ville, ou la première libre à côté (moins de quatre blocs du centre)", () => {
    for (const cle of GRAINES) {
      const p = placesMegaprojets(cle, [PREMIER]).get(PREMIER)!;
      expect(Math.max(Math.abs(p.bi + 0.5), Math.abs(p.bj + 0.5)), cle).toBeLessThanOrEqual(3.5);
    }
  });

  it("chacun prend la PREMIÈRE case libre à partir de la 17e : aucune case plus proche n'était libre (monuments, mégaprojets déjà posés) et assez loin de l'Énergie", () => {
    for (const cle of CLES) {
      const cases = casesTriees(cle, 12);
      const places = placesMegaprojets(cle, PALIERS);
      const reserves = new Set(casesCentrales(cle, NB_BLOCS_MONUMENTS).map((c) => c.bi + "," + c.bj));
      for (const palier of PALIERS) {
        const p = places.get(palier)!;
        const i = cases.findIndex((c) => c.bi === p.bi && c.bj === p.bj);
        expect(i, `${cle} palier ${palier}`).toBeGreaterThanOrEqual(NB_BLOCS_MONUMENTS);
        for (let j = NB_BLOCS_MONUMENTS; j < i; j++) {
          const blocs = blocsDuSite(cases[j], p.nx, p.nz);
          const occupee = blocs.some((b) => reserves.has(b.bi + "," + b.bj));
          let proche: boolean;
          if (p.nx * p.nz === 1) {
            const [x0, z0, x1, z1] = rectCourBloc(cle, cases[j].bi, cases[j].bj)!;
            proche = distanceAuSecteurEnergie((x0 + x1) / 2, (z0 + z1) / 2) < DISTANCE_MIN_ENERGIE;
          } else {
            const xs = blocs.map((b) => blockX0(b.bi)),
              zs = blocs.map((b) => blockX0(b.bj));
            proche = distanceRectAuSecteurEnergie(Math.min(...xs), Math.min(...zs), Math.max(...xs) + BS, Math.max(...zs) + BS) < DISTANCE_MIN_ENERGIE;
          }
          expect(occupee || proche, `${cle} palier ${palier} : la case ${j} était libre`).toBe(true);
        }
        for (const b of p.blocs) reserves.add(b.bi + "," + b.bj);
      }
    }
  });

  it("chaque mégaprojet d'un bloc est au centre de la cour de son bloc, loin des rues", () => {
    for (const cle of CLES) {
      for (const [, p] of placesMegaprojets(cle, PALIERS)) {
        if (p.nx * p.nz > 1) continue;
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

  it("aucun mégaprojet ne tombe sur un bloc de monument (les 16 cases les plus centrales, A-INTEGRER §49 B)", () => {
    for (const cle of CLES) {
      const centrales = new Set(casesCentrales(cle, 16).map((c) => c.bi + "," + c.bj));
      for (const [palier, p] of placesMegaprojets(cle, PALIERS)) {
        expect(centrales.has(p.bi + "," + p.bj), `${cle} palier ${palier}`).toBe(false);
      }
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
    expect(placesMegaprojets("ville-a", [0, 5, 15, 34, 99, -1]).size).toBe(0);
    expect([...placesMegaprojets("ville-a", [0, PREMIER, 99]).keys()]).toEqual([PREMIER]);
  });

  describe("les rues qui y mènent (« pas toujours à côté d'une route »)", () => {
    it("blocsDeLiaison : l'escalier de blocs du croisement central jusqu'au bloc visé, un pas à la fois", () => {
      for (const bloc of [
        { bi: 4, bj: 2 },
        { bi: -4, bj: 2 },
        { bi: 3, bj: -3 },
        { bi: -2, bj: -5 },
        { bi: 0, bj: 3 },
        { bi: -1, bj: -1 },
        { bi: 0, bj: 0 },
      ]) {
        const chemin = blocsDeLiaison(bloc);
        // Il part du bloc contre le croisement (0 ou −1 selon le signe) et finit sur le bloc visé.
        expect(chemin[0]).toEqual({ bi: bloc.bi >= 0 ? 0 : -1, bj: bloc.bj >= 0 ? 0 : -1 });
        expect(chemin.at(-1)).toEqual(bloc);
        for (let k = 1; k < chemin.length; k++) {
          const dx = Math.abs(chemin[k].bi - chemin[k - 1].bi),
            dz = Math.abs(chemin[k].bj - chemin[k - 1].bj);
          expect(dx + dz, JSON.stringify(bloc)).toBe(1);
        }
        const pas = Math.abs(bloc.bi >= 0 ? bloc.bi : -bloc.bi - 1) + Math.abs(bloc.bj >= 0 ? bloc.bj : -bloc.bj - 1);
        expect(chemin).toHaveLength(pas + 1);
        expect(new Set(chemin.map((b) => b.bi + "," + b.bj)).size).toBe(chemin.length);
      }
    });

    it("dans la scène, un mégaprojet est relié au croisement central par des rues, même quand la ville est encore petite", () => {
      const dernier = PALIERS.at(-1)!;
      const def = megaprojetDuPalier(dernier)!;
      const mega = [{ palier: dernier, type: def.type, activite: def.activite }];
      // Chaussée dessinée autour d'un bloc : les rues qui le bordent (à moins d'une rue de ses angles).
      const chaussee = (g: Geo, b: { bi: number; bj: number }) => {
        const x0 = blockX0(b.bi) - 16,
          z0 = blockX0(b.bj) - 16;
        let n = 0;
        for (let i = 0; i < g.n; i++) {
          const x = g.V[i * 13],
            z = g.V[i * 13 + 2];
          if (g.V[i * 13 + 9] === MAT.ROAD && x > x0 && x < x0 + BS + 32 && z > z0 && z < z0 + BS + 32) n++;
        }
        return n;
      };
      let verifies = 0;
      for (const cle of CLES) {
        const place = placesMegaprojets(cle, [dernier]).get(dernier)!;
        const sans = generate(cle, 3_000, undefined, 0, [], 0, [], "classique", 0).g;
        const avec = generate(cle, 3_000, undefined, 0, mega, 0, [], "classique", 0).g;
        const chemin = blocsDeLiaison(place);
        // Les blocs du chemin que la petite ville n'atteignait pas (hors des deux grands axes) n'avaient aucune rue.
        const loin = chemin.filter((b) => chaussee(sans, b) === 0);
        for (const b of chemin) expect(chaussee(avec, b), `${cle} bloc ${b.bi},${b.bj}`).toBeGreaterThan(0);
        for (const b of loin) {
          expect(chaussee(avec, b), `${cle} bloc ${b.bi},${b.bj}`).toBeGreaterThan(chaussee(sans, b));
          verifies++;
        }
      }
      expect(verifies).toBeGreaterThan(0);
    });

    it("la ville, son brouillard, ses ombres et sa carte de lueur couvrent le site : le rayon de la ville le contient", () => {
      for (const cle of ["ville-a", "accueil", "x1"]) {
        const mega = PALIERS.map((palier) => {
          const def = megaprojetDuPalier(palier)!;
          return { palier, type: def.type, activite: def.activite };
        });
        const cityR = generate(cle, 3_000, undefined, 0, mega, 0, [], "classique", 0).stats.cityR!;
        for (const [palier, p] of placesMegaprojets(cle, PALIERS)) {
          expect(cityR, `${cle} palier ${palier}`).toBeGreaterThanOrEqual(Math.max(...p.rect.map(Math.abs)));
        }
      }
    });
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
    // Taille réelle (§45) : au plus 55 m de haut au stade 4 — jamais les 33 × 4 m qu'un palier brut donnerait ; 60 m pour le Grand stade (§49 D).
    for (const palier of PALIERS) expect(hauteur(palier), `palier ${palier}`).toBeLessThanOrEqual(60 + 1e-9);
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
          if (p.nx * p.nz > 1) continue;
          const rect = rectCourBloc(cle, p.bi, p.bj)!;
          expect(p.x).toBeCloseTo((rect[0] + rect[2]) / 2, 9);
          expect(p.z).toBeCloseTo((rect[1] + rect[3]) / 2, 9);
        }
    });

    it("l'emprise tient dans le bloc : jamais de débord sur une rue ni sur le bloc voisin, quelle que soit la ville", () => {
      for (const cle of CLES)
        for (const [palier, p] of placesMegaprojets(cle, PALIERS)) {
          if (p.nx * p.nz > 1) continue;
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
          if (p.nx * p.nz > 1) continue;
          if (stadeDe(palier) <= 2) expect(p.rayon, `${cle} ${palier}`).toBe(rayonMegaprojet(stadeDe(palier)));
          // 24,75 m : la distance minimale entre le centre d'une cour et le bord de son bloc (cour de 14,5 × 29 m décalée de 7,25 m).
          expect(p.rayon, `${cle} ${palier}`).toBeCloseTo(Math.min(rayonMegaprojet(stadeDe(palier)), 24.75), 9);
        }
    });

    it("le bâtiment dessiné est réduit avec son rayon, hauteur comprise (mêmes proportions)", () => {
      const mesure = (rayonMax?: number) => {
        const g = new Geo();
        const ao: { x0: number; x1: number; h: number }[] = [];
        buildMegaprojet(g, 0, 0, "siege_international", 4, rngFrom("t"), ao as never, 1, rayonMax);
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

    it("le bloc réservé garde les lampadaires de sa rue, et le site ajoute les siens : la rue reste éclairée", () => {
      const cle = "ville-a";
      const vocations = vocationsDe(cle, 5);
      const place = placesMegaprojets(cle, [PREMIER]).get(PREMIER)!;
      const sans = generate(cle, PLAFOND_RENDU_POPULATION, vocations, 0, [], 0, [], "classique", 0);
      const avec = generate(cle, PLAFOND_RENDU_POPULATION, vocations, 0, [{ palier: PREMIER, type: "grande_ecole", activite: "services" }], 0, [], "classique", 0);
      const bx = blockX0(place.bi),
        bz = blockX0(place.bj);
      const lueurs = (glow: { x: number; z: number }[]) => glow.filter((l) => l.x > bx - 3 && l.x < bx + BS + 3 && l.z > bz - 3 && l.z < bz + BS + 3).length;
      // Le site ajoute son propre éclairage de nuit (lampadaires du pourtour, halos au sol) à ceux de la rue : jamais moins.
      expect(lueurs(avec.glow)).toBeGreaterThanOrEqual(lueurs(sans.glow));
      expect(lueurs(sans.glow)).toBeGreaterThan(0);
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
