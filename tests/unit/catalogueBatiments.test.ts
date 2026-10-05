import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ACTIVITES } from "@/lib/game/activites";
import {
  BONUS_MEGAPROJETS,
  CATALOGUE_MEGAPROJETS,
  POPULATION_STADE,
  PREMIER_PALIER_MEGAPROJET,
  megaprojetDuPalier,
  rangDansLeStade,
} from "@/lib/game/megaprojets";
import {
  CATALOGUE_BATIMENTS,
  CATALOGUE_MONUMENTS,
  batimentsDebloques,
  catalogueParSeuil,
  entreeCatalogue,
  repartirBatiments,
} from "@/lib/game/monuments";
import { traduire } from "@/lib/i18n/dictionaries";

/**
 * A-INTEGRER §41 (05/10/2026) : les mégaprojets rejoignent le catalogue à
 * seuils d'influence des monuments (migration 0050). Ces tests tiennent le
 * catalogue du code et celui de la base identiques SANS base de données (on
 * lit le texte des migrations), protègent les identifiants déjà stockés, et
 * vérifient que le financement a bien disparu.
 */
const DOSSIER_MIGRATIONS = path.join(process.cwd(), "supabase", "migrations");
const migration = (prefixe: string) => {
  const nom = readdirSync(DOSSIER_MIGRATIONS).find((f) => f.startsWith(prefixe));
  if (!nom) throw new Error(`migration ${prefixe} introuvable`);
  return readFileSync(path.join(DOSSIER_MIGRATIONS, nom), "utf-8");
};

interface LigneSql {
  palier: number;
  seuil: number;
  type: string;
  famille?: string;
  activite?: string | null;
}

