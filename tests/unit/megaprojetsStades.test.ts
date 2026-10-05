import { describe, expect, it } from "vitest";
import { generate } from "@/lib/ville3d/generer";
import { casesCentrales } from "@/lib/ville3d/cases";
import { BS, MAT, PLAFOND_RENDU_POPULATION, T, blockX0 } from "@/lib/ville3d/constantes";
import { distanceRectAuSecteurEnergie, emplacementCentrale, emplacementEnergie } from "@/lib/ville3d/emplacements";
import { DISTANCE_MIN_ENERGIE, blocsDuSite, placesMegaprojets } from "@/lib/ville3d/megaprojetsVille";
import { NB_BLOCS_MONUMENTS } from "@/lib/ville3d/monumentsVille";
import { blocsMegaprojet, coteBlocs, tailleMegaprojet } from "@/lib/ville3d/megaprojets";
import { BASE, STADE_HAUTEUR_MAX } from "@/lib/ville3d/megaprojetsFormes";
import { buildRoadsAndTraffic } from "@/lib/ville3d/terrain";
import { Geo } from "@/lib/ville3d/geometrie";
import { CATALOGUE_MEGAPROJETS, PREMIER_PALIER_MEGAPROJET } from "@/lib/game/megaprojets";

/**
 * A-INTEGRER §49 D (retour d'Adrien du 05/10/2026) : « stade et grand stade beaucoup plus grands, sur
 * plusieurs blocs réservés ». Le Grand stade, jugé disproportionné (3 × 3, puis 3 × 2) puis inutile à côté du petit
 * (« il y a déjà le petit, on peut remplacer par un parc d'attraction »), est devenu le Parc d'attractions : même
 * identifiant `grand_stade`, 2 × 2 blocs. Le Stade, lui, a été jugé trop grand à son tour (3ᵉ consigne, « le Stade est trop
 * grand ») : il est passé de 2 × 2 à 2 × 1 blocs, 1,5 bloc de long au plus (règle de proportion,
 * tests/unit/megaprojetsProportions.test.ts). Les rues qui traversent ces sites disparaissent avec eux.
 */
const PALIERS = CATALOGUE_MEGAPROJETS.map((_, i) => PREMIER_PALIER_MEGAPROJET + i);
const STADE = PREMIER_PALIER_MEGAPROJET + CATALOGUE_MEGAPROJETS.findIndex((m) => m.type === "stade");
const GRAND_STADE = PREMIER_PALIER_MEGAPROJET + CATALOGUE_MEGAPROJETS.findIndex((m) => m.type === "grand_stade");
const CLES = ["ville-a", "0b7c4f3e-demo", "accueil", "x1", "x2", "3f8a2c1e-7b4d-4e9a-b6c5-1d2e3f4a5b6c"];
const GRAINES = Array.from({ length: 100 }, (_, i) => `graine-${i}`);
const cleBloc = (b: { bi: number; bj: number }) => b.bi + "," + b.bj;

