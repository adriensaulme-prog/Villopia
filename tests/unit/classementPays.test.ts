import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  BONUS_PREMIER,
  bonusCroissancePays,
  estPremier,
  formaterPoids,
  poidsVoixDiplomatique,
  reductionSeuilPays,
  seuilEffectif,
  type LigneClassementPays,
} from "@/lib/game/classementPays";
import { CATALOGUE_BATIMENTS } from "@/lib/game/monuments";
import { dictionaries, locales } from "@/lib/i18n/dictionaries";

/**
 * A-INTEGRER §47 (migration 0052) : classement hebdomadaire des pays et effets du n°1. Les chiffres
 * sont écrits dans le code (affichage) et dans le SQL (calcul réel) : ce test les tient identiques
 * sans base de données, et protège les fonctions pures qui les combinent.
 */
const DOSSIER = path.join(process.cwd(), "supabase", "migrations");
const migration = (prefixe: string) => {
  const nom = readdirSync(DOSSIER).find((f) => f.startsWith(prefixe));
  if (!nom) throw new Error(`migration ${prefixe} introuvable`);
  return readFileSync(path.join(DOSSIER, nom), "utf-8");
};

function corps(sql: string, fonction: string): string {
  const debut = sql.indexOf(`function public.${fonction}(`);
  expect(debut, `fonction ${fonction}`).toBeGreaterThan(-1);
  const fin = sql.indexOf("$$;", sql.indexOf("$$", debut) + 2);
  return sql
    .slice(debut, fin)
    .replace(/--[^\n]*/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

describe("chiffres du n°1 de chaque catégorie (§47)", () => {
  const sql = migration("0052_");

  it("Industrie n°1 : +15 % d'effort national en guerre", () => {
    expect(BONUS_PREMIER.industrieEffort).toBe(0.15);
    expect(corps(sql, "bonus_effort_guerre_pays")).toMatch(/pays_est_premier\(p_country_id, 'industrie'.*\) then 0\.15 else 0/);
  });

  it("Commerce n°1 : +10 % de chance d'un habitant de plus par visite", () => {
    expect(BONUS_PREMIER.commerceCroissance).toBe(0.1);
    expect(corps(sql, "bonus_croissance_pays")).toMatch(/pays_est_premier\(p_country_id, 'commerce'\) then 0\.10 else 0/);
  });

  it("Technologie n°1 : −10 % sur les seuils d'influence", () => {
    expect(BONUS_PREMIER.technoSeuil).toBe(0.1);
    expect(corps(sql, "reduction_seuil_pays")).toMatch(/pays_est_premier\(p_country_id, 'techno'\) then 0\.10 else 0/);
  });

  it("Culture n°1 : l'avis pèse double", () => {
    expect(BONUS_PREMIER.culturePoids).toBe(2);
    expect(corps(sql, "poids_voix_diplomatique_pays")).toMatch(/pays_est_premier\(p_country_id, 'culture'.*\) then 2 else 0/);
  });

  it("les quatre effets ont leur texte dans toutes les langues (fr, en, es)", () => {
    for (const locale of locales) {
      const dico = dictionaries[locale] as Record<string, string>;
      for (const c of ["industrie", "techno", "culture", "commerce"]) {
        expect(dico[`pays.classement.effet.${c}`], `${locale} ${c}`).toBeTruthy();
      }
    }
  });
});

describe("fonctions pures du classement (§47) et des développements (§48)", () => {
  const ligne = (rang: number | null): LigneClassementPays => ({
    categorie: "industrie",
    rang,
    total: 10,
    nbPays: 5,
    premierCountryId: "FR",
    premierTotal: 10,
  });

  it("estPremier : seul le rang 1 active l'effet", () => {
    expect(estPremier(ligne(1))).toBe(true);
    expect(estPremier(ligne(2))).toBe(false);
    expect(estPremier(ligne(null))).toBe(false);
  });

  it("seuilEffectif : plafond(seuil × (1 − réduction)), comme avancer_monuments()", () => {
    expect(seuilEffectif(10, 0)).toBe(10);
    expect(seuilEffectif(10, 0.1)).toBe(9); // 9,000000000000002 en flottants : l'arrondi évite 10
    expect(seuilEffectif(25, 0.1)).toBe(23); // 22,5 → 23
    expect(seuilEffectif(400, 0.2)).toBe(320);
    expect(seuilEffectif(1_000_000, 0.2)).toBe(800_000);
  });

  it("une réduction n'inverse jamais l'ordre des paliers du catalogue", () => {
    const tries = [...CATALOGUE_BATIMENTS].sort((a, b) => a.seuil - b.seuil);
    for (const reduction of [0.1, 0.2]) {
      const effectifs = tries.map((e) => seuilEffectif(e.seuil, reduction));
      expect(effectifs).toEqual([...effectifs].sort((a, b) => a - b));
    }
  });

  it("poidsVoixDiplomatique : 0 sans voix, sinon 1 + 1 (Culture n°1) + 0,5 (Rayonnement)", () => {
    expect(poidsVoixDiplomatique({ premierCulture: false, rayonnement: false })).toBe(0);
    expect(poidsVoixDiplomatique({ premierCulture: true, rayonnement: false })).toBe(2);
    expect(poidsVoixDiplomatique({ premierCulture: false, rayonnement: true })).toBe(1.5);
    expect(poidsVoixDiplomatique({ premierCulture: true, rayonnement: true })).toBe(2.5);
  });

  it("bonusCroissancePays et reductionSeuilPays additionnent le n°1 et le développement", () => {
    expect(bonusCroissancePays({ premierCommerce: false, expansionUrbaine: false })).toBe(0);
    expect(bonusCroissancePays({ premierCommerce: true, expansionUrbaine: false })).toBe(0.1);
    expect(bonusCroissancePays({ premierCommerce: true, expansionUrbaine: true })).toBeCloseTo(0.2, 10);
    expect(reductionSeuilPays({ premierTechno: true, avanceTechnologique: true })).toBeCloseTo(0.2, 10);
  });

  it("formaterPoids : une décimale au plus, selon la langue", () => {
    expect(formaterPoids(2.5, "en")).toBe("2.5");
    expect(formaterPoids(2.5, "fr")).toBe("2,5");
    expect(formaterPoids(2, "fr")).toBe("2");
  });
});
