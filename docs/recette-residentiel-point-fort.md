# Recette — Point fort du Résidentiel (A-INTEGRER §42)

À jouer par Adrien. **Une migration à appliquer** (`0049`), rien d'autre ne change côté interface.

```bash
npm run dev
```

## ⚠ Avant de tester : migration à appliquer

Colle `supabase/migrations/0049_residentiel_point_fort.sql` dans l'éditeur SQL de Supabase
(comme les précédentes). Elle ajoute une petite fonction et recrée `visiter_ville()` : aucune
donnée, aucune colonne. Je n'ai pas pu l'exécuter moi-même (pas de base locale) : c'est la
première fois que ce SQL tourne, dis-moi s'il refuse.

Vérification rapide, toujours dans l'éditeur SQL :

```sql
select public.bonus_croissance_residentiel(1.0),   -- 0     (équilibré : rien)
       public.bonus_croissance_residentiel(1.35),  -- 0.125 (point fort à mi-chemin)
       public.bonus_croissance_residentiel(1.5);   -- 0.25  (plafond)
```

Puis les deux tests de comportement, qui s'ignoraient jusque-là :

```bash
npx playwright test tests/e2e/residentiel-point-fort.spec.ts
```

## Ce qu'il faut juger

1. **Le principe** : le Résidentiel joue maintenant dans les deux sens, comme Industrie, Services
   et Loisirs. Sous 60 % de jauge, la *crise du logement* (déjà là depuis le Jalon 18) ralentit
   la croissance ; au-dessus de 120 %, le *point fort* l'accélère : chaque visite a une chance
   (jusqu'à 25 %) de rapporter **2 habitants au lieu d'1**. Le message de visite affiche déjà le
   gain réel (`+2 habitants`).
2. **Le chiffre (25 %)** : c'est le même plafond que le « croissance » du Commerce. Je n'ai pas
   pris 50 % parce que les petites villes n'ont que deux activités (Résidentiel, Loisirs) et
   atteignent ce point fort presque d'office : à 50 %, le début de partie accélérerait trop.
   Trop timide ? C'est un seul chiffre (`0.25`) dans `bonus_croissance_residentiel()`.
3. **L'absence de second malus** : le §42 proposait aussi « la ville perd des habitants plus
   facilement » en crise. Je ne l'ai pas ajouté : la crise du logement ralentit déjà la
   croissance, un second malus punirait deux fois la même jauge. Dis-moi si tu le veux quand même.
4. **Correction du §42** : le Résidentiel n'avait pas « aucun effet » (sa crise existait) ; et
   Commerce (plus de bonus des jumelages) et Énergie (risque de manifestation doublé) ont aussi
   un malus de crise codé. Seule la Recherche n'en a pas.

## Tests automatisés couvrant ce jalon

```bash
npm test  # dont tests/unit/residentielPointFort.test.ts (garde de schéma, 11 tests dont 9 sabotages)
npm run test:e2e  # dont tests/e2e/residentiel-point-fort.spec.ts (après la migration 0049)
```
