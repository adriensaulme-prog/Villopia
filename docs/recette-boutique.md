# Recette — La boutique de packs de thèmes (A-INTEGRER §30)

À jouer par Adrien. Deux surfaces : la section « Thèmes de la ville » dans
**Ma ville**, et l'onglet **Boutique** (`/boutique`). **Une migration à appliquer**
(`0047`), mais tout fonctionne déjà sans elle.

```bash
npm run dev
```

## ⚠ Avant de tester : migration à appliquer

Colle `supabase/migrations/0047_boutique_packs.sql` dans l'éditeur SQL de Supabase
(comme la `0034`). Tant qu'elle n'est pas appliquée, la Boutique marche mais retombe
sur « tout thème connu est libre » : le serveur ne contrôle pas encore le droit
d'usage d'un pack.

## Ce qu'il faut juger

**Dans « Ma ville »**
1. En bas du panneau, sous « Monuments » : une ligne repliée « Thèmes de la ville ·
   *Classique* ». Est-ce assez discret (« pas au premier plan »), tout en restant
   trouvable ? Elle remplace l'ancien sélecteur qui était tout en haut.
2. Ouvre-la : tes packs, celui qui est **Appliqué**, un bouton « Appliquer » sur les
   autres. Clique sur « Appliquer » pour Haussmannien : la ville change **tout de suite**
   (immeubles en pierre claire) sans quitter la page. Recharge : le thème tient.
3. Le lien « Voir tous les packs dans la Boutique » mène à l'onglet.

**Dans la Boutique**
4. **Ordinateur** : « Boutique » est le dernier onglet. **Mobile et petits écrans
   (< 900 px)** : une icône 🛍️ dans la barre du haut, à côté de la cloche (la barre du
   bas reste à 5 onglets). Est-ce trouvable ? Préfères-tu un 6ᵉ onglet quand même
   (au prix de libellés plus serrés) ?
5. La page montre **tous** les packs avec leur état (Appliqué sur ta ville / Possédé,
   Gratuit), leur description, les pastilles de couleur et les familles de bâtiments
   qu'ils changent (Haussmannien : immeubles seulement, « le reste garde le style
   Classique »).
6. **Aperçu** : sur un pack non appliqué, « Aperçu » redessine **ta** ville avec ce pack,
   dans la scène en fond, avec un bandeau « Aperçu sur ta ville : rien n'est appliqué ».
   « Terminer l'aperçu » revient. **Rien n'est enregistré** : recharge la page, ton thème
   est resté le même. Sur mobile, l'aperçu replie le panneau pour qu'on voie la ville
   (rouvre-le avec la poignée pour retrouver le bandeau).
7. Les packs sont **purement cosmétiques** : la phrase est écrite en haut de la page.
   Vérifie que changer de thème ne bouge ni habitants, ni influence, ni activité.
8. **Pas de bouton « Acheter » visible aujourd'hui**, parce qu'aucun pack n'est payant.
   Pour le voir, passe un pack en payant (voir ci-dessous) : il apparaît **désactivé**,
   avec « L'achat n'est pas encore ouvert… » à côté.

**Voir l'état « non possédé » (facultatif, éditeur SQL, migration appliquée)**

```sql
update public.packs set gratuit = false where id = 'haussmannien';
```

Recharge la Boutique avec un compte qui n'utilisait pas le pack : « Pack payant »,
« Aperçu » possible, « Acheter » désactivé, pas de « Appliquer ». Un compte qui avait
déjà Haussmannien le garde (rattrapage de la migration). Pour le redonner à tous :

```sql
update public.packs set gratuit = true where id = 'haussmannien';
```

Pour offrir un pack payant à un joueur précis :

```sql
insert into public.joueur_packs (joueur_id, pack) values ('<id du joueur>', 'haussmannien');
```

## ⚠ Points à trancher

1. **Haussmannien reste gratuit** pour tous (statut quo depuis la `0034`). Faut-il en faire
   le premier pack payant, et quand ? C'est une ligne SQL (voir plus haut) ; je n'ai pas voulu
   le décider à ta place (`DECISIONS.md` §10 point 37).
2. **Le paiement n'est pas branché** — c'est volontaire (statut légal à régler d'abord,
   `BATIMENTS-ET-PACKS.md` §5, et toute dépense passe par toi). Le bouton « Acheter » est
   l'unique endroit à brancher.
3. **L'onglet Boutique existe dès maintenant**, avec les packs gratuits, pour habituer les
   joueurs. Si tu préfères le cacher jusqu'aux vrais packs payants, c'est une ligne dans
   `NavTabs.tsx` et l'icône de `Nav.tsx`.
4. **Barre du haut resserrée** entre 641 et 1040 px (logo seul, marges réduites) : elle
   débordait déjà à 820 px avant ce jalon (le 6ᵉ onglet aggravait le problème). À regarder
   sur ta tablette ou ta fenêtre réduite.
5. Pas de pack « premium débloqué pour les comptes de test » (`BATIMENTS-ET-PACKS.md` §5) :
   aucun pack premium n'existe encore. À faire dès qu'on en crée un.

## Tests automatisés couvrant ce jalon

```bash
npm test  # dont tests/unit/boutique.test.ts (30)
npm run test:e2e  # dont tests/e2e/boutique-packs.spec.ts (7, dont 2 qui exigent la migration 0047)
```
