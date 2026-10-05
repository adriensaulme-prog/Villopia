// Rejeu, dans le Postgres local, de la logique exacte de tests/e2e/classement-developpements-pays.spec.ts.
// Lancer : node scripts/postgres-local/scenario-rejeu-e2e.mjs  (après npm install --no-save @electric-sql/pglite)
// Rejoue, dans le Postgres local, la logique EXACTE de tests/e2e/classement-developpements-pays.spec.ts.
import { ouvrir, ok, eq, joueur } from "./outils.mjs";

const code = async (p) => {
  try {
    await p;
    return null;
  } catch (e) {
    return e.code;
  }
};
const iso = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

try {
  const db = await ouvrir();
  const lundi = iso((await db.query("select public.semaine_iso() as s")).rows[0].s);
  const passee = (n) => {
    const [a, m, j] = lundi.split("-").map(Number);
    return new Date(Date.UTC(a, m - 1, j - 7 * n)).toISOString().slice(0, 10);
  };
  const deposer = async (u, pays, cat, nb, premiere = 1) => {
    for (let i = 0; i < nb; i++)
      await db.query("insert into public.votes_pays (joueur_id, country_id, categorie, semaine) values ($1,$2,$3,$4)", [u.userId, pays, cat, passee(premiere + i)]);
  };
  const num = async (sql, p = []) => Number((await db.query(sql, p)).rows[0].v);

  console.log("— Test 1 : classement figé");
  const no = await joueur(db, "NO", "n"), dk = await joueur(db, "DK", "d"), fi = await joueur(db, "FI", "f");
  await deposer(no, "NO", "industrie", 60);
  await deposer(dk, "DK", "industrie", 50);
  await deposer(fi, "FI", "industrie", 40);
  await db.query("insert into public.votes_pays (joueur_id, country_id, categorie, semaine) values ($1,'FI','industrie',$2)", [fi.userId, lundi]);
  eq(await num("select public.valeur_classement_pays('FI','industrie',$1) as v", [lundi]), 40, "FI = 40 cette semaine (le vote courant ne compte pas)");
  eq(await num("select public.valeur_classement_pays('FI','industrie',$1::date + 7) as v", [lundi]), 41, "FI = 41 le lundi suivant");
  const rang = async (p) => (await db.query("select * from public.classement_pays_vue($1) where categorie='industrie'", [p])).rows[0];
  eq([(await rang("NO")).rang, (await rang("DK")).rang, (await rang("FI")).rang], [1, 2, 3], "rangs 1, 2, 3");
  eq(await num("select public.bonus_effort_guerre_pays('NO') as v"), 0.15, "NO : +15 %");
  eq(await num("select public.poids_voix_diplomatique_pays('NO') as v"), 0, "NO : pas de voix");

  console.log("\n— Test 2 : avis");
  await deposer(dk, "DK", "culture", 60, 62); // semaines distinctes de celles de l'industrie (même joueur : une ressource par semaine)
  const prop = (await db.query("insert into public.propositions_diplomatiques (country_id, pays_cible_id, categorie, semaine, proposee_par_ville_id) values ('NO','DK','rivalite',$1,$2) returning id", [lundi, no.villeId])).rows[0].id;
  const avis = (u, pos = "contre") => db.query("select public.donner_avis_decision($1,$2,$3)", [u.userId, prop, pos]);
  eq(await code(avis(no)), "P0031", "proposant refusé");
  eq(await code(avis(fi)), "P0031", "non visé refusé");
  eq(await code(avis(dk)), null, "DK (n°1 culture) accepté");
  eq(await code(avis(dk)), "23505", "doublon refusé");
  const l = (await db.query("select poids, position from public.avis_diplomatie where proposition_id=$1", [prop])).rows[0];
  eq([Number(l.poids), l.position], [2, "contre"], "poids 2");

  console.log("\n— Test 3 : développements");
  const no1 = await joueur(db, "NO", "n1"), no2 = await joueur(db, "NO", "n2");
  await db.query("delete from public.votes_pays where country_id='NO'");
  await deposer(no1, "NO", "industrie", 60, 1);
  await deposer(no2, "NO", "techno", 5, 10); // comme la spec : un AUTRE joueur, semaines 10 à 14
  const opts = (await db.query("select * from public.options_developpement('NO')")).rows;
  eq(opts.map((o) => o.famille), ["attaque", "defense", "developpement"], "3 options");
  eq(await code(db.query("select public.voter_developpement($1,'inconnu')", [no1.userId])), "P0034", "inconnu refusé");
  eq(await code(db.query("select public.voter_developpement($1,$2)", [no1.userId, opts[0].developpement])), null, "vote accepté");
  eq(await code(db.query("select public.voter_developpement($1,$2)", [no1.userId, opts[1].developpement])), "23505", "second vote refusé");
  await db.query("delete from public.votes_developpement where joueur_id=$1", [no1.userId]);
  const vd = (u, dev, s) => db.query("insert into public.votes_developpement (joueur_id, country_id, developpement, semaine) values ($1,'NO',$2,$3)", [u.userId, dev, s]);
  await vd(no1, "arsenal_national", passee(5));
  await vd(no2, "arsenal_national", passee(5));
  await vd(no1, "fortifications", passee(3));
  await db.query("select public.resoudre_developpement_pays('NO')");
  const res = (await db.query("select developpement, finance from public.resultats_developpement where country_id='NO' order by semaine")).rows;
  eq(res.map((r) => [r.developpement, r.finance]), [["arsenal_national", true], ["fortifications", false]], "arsenal financé, fortifications non");
  const stock = Object.fromEntries((await db.query("select * from public.stock_pays('NO')")).rows.map((s) => [s.categorie, [Number(s.production), Number(s.depense), Number(s.stock)]]));
  eq([stock.industrie, stock.techno], [[60, 6, 54], [5, 4, 1]], "stock");
  const apres = (await db.query("select * from public.options_developpement('NO')")).rows;
  eq([apres.find((o) => o.famille === "defense").developpement, apres.find((o) => o.famille === "defense").report], ["fortifications", true], "fortifications reconduites");
  const mult = async (role) => num("select public.multiplicateur_effort_pays('NO',$1,current_date,false) as v", [role]);
  eq([await mult("attaquant"), await mult("defenseur")], [1.35, 1.15], "×1,35 / ×1,15");
  console.log(process.exitCode ? "\nÉCHECS" : "\nTOUT EST VERT");
} catch (e) {
  console.error("ERREUR SQL :", String(e.message).slice(0, 400), e.detail ? "| " + e.detail : "");
  process.exit(1);
}
