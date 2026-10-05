import { describe, expect, it } from "vitest";
import { dictionaries, locales } from "@/lib/i18n/dictionaries";

/**
 * Vérifie la règle i18n de GUIDE-METHODE.md §9 : toute clé de traduction
 * a ses langues remplies — TOUTES celles de `locales` (fr, en et, depuis le
 * A-INTEGRER §50, es). Pas de test jetable — protège contre une clé ajoutée
 * dans une langue sans son équivalent dans les autres, à chaque jalon.
 */
describe("dictionnaires i18n", () => {
  const [reference, ...autres] = locales;
  const clesParLocale = Object.fromEntries(
    locales.map((locale) => [locale, Object.keys(dictionaries[locale]).sort()])
  );
  const valeur = (locale: (typeof locales)[number], cle: string) => (dictionaries[locale] as Record<string, string>)[cle];
  const variables = (texte: string) => [...texte.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

  it("a au moins une clé", () => {
    expect(clesParLocale[reference].length).toBeGreaterThan(0);
  });

  it("a exactement les mêmes clés dans toutes les langues (aucune clé manquante ni orpheline)", () => {
    for (const locale of autres) {
      const manquantes = clesParLocale[reference].filter((c) => !clesParLocale[locale].includes(c));
      const orphelines = clesParLocale[locale].filter((c) => !clesParLocale[reference].includes(c));
      expect({ locale, manquantes, orphelines }).toEqual({ locale, manquantes: [], orphelines: [] });
    }
  });

  it("n'a aucune valeur vide", () => {
    for (const locale of locales) {
      for (const [cle, texte] of Object.entries(dictionaries[locale])) {
        expect(texte.trim(), `${locale}.${cle}`).not.toBe("");
      }
    }
  });

  it("garde les mêmes {variables} dans chaque langue pour une même clé (une traduction n'en perd ni n'en invente)", () => {
    for (const locale of autres) {
      for (const cle of clesParLocale[reference]) {
        expect(variables(valeur(locale, cle)), `${locale}.${cle}`).toEqual(variables(valeur(reference, cle)));
      }
    }
  });

  // Mots qui s'écrivent vraiment pareil en français et en espagnol (« de », « disponible », « hab. ») : pas des oublis.
  const IDENTIQUES_FR_ES = ["classement.dans", "nom.disponible", "pays.stock.disponible", "ville.habitantsAbrege", "villes.deJoueur"];

  it("l'espagnol est réellement traduit : aucune valeur n'est une simple copie du français (hors mots identiques connus)", () => {
    const copies = clesParLocale.fr.filter(
      (c) => valeur("es", c) === valeur("fr", c) && valeur("en", c) !== valeur("fr", c) && !IDENTIQUES_FR_ES.includes(c)
    );
    expect(copies).toEqual([]);
  });

  it("la liste des mots identiques fr/es reste vraie : une clé qui y figure s'écrit bien pareil dans les deux langues", () => {
    for (const c of IDENTIQUES_FR_ES) expect(valeur("es", c), c).toBe(valeur("fr", c));
  });

  it("l'espagnol utilise la ponctuation espagnole : toute question ou exclamation s'ouvre par ¿ ou ¡", () => {
    for (const cle of clesParLocale.es) {
      const texte = valeur("es", cle);
      const questions = (texte.match(/\?/g) ?? []).length,
        ouvrantes = (texte.match(/¿/g) ?? []).length;
      expect(ouvrantes, `es.${cle} : « ¿ » manquant`).toBe(questions);
      const exclamations = (texte.match(/!/g) ?? []).length,
        ouvertes = (texte.match(/¡/g) ?? []).length;
      expect(ouvertes, `es.${cle} : « ¡ » manquant`).toBe(exclamations);
    }
  });
});
