import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normaliserNom, validerNomVille, validerPseudo } from "@/lib/game/nomsUniques";

/**
 * Noms uniques (docs/A-INTEGRER.md §8) : garde-fous sans base de données.
 *
 * 1. Le schéma issu des migrations garantit bien les deux index uniques
 *    sur les colonnes normalisées. C'est la base qui tient la règle
 *    (deux inscriptions simultanées ne passent pas toutes les deux), donc
 *    une future migration qui retirerait l'index ou la colonne générée
 *    doit faire échouer la suite.
 * 2. « Test rouge par sabotage » : on n'a pas d'accès SQL pour retirer
 *    l'index d'une vraie base (même constat que les specs des Jalons
 *    10 à 13). On sabote donc le TEXTE du schéma — index retiré, supprimé
 *    plus tard, commenté, colonne générée remplacée — et on vérifie que le
 *    garde passe au rouge à chaque fois. Le comportement réel (collisions
 *    refusées P0027/P0028, création simultanée) reste couvert par
 *    tests/e2e/noms-uniques.spec.ts.
 * 3. villes-de-test.json n'entre pas en collision avec lui-même ni avec
 *    les noms réservés, avec la même normalisation que la base.
 */

type Garantie = { table: string; colonne: string; source: string; drapeau: string; index: string };

const GARANTIES: Garantie[] = [
  { table: "users", colonne: "pseudo_normalise", source: "pseudo", drapeau: "pseudo_a_changer", index: "users_pseudo_normalise_unique" },
  { table: "cities", colonne: "nom_normalise", source: "nom", drapeau: "nom_a_changer", index: "cities_nom_normalise_unique" },
];

function lireSchema(): string {
  const dossier = path.join(process.cwd(), "supabase", "migrations");
  return readdirSync(dossier)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort()
    .map((f) => readFileSync(path.join(dossier, f), "utf-8"))
    .join("\n");
}

