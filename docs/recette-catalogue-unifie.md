# Recette — A-INTEGRER §41 : plus de ressources de ville, mégaprojets dans le catalogue des monuments

À jouer par Adrien. **Migration `0050` pas encore appliquée.**

## Avant de jouer : appliquer la migration

1. Dans l'éditeur SQL Supabase, coller et exécuter
   `supabase/migrations/0050_catalogue_unifie_monuments_megaprojets.sql`.
2. Puis exécuter : `notify pgrst, 'reload schema';` (sinon l'API ne voit pas
   le nouveau `monument_catalogue()`).

Tant que ce n'est pas fait, le jeu fonctionne (plus aucun appel aux fonctions
supprimées) mais **les mégaprojets ne se débloquent pas**.

```bash
npm run dev
```

## Ce qu'il faut juger

1. Sur **Ma ville** et **Villes**, il n'y a plus de panneau « Mégaprojets du
   maire » : plus de choix entre 3 projets, plus de barres matériaux / revenus /
   points. Le panneau **« Monuments et mégaprojets »** (replié, comme celui des
   monuments l'était) liste **34 entrées** dans l'ordre où elles se débloquent,
   chacune avec son seuil d'influence, et **« Voir où il est »** pour celles qui
   sont débloquées.
2. Les mégaprojets **apparaissent tout seuls** quand le record d'influence
   franchit leur seuil. Pour le voir sans attendre, sur une ville de dev (dans
   l'éditeur SQL), puis recharger `/ville` :

   ```sql
   update public.cities set influence_max = 1000000 where id = '<id de la ville>';
   ```

   Les 34 se débloquent, les 18 mégaprojets sont dessinés à la bordure de la
   ville, et le bulletin municipal annonce chacun (**« Nouveau mégaprojet : … »**).
3. **Les bonus sont conservés.** Hôpital (2 000) : une contamination fait perdre
   deux fois moins ; Opéra (30 000) : une propagande aussi ; Stade (3 500) et Grand
   stade : pertes de manifestation −25 % ; Centrale solaire (6 000), Parc éolien
   (20 000), Centrale, Centrale nouvelle génération : Énergie +20 % chacune.
4. **À juger : la répartition des seuils** (Claude Code l'a décidée). Les 18
   mégaprojets vont de **400** (Grande école) à **400 000** (Siège international),
   entre les monuments, sans jamais partager un seuil. Les villes de test
   (jusqu'à 13 680 d'influence) en débloquent 8. Si l'ordre ou l'espacement ne
   vous convient pas, c'est une liste à changer à deux endroits (la migration et
   `src/lib/game/megaprojets.ts`), un test vérifie qu'ils restent identiques.

## À savoir avant de juger

- **Les chantiers existants sont perdus** (base de dev) : la table `megaprojets`
  est supprimée. Chaque ville récupère **silencieusement** (aucun événement de
  bulletin) les mégaprojets que son influence atteint déjà. Une ville qui en avait
  construit un par sa population mais dont l'influence est faible le perd ; il
  reviendra avec l'influence.
- **Les technologies ne changent pas** : elles gardent leurs points de Recherche
  cumulés (la fonction `stock_ville()` reste pour elles). Les **ressources
  nationales** des pays non plus.
- **Où ils se dressent** : les mégaprojets restent à la **bordure de la ville**
  (§37), les monuments dans les cours des blocs (§33). Comme un mégaprojet ne se
  débloque plus par la population, sa case est fixée par son **ancien stade**
  (Bourg, Ville, Grande ville, Métropole, Mégapole) : une petite ville très
  influente verrait donc ses mégaprojets un peu loin de son bord. Dites-le si ce
  n'est pas acceptable (l'alternative est de mémoriser la population au déblocage).
- **Zone logistique** : son effet (« insensible à la pause de chantier ») n'a plus
  de sens sans chantier ; elle est purement décorative, comme avant. La **grève**
  ne met plus de chantier en pause non plus.
- **Dessin** : les mégaprojets sont toujours dessinés par l'ancien code (trois
  silhouettes, teinte de leur activité). Le travail de détail des monuments (§43)
  ne les couvre pas encore.
- **La migration n'a pas été exécutée par un moteur SQL** avant l'envoi (aucun
  outil disponible) : le premier vrai test est son application. Si l'éditeur SQL
  renvoie une erreur, copiez-la-moi telle quelle.

## Tests automatisés couvrant ce chantier

Sans base, tout de suite :

```bash
npx vitest run tests/unit/catalogueBatiments.test.ts tests/unit/megaprojetsVille.test.ts tests/unit/evenements.test.ts
npx playwright test tests/e2e/catalogue-monuments-voir-ou.spec.ts
```

**Ces trois e2e attendent la migration `0050` appliquée** (à rejouer ensuite) :

```bash
npx playwright test tests/e2e/catalogue-monuments-megaprojets.spec.ts tests/e2e/jalon20-monuments.spec.ts tests/e2e/voir-ou-megaprojets-energie.spec.ts
```

Le premier compare notamment le catalogue **de la base** à celui du code, vérifie
que les fonctions, la table et les colonnes du financement n'existent plus, et
que deux affichages simultanés ne créent aucun doublon. Le troisième (« Voir où
il est » d'un mégaprojet) n'a été joué qu'avec la ligne de déblocage posée à la
main, faute de migration.
