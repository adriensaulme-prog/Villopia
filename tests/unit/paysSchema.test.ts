import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Classement des pays (A-INTEGRER §47, migration 0052), avis des pays visés (0053) et développements
 * nationaux (§48, 0054) : garde-fou de schéma sans base de données.
 *
 * Plusieurs fonctions lourdes (visiter_ville, resoudre_conflits_en_cours, lancer_action_antiville,
 * avancer_monuments, resoudre_decision_diplomatique) sont RECOPIÉES de migration en migration : une
 * recopie future qui oublie un branchement le perdrait sans bruit (c'est déjà arrivé onze fois pour
 * visiter_ville, voir tests/unit/residentielPointFort.test.ts). Ce garde échoue si la DERNIÈRE
 * définition d'une de ces fonctions :
 *   - n'appelle plus le réglage qui porte l'effet du §47/§48 ;
 *   - a perdu une règle de base qu'elle devait garder à l'identique ;
 * et si les règles de fond du système ne tiennent plus : classement figé sur les semaines PASSÉES, effort
 * de guerre et classement comptés sur la PRODUCTION (jamais sur le stock dépensable), clôture sans double
 * dépense, acquis jamais retirés.
 *
 * « Test rouge par sabotage » : pas d'accès SQL pour casser une vraie base, on sabote donc le TEXTE du
 * schéma et on vérifie que le garde passe au rouge à chaque fois. Le comportement réel a été exécuté
 * dans un Postgres local jetable (voir DECISIONS.md §4) et, sur la base de dev, par
 * tests/e2e/classement-developpements-pays.spec.ts.
 */

const dossier = path.join(process.cwd(), "supabase", "migrations");
const fichiers = readdirSync(dossier)
  .filter((f) => /^\d{4}_.+\.sql$/.test(f))
  .sort();

function lireSchema(): string {
  return fichiers.map((f) => lireFichier(f)).join("\n");
}

