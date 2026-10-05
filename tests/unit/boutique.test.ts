import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CartePack } from "@/components/CartePack";
import { dictionaries } from "@/lib/i18n/dictionaries";
import {
  FAMILLES_BATIMENT,
  PACKS,
  THEMES,
  THEME_PAR_DEFAUT,
  estTheme,
  etatPack,
  fichePack,
  packsDuJoueur,
  type FamilleBatiment,
  type PackJoueur,
} from "@/lib/game/themes";
import { MODELES_IMMEUBLES, MODELES_MAISONS, MODELES_TOURS } from "@/lib/ville3d/batiments";

/**
 * La boutique de packs de thèmes (docs/A-INTEGRER.md §30) : ce que le joueur
 * possède, ce qu'il voit dans « Ma ville » et dans la Boutique, et la garantie
 * que les packs restent purement cosmétiques (docs/BATIMENTS-ET-PACKS.md §4).
 */

const dossierMigrations = join(process.cwd(), "supabase", "migrations");
const lireMigration = (debut: string) => {
  const fichier = readdirSync(dossierMigrations).find((f) => f.startsWith(debut));
  if (!fichier) throw new Error(`migration ${debut} introuvable`);
  return readFileSync(join(dossierMigrations, fichier), "utf-8");
};
/** Le SQL sans ses commentaires : on vérifie ce qu'il FAIT, pas ce qu'il raconte. */
const sansCommentaires = (sql: string) => sql.replace(/--.*$/gm, "");

describe("droit d'usage des packs", () => {
  const catalogue = [
    { id: "classique", gratuit: true },
    { id: "haussmannien", gratuit: false },
  ];

  it("un pack gratuit est possédé par tout le monde, un pack payant seulement s'il a été obtenu", () => {
    const sans = packsDuJoueur(catalogue, []);
    expect(sans.find((p) => p.id === "classique")).toEqual({ id: "classique", gratuit: true, possede: true });
    expect(sans.find((p) => p.id === "haussmannien")).toEqual({ id: "haussmannien", gratuit: false, possede: false });

    const avec = packsDuJoueur(catalogue, ["haussmannien"]);
    expect(avec.find((p) => p.id === "haussmannien")?.possede).toBe(true);
  });

  it("une ligne obtenue ne rend pas gratuit un pack payant (il reste marqué payant)", () => {
    const avec = packsDuJoueur(catalogue, ["haussmannien"]);
    expect(avec.find((p) => p.id === "haussmannien")?.gratuit).toBe(false);
  });

  it("un pack gratuit pour tous est possédé sans aucune ligne obtenue", () => {
    const tousGratuits = packsDuJoueur(
      [
        { id: "classique", gratuit: true },
        { id: "haussmannien", gratuit: true },
      ],
      []
    );
    expect(tousGratuits.every((p) => p.possede)).toBe(true);
  });

  it("catalogue illisible (migration pas encore appliquée) : comportement d'avant la boutique, tout est libre", () => {
    const repli = packsDuJoueur(null, []);
    expect(repli.map((p) => p.id)).toEqual([...THEMES]);
    expect(repli.every((p) => p.gratuit && p.possede)).toBe(true);
  });

  it("un pack du code absent du catalogue n'est ni gratuit ni possédé tant qu'on ne l'a pas obtenu", () => {
    const partiel = packsDuJoueur([{ id: "classique", gratuit: true }], []);
    expect(partiel.find((p) => p.id === "haussmannien")).toEqual({ id: "haussmannien", gratuit: false, possede: false });
  });

  it("rend les packs dans l'ordre du code, un par thème", () => {
    expect(packsDuJoueur(catalogue, []).map((p) => p.id)).toEqual(PACKS.map((p) => p.id));
  });
});

describe("état d'un pack pour un joueur", () => {
  const possede: PackJoueur = { id: "haussmannien", gratuit: false, possede: true };
  const aObtenir: PackJoueur = { id: "haussmannien", gratuit: false, possede: false };

  it("appliqué, possédé ou à obtenir", () => {
    expect(etatPack(possede, "haussmannien")).toBe("applique");
    expect(etatPack(possede, "classique")).toBe("possede");
    expect(etatPack(aObtenir, "classique")).toBe("a_obtenir");
  });

  it("le thème que la ville porte reste « appliqué » même si le droit de l'utiliser a disparu", () => {
    expect(etatPack(aObtenir, "haussmannien")).toBe("applique");
  });
});

