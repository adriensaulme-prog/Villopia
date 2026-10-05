// Migration 0054 (A-INTEGRER §48) : options, vote, clôture financée ou reconduite, stock, effets, guerre, AntiVille, historique.
// Lancer : node scripts/postgres-local/scenario-0054-developpements.mjs  (après npm install --no-save @electric-sql/pglite)
import { ouvrir, ok, eq, joueur, semaine, vote as voteRessource, nombre } from "./outils.mjs";

const code = async (promesse) => {
  try {
    await promesse;
    return "aucune erreur";
  } catch (e) {
    return e.code || String(e.message).slice(0, 100);
  }
};

try {
  const db = await ouvrir();
  console.log("Migrations 0001→0054 jouées.");
  const S0 = await semaine(db, 0),
    Sm1 = await semaine(db, -1),
    Sm2 = await semaine(db, -2),
    Sm3 = await semaine(db, -3);

  // Joueurs de France (5) et d'Allemagne (3)
  const fr = [];
  for (let i = 0; i < 5; i++) fr.push(await joueur(db, "FR", "f" + i));
  const de = [];
  for (let i = 0; i < 3; i++) de.push(await joueur(db, "DE", "d" + i));
  const ressource = async (pays, cat, sem, n = 1) => {
    for (let i = 0; i < n; i++) {
      const j = await joueur(db, pays, "r");
      await voteRessource(db, j.userId, pays, cat, sem);
    }
  };
  const votDev = async (j, dev, sem) =>
    db.query("insert into public.votes_developpement (joueur_id, country_id, developpement, semaine) values ($1, (select country_id from public.users where id=$1), $2, $3)", [j.userId, dev, sem]);

  console.log("\n— Catalogue");
  const cat = (await db.query("select * from public.developpements_catalogue() order by ordre")).rows;
  eq(cat.length, 9, "9 développements");
  eq(["attaque", "defense", "developpement"].map((f) => cat.filter((c) => c.famille === f).length), [3, 3, 3], "3 par famille");
  ok(cat.every((c) => c.cout_industrie + c.cout_techno + c.cout_culture + c.cout_commerce > 0), "chaque développement coûte quelque chose");

  console.log("\n— Options : un par famille, déterministes");
  let opt = (await db.query("select * from public.options_developpement('FR')")).rows;
  eq(opt.map((o) => o.famille), ["attaque", "defense", "developpement"], "une option par famille, dans l'ordre");
  eq(opt.every((o) => o.report === false), true, "aucune n'est une reconduction");
  const opt2 = (await db.query("select * from public.options_developpement('FR')")).rows;
  eq(opt2.map((o) => o.developpement), opt.map((o) => o.developpement), "stable d'un appel à l'autre");
  const famDev = Object.fromEntries(cat.map((c) => [c.id, c.famille]));
  eq(opt.every((o) => famDev[o.developpement] === o.famille), true, "chaque option est bien de sa famille");

  console.log("\n— Vote");
  const choix = opt[0].developpement;
  eq(await code(db.query("select public.voter_developpement($1,$2)", [fr[0].userId, "inconnu"])), "P0034", "développement inconnu : refusé");
  const pasPropose = cat.find((c) => !opt.some((o) => o.developpement === c.id)).id;
  eq(await code(db.query("select public.voter_developpement($1,$2)", [fr[0].userId, pasPropose])), "P0034", "développement non proposé cette semaine : refusé");
  eq(await code(db.query("select public.voter_developpement($1,$2)", [fr[0].userId, choix])), "aucune erreur", "vote pour une option proposée");
  eq(await code(db.query("select public.voter_developpement($1,$2)", [fr[0].userId, opt[1].developpement])), "23505", "un second vote la même semaine : refusé");
  await db.query("select public.voter_developpement($1,$2)", [fr[1].userId, choix]);
  await db.query("select public.voter_developpement($1,$2)", [fr[2].userId, opt[2].developpement]);
  const rv = (await db.query("select * from public.resultats_vote_developpement('FR')")).rows;
  eq(rv.map((r) => Number(r.nb_votes)), [2, 0, 1], "décompte des voix par option");
  eq(await nombre(db, "select count(*)::int as v from public.resultats_developpement"), 0, "rien n'est clos pendant la semaine");

  console.log("\n— Clôture : financé ou reconduit (3 semaines simulées)");
  await db.query("delete from public.votes_developpement");
  // Sm3 : 3 voix pour arsenal_national (6 industrie + 4 techno) alors que FR n'a rien produit → non financé
  for (let i = 0; i < 3; i++) await votDev(fr[i], "arsenal_national", Sm3);
  // Sm2 : on produit juste assez (6 industrie, 4 techno, datées Sm2) puis on revote arsenal → financé
  await ressource("FR", "industrie", Sm2, 6);
  await ressource("FR", "techno", Sm2, 4);
  for (let i = 0; i < 2; i++) await votDev(fr[i], "arsenal_national", Sm2);
  await votDev(fr[2], "fortifications", Sm2);
  // Sm1 : fortifications (8 industrie + 4 techno) alors que le stock est vide → non financé
  for (let i = 0; i < 4; i++) await votDev(fr[i], "fortifications", Sm1);
  await db.query("select public.resoudre_developpement_pays('FR')");
  const res = (await db.query("select semaine, developpement, nb_votes, nb_votants, finance from public.resultats_developpement where country_id='FR' order by semaine")).rows;
  const iso = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));
  eq(res.map((r) => [iso(r.semaine), r.developpement, r.nb_votes, r.nb_votants, r.finance]),
    [[Sm3, "arsenal_national", 3, 3, false], [Sm2, "arsenal_national", 2, 3, true], [Sm1, "fortifications", 4, 4, false]],
    "Sm3 non financé, Sm2 financé (stock juste suffisant), Sm1 non financé (stock vide après la dépense)");
  const acq = (await db.query("select developpement, semaine_vote, cout from public.developpements_pays where country_id='FR'")).rows;
  const triCle = (o) => Object.fromEntries(Object.entries(o).sort());
  eq(acq.map((r) => [r.developpement, iso(r.semaine_vote), triCle(r.cout)]), [["arsenal_national", Sm2, triCle({ industrie: 6, techno: 4, culture: 0, commerce: 0 })]], "un seul acquis : l'arsenal, avec son coût figé");
  const stock = (await db.query("select * from public.stock_pays('FR')")).rows.map((r) => [r.categorie, Number(r.production), Number(r.depense), Number(r.stock)]);
  eq(stock, [["industrie", 6, 6, 0], ["techno", 4, 4, 0], ["culture", 0, 0, 0], ["commerce", 0, 0, 0]], "stock = production − dépense");
  await db.query("select public.resoudre_developpement_pays('FR')");
  eq(await nombre(db, "select count(*)::int as v from public.resultats_developpement where country_id='FR'"), 3, "idempotent : relancer ne recrée rien");

  console.log("\n— Reconduction : un non financé repasse au vote la semaine suivante");
  opt = (await db.query("select * from public.options_developpement('FR')")).rows;
  const att = opt.find((o) => o.famille === "defense");
  eq([att.developpement, att.report], ["fortifications", true], "fortifications (non financé en Sm1) est reproposé en défense, marqué reconduit");
  eq(opt.find((o) => o.famille === "attaque").developpement !== "arsenal_national", true, "l'arsenal, déjà acquis, n'est plus proposé");
  eq(opt.find((o) => o.famille === "attaque").report, false, "attaque : nouveau tirage, pas une reconduction");

  console.log("\n— Effets : a_developpement et date d'effet");
  eq((await db.query("select public.a_developpement('FR','arsenal_national') as b")).rows[0].b, true, "acquis");
  eq((await db.query("select public.a_developpement('FR','arsenal_national', $1) as b", [Sm2])).rows[0].b, false, "pas encore en vigueur la semaine du vote");
  eq((await db.query("select public.a_developpement('FR','arsenal_national', $1) as b", [Sm1])).rows[0].b, true, "en vigueur le lundi suivant");
  eq((await db.query("select public.a_developpement('DE','arsenal_national') as b")).rows[0].b, false, "DE : non");

  // Acquis forcés sur des pays VIERGES (aucun vote de ressource, donc jamais n°1 du §47) : on isole chaque développement.
  const acquerir = (pays, dev) =>
    db.query(
      "insert into public.developpements_pays (country_id, developpement, semaine_vote, cout) values ($1,$2,$3,'{\"industrie\":0,\"techno\":0,\"culture\":0,\"commerce\":0}') on conflict do nothing",
      [pays, dev, Sm3]
    );
  const pt = await joueur(db, "PT", "p"),
    nl = await joueur(db, "NL", "n");
  for (const d of ["expansion_urbaine", "avance_technologique", "rayonnement_diplomatique", "arsenal_national", "mobilisation_eclair"]) await acquerir("PT", d);
  for (const d of ["fortifications", "bouclier_civil", "resistance_propagande"]) await acquerir("NL", d);
  eq(await nombre(db, "select public.bonus_croissance_pays('PT') as v"), 0.1, "Expansion urbaine : +10 % de croissance");
  eq(await nombre(db, "select public.bonus_croissance_pays('NL') as v"), 0, "NL : 0");
  eq(await nombre(db, "select public.reduction_seuil_pays('PT') as v"), 0.1, "Avance technologique : −10 % des seuils");
  eq(await nombre(db, "select public.poids_voix_diplomatique_pays('PT') as v"), 1.5, "Rayonnement : poids 1,5 (voix au chapitre sans la Culture n°1)");
  eq(await nombre(db, "select public.poids_voix_diplomatique_pays('NL') as v"), 0, "NL : toujours pas de voix");
  eq(await nombre(db, "select public.multiplicateur_defensif_pays('NL', current_date) as v"), 1.75, "Fortifications : défenseur ×1,75");
  eq(await nombre(db, "select public.multiplicateur_defensif_pays('PT', current_date) as v"), 1.5, "PT : ×1,5 de base");
  eq(await nombre(db, "select public.facteur_pertes_guerre_pays('NL', current_date) as v"), 0.5, "Bouclier civil : pertes ×0,5");
  eq(await nombre(db, "select public.facteur_antiville_pays('NL') as v"), 0.75, "Résistance : AntiVille ×0,75");
  eq(await nombre(db, "select public.facteur_antiville_pays('PT') as v"), 1, "PT : ×1");
  eq(await nombre(db, "select public.multiplicateur_effort_pays('PT','attaquant', current_date, false) as v"), 1.2, "Arsenal : attaquant ×1,2");
  eq(await nombre(db, "select public.multiplicateur_effort_pays('PT','attaquant', current_date, true) as v"), 2.4, "Arsenal + Mobilisation éclair : jour 1 ×2,4");
  eq(await nombre(db, "select public.multiplicateur_effort_pays('PT','defenseur', current_date, true) as v"), 1, "en défense : ni arsenal ni éclair");

  console.log("\n— Poids de l'avis : Culture n°1 + Rayonnement = 2,5");
  await ressource("PT", "culture", Sm2, 3);
  eq(await nombre(db, "select public.poids_voix_diplomatique_pays('PT') as v"), 2.5, "Culture n°1 (2) + Rayonnement (+0,5) = 2,5");
  await db.query("delete from public.votes_pays where country_id = 'PT'");

  console.log("\n— Service de renseignement");
  await db.query("create or replace function public.effort_national(p_country_id text) returns numeric language sql as $$ select case when p_country_id = 'PT' then 12::numeric else 10::numeric end $$");
  eq((await db.query("select public.effort_national_cible('PT','NL') as v")).rows[0].v, null, "sans le développement : rien à voir");
  await acquerir("PT", "service_renseignement");
  eq(Number((await db.query("select public.effort_national_cible('PT','NL') as v")).rows[0].v), 10, "avec : l'effort réel de la cible");

  console.log("\n— Guerre : arsenal + éclair (PT attaque), fortifications + bouclier (NL défend)");
  await db.query("update public.cities set population = 5000, population_max = 5000 where country_id in ('PT','NL')");
  await db.query("insert into public.conflits (pays_attaquant_id, pays_defenseur_id, debut, fin) values ('PT','NL', now() - interval '3 days', now() + interval '4 days')");
  await db.query("select public.resoudre_conflits_en_cours()");
  let k = (await db.query("select jours_gagnes_attaquant a, jours_gagnes_defenseur d from public.conflits")).rows[0];
  eq([k.a, k.d], [1, 3], "jour 1 : 12 × 2,4 = 28,8 > 10 × 1,75 → PT gagne ; jours 2-4 : 12 × 1,2 = 14,4 < 17,5 → NL gagne");
  const pertesNL = (await db.query("select valeur from public.city_events e join public.cities c on c.id = e.ville_id where e.type='guerre' and c.country_id='NL' order by e.jour limit 1")).rows[0];
  eq(Number(pertesNL.valeur), 2, "ville NL de 5 000 hab : 5/jour normalement, 2 avec le Bouclier civil (⌊5 × 0,5⌋)");

  // Un effort plus serré prouve que les Fortifications changent l'issue : 14 × 1,2 = 16,8 → perd contre 17,5, gagne contre 15.
  await db.query("delete from public.conflits");
  await db.query("delete from public.city_events where type='guerre'");
  await db.query("create or replace function public.effort_national(p_country_id text) returns numeric language sql as $$ select case when p_country_id = 'PT' then 14::numeric else 10::numeric end $$");
  await db.query("insert into public.conflits (pays_attaquant_id, pays_defenseur_id, debut, fin) values ('PT','NL', now() - interval '3 days', now() + interval '4 days')");
  await db.query("select public.resoudre_conflits_en_cours()");
  k = (await db.query("select jours_gagnes_attaquant a, jours_gagnes_defenseur d from public.conflits")).rows[0];
  eq([k.a, k.d], [1, 3], "avec Fortifications : jours 2-4 : 16,8 < 17,5 → NL gagne ; jour 1 (×2,4) → PT");
  await db.query("delete from public.conflits");
  await db.query("delete from public.city_events where type='guerre'");
  await db.query("delete from public.developpements_pays where country_id='NL' and developpement='fortifications'");
  await db.query("insert into public.conflits (pays_attaquant_id, pays_defenseur_id, debut, fin) values ('PT','NL', now() - interval '3 days', now() + interval '4 days')");
  await db.query("select public.resoudre_conflits_en_cours()");
  k = (await db.query("select jours_gagnes_attaquant a, jours_gagnes_defenseur d from public.conflits")).rows[0];
  eq([k.a, k.d], [4, 0], "SANS Fortifications : 16,8 > 10 × 1,5 = 15 → PT gagne les 4 jours (les Fortifications changent donc bien l'issue)");

  console.log("\n— Clôture déclenchée par un réglage (pas besoin d'ouvrir /pays)");
  await db.query("delete from public.votes_developpement");
  await db.query("delete from public.resultats_developpement where country_id='IT'");
  for (let i = 0; i < 2; i++) { const j = await joueur(db, "IT", "i" + i); await votDev(j, "expansion_urbaine", Sm1); }
  await ressource("IT", "industrie", Sm1, 4);
  await ressource("IT", "commerce", Sm1, 8);
  eq(await nombre(db, "select public.bonus_croissance_pays('IT') as v"), 0.2, "bonus_croissance_pays(IT) clôt d'abord la semaine passée : Expansion urbaine (+10 %) + IT n°1 Commerce (+10 %)");

  console.log("\n— AntiVille : Résistance à la propagande");
  const cibleDE = nl.villeId; const cibleES = (await joueur(db, "ES", "e")).villeId;
  await db.query("update public.cities set population = 100000, population_max = 100000 where id = any($1)", [[cibleDE, cibleES]]);
  const att1 = await joueur(db, "IT", "a1"), att2 = await joueur(db, "IT", "a2");
  const rDE = (await db.query("select (public.lancer_action_antiville($1,$2,'contamination')->>'perte')::int as p", [att1.userId, cibleDE])).rows[0].p;
  const rES = (await db.query("select (public.lancer_action_antiville($1,$2,'contamination')->>'perte')::int as p", [att2.userId, cibleES])).rows[0].p;
  ok(rDE < rES, `ville NL (Résistance) perd moins que la ville ES identique : ${rDE} < ${rES}`);

  console.log("\n— Historique");
  const h = (await db.query("select * from public.historique_pays('FR', 12)")).rows;
  ok(h.length > 0, `historique_pays('FR') renvoie ${h.length} semaines`);
  const hSm2 = h.find((r) => iso(r.semaine) === Sm2);
  eq([hSm2?.developpement, hSm2?.developpement_finance], ["arsenal_national", true], "semaine Sm2 : arsenal voté et financé");
  const hSm1 = h.find((r) => iso(r.semaine) === Sm1);
  eq(hSm1?.developpement_finance, false, "semaine Sm1 : fortifications non financé");

  console.log(process.exitCode ? "\nÉCHECS" : "\nTOUT EST VERT");
} catch (e) {
  console.error("ERREUR SQL :", String(e.message).slice(0, 500), e.detail ? "| " + e.detail : "", e.where ? "| " + e.where : "");
  process.exit(1);
}
