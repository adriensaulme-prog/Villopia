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
3. **Les modèles d'Énergie réutilisés** : la centrale solaire (un champ de rangées de la ferme de panneaux, à
   leur taille d'origine), le parc éolien (trois éoliennes à bande rouge, pistes d'accès, poste) et la centrale
   (hall à bandeau jaune, deux réservoirs, panaches de vapeur) sont bien les mêmes modèles que les
   installations d'Énergie de la campagne. La centrale « nouvelle génération » est une version enrichie
   dessinée à part (dôme, deux tours de refroidissement, batteries, poste).
4. **Les abords et le détail** (retour du 05/10/2026 : « très peu développés ») : chaque site a maintenant sa
   pelouse, ses allées, ses arbres, du mobilier et, selon le cas, un parking avec des voitures, des
   ambulances, des camions, des trains, des avions. Le **Grand stade** est refait : bas et large, façade à
   bannières bleu et rouge, toit-couronne blanc. Est-ce assez fourni ? Lesquels te paraissent encore pauvres ?
5. **Le Siège international** : les mâts à fanions utilisent des couleurs unies neutres, volontairement sans
   aucun drapeau réel (aucune vraie marque ni emblème, `CLAUDE.md`).

## Tests automatisés couvrant ce jalon

```bash
npm test  # dont tests/unit/megaprojetsSilhouettes.test.ts (16 tests) et megaprojetsVille.test.ts
```