/** Texte SQL comparable : sans commentaires, espaces réduits, minuscules. */
function aplatir(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Liste ce que le schéma NE garantit PAS (vide = tout est en place).
 * Pour chaque colonne : colonne générée via nom_normalise(), index unique
 * (partiel autorisé seulement sur « not <drapeau de rattrapage> »), et
 * ni l'index ni la colonne ne sont supprimés plus loin dans les migrations.
 */
function garantiesManquantes(sql: string): string[] {
  const s = aplatir(sql);
  const manquantes: string[] = [];
  for (const g of GARANTIES) {
    const colonne = new RegExp(
      `add column ${g.colonne} text generated always as \\(public\\.nom_normalise\\(${g.source}\\)\\) stored`
    );
    const posColonne = s.search(colonne);
    if (posColonne < 0) manquantes.push(`colonne générée ${g.table}.${g.colonne}`);

    const creation = new RegExp(
      `create unique index (?:if not exists )?([a-z0-9_]+) on public\\.${g.table} (?:using btree )?\\(${g.colonne}\\)( where [^;]*)?;`,
      "g"
    );
    let vivant = false;
    for (const m of s.matchAll(creation)) {
      const predicat = (m[2] ?? "").trim();
      if (predicat !== "" && predicat !== `where not ${g.drapeau}`) continue; // index vidé de sa substance
      const apres = s.slice((m.index ?? 0) + m[0].length);
      const indexSupprime = new RegExp(`drop index (?:if exists )?(?:public\\.)?${m[1]}\\b`).test(apres);
      const colonneSupprimee = new RegExp(`drop column (?:if exists )?${g.colonne}\\b`).test(apres);
      if (!indexSupprime && !colonneSupprimee) vivant = true;
    }
    if (!vivant) manquantes.push(`index unique sur ${g.table}.${g.colonne}`);
  }
  return manquantes;
}

describe("noms uniques — le schéma garantit les index uniques (A-INTEGRER §8)", () => {
  const schema = lireSchema();

  it("les migrations créent les deux colonnes normalisées et leurs index uniques", () => {
    expect(garantiesManquantes(schema)).toEqual([]);
  });

  describe("sabotage : le garde passe au rouge quand la garantie disparaît", () => {
    for (const g of GARANTIES) {
      it(`index unique ${g.index} retiré de la migration`, () => {
        const sabote = schema.replace(new RegExp(`create unique index ${g.index}[^;]*;`, "i"), "");
        expect(sabote).not.toBe(schema); // le sabotage a bien eu lieu
        expect(garantiesManquantes(sabote)).toEqual([`index unique sur ${g.table}.${g.colonne}`]);
      });

      it(`index unique ${g.index} supprimé par une migration ultérieure`, () => {
        const sabote = `${schema}\ndrop index if exists public.${g.index};`;
        expect(garantiesManquantes(sabote)).toEqual([`index unique sur ${g.table}.${g.colonne}`]);
      });

      it(`index unique ${g.index} seulement commenté`, () => {
        const sabote = schema.replace(new RegExp(`create unique index ${g.index}`, "i"), `-- create unique index ${g.index}`);
        expect(sabote).not.toBe(schema);
        expect(garantiesManquantes(sabote)).toEqual([`index unique sur ${g.table}.${g.colonne}`]);
      });

      it(`index ${g.index} vidé de sa substance par un prédicat quelconque`, () => {
        const sabote = schema.replace(`where not ${g.drapeau};`, "where false;");
        expect(sabote).not.toBe(schema);
        expect(garantiesManquantes(sabote)).toEqual([`index unique sur ${g.table}.${g.colonne}`]);
      });

      it(`colonne ${g.colonne} remplacée par une colonne ordinaire (plus synchronisée avec ${g.source})`, () => {
        const sabote = schema.replace(
          `${g.colonne} text generated always as (public.nom_normalise(${g.source})) stored`,
          `${g.colonne} text`
        );
        expect(sabote).not.toBe(schema);
        expect(garantiesManquantes(sabote)).toContain(`colonne générée ${g.table}.${g.colonne}`);
      });
    }
  });
});

describe("noms uniques — villes-de-test.json n'entre pas en collision (A-INTEGRER §8)", () => {
  type VilleDeTest = { id: string; ville: string; pseudo: string };
  const seed = JSON.parse(
    readFileSync(path.join(process.cwd(), "supabase", "seed", "villes-de-test.json"), "utf-8")
  ) as { villes: VilleDeTest[] };

  /** Paires de noms qui se confondent après normalisation (même règle que l'index de la base). */
  function doublons(noms: string[]): string[] {
    const vus = new Map<string, string>();
    const trouves: string[] = [];
    for (const nom of noms) {
      const cle = normaliserNom(nom);
      const premier = vus.get(cle);
      if (premier !== undefined) trouves.push(`« ${premier} » / « ${nom} »`);
      else vus.set(cle, nom);
    }
    return trouves;
  }

  const villes = seed.villes.map((v) => v.ville);
  const pseudos = seed.villes.map((v) => v.pseudo);

  it("aucun nom de ville de test n'est en doublon, même à la casse, aux accents ou aux tirets près", () => {
    expect(doublons(villes)).toEqual([]);
  });

  it("aucun pseudo de test n'est en doublon, même à la casse, aux accents ou aux tirets près", () => {
    expect(doublons(pseudos)).toEqual([]);
  });

  it("aucun nom de ville ni pseudo de test n'est vide, réservé ou interdit", () => {
    const refus = ["nomVide", "nomReserve", "nomInterdit"];
    for (const nom of villes) expect(refus, nom).not.toContain(validerNomVille(nom));
    for (const pseudo of pseudos) expect(refus, pseudo).not.toContain(validerPseudo(pseudo));
  });

  it("sabotage : le détecteur voit un doublon qui ne diffère que par la casse, l'accent ou le tiret", () => {
    for (const variante of ["ROCHEMAURE", "Rochemauré", "Roche-Maure", "roche maure"]) {
      expect(villes).toContain("Rochemaure"); // la référence existe bien dans le jeu de test
      expect(doublons([...villes, variante]), variante).toHaveLength(1);
    }
  });
});
