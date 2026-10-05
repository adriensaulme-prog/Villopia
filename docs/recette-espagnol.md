# Recette — L'espagnol, troisième langue du jeu (A-INTEGRER §50) et les jauges expliquées (§49)

À jouer par Adrien. **Aucune migration.** Le jeu est maintenant disponible en français, en anglais et en **espagnol**.

```bash
npm run dev
```

## Ce qu'il faut juger

1. **Le sélecteur de langue** : en haut à droite, « FR · EN · ES ». Clique sur **ES** : tout le site passe en espagnol
   (le choix est gardé dans un cookie, comme pour l'anglais).
2. **La page Règles** (`/regles`) : dans la section « Actividades e indicadores », les huit nouveaux paragraphes expliquent
   les jauges — ce que fait chaque activité en point fort et en crise (§49). Vérifie aussi qu'ils sont à jour en français et en
   anglais.
3. **Les rangs** : « 12.º de France » en espagnol (pas « 12th »).
4. **Une relecture par un locuteur natif.** Les 540 textes et les règles ont été traduits par Claude Code : corrects dans
   l'ensemble, mais à faire relire (toi ou un testeur hispanophone) avant d'annoncer la langue, surtout les noms d'activités, les
   messages d'erreur et les textes courts de l'accueil. Quelques choix à confirmer : « AntiCiudad » (AntiVille),
   « hermanamiento » (jumelage), « indicadores » (jauges), « manifestación » (manifestation), « Tienda » (Boutique),
   « Costa » (thème Bord de mer), « Parque de atracciones » (Parc d'attractions).
5. **Les noms de pays restent en anglais en espagnol** (« France », « Germany »…) : la base n'a que des noms français et
   anglais. Une migration `nom_es` (les noms espagnols existent dans le paquet `world-countries`) règlerait ça : à valider.

## Tests automatisés couvrant ce jalon

```bash
npm test  # dont tests/unit/dictionaries.test.ts (7 tests : clés, {variables}, valeurs vides, pas de copie du français, ¿ ¡),
          # ordinal.test.ts et regles.test.ts (toutes les langues)
```
