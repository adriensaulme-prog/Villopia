import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CATALOGUE_DEVELOPPEMENTS,
  CATEGORIES_RESSOURCE,
  EFFETS_DEVELOPPEMENTS,
  FAMILLES_DEVELOPPEMENT,
  coutTotal,
  developpementDe,
  manque,
  peutFinancer,
  type StockRessources,
} from "@/lib/game/developpements";
import { dictionaries, locales } from "@/lib/i18n/dictionaries";

/**
 * A-INTEGRER §48 (migration 0054) : le catalogue des développements nationaux et ses chiffres sont
 * écrits à deux endroits, le code (affichage) et le SQL (calcul réel, anti-triche). Ce test les tient
 * identiques SANS base de données, en lisant le texte de la migration.
 */
const DOSSIER = path.join(process.cwd(), "supabase", "migrations");
const migration = (prefixe: string) => {
  const nom = readdirSync(DOSSIER).find((f) => f.startsWith(prefixe));
  if (!nom) throw new Error(`migration ${prefixe} introuvable`);
  return readFileSync(path.join(DOSSIER, nom), "utf-8");
};
const sql0054 = migration("0054_");

/** Les lignes du `values (...)` de developpements_catalogue(). */
function lignesSql() {
  const debut = sql0054.indexOf("select * from (values");
  const fin = sql0054.indexOf(") as t(id, famille", debut);
  expect(debut).toBeGreaterThan(-1);
  expect(fin).toBeGreaterThan(debut);
  const re = /\(\s*'([a-z_]+)'\s*,\s*'([a-z]+)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g;
  return [...sql0054.slice(debut, fin).matchAll(re)].map((m) => ({
    id: m[1],
    famille: m[2],
    ordre: Number(m[3]),
    cout: { industrie: Number(m[4]), techno: Number(m[5]), culture: Number(m[6]), commerce: Number(m[7]) },
  }));
}

/** Corps d'une fonction de la migration 0054, sans commentaires. */
function corps(fonction: string): string {
  const debut = sql0054.indexOf(`function public.${fonction}(`);
  expect(debut, `fonction ${fonction}`).toBeGreaterThan(-1);
  const fin = sql0054.indexOf("$$;", sql0054.indexOf("$$", debut) + 2);
  return sql0054
    .slice(debut, fin)
    .replace(/--[^\n]*/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

describe("catalogue des développements nationaux (A-INTEGRER §48)", () => {
  it("le catalogue du code est identique à developpements_catalogue() de la migration 0054", () => {
    expect(lignesSql()).toEqual(CATALOGUE_DEVELOPPEMENTS.map((d) => ({ id: d.id, famille: d.famille, ordre: d.ordre, cout: d.cout })));
  });

  it("9 développements, 3 par famille, identifiants et rangs uniques", () => {
    expect(CATALOGUE_DEVELOPPEMENTS).toHaveLength(9);
    for (const f of FAMILLES_DEVELOPPEMENT) expect(CATALOGUE_DEVELOPPEMENTS.filter((d) => d.famille === f)).toHaveLength(3);
    expect(new Set(CATALOGUE_DEVELOPPEMENTS.map((d) => d.id)).size).toBe(9);
    expect(CATALOGUE_DEVELOPPEMENTS.map((d) => d.ordre)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("chaque développement coûte quelque chose, et jamais dans plus de deux catégories (un vrai choix de ressources)", () => {
    for (const d of CATALOGUE_DEVELOPPEMENTS) {
      expect(coutTotal(d), d.id).toBeGreaterThan(0);
      expect(CATEGORIES_RESSOURCE.filter((c) => d.cout[c] > 0).length, d.id).toBeLessThanOrEqual(2);
    }
  });

  it("manque() et peutFinancer() : chaque catégorie doit couvrir son coût", () => {
    const arsenal = developpementDe("arsenal_national")!; // 6 industrie + 4 techno
    const stock = (industrie: number, techno: number): StockRessources => ({ industrie, techno, culture: 99, commerce: 99 });
    expect(peutFinancer(stock(6, 4), arsenal)).toBe(true);
    expect(peutFinancer(stock(5, 4), arsenal)).toBe(false);
    expect(manque(stock(5, 1), arsenal)).toEqual({ industrie: 1, techno: 3 });
    expect(manque(stock(60, 40), arsenal)).toEqual({});
    // Un stock négatif (votes supprimés après coup) ne compte pas comme un crédit.
    expect(manque(stock(-5, 4), arsenal)).toEqual({ industrie: 6 });
    expect(developpementDe("inconnu")).toBeUndefined();
  });

  it("chaque développement a son nom et son effet dans toutes les langues (fr, en, es)", () => {
    for (const locale of locales) {
      const dico = dictionaries[locale] as Record<string, string>;
      for (const d of CATALOGUE_DEVELOPPEMENTS) {
        expect(dico[`pays.dev.${d.id}.nom`], `${locale} ${d.id} nom`).toBeTruthy();
        expect(dico[`pays.dev.${d.id}.effet`], `${locale} ${d.id} effet`).toBeTruthy();
      }
      for (const f of FAMILLES_DEVELOPPEMENT) expect(dico[`pays.famille.${f}`], `${locale} ${f}`).toBeTruthy();
    }
  });
});

describe("chiffres des effets : le code et la migration 0054 disent la même chose", () => {
  it("Arsenal national : +20 % d'effort quand le pays attaque, seulement en attaque", () => {
    const f = corps("multiplicateur_effort_pays");
    expect(EFFETS_DEVELOPPEMENTS.arsenalEffort).toBe(0.2);
    expect(f).toContain("p_role = 'attaquant'");
    expect(f).toMatch(/'arsenal_national'.*\+ 0\.20/);
  });

  it("Mobilisation éclair : effort × 2 le premier jour, pour l'attaquant seulement", () => {
    const f = corps("multiplicateur_effort_pays");
    expect(EFFETS_DEVELOPPEMENTS.eclairPremierJour).toBe(2);
    expect(f).toMatch(/p_premier_jour and public\.a_developpement\(p_country_id, 'mobilisation_eclair'.*\* 2/);
  });

  it("Fortifications : 1,5 → 1,75", () => {
    const f = corps("multiplicateur_defensif_pays");
    expect(EFFETS_DEVELOPPEMENTS.defensifBase).toBe(1.5);
    expect(EFFETS_DEVELOPPEMENTS.defensifFortifications).toBe(1.75);
    expect(f).toMatch(/'fortifications'.*then 1\.75 else 1\.5/);
  });

  it("Bouclier civil : pertes quotidiennes × 0,5", () => {
    expect(EFFETS_DEVELOPPEMENTS.bouclierPertes).toBe(0.5);
    expect(corps("facteur_pertes_guerre_pays")).toMatch(/'bouclier_civil'.*then 0\.5 else 1/);
  });

  it("Résistance à la propagande : attaques AntiVille × 0,75", () => {
    expect(EFFETS_DEVELOPPEMENTS.resistanceAntiville).toBe(0.75);
    expect(corps("facteur_antiville_pays")).toMatch(/'resistance_propagande'.*then 0\.75 else 1/);
  });

  it("Expansion urbaine : +10 % de croissance, en plus du Commerce n°1", () => {
    expect(EFFETS_DEVELOPPEMENTS.expansionCroissance).toBe(0.1);
    const f = corps("bonus_croissance_pays");
    expect(f).toMatch(/pays_est_premier\(p_country_id, 'commerce'\) then 0\.10/);
    expect(f).toMatch(/'expansion_urbaine'\) then 0\.10/);
  });

  it("Avance technologique : −10 % des seuils, en plus du Technologie n°1", () => {
    expect(EFFETS_DEVELOPPEMENTS.avanceSeuil).toBe(0.1);
    const f = corps("reduction_seuil_pays");
    expect(f).toMatch(/pays_est_premier\(p_country_id, 'techno'\) then 0\.10/);
    expect(f).toMatch(/'avance_technologique'\) then 0\.10/);
  });

  it("Rayonnement diplomatique : voix au chapitre et +0,5 de poids", () => {
    expect(EFFETS_DEVELOPPEMENTS.rayonnementPoids).toBe(0.5);
    const f = corps("poids_voix_diplomatique_pays");
    expect(f).toContain("'rayonnement_diplomatique'");
    expect(f).toMatch(/then 0\.5 else 0/);
  });

  it("Service de renseignement : l'effort d'un autre pays n'est lisible qu'avec le développement", () => {
    const f = corps("effort_national_cible");
    expect(f).toMatch(/when public\.a_developpement\(p_country_id, 'service_renseignement'\) then public\.effort_national\(p_cible_id\) else null/);
  });
});
