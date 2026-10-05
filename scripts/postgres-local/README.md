# Postgres local jetable pour exécuter les migrations

Le dépôt n'a pas de base de données locale : jusqu'ici le SQL des migrations n'était
vérifié qu'en le relisant, par des garde-fous sur son texte, ou une fois appliqué par Adrien.
Ce dossier rejoue **toutes** les migrations dans [PGlite](https://pglite.dev) (Postgres compilé
en WebAssembly, en mémoire) et y fait tourner des scénarios, pour que le SQL soit **exécuté**
avant d'être envoyé.

**PGlite n'est pas une dépendance du projet** (règle de poids, `CLAUDE.md`) : il n'est pas
dans `package.json`. Pour s'en servir :

```bash
npm install --no-save @electric-sql/pglite
node scripts/postgres-local/charger.mjs                      # rejoue les migrations, compte les fonctions
node scripts/postgres-local/scenario-0052-classement.mjs     # etc.
```

Ce que le bouchon ne fait pas : pas de PostgREST (donc pas de supabase-js), pas de RLS
réaliste (`auth.uid()` renvoie toujours null, comme pour la clé `service_role`), pas de
`pg_cron`. Les scénarios appellent les fonctions SQL directement, comme les specs e2e les
appellent par `supabaseAdmin.rpc(...)`.

Pour en faire une dépendance de développement du dépôt (poids, usage), la décision est à
Adrien : voir `docs/DECISIONS.md` §10 point 41.
