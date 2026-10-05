// Migration 0053 : avis du pays visé par une décision diplomatique (poids, conditions, clôture).
// Lancer : node scripts/postgres-local/scenario-0053-avis.mjs  (après npm install --no-save @electric-sql/pglite)
import { ouvrir, ok, eq, joueur, semaine, vote as voteDe, nombre } from "./outils.mjs";

const vote = async (db, pays, cat, sem) => {
  const j = await joueur(db, pays, "v");
  await voteDe(db, j.userId, pays, cat, sem);
};
const code = async (promesse) => {
  try {
    await promesse;
    return "aucune erreur";
  } catch (e) {
    return e.code || String(e.message).slice(0, 80);
  }
};

try {
  const db = await ouvrir();
  console.log("Migrations 0001→0053 jouées.");
  const S0 = await semaine(db, 0),
    Sm1 = await semaine(db, -1),
    Sm2 = await semaine(db, -2);

  const fr = [await joueur(db, "FR", "a"), await joueur(db, "FR", "b"), await joueur(db, "FR", "c")];
  const de = [await joueur(db, "DE", "d"), await joueur(db, "DE", "e")];
  const it = [await joueur(db, "IT", "f")];

  // DE n°1 en culture pour la semaine courante ET pour Sm1 (votes de Sm2) ; IT sans aucune voix.
  await vote(db, "DE", "culture", Sm2);
  await vote(db, "DE", "culture", Sm2);
  await vote(db, "FR", "culture", Sm2);

  console.log("\n— Avis : conditions");
  const prop = (await db.query(
    "insert into public.propositions_diplomatiques (country_id, pays_cible_id, categorie, semaine, proposee_par_ville_id) values ('FR','DE','rivalite',$1,$2) returning id",
    [S0, fr[0].villeId]
  )).rows[0].id;
  const avis = (j, id, pos) => db.query("select public.donner_avis_decision($1,$2,$3)", [j.userId, id, pos]);
  eq(await code(avis(de[0], prop, "contre")), "aucune erreur", "un citoyen de DE (Culture n°1, pays visé) donne son avis");
  eq(await code(avis(de[0], prop, "pour")), "23505", "un second avis du même joueur sur la même décision est refusé");
  eq(await code(avis(it[0], prop, "contre")), "P0031", "un citoyen d'un pays NON visé : refusé");
  eq(await code(avis(fr[1], prop, "contre")), "P0031", "un citoyen du pays PROPOSANT n'a pas d'avis de cible");
  eq(await code(avis(de[1], prop, "peut-etre")), "P0014", "position invalide");
  eq(await code(avis(de[1], "00000000-0000-0000-0000-000000000000", "pour")), "P0032", "proposition introuvable");
  const propAncienne = (await db.query(
    "insert into public.propositions_diplomatiques (country_id, pays_cible_id, categorie, semaine, proposee_par_ville_id) values ('ES','DE','paix',$1,$2) returning id",
    [Sm1, fr[0].villeId]
  )).rows[0].id;
  eq(await code(avis(de[1], propAncienne, "pour")), "P0032", "proposition d'une semaine passée : refusée");
  // pays visé sans voix : IT visé par DE
  const propIt = (await db.query(
    "insert into public.propositions_diplomatiques (country_id, pays_cible_id, categorie, semaine, proposee_par_ville_id) values ('DE','IT','embargo',$1,$2) returning id",
    [S0, de[0].villeId]
  )).rows[0].id;
  eq(await code(avis(it[0], propIt, "contre")), "P0033", "IT n'a pas voix au chapitre (pas n°1 culture)");

  console.log("\n— Poids figé et décompte");
  const p = (await db.query("select poids, position from public.avis_diplomatie where proposition_id = $1", [prop])).rows;
  eq(p.map((r) => [Number(r.poids), r.position]), [[2, "contre"]], "avis enregistré avec le poids 2 (Culture n°1)");
  const t = (await db.query("select * from public.avis_decision_semaine('FR')")).rows[0];
  eq([Number(t.avis_pour), Number(t.avis_contre)], [0, 2], "avis_decision_semaine : 0 pour / 2 contre");
  const dv = (await db.query("select * from public.decisions_visant_pays('DE')")).rows;
  eq(dv.map((r) => [r.pays_proposant_id, r.categorie, Number(r.avis_contre)]), [["FR", "rivalite", 2]], "decisions_visant_pays(DE) : la rivalité de FR, avis contre 2");

  console.log("\n— Clôture : les avis pondérés comptent");
  // Semaine passée Sm1 : FR propose la rivalité contre DE, 2 pour / 1 contre côté FR ; DE (voix : n°1 culture avant Sm1) donne 2 avis contre.
  await db.query("delete from public.propositions_diplomatiques where semaine = $1 or id = $2", [S0, propIt]);
  const propPassee = (await db.query(
    "insert into public.propositions_diplomatiques (country_id, pays_cible_id, categorie, semaine, proposee_par_ville_id) values ('FR','DE','rivalite',$1,$2) returning id",
    [Sm1, fr[0].villeId]
  )).rows[0].id;
  await db.query("insert into public.votes_diplomatie (joueur_id, country_id, semaine, position) values ($1,'FR',$2,'pour'), ($3,'FR',$2,'pour'), ($4,'FR',$2,'contre')", [fr[0].userId, Sm1, fr[1].userId, fr[2].userId]);
  await db.query("insert into public.avis_diplomatie (joueur_id, proposition_id, country_id, position, poids) values ($1,$2,'DE','contre',2), ($3,$2,'DE','contre',2)", [de[0].userId, propPassee, de[1].userId]);
  await db.query("select public.resoudre_decision_diplomatique('FR')");
  let r = (await db.query("select adoptee, nb_pour, nb_contre, avis_pour, avis_contre from public.resultats_diplomatiques where proposition_id = $1", [propPassee])).rows[0];
  eq([r.adoptee, Number(r.nb_pour), Number(r.nb_contre), Number(r.avis_pour), Number(r.avis_contre)], [false, 2, 1, 0, 4], "2 pour < 1 + 4 contre pondérés : REJETÉE");
  eq(await nombre(db, "select count(*)::int as v from public.conflits"), 0, "pas de conflit déclenché");

  console.log("\n— Même vote, sans avis : comportement d'avant (pour > contre)");
  await db.query("delete from public.resultats_diplomatiques");
  await db.query("delete from public.avis_diplomatie");
  await db.query("select public.resoudre_decision_diplomatique('FR')");
  r = (await db.query("select adoptee, avis_pour, avis_contre from public.resultats_diplomatiques where proposition_id = $1", [propPassee])).rows[0];
  eq([r.adoptee, Number(r.avis_pour), Number(r.avis_contre)], [true, 0, 0], "2 pour > 1 contre : ADOPTÉE, avis à 0");
  eq(await nombre(db, "select count(*)::int as v from public.conflits where pays_attaquant_id='FR' and pays_defenseur_id='DE'"), 1, "la rivalité adoptée déclenche bien le conflit (inchangé)");

  console.log("\n— Un avis POUR peut sauver une décision serrée");
  await db.query("delete from public.resultats_diplomatiques");
  await db.query("delete from public.conflits");
  await db.query("delete from public.votes_diplomatie");
  await db.query("insert into public.votes_diplomatie (joueur_id, country_id, semaine, position) values ($1,'FR',$2,'pour'), ($3,'FR',$2,'contre')", [fr[0].userId, Sm1, fr[1].userId]);
  await db.query("insert into public.avis_diplomatie (joueur_id, proposition_id, country_id, position, poids) values ($1,$2,'DE','pour',2)", [de[0].userId, propPassee]);
  await db.query("select public.resoudre_decision_diplomatique('FR')");
  r = (await db.query("select adoptee from public.resultats_diplomatiques where proposition_id = $1", [propPassee])).rows[0];
  eq(r.adoptee, true, "1 pour + 2 avis pour > 1 contre : adoptée");

  console.log(process.exitCode ? "\nÉCHECS" : "\nTOUT EST VERT");
} catch (e) {
  console.error("ERREUR SQL :", String(e.message).slice(0, 400), e.detail ? "| " + e.detail : "");
  process.exit(1);
}