/** Les lignes du `values (...)` de monument_catalogue(), dans une migration (3 colonnes en 0030, 5 en 0050). */
function lignesCatalogue(sql: string): LigneSql[] {
  const debut = sql.indexOf("select * from (values");
  const fin = sql.indexOf(") as t(palier", debut);
  if (debut < 0 || fin < 0) throw new Error("catalogue introuvable dans la migration");
  const re = /\(\s*(\d+)\s*,\s*(\d+)\s*,\s*'([a-z_]+)'(?:\s*,\s*'([a-z]+)'\s*,\s*(null(?:::text)?|'[a-z]+'))?\s*\)/g;
  return [...sql.slice(debut, fin).matchAll(re)].map((m) => ({
    palier: Number(m[1]),
    seuil: Number(m[2]),
    type: m[3],
    ...(m[4] !== undefined ? { famille: m[4], activite: m[5].startsWith("null") ? null : m[5].replace(/'/g, "") } : {}),
  }));
}

describe("catalogue unifié — structure", () => {
  it("34 entrées : les 16 monuments (paliers 0 à 15) puis les 18 mégaprojets (16 à 33)", () => {
    expect(CATALOGUE_BATIMENTS).toHaveLength(34);
    expect(CATALOGUE_BATIMENTS.map((e) => e.palier)).toEqual(Array.from({ length: 34 }, (_, i) => i));
    expect(CATALOGUE_MONUMENTS).toHaveLength(16);
    expect(CATALOGUE_MEGAPROJETS).toHaveLength(18);
    expect(PREMIER_PALIER_MEGAPROJET).toBe(CATALOGUE_MONUMENTS.length);
    expect(CATALOGUE_BATIMENTS.slice(0, 16).every((e) => e.famille === "monument" && e.activite === null)).toBe(true);
    expect(CATALOGUE_BATIMENTS.slice(16).every((e) => e.famille === "megaprojet" && e.activite !== null)).toBe(true);
  });

  it("aucun seuil n'est partagé entre deux entrées, et ce sont des entiers positifs", () => {
    const seuils = CATALOGUE_BATIMENTS.map((e) => e.seuil);
    expect(new Set(seuils).size).toBe(seuils.length);
    for (const s of seuils) expect(Number.isInteger(s) && s > 0).toBe(true);
  });

  it("les mégaprojets sont rangés par seuil croissant (leur palier suit leur ordre d'apparition), comme les monuments", () => {
    for (const liste of [CATALOGUE_MONUMENTS, CATALOGUE_MEGAPROJETS]) {
      for (let i = 1; i < liste.length; i++) expect(liste[i].seuil).toBeGreaterThan(liste[i - 1].seuil);
    }
  });

  it("aucun doublon de type, et chaque mégaprojet a une activité connue", () => {
    const types = CATALOGUE_BATIMENTS.map((e) => e.type);
    expect(new Set(types).size).toBe(types.length);
    for (const m of CATALOGUE_MEGAPROJETS) expect(ACTIVITES).toContain(m.activite);
  });

  it("les mégaprojets gardent leurs 5 anciens stades (3, 4, 4, 4, 3), dans l'ordre", () => {
    const stades = CATALOGUE_MEGAPROJETS.map((m) => m.stade);
    expect(stades).toEqual([0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4]);
    expect(POPULATION_STADE).toEqual([5000, 15000, 40000, 100000, 250000]);
  });

  it("les mégaprojets s'intercalent entre les monuments : le premier est à 400, le dernier à 400 000", () => {
    const mega = catalogueParSeuil().filter((e) => e.famille === "megaprojet");
    expect(mega[0].seuil).toBe(400);
    expect(mega.at(-1)!.seuil).toBe(400_000);
    // Pas tous regroupés d'un côté : des monuments restent avant, entre et après.
    const ordre = catalogueParSeuil().map((e) => e.famille);
    expect(ordre.indexOf("megaprojet")).toBeGreaterThan(0);
    expect(ordre.lastIndexOf("monument")).toBeGreaterThan(ordre.lastIndexOf("megaprojet"));
  });
});

describe("catalogue unifié — fonctions", () => {
  it("entreeCatalogue / megaprojetDuPalier : bornes et familles", () => {
    expect(entreeCatalogue(0)).toMatchObject({ famille: "monument", type: "borne_commemorative", seuil: 10 });
    expect(entreeCatalogue(16)).toMatchObject({ famille: "megaprojet", type: "grande_ecole", seuil: 400, activite: "services" });
    expect(entreeCatalogue(33)).toMatchObject({ type: "siege_international" });
    expect(entreeCatalogue(34)).toBeNull();
    expect(entreeCatalogue(-1)).toBeNull();
    expect(megaprojetDuPalier(15)).toBeNull();
    expect(megaprojetDuPalier(16)?.type).toBe("grande_ecole");
    expect(megaprojetDuPalier(34)).toBeNull();
  });

  it("catalogueParSeuil : l'ordre d'apparition, monuments et mégaprojets mêlés", () => {
    const debut = catalogueParSeuil().slice(0, 12).map((e) => e.type);
    expect(debut).toEqual([
      "borne_commemorative", // 10
      "banc_public", // 25
      "fontaine_simple", // 50
      "buste", // 100
      "obelisque", // 250
      "grande_ecole", // 400
      "arc_triomphe_miniature", // 500
      "parc_sports", // 750
      "horloge_municipale", // 1 000
      "marche_couvert", // 1 500
      "hopital", // 2 000
      "fontaine_monumentale", // 2 500
    ]);
    const seuils = catalogueParSeuil().map((e) => e.seuil);
    expect(seuils).toEqual([...seuils].sort((a, b) => a - b));
  });

  it("batimentsDebloques : tout ce que le record d'influence atteint, rien avant", () => {
    expect(batimentsDebloques(0)).toHaveLength(0);
    expect(batimentsDebloques(9)).toHaveLength(0);
    expect(batimentsDebloques(10)).toHaveLength(1);
    expect(batimentsDebloques(399)).toHaveLength(5);
    expect(batimentsDebloques(400)).toHaveLength(6); // la Grande école arrive
    expect(batimentsDebloques(2000)).toHaveLength(11); // 7 monuments + 4 mégaprojets
    expect(batimentsDebloques(2000).filter((e) => e.famille === "megaprojet").map((e) => e.palier)).toEqual([16, 17, 18, 19]);
    expect(batimentsDebloques(1_000_000_000)).toHaveLength(34);
  });

  it("repartirBatiments : monuments d'un côté, mégaprojets (avec leur activité) de l'autre, inconnus ignorés", () => {
    expect(repartirBatiments([0, 16, 19, 99, -3])).toEqual({
      monuments: [{ palier: 0, type: "borne_commemorative" }],
      megaprojets: [
        { palier: 16, type: "grande_ecole", activite: "services" },
        { palier: 19, type: "hopital", activite: "services" },
      ],
    });
    expect(repartirBatiments([])).toEqual({ monuments: [], megaprojets: [] });
  });

  it("rangDansLeStade : 0 pour le premier de chaque stade, puis +1 ; 0 pour un palier qui n'est pas un mégaprojet", () => {
    expect([16, 17, 18].map(rangDansLeStade)).toEqual([0, 1, 2]);
    expect([19, 20, 21, 22].map(rangDansLeStade)).toEqual([0, 1, 2, 3]);
    expect([23, 24, 25, 26].map(rangDansLeStade)).toEqual([0, 1, 2, 3]);
    expect([27, 28, 29, 30].map(rangDansLeStade)).toEqual([0, 1, 2, 3]);
    expect([31, 32, 33].map(rangDansLeStade)).toEqual([0, 1, 2]);
    expect(rangDansLeStade(3)).toBe(0);
  });

  it("chaque type du catalogue a un nom français ET anglais, et le libellé d'événement existe", () => {
    for (const e of CATALOGUE_BATIMENTS) {
      for (const locale of ["fr", "en"] as const) {
        const cle = `${e.famille === "monument" ? "monument" : "megaprojet"}.type.${e.type}`;
        const texte = traduire(locale, cle as never);
        expect(typeof texte === "string" && texte.length > 0, `${locale} ${cle}`).toBe(true);
      }
    }
    for (const locale of ["fr", "en"] as const) {
      expect(traduire(locale, "bulletin.megaprojetDebloque").length).toBeGreaterThan(0);
      expect(traduire(locale, "monument.titre").length).toBeGreaterThan(0);
    }
  });
});

describe("parité avec la base (texte des migrations)", () => {
  it("monument_catalogue() de la migration 0050 est identique au catalogue du code, entrée par entrée", () => {
    const sql = lignesCatalogue(migration("0050_"));
    const code = CATALOGUE_BATIMENTS.map((e) => ({
      palier: e.palier,
      seuil: e.seuil,
      type: e.type,
      famille: e.famille,
      activite: e.activite,
    }));
    expect(sql).toEqual(code);
  });

  it("les 16 monuments gardent exactement leurs paliers, seuils et types de la migration 0030 (aucune ligne existante ne change de sens)", () => {
    const ancien = lignesCatalogue(migration("0030_"));
    expect(ancien).toHaveLength(16);
    expect(lignesCatalogue(migration("0050_")).slice(0, 16).map(({ palier, seuil, type }) => ({ palier, seuil, type }))).toEqual(ancien);
  });

  it("les bonus conservés visent les mêmes types dans le SQL qui les applique", () => {
    const liste = (types: readonly string[]) => `array[${types.map((t) => `'${t}'`).join(", ")}]`;
    const m0028 = migration("0028_");
    const m0045 = migration("0045_");
    expect(m0028).toContain(liste(BONUS_MEGAPROJETS.manifestation)); // verifier_manifestation()
    expect(m0028).toContain(liste(BONUS_MEGAPROJETS.energie)); // jauges_ville()
    expect(m0045).toContain(liste(BONUS_MEGAPROJETS.contamination)); // lancer_action_antiville()
    expect(m0045).toContain(liste(BONUS_MEGAPROJETS.propagande));
    for (const types of Object.values(BONUS_MEGAPROJETS)) {
      for (const t of types) expect(CATALOGUE_MEGAPROJETS.map((m) => m.type)).toContain(t);
    }
  });

  it("la migration 0050 supprime le financement : 7 fonctions, la table megaprojets et les 2 colonnes de dépense", () => {
    const sql = migration("0050_").replace(/--[^\n]*/g, "");
    for (const f of [
      "choisir_megaprojet(uuid, uuid, integer, text)",
      "avancer_megaprojets(uuid)",
      "etat_megaprojets(uuid)",
      "megaprojet_options(integer)",
      "seuil_megaprojet(integer)",
      "nb_megaprojets_ouverts(integer)",
      "cout_megaprojet(integer)",
    ]) {
      expect(sql, f).toContain(`drop function if exists public.${f};`);
    }
    expect(sql).toContain("drop table if exists public.megaprojets;");
    expect(sql).toContain("drop column if exists materiaux_depenses");
    expect(sql).toContain("drop column if exists revenus_depenses");
  });

  it("aucune migration postérieure à la 0050 ne recrée le financement", () => {
    for (const f of readdirSync(DOSSIER_MIGRATIONS).filter((n) => n.slice(0, 4) > "0050")) {
      const sql = readFileSync(path.join(DOSSIER_MIGRATIONS, f), "utf-8").replace(/--[^\n]*/g, "");
      expect(sql, f).not.toMatch(/create table (if not exists )?public\.megaprojets|materiaux_depenses|revenus_depenses|function public\.choisir_megaprojet/);
    }
  });
});

describe("plus de ressources de ville ni de financement dans le code", () => {
  function fichiers(dossier: string): string[] {
    return readdirSync(dossier, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? fichiers(path.join(dossier, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [path.join(dossier, e.name)] : []
    );
  }

  it("aucun fichier de src/ n'appelle l'ancien financement ni ne lit les stocks dépensés", () => {
    const interdit =
      /choisir_megaprojet|etat_megaprojets|avancer_megaprojets|cout_megaprojet|nb_megaprojets_ouverts|materiaux_depenses|revenus_depenses|choisirMegaprojet|coutMegaprojet|nbMegaprojetsOuverts|seuilMegaprojet/;
    for (const f of fichiers(path.join(process.cwd(), "src"))) {
      expect(readFileSync(f, "utf-8"), path.relative(process.cwd(), f)).not.toMatch(interdit);
    }
  });

  it("le panneau « Mégaprojets du maire » n'existe plus", () => {
    const composants = readdirSync(path.join(process.cwd(), "src", "components"));
    expect(composants).not.toContain("Megaprojets.tsx");
  });
});