describe("le Stade (2 × 1 blocs) et le Parc d'attractions (2 × 2) occupent plusieurs blocs (§49 D, 3ᵉ consigne)", () => {
  it("la taille : 2 × 1 blocs pour le Stade, 2 × 2 pour le Parc d'attractions, rues intérieures comprises ; tous les autres mégaprojets gardent un bloc", () => {
    expect(coteBlocs(1)).toBe(64);
    expect(coteBlocs(2)).toBe(144);
    expect(coteBlocs(3)).toBe(224);
    expect(blocsMegaprojet("stade")).toEqual({ nx: 2, nz: 1 });
    expect(blocsMegaprojet("grand_stade")).toEqual({ nx: 2, nz: 2 });
    for (const d of CATALOGUE_MEGAPROJETS) if (d.type !== "stade" && d.type !== "grand_stade") expect(blocsMegaprojet(d.type), d.type).toEqual({ nx: 1, nz: 1 });
    // La plateforme laisse le trottoir (3 m) et un mètre de jeu : 136 × 56 m pour le Stade, 136 × 136 m pour le Parc.
    expect(tailleMegaprojet("stade", 1)).toMatchObject({ R: 68, Rz: 28, nx: 2, nz: 1, H: STADE_HAUTEUR_MAX });
    expect(tailleMegaprojet("grand_stade", 4)).toMatchObject({ R: 68, Rz: 68, nx: 2, nz: 2, H: 44 });
    // Beaucoup plus grands qu'avant le §49 (le Stade tenait dans 15 m de demi-côté, le Grand stade dans 24,75 m) ...
    expect(tailleMegaprojet("stade", 1).R).toBeGreaterThan(4 * 15);
    expect(tailleMegaprojet("grand_stade", 4).R).toBeGreaterThan(2 * 24.75);
    // ... mais jamais la démesure des 3 × 3 blocs, et le Stade est plus petit que le Parc.
    expect(2 * tailleMegaprojet("grand_stade", 4).R).toBeLessThan(coteBlocs(3));
    const st = tailleMegaprojet("stade", 1),
      pa = tailleMegaprojet("grand_stade", 4);
    expect(st.R * st.Rz).toBeLessThan(pa.R * pa.Rz / 2 + 1);
  });

  it("un rectangle de blocs qui part de la case d'ancrage vers l'extérieur de la ville, sans jamais chevaucher un axe central", () => {
    for (const c of [
      { bi: 4, bj: 2 },
      { bi: -4, bj: 2 },
      { bi: 4, bj: -2 },
      { bi: -4, bj: -2 },
      { bi: 0, bj: 5 },
      { bi: -1, bj: -6 },
    ]) {
      for (const [nx, nz] of [
        [2, 1],
        [2, 2],
        [3, 2],
      ] as const) {
        const blocs = blocsDuSite(c, nx, nz);
        expect(blocs).toHaveLength(nx * nz);
        expect(new Set(blocs.map(cleBloc)).size).toBe(nx * nz);
        // Tous du même côté de chaque axe central que la case d'ancrage : l'axe n'est jamais une rue intérieure du site.
        expect(blocs.every((b) => b.bi >= 0 === c.bi >= 0 && b.bj >= 0 === c.bj >= 0)).toBe(true);
        // Chaque bloc ajouté est plus loin du centre que l'ancre, jamais entre elle et la ville.
        for (const b of blocs) {
          expect(Math.abs(b.bi + 0.5)).toBeGreaterThanOrEqual(Math.abs(c.bi + 0.5));
          expect(Math.abs(b.bj + 0.5)).toBeGreaterThanOrEqual(Math.abs(c.bj + 0.5));
        }
      }
    }
  });

  it("les places : 2 blocs et 136 × 56 m pour le Stade, 4 blocs et 136 m de côté pour le Parc, rect = rectangle de leurs blocs", () => {
    for (const cle of CLES) {
      const places = placesMegaprojets(cle, PALIERS);
      for (const [palier, nx, nz, R, Rz] of [
        [STADE, 2, 1, 68, 28],
        [GRAND_STADE, 2, 2, 68, 68],
      ] as const) {
        const p = places.get(palier)!;
        expect([p.nx, p.nz], cle).toEqual([nx, nz]);
        expect(p.blocs, cle).toHaveLength(nx * nz);
        expect(p.rayon, cle).toBe(R);
        expect(p.rayonZ, cle).toBe(Rz);
        const [x0, z0, x1, z1] = p.rect;
        expect(x1 - x0).toBe(coteBlocs(nx));
        expect(z1 - z0).toBe(coteBlocs(nz));
        expect(p.x).toBeCloseTo((x0 + x1) / 2, 9);
        expect(p.z).toBeCloseTo((z0 + z1) / 2, 9);
        // Le carré de blocs est exactement celui des blocs réservés.
        for (const b of p.blocs) {
          expect(blockX0(b.bi)).toBeGreaterThanOrEqual(x0);
          expect(blockX0(b.bi) + BS).toBeLessThanOrEqual(x1);
          expect(blockX0(b.bj)).toBeGreaterThanOrEqual(z0);
          expect(blockX0(b.bj) + BS).toBeLessThanOrEqual(z1);
        }
        // La plateforme laisse 4 m (trottoir et jeu) entre son bord et celui du rectangle.
        expect((x1 - x0) / 2 - p.rayon).toBeCloseTo(4, 9);
        expect((z1 - z0) / 2 - p.rayonZ).toBeCloseTo(4, 9);
      }
      // Les 16 autres mégaprojets n'ont qu'un bloc.
      for (const palier of PALIERS) if (palier !== STADE && palier !== GRAND_STADE) expect(places.get(palier)!.blocs, `${cle} ${palier}`).toHaveLength(1);
    }
  });

  it("tous les blocs réservés sont distincts : deux mégaprojets ne se chevauchent jamais, ni un monument (16 blocs centraux)", () => {
    for (const cle of GRAINES) {
      const places = placesMegaprojets(cle, PALIERS);
      const tous = [...places.values()].flatMap((p) => p.blocs.map(cleBloc));
      expect(tous, cle).toHaveLength(18 - 2 + 2 + 4);
      expect(new Set(tous).size, cle).toBe(tous.length);
      const monuments = new Set(casesCentrales(cle, NB_BLOCS_MONUMENTS).map(cleBloc));
      for (const b of tous) expect(monuments.has(b), `${cle} ${b}`).toBe(false);
    }
  });

  it("les deux sites restent à 150 m au moins du secteur d'Énergie, par leur BORD (200 graines : 100 ici, voir aussi megaprojetsEnergie.test.ts)", () => {
    for (const cle of GRAINES) {
      const places = placesMegaprojets(cle, PALIERS);
      const energie = [...Array.from({ length: 24 }, (_, k) => emplacementEnergie(cle, k)), emplacementCentrale(cle)];
      for (const palier of [STADE, GRAND_STADE]) {
        const p = places.get(palier)!;
        expect(distanceRectAuSecteurEnergie(...p.rect), `${cle} ${palier}`).toBeGreaterThanOrEqual(DISTANCE_MIN_ENERGIE);
        // Et donc chaque pylône, chaque parking du site, à plus de 150 m de la moindre installation d'Énergie.
        const [x0, z0, x1, z1] = p.rect;
        for (const e of energie) {
          const dx = Math.max(x0 - e.x, 0, e.x - x1),
            dz = Math.max(z0 - e.z, 0, e.z - z1);
          expect(Math.hypot(dx, dz), `${cle} ${palier}`).toBeGreaterThanOrEqual(DISTANCE_MIN_ENERGIE - 1e-6);
        }
      }
    }
  });

  describe("dans la scène", () => {
    const stade = (palier: number) => {
      const def = CATALOGUE_MEGAPROJETS[palier - PREMIER_PALIER_MEGAPROJET];
      return [{ palier, type: def.type, activite: def.activite }];
    };
    const ville = (palier: number, cle = "ville-a") => generate(cle, PLAFOND_RENDU_POPULATION, undefined, 0, stade(palier), 0, [], "classique", 0);
    const dedans = (rect: [number, number, number, number], marge: number) => (x: number, z: number) =>
      x > rect[0] + marge && x < rect[2] - marge && z > rect[1] + marge && z < rect[3] - marge;

    it("l'empreinte au sol est celle de la plateforme : 136 × 56 m pour le Stade, 136 × 136 m pour le Parc d'attractions", () => {
      for (const [palier, R, Rz, H] of [
        [STADE, 68, 28, STADE_HAUTEUR_MAX],
        [GRAND_STADE, 68, 68, 44],
      ] as const) {
        const p = placesMegaprojets("ville-a", [palier]).get(palier)!;
        const { ao } = ville(palier);
        const empreinte = ao.filter(
          (r) =>
            Math.abs((r.x0 + r.x1) / 2 - p.x) < 0.01 &&
            Math.abs((r.z0 + r.z1) / 2 - p.z) < 0.01 &&
            Math.abs(r.x1 - r.x0 - 2 * R) < 0.01 &&
            Math.abs(r.z1 - r.z0 - 2 * Rz) < 0.01
        );
        expect(empreinte, `palier ${palier}`).toHaveLength(1);
        expect(empreinte[0].h).toBe(H);
      }
    });

    it("les rues qui traversent le site disparaissent : ni chaussée, ni trottoir, ni voiture à l'intérieur du carré de blocs", () => {
      for (const palier of [STADE, GRAND_STADE]) {
        const p = placesMegaprojets("ville-a", [palier]).get(palier)!;
        const { g } = ville(palier);
        const interieur = dedans(p.rect, 3.5); // le trottoir extérieur (3 m) reste, comme la rue qui le borde
        let chaussee = 0,
          trottoir = 0;
        for (let i = 0; i < g.n; i++) {
          const x = g.V[i * 13],
            z = g.V[i * 13 + 2],
            m = g.V[i * 13 + 9];
          if (!interieur(x, z)) continue;
          if (m === MAT.ROAD) chaussee++;
          if (m === MAT.SIDEWALK) trottoir++;
        }
        expect(chaussee, `palier ${palier} : chaussée`).toBe(0);
        expect(trottoir, `palier ${palier} : trottoir`).toBe(0);
      }
    });

    it("sans mégaprojet, les mêmes blocs ont leurs rues et leurs trottoirs : c'est bien le site qui les efface", () => {
      const p = placesMegaprojets("ville-a", [STADE]).get(STADE)!;
      const { g } = generate("ville-a", PLAFOND_RENDU_POPULATION, undefined, 0, [], 0, [], "classique", 0);
      const interieur = dedans(p.rect, 3.5);
      let chaussee = 0;
      for (let i = 0; i < g.n; i++) if (interieur(g.V[i * 13], g.V[i * 13 + 2]) && g.V[i * 13 + 9] === MAT.ROAD) chaussee++;
      expect(chaussee).toBeGreaterThan(0);
    });

    it("aucune maison, aucun lot : seule l'empreinte du stade occupe le carré de blocs", () => {
      for (const palier of [STADE, GRAND_STADE]) {
        const p = placesMegaprojets("ville-a", [palier]).get(palier)!;
        const { ao } = ville(palier);
        const interieur = dedans(p.rect, 0.5);
        const ici = ao.filter((r) => interieur(r.x0, r.z0) && interieur(r.x1, r.z1));
        expect(ici, `palier ${palier}`).toHaveLength(1);
      }
    });

    it("les lampadaires des rues intérieures ont disparu : à l'intérieur du site, il ne reste que les lueurs du site lui-même, dans sa plateforme", () => {
      for (const palier of [STADE, GRAND_STADE]) {
        const p = placesMegaprojets("ville-a", [palier]).get(palier)!;
        const { glow } = ville(palier);
        const interieur = dedans(p.rect, 0);
        const dansLaPlateforme = (l: { x: number; z: number }) => Math.abs(l.x - p.x) <= p.rayon + 1 && Math.abs(l.z - p.z) <= p.rayonZ + 1;
        for (const l of glow.filter((l) => interieur(l.x, l.z))) expect(dansLaPlateforme(l), `palier ${palier} : lueur (${l.x.toFixed(1)}, ${l.z.toFixed(1)})`).toBe(true);
        // Le site a son propre éclairage de nuit : un lampadaire tous les 14 m environ sur chacun de ses quatre côtés.
        const surLePourtour = glow.filter((l) => dansLaPlateforme(l) && Math.max(Math.abs(l.x - p.x) - p.rayon, Math.abs(l.z - p.z) - p.rayonZ) > -2.5);
        expect(surLePourtour.length, `palier ${palier}`).toBeGreaterThanOrEqual(16);
      }
    });

    it("la pelouse tracée du Stade a la taille d'un terrain, plus petit depuis la 3ᵉ consigne (36 × 22 m)", () => {
      for (const [palier, longueur, largeur] of [[STADE, 35, 21]] as const) {
        const { g } = ville(palier);
        let x0 = Infinity,
          x1 = -Infinity,
          z0 = Infinity,
          z1 = -Infinity;
        for (let i = 0; i < g.n; i++) {
          const y = g.V[i * 13 + 1];
          // La pelouse rayée du terrain (terrainFoot) est à BASE + 0,03 ; les pelouses de bordure sont plus basses.
          if (g.V[i * 13 + 9] !== MAT.LAWN || Math.abs(y - (BASE + 0.03)) > 0.002) continue;
          x0 = Math.min(x0, g.V[i * 13]);
          x1 = Math.max(x1, g.V[i * 13]);
          z0 = Math.min(z0, g.V[i * 13 + 2]);
          z1 = Math.max(z1, g.V[i * 13 + 2]);
        }
        expect(x1 - x0, `palier ${palier}`).toBeGreaterThanOrEqual(longueur);
        expect(z1 - z0, `palier ${palier}`).toBeGreaterThanOrEqual(largeur);
      }
    });

    it("le Parc d'attractions a sa pelouse et ses allées dallées, avec des attractions lumineuses ; le Stade a son esplanade : ce sont des sites, pas des cours vides", () => {
      const matieres = (g: Geo) => {
        const m = new Map<number, number>();
        for (let i = 0; i < g.n; i++) m.set(g.V[i * 13 + 9], (m.get(g.V[i * 13 + 9]) ?? 0) + 1);
        return m;
      };
      const parc = matieres(ville(GRAND_STADE).g);
      expect(parc.get(MAT.LAWN) ?? 0, "pelouse du parc").toBeGreaterThan(100);
      expect(parc.get(MAT.PAVING) ?? 0, "allées").toBeGreaterThan(50);
      expect(parc.get(MAT.BEACON) ?? 0, "ampoules des attractions").toBeGreaterThan(500);
      expect(matieres(ville(STADE).g).get(MAT.PAVING) ?? 0, "esplanade du stade").toBeGreaterThan(50);
    });

    it("la génération reste déterministe avec les deux sites", () => {
      const deux = [...stade(STADE), ...stade(GRAND_STADE)];
      const a = generate("ville-a", 40_000, undefined, 0, deux);
      const b = generate("ville-a", 40_000, undefined, 0, deux);
      expect(b.g.V).toEqual(a.g.V);
    });
  });

  it("buildRoadsAndTraffic n'efface que les tuiles de rue dont le centre est dans un rectangle réservé", () => {
    const bloc = (bi: number, bj: number) => ({ bi, bj, d: 0, openAt: 0, gap: 0, towerAt: 0, active: true, vocation: "residentiel" as const });
    const blocs = [bloc(2, 2), bloc(3, 2), bloc(2, 3), bloc(3, 3)];
    const sans = new Geo();
    buildRoadsAndTraffic(sans, blocs, "x", 0);
    const avec = new Geo();
    const rect: [number, number, number, number] = [blockX0(2), blockX0(2), blockX0(3) + BS, blockX0(3) + BS];
    buildRoadsAndTraffic(avec, blocs, "x", 0, [rect]);
    expect(avec.n).toBeLessThan(sans.n);
    // Les tuiles du pourtour (centre hors du rectangle) sont toutes encore là : la rue extérieure n'est pas touchée.
    const tuiles = (g: Geo) => {
      const s = new Set<string>();
      for (let i = 0; i < g.n; i++) if (g.V[i * 13 + 9] === MAT.ROAD) s.add(Math.round((g.V[i * 13] + T / 2) / T - 0.5) + "," + Math.round((g.V[i * 13 + 2] + T / 2) / T - 0.5));
      return s;
    };
    const ap = tuiles(avec),
      sp = tuiles(sans);
    expect(ap.size).toBeLessThan(sp.size);
    for (const k of ap) expect(sp.has(k)).toBe(true);
  });
});