/** Fins de ligne normalisées : sous Windows les fichiers peuvent être en CRLF, les ancres des sabotages non. */
function lireFichier(nom: string): string {
  return readFileSync(path.join(dossier, nom), "utf-8").replaceAll("\r\n", "\n");
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
function derniere(s: string, fonction: string): string | null {
  const debut = s.lastIndexOf(`function public.${fonction}(`);
  if (debut === -1) return null;
  const fin = s.indexOf("$$;", s.indexOf("$$", debut) + 2);
  return s.slice(debut, fin === -1 ? undefined : fin);
}

/** Liste ce que le schéma NE garantit PAS (vide = tout est en place). */
function garantiesManquantes(sql: string): string[] {
  const s = aplatir(sql);
  const m: string[] = [];
  const exige = (corps: string | null, nom: string, motif: RegExp | string, message: string) => {
    if (corps === null) {
      m.push(`${nom}() n'est définie nulle part`);
      return;
    }
    const ok = typeof motif === "string" ? corps.includes(motif) : motif.test(corps);
    if (!ok) m.push(message);
  };

  // --- Croissance : Commerce n°1 / Expansion urbaine, dans le bloc où la visite rapporte l'habitant.
  const visite = derniere(s, "visiter_ville");
  exige(visite, "visiter_ville", "v_probabilite_gain := case when v_jauge_residentiel < 0.6 then v_jauge_residentiel / 0.6 else 1 end", "crise du logement absente de visiter_ville()");
  if (visite !== null) {
    const debutBloc = visite.indexOf("if random() < v_probabilite_gain then");
    const finBloc = visite.indexOf("select type_action, created_at into v_dernier_type_action");
    const bloc = debutBloc === -1 || finBloc === -1 ? "" : visite.slice(debutBloc, finBloc);
    if (!/if random\(\) < public\.bonus_croissance_pays\(v_pays_ville\) then v_gain := v_gain \+ 1; end if;/.test(bloc)) {
      m.push("tirage de bonus_croissance_pays() absent du bloc de gain de visiter_ville() (ou mauvais pays)");
    }
    if (!/bonus_croissance_residentiel\(v_jauge_residentiel\)/.test(bloc)) m.push("point fort Résidentiel perdu par visiter_ville()");
    if (!/intensite_point_fort\(v_jauge_commerce\) \* 0\.25/.test(bloc)) m.push("point fort Commerce perdu par visiter_ville()");
    if (!/select owner_id, population_max, country_id into v_owner_id, v_population_max, v_pays_ville/.test(visite)) {
      m.push("visiter_ville() ne lit plus le pays de la ville visitée");
    }
  }

  // --- Guerre : les trois réglages, et les règles de base inchangées.
  const guerre = derniere(s, "resoudre_conflits_en_cours");
  exige(guerre, "resoudre_conflits_en_cours", "public.multiplicateur_effort_pays(", "l'effort de guerre n'est plus multiplié par multiplicateur_effort_pays()");
  exige(guerre, "resoudre_conflits_en_cours", "public.multiplicateur_defensif_pays(", "le bonus défensif n'est plus lu dans multiplicateur_defensif_pays()");
  exige(guerre, "resoudre_conflits_en_cours", "public.facteur_pertes_guerre_pays(", "les pertes de guerre n'utilisent plus facteur_pertes_guerre_pays()");
  exige(guerre, "resoudre_conflits_en_cours", "public.effort_national(v_conflit.pays_attaquant_id)", "l'effort de l'attaquant ne dérive plus de effort_national()");
  exige(guerre, "resoudre_conflits_en_cours", "v_effort_attaquant > v_effort_defenseur * v_multiplicateur_defensif", "comparaison attaquant / défenseur × bonus défensif perdue");
  exige(guerre, "resoudre_conflits_en_cours", "v_ville.population * 0.001", "perte quotidienne de 0,1 % perdue");
  exige(guerre, "resoudre_conflits_en_cours", "ceil(v_ville.population * 0.05)", "plafond de perte de 5 % perdu");
  exige(guerre, "resoudre_conflits_en_cours", "v_jours_gagnes_attaquant > v_jours_gagnes_defenseur", "verdict à la majorité des journées perdu");

  // --- Monuments : seuil réduit, acquis conservés.
  const monuments = derniere(s, "avancer_monuments");
  exige(monuments, "avancer_monuments", "v_reduction := public.reduction_seuil_pays(v_pays)", "avancer_monuments() ne lit plus la réduction de seuil du pays");
  exige(monuments, "avancer_monuments", "ceil(k.seuil * (1 - v_reduction)) <= v_influence_max", "seuil effectif = plafond(seuil × (1 − réduction)) perdu");
  exige(monuments, "avancer_monuments", "on conflict (ville_id, palier) do nothing", "déblocage sans doublon perdu dans avancer_monuments()");

  // --- AntiVille : résistance, annulation de la visite (§34), bonus Hôpital / Opéra.
  const antiville = derniere(s, "lancer_action_antiville");
  exige(antiville, "lancer_action_antiville", "v_multiplicateur_defense * public.facteur_antiville_pays(v_pays_victime)", "Résistance à la propagande non appliquée aux attaques AntiVille");
  exige(antiville, "lancer_action_antiville", "delete from public.visites where id = v_visite_id", "annulation de la visite (§34) perdue");
  exige(antiville, "lancer_action_antiville", "array['hopital']", "bonus de l'Hôpital perdu");
  exige(antiville, "lancer_action_antiville", "array['opera']", "bonus de l'Opéra perdu");

  // --- Diplomatie : les avis pondérés comptent dans le verdict.
  const decision = derniere(s, "resoudre_decision_diplomatique");
  exige(decision, "resoudre_decision_diplomatique", "(v_pour + v_avis_pour) > (v_contre + v_avis_contre)", "les avis pondérés ne comptent plus dans le verdict diplomatique");
  exige(decision, "resoudre_decision_diplomatique", "v_proposition.categorie = 'rivalite'", "la rivalité adoptée ne déclenche plus de conflit");

  // --- Classement : figé sur les semaines PASSÉES, pas de table de classement, mesure lue à un seul endroit.
  const classement = derniere(s, "classement_pays");
  exige(classement, "classement_pays", "v.semaine < sc.s", "le classement doit compter les semaines STRICTEMENT passées (figé toute la semaine)");
  exige(classement, "classement_pays", "row_number() over (partition by t.cat order by t.n desc, t.pays)", "départage des égalités par le code du pays perdu");
  exige(derniere(s, "valeur_classement_pays"), "valeur_classement_pays", "v.semaine < p_semaine", "valeur_classement_pays() doit compter les semaines passées");
  if (/create table public\.(classement|classements|classement_pays)\b/.test(s)) m.push("le classement ne doit pas avoir de table (§47 : simple requête de lecture)");

  // --- Effort de guerre et classement comptent la PRODUCTION, jamais le stock dépensable.
  const effort = derniere(s, "effort_national");
  exige(effort, "effort_national", "ressources_pays(p_country_id)", "effort_national() ne lit plus la production cumulée (ressources_pays)");
  if (effort !== null && /stock_pays/.test(effort)) m.push("effort_national() lit le stock dépensable : débloquer une attaque baisserait l'effort de guerre");
  if (classement !== null && /stock_pays|developpements_pays/.test(classement)) m.push("le classement lit le stock dépensable : dépenser ferait perdre la 1ère place");

  // --- Clôture des votes de développement : pas de double dépense, stock à la fin de la semaine du vote.
  const cloture = derniere(s, "resoudre_developpement_pays");
  exige(cloture, "resoudre_developpement_pays", "on conflict do nothing; if found and v_finance then", "déblocage sans garde « seul celui qui a inséré le résultat débloque » (double dépense possible)");
  exige(cloture, "resoudre_developpement_pays", "production_pays(p_country_id, v_semaine.semaine)", "le stock doit être celui de la fin de la semaine du vote");
  exige(cloture, "resoudre_developpement_pays", "order by count(*) desc, c.ordre", "départage des voix par l'ordre du catalogue perdu");

  // --- Réglages qui lisent les développements : ils clôturent d'abord les votes en attente de leur pays.
  for (const f of ["bonus_croissance_pays", "reduction_seuil_pays", "multiplicateur_effort_pays", "facteur_antiville_pays"]) {
    exige(derniere(s, f), f, "perform public.resoudre_developpement_pays(p_country_id)", `${f}() ne clôt plus les votes de développement en attente`);
  }

  // --- Un acquis ne se perd jamais.
  if (/(delete from|update) public\.developpements_pays/.test(s)) m.push("une migration retire ou modifie un développement acquis (un acquis ne régresse jamais)");

  return m;
}

describe("classement des pays et développements nationaux (§47, §48) : garde de schéma", () => {
  it("le schéma actuel garantit tous les branchements et règles de fond", () => {
    expect(garantiesManquantes(lireSchema())).toEqual([]);
  });

  describe("sabotages : chacun fait passer le garde au rouge", () => {
    const schema = lireSchema();
    const sabote = (ancien: string, nouveau: string, tout = true) => {
      expect(schema, `l'ancre « ${ancien} » doit exister`).toContain(ancien);
      return tout ? schema.replaceAll(ancien, nouveau) : schema.replace(ancien, nouveau);
    };
    const rouge = (saboteur: string) => expect(garantiesManquantes(saboteur)).not.toEqual([]);

    it("visiter_ville() n'applique plus le bonus de croissance du pays", () => {
      rouge(sabote("if random() < public.bonus_croissance_pays(v_pays_ville) then", "if false then"));
    });

    it("le bonus de croissance est tiré avec le pays du visiteur (une variable qui n'existe plus)", () => {
      rouge(sabote("public.bonus_croissance_pays(v_pays_ville)", "public.bonus_croissance_pays(v_owner_id::text)"));
    });

    it("une recopie de visiter_ville() sans le branchement du §47 (régression réelle des recopies)", () => {
      const sansBranchement = lireFichier("0049_residentiel_point_fort.sql");
      rouge(`${schema}\n${sansBranchement}`);
    });

    it("la guerre ignore l'effort multiplié (Industrie n°1, Arsenal, Mobilisation éclair)", () => {
      rouge(sabote("* public.multiplicateur_effort_pays(", "* public.sans_effet("));
    });

    it("la guerre ne lit plus le bonus défensif des Fortifications", () => {
      rouge(sabote("v_multiplicateur_defensif := public.multiplicateur_defensif_pays(v_conflit.pays_defenseur_id, v_jour);", "v_multiplicateur_defensif := 1.5;"));
    });

    it("les pertes de guerre n'utilisent plus le Bouclier civil", () => {
      rouge(sabote("v_facteur_pertes := public.facteur_pertes_guerre_pays(v_pays_perdant_id, v_jour);", "v_facteur_pertes := 1;"));
    });

    it("une recopie de resoudre_conflits_en_cours() sans les réglages (migration 0037)", () => {
      rouge(`${schema}\n${lireFichier("0037_effort_national_moyenne.sql")}`);
    });

    it("la perte quotidienne de 0,1 % change", () => {
      rouge(sabote("v_ville.population * 0.001", "v_ville.population * 0.01"));
    });

    it("avancer_monuments() ne réduit plus les seuils", () => {
      rouge(sabote("ceil(k.seuil * (1 - v_reduction)) <= v_influence_max", "k.seuil <= v_influence_max"));
    });

    it("avancer_monuments() efface au lieu de conserver (plus de « on conflict do nothing »)", () => {
      rouge(sabote("on conflict (ville_id, palier) do nothing;\n    if found then", "on conflict (ville_id, palier) do update set palier = excluded.palier;\n    if found then"));
    });

    it("la Résistance à la propagande n'est plus appliquée", () => {
      rouge(sabote("v_multiplicateur_defense := v_multiplicateur_defense * public.facteur_antiville_pays(v_pays_victime);", "v_multiplicateur_defense := v_multiplicateur_defense;"));
    });

    it("une recopie de lancer_action_antiville() sans la Résistance (migration 0045)", () => {
      rouge(`${schema}\n${lireFichier("0045_antiville_annule_la_visite.sql")}`);
    });

    it("les avis pondérés sortent du verdict diplomatique", () => {
      rouge(sabote("v_adoptee := (v_pour + v_avis_pour) > (v_contre + v_avis_contre);", "v_adoptee := v_pour > v_contre;"));
    });

    it("le classement compte la semaine en cours (il bougerait en cours de semaine)", () => {
      rouge(sabote("where v.semaine < sc.s", "where v.semaine <= sc.s"));
    });

    it("le classement perd son départage des égalités", () => {
      rouge(sabote("order by t.n desc, t.pays)", "order by t.n desc)"));
    });

    it("le classement gagne une table (le §47 demande une simple requête de lecture)", () => {
      rouge(`${schema}\ncreate table public.classement (id int);`);
    });

    it("l'effort de guerre lit le stock dépensable", () => {
      rouge(sabote("select sum(r.total) from public.ressources_pays(p_country_id) r", "select sum(r.stock) from public.stock_pays(p_country_id) r"));
    });

    it("le classement lit le stock dépensable (dépenser ferait perdre la 1ère place)", () => {
      rouge(sabote("from public.votes_pays v, semaine_cible sc", "from public.votes_pays v, semaine_cible sc, public.developpements_pays dp"));
    });

    it("la clôture débloque sans vérifier qu'elle a inséré le résultat (double dépense)", () => {
      rouge(sabote("if found and v_finance then", "if v_finance then"));
    });

    it("la clôture prend le stock du moment de la lecture au lieu de la fin de la semaine du vote", () => {
      rouge(sabote("production_pays(p_country_id, v_semaine.semaine)", "production_pays(p_country_id)"));
    });

    it("une égalité de voix n'est plus départagée par le catalogue", () => {
      rouge(sabote("order by count(*) desc, c.ordre", "order by count(*) desc"));
    });

    it("un réglage de jeu ne clôt plus les votes en attente (le déblocage dépendrait du hasard d'une page ouverte)", () => {
      rouge(sabote("perform public.resoudre_developpement_pays(p_country_id);\n  return (case when public.pays_est_premier(p_country_id, 'commerce')", "return (case when public.pays_est_premier(p_country_id, 'commerce')"));
    });

    it("une migration retire un développement acquis", () => {
      rouge(`${schema}\ndelete from public.developpements_pays where country_id = 'FR';`);
    });
  });
});
