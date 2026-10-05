// Postgres LOCAL JETABLE (PGlite, du Postgres compilé en WebAssembly) : rejoue toutes les migrations de
// supabase/migrations/ dans une base en mémoire, avec des bouchons pour ce que Supabase fournit (rôles,
// auth.uid()). Sert à EXÉCUTER le SQL avant de l'envoyer à Adrien, ce que le dépôt ne permettait pas
// (aucune base locale). N'est PAS une dépendance du projet : voir README.md de ce dossier.
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DOSSIER = fileURLToPath(new URL("../../supabase/migrations", import.meta.url));

/** Ouvre un Postgres en mémoire, avec les bouchons Supabase (rôles, auth.uid), et joue les migrations jusqu'à `jusqua` (inclus). */
export async function ouvrir(jusqua = "9999") {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create function auth.role() returns text language sql stable as $$ select 'service_role'::text $$;
  `);
  const fichiers = readdirSync(DOSSIER).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
  for (const f of fichiers) {
    if (f.slice(0, 4) > jusqua) break;
    try {
      await db.exec(readFileSync(join(DOSSIER, f), "utf-8"));
    } catch (e) {
      console.error("ÉCHEC dans", f, "→", e.message);
      throw e;
    }
  }
  return db;
}

if (process.argv[1].endsWith("charger.mjs")) {
  const db = await ouvrir();
  const r = await db.query("select count(*) as n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'");
  console.log("OK : migrations jouées, fonctions publiques =", r.rows[0].n);
}