describe("catalogue des packs (TypeScript)", () => {
  it("une fiche par thème, dans le même ordre, et « classique » est le thème par défaut", () => {
    expect(PACKS.map((p) => p.id)).toEqual([...THEMES]);
    expect(THEME_PAR_DEFAUT).toBe("classique");
    expect(THEMES[0]).toBe(THEME_PAR_DEFAUT);
  });

  it("estTheme n'accepte que les thèmes connus", () => {
    expect(estTheme("haussmannien")).toBe(true);
    expect(estTheme("futuriste")).toBe(false);
    expect(estTheme(undefined)).toBe(false);
  });

  it("le pack de base couvre toutes les familles : un autre pack peut être partiel, jamais le Classique", () => {
    expect(fichePack("classique")?.familles).toEqual([...FAMILLES_BATIMENT]);
  });

  it("les familles annoncées par chaque fiche sont exactement celles où le pack a de vrais modèles", () => {
    const parFamille: Record<FamilleBatiment, readonly { pack: string }[]> = {
      maison: MODELES_MAISONS,
      immeuble: MODELES_IMMEUBLES,
      tour: MODELES_TOURS,
    };
    for (const fiche of PACKS) {
      const reelles = FAMILLES_BATIMENT.filter((f) => parFamille[f].some((m) => m.pack === fiche.id));
      expect([...fiche.familles].sort(), `pack ${fiche.id}`).toEqual([...reelles].sort());
    }
  });

  it("chaque pack a un nom, une description et ses familles en français et en anglais", () => {
    for (const langue of ["fr", "en"] as const) {
      const d = dictionaries[langue] as Record<string, string>;
      for (const fiche of PACKS) {
        expect(d[`theme.${fiche.id}`], `${langue} nom ${fiche.id}`).toBeTruthy();
        expect(d[`theme.${fiche.id}.description`], `${langue} description ${fiche.id}`).toBeTruthy();
      }
      for (const f of FAMILLES_BATIMENT) expect(d[`boutique.famille.${f}`], `${langue} ${f}`).toBeTruthy();
    }
  });

  it("une palette est une liste de couleurs hexadécimales", () => {
    for (const fiche of PACKS) {
      expect(fiche.palette.length).toBeGreaterThan(0);
      for (const couleur of fiche.palette) expect(couleur).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("un pack est purement cosmétique (BATIMENTS-ET-PACKS §4)", () => {
  it("la fiche d'un pack ne porte que de l'apparence : aucun champ de jeu", () => {
    // Si un jour un champ s'ajoute ici (bonus, coût de jeu...), ce test casse : c'est volontaire,
    // un pack ne doit jamais donner d'avantage — l'ajouter demande une décision d'Adrien.
    for (const fiche of PACKS) {
      expect(Object.keys(fiche).sort(), `pack ${fiche.id}`).toEqual(["familles", "id", "palette"]);
    }
  });

  it("la migration de la boutique ne touche à aucune donnée de jeu", () => {
    const sql = sansCommentaires(lireMigration("0047_"));
    for (const interdit of [/\bpopulation/i, /\binfluence/i, /\bactivite/i, /\bdefense/i, /\bressources?\b/i]) {
      expect(sql, String(interdit)).not.toMatch(interdit);
    }
  });

  it("definir_theme_ville ne modifie que le thème de la ville", () => {
    const sql = sansCommentaires(lireMigration("0047_"));
    const mises = sql.match(/update\s+public\.cities\s+set\s+[^;]+;/gi) ?? [];
    expect(mises).toHaveLength(1);
    expect(mises[0]).toMatch(/^update\s+public\.cities\s+set\s+theme\s*=\s*p_theme\s+where\s+id\s*=\s*p_ville_id\s+returning/i);
  });
});

describe("migration 0047 : le serveur fait respecter le droit d'usage", () => {
  const sql = sansCommentaires(lireMigration("0047_"));

  it("definir_theme_ville refuse un pack non possédé (P0030) avant d'écrire", () => {
    const corps = sql.slice(sql.search(/function\s+public\.definir_theme_ville/i));
    const iVerification = corps.search(/possede_pack\s*\(\s*p_owner_id\s*,\s*p_theme\s*\)/i);
    const iMiseAJour = corps.search(/update\s+public\.cities/i);
    expect(iVerification).toBeGreaterThan(-1);
    expect(iMiseAJour).toBeGreaterThan(iVerification);
    expect(corps).toMatch(/errcode\s*=\s*'P0030'/);
  });

  it("garde les contrôles de la migration 0034 (maire seul, thème connu)", () => {
    const corps = sql.slice(sql.search(/function\s+public\.definir_theme_ville/i));
    expect(corps).toMatch(/errcode\s*=\s*'P0007'/);
    expect(corps).toMatch(/errcode\s*=\s*'P0022'/);
    expect(corps).toMatch(/errcode\s*=\s*'P0004'/);
  });

  it("aucune policy d'écriture sur packs ni joueur_packs : seul le serveur y inscrit", () => {
    expect(sql).not.toMatch(/for\s+(insert|update|delete|all)/i);
    expect(sql).toMatch(/enable row level security/i);
  });

  it("joueur_packs n'est lisible que par son propriétaire", () => {
    expect(sql).toMatch(/on public\.joueur_packs for select\s+using \(joueur_id = auth\.uid\(\)\)/i);
  });

  it("le catalogue serveur contient exactement les thèmes du code", () => {
    const insertion = sql.match(/insert into public\.packs[^;]+;/i)?.[0] ?? "";
    const ids = [...insertion.matchAll(/\('([a-z_]+)',\s*(?:true|false)\)/g)].map((m) => m[1]);
    expect(ids).toEqual([...THEMES]);
  });

  it("Classique, le pack de base, est gratuit pour tous ; Haussmannien est payant (décision d'Adrien, 05/10/2026)", () => {
    const insertion = sql.match(/insert into public\.packs[^;]+;/i)?.[0] ?? "";
    const gratuits = Object.fromEntries(
      [...insertion.matchAll(/\('([a-z_]+)',\s*(true|false)\)/g)].map((m) => [m[1], m[2] === "true"])
    );
    expect(gratuits.classique).toBe(true);
    expect(gratuits.haussmannien).toBe(false);
  });

  it("la liste de thèmes acceptés par definir_theme_ville suit celle du code", () => {
    const corps = sql.slice(sql.search(/function\s+public\.definir_theme_ville/i));
    const liste = corps.match(/p_theme not in \(([^)]+)\)/i)?.[1] ?? "";
    expect([...liste.matchAll(/'([a-z_]+)'/g)].map((m) => m[1])).toEqual([...THEMES]);
  });

  it("la contrainte de cities.theme (0034) suit elle aussi la liste du code", () => {
    const sql0034 = sansCommentaires(lireMigration("0034_"));
    const liste = sql0034.match(/theme in \(([^)]+)\)/i)?.[1] ?? "";
    expect([...liste.matchAll(/'([a-z_]+)'/g)].map((m) => m[1])).toEqual([...THEMES]);
  });

  it("le rattrapage donne leur pack à ceux qui l'utilisaient déjà, sans en retirer à personne", () => {
    expect(sql).toMatch(/insert into public\.joueur_packs[\s\S]+from public\.cities[\s\S]+where theme <> 'classique'/i);
    expect(sql).not.toMatch(/delete\s+from/i);
  });
});

describe("fiche de pack (Boutique)", () => {
  // React échappe les apostrophes (&#x27;) : on les remet pour comparer au texte du dictionnaire.
  const decoder = (html: string) => html.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
  const rendre = (pack: PackJoueur, etat: "applique" | "possede" | "a_obtenir", enApercu = false) =>
    decoder(
      renderToStaticMarkup(
      createElement(CartePack, {
        locale: "fr",
        pack,
        fiche: fichePack(pack.id)!,
        etat,
        enApercu,
        occupe: false,
        onApercu: () => {},
        onAppliquer: () => {},
      })
      )
    );

  it("pack à obtenir : « Acheter » est désactivé et sa raison est écrite à côté", () => {
    const html = rendre({ id: "haussmannien", gratuit: false, possede: false }, "a_obtenir");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Acheter<\/button>/);
    expect(html).toContain(dictionaries.fr["boutique.achatBientot"]);
    expect(html).toContain(dictionaries.fr["boutique.payant"]);
    // Pas de « Appliquer » pour un pack qu'on ne possède pas, mais l'aperçu reste possible.
    expect(html).not.toMatch(/>Appliquer<\/button>/);
    expect(html).toMatch(/>Aperçu<\/button>/);
  });

  it("pack possédé mais pas appliqué : on peut l'aperçevoir et l'appliquer, pas l'acheter", () => {
    const html = rendre({ id: "haussmannien", gratuit: true, possede: true }, "possede");
    expect(html).toContain(dictionaries.fr["boutique.possede"]);
    expect(html).toContain(dictionaries.fr["boutique.gratuit"]);
    expect(html).toMatch(/>Appliquer<\/button>/);
    expect(html).toMatch(/>Aperçu<\/button>/);
    expect(html).not.toContain("Acheter");
  });

  it("pack appliqué : badge « Appliqué sur ta ville », plus rien à faire dessus", () => {
    const html = rendre({ id: "classique", gratuit: true, possede: true }, "applique");
    expect(html).toContain(dictionaries.fr["boutique.applique"]);
    expect(html).not.toMatch(/>Appliquer<\/button>/);
    expect(html).not.toMatch(/>Aperçu<\/button>/);
    expect(html).not.toContain("Acheter");
  });

  it("annonce les modèles dédiés d'un pack partiel et le repli sur Classique", () => {
    const partiel = rendre({ id: "haussmannien", gratuit: true, possede: true }, "possede");
    expect(partiel).toContain("Immeubles");
    expect(partiel).toContain(dictionaries.fr["boutique.resteClassique"]);
    const complet = rendre({ id: "classique", gratuit: true, possede: true }, "possede");
    expect(complet).not.toContain(dictionaries.fr["boutique.resteClassique"]);
  });

  it("l'aperçu en cours est signalé aux lecteurs d'écran", () => {
    const html = rendre({ id: "haussmannien", gratuit: true, possede: true }, "possede", true);
    expect(html).toMatch(/aria-pressed="true"/);
  });
});
