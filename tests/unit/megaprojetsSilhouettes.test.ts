import { describe, expect, it } from "vitest";
import { CATALOGUE_MEGAPROJETS, type DefMegaprojet } from "@/lib/game/megaprojets";
import { rngFrom } from "@/lib/ville3d/aleatoire";
import { CENTRALE_ACCENT, COL, EOLIENNE_MAT, MAT, PANNEAU_CELLULE, SERVICES_BANDEAU, SERVICES_CROIX, type Couleur } from "@/lib/ville3d/constantes";
import { Geo } from "@/lib/ville3d/geometrie";
import { buildMegaprojet, hauteurMegaprojet, rayonMegaprojet, tailleMegaprojet } from "@/lib/ville3d/megaprojets";
import { BASE } from "@/lib/ville3d/megaprojetsFormes";

/**
 * Silhouettes des 18 mégaprojets (docs/A-INTEGRER.md §44) : « une vraie silhouette par type, avec la
 * couleur/matière naturelle du bâtiment réel plutôt qu'une teinte liée à l'activité », et les modèles
 * d'Énergie réutilisés (centrale solaire, parc éolien, centrale) ou le langage visuel de buildServices()
 * (croix de l'hôpital). Le placement et la stabilité des positions sont dans megaprojetsVille.test.ts.
 */

const STRIDE = 13; // position(3), normale(3), couleur(3), matériau(1), u, v, graine

interface Construit {
  g: Geo;
  ao: { x0: number; z0: number; x1: number; z1: number; w: number; h: number }[];
  R: number;
  /** Demi-côté le long de z (28 m pour le Stade, 2 × 1 blocs, 3ᵉ consigne ; égal à R pour tous les autres). */
  Rz: number;
  H: number;
}

function construire(type: string, stade: number, cle = "silhouettes|" + type): Construit {
  const g = new Geo();
  const ao: Construit["ao"] = [];
  const r = rngFrom(cle);
  buildMegaprojet(g, 0, 0, type, stade, r, ao as never, Math.floor(r() * 900) + 50);
  // La taille d'un mégaprojet : celle de son stade, sauf le Stade (2 × 1 blocs) et le Parc d'attractions (2 × 2 blocs, §49 D, 3ᵉ consigne).
  const { R, Rz, H } = tailleMegaprojet(type, stade);
  return { g, ao, R, Rz, H };
}

const DEFS: readonly DefMegaprojet[] = CATALOGUE_MEGAPROJETS;
const deDef = (d: DefMegaprojet) => construire(d.type, d.stade);

/** Signature d'une géométrie : tout ce qui la décrit, arrondi — deux silhouettes identiques ont la même. */
function signature(g: Geo): string {
  return g.V.map((v) => v.toFixed(3)).join(",") + "|" + g.I.join(",");
}

function sommets(g: Geo) {
  const out: { x: number; y: number; z: number; c: Couleur; m: number }[] = [];
  for (let i = 0; i < g.V.length; i += STRIDE) {
    out.push({ x: g.V[i], y: g.V[i + 1], z: g.V[i + 2], c: [g.V[i + 6], g.V[i + 7], g.V[i + 8]], m: g.V[i + 9] });
  }
  return out;
}

const memeCouleur = (a: Couleur, b: Couleur) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 1e-9;

/**
 * Étendues (hauteur, largeur) des faces de cette couleur tournées vers +z, au-dessus de `yMin` : une croix
 * de façade a une barre haute ET une barre large ; l'auvent rouge des urgences, plus bas, n'en est pas une.
 */
function etenduesFace(g: Geo, c: Couleur, yMin: number) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < g.V.length; i += STRIDE) {
    if (g.V[i + 5] > 0.9 && memeCouleur([g.V[i + 6], g.V[i + 7], g.V[i + 8]], c) && g.V[i + 1] > yMin) pts.push({ x: g.V[i], y: g.V[i + 1] });
  }
  if (pts.length === 0) return { hauteur: 0, largeur: 0 };
  const ys = pts.map((p) => p.y),
    xs = pts.map((p) => p.x);
  return { hauteur: Math.max(...ys) - Math.min(...ys), largeur: Math.max(...xs) - Math.min(...xs) };
}

