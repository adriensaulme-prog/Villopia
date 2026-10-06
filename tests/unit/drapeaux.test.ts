import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Drapeau } from "@/components/Drapeau";

/**
 * Drapeaux des pays dans l'onglet Pays (décision d'Adrien du 06/10/2026, option « un petit fichier SVG par pays ») :
 * public/drapeaux/<code>.svg, tirés de flag-icons (licence MIT, public/drapeaux/LICENCE.txt). Seul le drapeau affiché est
 * téléchargé : ces tests gardent le dossier complet (un drapeau par pays du jeu, rien d'autre) et léger.
 */
const DOSSIER = join(process.cwd(), "public", "drapeaux");
const seed = readFileSync(join(process.cwd(), "supabase", "migrations", "0002_jalon1_seed_pays.sql"), "utf-8");
const CODES = [...seed.matchAll(/\('([A-Z]{2})',/g)].map((m) => m[1]);

describe("drapeaux des pays (public/drapeaux)", () => {
  it("chacun des 250 pays du jeu a son drapeau, un vrai SVG", () => {
    expect(CODES).toHaveLength(250);
    for (const c of CODES) {
      const f = join(DOSSIER, `${c.toLowerCase()}.svg`);
      expect(existsSync(f), c).toBe(true);
      const t = readFileSync(f, "utf-8");
      expect(t.startsWith("<svg"), c).toBe(true);
      expect(t).toContain('viewBox="0 0 640 480"'); // le format 4 × 3, celui que Drapeau suppose
    }
  });

  it("rien d'autre dans le dossier que ces drapeaux et la licence MIT de flag-icons", () => {
    const attendus = new Set([...CODES.map((c) => `${c.toLowerCase()}.svg`), "LICENCE.txt"]);
    for (const f of readdirSync(DOSSIER)) expect(attendus.has(f), f).toBe(true);
    expect(readFileSync(join(DOSSIER, "LICENCE.txt"), "utf-8")).toContain("The MIT License");
  });

  it("léger : la moitié des drapeaux fait moins de 1 Ko, aucun ne dépasse 200 Ko (les armoiries les plus détaillées)", () => {
    const tailles = CODES.map((c) => statSync(join(DOSSIER, `${c.toLowerCase()}.svg`)).size).sort((a, b) => a - b);
    expect(tailles[Math.floor(tailles.length / 2)]).toBeLessThan(1024);
    expect(tailles[tailles.length - 1]).toBeLessThan(200 * 1024);
  });

  it("Drapeau : le fichier du pays en 4 × 3, rien pour un code absent ou invalide", () => {
    const el = Drapeau({ code: "FR", hauteur: 30 }) as unknown as { props: { src: string; width: number; height: number; alt: string } };
    expect(el.props.src).toBe("/drapeaux/fr.svg");
    expect(el.props.width).toBe(40);
    expect(el.props.height).toBe(30);
    expect(el.props.alt).toBe("");
    for (const c of [null, undefined, "", "F", "FRA", "../x", "1A"]) expect(Drapeau({ code: c })).toBeNull();
  });
});
