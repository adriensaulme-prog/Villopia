# Recette — A-INTEGRER §8 : noms uniques (pseudos et villes)

À jouer par Adrien. **Migration `0035` appliquée** (vérifié le 05/10/2026 sur
la base de dev).

```bash
npm run dev
```

## Ce qu'il faut juger

1. **À la création d'un compte** (page « Fonder sa ville »), tape dans
   **Pseudo** le pseudo d'un joueur existant, en changeant la casse, en
   ajoutant un accent ou un tiret : après une fraction de seconde apparaît
   **« ✗ déjà pris »** ; un pseudo libre affiche **« ✓ disponible »**.
2. Même chose pour **le nom de la ville**. Exemple en base de dev :
   « Rochemaure » existe parmi les villes de test, donc « roche-maure »,
   « ROCHEMAURÉ » ou « Roche Maure » doivent tous être refusés.
3. Un pseudo de **2 caractères**, de **21 caractères**, ou « **admin** » /
   « **modérateur** » est refusé avec un message qui dit pourquoi.
4. Valide quand même un nom pris (le ✗ n'empêche pas de cliquer) : tu dois
   obtenir un **message clair**, jamais une erreur technique.
5. **Rattrapage d'un doublon** — pour le simuler, dans l'éditeur SQL
   Supabase (remplace le pseudo par celui d'un compte de test à toi) :

   ```sql
   update public.users  set pseudo_a_changer = true where pseudo = '…';
   update public.cities set nom_a_changer   = true where owner_id = (select id from public.users where pseudo = '…');
   ```

   À la prochaine page de jeu, ce joueur est renvoyé sur **« Choisis un
   autre nom »** ; une fois les deux noms changés, il retrouve sa ville.
   (Valider remet les drapeaux à `false`, rien d'autre à nettoyer.)

## Le test rouge sur une vraie base (geste réservé à Adrien)

Claude Code n'a **aucun accès SQL** (ni `psql`, ni CLI Supabase) : il a
prouvé le « rouge » sur le **texte du schéma**, pas sur une base réelle.
Si tu veux la preuve complète, **sur la base de dev uniquement, jamais sur
la production** :

1. Dans l'éditeur SQL Supabase :

   ```sql
   drop index public.users_pseudo_normalise_unique;
   ```

2. Lance `npx playwright test tests/e2e/noms-uniques.spec.ts` : les tests
   **« même nom avec une autre casse… »**, **« un accent ne distingue pas
   deux noms »** et **« deux créations simultanées… »** doivent passer au
   **rouge** (le test sur les villes passe au rouge de la même façon si tu
   retires `cities_nom_normalise_unique`).
3. **Remets l'index** (vérifie d'abord qu'aucun doublon n'est apparu) :

   ```sql
   select pseudo_normalise, count(*) from public.users
   where not pseudo_a_changer group by 1 having count(*) > 1;

   create unique index users_pseudo_normalise_unique
     on public.users (pseudo_normalise) where not pseudo_a_changer;
   ```

   Pour les villes : `cities_nom_normalise_unique`, colonne `nom_normalise`,
   drapeau `nom_a_changer`.

## À savoir avant de juger

- **Pas d'extension `unaccent`**, contrairement à la lettre du §8 : une
  colonne générée indexée exige une fonction `IMMUTABLE`, ce qu'`unaccent`
  n'est pas, et son schéma varie selon le projet Supabase. À la place,
  `nom_normalise()` translittère explicitement les lettres latines
  accentuées. **Conséquence à connaître** : les lettres hors alphabet
  latin (cyrillique, arabe, japonais…) sont supprimées par la
  normalisation, donc un nom **entièrement** écrit dans un de ces alphabets
  est refusé comme « vide » (« Le nom doit contenir au moins une lettre ou
  un chiffre »), et « 東京Tokyo » serait confondu avec « Tokyo ». À trancher
  par Adrien si le jeu doit un jour accepter ces écritures.
- **Les règles de format** (pseudo de 3 à 20 caractères, noms réservés,
  mots interdits) sont appliquées par l'application, pas par la base : un
  appel direct à `creer_ville()` (scripts, specs) les contourne. Seule
  l'**unicité** est garantie par la base.
- **Portée mondiale** : un pseudo ou un nom de ville pris l'est pour tous
  les pays.

## Tests automatisés couvrant ce chantier

```bash
npx vitest run tests/unit/nomsUniques.test.ts tests/unit/nomsUniquesSchema.test.ts
npx playwright test tests/e2e/noms-uniques.spec.ts
```