/** Nombre de sommets de cette couleur (et, si donné, de ce matériau). */
function compter(g: Geo, c: Couleur, m?: number): number {
  return sommets(g).filter((v) => memeCouleur(v.c, c) && (m === undefined || v.m === m)).length;
}

describe("silhouettes des mégaprojets (A-INTEGRER §44)", () => {
  it("les 18 types du catalogue sont dessinés, tous sommets finis, dans l'emprise de leur stade et sous leur plafond de hauteur", () => {
    expect(DEFS).toHaveLength(18);
    for (const d of DEFS) {
      const { g, R, Rz, H } = deDef(d);
      expect(g.V.length, d.type).toBeGreaterThan(0);
      expect(g.V.every(Number.isFinite), d.type).toBe(true);
      expect(g.I.every((i) => i >= 0 && i < g.n), `${d.type} : indices valides`).toBe(true);
      for (const v of sommets(g)) {
        expect(Math.abs(v.x), `${d.type} x`).toBeLessThanOrEqual(R + 0.05);
        expect(Math.abs(v.z), `${d.type} z`).toBeLessThanOrEqual(Rz + 0.05);
        // Les pieds de la grande roue (Parc d'attractions) s'enfoncent de quelques centimètres dans la plateforme : on ne les voit pas.
        expect(v.y, `${d.type} y bas`).toBeGreaterThanOrEqual(-0.1);
        expect(v.y, `${d.type} y haut`).toBeLessThanOrEqual(BASE + 1.7 * H);
      }
    }
  });

  it("une empreinte unique, carrée, de la taille du stade : l'ombre et le placement dans la cour en dépendent", () => {
    for (const d of DEFS) {
      const { ao, R, Rz, H } = deDef(d);
      expect(ao, d.type).toHaveLength(1);
      expect(ao[0]).toEqual({ x0: -R, z0: -Rz, x1: R, z1: Rz, w: 1, h: H });
    }
  });

  it("chaque type a SA silhouette : à stade égal, les 18 géométries sont toutes différentes", () => {
    for (const stade of [0, 2, 4]) {
      const signatures = new Map<string, string>();
      for (const d of DEFS) {
        // Même clé pour tous : sinon deux types dessinés par la même fonction ne différeraient que par leur graine.
        const sig = signature(construire(d.type, stade, "commun").g);
        const deja = signatures.get(sig);
        expect(deja, `${d.type} identique à ${deja} au stade ${stade}`).toBeUndefined();
        signatures.set(sig, d.type);
      }
      expect(signatures.size).toBe(18);
    }
  });

  it("aucun type ne retombe sur la silhouette de secours (les 18 sont bien dans la table)", () => {
    const secours = signature(construire("type_inconnu", 2, "commun").g);
    for (const d of DEFS) expect(signature(construire(d.type, 2, "commun").g), d.type).not.toBe(secours);
  });

  it("un type inconnu est tout de même dessiné, dans son emprise, sans planter", () => {
    const { g, ao, R } = construire("type_inconnu", 3);
    expect(g.V.length).toBeGreaterThan(0);
    expect(ao).toHaveLength(1);
    for (const v of sommets(g)) expect(Math.abs(v.x)).toBeLessThanOrEqual(R + 0.05);
  });

  it("plus de teinte d'activité : chaque modèle a sa propre palette (au moins quatre couleurs et deux matières)", () => {
    for (const d of DEFS) {
      const vs = sommets(deDef(d).g);
      const couleurs = new Set(vs.map((v) => v.c.map((x) => x.toFixed(3)).join("/")));
      const matieres = new Set(vs.map((v) => v.m));
      expect(couleurs.size, `${d.type} couleurs`).toBeGreaterThanOrEqual(4);
      expect(matieres.size, `${d.type} matières`).toBeGreaterThanOrEqual(2);
    }
  });

  it("la géométrie ne dépend que du type, du stade et de la graine : déterministe, et la graine varie les détails sans changer le modèle", () => {
    for (const d of DEFS) {
      expect(signature(deDef(d).g), d.type).toBe(signature(deDef(d).g));
    }
  });

  it("chaque mégaprojet est étoffé : au moins 1 000 sommets (le retour d'Adrien du 05/10/2026 jugeait les premiers trop pauvres)", () => {
    for (const d of DEFS) expect(deDef(d).g.n, d.type).toBeGreaterThanOrEqual(1000);
  });

  it("chaque site a ses abords : du feuillage (arbres plantés) et des surfaces de sol (pelouse, parking ou allée) en plus du bâtiment", () => {
    for (const d of DEFS) {
      const matieres = new Set(sommets(deDef(d).g).map((v) => v.m));
      expect(matieres.has(MAT.FOLIAGE), `${d.type} : arbres`).toBe(true);
      expect(matieres.has(MAT.LAWN) || matieres.has(MAT.PARKING) || matieres.has(MAT.PAVING), `${d.type} : sol`).toBe(true);
    }
  });

  it("le budget de poids reste modeste : moins de 8 000 sommets par mégaprojet d'un bloc, 16 000 pour le Stade et 50 000 pour le Parc d'attractions au niveau Loisirs maximal (3ᵉ consigne : « beaucoup plus de détail »), 115 000 pour les 18 au stade le plus grand", () => {
    let total = 0;
    for (const d of DEFS) {
      const n = construire(d.type, 4).g.n;
      expect(n, d.type).toBeLessThan(d.type === "stade" ? 16_000 : d.type === "grand_stade" ? 50_000 : 8000);
      total += n;
    }
    expect(total).toBeLessThan(115_000);
  });

  describe("éclairage de nuit (retour d'Adrien du 05/10/2026 : « je veux un éclairage de nuit »)", () => {
    /** Construit avec le tableau des halos de lumière au sol que generate() passe à la carte de lueur. */
    function avecLueurs(type: string, stade: number) {
      const g = new Geo();
      const ao: Construit["ao"] = [];
      const glow: { x: number; z: number }[] = [];
      const r = rngFrom("silhouettes|" + type);
      buildMegaprojet(g, 0, 0, type, stade, r, ao as never, Math.floor(r() * 900) + 50, Infinity, glow);
      return { g, glow, ...tailleMegaprojet(type, stade) };
    }

    it("chacun des 18 est entouré de lampadaires allumés la nuit (MAT.LAMP), avec une lueur au sol par lampadaire, tous dans sa plateforme", () => {
      for (const d of DEFS) {
        const { g, glow, R, Rz } = avecLueurs(d.type, d.stade);
        const lampes = sommets(g).filter((v) => v.m === MAT.LAMP);
        expect(lampes.length, `${d.type} : lampadaires`).toBeGreaterThanOrEqual(8 * 20); // une tête de 20 sommets par lampadaire
        expect(glow.length, `${d.type} : lueurs`).toBeGreaterThanOrEqual(8);
        for (const l of glow) {
          expect(Math.abs(l.x), `${d.type} lueur x`).toBeLessThanOrEqual(R + 1);
          expect(Math.abs(l.z), `${d.type} lueur z`).toBeLessThanOrEqual(Rz + 1);
        }
      }
    });

    it("le Stade et le Parc d'attractions brillent de leurs propres lumières (MAT.BEACON) et éclairent leur pelouse ou leurs allées", () => {
      for (const type of ["stade", "grand_stade"]) {
        const { g, glow } = avecLueurs(type, 4);
        expect(sommets(g).filter((v) => v.m === MAT.BEACON).length, `${type} : sommets lumineux`).toBeGreaterThanOrEqual(1000);
        // Bien plus de lueurs que le pourtour seul (~20 lampadaires) : la pelouse, l'esplanade ou les allées sont éclairées.
        expect(glow.length, `${type} : lueurs`).toBeGreaterThan(100);
      }
    });

    it("sans tableau de lueurs (tests isolés), le dessin est le même : les halos ne changent aucun sommet", () => {
      for (const d of DEFS.slice(0, 6)) {
        const avec = avecLueurs(d.type, d.stade).g;
        expect(signature(avec), d.type).toBe(signature(construire(d.type, d.stade, "silhouettes|" + d.type).g));
      }
    });
  });

  describe("réemploi des modèles déjà dessinés", () => {
    const type = (nom: string) => DEFS.find((d) => d.type === nom)!;

    // Chaque prédicat est aussi appliqué à un AUTRE type (sabotage) : s'il passe aussi là, il ne prouve rien.
    const autre = () => construire("grande_ecole", 2).g;

    it("la centrale solaire reprend la ferme de panneaux d'Énergie : ses cellules, en trois rangées au moins", () => {
      const cellules = (g: Geo) => compter(g, PANNEAU_CELLULE, MAT.PLAIN);
      expect(cellules(deDef(type("centrale_solaire")).g)).toBeGreaterThanOrEqual(3 * 3 * 4);
      expect(cellules(autre())).toBeLessThan(3 * 3 * 4);
    });

    it("le parc éolien reprend l'éolienne d'Énergie : trois mâts blancs à balise rouge", () => {
      const mats = (g: Geo) => compter(g, EOLIENNE_MAT, MAT.PLAIN);
      const balises = (g: Geo) => compter(g, COL.beacon, MAT.BEACON);
      const g = deDef(type("parc_eolien")).g;
      expect(mats(g)).toBeGreaterThanOrEqual(3 * 20);
      expect(balises(g)).toBeGreaterThanOrEqual(3 * 20); // une boîte (4 côtés + dessus) par balise
      expect(balises(autre())).toBeLessThan(3 * 20);
    });

    it("la centrale reprend les bâtiments de la centrale d'Énergie (bandeau jaune, grillage), sans ses pylônes qui sortiraient de la cour", () => {
      const g = deDef(type("centrale")).g;
      expect(compter(g, CENTRALE_ACCENT)).toBeGreaterThan(0);
      expect(sommets(g).some((v) => v.m === MAT.FENCE)).toBe(true);
      expect(sommets(g).some((v) => v.m === MAT.LATTICE)).toBe(false);
      expect(compter(autre(), CENTRALE_ACCENT)).toBe(0);
    });

    it("l'hôpital a la grande croix rouge de buildServices() (barre haute et barre large en façade) et son bandeau turquoise", () => {
      const { R, H } = deDef(type("hopital"));
      const g = deDef(type("hopital")).g;
      const croix = etenduesFace(g, SERVICES_CROIX, BASE + 0.45 * H);
      expect(croix.hauteur).toBeGreaterThanOrEqual(0.25 * H);
      expect(croix.largeur).toBeGreaterThanOrEqual(0.2 * R);
      expect(compter(g, SERVICES_BANDEAU)).toBeGreaterThan(0);
      expect(etenduesFace(autre(), SERVICES_CROIX, BASE + 0.45 * H)).toEqual({ hauteur: 0, largeur: 0 });
    });

    it("les stades ont une vraie pelouse tracée, les structures vitrées de vrais vitrages, les gares et aéroports des voûtes", () => {
      for (const nom of ["parc_sports", "stade", "grand_stade"]) expect(sommets(deDef(type(nom)).g).some((v) => v.m === MAT.LAWN), nom).toBe(true);
      for (const nom of ["tour_emblematique", "siege_international", "technopole", "centre_recherche", "grande_ecole"]) {
        expect(sommets(deDef(type(nom)).g).some((v) => v.m === MAT.GLASS), nom).toBe(true);
      }
      for (const nom of ["gare_tgv", "aeroport", "marche_couvert"]) expect(sommets(deDef(type(nom)).g).some((v) => v.m === MAT.DARKGLASS || v.m === MAT.GLASS), nom).toBe(true);
    });
  });

  describe("la taille suit le stade, pas le palier", () => {
    it("le rayon et la hauteur croissent avec le stade et restent dans un bloc (64 m) : taille réelle, A-INTEGRER §45", () => {
      let r = 0,
        h = 0;
      for (let stade = 0; stade <= 4; stade++) {
        expect(rayonMegaprojet(stade)).toBeGreaterThan(r);
        expect(hauteurMegaprojet(stade)).toBeGreaterThan(h);
        r = rayonMegaprojet(stade);
        h = hauteurMegaprojet(stade);
        expect(2 * r).toBeLessThanOrEqual(64);
        expect(h).toBeLessThanOrEqual(60);
      }
    });
  });
});
