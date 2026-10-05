import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Point fort du Résidentiel (docs/A-INTEGRER.md §42) : garde-fou sans base de données.
 *
 * visiter_ville() a été recopiée dans 12 migrations (0003 à 0024, 0039, 0045, 0049) :
 * chaque nouvelle copie peut, sans le vouloir, perdre un effet branché par la précédente.
 * Ce garde échoue si la DERNIÈRE définition de visiter_ville() :
 *   - n'a plus la crise du logement du Résidentiel (probabilité jauge ÷ 60 %) ;
 *   - n'a plus le tirage du point fort Résidentiel, ou l'appelle avec la mauvaise jauge,
 *     ou hors du bloc où la visite rapporte l'habitant ;
 *   - a perdu le tirage du Commerce, dont celui du Résidentiel est indépendant ;
 * et si bonus_croissance_residentiel() n'est plus une chance (entre 0 exclu et 1) tirée
 * de intensite_point_fort(), c'est-à-dire nulle jusqu'à 120 % de jauge.
 *
 * « Test rouge par sabotage » : on n'a pas d'accès SQL pour retirer l'effet d'une vraie
 * base (même constat que tests/unit/nomsUniquesSchema.test.ts). On sabote donc le TEXTE du
 * schéma et on vérifie que le garde passe au rouge à chaque fois. Le comportement réel
 * (chance mesurée sur des visites, fonction pure) est dans tests/e2e/residentiel-point-fort.spec.ts.
 */

const dossier = path.join(process.cwd(), "supabase", "migrations");
const fichiers = readdirSync(dossier)
  .filter((f) => /^\d{4}_.+\.sql$/.test(f))
  .sort();

function lire(nom: string): string {
  return readFileSync(path.join(dossier, nom), "utf-8");
}

function lireSchema(): string {
  return fichiers.map(lire).join("\n");
}

