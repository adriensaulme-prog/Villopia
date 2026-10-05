# Recette — Les 18 mégaprojets ont chacun leur silhouette (A-INTEGRER §44)

À jouer par Adrien. **Aucune migration**, aucune règle de jeu touchée : déblocage par seuil d'influence, bonus et
places des mégaprojets sont exactement ceux du §41 et du §37.

```bash
npm run dev
```

## Où les voir

1. **Dans le showroom** (le plus lisible) : `http://localhost:3000/dev/showroom`, tout en bas, section
   « Mégaprojets (du stade 0 au stade 4) » : les 18 vignettes dans l'ordre du catalogue. Le curseur de
   rotation tourne les modèles. Le rendu y est simplifié (couleurs de sommets, une lumière) : les vitrages y
   paraissent plus ternes que dans le jeu.
2. **Dans le jeu** : « Ma ville » → panneau des monuments et mégaprojets → « Voir où il est » sur un mégaprojet
   débloqué (la caméra s'y rend et un repère doré l'indique). Pour en débloquer beaucoup d'un coup sur un
   compte de test, monte l'influence record de la ville.

## Ce qu'il faut juger

1. **La silhouette de chacun** reconnaît-elle le bâtiment ? École (ailes de pierre + atrium vitré), hôpital
   (croix rouge), opéra (colonnes, fronton, dôme vert-de-gris), gare (halle en voûte de verre), aéroport
   (piste, terminal en voûte, tour de contrôle, avion), stades (cuvettes ovales, mâts), etc.
2. **La couleur** : chaque mégaprojet a maintenant la matière de l'ouvrage réel (pierre, verre, brique, fonte
   verte, bardage, béton, cuivre patiné), plus de teinte d'activité ni d'or de monument.
3. **Les modèles d'Énergie réutilisés** : la centrale solaire (trois rangées de la ferme de panneaux), le parc
   éolien (trois éoliennes à bande rouge) et la centrale (hall à bandeau jaune, deux réservoirs) sont bien les
   mêmes modèles que les installations d'Énergie de la campagne, en plus petit. La centrale « nouvelle
   génération » est une version enrichie dessinée à part (dôme, deux tours de refroidissement, batteries).
4. **La taille — le point à trancher.** Je ne l'ai pas changée : un mégaprojet de stade 0 ou 1 (école, parc des
   sports, marché, hôpital, stade, centrale solaire, logistique) mesure 5 à 6 m, donc **moins qu'un arbre** dans
   la vraie scène, même au zoom maximal. Les détails y sont fins. Faut-il les agrandir ? Dis-moi de combien ;
   c'est deux fonctions (`rayonMegaprojet`, `hauteurMegaprojet` dans `megaprojets.ts`), avec une limite : la
   plus petite cour d'un bloc fait 14,5 m de large, donc 7 m de demi-côté au maximum.
5. **Le Siège international** : les mâts à fanions utilisent des couleurs unies neutres, volontairement sans
   aucun drapeau réel (aucune vraie marque ni emblème, `CLAUDE.md`).

## Tests automatisés couvrant ce jalon

```bash
npm test  # dont tests/unit/megaprojetsSilhouettes.test.ts (14 tests) et megaprojetsVille.test.ts (15)
```
