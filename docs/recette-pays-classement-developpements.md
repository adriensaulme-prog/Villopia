# Recette — Classement des pays et développements nationaux (A-INTEGRER §47 et §48)

À jouer par Adrien. Trois nouveautés liées : le **classement hebdomadaire des pays** avec un
bonus au n°1 de chaque catégorie de ressource (§47), les **développements nationaux** votés chaque
semaine et financés par les ressources (§48), et la **nouvelle page `/pays`** en cinq onglets.
**Trois migrations à appliquer**, dans l'ordre.

```bash
npm run dev
```

## ⚠ Avant de tester : migrations à appliquer

Colle dans l'éditeur SQL de Supabase, **dans cet ordre**, chaque fichier d'un seul bloc :

1. `supabase/migrations/0052_classement_pays.sql` — classement et effets du n°1 ;
2. `supabase/migrations/0053_avis_pays_vises.sql` — avis des pays visés (Culture n°1) ;
3. `supabase/migrations/0054_developpements_nationaux.sql` — développements nationaux.

Tant qu'elles ne sont pas appliquées, `/pays` s'affiche comme avant, avec les cinq onglets mais sans
classement ni vote de développement (rien ne casse). Ensuite :

```bash
npx playwright test tests/e2e/classement-developpements-pays.spec.ts
```

(quatre tests, ignorés tant que la `0054` n'est pas là ; ils créent des comptes dans les pays NO, DK et
FI et les nettoient).

## Ce qu'il faut juger

**La nouvelle page `/pays`** (première proposition, ton avis est attendu)
1. L'en-tête (nom du pays, statut, président, quatre chiffres) reste sur tous les onglets, puis cinq
   onglets : **Cette semaine** (par défaut), **Classement**, **Développement**, **Pays**, **Historique**.
   Le découpage te convient-il, ou préfères-tu tout sur une seule page défilante ? Les noms des
   onglets sont-ils clairs ? Sur mobile, la barre d'onglets défile sur le côté : est-ce acceptable ?
2. « Cette semaine » rassemble les trois décisions hebdomadaires (la ressource à produire, le
   développement à financer, la décision diplomatique), chacune avec « À faire / Voté ». Est-ce bien
   ce que tu veux voir en premier en ouvrant la page ?

**Le classement (§47)** — onglet « Classement »
3. Quatre lignes (Industrie, Technologie, Culture, Commerce) : le rang du pays, qui est en tête, et
   l'effet du n°1, marqué **Effet actif** (en vert) quand c'est ton pays. Pour voir un n°1, il faut des
   ressources votées lors de **semaines passées** : le classement ne compte pas la semaine en cours
   (il est figé du lundi au dimanche). Sur une base neuve, personne n'est n°1 la première semaine.
4. Les effets sont-ils lisibles ? Industrie n°1 : +15 % d'effort national en guerre. Commerce n°1 :
   +10 % de chance d'un habitant de plus par visite. Technologie n°1 : −10 % sur les seuils
   d'influence (visible dans le panneau Monuments de « Ma ville » : « (−10 %) » à côté du seuil).
   Culture n°1 : avis ×2 sur les décisions qui visent le pays. **Ces chiffres sont de Claude Code.**

**Les développements (§48)**
5. « Cette semaine » : trois cartes, **une par famille** (Attaque, Défense, Développement), avec le
   nom, l'effet, le coût (puces vertes si le stock couvre la catégorie, rouges sinon) et un bouton
   « Voter ». Après ton vote : « Tu as voté pour… ». Un seul vote par semaine.
6. « Développement » : le stock (disponible, produit, dépensé par catégorie), les neuf développements
   par famille, ceux qui sont débloqués en vert avec leur date.
7. Le vote se clôt le lundi : le plus voté est débloqué **s'il est finançable**, sinon il revient la
   semaine suivante (badge « Reconduit »). Pour l'essayer sans attendre : voter, puis dans l'éditeur
   SQL reculer la semaine du vote d'une semaine
   (`update public.votes_developpement set semaine = semaine - 7;`) et recharger `/pays`.
8. **Les coûts (10 à 16 ressources) et les effets (+10 % à +20 %) sont à calibrer** avec de vrais pays :
   un pays de 10 joueurs produit 10 ressources par semaine. Trop cher ? Trop facile ?

**Les avis (Culture n°1 et Rayonnement diplomatique)**
9. Quand un autre pays propose une décision qui **vise le tien** et que ton pays a « voix au chapitre »
   (n°1 en Culture ou Rayonnement diplomatique), « Cette semaine » affiche « Décisions qui visent ce
   pays » avec « Pour / Contre » et le poids de ton avis. **C'est une interprétation de Claude Code**
   (le §47 parle du « vote » d'un pays dans les décisions des autres, qui n'existe pas dans le jeu) :
   est-ce bien l'idée ? Voir ⚠ ci-dessous.

## ⚠ Points à trancher

- **Mesure du classement** : le **total** de ressources (comme le §47 le dit) donne mécaniquement la
  victoire aux grands pays dans les quatre catégories. Garde-t-on le total, ou la moyenne par ville
  comme pour l'effort de guerre ? (`DECISIONS.md` §10 point 38 ; un seul endroit à changer.)
- **Avis des pays visés** (§10 point 39) : l'interprétation retenue convient-elle ?
- **Chiffres** (§10 point 40) : coûts, effets, bonus du n°1. Deux écarts avec le §48 : « Mobilisation
  éclair » = effort ×2 le premier jour (il n'y a pas de « montée en puissance » à supprimer) ;
  « Bouclier civil » divise les pertes quotidiennes (le plafond de 5 % n'est jamais atteint).
- **Postgres local** (§10 point 41) : veux-tu que PGlite devienne une dépendance de développement ?
- Pas fait : notification quand un développement se débloque ; chapitre « Pays » dans les règles du jeu.