/** Texte SQL comparable : sans commentaires, espaces réduits, minuscules. */
function aplatir(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Corps de la DERNIÈRE définition de la fonction (jusqu'à son `$$;`), ou null. */
function derniereDefinition(sqlAplati: string, fonction: string): string | null {
  const debut = sqlAplati.lastIndexOf(`function public.${fonction}(`);
  if (debut === -1) return null;
  const fin = sqlAplati.indexOf("$$;", debut);
  return sqlAplati.slice(debut, fin === -1 ? undefined : fin);
}

/** Liste ce que le schéma NE garantit PAS (vide = tout est en place). */
function garantiesManquantes(sql: string): string[] {
  const s = aplatir(sql);
  const manquantes: string[] = [];

  const visite = derniereDefinition(s, "visiter_ville");
  if (visite === null) {
    manquantes.push("visiter_ville() n'est définie nulle part");
  } else {
    const debutBloc = visite.indexOf("if random() < v_probabilite_gain then");
    const debutSolidarite = visite.indexOf("select type_action, created_at into v_dernier_type_action");
    const bloc = debutBloc === -1 || debutSolidarite === -1 ? "" : visite.slice(debutBloc, debutSolidarite);

    if (!/v_probabilite_gain := case when v_jauge_residentiel < 0\.6 then v_jauge_residentiel \/ 0\.6 else 1 end/.test(visite)) {
      manquantes.push("crise du logement (probabilité jauge ÷ 60 %) absente de visiter_ville()");
    }
    if (bloc === "") {
      manquantes.push("bloc « la visite rapporte l'habitant » introuvable dans visiter_ville()");
    }
    if (!/if random\(\) < public\.bonus_croissance_residentiel\(v_jauge_residentiel\) then v_gain := v_gain \+ 1; end if;/.test(bloc)) {
      manquantes.push("tirage du point fort Résidentiel absent du bloc de gain (ou jauge d'une autre activité)");
    }
    if (!/if random\(\) < public\.intensite_point_fort\(v_jauge_commerce\) \* 0\.25 then v_gain := v_gain \+ 1; end if;/.test(bloc)) {
      manquantes.push("tirage du point fort Commerce absent du bloc de gain");
    }
  }

  const bonus = derniereDefinition(s, "bonus_croissance_residentiel");
  if (bonus === null) {
    manquantes.push("bonus_croissance_residentiel() n'est définie nulle part");
  } else {
    const corps = /select public\.intensite_point_fort\(p_jauge\) \* ([0-9.]+);/.exec(bonus);
    if (!corps) {
      manquantes.push("bonus_croissance_residentiel() ne dérive plus de intensite_point_fort(p_jauge)");
    } else {
      const plafond = Number(corps[1]);
      if (!(plafond > 0 && plafond <= 1)) {
        manquantes.push(`plafond du point fort Résidentiel hors de ]0 ; 1] : ${corps[1]}`);
      }
    }
  }

  return manquantes;
}

describe("point fort du Résidentiel (A-INTEGRER §42) : garde de schéma", () => {
  it("le schéma actuel garantit crise, point fort et tirage indépendant du Commerce", () => {
    expect(garantiesManquantes(lireSchema())).toEqual([]);
  });

  it("la dernière définition de visiter_ville() vient bien d'une migration qui connaît le point fort", () => {
    const derniere = [...fichiers].reverse().find((f) => /function public\.visiter_ville\(/.test(lire(f)));
    expect(derniere).toBeDefined();
    expect(lire(derniere!)).toMatch(/bonus_croissance_residentiel/);
  });

  describe("sabotages : chacun fait passer le garde au rouge", () => {
    const schema = lireSchema();
    // replaceAll : visiter_ville() est recopiée dans plusieurs migrations, le sabotage doit toucher la DERNIÈRE aussi.
    const tirage = "if random() < public.bonus_croissance_residentiel(v_jauge_residentiel) then";

    it("le tirage du point fort est retiré de visiter_ville()", () => {
      expect(schema).toContain(tirage);
      const saboteur = schema.replaceAll(tirage, "if false then");
      expect(garantiesManquantes(saboteur)).not.toEqual([]);
    });

    it("le tirage est branché sur la jauge du Commerce au lieu de celle du Résidentiel", () => {
      const saboteur = schema.replaceAll(tirage, "if random() < public.bonus_croissance_residentiel(v_jauge_commerce) then");
      expect(garantiesManquantes(saboteur)).not.toEqual([]);
    });

    it("le tirage sort du bloc de gain (la crise et le point fort se mélangeraient)", () => {
      const saboteur = schema
        .replaceAll(tirage, "if false then")
        // Même ligne, mais après la solidarité : hors du bloc où la visite rapporte l'habitant.
        .replaceAll(
          "update public.visites set gain = v_gain where id = v_visite_id;",
          `${tirage} v_gain := v_gain + 1; end if; update public.visites set gain = v_gain where id = v_visite_id;`
        );
      expect(garantiesManquantes(saboteur)).not.toEqual([]);
    });

    it("une migration ultérieure recopie visiter_ville() sans le point fort (régression réelle des recopies)", () => {
      const sansPointFort = lire("0045_antiville_annule_la_visite.sql");
      expect(garantiesManquantes(`${schema}\n${sansPointFort}`)).not.toEqual([]);
    });

    it("la crise du logement est retirée de visiter_ville()", () => {
      const crise = "v_jauge_residentiel / 0.6";
      expect(schema).toContain(crise);
      const saboteur = schema.replaceAll(crise, "1");
      expect(garantiesManquantes(saboteur)).not.toEqual([]);
    });

    it("le tirage du Commerce disparaît (le tirage Résidentiel doit rester indépendant du sien)", () => {
      const commerce = "if random() < public.intensite_point_fort(v_jauge_commerce) * 0.25 then";
      expect(schema).toContain(commerce);
      expect(garantiesManquantes(schema.replaceAll(commerce, "if false then"))).not.toEqual([]);
    });

    it("la chance devient certaine (plafond > 1) ou nulle (plafond 0)", () => {
      const corps = "select public.intensite_point_fort(p_jauge) * 0.25;";
      expect(schema).toContain(corps);
      expect(garantiesManquantes(schema.replace(corps, "select public.intensite_point_fort(p_jauge) * 1.5;"))).not.toEqual([]);
      expect(garantiesManquantes(schema.replace(corps, "select public.intensite_point_fort(p_jauge) * 0;"))).not.toEqual([]);
    });

    it("la chance ne dépend plus de intensite_point_fort() (elle jouerait dès 0 % de jauge)", () => {
      const corps = "select public.intensite_point_fort(p_jauge) * 0.25;";
      expect(garantiesManquantes(schema.replace(corps, "select 0.25;"))).not.toEqual([]);
    });

    it("la fonction bonus_croissance_residentiel() est supprimée", () => {
      const saboteur = schema.replaceAll("function public.bonus_croissance_residentiel(", "function public.autre_nom(");
      expect(garantiesManquantes(saboteur)).not.toEqual([]);
    });
  });
});
