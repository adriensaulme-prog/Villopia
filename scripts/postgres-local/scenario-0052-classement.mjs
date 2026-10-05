// Migration 0052 (A-INTEGRER §47) : classement des pays figé par semaine, les quatre effets, câblage dans visiter_ville, avancer_monuments et la guerre.
// Lancer : node scripts/postgres-local/scenario-0052-classement.mjs  (après npm install --no-save @electric-sql/pglite)
import { ouvrir, ok, eq, joueur, semaine, vote as voteDe, nombre } from "./outils.mjs";
const vote = async (db, _u, pays, cat, sem) => { const j = await joueur(db, pays, "v"); await voteDe(db, j.userId, pays, cat, sem); };

try {
const db = await ouvrir();
console.log("Migrations 0001→0052 jouées.");
const S0 = await semaine(db, 0),
  Sm1 = await semaine(db, -1),
  Sm2 = await semaine(db, -2);

const fr = [await joueur(db, "FR", "a"), await joueur(db, "FR", "b"), await joueur(db, "FR", "c")];
const de = [await joueur(db, "DE", "d"), await joueur(db, "DE", "e")];
const es = [await joueur(db, "ES", "f")];

console.log("\n— Classement : seules les semaines PASSÉES comptent");
await vote(db, fr[0].userId, "FR", "industrie", Sm2);
await vote(db, fr[1].userId, "FR", "industrie", Sm2);
await vote(db, fr[2].userId, "FR", "industrie", Sm1);
await vote(db, de[0].userId, "DE", "industrie", Sm1);
await vote(db, de[1].userId, "DE", "industrie", Sm1);
await vote(db, es[0].userId, "ES", "industrie", S0); // semaine courante : ne compte pas encore
await vote(db, de[0].userId, "DE", "culture", Sm1); // DE seul en culture
let cl = (await db.query("select * from public.classement_pays() where categorie = 'industrie'")).rows;
eq(cl.map((r) => [r.country_id, r.rang, Number(r.total)]), [["FR", 1, 3], ["DE", 2, 2]], "industrie : FR 3 > DE 2, ES (vote de cette semaine) absent");
eq((await db.query("select public.pays_est_premier('FR','industrie') as b")).rows[0].b, true, "FR n°1 industrie");
eq((await db.query("select public.pays_est_premier('DE','industrie') as b")).rows[0].b, false, "DE pas n°1 industrie");
eq((await db.query("select public.pays_est_premier('ES','industrie') as b")).rows[0].b, false, "ES (aucune ressource passée) jamais classé");
eq((await db.query("select public.pays_est_premier('DE','culture') as b")).rows[0].b, true, "DE n°1 culture (seul classé)");

console.log("\n— Le classement d'une semaine passée est reproductible (figé)");
cl = (await db.query("select country_id, rang from public.classement_pays($1) where categorie='industrie' order by rang", [Sm1])).rows;
eq(cl.map((r) => [r.country_id, r.rang]), [["FR", 1]], "à la semaine Sm1 : seul FR (2 votes de Sm2) est classé");
eq(await nombre(db, "select count(*)::int as v from public.classement_pays($1)", [Sm2]), 0, "à Sm2 : rien d'accumulé avant");

console.log("\n— Égalité : ordre alphabétique du code");
await vote(db, fr[0].userId, "FR", "commerce", Sm1);
await vote(db, de[0].userId, "DE", "commerce", Sm1);
cl = (await db.query("select country_id, rang from public.classement_pays() where categorie='commerce' order by rang")).rows;
eq(cl.map((r) => r.country_id), ["DE", "FR"], "égalité 1-1 : DE avant FR");

console.log("\n— Vue de /pays");
const vue = (await db.query("select * from public.classement_pays_vue('DE')")).rows;
eq(vue.map((r) => r.categorie), ["industrie", "techno", "culture", "commerce"], "4 lignes dans l'ordre");
const [ind, tec, cul] = vue;
eq([ind.rang, Number(ind.total), ind.nb_pays, ind.premier_country_id, Number(ind.premier_total)], [2, 2, 2, "FR", 3], "industrie vue DE");
eq([tec.rang, Number(tec.total), tec.nb_pays, tec.premier_country_id], [null, 0, 0, null], "techno : personne classé");
eq([cul.rang, cul.premier_country_id], [1, "DE"], "culture : DE n°1");

console.log("\n— Les quatre effets");
eq(await nombre(db, "select public.bonus_effort_guerre_pays('FR') as v"), 0.15, "Industrie n°1 : +15 % d'effort");
eq(await nombre(db, "select public.bonus_effort_guerre_pays('DE') as v"), 0, "DE : 0");
eq(await nombre(db, "select public.bonus_croissance_pays('DE') as v"), 0.1, "Commerce n°1 (DE) : +10 % de croissance");
eq(await nombre(db, "select public.bonus_croissance_pays('ES') as v"), 0, "ES : 0");
eq(await nombre(db, "select public.reduction_seuil_pays('DE') as v"), 0, "Techno : personne n°1");
eq(await nombre(db, "select public.poids_voix_diplomatique_pays('DE') as v"), 2, "Culture n°1 : avis ×2");
eq(await nombre(db, "select public.poids_voix_diplomatique_pays('FR') as v"), 0, "FR : pas de voix");

console.log("\n— Techno n°1 : seuil réduit de 10 % (monuments)");
await vote(db, es[0].userId, "ES", "techno", Sm1);
eq(await nombre(db, "select public.reduction_seuil_pays('ES') as v"), 0.1, "ES n°1 techno : −10 %");
await db.query("update public.cities set influence_max = 9, influence = 9 where id = $1", [es[0].villeId]);
await db.query("select public.avancer_monuments($1)", [es[0].villeId]);
let m = (await db.query("select palier from public.monuments where ville_id = $1 order by palier", [es[0].villeId])).rows.map((r) => r.palier);
eq(m, [0], "ES (influence 9) débloque la borne (seuil 10 → 9)");
await db.query("update public.cities set influence_max = 9, influence = 9 where id = $1", [fr[0].villeId]);
await db.query("select public.avancer_monuments($1)", [fr[0].villeId]);
m = (await db.query("select palier from public.monuments where ville_id = $1", [fr[0].villeId])).rows;
eq(m.length, 0, "FR (influence 9, pas n°1 techno) : rien");
await db.query("delete from public.votes_pays where country_id='ES'");
eq(await nombre(db, "select public.reduction_seuil_pays('ES') as v"), 0, "ES plus n°1 sans ses votes");
await db.query("select public.avancer_monuments($1)", [es[0].villeId]);
m = (await db.query("select palier from public.monuments where ville_id = $1", [es[0].villeId])).rows.map((r) => r.palier);
eq(m, [0], "le monument débloqué reste acquis");

console.log("\n— Commerce n°1 : câblage dans visiter_ville (crochet forcé à 1 pour prouver le branchement)");
const visiteurs = [];
for (let i = 0; i < 12; i++) visiteurs.push(await joueur(db, "IT", "v" + i));
let gains0 = 0,
  gains1 = 0;
for (const v of visiteurs.slice(0, 6)) {
  const r = await db.query("select public.visiter_ville($1,$2) as r", [v.userId, fr[0].villeId]);
  gains0 += r.rows[0].r.gain;
}
await db.query("create or replace function public.bonus_croissance_pays(p_country_id text) returns numeric language sql as $$ select 1::numeric $$");
for (const v of visiteurs.slice(6)) {
  const r = await db.query("select public.visiter_ville($1,$2) as r", [v.userId, fr[1].villeId]);
  gains1 += r.rows[0].r.gain;
}
ok(gains1 >= 12, `crochet à 100 % : chaque visite rapporte au moins 2 habitants (6 visites → ${gains1} habitants)`);
ok(gains0 < gains1, `sans le crochet, moins d'habitants (${gains0} sur 6 visites)`);

console.log("\n— Guerre : bonus Industrie n°1 (effort_national forcé)");
await db.query("create or replace function public.effort_national(p_country_id text) returns numeric language sql as $$ select case when p_country_id = 'FR' then 14::numeric else 10::numeric end $$");
await db.query("insert into public.conflits (pays_attaquant_id, pays_defenseur_id, debut, fin) values ('FR','DE', now() - interval '3 days', now() + interval '4 days')");
await db.query("select public.resoudre_conflits_en_cours()");
let k = (await db.query("select jours_gagnes_attaquant a, jours_gagnes_defenseur d, effort_attaquant ea, effort_defenseur ed from public.conflits where pays_attaquant_id='FR'")).rows[0];
eq([k.a, k.d, Number(k.ea), Number(k.ed)], [4, 0, 16.1, 10], "FR n°1 industrie : 14 × 1,15 = 16,1 > 10 × 1,5 → l'attaquant gagne les 4 jours");
await db.query("delete from public.conflits");
await db.query("delete from public.votes_pays where country_id='FR' and categorie='industrie'");
await db.query("insert into public.conflits (pays_attaquant_id, pays_defenseur_id, debut, fin) values ('FR','DE', now() - interval '3 days', now() + interval '4 days')");
await db.query("select public.resoudre_conflits_en_cours()");
k = (await db.query("select jours_gagnes_attaquant a, jours_gagnes_defenseur d, effort_attaquant ea from public.conflits")).rows[0];
eq([k.a, k.d, Number(k.ea)], [0, 4, 14], "sans le bonus : 14 < 15 → le défenseur gagne les 4 jours (comportement d'avant)");
console.log(process.exitCode ? "\nÉCHECS" : "\nTOUT EST VERT");
} catch (e) { console.error("ERREUR SQL :", String(e.message).slice(0,400), e.detail ? "| " + e.detail : ""); process.exit(1); }
