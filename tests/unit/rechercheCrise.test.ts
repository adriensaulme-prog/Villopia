import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Technologies } from "@/components/Technologies";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { rechercheEnCrise } from "@/lib/game/technologies";

/**
 * Malus de crise de la Recherche (docs/A-INTEGRER.md §42, migration 0051) :
 * « pas de nouvelle technologie débloquée » sous 60 % de jauge.
 */
const dossier = join(process.cwd(), "supabase", "migrations");
const lire = (debut: string) => {
  const f = readdirSync(dossier).find((n) => n.startsWith(debut));
  if (!f) throw new Error(`migration ${debut} introuvable`);
  return readFileSync(join(dossier, f), "utf-8");
};
const sansCommentaires = (sql: string) => sql.replace(/--.*$/gm, "");

describe("rechercheEnCrise (copie TypeScript de la règle serveur)", () => {
  it("en crise sous 60 %, pas à partir de 60 %", () => {
    expect(rechercheEnCrise(0)).toBe(true);
    expect(rechercheEnCrise(0.59)).toBe(true);
    expect(rechercheEnCrise(0.6)).toBe(false);
    expect(rechercheEnCrise(1)).toBe(false);
    expect(rechercheEnCrise(1.8)).toBe(false);
  });

  it("même seuil que intensite_crise() en SQL (0 à 60 %)", () => {
    const sql = sansCommentaires(lire("0024_"));
    expect(sql).toMatch(/function public\.intensite_crise[\s\S]+?p_jauge >= 0\.6 then 0/);
  });
});

describe("migration 0051", () => {
  const sql = sansCommentaires(lire("0051_"));

  it("avancer_technologies sort avant tout déblocage tant que la Recherche est en crise", () => {
    const corps = sql.slice(sql.search(/function public\.avancer_technologies/i));
    const iGarde = corps.search(/if public\.recherche_en_crise\(p_ville_id\) then\s+return;/i);
    const iInsertion = corps.search(/insert into public\.technologies/i);
    expect(iGarde).toBeGreaterThan(-1);
    expect(iInsertion).toBeGreaterThan(iGarde);
  });

  it("recherche_en_crise lit la jauge de Recherche et l'intensité de crise du §4", () => {
    expect(sql).toMatch(/intensite_crise\(public\.jauge_activite\(p_ville_id, 'recherche'\)\)\s*>\s*0/);
  });

  it("garde le déblocage de la migration 0029 : mêmes seuils, même événement, jamais de suppression", () => {
    const corps = sql.slice(sql.search(/function public\.avancer_technologies/i));
    expect(corps).toMatch(/while v_points >= public\.seuil_technologie\(v_palier\) loop/);
    expect(corps).toMatch(/'technologie_debloquee'/);
    expect(sql).not.toMatch(/delete\s+from/i);
    expect(sql).not.toMatch(/update\s+public\./i);
  });

  it("ne touche à aucune donnée de jeu (population, influence, visites)", () => {
    for (const interdit of [/\bpopulation/i, /\binfluence/i, /public\.visites\b/i]) {
      expect(sql, String(interdit)).not.toMatch(interdit);
    }
  });
});

describe("affichage des technologies", () => {
  const rendre = (enCrise: boolean, langue: "fr" | "en" = "fr") =>
    renderToStaticMarkup(createElement(Technologies, { locale: langue, paliersDebloques: 1, pointsRecherche: 120, enCrise }))
      .replace(/&#x27;/g, "'");

  it("prévient le joueur quand la Recherche est en crise, et seulement alors", () => {
    expect(rendre(true)).toContain(dictionaries.fr["technologie.enCrise"]);
    expect(rendre(false)).not.toContain(dictionaries.fr["technologie.enCrise"]);
    expect(rendre(true, "en")).toContain(dictionaries.en["technologie.enCrise"]);
  });

  it("le message rassure : rien n'est perdu", () => {
    expect(dictionaries.fr["technologie.enCrise"]).toMatch(/rien n'est perdu/);
  });
});
