// Petits outils des scénarios : vérifications, création de joueurs, semaines ISO.
import { ouvrir } from "./charger.mjs";

export const ok = (cond, msg) => {
  if (!cond) {
    console.error("  ✗ ÉCHEC :", msg);
    process.exitCode = 1;
  } else console.log("  ✓", msg);
};
export const eq = (a, b, msg) => {
  const bon = JSON.stringify(a) === JSON.stringify(b);
  ok(bon, `${msg}${bon ? "" : " (obtenu " + JSON.stringify(a) + ", attendu " + JSON.stringify(b) + ")"}`);
};

let compteur = 0;
/** Crée un compte + sa ville dans le pays donné ; renvoie { userId, villeId }. */
export async function joueur(db, pays, nom) {
  compteur++;
  const u = await db.query("insert into auth.users (email) values ($1) returning id", [`${nom}-${compteur}@ex.com`]);
  const userId = u.rows[0].id;
  const r = await db.query("select (public.creer_ville($1,$2,$3,$4)).id as id", [userId, `${nom}${compteur}`, pays, `Ville ${nom} ${compteur}`]);
  return { userId, villeId: r.rows[0].id };
}
const iso = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));
/** Lundi de la semaine ISO courante décalé de n semaines. */
export async function semaine(db, decalage = 0) {
  const r = await db.query("select (public.semaine_iso() + $1::int * 7) as s", [decalage]);
  return iso(r.rows[0].s);
}
export async function vote(db, userId, pays, categorie, sem) {
  await db.query("insert into public.votes_pays (joueur_id, country_id, categorie, semaine) values ($1,$2,$3,$4)", [userId, pays, categorie, sem]);
}
export const nombre = async (db, sql, params = []) => Number((await db.query(sql, params)).rows[0].v);
export { ouvrir };
