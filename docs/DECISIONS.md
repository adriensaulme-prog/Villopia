# DECISIONS.md — Villopia

Source de vérité du projet. Journal honnête : on y consigne ce qui a
marché, ce qui n'a pas marché, et pourquoi. Voir `GUIDE-METHODE.md` pour la
démarche générale et `ROADMAP.md` pour les jalons à venir.

---

## §1. Contraintes fondatrices

Posées avant la première ligne de code, à ne jamais contourner "juste pour
un jalon" :

1. **Dépenses sous contrôle, zéro royalties** (assoupli le 25/09/2026,
   `docs/A-INTEGRER.md` §10, décision d'Adrien — remplace l'ancienne
   règle "zéro coût"). Par défaut, uniquement des outils et niveaux de
   service gratuits (Next.js, Supabase free tier, Vercel free tier,
   GitHub privé gratuit). Une dépense raisonnable reste possible pour un
   résultat carré (nom de domaine, service d'e-mails...), **mais
   uniquement après validation explicite d'Adrien, montant et
   fournisseur à l'appui** — jamais engagée seule, même pour un petit
   montant, et jamais de carte bancaire ni de compte payant créé sans
   cette validation préalable. Toujours aucune royalty sur les revenus
   futurs, aucune licence à l'unité.
2. **Anti-triche côté serveur.** Toute règle qui affecte le classement, la
   population, l'influence ou les ressources d'un joueur est validée côté
   serveur. Le client ne fait que demander et afficher.
3. **Boucle courte.** Le jeu doit rester jouable en 2 à 5 minutes par jour ;
   toute mécanique qui allonge ce temps sans raison de design explicite est
   un point ouvert, pas un fait acquis. **Nuancé le 26/09/2026** (Jalon
   13 bis, `docs/A-INTEGRER.md` §13) : revisiter une ville plusieurs fois
   par jour (jusqu'à 3, délai d'une heure entre deux) est une exception
   volontaire pour la rétention, décidée par Adrien en connaissance de
   cause — voir §4, journal du Jalon 13 bis.
4. **Pas de destruction permanente.** Une défaite ou une attaque ne doit
   jamais détruire durablement une ville ni effacer des mois de
   progression (cahier des charges §19).
5. **i18n dès le premier texte**, fr, en et es (espagnol, A-INTEGRER §50)
   remplis immédiatement, jamais de trou "provisoire".
6. **Application légère** (règle ferme d'Adrien, ajoutée le 23/09/2026 via
   `docs/A-INTEGRER.md` §4) : c'est une appli de 2 à 5 minutes par jour, elle
   doit rester légère. Budget mesuré sur `next build` (tailles déjà
   compressées gzip/brotli qu'il affiche, jamais celles de `.next/` après
   `npm run dev` qui ne veulent rien dire) : premier chargement complet
   ≤ 500 Ko (JS + CSS + polices) ; chaque visite suivante ≈ 0 Ko de code
   grâce au service worker ; une page affiche son texte avant que la 3D ne
   soit prête (Three.js ne doit jamais faire partie du paquet initial du
   layout — voir §4, Jalon 7, correction post-recette, pour le cas où ça
   n'a pas été respecté et comment c'est corrigé). Pas de nouvelle
   dépendance npm sans peser son poids et l'inscrire ici. Images
   autorisées par Adrien : les drapeaux des pays (06/10/2026,
   `public/drapeaux`, flag-icons sous licence MIT, un seul fichier
   téléchargé par page, voir §4 « Drapeaux des pays »).
7. **Aucun outil de triche ou de démonstration dans le jeu jouable**
   (règle ferme d'Adrien, `docs/A-INTEGRER.md` §1) : pas de curseur
   "Habitants", de bouton "Voir grandir", de curseur d'heure ni de
   simulateur — la population ne monte que par les visites d'autres
   joueurs, l'heure affichée est toujours l'heure réelle du pays. Ces
   outils existent dans la maquette (`docs/prototypes/maquette-ecrans.html`)
   pour la démonstration seulement ; pour tester, on utilise les villes de
   test et les scripts de seed, jamais un contrôle accessible au joueur.

---

## §2. Périmètre (MVP)

**Intégralement livré au 26/09/2026** (Jalon 15, sous réserve de la
vérification manuelle mobile/PC encore en attente d'Adrien — voir §4,
journal du Jalon 15). Repris du cahier des charges §30, c'est la
version volontairement plus petite que le jeu final :

- Ville + population + influence.
- 1 connexion par joueur et par ville par jour → +1 population.
- 5 actions d'influence quotidiennes.
- 3 actions AntiVille : grève, contamination, propagande, avec protection
  progressive contre le harcèlement.
- Jumelage avec acceptation des deux villes.
- Classement des villes.
- Évolution visuelle automatique de la ville (Hameau → Village → Bourg →
  Ville → Grande ville → Métropole ; seuils à équilibrer pendant les
  tests).
- Pays + activité quotidienne agrégée.
- Vote hebdomadaire de ressource, résultat proportionnel aux votes.
- Ressources nationales.
- Président = ville #1 du pays.
- Décision diplomatique hebdomadaire (alliance, paix, attaque/rivalité,
  embargo éventuel).
- Rivalité France / Allemagne comme premier scénario de test.

**Explicitement hors MVP** (cahier des charges, "à ajouter ensuite") :
technologies visuelles avancées, alliances/coalitions complexes, projets
nationaux, journal mondial, personnalisation, monétisation, statistiques
avancées.

---

## §3. Environnement technique

- **Frontend** : Next.js / React, TypeScript.
- **Backend** : Supabase (PostgreSQL + Row Level Security + Edge
  Functions pour la logique serveur sensible).
- **Auth** : Supabase Auth.
- **Hébergement** : Vercel (frontend), Supabase (backend), niveaux
  gratuits.
- **PWA** : manifest + service worker pour l'installation sur mobile et
  PC, sans passer par un store.
- **Tests** : Vitest (unitaire), Playwright (bout-en-bout).
- **Code source** : GitHub, dépôt privé —
  `github.com/adriensaulme-prog/Villopia`.
- **Langue par défaut** : français, anglais en parallèle dès le premier
  texte.

---

## §4. Journal des jalons

### Jalon 0 — squelette technique (Next.js, Supabase, PWA) — 23/09/2026

**Ce qui a été fait** : mise en place de la base technique avant tout
contenu de jeu — projet Next.js (App Router, TypeScript, Tailwind),
clients Supabase séparés navigateur/serveur, manifest + service worker
PWA minimal, harnais de tests (Vitest + Playwright), dépôt Git local
initialisé et taggé `0.0.0`.

**Pourquoi** : jalon technique pur, dans l'esprit des jalons techniques de
CVLS — rien de neuf n'est jouable, mais tout ce qui suit s'appuie dessus.

**Ce qui a été testé** : un test canari unitaire (`tests/unit/harness.test.ts`)
et un test de fumée bout-en-bout (`tests/e2e/smoke.spec.ts`), tous deux
non jetables. Pas de sabotage effectué : aucune règle de jeu n'existe
encore à casser.

**Point d'attention noté au passage** : cette session Claude n'a aucun
accès réseau, ni depuis le sandbox cloud ni depuis le dossier connecté sur
la machine d'Adrien (host non autorisé par la politique d'égress de
l'organisation). Concrètement : `npm install`, la création du dépôt
GitHub et son premier `git push`, la création du projet Supabase, et le
déploiement Vercel doivent être faits par Adrien lui-même, dans son propre
terminal. Documenté aussi en §10.

### Jalon 1 — naître quelque part — 23/09/2026

**Ce qui a été fait** : inscription et connexion (Supabase Auth), création
du profil joueur et de sa ville (pseudo, nom de ville, pays) en une seule
étape après la première connexion, page de ville affichant population,
influence, activité et niveau de départ (Hameau). Premier module de
`src/lib/game/` (`niveauVille.ts`). Premier système d'i18n du projet
(dictionnaire fr/en maison, cookie de langue, sélecteur dans la nav) —
voir point 8 ci-dessous sur ce choix. Migrations SQL `0001` et `0002`
(tables `countries`/`users`/`cities`, fonction `creer_ville()`, liste
complète des pays ISO 3166-1 avec noms fr/en).

**Pourquoi** : c'est le premier jalon de contenu du MVP (cahier des
charges §2 et §30) — sans lui, rien n'est jouable.

**Décisions prises en cours de route, à la demande d'Adrien ou par
déduction du cahier des charges** :

1. **Liste de pays à la création** : le cahier des charges ne précisait
   pas la liste. Adrien a tranché pour la liste complète (ISO 3166-1
   alpha-2, 250 entrées, y compris quelques territoires non
   souverains — Antarctique, Mayotte, etc. — inclus dans la norme ISO).
   Noms fr/en générés via le paquet `i18n-iso-countries`, embarqués dans
   la migration `0002` (pas de dépendance à ce paquet à l'exécution).
2. **`Country.nom` (types/index.ts) étendu en `nomFr`/`nomEn`** : la
   règle i18n de `GUIDE-METHODE.md` §9 impose les deux traductions dès
   le premier texte affiché ; un seul champ `nom` ne le permettait pas
   pour les 250 pays. Décision d'implémentation, pas de design de jeu.
3. **Anti-triche appliqué strictement dès ce jalon** : aucune policy RLS
   d'écriture sur `users`/`cities` pour les rôles `anon`/`authenticated` —
   toute écriture passe par la fonction serveur `creer_ville()`, appelée
   avec la clé `service_role`. Étend par prudence le principe du cahier
   des charges §26 (pensé pour population/influence en jeu) au tout
   premier écrit, pour ne pas avoir à le durcir plus tard.
4. **Schéma de la table `users`** : gardé fidèle à `src/types/index.ts`
   existant (et au cahier des charges §28), avec `country_id` et
   `city_id` directement sur la ligne joueur, même si `city_id` est
   dérivable via `cities.owner_id`. Une légère dénormalisation assumée,
   déjà écrite dans le code avant ce jalon.
5. **i18n fait maison, sans librairie** (dictionnaire `fr`/`en` +
   cookie de langue, pas de découpage d'URL `/fr`/`/en`) plutôt que
   `next-intl` ou équivalent. Suffisant pour deux langues, évite de
   figer une structure de routes dès le Jalon 1 ; à reconsidérer si
   l'i18n devient plus complexe (pluriels, dates, etc.).
6. **`@supabase/ssr` ajouté aux dépendances** (paquet officiel Supabase
   pour la gestion de session par cookies en Next.js App Router) : choix
   technique standard, pas un choix de design de jeu.

**Bug trouvé en route (avant même d'écrire du code de jeu)** : l'URL
Supabase dans `.env.local` pointait vers `*.supabase.com` au lieu de
`*.supabase.co` (domaine réel des projets Supabase) — corrigé. La clé
`anon` de `.env.local`, elle, est rejetée par le projet réel
("Invalid API key" — signature invalide) alors que la clé
`service_role` fonctionne : **point ouvert avec Adrien**, voir §10.

**Ce qui a été testé** : `tests/unit/dictionaries.test.ts` (parité des
clés fr/en, aucune valeur vide — protège la règle i18n elle-même) et
`tests/unit/niveauVille.test.ts` (tous les niveaux 0 à 5 dans les deux
langues, sabotage : niveau hors plage ou non entier rejeté).
`tests/e2e/jalon1-naitre-quelque-part.spec.ts` couvre le parcours réel
(connexion → création de ville → page de ville) avec un compte de test
pré-confirmé via l'API admin Supabase, nettoyé après coup — pas encore
exécuté avec succès de bout en bout, faute de clé `anon` valide et de
migrations appliquées sur le projet réel (voir §10). `npm run build` et
`npm run lint` passent.

**Vérification rouge par sabotage** : `niveauVille.test.ts` couvre un
niveau hors plage (-1, 6) et non entier (1.5) → `RangeError` attendu,
test rouge si l'erreur n'est plus levée.

**Mise à jour a posteriori** : une fois Adrien a corrigé la clé `anon`
et appliqué les migrations, la suite e2e est passée de bout en bout —
voir le Jalon 2 ci-dessous, où deux bugs supplémentaires ont été trouvés
en la faisant vraiment tourner (client navigateur sans cookie de
session, hook React périmé).

---

### Jalon 2 — grandir grâce aux autres — 23/09/2026

**Ce qui a été fait** : page `/villes` listant toutes les villes sauf la
sienne (nom, pays, population), bouton "Visiter" qui donne +1 population
à la ville visitée — une fois par (visiteur, ville, jour). Le niveau
visuel de la ville évolue automatiquement en franchissant les seuils de
population (migration `0003`, fonction `population_vers_niveau()`).
Navigation ajoutée dans la barre du haut ("Ma ville" / "Villes"), absente
depuis le Jalon 1.

**Pourquoi** : cahier des charges §3 (population et connexions) et §2
(évolution visuelle) — le cœur de la boucle "attirer des joueurs pour
faire grandir sa ville".

**Décisions prises en cours de route** :

1. **Découverte des villes à visiter** : liste simple (nom, pays,
   population), triée par population décroissante — tranché par Adrien
   plutôt qu'un bouton "ville au hasard". Le vrai classement (tri par
   colonne, pagination) arrive au Jalon 6.
2. **Seuils d'évolution visuelle, provisoires** : 0 (Hameau) dès la
   naissance, puis 5/15/30/60/120 habitants pour les niveaux 1 à 5.
   Choisis pour qu'une évolution soit visible avec une poignée de
   joueurs de test, pas calibrés sur un vrai volume de joueurs — cahier
   des charges §2 : "seuils à équilibrer pendant les tests"
   (`docs/DECISIONS.md` §10 point 2, toujours ouvert). Dupliqués dans
   `src/lib/game/niveauVille.ts` (source pour les tests unitaires) et
   `population_vers_niveau()` en SQL (autorité réelle, anti-triche) —
   les deux fichiers se référencent l'un l'autre en commentaire.
3. **Anti-triche** : comme au Jalon 1, aucune policy RLS d'écriture sur
   `visites` pour le client — tout passe par `visiter_ville()` (clé
   service_role), qui refuse aussi de se visiter soi-même et applique
   l'unicité (visiteur, ville, jour) par contrainte SQL, pas par de la
   logique applicative contournable.
4. **"Jour" = jour calendaire UTC**, pas le fuseau horaire du joueur.
   Simplification délibérée pour le MVP ; à reconsidérer si des joueurs
   dans des fuseaux très éloignés trouvent la limite de minuit injuste.
5. **`activité` non touchée à ce jalon** : le Jalon 2 du `ROADMAP.md` ne
   parle que de population et de niveau visuel ; le champ `activite` de
   `cities` reste à 0 jusqu'à un jalon qui le définira précisément
   (candidat naturel : agrégation pays du Jalon 7, cahier des charges §9).

**Bug trouvé en écrivant la page** (avant même de la tester) : `/villes`
ne vérifiait pas que le visiteur avait déjà un profil (`public.users`) —
un compte fraîchement créé sans ville pouvait afficher la page et cliquer
"Visiter", provoquant une violation de clé étrangère silencieuse côté
serveur (l'action avalait l'erreur). Corrigé en ajoutant la même
redirection que `/ville` vers `/ville/creer` quand le profil n'existe
pas. Trouvé en testant manuellement avec un compte créé directement via
l'API admin Supabase (sans passer par le formulaire d'inscription) —
scénario qu'aucun test automatisé ne couvrait puisque les comptes de
test du Jalon 1 et du Jalon 2 passent tous par `creer_ville()`.

**Autre point d'attention noté en testant** : lancer deux serveurs
`npm run dev` en parallèle sur le même dossier `.next` (le serveur de
prévisualisation de Claude Code + celui que Playwright essaie de
démarrer si le premier n'est pas détecté à temps) corrompt le cache de
build et provoque des 404 sur toutes les routes. Pas un bug du projet,
mais à savoir pour les prochains jalons : toujours arrêter le serveur de
prévisualisation avant de lancer `npm run test:e2e` en ligne de commande.

**Ce qui a été testé** : `tests/unit/niveauVille.test.ts` étendu
(`niveauPourPopulation` : valeur de naissance, juste avant/juste au
seuil pour chaque niveau, plafond à Métropole, sabotage population
négative ou non entière). `tests/e2e/jalon2-grandir-grace-aux-autres.spec.ts` :
parcours réel (connexion → visite → +1 population → "déjà visitée" au
rechargement), plus deux tests de sabotage au niveau de la fonction SQL
directement : auto-visite refusée, double visite le même jour refusée
(deuxième appel : `23505`, population +1 seulement), et franchissement
réel du seuil du niveau 1 avec 4 visiteurs distincts. `npm run build`,
`npm run lint` et la suite complète (`npm test` + `npm run test:e2e`,
14 tests unitaires + 6 tests e2e) passent contre le projet Supabase réel.

**Vérification rouge par sabotage** : voir ci-dessus — auto-visite,
double visite le même jour, population négative/non entière, niveau
hors plage. Cinq cas de sabotage au total pour ce jalon.

---

### Jalon 3 — peser socialement — 23/09/2026

**Ce qui a été fait** : sur la page `/villes` (Jalon 2), un deuxième
bouton "Influencer" à côté de "Visiter" — +1 influence à une autre
ville, avec un quota affiché en haut de page ("Actions d'influence
restantes aujourd'hui : x/5"). Migration `0004` (table
`actions_influence`, fonction `influencer_ville()`).

**Pourquoi** : cahier des charges §4 — "chaque joueur dispose de 5
actions d'influence par jour. Une action permet d'influencer une autre
ville."

**Décisions prises en cours de route** :

1. **Une fois par ville et par jour, comme les visites** — tranché par
   Adrien plutôt que de permettre de concentrer les 5 actions sur une
   seule ville. Même mécanisme anti-abus que `visiter_ville()` : la
   contrainte unique `(joueur_id, ville_id, jour)` empêche de cibler
   deux fois la même ville le même jour ; le quota de 5 (compté, pas de
   contrainte SQL simple possible pour un total) est vérifié dans
   `influencer_ville()` avant l'insertion.
2. **Auto-influence refusée** : le cahier des charges dit littéralement
   "influencer *une autre* ville" — pas d'ambiguïté à signaler ici,
   contrairement à la règle "une fois par ville et par jour" (point 1)
   qui, elle, n'était pas explicite pour l'influence.
3. **Limite connue et acceptée sur le quota** : la vérification
   (compter les actions du jour, puis insérer) n'est pas verrouillée
   entre les deux étapes — un même joueur cliquant vraiment
   simultanément (deux onglets, script) pourrait dépasser 5 de
   quelques unités. Risque jugé négligeable pour un clic humain normal ;
   documenté dans la migration `0004` elle-même, à revoir si ça devient
   un vecteur de triche observé en pratique.
4. **Colonne "Influence" ajoutée au tableau `/villes`** (population
   déjà affichée depuis le Jalon 2) : cohérent avec l'affichage
   existant, aide à décider qui influencer.

**Ce qui a été testé** : `tests/e2e/jalon3-peser-socialement.spec.ts` —
parcours réel (connexion → influencer → +1 influence → compteur de
quota qui descend → "déjà influencée" qui tient au rechargement), plus
sabotage au niveau de la fonction SQL directement : auto-influence
refusée, et quota de 5 réellement bloquant à la 6e ville différente
(vérifié avec 6 cibles distinctes, pas juste 6 appels sur la même,
puisque la règle est justement "une fois par ville"). `npm run build`,
`npm run lint` et la suite complète (`npm test` + `npm run test:e2e`,
14 tests unitaires + 8 tests e2e) passent contre le projet Supabase réel.

**Vérification rouge par sabotage** : auto-influence, 6e action du jour
sur une 6e ville distincte (quota). Deux cas de sabotage pour ce jalon,
en plus des cinq déjà couverts par les jalons précédents et toujours
protégés (aucun test supprimé).

---

### Jalon 4 — rivalités de quartier — 23/09/2026

**Ce qui a été fait** : trois actions AntiVille (grève, contamination,
propagande) sur la page `/villes`, avec quota quotidien (3/jour, tous
types et cibles confondus) et protection anti-harcèlement dégressive
par paire (attaquant, cible) sur une fenêtre glissante de 24h — 1re
attaque = effet plein, 2e = effet réduit de moitié, 3e et suivantes =
bloquées. Migrations `0005` et `0006` (correctif, voir plus bas).

**Pourquoi** : cahier des charges §5 — créer des rivalités entre villes
sans guerre militaire à l'intérieur d'un pays, avec la protection
progressive explicitement exigée pour qu'une ville ne puisse pas être
bloquée en permanence par un seul joueur.

**Adrien a explicitement délégué les paramètres d'équilibrage** à
Claude Code ("tranche selon tes reco" — `GUIDE-METHODE.md` §3), après
avoir écarté deux autres options (donner les chiffres lui-même,
réduire la portée à une seule action). Raisonnement complet des choix
tranchés à sa place, pour qu'il puisse les contester d'un mot :

1. **Quota AntiVille : 3 actions/jour**, plus bas que le quota
   d'influence (5/jour, Jalon 3). Choix délibéré : les actions
   AntiVille sont négatives pour la cible, un quota plus bas limite la
   toxicité potentielle du jeu sans l'empêcher.
2. **Protection dégressive par paire (attaquant, cible), tous types
   d'action confondus**, sur une fenêtre glissante de 24h (pas un jour
   calendaire UTC comme les autres quotas — une vraie "récupération"
   progressive, cohérente avec le mot du cahier des charges). Le cahier
   des charges mentionne aussi une protection liée à "la fréquence des
   attaques reçues" en général, tous attaquants confondus : **non
   implémentée à ce jalon**, simplification assumée et documentée dans
   la migration `0005` — seule la version "même attaquant" (l'exemple
   de principe donné par le cahier des charges) est couverte. Point
   ouvert pour un jalon futur si une ville se retrouve harcelée par
   plusieurs joueurs coordonnés.
3. **Contamination : perte proportionnelle (10% de la population,
   minimum 1 au plein effet)**, population jamais sous 1 — respecte la
   contrainte fondatrice §1 point 4 ("jamais de destruction permanente
   d'une ville"). À effet réduit (protection), la perte peut arrondir à
   0 pour une petite ville : assumé, ça revient à une immunité de fait
   une fois la ville déjà protégée.
4. **Propagande : -2 influence au plein effet**, jamais sous 0.
5. **Grève : bloque la réception d'influence pendant 24h au plein
   effet (12h à effet réduit)**, pas de blocage de la production
   (l'influence ne se "produit" pas passivement dans le jeu actuel,
   elle vient uniquement des actions "Influencer" des autres joueurs —
   bloquer la réception couvre donc tout le mécanisme existant).
   Implémenté comme un état temporaire (`cities.greve_jusqua`), pas un
   malus instantané comme les deux autres actions — `influencer_ville()`
   (Jalon 3) a dû être redéfinie pour vérifier cet état.
6. **Retour visible du résultat de chaque action** (réussie / effet
   réduit / bloquée par la protection / quota atteint), contrairement à
   `visiterVille`/`influencerVille` qui absorbent silencieusement leurs
   cas "normaux" : se faire bloquer par la protection anti-harcèlement
   est un événement que le joueur doit comprendre, pas une erreur à
   cacher.

**Bug trouvé en vérifiant contre le projet réel** : un `RAISE EXCEPTION`
sans `using errcode` prend par défaut le code `P0001` en PL/pgSQL —
exactement le code choisi à la main pour "quota atteint". Une ville
introuvable, une auto-attaque ou un type d'action invalide étaient donc
tous rapportés côté client comme "quota atteint" au lieu d'une vraie
erreur, puisque `src/app/villes/actions.ts` ne distingue que sur
`error.code`. Trouvé en testant `lancer_action_antiville()` avec un id
de ville bidon via `curl` directement contre le projet réel (pas par un
test automatisé — aucun des tests ne vérifiait le code exact de
l'erreur d'auto-attaque, seulement qu'une erreur existait). Corrigé par
la migration `0006`, qui donne un code dédié à chaque cas (`P0004`
ville introuvable, `P0005` auto-cible, `P0006` type invalide, `P0007`
non autorisé) et documente le registre complet des codes utilisés.
Les tests des Jalons 3 et 4 ont été renforcés pour vérifier le code
exact de l'erreur d'auto-cible, afin que cette régression précise ne
puisse plus repasser inaperçue.

**Autre point d'attention noté en testant** : un test Playwright qui
expire (timeout) peut sauter l'exécution de son bloc `finally`, donc ne
pas nettoyer les comptes de test qu'il avait créés — c'est arrivé
pendant la vérification de ce jalon (deux comptes `*-antiville-*`
laissés dans le projet Supabase réel avant que la migration `0005` n'y
soit appliquée, nettoyés à la main). À garder en tête pour les jalons
suivants : après un run e2e qui a timeout, vérifier
`auth.users` avant de relancer.

**Ce qui a été testé** :
`tests/e2e/jalon4-rivalites-de-quartier.spec.ts` — propagande réelle
via l'UI (influence réduite, visible dans le tableau), grève qui bloque
bien une tentative d'influence d'un tiers, contamination qui ne fait
jamais tomber une ville à 0 habitant, la courbe complète de protection
(1re attaque pleine, 2e réduite, 3e bloquée avec le code `P0003`), et
le quota de 3 réellement bloquant à la 4e cible avec le code `P0001`.
Tests des Jalons 3 et 4 renforcés sur le code exact de l'erreur
d'auto-cible (voir bug ci-dessus). `npm run build`, `npm run lint` et
la suite complète (`npm test` + `npm run test:e2e`, 14 tests unitaires
+ 13 tests e2e) passent contre le projet Supabase réel, migrations
`0005` et `0006` appliquées.

**Vérification rouge par sabotage** : contamination sur une ville à
population 1 (ne doit jamais atteindre 0), auto-attaque, protection
anti-harcèlement à la 3e attaque, quota à la 4e action. Quatre cas de
sabotage pour ce jalon, en plus des sept déjà couverts par les jalons
précédents et toujours protégés (aucun test supprimé).

---

### Jalon 5 — villes jumelles — 23/09/2026

**Ce qui a été fait** : proposer un jumelage à une autre ville depuis
`/villes`, l'accepter ou le refuser depuis une nouvelle page
`/jumelages` (qui liste aussi les jumelages actifs et les demandes
envoyées, avec un bouton "Annuler" pour y mettre fin), bonus quotidien
de +1 population aux deux villes quand les deux joueurs ont été actifs
le même jour. Migration `0007` (tables `jumelages` et `jumelage_bonus`,
fonctions `proposer_jumelage()`, `repondre_jumelage()`,
`annuler_jumelage()`, `reclamer_bonus_jumelages()`).

**Pourquoi** : cahier des charges §6 — créer de vraies relations entre
joueurs, "sans transformer le système en gestion complexe."

**Le nombre de jumelages actifs était un point ouvert explicite**
(`DECISIONS.md` §10 point 3, qui prévoyait déjà la délégation) —
tranché par Claude Code dans le même esprit que le Jalon 4 :

1. **3 jumelages actifs maximum par ville**, revérifié à la fois côté
   proposant (à la proposition) et côté cible (à l'acceptation, au cas
   où sa situation aurait changé entre-temps). Même ordre de grandeur
   que le quota AntiVille, pour rester cohérent et éviter la "gestion
   complexe" que le cahier des charges veut éviter.
2. **Une seule relation en_attente/actif à la fois entre deux villes
   données**, dans un sens ou l'autre — appliqué par un index unique
   partiel sur `(least(ville_a, ville_b), greatest(ville_a, ville_b))`,
   donc garanti même en cas de double clic ou de requêtes concurrentes
   (pas seulement vérifié côté application).
3. **Bonus : +1 population aux deux villes**, même ordre de grandeur
   qu'une visite (Jalon 2) — "petit bonus quotidien" au sens littéral du
   cahier des charges.
4. **Définition de "joueur actif"** : au moins une visite, une action
   d'influence ou une action AntiVille lancée ce jour-là (UTC) — pas de
   notion de connexion/login séparée, qui n'existe pas encore dans le
   jeu. Simplification assumée et documentée dans la migration `0007`.
5. **Bonus accordé au chargement de `/ville` ou `/jumelages`**, pas par
   une tâche planifiée : le projet n'a aucune infrastructure de tâches
   en arrière-plan à ce stade (cohérent avec la contrainte "zéro coût,
   zéro infrastructure" — `DECISIONS.md` §1 point 1), et le cahier des
   charges n'exige pas un versement à une heure précise. La fonction
   SQL est idempotente (une ligne dans `jumelage_bonus` par jumelage et
   par jour) : le rappeler plusieurs fois le même jour ne redonne rien.
   Concession assumée : le bonus peut mettre du temps à apparaître si
   aucun des deux joueurs ne recharge une de ces deux pages après que
   les deux ont été actifs.

**Bug trouvé en écrivant les tests** (pas en vérifiant contre le projet
réel cette fois — trouvé avant même d'appliquer la migration) : dans
`proposer_jumelage()`, le quota (3 jumelages actifs) est vérifié avant
la tentative d'insertion, donc une proposition vers une ville déjà
jumelée alors que le quota est déjà plein renvoie "quota atteint"
(`P0008`) plutôt que "déjà jumelée" (`23505`) — les deux sont vraies
en même temps, mais un seul code peut être renvoyé. Pas corrigé (les
deux comportements sont défendables), mais le test de sabotage a été
réorganisé pour vérifier chaque cas séparément, sans les mélanger.

**Ce qui a été testé** : `tests/e2e/jalon5-villes-jumelles.spec.ts` —
parcours réel (proposer → accepter → bonus accordé, visible sur
`/jumelages` et reflété dans la population des deux villes → rappel du
bonus le même jour sans effet, idempotence vérifiée), et sabotage :
auto-jumelage refusé (`P0005`), double proposition vers une ville déjà
jumelée refusée (`23505`), quota de 3 jumelages actifs réellement
bloquant à la 4e ville (`P0008`). Vérifié aussi visuellement dans le
navigateur (proposer, recevoir, accepter). `npm run build`, `npm run
lint` et la suite complète (`npm test` + `npm run test:e2e`, 14 tests
unitaires + 15 tests e2e) passent contre le projet Supabase réel,
migration `0007` appliquée.

**Point d'attention noté en testant, qui s'aggrave avec le nombre de
jalons** : la flakiness du serveur de dev sous compilation à froid
(déjà notée au Jalon 2) devient plus visible à mesure que le nombre de
routes grandit (10 routes à ce jalon) — une suite e2e lancée juste
après `rm -rf .next` peut voir plusieurs tests échouer en parallèle la
première fois, simplement parce que Next.js compile chaque route à la
demande. Un deuxième passage (routes déjà compilées) suffit à confirmer
si c'est bien ça ou un vrai bug. Pas un problème pour la production
(le build de prod précompile tout), seulement pour les runs e2e locaux
répétés dans une même session de vérification.

**Vérification rouge par sabotage** : auto-jumelage, double proposition
vers une ville déjà liée, quota de 3 jumelages actifs. Trois cas de
sabotage pour ce jalon, en plus des onze déjà couverts par les jalons
précédents et toujours protégés (aucun test supprimé).

---

### Jalon 6 (couche données) — préparation du rendu 3D — 23/09/2026

**Ce qui a été fait** : ce jalon prépare les données pour le rendu 3D
temps réel décidé avec Adrien hors de cette session (§8) — le portage
du rendu lui-même vers Three.js est un jalon séparé ("Jalon 6bis"), vu
sa taille (§8 : prototype de ~2000 lignes de géométrie procédurale
WebGL bas niveau). Migration `0008` :
- Latitude/longitude/fuseau horaire (IANA) sur `countries`, pour 247
  pays sur 250 (générés via les paquets `world-countries` et
  `moment-timezone`, pas de dépendance à l'exécution).
- `population_max` sur `cities` : le record de population jamais
  atteint. `visiter_ville()`, `lancer_action_antiville()` et
  `reclamer_bonus_jumelages()` redéfinies pour le maintenir et calculer
  `niveau` à partir de lui, jamais de la population instantanée — une
  contamination fait baisser le chiffre affiché sans jamais faire
  régresser le niveau visuel.
- Nouveaux seuils de niveau : Métropole = 100 000 habitants (Village
  1 000, Bourg 5 000, Ville 15 000, Grande ville 40 000), en
  remplacement des seuils provisoires 5/15/30/60/120 du Jalon 2.
- `is_test` sur `users`/`cities` (avec contrainte : pseudo préfixé
  `test_` obligatoire si `is_test`), script
  `scripts/charger-villes-test.mjs` (idempotent — supprime puis
  recharge) qui a chargé les 24 villes et 8 jumelages de
  `supabase/seed/villes-de-test.json`, et un test opt-in
  (`VERIFIER_PROD=true`) qui vérifiera l'absence de données `is_test`
  une fois qu'un vrai environnement de production existera.

**Pourquoi** : cahier des charges §2 (évolution visuelle) et travail de
direction artistique mené par Adrien avec Claude chat/web (§8) — les
essais d'images 2D générées ont été jugés insuffisants, d'où le choix
d'une vraie 3D temps réel dans le navigateur.

**Décisions prises en cours de route** :

1. **Découpage du jalon en deux, proposé par Claude Code et accepté par
   Adrien** : porter fidèlement ~2000 lignes de géométrie procédurale
   vers Three.js est un chantier à part entière. Ce jalon ne livre que
   la couche données (testable et utile seule) ; le rendu proprement
   dit attend une session dédiée.
2. **Moteur 3D : Three.js**, tranché par Adrien (reco initiale de
   Claude chat) plutôt que garder le WebGL fait main du prototype —
   plus simple à faire évoluer, licence MIT, pas de coût. S'applique au
   jalon du rendu, pas à celui-ci.
3. **Rendu (et niveau) basés sur `population_max`, pas la population du
   moment** — Adrien n'avait pas de préférence tranchée et a laissé la
   reco initiale de Claude chat s'appliquer (§10 point 11, maintenant
   clos). Implémenté dès ce jalon pour `niveau`, avant même que le rendu
   3D existe, parce que la mécanique (contamination qui ne régresse
   jamais le niveau) est indépendante du rendu et se teste seule.
4. **Fuseau horaire "de la capitale" choisi à la main pour les pays
   multi-fuseaux les plus courants** (US, CA, RU, AU, BR, MX, MN, CL,
   PT, PF, ES) : `moment-timezone` renvoie sinon le premier fuseau par
   ordre alphabétique, pas forcément celui de la capitale (ex. sans
   cette liste, le Canada aurait hérité de `America/Atikokan`). Les
   pays multi-fuseaux non couverts par cette liste gardent le
   comportement par défaut (premier fuseau alphabétique) — simplification
   assumée, à corriger au cas par cas si un pays précis pose problème.
5. **Script de villes de test écrit en JavaScript simple (`.mjs`),
   exécuté par cette session** (contrairement aux migrations SQL, qui
   nécessitent le tableau de bord Supabase) : utilise directement
   `@supabase/supabase-js` avec la clé `service_role`, sans passer par
   les fonctions RPC du jeu (`creer_ville()` ne permet pas de fixer une
   population/influence arbitraire) — écriture directe dans `users` et
   `cities`, légitime ici puisque c'est un script d'administration, pas
   une action de joueur.
6. **`seed.jumelages` chargé dans la vraie table `jumelages`** (le
   Jalon 5 existe déjà) ; `seed.presidents_attendus` ignoré pour
   l'instant — le concept de président n'est pas encore implémenté
   (Jalon 10 du `ROADMAP.md` actuel), le champ attend ce jalon-là.
7. **`activite_7j` du JSON stocké tel quel dans `cities.activite`** —
   ce champ n'a pas encore de définition précise dans le jeu réel (voir
   Jalon 2 : "candidat naturel, agrégation pays du Jalon 8" avec la
   numérotation actuelle) ; import fait par avance pour que les villes
   de test soient déjà prêtes quand ce jalon arrivera.
8. **Le script "simuler N jours"** mentionné dans
   `GUIDE-METHODE.md` (section "Les villes de test") **n'existe pas
   encore** — décalage entre la description du guide (écrite avec
   Claude chat, en amont du travail réel) et ce qui a été implémenté
   jalon après jalon. Noté ici pour ne pas laisser le guide mentir sans
   le signaler ; pas dans la portée de ce jalon.

**Ce qui a été testé** : `tests/e2e/jalon6-donnees-rendu-3d.spec.ts` —
`population_vers_niveau()` sur les 11 points limites des nouveaux
seuils, une contamination qui ne fait régresser ni `population_max` ni
`niveau` sur une ville poussée à 5 200 habitants, géo/fuseau présents
pour les 6 pays du scénario de test, et la contrainte `is_test` +
pseudo `test_` réellement appliquée par la base. Le test de
`niveauVille.test.ts` du Jalon 2 qui vérifiait un franchissement de
seuil avec de vrais visiteurs a été adapté : avec Métropole à 100 000,
atteindre un seuil avec des comptes de test un par un n'est plus
praticable, remplacé par une vérification directe de la fonction SQL
(bien plus rapide, et c'est elle l'autorité réelle). Chargement réel
des 24 villes de test vérifié (niveaux corrects, jumelages avec le bon
statut, affichage correct sur `/villes` dans le navigateur). `npm run
build`, `npm run lint` et la suite complète (`npm test` + `npm run
test:e2e`, 14 tests unitaires + 2 ignorés + 19 tests e2e) passent
contre le projet Supabase réel, migration `0008` appliquée.

**Vérification rouge par sabotage** : les 11 seuils de
`population_vers_niveau()`, contamination sans régression de
`population_max`/`niveau`, contrainte `is_test`/pseudo. Quatorze cas de
sabotage au total depuis le début du projet, tous toujours protégés
(aucun test supprimé).

---

### Jalon 6bis — le rendu 3D — 23/09/2026

**Ce qui a été fait** : la page `/ville` affiche désormais la ville en
3D temps réel, portée du prototype `docs/prototypes/prototype-ville-3d.html`
(~2000 lignes de géométrie procédurale WebGL bas niveau) vers **Three.js**
(décision d'Adrien, `DECISIONS.md` §10 point 12), branchée sur les
vraies données : identité stable de la ville (l'id sert de graine —
toujours la même ville, jamais recalculée au hasard), `population_max`
(maisons → immeubles → tours, jamais de régression visuelle après une
contamination — voir Jalon 6), soleil à l'heure réelle du pays de la
ville (latitude/longitude/fuseau déjà en base depuis le Jalon 6).
Nouveaux modules `src/lib/ville3d/` (géométrie, bâtiments, terrain,
occlusion ambiante, shaders, scène Three.js) et
`src/lib/game/soleilVille.ts` (position du soleil, pur et testable,
dans le même esprit que `niveauVille.ts`). Composant `VilleScene`
(client) monté dans `/ville`.

**Pourquoi** : direction artistique décidée par Adrien avec Claude
chat/web (`DECISIONS.md` §8) — les essais d'images 2D générées ont été
jugés insuffisants ("pas assez réaliste"), d'où le choix d'une vraie 3D
temps réel dans le navigateur, dans l'esprit de l'ancien MiniVille
(Motion Twin).

**Portage, pas réécriture** : la quasi-totalité de la logique de
génération du prototype (grille de rues, maisons, immeubles, gratte-ciel
avec grue de chantier, cours communes, parkings, campagne alentour,
occlusion ambiante précalculée) et le shader de matériaux procéduraux
(fenêtres éclairées la nuit, tuiles, vitrages réfléchissants, chaussée
marquée, ciel avec disque solaire, brouillard, tonemapping ACES) sont
repris **tels quels**, juste traduits en TypeScript et branchés sur
Three.js plutôt que sur des appels WebGL bruts. Aucune règle de
génération n'a été réinventée : c'est un vrai portage, vérifié
fonctionnellement identique par un test de non-régression
(`tests/unit/ville3dGenerer.test.ts`, déterminisme comparé
sommet par sommet).

**Adaptations assumées par rapport au prototype** (voir aussi les
commentaires dans `src/lib/ville3d/shaders.ts` et `scene.ts`) :

1. **Ombres : `sampler2D` + comparaison manuelle plutôt que
   `sampler2DShadow` + comparaison matérielle.** Le prototype utilisait
   le mode de comparaison natif de WebGL2 pour un PCF matériel ; Three.js
   n'expose pas simplement ce mode via `WebGLRenderTarget`/`DepthTexture`.
   Même algorithme (12 échantillons Poisson), juste la comparaison
   profondeur faite à la main dans le shader plutôt que par le matériel.
   Résultat visuel équivalent, vérifié à l'œil dans le navigateur.
2. **Caméra et interactions (glisser/zoomer/déplacer) réimplémentées
   avec les primitives Three.js** (`OrthographicCamera`,
   `camera.lookAt()`) plutôt que la matrice `lookAt`/`ortho` manuelle du
   prototype — Three.js fait ce travail nativement, c'est tout l'intérêt
   du choix de bibliothèque. Le comportement (azimut/élévation autour
   d'une cible, cadrage automatique selon l'étendue de la ville,
   pincement tactile) est identique.
3. **Pas de vue "autre ville en 3D" depuis `/villes`** : ce jalon couvre
   ce que `ROADMAP.md` demandait explicitement ("la page de ville
   affiche la ville en 3D") — voir sa propre ville, pas celle des
   autres. Ajouter un aperçu 3D des autres villes est un possible
   raffinement futur, pas oublié, juste hors de portée ici.
4. **Repli France (46,6 / 2,35 / Europe/Paris) si le pays de la ville
   n'a pas de géo renseignée** — 3 pays sur 250 seulement (Jalon 6),
   défendable pour ne pas bloquer le rendu sur une donnée manquante rare.

**Bug trouvé en testant, pas dans le rendu lui-même** : sous forte
concurrence (8 workers Playwright simultanés), plusieurs tests
échouaient de façon reproductible en restant bloqués sur `/connexion`
— pas un problème de connexion, mais `/ville` (désormais ~150 Ko de
JS rien que pour cette route, tout Three.js compris) qui met trop
longtemps à compiler à la demande quand plusieurs requêtes la
sollicitent en même temps pour la première fois. Limiter à 2 workers
(au lieu de la valeur par défaut, ici 7-8) résout le problème une fois
la route déjà compilée une fois — corrigé à la racine plutôt que
documenté comme rappel : `playwright.config.ts` fixe maintenant
`workers: 2`, en plus du réflexe déjà connu (arrêter le serveur de
prévisualisation avant de lancer les tests, `rm -rf .next` en cas de
doute).

**Ce qui a été testé** : `tests/unit/ville3dAleatoire.test.ts` (le
hasard déterministe qui garantit l'identité stable des villes),
`tests/unit/soleilVille.test.ts` (position du soleil : élévation nette
à midi solaire vs minuit, azimut est le matin/ouest le soir, bornes
exactes des catégories jour/nuit), `tests/unit/ville3dGenerer.test.ts`
(déterminisme sommet par sommet, triangles toujours valides, plus de
population donne plus de blocs actifs et de sommets, pas d'exception
aux bornes population=0 et très grande population, un gratte-ciel
n'apparaît qu'au-delà du seuil du niveau Ville). `tests/e2e/jalon6bis-rendu-3d.spec.ts` :
la page `/ville` réelle affiche un canvas qui peint vraiment des pixels
(pas une image transparente vide) et ne produit aucune erreur console.
Vérifié aussi à l'œil dans le navigateur : arbres, maison avec fenêtres
éclairées la nuit (l'heure réelle à Paris au moment du test était
21h49, donc nuit — confirmé cohérent avec le calcul de position du
soleil), glisser pour tourner la caméra. `npm run build`, `npm run
lint` et la suite complète (`npm test` + `npm run test:e2e`,
17 tests unitaires + 2 ignorés + 20 tests e2e) passent contre le projet
Supabase réel.

**Vérification rouge par sabotage** : aucun cas de sabotage spécifique
à ce jalon — le rendu 3D n'affecte ni score, ni ressources, ni
anti-triche (il ne fait qu'afficher `population_max`, déjà protégée par
les sabotages du Jalon 6). Le test de non-régression du portage
(comparaison sommet par sommet entre deux générations) joue un rôle
équivalent pour ce jalon : toute dérive accidentelle du portage casserait
ce test plutôt qu'une règle de jeu.

---

*(Les jalons suivants migrent ici au fur et à mesure, depuis
`ROADMAP.md`, avec : ce qui a été fait, pourquoi, ce qui a été testé, le
compte de vérification par sabotage, et les bugs trouvés en route.)*

---

### Corrections post-Jalon 6bis — 23/09/2026

Trouvées en testant le rendu 3D sur le téléphone d'Adrien (`teste sur
mon téléphone`), corrigées dans la foulée (pas de nouveau jalon, juste
des bugs sur du code déjà livré) :

1. **Barre de nav débordait sur mobile.** `tailwind.config.ts` ne
   scannait que `src/app/**` et `src/lib/**` — `src/components/**` en
   était absent depuis le début du projet. Résultat : toute classe
   Tailwind utilisée *seulement* dans un composant de `src/components/`
   (ici `flex-wrap`/`whitespace-nowrap` ajoutés à `Nav.tsx`) n'était
   jamais générée dans le CSS final, silencieusement (pas d'erreur, la
   classe est juste absente du bundle). Corrigé en ajoutant
   `./src/components/**/*.{js,ts,jsx,tsx,mdx}` aux `content` globs. Bug
   latent qui aurait pu ressurgir sur n'importe quel futur composant, pas
   spécifique à ce jalon.
2. **Ciel/fond délavé en gris-bleu au lieu du bleu nuit (ou du vert
   prairie de jour).** Le shader (`shaders.ts`) fait tout le pipeline
   colorimétrique à la main (linéarisation, ACES, gamma 1/2.2) — c'est
   volontaire, à l'identique du prototype WebGL2 porté. Mais la couleur
   d'effacement (`renderer.setClearColor`, le ciel/brouillard) passe par
   `new THREE.Color(...)`, et Three.js applique automatiquement *sa
   propre* gestion des couleurs dessus (elle suppose une couleur linéaire
   et la ré-encode en sRGB) sans savoir qu'elle était déjà encodée par le
   shader — double encodage gamma, qui éclaircit et désature
   spécifiquement le fond (environ 94 % de l'image à l'écran vu le
   cadrage large observé). Les objets réels (arbres, bâtiments), dessinés
   par le shader lui-même, n'étaient pas affectés — d'où des arbres verts
   normaux sur un fond gris-bleu délavé. Diagnostiqué en calculant à la
   main la couleur attendue (`docs/DECISIONS.md`, position du soleil via
   `soleilVille.ts`) puis en la comparant aux pixels réellement affichés
   (lecture directe du canvas). Corrigé par une ligne dans `scene.ts` :
   `renderer.outputColorSpace = THREE.LinearSRGBColorSpace` (égale à
   l'espace de travail interne de Three.js, donc aucune conversion n'est
   appliquée — le shader garde la main sur 100 % du pipeline couleur,
   comme prévu).

   **Rectificatif du 24/09/2026** : ce double encodage était réel et la
   correction reste valable (la couleur du ciel est maintenant exacte),
   mais ce n'était **pas** la cause de "l'herbe est grise". Les ~94 % de
   "fond" mesurés ici étaient justement le signe que le sol n'était pas
   dessiné du tout — mal interprété sur le moment. Vraie cause et
   correction : voir le journal du Jalon 7, "Correction post-recette :
   le sol n'était pas dessiné".

**Vérification** : suite unitaire complète (33 tests) et `tsc --noEmit`
repassés après les deux corrections, tous verts. Pas de vérification par
sabotage — bugs purement visuels, aucun impact sur score/anti-triche.

Point encore ouvert trouvé pendant ce même test : `DECISIONS.md` §10
point 14 (halo de lampadaire qui semblerait traverser les bâtiments).

---

### Jalon 7 — Un jeu agréable à regarder — 24/09/2026

**Contexte et réordonnancement.** L'ancien Jalon 7 "Se classer" est devenu
le Jalon 8 : une note de passage de relais (`docs/A-INTEGRER.md`, déposée
par une session Claude chat/Cowork le 23/09/2026 au soir, avec une
maquette cliquable `docs/prototypes/maquette-ecrans.html`) proposait de
faire d'abord la refonte visuelle de toutes les pages. Adrien a tranché
pour cet ordre le 23/09/2026 (§10 point 15).

**Ce qui a été fait** : toutes les pages du jeu reskinnées selon la
maquette validée — accueil, connexion, inscription, création de ville
(avec aperçu 3D en direct du nom tapé), Ma ville, Villes, Jumelages,
navigation. Nouveau système visuel porté depuis la maquette dans
`src/app/globals.css` (jetons de couleur clair/sombre via
`prefers-color-scheme`, panneaux vitrés flous, panneau d'entrée
d'agglomération pour les noms de ville, typographie Barlow/Barlow
Condensed via `next/font/google`). La scène 3D du Jalon 6bis est
maintenant **unique et persistante** dans `src/app/layout.tsx`
(`src/components/SceneVilleFond.tsx`, un contexte React) plutôt que
recréée à chaque page : les pages serveur annoncent juste "voici la ville
à afficher" via `src/components/SincroniserScene.tsx`, ce qui évite de
reconstruire le contexte WebGL à chaque navigation et permet à la caméra
de rester stable. La page Villes devient une liste classée + panneau de
détail (visite/influence/AntiVille/jumelage inchangés en logique, juste
reskinnés), avec bascule liste/détail en un seul panneau sur mobile.

**Classement minimal inclus** (nécessaire à l'affichage, pas le Jalon 8
complet) : tri de la liste par population, badge de rang ("3ᵉ de
France"/"3rd in France" — `src/lib/game/ordinal.ts`) et badge "Président"
(n°1 de son pays), tous deux calculés à la volée sur `population`
courante, pas `population_max`. Le Jalon 8 pourra ajouter un mondial et
une page dédiée par-dessus cette base.

**Explicitement exclu de ce jalon** (voir §10 points 16 et 17) :
- Le système de développement des villes (7 activités, jauges, maire,
  mégaprojets, "Simuler 30 jours") présent dans la maquette mais non
  validé par Adrien — la maquette reste une proposition de design, pas
  une spécification à coder telle quelle.
- Le "Bulletin municipal" (journal quotidien des événements de la ville)
  et le lien de partage personnalisé ("Fais grandir ta ville") : tous
  deux demanderaient un nouveau modèle de données (une table
  d'événements, un mécanisme d'invitation anonyme) qui n'existe pas —
  plutôt qu'une fausse façade, ces deux "clins d'œil" sont reportés à un
  jalon qui les spécifie vraiment.
- La ville qui grandit sans limite (`docs/A-INTEGRER.md` §2) : reportée
  au Jalon 7bis (scission volontaire, même logique que 6/6bis — c'est un
  changement du générateur 3D indépendant de la refonte visuelle).

**Bug trouvé en cours de route (pas dans le nouveau code, latent depuis
le Jalon 1)** : `owner:users(pseudo)` dans la requête de la page Villes
échouait silencieusement (`data: null`, donc "Aucune ville ne
correspond." pour tout le monde) — `cities` a deux relations de clé
étrangère vers `users` (`owner_id` et `city_id` en sens inverse),
PostgREST refuse d'embarquer sans préciser laquelle. Corrigé avec
`owner:users!cities_owner_id_fkey(pseudo)`, et une erreur de requête sur
cette page journalise désormais côté serveur au lieu d'échouer
silencieusement.

**Tests.** Unitaires nouveaux, purs et déterministes :
`tests/unit/ordinal.test.ts` (suffixes fr/en, y compris l'exception
11/12/13 "th" en anglais), `tests/unit/ligneLocale.test.ts` (jour/nuit/
lever/coucher selon l'heure et la position réelle du soleil, cf. Jalon
6bis), et l'ajout de `progressionNiveau()` dans
`tests/unit/niveauVille.test.ts` (pourcentage vers le seuil suivant,
jamais à 0 % pile au seuil, 100 % au niveau maximal). E2e : les parcours
UI des Jalons 2 à 5 ont dû être adaptés (la page Villes n'est plus un
`<table>` mais une liste + panneau de détail — cliquer une ville ouvre le
détail où vivent maintenant les boutons d'action, avant de rester "à
demeure" sur chaque ligne). Comportement vérifié inchangé : mêmes RPC
appelées, mêmes quotas, mêmes messages ; seuls les sélecteurs de test ont
changé. Suite complète (`npm test` + `npm run test:e2e`, 47 tests
unitaires + 20 tests e2e) verte, deux fois de suite. Vérifié aussi à
l'œil dans le navigateur, poste et mobile : accueil, connexion,
inscription, création avec aperçu 3D en direct, Ma ville, Villes (liste,
sélection, actions réelles testées avec des comptes jetables), Jumelages.

**Vérification rouge par sabotage** : aucune, ce jalon ne touche à
aucune règle de jeu sensible (score/ressources/anti-triche) — seule la
présentation change ; les fonctions SQL et actions serveur qui portent la
vraie logique sont inchangées. Le classement (rang/président) est un
calcul d'affichage pur (compte de lignes), sans écriture, donc pas de
surface à saboter.

**Correction post-recette (24/09/2026)** : Adrien a testé et signalé
qu'il ne pouvait plus tourner/zoomer/déplacer la caméra sur aucune page.
Cause : `.screen` (le conteneur de page, transparent, posé par-dessus le
canvas 3D plein écran) capturait tous les clics/molette de tout l'écran
avant qu'ils n'atteignent le canvas en dessous — la maquette avait
`pointer-events: none` sur cet élément (et `auto` seulement sur les
panneaux vitrés), règle perdue au moment du portage. Corrigé dans
`globals.css`. Reproduit et vérifié avec un compte jetable amené
artificiellement à l'échelle Métropole (~97 000 habitants, non testée
avant ce signalement — les jalons précédents n'avaient vérifié le rendu
qu'à l'échelle Hameau) : rotation/zoom fonctionnent de nouveau.

**Correction post-recette : le sol n'était pas dessiné (24/09/2026) —
la vraie cause de "l'herbe est grise" et des "bâtiments pas finis".**
Le prototype WebGL2 désactive le culling (`gl.disable(gl.CULL_FACE)`),
et les quads horizontaux produits par `geometrie.ts` (prairie, routes,
trottoirs, parcelles, toits plats) sont enroulés face vers le bas. Le
port Three.js gardait le culling par défaut de Three.js (`FrontSide`) :
tous ces quads étaient éliminés avant d'être dessinés. On voyait donc la
couleur de fond à la place du sol ("l'herbe est grise", "les routes sont
grises") et les tours n'avaient plus de toit — seuls les contours des
hélipads flottaient au-dessus ("les bâtiments ne sont pas finis", "pas
3D comme la maquette"). Bug présent depuis le Jalon 6bis. **Trouvé et
corrigé par Adrien** : `side: THREE.DoubleSide` sur le matériau principal
et sur celui de la passe d'ombres (`scene.ts`), soit le même rendu que
le prototype.

Ce que ma propre investigation avait conclu à tort : j'avais comparé
avec la maquette ouverte dans le navigateur, vérifié la palette, les
uniformes d'éclairage et le calcul ACES/gamma pixel par pixel, et conclu
"pas de bug, c'est la direction artistique" — alors que la mesure clé
était sous mes yeux : ~92 % des pixels d'un hameau exactement à la
couleur de fond, c'est-à-dire rien de dessiné, pas un sol délavé. J'avais
formulé l'hypothèse "géométrie absente" puis l'avais écartée en lisant
que la prairie couvre ±1 800 m, sans penser au culling. Les quelques
milliers de pixels de chaussée "corrects" trouvés venaient de surfaces
non éliminées (faces latérales, trottoirs en boîtes). Leçon : quand la
couleur mesurée est *exactement* celle du fond, chercher d'abord pourquoi
la géométrie n'est pas dessinée (culling, profondeur, clipping) avant de
remettre en cause l'éclairage. Les explications précédentes de ce
journal (brouillard à l'échelle Métropole, ciel sans dégradé, densité
urbaine) sont donc à ignorer pour ce symptôme.

**Test de non-régression** (`tests/e2e/jalon6bis-rendu-3d.spec.ts`, "le
sol est bien dessiné") : heure figée à midi en France
(`page.clock.setFixedTime`, pour que l'herbe soit franchement verte quel
que soit le moment où la suite tourne), hameau fraîchement créé, puis
part des pixels nettement verts dans le carré central 40 % × 40 % du
canvas. Mesuré : ~58 % avec le sol dessiné, ~9 % (les arbres seuls) sans
— seuil fixé à 25 %. **Vérification rouge par sabotage** : `side` remis à
`FrontSide` sur le matériau principal → le test échoue (8,6 % mesuré),
puis passe de nouveau une fois `DoubleSide` rétabli.

**Deuxième correction post-recette, contrainte "application légère"
(§1 point 6, ajoutée le même jour).** En relisant `docs/A-INTEGRER.md`
après la première correction, découverte que ce jalon enfreignait la
contrainte de poids qui venait d'y être ajoutée : la scène 3D
(Three.js) était importée directement dans `src/app/layout.tsx`,
donc chargée dans le paquet initial de **toutes** les pages — mesuré
avec `next build` (le seul qui compte, `.next/` après `npm run dev` ne
veut rien dire) : 256-264 Ko de JS au premier chargement de `/`,
`/ville`, `/villes`, `/jumelages`, contre un budget de 500 Ko pour toute
l'appli. Corrigé en séparant le vrai canvas Three.js
(`src/components/CanvasVilleInterne.tsx`, nouveau) du contexte React qui
l'entoure (`SceneVilleFond.tsx`, inchangé pour les pages) et en chargeant
le premier avec `next/dynamic(..., { ssr: false })` — le texte de chaque
page s'affiche donc immédiatement, la 3D arrive juste après en tâche de
fond. Après correction : 104-113 Ko sur ces mêmes pages. Les appels à
`definirVille()` reçus avant que le canvas ne soit monté sont mémorisés
et rejoués dès qu'il l'est (pas de perte d'état). Suite complète
(47 tests unitaires + 20 tests e2e, dont la vérification que le canvas
peint bien des pixels) repassée après cette correction, verte.

---

### Jalon 7bis — la ville continue de grandir — 24/09/2026

**Ce qui a été fait** : portage dans le générateur Three.js de la
croissance sans limite déjà écrite dans le prototype mis à jour
(`docs/prototypes/prototype-ville-3d.html`, demande d'Adrien consignée
dans `docs/A-INTEGRER.md` §2). Les 16 premiers blocs s'ouvrent exactement
aux mêmes seuils qu'avant (`BLOCK_OPEN`, jusqu'à 40 000 habitants), puis
un bloc de plus tous les 5 000 habitants, sans plafond, toujours du
centre vers l'extérieur (`openAtK`, `constantes.ts`). Les blocs sont
repérés par des entiers relatifs au croisement central
(`blockX0(b) = 8 + 80·b`, rues sur x = 80·k) au lieu de la grille fixe
de 4 × 4. Chaque nouveau bloc suit la même vie (maisons, immeubles, puis
chantier de gratte-ciel au plus tôt 12 000 habitants après son ouverture,
`towerAtK`) ; les tours des blocs lointains plafonnent à 14 étages (le
centre reste le plus haut). Les deux grands axes traversent toute la
ville et repartent en routes de campagne depuis son bord réel ; les
forêts ont des positions fixes par ville et s'effacent là où la ville
s'étend.

Tout ce qui était réglé pour une ville de 168 m de demi-côté suit
désormais le **rayon réel de la ville** (`stats.cityR`, plancher
`CITY_R_MIN` = 168) : champs cultivés et brouillard dans le shader
(`uCityR`), emprise et finesse de la carte d'occlusion au sol
(`dimensionsAO` : ville + 40 m, texture 1024² au-delà de 300 m), cadre de
la caméra des ombres, distance et limites de zoom/déplacement de la
caméra. Fidèle au prototype, à une exception près : son `CITY_R` était
une variable globale modifiée en cours de génération, ici c'est une
valeur retournée par `generate()` et passée explicitement (plus facile à
tester, pas d'état caché).

Deux petites corrections au passage, dans le code touché :
- la texture d'occlusion précédente n'était jamais libérée quand on
  changeait de ville (fuite mémoire, plus coûteuse maintenant qu'elle
  peut faire 1024²) ;
- changer de ville (page Villes) ne recadrait pas la caméra si le
  joueur avait zoomé à la main : on restait zoomé pour un hameau sur une
  métropole. Recadrage automatique à chaque changement de ville, comme
  dans le prototype.

**Décision prise sans Adrien, à contester si besoin** : l'aspect de
toutes les villes existantes change une fois avec ce jalon (ordre
d'ouverture des blocs, maisons, voitures, forêts). Le prototype tire
désormais un aléa propre à chaque bloc, à chaque case de rue et à chaque
arbre, au lieu de générateurs séquentiels — c'est ce qui garantit
qu'agrandir la ville ne déplace jamais ce qui existe déjà (voir tests
ci-dessous), mais ça rebat les cartes une fois. Pas de migration pour
garder l'ancien plan : il n'existe aujourd'hui que les villes de test et
un seul vrai compte (Adrien, un hameau à 1 habitant), et la règle
"l'identité d'une ville ne change jamais" vise les changements au hasard
d'un rechargement à l'autre, pas une mise à jour du moteur annoncée.
Après ce jalon, la règle redevient stricte (§10 point 18).

**Mesures** (`generate()` + occlusion, Node, même machine) :

| Habitants | Blocs | Rayon | Sommets | Génération |
|---|---|---|---|---|
| 1 | 1 | 168 m | 143 000 | ~60 ms |
| 40 000 | 16 | 240 m | 227 000 | ~60 ms |
| 100 000 | 28 | 240 m | 287 000 | ~65 ms |
| 250 000 | 58 | 320 m | 436 000 | ~155 ms |
| 500 000 | 108 | 480 m | 706 000 | ~185 ms |
| 1 000 000 | 208 | 640 m | 1 250 000 | ~345 ms |

Repères de la spécification atteints (~28 blocs à 100 000, ~58 à
250 000). Poids du paquet inchangé (`next build` : 104-113 Ko au premier
chargement des pages du jeu, le générateur est dans le morceau 3D chargé
en différé). **Pas de plafond ajouté** : la demande dit "sans limite",
mais au-delà de ~500 000 habitants la géométrie devient lourde pour un
téléphone — point ouvert pour Adrien (§10 point 19), pas tranché
silencieusement. La plus grande ville de test fait aujourd'hui 114 000
habitants.

**Tests** : `tests/unit/ville3dCroissance.test.ts` (nouveau) — les 16
premiers seuils sont identiques à avant ; +1 bloc tous les 5 000
habitants au-delà ; un chantier de tour jamais moins de 12 000 habitants
après son bloc ; repères 28 et 58 blocs ; la ville dépasse enfin 16
blocs ; **stabilité** : pour trois graines et neuf paliers de 1 à
500 000 habitants, chaque bloc ouvert le reste, au même endroit, avec les
mêmes seuils ; la ville naît au croisement central et s'étend vers
l'extérieur ; le rayon ne descend jamais sous le plancher et grandit avec
la ville ; la carte d'occlusion couvre toujours toute la ville. Pour
tester l'ordre des blocs sans passer par la géométrie, la planification
est sortie de `generate()` dans une fonction pure,
`planifierBlocs()`. Les tests existants (déterminisme, triangles valides,
bornes jusqu'à 500 000, gratte-ciel au seuil Ville) et le test e2e "le
sol est bien dessiné" passent sans changement. Vérifié aussi à l'œil
avec un compte jetable à 250 000 habitants (58 blocs, tours plus hautes
au centre, champs et routes de campagne partant du bord réel, ombres sur
toute la ville) et en passant d'une grande ville à un hameau sur la page
Villes (recadrage correct). Suite complète : 57 tests unitaires +
21 tests e2e, verte depuis un cache froid.

**Vérification rouge par sabotage** : remplacer l'aléa par bloc par un
générateur séquentiel unique (l'ancienne méthode) → le test de stabilité
échoue (blocs "perdus" quand la ville grandit), puis passe de nouveau une
fois l'aléa par bloc rétabli.

**Faux échec corrigé à la racine** : le test e2e du Jalon 1 échouait
parfois à froid (troisième fois constatée) sur la double redirection
connexion → `/ville` → `/ville/creer`, les deux routes se compilant à la
demande en plus des 5 s d'attente par défaut. Attente portée à 20 s sur
cette seule assertion, avec un commentaire qui l'explique.

---

### Jalon 8 — se classer — 24/09/2026

**Contenu, revu par rapport à la ROADMAP d'origine.** L'ancien Jalon 8
("classement des villes, pays + mondial") a été précisé et étendu par
une demande d'Adrien du même jour : `docs/CLASSEMENTS.md` ajoute les
**régions** (chaque ville appartient à une région de son pays,
classements mondial/national/**régional**). La proposition scinde
elle-même le travail en Jalon 8 (régions + classements principaux) et
**Jalon 8bis "Les palmarès"** (bilans journaliers, classements annexes
par période) — scission reprise telle quelle, même logique que
6/6bis et 7/7bis.

**Régions.** Table `regions` (id, country_id, nom_fr, nom_en). Régions
réelles pour les 6 pays cités nommément par Adrien et les plus présents
dans les villes de test — France (18 : 13 régions + 5 d'outre-mer),
Allemagne (16 Länder), Belgique (3), Suisse (26 cantons), Canada (13),
États-Unis (51, avec DC) — soit 127 lignes. **Décision prise sans
attendre Adrien, à contester si besoin** : le Japon, présent dans les
villes de test mais pas dans la liste explicite d'Adrien, n'a pas reçu
de régions réelles pour ce jalon — il reçoit comme tous les ~240 autres
pays une région de repli unique "Tout le pays", générée par requête
depuis `countries` plutôt que listée à la main (244 lignes). Étendre à
d'autres pays plus tard ne demande qu'une nouvelle migration insert,
aucun changement de code.

**Choix de région.** Obligatoire à la création (`creer_ville()` reçoit
`p_region_id`, valide qu'elle appartient au pays choisi, sinon P0010).
Les villes créées avant ce jalon (le compte réel d'Adrien, les villes de
test avant le rechargement du seed) ont `region_id` nul : un garde-fou
commun (`src/lib/supabase/gardes.ts`, appelé par Ma ville/Villes/
Jumelages/Classement) redirige vers `/ville/region` tant que le choix
n'est pas fait — même principe que la redirection déjà en place vers
`/ville/creer` pour un profil sans ville. La même page sert aussi à
**changer** de région plus tard, avec le délai de 30 jours
(`definir_region()`, P0011 si trop tôt) : premier choix libre (region_id
encore nul), un changement volontaire redémarre le délai.

**Classements** (`/classement`, nouvel onglet). Trois vues (mondial,
national, régional) par simples requêtes triées sur `population`, "ma
position" toujours affichée (nombre de villes strictement devant + 1,
même méthode que le badge de rang de Ma ville depuis le Jalon 7) — pas
de vue matérialisée ni de `pg_cron` pour ce jalon : à l'échelle actuelle
(une poignée de villes), une requête directe suffit très largement ;
CLASSEMENTS.md §4 le propose comme optimisation pour plus tard, pas
comme un prérequis. Chaque ligne du classement renvoie vers `/villes`
(les vraies actions restent là, pas dupliquées ici) ou vers `/ville`
pour sa propre ville.

**Bug trouvé en testant, pas dans le code applicatif** : `create or
replace function` sur `creer_ville()` avec un paramètre en plus
(`p_region_id`, même avec une valeur par défaut) ne remplace pas la
fonction — Postgres distingue les fonctions par les *types* de leurs
paramètres, pas leurs noms ni leurs valeurs par défaut, donc l'ancienne
version à 4 paramètres restait active à côté de la nouvelle à 5. Tout
appel à 4 arguments (tous les tests e2e des jalons précédents) devenait
ambigu pour PostgREST ("Could not choose the best candidate function").
Corrigé par une migration corrective (`0010`, jamais de modification
d'une migration déjà appliquée) qui supprime explicitement l'ancienne
signature.

**Vérifié aussi, sans lien avec ce jalon** : deux exécutions de la
nouvelle suite e2e ont laissé des comptes orphelins (mêmes noms de ville
réutilisés d'un essai à l'autre) après un test qui a dépassé son délai —
le même piège déjà documenté au Jalon 6bis (timeout Playwright qui saute
le bloc `finally`). Nettoyés à la main ; délai du test concerné porté à
60 s pour que ça n'arrive plus.

**Testé.** `tests/e2e/jalon8-se-classer.spec.ts` (nouveau) : une ville à
région nulle est bloquée sur `/ville/region` puis débloquée après choix
(vérifié aussi en base) ; sabotage région d'un autre pays refusée
(P0010) ; sabotage changement avant 30 jours refusé (P0011, région
inchangée en base) ; sabotage changement accepté pile 30 jours après ;
mondial/national/régional filtrent correctement et "ma position" tombe
juste — calculée dynamiquement en base au moment du test plutôt que
codée en dur, donc robuste au contenu déjà présent (villes de test,
compte réel d'Adrien). **Vérification rouge par sabotage** sur le calcul
de rang de `/classement` (retrait du `+ 1`) : le test échoue, corrigé →
repasse. Jalon 1 adapté (le formulaire de création a un champ région en
plus) et son assertion sur le pays élargie (collision de texte avec la
nouvelle ligne "Région : ..."). Vérifié aussi à l'œil avec un compte
jetable : sélecteur de région qui apparaît après le choix du pays,
affichage "Région : ... · Changer" sur Ma ville, page Classement (trois
onglets, "Ma position", liste), écran `/ville/region` en mode
"changement" avec le délai de 30 jours affiché. Poids du paquet
toujours dans le budget (104-180 Ko selon les pages, contrainte
"application légère" du §1 point 6). Suite complète : 57 tests unitaires
+ 26 tests e2e, verte depuis un cache froid.

**Explicitement exclu de ce jalon**, comme le proposait
`docs/CLASSEMENTS.md` §6 :
- le **titre de gouverneur de région** — marqué "idée à valider" par
  Adrien lui-même, pas codé ;
- le **classement des plus grands attaquants** — exclu par choix
  délibéré du document, pas de code ;
- le **Jalon 8bis "Les palmarès"** (bilans journaliers, classements
  annexes par période) — jalon séparé, voir son propre journal
  ci-dessous (fait le même jour).

---

### Jalon 8bis — les palmarès — 24/09/2026

**Contenu.** Suite naturelle du Jalon 8, comme prévu par
`docs/CLASSEMENTS.md` §3 et §5 : sept classements annexes (plus forte
croissance, plus éprouvées, plus influentes, plus visitées, plus
attaquées, joueurs les plus généreux, plus beaux jumelages), chacun sur
quatre périodes (aujourd'hui, cette semaine, ce mois, depuis toujours)
et trois échelles (mondial, national, régional), avec "ma position"
affichée quand elle existe — nouvel onglet `/palmares`.

**Écart assumé par rapport à `docs/CLASSEMENTS.md` §4, décidé sans
attendre Adrien (à contester si besoin).** La spécification proposait
une table `city_stats_jour` remplie au fil des événements puis agrégée
par `pg_cron`. En écrivant ce jalon, constat que les journaux des
jalons précédents (`visites`, `actions_influence`, `actions_antiville`,
`jumelage_bonus`) contiennent déjà tout ce dont les sept palmarès ont
besoin — chacun a une colonne `jour` — sauf le **montant** perdu par une
action AntiVille (seul le type d'action était gardé, pas la quantité).
Plutôt qu'une nouvelle table à tenir à jour en plus de ces journaux, ce
jalon ajoute une seule colonne (`actions_antiville.montant`, renseignée
par `lancer_action_antiville()`) et calcule chaque palmarès par une
requête directe sur les journaux existants (sept fonctions SQL
`palmares_croissance`, `palmares_pertes`, `palmares_influence`,
`palmares_visites`, `palmares_attaques`, `palmares_generosite`,
`palmares_jumelages`, chacune paramétrée par une date de début et une
échelle). Même logique que la décision déjà prise au Jalon 8 de ne pas
mettre de vue matérialisée/`pg_cron` pour les classements principaux
tant que l'échelle réelle (quelques dizaines de villes) ne le justifie
pas — voir le commentaire en tête de
`supabase/migrations/0011_jalon8bis_palmares.sql` pour le détail.
Chaque fonction renvoie tous les sujets actifs sur la période (pas de
`LIMIT` arbitraire, juste `valeur > 0`) avec leur rang exact via
`row_number()`, ce qui donne "ma position" et le haut du classement en
une seule requête, sans requête séparée pour le rang hors-top.

**Choix de conception notés au passage** :
- "Habitants gagnés" (croissance) compte les visites reçues **et** les
  bonus de jumelage reçus — ce sont les deux seules sources de
  population dans le jeu actuel ; "habitants perdus" (pertes) ne compte
  que les contaminations (pas les grèves/propagandes, qui ne retirent
  pas d'habitants).
- "Influence gagnée" compte les actions d'influence reçues (toujours
  +1 chacune), sans soustraire les pertes de propagande — lecture
  littérale de "influence gagnée" dans `docs/CLASSEMENTS.md` §3, pas un
  solde net.
- "Joueurs les plus généreux" (par joueur, pas par ville) filtre
  l'échelle sur la **région du joueur qui visite**, pas sur celle de la
  ville visitée.
- "Plus beaux jumelages" (par paire, pas par ville) compte une paire
  dans une échelle si **l'une** de ses deux villes en fait partie (un
  jumelage peut traverser une frontière de pays/région).
- Les quatre périodes sont des **fenêtres glissantes** (aujourd'hui
  inclus, pas de mois calendaire) — même logique que la fenêtre
  glissante de 24h déjà utilisée par la protection anti-harcèlement du
  Jalon 4. Calcul dans `src/lib/game/periodePalmares.ts` (pur, testable,
  séparé de la page comme `ordinal.ts`/`ligneLocale.ts`).

**Pas de vérification rouge par sabotage sur les fonctions SQL
elles-mêmes** : contrairement au code applicatif (TypeScript), une
fonction SQL déjà appliquée ne peut pas être modifiée temporairement
depuis un test sans accès psql direct (contrainte connue du projet).
Les tests vérifient donc des **valeurs exactes** calculées à partir
d'actions connues (ex. deux visites → `valeur = 2` pile), pas de simples
`> 0` — une régression de calcul fait échouer une valeur précise, même
rôle de garde-fou qu'un sabotage.

**Testé.** `tests/unit/periodePalmares.test.ts` (nouveau, 6 tests) :
bornes des quatre périodes, insensibilité à l'heure du jour (seule la
date UTC compte), passage correct d'un mois à l'autre.
`tests/e2e/jalon8bis-palmares.spec.ts` (nouveau, 6 tests) : croissance et
visites reçues comptent exactement les vraies visites ; pertes et
attaques comptent exactement le montant et le nombre d'une
contamination (montant recalculé côté test à partir de la formule du
Jalon 4, pas codé en dur) ; influence compte exactement les actions
reçues ; générosité filtre bien sur la région du joueur qui visite (pas
celle qu'il visite) ; jumelages compte exactement les bonus accordés à
une paire ; la page `/palmares` affiche les sept classements et change
bien de filtre (classement/période/échelle) sans erreur console.
Vérifié aussi à l'œil avec des comptes jetables : page vide avant la
migration (erreur PostgREST "function not found" absorbée proprement,
pas de crash), page remplie après, "ma position" et badge "Ma ville"
corrects. Poids du paquet toujours dans le budget (108 Ko pour
`/palmares`). Suite complète : 63 tests unitaires + 32 tests e2e, verte
depuis un cache froid.

---

### Jalon 9 — naissance d'un pays — 25/09/2026

**Contenu.** Nouvel onglet `/pays` : nom du pays, population totale,
influence totale, activité moyenne et nombre de villes, agrégés à
partir des villes membres (`stats_pays()`) ; sélecteur pour voir un
autre pays ; villes principales du pays (top 10 par population) avec
lien vers la liste complète (`/villes?pays=...`, déjà existante depuis
le Jalon 7). Lien "Mon pays" ajouté sur Ma ville. Pas de vote (Jalon 10)
ni de président (Jalon 11) dans ce jalon — la ROADMAP les garde
séparés.

**"Activité" enfin définie, décidé sans attendre Adrien (à contester si
besoin).** La colonne `cities.activite` existe depuis le Jalon 1 mais
n'avait jamais de définition réelle : toujours 0 pour une vraie ville
(bug visible, jamais remarqué jusqu'ici, sur la tuile "Activité" de Ma
ville), seules les villes de test avaient une valeur, arbitraire
(`activite_7j` du seed, sans lien avec une vraie mécanique — voir
DECISIONS.md §4, journal du Jalon 6). Définition retenue : le nombre de
jours, sur les 7 derniers jours, où le propriétaire de la ville a été
actif — même notion d'activité que `reclamer_bonus_jumelages()`
(Jalon 5) pour une seule journée (au moins une visite donnée, une
action d'influence ou une action AntiVille lancée), étendue ici sur une
fenêtre glissante de 7 jours (`activite_7j_de()`, réutilisée par
`activite_ville()` pour Ma ville et par `stats_pays()` pour la moyenne
nationale). Calculée à la volée, pas stockée — même logique que les
palmarès du Jalon 8bis ; la colonne `cities.activite` reste donc
inutilisée par ce jalon (pas supprimée, juste plus lue). Corrige au
passage l'affichage de la tuile Activité sur Ma ville, restée bloquée à
0 depuis le Jalon 1.

**Incident de vérification, sans lien avec le code applicatif.**
L'API Auth de Supabase est devenue injoignable en pleine vérification
(la REST API répondait en 150 ms, l'API Auth restait bloquée plus de
15 s sans réponse) — suite e2e massivement rouge sur des jalons
anciens et inchangés (1, 2, 3, 5, 6bis, 8, 8bis), tous bloqués à l'étape
"se connecter". Revenue à la normale une heure plus tard (signalé par
Adrien). Trois bugs réels trouvés en re-testant après coup, tous dans
le test lui-même, pas dans l'application :
- l'instantané "avant" de `stats_pays` dans le test était pris *après*
  la création des deux villes de test, faussant le delta attendu ;
- une mise à jour directe de `population` sans `population_max`
  échouait silencieusement contre la contrainte SQL
  `population_max >= population` (Jalon 6), laissant une ville de test
  à 1 habitant donc absente du "top 10" attendu ;
- plusieurs comptes de test orphelins de tentatives interrompues par la
  panne (le `finally` n'avait pas pu s'exécuter, même piège déjà
  documenté aux Jalons 6bis et 8) faussaient un autre test par une
  ville en double — nettoyés à la main.

**Flakiness confirmée liée à l'environnement, pas au code** : sous 2
workers Playwright (réglage habituel du projet), plusieurs tests de
jalons anciens et inchangés échouent occasionnellement à l'étape
"se connecter", y compris en relançant plusieurs fois de suite. Avec
`--workers=1`, la suite complète passe systématiquement (à l'exception
d'un test du Jalon 8 déjà identifié comme lourd, 4 comptes créés). Cette
machine ne semble pas absorber 2 workers Playwright + serveur de dev
Next.js aussi bien qu'attendu — observation notée ici, pas une
régression de ce jalon, et pas un changement de réglage forcé (le
projet garde `workers: 2` par défaut).

**Testé.** `tests/e2e/jalon9-naissance-dun-pays.spec.ts` (nouveau,
4 tests) : `stats_pays` agrège exactement la population et l'influence
(delta isolé et connu) ; `activite_7j_de`/`activite_ville` comptent
exactement les jours actifs (0 puis 1 après une visite) ; la page
`/pays` affiche les statistiques, liste les villes principales et
permet de changer de pays via le sélecteur, avec un lien vers la liste
complète ; la tuile "Activité" de Ma ville n'est plus bloquée à 0 après
une visite donnée. Vérifié aussi à l'œil avec des comptes jetables,
dont `/villes?pays=DE` en navigation directe pour confirmer que le
symptôme observé pendant les échecs (page bloquée) était bien un délai
de compilation à froid et non une vraie erreur serveur. Poids du
paquet toujours dans le budget (112 Ko pour `/pays`). Suite complète :
63 tests unitaires + 36 tests e2e, verte à `--workers=1`.

---

### Correction hors-jalon : service worker actif en développement — 25/09/2026

**Bug vécu et corrigé par Adrien lui-même** (`docs/A-INTEGRER.md` §9,
intégré ici) : `localhost:3000` bloqué avec `ERR_FAILED` dans Chrome
alors que le serveur `next dev` tournait bien. Cause :
`RegisterServiceWorker` (`src/app/register-sw.tsx`) enregistrait
`public/sw.js` même en développement ; les chunks et le HTML changent à
chaque compilation/HMR, et le service worker servait une version
périmée. Corrigé par Adrien : le service worker ne s'enregistre plus
qu'en production (`process.env.NODE_ENV === "production"`) ; en
développement, toute inscription ou cache résiduel d'une session
antérieure est nettoyé automatiquement au chargement.

**Ajouté par Claude Code à la demande d'Adrien** ("ajouter un test qui
empêche la régression") : `tests/e2e/smoke.spec.ts` vérifie que
`navigator.serviceWorker.getRegistrations()` reste vide après le
chargement de `/` en développement. Geste de dépannage documenté dans
`docs/GUIDE-METHODE.md` §9 pour un joueur qui aurait encore un service
worker périmé enregistré depuis avant la correction.

**Vérification rouge incomplète, notée honnêtement** : la sabotage
manuel (retirer temporairement la garde `NODE_ENV`) n'a pas fait
échouer le nouveau test dans ce sandbox — la registration du service
worker par l'effet React ne se déclenchait pas de façon observable dans
ce navigateur de test dans les quelques secondes disponibles, avec ou
sans la garde (une registration manuelle directe depuis la page
fonctionnait, elle). Le vrai bug d'Adrien impliquait un service worker
*déjà* enregistré lors d'une session précédente, une condition qu'un
navigateur Playwright fraîchement lancé ne reproduit pas naturellement.
Le test reste une garde-fou raisonnable (il encode la règle attendue)
mais n'a pas été confirmé rouge avant la correction, contrairement à la
convention habituelle du projet — à revoir si l'occasion se présente.

---

### Jalon 10 — voter pour son pays — 25/09/2026

**Contenu.** Sur `/pays`, section « Vote hebdomadaire » (visible
uniquement pour son propre pays) : un vote par joueur et par semaine
ISO parmi 4 catégories (Industrie / Technologie / Culture / Commerce,
`docs/ROADMAP.md`), résultat affiché en pourcentages recalculés sur le
total de la semaine — "proportionnel aux votes" au sens le plus
littéral : chaque vote compte pour 1, la répartition entre catégories
EST le résultat. « Ressources nationales » : stock cumulé par catégorie
depuis le premier vote, jamais remis à zéro, visible pour n'importe
quel pays consulté (pas seulement le sien).

**Portée volontairement limitée, décidée sans attendre Adrien (point
ouvert, §10) :** le cahier des charges dit "vote hebdomadaire de
ressource, résultat proportionnel aux votes" et "ressources
nationales", sans jamais préciser ce que ces ressources *font* une fois
accumulées. Plutôt qu'inventer un effet de gameplay (bonus aux villes ?
condition pour les décisions diplomatiques des Jalons 12/13 ?), ce
jalon construit le vote et l'accumulation — utiles et testables seuls,
comme l'a été l'"activité" du Jalon 9 avant d'avoir un usage. Voir le
commentaire en tête de `supabase/migrations/0013_jalon10_voter_pour_son_pays.sql`.

**Choix de conception notés au passage** :
- Le pays n'est jamais reçu du client dans `voter_pays()` — résolu
  depuis `users.country_id`, même principe que "ma ville" dans
  `proposer_jumelage()` (Jalon 5) : on ne peut voter que pour son
  propre pays, pas un pays choisi arbitrairement.
- "Semaine" = lundi de la semaine ISO 8601 courante (UTC), via
  `date_trunc('week', ...)` côté SQL et un équivalent JS testé
  (`src/lib/game/semaineIso.ts`) côté page, pour que les deux
  s'accordent sur "cette semaine" sans se passer la date calculée.
- Nouveau code d'erreur `P0012` (catégorie de vote invalide) — premier
  code libre après le `P0011` du Jalon 8.

**Incident de vérification, sans lien avec le code applicatif** : même
symptôme qu'au Jalon 9 (suite e2e rouge sur des jalons anciens et
inchangés, bloqués à "se connecter"), cette fois avec un seul worker
Playwright (donc pas la flakiness de concurrence déjà documentée) —
cause identifiée : le serveur de dev tournait sans interruption depuis
plusieurs heures à travers les Jalons 9 et 10, cache de compilation
probablement corrompu par l'accumulation de recompilations (même classe
de problème que documenté aux Jalons 6bis, 7bis, 8bis et 9). Redémarré,
suite complète repassée au vert immédiatement, `--workers=1` y compris
sur le test du Jalon 8 déjà identifié comme lourd (44.6s puis 41.8s,
sous la limite).

**Testé.** `tests/e2e/jalon10-voter-pour-son-pays.spec.ts` (nouveau,
4 tests) : `resultats_vote_semaine` reflète exactement les votes de la
semaine (delta connu, pourcentage recalculé vérifié) et
`ressources_pays` les cumule ; un vote inséré directement sur une
semaine passée compte dans `ressources_pays` mais pas dans
`resultats_vote_semaine` de la semaine courante ; sabotage — un
deuxième vote la même semaine est refusé (23505) et le premier vote
n'est pas écrasé ; la page `/pays` permet de voter, affiche la
confirmation et le résultat, masque la section de vote pour un pays
qu'on ne représente pas. Un vrai bug de test trouvé et corrigé en
route : `getByText("Culture", { exact: true })` visait n'importe quelle
occurrence du mot sur la page (résultats et ressources l'affichent
aussi), pas seulement le message de confirmation — corrigé en ciblant
le message précis puis `toContainText`. Poids du paquet toujours dans
le budget (113 Ko pour `/pays`). Suite complète : 69 tests unitaires +
41 tests e2e, verte à `--workers=1`.

---

### Jalon 11 — le président malgré lui — 25/09/2026

**Contenu.** Sur `/pays` : « Présidente actuelle : [ville] · depuis
[date] » et une section « Historique des présidents » (mandats passés
et en cours, plus récent en premier). Le badge "Président" existant
depuis le Jalon 7 (rang #1 du pays, calculé en direct sur `/ville` et
`/villes`) ne change pas — il reste la source de vérité pour "qui est
président *maintenant*", toujours exact. Ce jalon ajoute seulement la
mémoire de *depuis quand* et des mandats précédents
(`presidents`/`verifier_president()`), tenue à jour par une
réconciliation idempotente appelée à chaque affichage de `/ville` (son
propre pays) ou `/pays` (le pays consulté) — même principe que
`reclamer_bonus_jumelages()` au Jalon 5 : pas de cron, pas de trigger
sur chaque action qui change la population.

**Départage à population égale** : la ville la plus ancienne
(`created_at`) reste présidente — comportement stable, jamais
d'oscillation entre deux villes strictement à égalité.

**Bug trouvé en testant à l'œil, pas dans ce jalon mais dans le
Jalon 10** : la section "Résultats de cette semaine" écrasait les noms
de catégorie ("I...", "T..." au lieu de "Industrie", "Technologie") —
`list .rowbtn` (CSS) attend une grille à 3 colonnes fixes (`rk` 26px,
`nm` flexible, `pp` auto) ; cette section n'avait pas de `span.rk`, donc
`nm` se retrouvait placé dans la première colonne (26px) par le
placement automatique de la grille. Corrigé en ajoutant le `rk` manquant
(numéro d'ordre 1-4). Repéré uniquement parce que ce jalon-ci a rouvert
`/pays` pour vérifier visuellement l'ajout du président — jamais
remarqué avant.

**Testé.** `tests/e2e/jalon11-le-president-malgre-lui.spec.ts` (nouveau,
3 tests) : `verifier_president` élit la ville n°1 (populations très
hautes pour dominer sans ambiguïté toute donnée déjà présente),
idempotent sur un appel répété sans changement de rang (même mandat,
même date de début), puis bascule correctement (ancien mandat fermé,
nouveau ouvert) quand une autre ville dépasse la présidente ; à
population strictement égale, la ville la plus ancienne reste
présidente ; la page `/pays` affiche le président actuel et
l'historique. Un vrai bug trouvé dans un test **du Jalon 9** en
relançant la suite complète : l'ajout de "Présidente actuelle" fait
apparaître le nom de la ville une fois de plus sur `/pays`, cassant une
assertion `getByText` non assez précise (3 correspondances au lieu de
2) — corrigée en ciblant le lien de la liste des villes principales.
Poids du paquet toujours dans le budget (`/pays` inchangé, pas de JS
client ajouté). Suite complète : 69 tests unitaires + 44 tests e2e,
verte à `--workers=1`, serveur de dev fraîchement démarré.

---

### Jalon 9 ter — la carte du pays — 25/09/2026

**Contenu.** Sur `/pays` uniquement, le fond 3D partagé (Jalon 7) est
remplacé par une carte SVG illustrée du pays : régions colorées selon
leur population (une seule teinte, l'accent rouge panneau, plus marquée
si plus peuplée — `docs/CARTE-DU-PAYS.md` §2), pastilles cliquables
pour la ville du joueur (anneau rouge), la présidente (cercle or) et la
ville n°1 de chaque région (petit cercle brun, sans le mot
"gouverneur" — ce titre reste un point ouvert §10 point 23, non
tranché). Cliquer une pastille va sur la ville. Les autres pages
gardent la 3D sans changement.

**Comment la carte cohabite avec la scène 3D partagée, sans la
démonter** : `SceneVilleFond` (Jalon 7) rend le canvas en position
fixe, plein écran, `z-index: 0`, sous tout le reste de l'app — les
pages n'ont jamais besoin de le démonter, seulement de ne pas le
recouvrir. `/pays` ne l'annonce plus (`SincroniserScene` retiré de
cette page) et affiche `.carte-pays` à la place, `position: fixed`,
à l'intérieur de `.screen` (déjà au-dessus du canvas, Jalon 7) — la
carte recouvre donc visuellement la 3D sans jamais la démonter ; le
canvas continue de tourner en arrière-plan, invisible tant qu'on reste
sur Pays (petit gaspillage CPU/GPU accepté plutôt que la complexité
d'une vraie pause, `docs/DECISIONS.md` §10 point 28).

**Chasse aux données géographiques : trois échecs avant la bonne
source, à consigner pour la prochaine fois.** L'idée de départ
(A-INTEGRER §11) était de générer les cartes une fois pour toutes à
partir de Natural Earth. En pratique :
1. Les miroirs GeoJSON habituels de Natural Earth sur GitHub
   (`nvkelso/natural-earth-vector`, `martynafford/natural-earth-geojson`)
   se sont révélés incomplets pour les subdivisions administratives
   (admin-1) au moment d'écrire ce jalon — seulement 9 à 51 pays
   couverts selon le fichier, jamais les 6 dont ce projet a besoin en
   entier. Cause non identifiée avec certitude (snapshot dégradé du
   dépôt ? reconstruction en cours ?).
2. `world-atlas` (paquet npm, CDN jsdelivr) s'est révélé fiable mais ne
   couvre que le contour des pays (admin-0), pas leurs régions — utilisé
   pour les ~228 pays sans régions réelles.
3. **geoBoundaries** (`geoboundaries.org`, projet académique William &
   Mary, licence ouverte) a fourni des données admin-1 complètes et
   fiables pour les 6 pays voulus, via son API
   (`api/current/gbOpen/{ISO3}/ADM1/`) qui renvoie une URL vers sa
   propre version pré-simplifiée (`simplifiedGeometryGeoJSON`) — la
   version détaillée aurait dépassé la limite de taille de chaîne de
   Node (500 Mo+ pour le Canada, à cause de son archipel arctique).
   Piège rencontré : les fichiers sont servis via Git LFS, seul le
   chemin `github.com/.../raw/<ref>/...` (pas
   `raw.githubusercontent.com/...`) résout le vrai contenu au lieu
   d'un pointeur texte de 130 octets.

**Piège de projection, découvert en cours de route** : `d3-geo`
(`geoMercator().fitSize(...)`, `geoBounds`) a d'abord renvoyé des
projections dégénérées (tout le contenu tassé dans un coin de 16×15
pixels) sur les polygones de geoBoundaries. Cause : ces polygones ont
un sens de rotation (winding) qui fait que les algorithmes sphériques
de d3-geo (conventions RFC 7946, extérieur en sens antihoraire) les
lisent comme couvrant le globe entier. `geojson-rewind` n'a pas corrigé
le symptôme non plus (raison non éclaircie). Solution retenue : une
projection équirectangulaire maison (longitude compressée par
cos(latitude centrale), simplification Douglas-Peucker écrite à la
main après projection) — plus simple, sans dépendance à d3-geo, et
largement suffisante pour "une carte illustrée, pas une carte GPS"
(`docs/CARTE-DU-PAYS.md` §3). `d3-geo` et `topojson-server`/
`topojson-simplify` ont été retirés des devDependencies après coup ;
seuls `topojson-client` (décodage pur du TopoJSON de world-atlas, sans
géométrie sphérique) et `world-countries` (correspondance code ISO
numérique ↔ alpha-2) restent nécessaires — tous deux devDependencies,
jamais importés par l'app, poids nul sur le paquet client
(`docs/DECISIONS.md` §1 point 6), utilisés uniquement par
`scripts/generer-cartes-pays.mjs`, exécuté une fois (pas à chaque
build).

**Corrections manuelles constatées en comparant aux id de la table
`regions`** (Jalon 8) : Corse (`FR-20R` → `fr-cor`), Québec (`CA-QB` →
`ca-qc`), Belgique (préfixe pays absent : `BRU`/`VLG`/`WAL` →
`be-bru`/`be-vlg`/`be-wal`), et une coquille dans les données de
geoBoundaries elles-mêmes (Dakota du Sud sous le pays "SU" au lieu de
"US"). Codées en dur dans le script de génération, avec le
raisonnement, pour ne pas se reperdre si les cartes sont régénérées un
jour.

**Limites connues, acceptées pour cette première version** :
- **5 régions d'outre-mer françaises** (Guadeloupe, Martinique, Guyane,
  Réunion, Mayotte) et **2 États américains** (Rhode Island, DC)
  n'apparaissent pas sur la carte — absents des données sources
  (France) ou perdus à la simplification (trop petits, États-Unis).
  Les classements/votes/ressources de ces régions restent corrects
  (non affectés, la carte n'est qu'un habillage visuel) ; seule la
  carte elle-même ne les montre pas.
- **Pas de scintillement nocturne** ni de **repères de jumelages en
  bord de carte** (`docs/CARTE-DU-PAYS.md` §2) : explicitement permis
  à différer par la proposition elle-même pour le premier point, pas
  fait pour le second faute de temps — tous deux en point ouvert.
- **Cliquer une région n'ouvre pas de résumé** (population, ville n°1)
  — seules les pastilles de villes sont cliquables dans cette version.
- **16 très petits territoires sans carte du tout** (îles inhabitées,
  Kosovo — absent de world-atlas pour raison de statut contesté, etc.)
  — retombent sur la vignette prévue par la proposition elle-même pour
  "les petits pays".
- **Une ville qui n'a pas de coordonnées propres** dans ce projet
  (seulement une région) : sa pastille est placée au centroïde de sa
  région, pas à sa position géographique réelle — approximation
  assumée, cohérente avec "carte illustrée, pas une carte précise".

**Testé.** `tests/unit/couleurRegion.test.ts` (nouveau, 4 tests) :
région sans habitant neutre, région la plus peuplée à l'accent, gradient
monotone, aucune région peuplée reste neutre.
`tests/e2e/jalon9ter-carte-du-pays.spec.ts` (nouveau, 2 tests) : la
carte s'affiche avec plusieurs régions dessinées et une pastille
cliquable mène bien sur Ma ville ; un pays sans carte générée retombe
sur la vignette, sans erreur console. Deux tests d'autres jalons
(Jalon 9 et 11) adaptés : les nouvelles pastilles de la carte
introduisent des `<a href="/ville">` et des `<title>` SVG (jamais
visibles) qui entraient en collision avec des assertions `getByText`
trop larges — corrigées en ciblant précisément la liste des villes
principales / la note "Président actuel", pas n'importe quelle
occurrence du nom de ville sur la page. Vérifié aussi à l'œil avec des
comptes jetables : carte de France correcte visuellement (13 régions,
bonnes formes, bonnes couleurs), pastille "ma ville" cliquable menant
bien vers Ma ville. Poids du paquet **réduit** sur `/pays` (111 Ko contre
113 Ko avant ce jalon — la carte SVG serveur est plus légère que
`SincroniserScene`). Suite complète : 73 tests unitaires + 46 tests
e2e, verte à `--workers=1`.

---

### Jalon 12 — décider à l'international — 25/09/2026

**Contenu.** Sur `/pays`, section « Décision diplomatique » : une fois
par semaine ISO, la présidente **en exercice** (mandat ouvert dans
`presidents`, Jalon 11) propose un pays cible + une catégorie (Alliance
/ Paix / Rivalité / Embargo) ; n'importe quel citoyen peut ensuite
soutenir cette proposition, une fois par semaine
(`proposer_decision_diplomatique()`, `soutenir_decision_diplomatique()`,
`resultat_decision_semaine()`).

**Portée tranchée avec Adrien avant de coder**, contrairement aux
jalons précédents où j'avais décidé seul : le cahier des charges
("décision diplomatique hebdomadaire... le président peut proposer
sans décider seul") laissait deux lectures possibles — une cible par
semaine proposée par la présidente (retenu), ou une relation par paire
de pays votable indépendamment (matrice n×n, plus lourd, sans lien
direct avec un "vote hebdomadaire" unique). Un seul pays ne peut avoir
qu'une proposition par semaine (contrainte `unique (country_id,
semaine)`) : cohérent avec "un pays cible", et il ne peut de toute
façon y avoir qu'une présidente à la fois.

**Même écart que le Jalon 10, assumé pour la même raison** : ce jalon
construit la proposition et le soutien, pas ce qu'une décision *fait*
une fois soutenue (aucune règle de jeu ne change encore selon qu'un
pays est "en rivalité" ou "allié" avec un autre) — laissé au Jalon 13
("France contre Allemagne"), premier scénario concret qui donnera un
sens réel à ces catégories.

**Choix de conception** : pas de vote de rejet séparé — soutenir est un
acte positif, l'absence de soutien suffit à mesurer le désaccord (même
simplicité que les votes du Jalon 10, qui n'ont pas de "je suis
contre"). La vérification "est-ce la présidente en exercice" réutilise
directement la table `presidents` du Jalon 11 plutôt que d'introduire
une nouvelle notion de rôle. Nouveaux codes d'erreur `P0013` (pas
présidente), `P0014` (catégorie invalide), `P0015` (cible invalide :
soi-même ou pays inconnu), `P0016` (soutien sans proposition cette
semaine) — premiers codes libres après le `P0012` du Jalon 10.

**Testé.** `tests/e2e/jalon12-decider-a-linternational.spec.ts`
(nouveau, 3 tests) : sabotage — une citoyenne non présidente ne peut
pas proposer (P0013), une cible = soi-même est refusée (P0015), une
deuxième proposition la même semaine est refusée (23505, la première
n'est pas écrasée) ; les soutiens sont comptés exactement (delta connu,
doublon refusé, soutien sans proposition refusé avec P0016) ; la page
`/pays` permet à la présidente de proposer et à un citoyen de soutenir,
avec confirmation affichée. Vérifié aussi à l'œil avec un compte
jetable devenu présidente — la page dégrade proprement avant la
migration (fonctions absentes, pas de crash), fonctionne correctement
après. Poids du paquet toujours dans le budget (112 Ko pour `/pays`).
Suite complète : 73 tests unitaires + 49 tests e2e, verte à
`--workers=1`, du premier coup sur un serveur de dev fraîchement
démarré.

### Jalon 13 — france contre allemagne — 25/09/2026

**Contenu.** Complète le vote de décision diplomatique du Jalon 12 avec
une notion de majorité et un premier effet de gameplay réel :

- `votes_diplomatie` gagne une `position` (`pour`/`contre`) ;
  `soutenir_decision_diplomatique()` prend désormais cette position en
  paramètre (signature changée : `drop function` puis recréation, piège
  du Jalon 8 réappliqué sans le redécouvrir).
- `resoudre_decision_diplomatique(country_id)` : idempotente, appelée à
  chaque affichage de `/pays` (même schéma que `verifier_president` au
  Jalon 11) — clôt la proposition de la dernière semaine terminée à la
  majorité des votes exprimés (égalité ou 0 vote = non adoptée), trace
  le verdict dans `resultats_diplomatiques`.
- Si adoptée et catégorie = "rivalité" : déclenche un `conflits` de 7
  jours entre les deux pays (sauf conflit déjà en cours entre eux, index
  unique `conflits_paire_active_unique`).
- `effort_national(country_id)` : la force de mobilisation d'un pays à
  l'instant T, dérivée automatiquement de ses stats déjà existantes —
  somme de l'activité 7 jours (`activite_7j_de`, Jalon 9) des villes du
  pays, plus `floor(sqrt(somme des ressources nationales))` (Jalon 10,
  racine carrée pour que les ressources — un compteur cumulatif qui ne
  fait que croître depuis le Jalon 10 — comptent comme un bonus
  secondaire sans écraser l'activité pour un pays ancien).
- `resoudre_conflits_en_cours()` : idempotente, appelée à chaque
  affichage de `/pays` — clôt tout conflit dont les 7 jours sont
  écoulés, compare `effort_national()` des deux camps avec un **bonus
  défensif de 50 %** pour le défenseur (`effort_attaquant >
  floor(effort_defenseur * 1.5)` pour que l'attaquant l'emporte).

**Déclenchement et résolution tranchés avec Adrien avant de coder**
(contrairement à "aucun effet de gameplay" laissé en l'état aux
Jalons 10 et 12) : le cahier des charges donnait juste "coût en
ressources, bonus défensif pour l'attaqué, mobilisation quotidienne,
résultat en fin de période" sans dire *qui* déclenche le conflit ni
*comment* il se résout. Deux questions posées, réponses d'Adrien :
« c'est à la fin de la semaine le vote majoritaire des personnes de la
nation déclenche le conflit » puis « À la fin de la semaine le vote
majoritaire de la nation (par les personnes du [pays]) déclenche
l'action choisit, le président emet une sugestion mais il ne décide pas
seul ». Cela révélait que le Jalon 12 était incomplet : il manquait la
notion pour/contre et la résolution majoritaire — ajoutées ici plutôt
qu'en reprenant le Jalon 12 a posteriori (le comportement de soutien
seul du Jalon 12 n'était pas faux, juste incomplet pour "France contre
Allemagne").

**Correction d'Adrien en cours de route sur la "mobilisation
quotidienne"** (`docs/A-INTEGRER.md` §12, 25/09/2026) : la première
implémentation (migration `0016`, déjà appliquée par Adrien avant qu'il
ne se relise) ajoutait une action « Mobiliser » que chaque citoyen
devait cliquer une fois par jour pendant un conflit, comptée dans une
table `mobilisations`. Adrien s'est rendu compte que ce n'était pas ce
qu'il voulait dire en répondant à ma question, et l'a signalé avant que
je committe : l'effort quotidien d'un pays en guerre ne doit **pas**
être un compteur de clics, mais dérivé automatiquement de ce que le
pays *est déjà* — son activité (Jalon 9) et ses ressources (Jalon 10) —
sans nouvelle action citoyenne. Migration corrective `0017` : retire
`mobilisations`/`mobiliser()`/le bouton « Mobiliser », introduit
`effort_national()`. Demandé à Adrien comment pondérer activité et
ressources (le cahier des charges ne le précise pas) ; il a choisi ma
proposition — voir écart ci-dessous. « Avantages nationaux » type
Défense (cahier des charges §13) n'existe pas encore comme système dans
ce projet : pas construit ici, signalé comme point ouvert (§10 point 31)
plutôt qu'inventé pour combler le manque, comme demandé par la note.

**Écarts assumés, pas tranchés avec Adrien :**

- **Taux du bonus défensif** : le cahier des charges demande un "bonus
  défensif pour l'attaqué" (le défenseur) sans donner de chiffre — 50 %
  choisi par Claude Code (`floor(effort_defenseur * 1.5)` comparé à
  l'effort de l'attaquant), pas tranché avec Adrien, à ajuster si le
  balancing le demande.
- **Durée du conflit** : 7 jours à partir de sa résolution (pas calée
  sur la semaine ISO — la décision qui le déclenche vient d'une semaine
  déjà terminée, plus simple de faire courir le conflit à partir de sa
  résolution que de recaler sur un calendrier).
- **"Coût en ressources"** : traité comme un instantané informatif des
  ressources nationales de l'attaquant au moment du déclenchement
  (`conflits.cout_ressources`), affiché mais jamais déduit — voir point
  ouvert 30 (`DECISIONS.md` §10). Les ressources du Jalon 10 sont un
  compteur cumulatif en lecture seule sans mécanisme de dépense ; en
  faire une vraie monnaie dépensable aurait été un jalon à part entière,
  disproportionné pour ce jalon.
- **Alliance/Paix/Embargo** : toujours sans effet de gameplay au-delà du
  vote pour/contre lui-même — le cahier des charges ne cite que la
  rivalité ("France contre Allemagne") comme scénario de test explicite.
  Point 29 (§10) marqué tranché sur cette base.
- **Formule d'`effort_national`** : activité (somme brute de
  `activite_7j_de` sur les villes du pays, pas de plafond) + `floor(sqrt(
  somme des ressources))` en bonus secondaire — pondération choisie par
  Claude Code, proposée à Adrien et retenue par lui plutôt que de
  spécifier le calcul lui-même. À ajuster si le balancing le demande.

**Code d'erreur `P0017`** (mobilisation sans conflit en cours) attribué
puis retiré dans la même journée avec la fonction `mobiliser()` — pas
réutilisé pour autre chose (`P0018` et `P0019` pris le lendemain par le
Jalon 13 bis, voir plus bas).

**Testé.** `tests/e2e/jalon13-france-contre-allemagne.spec.ts` (4
tests) : le vote pour/contre compte séparément, refuse une position
invalide (P0014), un doublon (23505) et un vote sans proposition
(P0016) ; la résolution adopte à la majorité et déclenche un conflit de
rivalité (idempotente — pas de doublon de résultat ni de conflit au
deuxième appel), rejette à l'égalité sans déclencher de conflit ;
`effort_national()` reflète exactement l'activité et les ressources
insérées, la résolution de fin de conflit l'utilise pour les deux
camps, applique le bonus défensif de 50 % et clôt le conflit
(idempotente) ; la page `/pays` affiche le vote pour/contre et l'effort
automatique d'un conflit en cours. Vérifié aussi à l'œil avec un compte
jetable, à la fois avant la migration (dégrade proprement, fonctions
absentes, pas de crash) et après (vote et affichage du conflit
fonctionnent, effort mis à jour en direct sans action supplémentaire).
Poids du paquet toujours dans le budget (112 Ko pour `/pays`). Les deux
tests devenus obsolètes du Jalon 12 (l'ancien "soutenir" à sens unique,
signature changée) sont retirés de `jalon12-decider-a-linternational.spec.ts`
au profit de cette suite — un seul test y reste (`proposer_decision_diplomatique`,
inchangé). Suite complète : 73 tests unitaires + 51 tests e2e, verte à
`--workers=1` sur ce jalon. Croisé en route, sans rapport avec ce
jalon : une connexion qui reste bloquée sur `/connexion` a fait
échouer un test des Jalons 1 et 8 chacun une fois sur plusieurs runs
(jamais les mêmes, jamais un test touchant `/pays`) — même famille de
flakiness "serveur de dev" déjà rencontrée et documentée à plusieurs
reprises dans ce journal (Jalons 9/10/11/9 ter/12), pas creusée
davantage ici faute de lien avec ce jalon.

### Jalon 13 bis — revenir plus souvent — 26/09/2026

**Contenu.** Sur `/villes`, une même personne peut désormais revisiter
une ville plusieurs fois par jour (jusqu'à 3 fois, plafond choisi par
Claude Code — voir plus bas), avec un délai minimum d'une heure entre
deux visites de la même ville. Remplace l'ancienne règle "une visite par
(visiteur, ville) et par jour" du Jalon 2. `visiter_ville()` (migration
0018) : la contrainte unique `(visiteur_id, ville_id, jour)` sur
`visites` est retirée, remplacée par deux contrôles explicites — délai
d'une heure (`max(created_at)` du couple, nouveau code `P0018`) puis
plafond quotidien de 3 (nouveau code `P0019`). Interface : compteur
« n/3 » toujours visible à côté du bouton Visiter, bouton désactivé
avec compte à rebours (« Revisiter dans 42 min ») pendant le délai, puis
« Quota atteint » une fois le plafond touché ; badge de liste
« Indisponible pour l'instant » dans les deux cas (remplace l'ancien
« Déjà visitée aujourd'hui », devenu inexact puisqu'une ville visitée le
matin peut redevenir visitable l'après-midi).

**Déviation assumée du cahier des charges**, pas un oubli : les §3 et
§26 du cahier des charges posent explicitement « une même personne ne
peut contribuer qu'une seule fois par jour à une même ville » comme
règle anti-abus. C'est Adrien, auteur du cahier des charges, qui demande
cette évolution après avoir été informé de la contradiction (question
posée en retour côté Claude chat, `docs/A-INTEGRER.md` §13) — objectif
assumé : « garder les gens connectés plus souvent, ce qui est mieux pour
les fidéliser », pas seulement accélérer la croissance. Même précédent
que l'assouplissement de la règle "zéro coût" (§1 point 1) : un
amendement volontaire du cahier des charges par son auteur, pas une
extension prise seule par Claude Code.

**Plafond quotidien de 3, choisi par Claude Code** ("chiffre à
déterminer", Adrien délègue explicitement, même schéma que les quotas
des Jalons 3 et 4) : sans plafond, un joueur très motivé pourrait
visiter la même ville jusqu'à ~24 fois/jour avec seulement le délai
d'une heure, ce qui dépasserait largement la "boucle courte" (§1 point
3) et déséquilibrerait la croissance (un visiteur acharné ferait grandir
une ville bien plus vite qu'une ville qui recrute large, à l'inverse de
l'esprit du §3 du cahier des charges). 3 par jour laisse une vraie
marge par rapport à l'ancien plafond implicite de 1 (retenir les gens
plus souvent) sans l'ouvrir en grand — à ajuster avec les villes de test
si Adrien le juge trop bas ou trop haut à l'usage.

**Périmètre** : seule l'action Visiter (population) est concernée.
Les quotas d'Influence (5/jour, tous ciblés confondus) et d'AntiVille
(3/jour) restent inchangés, comme demandé — Adrien n'a pas étendu
l'objectif de rétention à ces deux actions ; point ouvert si l'envie
vient plus tard (§10 point 32).

**Nouveaux codes d'erreur** `P0018` (délai d'une heure non écoulé) et
`P0019` (plafond quotidien de 3 atteint) — premiers codes réellement
utilisés après `P0017`, qui avait été attribué puis retiré le même jour
avec `mobiliser()` (Jalon 13).

**Testé.** `tests/e2e/jalon13bis-revenir-plus-souvent.spec.ts` (nouveau,
2 tests) : sabotage — délai d'une heure refusé (P0018) tant qu'il n'est
pas écoulé, 3 visites acceptées une fois le délai simulé écoulé entre
chacune, une 4e refusée par le plafond (P0019) même délai écoulé,
population exacte (+3, pas +4) ; la page `/villes` affiche le compteur
n/3, le compte à rebours puis "Quota atteint" une fois les 3 visites
faites. `tests/e2e/jalon2-grandir-grace-aux-autres.spec.ts` mis à jour :
le test UI vérifie désormais le badge "Indisponible pour l'instant" (au
lieu de "Déjà visitée aujourd'hui"), le test de sabotage attend `P0018`
(au lieu de `23505`, la contrainte unique retirée) pour une revisite
immédiate. Vérifié aussi à l'œil avec des comptes jetables, à la fois
avant la migration (dégrade proprement : la page utilise déjà la table
`visites` existante pour son compteur et son délai, seule la fonction
SQL n'a pas encore les nouveaux codes) et après. Poids du paquet
inchangé (114 Ko pour `/villes`).

**Bug trouvé après application de la migration 0018** (en lançant la
suite e2e, pas à l'œil — le contrôle visuel avant migration n'exerçait
qu'un seul appel, insuffisant pour le révéler) : la nouvelle
`visiter_ville()` avait été réécrite à partir de la version d'origine
du Jalon 2 (migration 0003) au lieu de la version réellement en place,
déjà redéfinie par le Jalon 4 (codes d'erreur `P0004`/`P0005`/`P0007`)
puis le Jalon 6 (maintien de `population_max`/`niveau` via
`greatest(population_max, population + 1)`, nécessaire depuis la
contrainte `check (population_max >= population)` ajoutée ce même
jalon). Conséquence : toute visite échouait avec la contrainte
`cities_check` violée (`population_max` plus jamais mis à jour) et les
codes d'erreur historiques avaient disparu. Corrigé par la migration
`0019` (redéfinit `visiter_ville()` avec le corps complet du Jalon 6 +
le délai/plafond de ce jalon) — leçon retenue : pour redéfinir une
fonction SQL, relire sa version **actuelle** dans le dépôt (chercher
toutes les migrations qui la redéfinissent, prendre la plus récente),
jamais la première trouvée par nom de jalon d'origine.

**Vérification finale** (après la migration `0019`) : ce jalon est
verte et reproductible — `tests/e2e/jalon13bis-revenir-plus-souvent.spec.ts`
(2 tests) et `tests/e2e/jalon2-grandir-grace-aux-autres.spec.ts` (3
tests, dont son premier test navigateur a dû recevoir le même bump de
délai que les autres fichiers e2e du projet, oublié à l'origine) passés
3 fois de suite sans exception. Suite complète : 73 tests unitaires +
53 tests e2e. Croisé en route, sans rapport avec ce jalon : sur 3 runs
complets, une connexion restée bloquée sur `/connexion` ou une
navigation trop lente a fait échouer un test différent à chaque fois
(Jalon 1, 6bis, 8, 9 — jamais deux fois le même, jamais un test touchant
`/villes`) — même famille de flakiness "serveur de dev" déjà documentée
à plusieurs reprises dans ce journal (Jalons 9/10/11/9 ter/12/13), pas
creusée davantage ici faute de lien avec ce jalon.

### Jalon 14 — rester dans la légalité — 26/09/2026

**Contenu.** Cahier des charges §26 (anti-triche), quatre volets :
« toutes les actions importantes validées côté serveur », « une seule
connexion par joueur et par ville sur la période quotidienne prévue »,
« détection des comportements automatisés et répétitifs », « protection
contre les créations massives de comptes » et « limitation du
multi-compte abusif ». Portée volontairement cadrée avec Adrien avant
de coder (deux questions posées, même démarche qu'au Jalon 13) plutôt
que d'inventer une réponse à un chapitre aussi vaste et sensible (vie
privée, faux positifs) :

- **Validation serveur systématique** : **audit complet** de toutes les
  fonctions SQL `security definer` des 20 migrations (délégué à un
  agent d'exploration, rapport intégral conservé dans l'historique de
  session) — chaque fonction ayant un paramètre "qui agit"
  (`p_joueur_id`, `p_visiteur_id`, `p_attaquant_id`...) vérifie bien
  `auth.uid() is not null and auth.uid() <> p_xxx_id` (code `P0007`
  depuis le correctif du Jalon 4) ; aucune fonction n'accepte une
  valeur numérique de jeu (population, influence, perte, effort) du
  client sans la recalculer serveur ; tous les paramètres texte
  (catégorie, type d'action, position de vote) sont validés contre une
  whitelist avant usage ; aucune table de jeu n'a de policy RLS
  INSERT/UPDATE/DELETE ouverte à `anon`/`authenticated` — 15 policies
  trouvées, toutes en lecture seule. **Aucune anomalie trouvée.**
  Seule vraie trouvaille : la fonction/table `mobiliser`/`mobilisations`
  du Jalon 13, déjà retirée par le correctif du même jalon (rien à
  refaire ici, juste confirmé absente).
- **Une seule connexion par jour** : couvert depuis le Jalon 2, nuancé
  sciemment par le Jalon 13 bis (jusqu'à 3/jour avec délai d'une heure,
  déviation assumée et documentée — voir son propre journal). Rien de
  nouveau ici.
- **Détection de comportements automatisés/répétitifs** : **délai
  anti-rafale d'une seconde** entre deux actions du même type par le
  même joueur, sur `influencer_ville()` et `lancer_action_antiville()`
  (migration `0020`, nouveau code `P0020`, partagé entre les deux
  fonctions — même principe que `P0001`, déjà réutilisé pour plusieurs
  quotas distincts dans ce projet). Ce sont les deux seules actions
  répétables plusieurs fois par jour sans délai propre : Visiter a déjà
  son délai d'une heure (Jalon 13 bis), les actions hebdomadaires (vote,
  décision diplomatique) n'ont pas ce risque avec une seule occurrence
  par semaine. **Explicitement pas une heuristique comportementale** —
  juste de quoi bloquer un script qui enchaîne des appels en boucle sans
  délai, jamais perceptible par un humain qui navigue normalement entre
  deux villes. Décision d'Adrien après question posée : pas d'ambition
  plus poussée pour ce jalon.
- **Créations massives de comptes / multi-compte abusif** : **aucun
  signal technique ajouté**, décision explicite d'Adrien après question
  posée — la règle "un compte = un email vérifié (Supabase Auth) = une
  ville" suffit pour ce projet à cette échelle. Pas de tracking IP ni
  d'empreinte navigateur : coût de complexité et de vie privée jugé
  disproportionné, et le rate-limiting natif de Supabase Auth sur les
  inscriptions existe déjà côté plateforme sans code supplémentaire.

**Écart assumé** : le "délai d'une seconde" a cassé plusieurs tests
existants qui enchaînaient des actions en rafale via l'API service_role
pour construire leurs scénarios (Jalons 3 et 4 — boucles de 3 à 6
appels du même joueur) ; corrigé en reculant explicitement le
`created_at` des actions précédentes entre chaque appel de boucle
(même pattern que le déblocage de délai du Jalon 13 bis), pas en
affaiblissant le garde-fou.

**Testé.** `tests/e2e/jalon14-rester-dans-la-legalite.spec.ts` (nouveau,
3 tests) : deux actions d'influence trop rapprochées refusées (P0020),
débloquées après recul du délai, sans effet de la tentative refusée ;
même vérification pour AntiVille ; le délai est propre à chaque joueur
(deux joueurs distincts agissent sans se gêner). `jalon3-peser-socialement.spec.ts`
et `jalon4-rivalites-de-quartier.spec.ts` mis à jour pour débloquer le
délai entre leurs appels de boucle existants (7 tests au total sur ces
deux fichiers, tous verts) — au passage, le premier test de
`jalon3-peser-socialement.spec.ts` a reçu le même bump de délai de
connexion que tous les autres fichiers e2e du projet (oublié à
l'origine, comme pour `jalon2` au Jalon 13 bis). Suite complète : 73
tests unitaires + 56 tests e2e. Poids du paquet inchangé (aucun
changement de composant client). Croisé en route, sans rapport avec ce
jalon : sur la suite complète, une connexion lente ou une session
navigateur fermée en cours de route a fait échouer un test des Jalons 8
et 9 (jamais `/villes`, Influence ou AntiVille) — même famille de
flakiness "serveur de dev" déjà documentée à plusieurs reprises dans ce
journal (Jalons 9/10/11/9 ter/12/13/13 bis), pas creusée davantage ici.

### Jalon 15 — jouable partout — 26/09/2026

**Contenu.** Passage en PWA installable, manifest, service worker, mode
hors-ligne minimal, vérification manuelle sur mobile et PC. La
découverte principale de ce jalon : le squelette technique (Jalon 0,
23/09/2026) avait déjà posé `public/manifest.json`, `public/sw.js`,
`src/app/register-sw.tsx` et les icônes — la partie "manifest +
installable" était donc déjà faite. Le vrai travail restant :

- **Service worker réécrit** (`public/sw.js`, cache `v1` → `v2`) : la
  version d'origine faisait du cache-first pour tout, y compris les
  pages, ce qui aurait pu un jour servir des données de jeu périmées
  même quand le réseau fonctionne (risque réel pour un jeu multijoueur
  où la fraîcheur compte — voir cahier des charges §9). Nouvelle
  stratégie : les pages (navigation) passent par le réseau en premier
  et sont mises en cache au passage, secours sur la dernière version en
  cache seulement si le réseau échoue, secours ultime sur la page
  d'accueil si la page n'a jamais été visitée ; les assets statiques
  restent cache-first (rafraîchis en arrière-plan) ; tout ce qui n'est
  pas une requête GET same-origin (Supabase, Server Actions) n'est
  jamais intercepté, toujours le réseau — ce sont les données de jeu
  elles-mêmes.
- **Vérifié avec un vrai navigateur** (Chromium piloté par Playwright,
  contre `npm run build && npm start`, script ponctuel non conservé
  comme test automatisé — voir plus bas pourquoi) : le service worker
  s'enregistre bien en production ; une page déjà visitée en ligne
  reste consultable une fois hors-ligne (testé sur `/classement`) ; une
  page jamais visitée, hors-ligne, retombe proprement sur le shell de
  l'accueil en cache plutôt qu'une erreur de navigateur brute (testé
  sur `/jumelages`). Le smoke test existant (`tests/e2e/smoke.spec.ts`,
  Jalon 0) continue de garantir qu'aucun service worker ne s'enregistre
  en développement (`npm run dev`) — bug déjà vécu par Adrien
  (`docs/A-INTEGRER.md` §9), non-régression déjà en place, inchangée.
- **Pas de test automatisé permanent en mode production** : la suite
  e2e de ce projet tourne entièrement contre `npm run dev` (choix
  déjà établi, le service worker y est justement désactivé exprès).
  Ajouter un deuxième serveur Playwright rien que pour ce test aurait
  demandé une vraie infrastructure de test supplémentaire (projet
  Playwright séparé, `npm run build` à chaque run) pour vérifier un
  comportement simple et stable — jugé disproportionné vu le poids/la
  simplicité visés par ce projet. Vérification ponctuelle jugée
  suffisante, comme déjà fait ailleurs dans ce journal ("vérifié aussi
  à l'œil avec un compte jetable").
- **Détection d'un `.next` corrompu en cours de route** : `npm start`
  échouait avec `Cannot find module './vendor-chunks/@supabase.js'`
  après plusieurs démarrages concurrents de serveurs sur le port 3000
  pendant la vérification — résolu par un `rm -rf .next` suivi d'un
  rebuild propre. Pas un bug du projet, un aléa de cette session de
  vérification, noté pour mémoire seulement.

**Vérification manuelle sur mobile et PC : pas faisable par Claude
Code**, cette session n'a pas d'accès à un vrai téléphone Android/iOS
ni à l'installation réelle d'une PWA (ajout à l'écran d'accueil,
lancement en mode standalone). **Demandé à Adrien** : lancer
`npm run build && npm start`, ouvrir `http://<IP locale du PC>:3000`
depuis son téléphone (même Wi-Fi, même méthode qu'au Jalon 6bis),
tenter "Ajouter à l'écran d'accueil" (Android/Chrome et iOS/Safari),
vérifier le lancement en plein écran sans barre d'adresse, et un
rechargement en mode avion pour confirmer le hors-ligne dégradé.

**Testé.** Vérification ponctuelle par script Playwright (voir
ci-dessus, non conservée comme test automatisé) ; suite complète
inchangée : 73 tests unitaires + 56 tests e2e, verte à `--workers=1` —
aucun changement de composant client, `sw.js` n'entre jamais dans le
bundle JS (fichier statique servi tel quel), poids du paquet inchangé.
Vérification manuelle mobile/PC en attente du retour d'Adrien — MVP
(cahier des charges §30) complet une fois confirmée.

### Jalon 13 ter — visite automatique — 26/09/2026

**Contenu.** Trois retours de test d'Adrien reçus le même jour
(`docs/A-INTEGRER.md` §14/§15/§16), tous liés au mécanisme de visite du
Jalon 13 bis, traités ensemble :

- **§14 — panneau flottant réductible sur mobile.** Constat d'Adrien en
  testant sur téléphone : le panneau du bas (`.dock-float`) pouvait
  occuper jusqu'à 55 % de la hauteur d'écran, posé par-dessus la scène
  3D, sans aucun moyen de le réduire pour voir sa ville. Nouveau
  composant `src/components/PanneauFlottant.tsx` : une poignée (visible
  seulement en mobile) bascule le panneau entre "ouvert" et "réduit"
  (42px, juste la poignée) ; état mémorisé en `sessionStorage`, partagé
  entre les 6 pages qui utilisaient `.dock-float` directement
  (`/classement`, `/jumelages`, `/palmares`, `/pays`, `/ville`,
  `/villes`), toutes basculées sur ce composant. CSS : `.dock-contenu`
  vaut `display: contents` par défaut (desktop), pour que le nouveau
  wrapper n'altère strictement rien à la mise en page existante quand
  la poignée n'est pas affichée — bascule en `display: grid` seulement
  sous 640px.
- **§15 (partie A) — visite automatique, plus de bouton.** Demande
  d'Adrien : « il ne faudrait pas avoir à cliquer, ça devrait être
  automatique ». Le bouton "Visiter" est retiré ; `visiterVille()`
  (`src/app/villes/actions.ts`) change de signature (`villeId: string`
  direct plutôt que `FormData`, appelée par du JS, plus par un
  `<form>`) et un nouveau composant `src/components/VisiteAutomatique.tsx`
  déclenche l'appel automatiquement ~2,5 s après l'affichage du panneau
  détail d'une ville (autre ville, ou la sienne depuis le §16
  ci-dessous). **Délai laissé à l'appréciation de Claude Code** par
  Adrien (« risque qu'une visite se déclenche par simple curiosité ») :
  2,5 s choisies pour absorber un aller-retour accidentel (le minuteur
  est annulé si le panneau se ferme avant, via le nettoyage du
  `useEffect`) sans ajouter de geste supplémentaire — le clic qui ouvre
  déjà le panneau (depuis la liste, ou "Ma ville" dans la nav) reste le
  geste volontaire. Un message discret ("Visite comptée, +1 habitant.")
  s'affiche ~1,2 s avant que `router.refresh()` ne fasse basculer
  l'affichage sur le compte à rebours/plafond du Jalon 13 bis (options
  explicitement interchangeables selon la note d'Adrien). **Partie B
  (choix du thème à développer) volontairement pas construite** :
  bloquée derrière `docs/SYSTEME-DEVELOPPEMENT.md`, pas encore validé
  par Adrien — la ville continue de grandir en `population` comme
  aujourd'hui, sans écran de choix.
- **§16 — autoriser l'auto-visite.** Troisième déviation assumée du
  cahier des charges dans ce projet (après le §13/Jalon 13 bis et
  l'assouplissement "zéro coût") : le §3 pose l'attraction d'autres
  joueurs comme LE principe fondateur de la croissance d'une ville.
  Adrien, informé de la contradiction, confirme vouloir qu'un joueur
  puisse visiter sa propre ville, en connaissance de cause — une ville
  isolée sans aucun visiteur extérieur peut désormais progresser, mais
  au mieux 3 fois par jour par elle-même (même délai/plafond que pour
  une autre ville, aucune règle spéciale), très lentement comparé à une
  ville qui recrute de vrais visiteurs. `visiter_ville()` (migration
  `0021`) : retire le contrôle qui levait `P0005` sur l'auto-visite ;
  le code `P0005` devient inutilisé pour cette fonction (toujours actif
  pour Influencer/AntiVille/Jumelage, qui n'ont pas cette évolution —
  auto-influence et auto-attaque n'ont pas de sens, aucune raison de
  les ouvrir). `src/app/ville/page.tsx` ("Ma ville") gagne les mêmes
  requêtes de délai/plafond que `/villes` et le même `VisiteAutomatique`.

**Testé.** `tests/e2e/jalon13ter-visite-automatique.spec.ts` (nouveau,
3 tests) : l'auto-visite est acceptée puis re-bloquée par le délai
(P0018, comme pour une autre ville) ; la page `/ville` compte une
auto-visite automatiquement, sans bouton "Visiter" (absent, count 0) ;
le panneau flottant se réduit et s'agrandit sur mobile (375×812), le
nom de la ville disparaît/réapparaît avec. `tests/e2e/jalon2-grandir-grace-aux-autres.spec.ts`
et `tests/e2e/jalon13bis-revenir-plus-souvent.spec.ts` mis à jour pour
la visite automatique (attendent le délai au lieu de cliquer) ; le test
"auto-visite refusée" de `jalon2` retiré (devenu faux). Vérifié aussi à
l'œil avant la migration `0021` (dégrade proprement : page affichée
normalement, `console.error` côté serveur pour `P0005` absorbé
silencieusement côté UI, population inchangée) et après (auto-visite
comptée, population +1, confirmé en base). Poids du paquet : léger
supplément lié à `PanneauFlottant` sur les 6 pages concernées (max
+6 Ko sur `/classement`/`/jumelages`/`/palmares`, +2 Ko sur `/villes`,
inchangé sur `/pays`), toujours largement dans le budget de 500 Ko.
Suite complète : 73 tests unitaires + 58 tests e2e, verte à
`--workers=1` (migration `0021` appliquée par Adrien avant ce dernier
run). Croisé en route, sans rapport avec ce jalon : le test fragile déjà
documenté de `jalon8-se-classer.spec.ts` (rang national dynamique) a
échoué une fois, le serveur de dev étant partagé avec Adrien pendant sa
propre vérification manuelle au même moment — même famille de
flakiness "serveur de dev"/données partagées déjà rencontrée à
plusieurs reprises dans ce journal.

---

### Jalon 16 — croissance rapide en début de partie — 26/09/2026

**Contenu.** `docs/A-INTEGRER.md` §17 : Adrien a remonté qu'une ville
neuve grandit trop lentement (+1 habitant par visite, quel que soit le
niveau) pour donner une sensation de progression gratifiante les
premiers jours — objectif de rétention déjà posé au §13 (Jalon 13 bis).
Pas une déviation du cahier des charges, un ajustement d'équilibrage ;
chiffres exacts **laissés à l'appréciation de Claude Code** ("tranche
selon tes reco"). Retenu, bas de la fourchette proposée par Adrien (à
ajuster avec les villes de test si besoin) :

| Niveau visité | Gain par visite |
|---|---|
| Hameau (< 1 000 hab.) | ×5 |
| Village (1 000-4 999 hab.) | ×2 |
| Bourg et au-delà (≥ 5 000 hab.) | ×1 (rythme actuel, inchangé) |

Le gain dépend de la population **avant** la visite : une visite qui
fait franchir un seuil garde le gain du niveau de départ pour cette
visite-là (pas de bonus rétroactif). `visiter_ville()` (migration
`0022`) recalcule ce gain à chaque appel plutôt que d'ajouter un flat
+1 ; signature et type de retour inchangés depuis la migration `0021`,
donc `create or replace` direct, sans le contournement habituel des
migrations précédentes (Jalons 8/13). Nouveau
`src/lib/game/gainVisite.ts`, copie TypeScript de la même règle
("source de vérité" pour l'affichage et les tests unitaires, à tenir
manuellement synchronisée avec la fonction SQL) — utilisé par
`/villes` et `/ville` pour annoncer le gain avant la visite ("+5
population · 0/3") et par `VisiteAutomatique` pour le message de
confirmation après coup. i18n : `villes.visiteComptee` perdait son
"+1 habitant" fixe (règle du projet : jamais de nombre dans une chaîne
traduite) — désormais juste "Visite comptée," suivi du nombre
interpolé en JSX.

**Testé.** `tests/unit/gainVisite.test.ts` (nouveau, 3 tests, un par
palier avec les valeurs limites 999/1000 et 4999/5000). Tous les tests
e2e qui vérifiaient une population calculée à partir du flat +1 ont dû
être audités et corrigés (recherche systématique de tout appel à
`visiter_ville` ou toute assertion sur `population`) :
`jalon2-grandir-grace-aux-autres.spec.ts`,
`jalon5-villes-jumelles.spec.ts`,
`jalon13bis-revenir-plus-souvent.spec.ts`,
`jalon13ter-visite-automatique.spec.ts` (toutes les villes de test
partent à population 1, donc restent au palier Hameau ×5 sur toute la
durée de ces scénarios). `jalon8bis-palmares.spec.ts` a été
initialement corrigé à tort (le palmarès de croissance compte des
*événements* — visites + bonus de jumelage reçus — pas les habitants
gagnés ; sa valeur ne dépend pas du gain par visite et n'avait pas à
changer, corrigé une seconde fois pour revenir à l'attendu d'origine).

En creusant les échecs restants de ces quatre fichiers, une vraie
source de flakiness a été isolée (pas une régression du Jalon 16) : en
environnement de test headless, la scène 3D (`SincroniserScene`)
provoque des « GPU stall due to ReadPixels » qui bloquent le thread
principal, retardant le minuteur de 2,5 s de `VisiteAutomatique`
jusqu'à ~8,5 s dans certaines conditions — confirmé en instrumentant
un test temporaire avec les timestamps réels de la requête réseau du
serveur action. Les assertions `toBeVisible({ timeout: 8_000 })` liées
à un cycle de visite automatique ont donc été portées à 15 000 ms dans
les quatre fichiers ci-dessus, cohérent avec la convention déjà en
place ("ne jamais faire confiance à un timeout par défaut trop
serré"). Seconde source de bruit rencontrée en cours de route et sans
rapport avec le Jalon 16 : des comptes de diagnostic créés
manuellement pour cet investigation avaient des noms de ville
contenant la sous-chaîne `cible-ville`, entrant en collision avec les
regex de recherche des tests — nettoyés (supprimés) après coup ;
rappel pour la suite de toujours nettoyer tout compte créé
manuellement en dehors d'un test avant de relancer la suite.

Suite complète après ces corrections : 76 tests unitaires + 58 tests
e2e, `--workers=1`. Les 4 fichiers touchés par ce jalon passent tous ;
6 échecs résiduels dans des fichiers non touchés par ce jalon (Jalons
1, 4, 6bis, 8, 9, 10), tous des timeouts génériques de connexion —
même famille de flakiness environnementale que ci-dessus, pas un
suivi qui bloque ce jalon. Poids du paquet inchangé (`gainVisite.ts`
est quelques lignes pures, aucune nouvelle dépendance) : First Load JS
toujours au maximum 182 Ko, largement dans le budget de 500 Ko.

### Annulation du Jalon 16 — 27/09/2026

**Contenu.** Adrien revient sur le principe même du Jalon 16 dès le
lendemain : il ne veut pas d'un gain de population dégressif, le gain
par visite doit rester un flat **+1**, comme avant. La sensation de
croissance recherchée doit passer par le **rendu 3D** plutôt que par le
chiffre de population : il veut voir de nouvelles habitations
apparaître régulièrement (« tous les 4 habitants par exemple pour un
hameau ») et demande qu'on définisse combien d'habitants correspondent
à une habitation.

Tout le contenu du Jalon 16 est donc défait : `visiter_ville()`
(migration `0022`, réécrite et renvoyée à Adrien pour ré-application —
un `create or replace` écrase la version dégressive sans distinction
d'historique) revient au flat +1 de la migration `0021` ;
`src/lib/game/gainVisite.ts` et son test supprimés ; `/villes`,
`/ville` et `VisiteAutomatique` reviennent à une constante
`GAIN_VISITE = 1` locale à chaque page (même style que
`QUOTA_VISITE_QUOTIDIEN`/`DELAI_VISITE_MINUTES` déjà présents). Gardé
en revanche, indépendant de la question dégressif/flat : l'hygiène
i18n sur `villes.visiteComptee` (nombre interpolé en JSX, jamais dans
la chaîne traduite) et le correctif de flakiness des tests e2e
(timeouts de 15 s sur les cycles de `VisiteAutomatique`, la scène 3D
pouvant ralentir le thread principal en environnement headless — voir
journal du Jalon 16 ci-dessus).

**Point ouvert — "combien d'habitants par habitation".** Le
générateur 3D (`src/lib/ville3d/`, docs/DECISIONS.md §8) a en réalité
*déjà* une logique de révélation progressive maison par maison, pas
seulement bloc par bloc : dans `terrain.ts::buildBlock`, les 4
premières parcelles d'un bloc apparaissent à des seuils espacés de
`gap × 0,2` à l'intérieur de l'écart entre deux blocs
(`constantes.ts::BLOCK_OPEN`) — pour le tout premier bloc d'un Hameau
(écart 0 → 300), cela donne une maison à population 0, 60, 120 puis
180. C'est déjà plus fin qu'un bloc entier, mais bien plus grossier que
le rythme "tous les 4 habitants" évoqué par Adrien, et ce rythme n'est
pas un simple paramètre isolé : il découle du nombre de blocs déjà
tunés (`BLOCK_OPEN`, `STAGE_AT`, testés par
`tests/unit/ville3dCroissance.test.ts` qui garantit qu'un bloc déjà
ouvert ne bouge jamais). Soumis à Adrien via une question à choix
(retoucher juste les seuils existants, ou refonte complète par type de
bâtiment) : il choisit la refonte complète — voir la mise en œuvre
ci-dessous.

### « Habitants par habitation » — 27/09/2026

**Contenu.** Implémentation du point ouvert ci-dessus, pour la partie
**maisons individuelles** : nouvelle constante
`HABITANTS_PAR_LOGEMENT_MAISON = 4` (`src/lib/ville3d/constantes.ts`,
chiffre donné par Adrien lui-même) — une maison est UN logement, et les
4 maisons d'un bloc (`terrain.ts::buildBlock`) apparaissent maintenant
à `openAt + idx × 4` au lieu de `openAt + gap × idx × 0,2`. Concrètement,
les 4 maisons d'un bloc qui vient de s'ouvrir sont toutes visibles en
douze habitants, contre 180 avant (pour le tout premier bloc d'un
Hameau) — même règle du Hameau à la Métropole, puisque c'est un écart
absolu, pas une fraction de l'écart jusqu'au bloc suivant.

**Immeubles et tours volontairement laissés inchangés**, et c'est un
choix assumé plutôt qu'un oubli : un seul étage d'immeuble ou de tour
loge d'emblée plusieurs foyers, donc le même "4 habitants par logement"
n'a pas de sens direct à cette échelle sans une refonte beaucoup plus
lourde (`APART_FLOOR_EVERY`, `PER_FLOOR` sont calés sur les repères de
densité du cahier des charges — ~28 blocs à 100 000 habitants, ~58 à
250 000, voir journal du Jalon 7bis — les retoucher risquerait de
casser un équilibre déjà vérifié). Point à rouvrir avec Adrien si le
rythme des immeubles/tours doit lui aussi être repensé — voir §10
point 33.

**Testé.** Nouveau test dans
`tests/unit/ville3dCroissance.test.ts` : pour le premier bloc d'une
ville, la géométrie ne change pas entre deux seuils de 4 habitants,
puis change exactement au seuil suivant (vérifié aux trois premiers
paliers de maisons, 4/8/12). Suite existante inchangée (déterminisme,
seuils de blocs, repères 28/58, stabilité) : aucune régression, la
constante ne touche que le calcul interne du seuil, jamais le nombre ou
l'ordre des blocs. Vérifié aussi à l'œil : ville de test à population
1 (une maison), puis 4 (deuxième maison visible), captures à l'appui.

### Jalon 17 — Système de développement des villes (1/4) : choix d'activité et jauges — 27/09/2026

**Contenu.** Premier des quatre jalons du chantier validé par Adrien
(`docs/A-INTEGRER.md` §18, `docs/SYSTEME-DEVELOPPEMENT.md` §9 point 1) :
les 7 jauges de développement (Résidentiel, Industrie, Commerce,
Loisirs, Services, Énergie, Recherche), le choix d'une activité par
visite, la recommandation du maire, l'affichage des jauges. **Aucun
effet de jeu encore** (bonus/malus/manifestations/AntiVille : Jalon 18).

Deux points du document initial (rédigé le 23/09, avant le Jalon 13
ter) contredisaient des décisions déjà prises — **signalés à Adrien
plutôt que tranchés seul**, comme le demande `GUIDE-METHODE.md` :

1. Le document suppose qu'à chaque visite, le visiteur choisit une
   activité — mais depuis le Jalon 13 ter, visiter est devenu
   automatique et silencieux (2,5 s, aucun clic), exactement pour
   supprimer ce genre de friction. Adrien (27/09/2026) : **la visite
   reste 100 % automatique pour la population ; le choix d'activité
   est une action séparée et facultative, ensuite** — si le visiteur ne
   choisit rien, une activité est tirée au sort dès la visite (pas
   d'état "en attente" à gérer côté serveur).
2. Le document dit "le propriétaire ne peut pas se visiter lui-même,
   mais il a une contribution de maire gratuite par jour" — écrit avant
   que le Jalon 13 ter autorise l'auto-visite. Adrien : **se visiter
   soi-même suit exactement la même règle qu'une autre ville** (déjà
   vrai depuis le Jalon 13 ter) ; l'idée d'une "contribution de maire"
   séparée est abandonnée.

**Base de données** (migration `0023`, qui inclut aussi le retour au
flat +1 du Jalon 16 annulé — `visiter_ville()` réécrite en entier,
donc pas besoin de rejouer la `0022` séparément) :
- `visites.activite` (nullable, contrainte sur les 7 valeurs) : tirée
  au hasard par `visiter_ville()` parmi les activités débloquées pour
  le niveau de la ville (`§10 point 8` : Résidentiel/Loisirs dès le
  Hameau, Commerce/Services dès Village (1 000), Industrie/Énergie dès
  Bourg (5 000), Recherche dès Ville (15 000)).
- `choisir_activite_visite(visiteur, ville, activite)` : remplace
  l'activité de la **toute dernière** visite du joueur pour cette
  ville, seulement dans les 5 minutes qui suivent (fenêtre de grâce —
  largement assez pour le délai de 2,5 s côté client, sans laisser
  modifier une visite ancienne). Erreurs : `P0021` (pas de visite
  récente), `P0022` (activité invalide ou non débloquée).
- `cities.recommandation_activite` (nullable) + `definir_recommandation()` :
  réservée au propriétaire (vérifié côté SQL), même contrôle de
  déblocage que le choix d'activité.
- `jauges_ville(ville)` : jauge de chaque activité, formule du §3
  (`(élan + 20×part) / (élan_total + 20) / part`), "élan" = somme des
  points pondérée par une décroissance exponentielle de 3,3 %/jour
  (demi-vie ~3 semaines) calculée **à la volée** depuis `visites`
  plutôt que maintenue dans un compteur à part — même logique que
  `activite_ville()` (Jalon 9) : aucun job planifié nécessaire. Fenêtre
  de 180 jours (poids résiduel ~0,3 % au-delà, négligeable) pour borner
  le coût de la requête sur une ville ancienne et active.

**Code applicatif** : `src/lib/game/activites.ts` (les 7 activités,
parts cibles, seuils de déblocage par niveau, lecture des couleurs de
jauge — copie TypeScript de la même règle que le SQL, à tenir
synchronisée) ; `src/components/JaugesActivites.tsx` (affichage) ;
`/ville` gagne un petit formulaire pour que le maire choisisse sa
recommandation.

**Choix de conception revu en cours de route** (constaté en testant,
pas anticipé au départ) : la première version rattachait le choix
d'activité à `VisiteAutomatique.tsx`, affiché quelques secondes après
la confirmation de la visite avant que le panneau ne se rafraîchisse.
En testant, le rafraîchissement s'est avéré arriver bien plus vite que
prévu — le framework revalide la page dès que l'action serveur répond,
pas seulement après le délai choisi côté client — laissant une fenêtre
de choix trop courte et peu fiable pour qu'un joueur ait le temps de
cliquer. Plutôt que de chasser ce timing, le choix d'activité a été
détaché en un composant séparé et persistant,
`src/components/ChoisirActivite.tsx` : il lit l'activité réellement
enregistrée pour la dernière visite du joueur (donnée serveur, tant
qu'elle reste dans la fenêtre de grâce de 5 minutes de
`choisir_activite_visite()`) et l'affiche durablement ("Activité
choisie : 🏠 Résidentiel — Changer"), qu'il y ait eu zéro, un ou
plusieurs rafraîchissements entre-temps. `VisiteAutomatique.tsx` revient
à son rôle d'origine (confirmation de la visite elle-même, +1
population), sans rapport avec le choix d'activité.

**Bug trouvé et corrigé en cours de route** (sans lien direct avec le
choix de conception, une vraie régression) : avec la migration en
attente d'application, `/ville` interrogeait `cities.recommandation_activite`
(colonne pas encore créée), la requête échouait, `ville` devenait
`null`, et le code redirigeait vers `/ville/creer` — qui redirige lui
-même vers `/ville` dès qu'un profil existe : **boucle de redirection
infinie** pour tout compte existant, reproduite et confirmée dans les
logs du serveur de dev. Corrigé en distinguant "vraiment pas de
ville" (redirige) de "erreur de requête" (log l'erreur, affiche un
message générique, ne redirige jamais) — `src/app/ville/page.tsx`.
Cette distinction n'existait pas avant et aurait pu se reproduire à
n'importe quel jalon futur touchant `cities` ; corrigée une bonne fois.

**Testé.** `tests/unit/activites.test.ts` (10 tests : seuils de
déblocage par niveau, parts cibles = 100 %, bornes des 4 états de
jauge). `tests/e2e/jalon17-choisir-activite.spec.ts` (nouveau, 7
tests) : tirage aléatoire d'une activité débloquée pour un Hameau ;
`choisir_activite_visite` remplace le choix dans la fenêtre de grâce et
refuse une activité non débloquée (sans écraser le choix valide
précédent) ; échoue sans visite récente (aucune, ou trop ancienne) ;
l'auto-visite suit la même règle qu'une autre ville ; `definir_recommandation`
réservée au maire, refuse une activité non débloquée, accepte
d'effacer (`null`) ; `jauges_ville` vérifiée contre la formule calculée
à la main (10 visites Résidentiel un même jour) et contre la
décroissance attendue (élan résiduel ~0,5 après 21 jours, ni 1 ni 0) ;
un test UI vérifie que les jauges s'affichent et que l'activité choisie
reste visible et modifiable après une visite. Migration `0023`
appliquée par Adrien, confirmée par une vérification directe (gain
flat +1, activité tirée au sort, `jauges_ville` répond). Suite e2e
complète relancée : 50 tests verts (dont les 8 du Jalon 17 et les 4
fichiers touchés par le retour au flat +1) ; 7 échecs résiduels dans
des fichiers non touchés par ce jalon (Jalons 1, 4, 6bis, 8, 9, 10, 13),
même famille de flakiness environnementale déjà documentée (timeouts
génériques de connexion, scène 3D ralentissant le thread principal en
headless). Pollution de test croisée en cours de route et sans rapport
avec le jalon lui-même : des comptes `j17-ui-*` créés pendant le
débogage du composant de choix d'activité n'avaient pas été nettoyés
après un `test.setTimeout` forcé (le bloc `finally` n'a pas eu
l'occasion de s'exécuter) — nettoyés après coup, même rappel que
d'habitude sur les comptes de diagnostic créés manuellement.
Typecheck, lint, suite unitaire (84 tests) et build (poids inchangé)
verts.

### Jalon 18 — Système de développement des villes (2/4) : les effets de l'équilibre — 27/09/2026

**Contenu.** Deuxième des quatre jalons du chantier
(`docs/A-INTEGRER.md` §18) : branche les bonus/crises des 7 activités
(§4), les manifestations (§5) et le lien AntiVille (§6bis) posés sans
effet au Jalon 17. Périmètre volontairement resserré — voir l'en-tête
de la migration `0024` pour le détail complet — en laissant de côté
les mégaprojets/stocks/technologies (§6, Jalon 20), la vocation des
quartiers (Jalon 19), et deux effets purement cosmétiques renvoyés en
points ouverts (§10 points 34 et 35 : gratte-ciel qui se figent en
crise Énergie, fumée 3D au palier Émeutes / notification du pays au
palier Crise).

**Grève redéfinie par Adrien (27/09/2026), signalé plutôt que tranché
seul.** Le document initial (23/09) se contredisait entre "bloque
24 h, durée modulée par l'Industrie" (tableau) et "−0,1 % d'influence
par attaque, cumulé" (liste des effets unitaires) — deux mécaniques
different. Adrien tranche : une échelle selon le nombre CUMULÉ
d'actions grève reçues aujourd'hui (tous attaquants, pas par
attaquant) — 1 action → bloque 1 h, 5 → 2 h, 20 → 5 h pour un Hameau,
ajustée par la taille de la ville ("plus la ville est grosse, plus il
faudra d'actions"). Formule retenue pour relier ces trois points
(chiffres exacts délégués à Claude Code) : racine carrée du nombre
d'actions divisé par un facteur de taille calqué sur l'échelle des
niveaux (1/2/5/10/25/50 du Hameau à la Métropole) —
`duree_blocage_greve_heures()`, à ajuster avec les villes de test.
L'Industrie continue de moduler cette durée (jusqu'à −60 % en point
fort, +50 % en crise).

**L'ancienne "protection anti-harcèlement"** (par paire attaquant/cible,
2 attaques en 24h → effet réduit, 3e bloquée, code P0003) est
**entièrement remplacée** par le nouveau système de paliers cumulés
PAR VILLE (tous attaquants confondus) — une attaque isolée pèse peu
(effet unitaire minuscule : contamination −0,01 % au moins 1,
propagande −0,1 % au moins 1), une attaque massive coordonnée pèse
lourd (effets qui s'additionnent, plafonnés à 10 %/jour pour
contamination et propagande). Paliers visibles : Incidents (1-9
attaques/jour) → Troubles (10-99) → Émeutes (100-499) → Crise
(500-999) → Ville sinistrée (1000+, plafond atteint, plus aucune perte
jusqu'au lendemain). P0003 devient inutilisé (même précédent que
P0005) ; le quota par attaquant (3/jour) et l'anti-rafale (2 s, Jalon
14) restent inchangés — protections différentes, pas remplacées.

**Formules retenues pour les effets progressifs** (§4 : "montent de 0
à leur maximum entre 60 % et 150 % de jauge, plafonnés") — la
lecture du document laissait une ambiguïté entre une progression
continue sur toute la plage et deux effets séparés ancrés à 60 %/150 % ;
retenu : deux fonctions symétriques,
`intensite_crise(jauge)` = 0 à 60 % → 1 à 0 % ; `intensite_point_fort(jauge)`
= 0 à 120 % → 1 à 150 % (et au-delà, plafonné) — la zone 60-120 %
(Fragile + Équilibré) n'a par construction aucun effet numérique, elle
ne fait qu'avertir visuellement (cohérent avec le tableau §4, qui ne
liste que "Point fort" et "Crise", jamais "Fragile"). Chaque effet du
tableau applique cette intensité à son maximum donné (ex. Industrie
point fort : durée × (1 − 0,6 × intensité) ; Énergie crise :
risque de manifestation × (1 + intensité)) — sauf indication contraire
explicite du document : le Résidentiel garde sa formule propre
(probabilité = jauge ÷ 60 %, donnée telle quelle) et le Commerce en
crise perd le bonus de jumelage de façon binaire ("pas de bonus", pas
de "jusqu'à").

**Solidarité** (§6bis, "optionnel, à valider" dans le document, mais
confirmée gardée par `A-INTEGRER.md` §18/§10 point 6) : si une visite
choisit (au hasard ou explicitement, via `choisir_activite_visite`)
l'activité qui protège contre le type de la dernière attaque reçue
dans les 24h, +1 habitant de plus (+2 au palier Émeutes et au-delà,
"solidarité doublée pour les défenseurs"). Une seule fois par visite
(`visites.bonus_solidarite_applique`), jamais retiré si l'activité
change ensuite.

**Manifestations** (§5) : pas de tâche planifiée dans ce projet (même
choix que `activite_ville()`, Jalon 9, et `verifier_president()`,
Jalon 11) — `verifier_manifestation()` est appelée de façon
opportuniste à chaque affichage de la page d'une ville (`/ville` et
`/villes`), idempotente via `cities.derniere_verification_manifestation`.
Risque = +10 points par activité en crise (+20 pour l'Énergie),
divisé progressivement si l'Énergie est en point fort ; perte de 1 %
des habitants (plancher 1), réduite/aggravée par les Loisirs, jamais
plus d'une fois par ville et par jour. Une ville équilibrée n'a
jamais de manifestation.

**Bulletin municipal** : nouvelle table `city_events` (lecture
publique, comme `cities`), remplie par `lancer_action_antiville()` et
`verifier_manifestation()`. Affiché en bas du panneau détail sur
`/villes` et `/ville` (`BulletinMunicipal.tsx`) — dernières
manifestations et attaques reçues, sans jamais mélanger avec les
lignes "vérifié, rien trouvé" (idempotence gérée par une date sur
`cities`, pas par une ligne `city_events` à blanc — sinon le bulletin
se serait rempli de bruit).

**Bug trouvé et corrigé en cours de route** (pas un choix de
conception, une régression réelle du Jalon 17 mise au jour en
préparant ce jalon) : le message de confirmation de visite
(`VisiteAutomatique.tsx`) affichait toujours "+1 population", recopié
depuis une prop statique calculée AVANT la visite — jamais le vrai
gain renvoyé par le serveur. Sans conséquence tant que le gain était
garanti (avant ce jalon), mais devenu trompeur dès que le Résidentiel
peut être en crise (gain réellement à 0 alors que l'UI annoncerait
"+1"). `visiter_ville()` change de type de retour (jsonb avec le gain
réel inclus) pour corriger ça — voir la note sur `drop function`
ci-dessous.

**Base de données** (migration `0024`, ~820 lignes — la plus grosse du
projet à ce jour) :
- `visiter_ville()` : type de retour changé en `jsonb` (gain réel,
  jamais garanti) → `drop function` avant `create` (piège habituel des
  changements de type de retour, voir Jalons 8/13/16). `lancer_action_antiville()`,
  `choisir_activite_visite()`, `reclamer_bonus_jumelages()`,
  `influencer_ville()` : signature et type de retour inchangés,
  `create or replace` direct.
- Nouvelles fonctions utilitaires pures : `jauge_activite()` (une
  seule jauge, wrapper de `jauges_ville()`), `intensite_crise()`,
  `intensite_point_fort()`, `activite_protectrice()`,
  `attaques_recues_aujourdhui()`, `palier_attaques()`,
  `ratio_taille_ville()`, `duree_blocage_greve_heures()`.
- `visites.bonus_solidarite_applique`, `cities.derniere_verification_manifestation`,
  `actions_antiville.duree_heures` (nouvelles colonnes).

**Testé.** `tests/unit/antiville.test.ts` (2 tests : bornes exactes des
6 paliers, copie TypeScript de `palier_attaques()`).
`tests/e2e/jalon18-effets-equilibre.spec.ts` (nouveau, 9 tests) :
palier cumulé tous attaquants confondus ; plafond de 10 %/jour pour la
contamination (12 attaques sur une ville à 100 habitants, jamais plus
de 10 perdus) ; durée de grève dépendante du cumul du jour ; crise du
Résidentiel (ville poussée en crise profonde via un historique de
visites synthétique — voir `gonflerActivite()`, contourne la
contrainte unique `(visiteur_id, ville_id, jour)` avec des dates
différentes plutôt que des centaines de comptes — puis 15 vraies
visites, gain total < 15 avec une probabilité d'échec du test
≈ 3×10⁻¹¹ si la crise n'a plus d'effet) ; solidarité (accordée une
fois, pas deux) ; crise du Commerce sur le bonus de jumelage (une
ville touchée, l'autre non) ; `verifier_manifestation` neutre et
idempotente sur une ville équilibrée, puis déclenchée sur au moins une
de 8 villes en crise profonde indépendantes (probabilité d'échec
≈ 2,6×10⁻⁶) ; point fort Recherche sur l'influence (15 essais,
probabilité d'échec ≈ 3×10⁻⁵ si le doublement n'existe plus). Tests
existants audités et mis à jour : `jalon4-rivalites-de-quartier.spec.ts`
(protection anti-harcèlement remplacée par une vérification que le
même attaquant peut désormais frapper la même cible plusieurs fois de
suite) ; `jalon8bis-palmares.spec.ts` et `jalon6-donnees-rendu-3d.spec.ts`
(commentaires et formule de calcul de la perte attendue mis à jour —
la valeur numérique elle-même ne changeait pas pour une ville de test
à très petite population, coïncidence du plancher "au moins 1").
Typecheck, lint, suite unitaire (86 tests) et build (poids inchangé,
182 Ko max) verts.

**Bug trouvé après application de la migration** (vérification directe
par RPC, avant même de relancer la suite e2e) : le plafond quotidien de
perte (10 % de la population/influence **avant** l'attaque) valait 0
quand cette valeur de départ était nulle ou très petite — 10 % de
presque rien s'arrondit à 0, donc une ville neuve (0 influence)
devenait **immunisée** contre toute propagande, même la toute première
attaque du jour. Corrigé par un plancher `greatest(1, ...)` sur le
plafond lui-même (migration corrective `0025`, appliquée par Adrien) —
cohérent avec le plancher "au moins 1" déjà appliqué à l'effet unitaire
de chaque attaque.

**Suite e2e complète relancée après les deux migrations** : 73 tests
verts (dont les 9 du Jalon 18). Deux échecs rencontrés en cours de
route, tous deux sans rapport avec ce jalon : `jalon13-france-contre-allemagne.spec.ts`
(donnée résiduelle d'un run interrompu plus tôt dans la session — une
ligne `conflits` Argentine/Mexique jamais nettoyée — supprimée
manuellement, le test repasse ensuite) ; `jalon8-se-classer.spec.ts`
(flakiness déjà documentée à plusieurs reprises dans ce journal, "rang
national dynamique"). Un des 9 tests du Jalon 18 lui-même
(`crise du Résidentiel`) a d'abord échoué à son tour : le calcul à la
main dans son commentaire s'est avéré faux (élan d'une seule activité
gonflée ≈ 30, jauge Résidentiel ≈ 40 %, probabilité de gain ≈ 67 % —
pas assez creusé pour rendre 15 succès sur 15 improbable). Corrigé en
gonflant trois activités au lieu d'une (élan total ≈ 90, jauge ≈ 18 %,
probabilité ≈ 30 %, probabilité d'échec du test ≈ 1,4×10⁻⁸) — vérifié
fiable sur plusieurs relances.

### Jalon 19 — Système de développement des villes (3/4) : quartiers et bâtiments 3D — 27/09/2026

**Contenu.** Troisième des quatre jalons du chantier : la vocation de
chaque bloc (§7 — résidentiel, industrie, commerce, loisirs, services,
recherche, une fois pour toutes à l'ouverture du bloc) et les nouveaux
bâtiments 3D qui vont avec, plus l'Énergie hors de la ville (panneaux
solaires, éoliennes, puis centrale, dans la campagne autour). Adrien a
été interrogé explicitement sur l'ampleur du jalon avant de commencer
(les 5 nouvelles vocations de quartier représentent d'un coup plus de
nouveaux bâtiments que tous les jalons précédents cumulés) et a choisi
la **version complète** (progression à deux étapes pour chacune, plutôt
qu'un seul stade fixe).

**Portée réduite assumée, à signaler explicitement : deux étapes par
vocation de quartier, pas trois ou quatre.** Le document (§7) décrit
jusqu'à 4 étapes par activité ("entrepôts et ateliers, puis usines et
cheminées, puis grand complexe" pour l'Industrie, "école puis
université, campus, laboratoires" pour la Recherche, etc.), à la
manière des maisons → immeubles → tours du Résidentiel. Implémenté ici
avec seulement **deux étapes** ("simple", puis "développée") par
vocation — moins riche que ce qu'Adrien a validé en choisissant
"version complète". Compromis choisi par Claude Code pour livrer les
6 vocations (5 quartiers + Énergie hors-ville) avec une silhouette et
une couleur clairement distinctes chacune, dans un temps raisonnable,
plutôt que 2-3 vocations à 4 étapes chacune. Loisirs suit son propre
schéma proche du document (parc, comme avant le Jalon 6bis, puis un
stade simplifié) ; les 4 autres (Industrie, Commerce, Services,
Recherche) ont chacune un bâtiment "simple" et un bâtiment "développé"
avec une silhouette/couleur/accessoire dédiés (silo pour l'Industrie,
enseigne et vitrine pour le Commerce, croix pour les Services, dôme
pour la Recherche). **À valider par Adrien** : garder ces deux étapes,
ou demander d'aller vers 3-4 étapes par vocation dans un futur passage.

**Blocs identifiés par RANG, jamais par coordonnées (bi, bj).**
L'ordre d'ouverture des blocs (`planifierBlocs()`, distance au centre +
aléa stable par ville) est déjà une fonction pure de la graine et de la
population — le dupliquer en SQL (avec son générateur pseudo-aléatoire)
aurait été fragile et inutile. La nouvelle table `city_blocks` retient
donc seulement `(ville_id, rang, vocation)` ; le rang k du client
(`planifierBlocs()`) correspond exactement au rang k stocké en base.

**Algorithme d'assignation** (§7, "l'activité la plus en retard entre
sa part de points et sa part de blocs, le résidentiel garde au moins la
moitié des blocs") : `assigner_vocations_blocs()`, appelée de façon
opportuniste à chaque affichage d'une ville (même logique que
`verifier_manifestation()`), idempotente — ne retouche jamais un bloc
déjà en base. Entièrement déterministe (aucun tirage au sort,
contrairement aux mécaniques du Jalon 18) : à élan nul partout, la
séquence des 8 premiers blocs est toujours résidentiel, commerce,
résidentiel, industrie, résidentiel, loisirs, résidentiel, recherche —
départage alphabétique stable entre les 5 activités de quartier à
égalité. Testé valeur par valeur plutôt que statistiquement (voir Testé
ci-dessous).

**Énergie, hors de la ville** (§7) : pas de bloc dans la ville, des
installations dans la campagne autour (éoliennes et panneaux solaires),
en nombre proportionnel à l'élan de l'activité (`jauges_ville()`), puis
une centrale au-delà d'un seuil. Emplacements tirés une fois par ville
(un générateur par indice, comme les forêts de `buildCountryside()`) :
une installation déjà visible ne se déplace jamais quand l'élan
grandit, et une position avalée par la ville en grandissant est
simplement sautée (même dégradation que les forêts). Seuils choisis par
Claude Code (un repère tous les 4 points d'élan, comme
`HABITANTS_PAR_LOGEMENT_MAISON`, jusqu'à 24 installations, centrale à
partir de 100) — **à ajuster avec les villes de test si besoin**, comme
les autres chiffres délégués des Jalons 17-18.

**Le gratte-ciel reste une règle strictement résidentielle** (§7 : "la
règle actuelle maisons → immeubles → tours reste celle des blocs
résidentiels") : un bloc de quartier n'a jamais de chantier de
gratte-ciel, cet emplacement reste un square public en permanence.

**Base de données** (migration `0026`, nouvelle table `city_blocks` +
deux fonctions) :
- `city_blocks(id, ville_id, rang, vocation, created_at)`, lecture
  publique (comme `cities`), jamais écrite depuis le client.
- `nb_blocs_ouverts(population)` : copie SQL de la table de seuils
  `BLOCK_OPEN`/`openAtK()` (`src/lib/ville3d/constantes.ts`) — à tenir
  synchronisée si ces seuils changent côté 3D.
- `assigner_vocations_blocs(ville_id)` : voir l'algorithme ci-dessus.
  Aucun nouveau code d'erreur (rien d'appelable directement par un
  joueur).

**Câblage 3D** : `generate()` et `planifierBlocs()` (`generer.ts`)
prennent désormais des paramètres optionnels `vocations` (Map rang →
vocation) et `elanEnergie`, absents = dégradation propre vers
"tout résidentiel, pas d'installation Énergie" (ville dont les blocs
n'ont pas encore de vocation assignée, ou plus vieille que ce jalon).
`buildBlock()` (`terrain.ts`) branche sur `b.vocation` pour choisir les
bâtiments de chaque parcelle et ne jamais construire de gratte-ciel
hors résidentiel. Câblé bout en bout uniquement sur les deux pages qui
affichent une ville précise avec ses vraies données (`/ville`,
`/villes`) — pas sur les pages de vitrine/classement (accueil,
classement, jumelages, palmarès, aperçu de création), qui continuent
d'afficher une ville générique tout-résidentiel (même choix que
`verifier_manifestation()`, jamais appelée non plus sur ces pages).

**Testé.** Vérification directe du générateur (script jetable, en
dehors du pipeline de test — comparaison des couleurs de sommets
générées aux palettes attendues) avant toute vérification visuelle,
après une fausse alerte : le premier essai dans le navigateur semblait
montrer une ville inchangée malgré les nouveaux paramètres, à cause
d'un état de Fast Refresh périmé (tableau de dépendances de
`useEffect` qui change de taille) — un nouvel onglet a suffi à lever le
doute, et la vérification programmatique a confirmé que les couleurs
des 5 palettes de quartier étaient bien présentes dans la géométrie
produite. Vérification visuelle ensuite dans le navigateur : éolienne
bien visible dans la campagne, bâtiment à bandeau rouge (Commerce),
volumes à toit plat distincts des maisons/immeubles, dôme bleuté
(Recherche). `tests/unit` existants (86 tests, dont la géométrie
déterministe) toujours verts sans modification — la signature de
`generate()` reste rétrocompatible (nouveaux paramètres optionnels).
`tests/e2e/jalon19-quartiers.spec.ts` (nouveau, 5 tests) : premier bloc
toujours résidentiel ; séquence déterministe des 8 premiers blocs à
élan nul ; une activité dont l'élan domine passe devant l'ordre
alphabétique par défaut ; idempotence (deuxième appel sans effet) ;
une ville qui grandit n'ajoute que des blocs, sans jamais retoucher
ceux déjà ouverts. Migration `0026` appliquée par Adrien, les 5 tests
vérifiés verts contre la vraie base, puis suite complète relancée :
79/80 verts, seul échec `jalon8-se-classer.spec.ts` ("rang national
dynamique", flakiness pré-existante déjà documentée plus haut dans ce
journal, sans lien avec ce jalon — confirmé en reproduisant le même
échec avec les changements de ce jalon mis de côté via `git stash`).

**Retour de test d'Adrien, deux corrections (`docs/A-INTEGRER.md` §20,
27/09/2026)** :

**A. Niveau de détail des quartiers, repris.** Le niveau "2 étapes"
signalé comme portée réduite ci-dessus a été jugé insuffisant par
Adrien après test en ligne, en particulier pour l'Énergie (éolienne
trop minimaliste) et l'Industrie. Repris avec un **niveau numérique
0/1/2** (au lieu du booléen `developpe`) pour Industrie, Commerce,
Services et Recherche — 0 simple, 1 développée, 2 grand complexe —, le
niveau 2 atteint `QUARTIER_NIVEAU2_APRES` (10 000, chiffre à ajuster
comme d'habitude) habitants après le déblocage du niveau 1, même
logique de progression que `APART_FLOOR_EVERY` pour les immeubles :
pas de nouvelle architecture de blocs, juste plus de richesse dans les
deux emplacements de lot déjà existants (maisons/immeubles). Ajouts
par vocation, dans l'esprit "plusieurs éléments optionnels tirés au
sort" déjà utilisé par les maisons (`buildHouse()`) plutôt qu'une
géométrie mise à l'échelle : Industrie (lanterneaux de toit, cheminée
fumante, réservoirs, palettes, clôture, camion garé) ; Commerce
(second bandeau, parvis + voitures + climatiseurs en toiture) ;
Services (aile secondaire + repère héliporté sur le toit, ambulance) ;
Recherche (second dôme, panneaux solaires en toiture, antenne).
Énergie (`energie.ts`) : éolienne agrandie et bien plus détaillée (mât
à bande d'avertissement, nacelle à nez + balise clignotante, pales à
deux segments), panneaux solaires posés en petite ferme de 3 à 5
unités au lieu d'une seule, centrale avec un second réservoir, un
bâtiment technique séparé, une clôture et des pylônes de raccordement
vers la ville.

**B. Choix d'activité verrouillé après un premier choix explicite.**
`choisir_activite_visite()` acceptait d'être rappelée plusieurs fois
dans sa fenêtre de grâce de 5 minutes, en écrasant à chaque fois le
choix précédent — Adrien veut qu'un choix explicite soit définitif.
Nouvelle colonne `visites.activite_verrouillee` (faux par défaut, donc
le tirage au sort automatique de `visiter_ville()` n'est pas
concerné : il reste remplaçable une fois) ; `choisir_activite_visite()`
refuse désormais un second appel sur la même visite (nouveau code
`P0023`, suite de P0021/P0022) — migration corrective `0027`. Côté
client, `ChoisirActivite.tsx` reçoit une nouvelle prop `verrouillee` et
masque le bouton "Changer" dès que le choix est verrouillé, sur
`/ville` et `/villes`.

**Testé (correctifs).** Deux nouveaux tests dans
`tests/e2e/jalon17-choisir-activite.spec.ts` (fichier qui teste déjà
cette fonction) : un choix explicite verrouille la visite et un second
choix — pourtant valide — est refusé (`P0023`) sans écraser le
premier ; le test UI existant du même fichier étendu pour vérifier que
le bouton "Changer" disparaît après un choix. Le niveau de détail des
quartiers (A) n'est pas testé automatiquement au-delà de la géométrie
déterministe déjà couverte (`ville3dGenerer.test.ts`) : vérifié comme
au premier passage, par script jetable (présence des nouvelles
couleurs/matériaux dans la géométrie produite pour la configuration
réelle de Belval-sur-Loire) puis contrôle visuel dans le navigateur
(repères héliportés visibles sur plusieurs bâtiments Services, silos
et accent Industrie visibles, dôme Recherche visible) — les
installations Énergie n'ont pas pu être repérées visuellement dans le
temps disponible (positionnées loin dans la campagne, hors du champ de
caméra exploré), confirmées uniquement par la vérification
programmatique.

### Jalon 20 (1/3) — Système de développement des villes (4/4) : les mégaprojets du maire — 27/09/2026

**Contenu.** Premier des trois sous-jalons du dernier chantier du
système de développement (mégaprojets, puis technologies de Recherche,
puis monuments d'influence — Adrien, 27/09/2026 : « un sous-jalon à la
fois »). Le maire choisit un mégaprojet parmi 3-4 à chaque palier de
population (Bourg 5 000, Ville 15 000, Grande ville 40 000, Métropole
100 000, Mégapole 250 000, puis un palier de plus tous les 50 000) ;
les visiteurs le financent (matériaux/revenus accumulés + points de
l'activité du thème) ; une fois financé, un bâtiment apparaît et — pour
4 des ~18 projets — un bonus permanent s'applique.

**Portée assumée, signalée avant de commencer** (Adrien a confirmé
cette approche via `AskUserQuestion`) : le mécanisme complet pour tous
les paliers dès cette passe, mais des bâtiments 3D volontairement
simples (un socle + une silhouette parmi trois archétypes + une
couleur d'accent selon l'activité du thème — pas encore le niveau de
détail des maisons/quartiers), et seuls les 4 mégaprojets où le
document donne un chiffre exact ont un effet numérique câblé : Stade
(pertes de manifestation ×0,75), Centrale solaire/Parc éolien/Centrale
(élan Énergie ×1,2, cumulatif), Hôpital (contamination ÷2 en plus de la
défense existante), Opéra (propagande ÷2 en plus de la défense
existante). Les autres (dont Zone logistique, dont le bonus documenté
dépend d'une "pause pendant la grève" qui n'existe pas pour les
stocks — pas construite dans cette passe, point ouvert) restent
purement cosmétiques pour l'instant, comme les monuments d'influence.

**Stocks calculés à la volée, pas de compteur à part** (même logique
que `jauges_ville()`/`activite_ville()`) : les matériaux et les revenus
sont un simple `count(*)` sur `visites.activite` ('industrie'/'commerce'),
**sans la fenêtre de 180 jours des jauges** — contrairement à l'élan,
un stock "s'accumule et ne redescend jamais" (§6), seule la dépense (à
la construction d'un mégaprojet) est retenue, sur deux nouvelles
colonnes `cities.materiaux_depenses`/`revenus_depenses`. Les points de
l'activité du thème d'un mégaprojet comptent "à partir du choix" (§6) :
comptés depuis `megaprojets.choisi_le`, jamais avant.

**Catalogue de la Mégapole (palier 4) et au-delà inventé par Claude
Code**, comme autorisé par la réponse d'Adrien du 26/09/2026
("peuvent reprendre des variantes des paliers précédents en
attendant") : Grand stade (loisirs), Centrale nouvelle génération
(énergie), Siège international (commerce) — mêmes 3 options réutilisées
à chaque palier au-delà de la Mégapole, coûts ×1,5 par palier
supplémentaire comme demandé. Tour emblématique (Métropole, sans
activité de thème dans le tableau du document) : activité de thème
fixée à Résidentiel par Claude Code, faute de mieux précisé.

**Emplacement des bâtiments en 3D** : juste à l'extérieur de la ville
(le document ne précise pas où), à une distance qui dépend du **palier**
et non du rayon courant de la ville — sinon un mégaprojet déjà construit
se serait éloigné du centre à chaque fois que la ville grandit ensuite.
Positions fixes par ville et par palier (un générateur par palier,
même logique que les installations d'Énergie), sans vérification de
collision avec les blocs résidentiels/quartiers (simplification
assumée, risque réel mais faible vu le petit nombre de mégaprojets par
ville).

**Base de données** (migration `0028`) :
- `cities.materiaux_depenses`, `cities.revenus_depenses` (nouvelles
  colonnes).
- `city_events.type` : nouvelle valeur `megaprojet_construit` (contrainte
  CHECK réécrite).
- `megaprojets(id, ville_id, palier, type, statut, choisi_le, construit_le)`,
  lecture publique, `unique (ville_id, palier)` — un palier, un projet,
  jamais retouché (même philosophie que `city_blocks`, Jalon 19).
- Nouvelles fonctions utilitaires pures : `stock_ville()`,
  `megaprojet_options()`, `seuil_megaprojet()`, `nb_megaprojets_ouverts()`,
  `cout_megaprojet()`, `nb_megaprojets_construits()`.
- `choisir_megaprojet()` : réservé au maire, nouveaux codes d'erreur
  **P0024** (palier pas encore débloqué), **P0025** (palier déjà
  choisi), **P0026** (type invalide pour ce palier).
- `avancer_megaprojets()` : construit les chantiers financés, appelée
  de façon opportuniste à chaque affichage d'une ville (même logique
  que `assigner_vocations_blocs()`/`verifier_manifestation()`).
- `etat_megaprojets()` : lecture pour l'affichage (progression).
- `jauges_ville()`, `verifier_manifestation()`, `lancer_action_antiville()` :
  signatures inchangées, `create or replace` direct, modifiées pour les
  4 bonus ci-dessus.

**Interface** : nouveau composant `Megaprojets.tsx` (liste des
chantiers en cours/construits avec barres de progression matériaux/
revenus/points, et pour le maire un choix parmi 3-4 boutons dès qu'un
palier se débloque), affiché sur `/ville` (maire) et `/villes` (panneau
détail, lecture seule pour un visiteur). Bulletin municipal
(`BulletinMunicipal.tsx`) étendu pour le nouvel événement
`megaprojet_construit`.

**Testé.** `tests/unit/megaprojets.test.ts` (nouveau, 8 tests) : parité
du mirroir TypeScript (`src/lib/game/megaprojets.ts`) avec les formules
SQL (seuils, catalogue, coûts). `tests/e2e/jalon20-megaprojets.spec.ts`
(nouveau, 5 tests) : refus palier non débloqué/type invalide/non-maire ;
financement complet (stocks + points du thème depuis `choisi_le`,
dépense exacte, idempotence, événement de bulletin) ; bonus Hôpital et
Opéra (comparés sur deux villes jumelles, l'une avec le mégaprojet
construit directement inséré, l'autre non — anti-rafale de 2 s du
Jalon 14 contournée avec deux attaquants distincts plutôt qu'un seul) ;
bonus Centrale solaire sur l'élan Énergie. Migration `0028` appliquée
par Adrien, les 5 tests vérifiés verts contre la vraie base, puis suite
complète relancée : 83/86 verts, les 3 échecs tous la flakiness
pré-existante déjà documentée plus haut dans ce journal, sans rapport
avec ce jalon. Typecheck, lint et suite unitaire (94 tests) vérifiés
verts après chaque étape.

### Jalon 20 (2/3) — Système de développement des villes (4/4) : les technologies de Recherche — 27/09/2026

**Contenu.** Deuxième des trois sous-jalons du dernier chantier. "Tous
les paliers de points de Recherche cumulés (100, 300, 800, 2 000,
5 000, puis ×2), une technologie se débloque. Elle est surtout
visuelle" (§6). Contrairement aux mégaprojets (1/3), **aucun choix du
maire** : un seul stock (les points de Recherche déjà accumulés, même
fonction `stock_ville()` que les mégaprojets) qui débloque
automatiquement chaque palier — mécanique nettement plus simple, pas
de dimension "matériaux/revenus" à financer en parallèle.

**Catalogue des 5 premiers paliers choisi par Claude Code**, dans
l'ordre où le document les cite : éclairage public LED, panneaux
solaires sur les toits, tramway, toits végétalisés, drones. Les
paliers suivants (×2 à chaque fois au-delà de 5 000) n'ont pas encore
d'effet visuel défini — point ouvert, même logique que les mégaprojets
sans bonus câblé. Le nom de chaque technologie ne vit que côté
TypeScript (`src/lib/game/technologies.ts`) : la table ne retient que
le palier (0 = LED, 1 = panneaux, etc.), à tenir synchronisé.

**Effets 3D, volontairement simples** (même philosophie que les
mégaprojets 1/3) : lampadaires en teinte froide (LED) ; petits panneaux
et patch végétalisé approximatifs sur le toit des immeubles
(volontairement **pas** sur les tours, dont le toit a déjà son propre
traitement héliport/antenne — superposer aurait été confus) ; rails et
quelques rames sur les deux grands axes centraux (tramway) ; quelques
drones de livraison en vol à position fixe par ville (générateur par
indice, même logique que les installations d'Énergie). Aucun bonus
numérique câblé pour cette première passe ("avec parfois un petit
bonus" du document reste vague) — purement visuel, comme la plupart des
mégaprojets.

**Bug trouvé et corrigé avant l'envoi, pas après cette fois** (en
préparant ce sous-jalon, avant même d'écrire la migration
correspondante) : `stock_ville()` et `etat_megaprojets()` (Jalon 20
1/3, migration `0028`) n'étaient pas `security definer`. Un visiteur
authentifié appelant `etat_megaprojets()` directement pour afficher la
progression d'un chantier ne voyait, à travers la policy RLS
`visites_lecture_propre` (`auth.uid() = visiteur_id`), que **ses
propres visites** — les barres de matériaux/revenus/points auraient
été très sous-comptées pour toute ville avec plusieurs visiteurs.
`jauges_ville()` avait déjà `security definer` pour la même raison
depuis le Jalon 17 ; `avancer_megaprojets()` n'était pas concerné (déjà
`security definer`, donc déjà correcte pour la vraie construction) —
seul l'AFFICHAGE de la progression était faux. Corrigé en tête de la
migration `0029` (avant qu'elle ne soit envoyée à Adrien, donc jamais
appliquée en l'état buggé).

**Base de données** (migration `0029`) :
- Correctif ci-dessus sur `stock_ville()`/`etat_megaprojets()`.
- `city_events.type` : nouvelle valeur `technologie_debloquee`
  (contrainte CHECK réécrite) — sans bulletin, un joueur ne saurait pas
  qu'une technologie vient de se débloquer (cahier des charges §31,
  "on comprend l'action en moins d'une minute").
- `technologies(id, ville_id, palier, debloquee_le)`, lecture publique,
  `unique (ville_id, palier)`.
- `seuil_technologie()`, `avancer_technologies()` (opportuniste, même
  logique que `assigner_vocations_blocs()`/`avancer_megaprojets()`,
  boucle qui termine toujours car `seuil_technologie()` est strictement
  croissant).

**Interface** : nouveau composant `Technologies.tsx` (lecture seule —
liste des technologies débloquées + progression vers la prochaine),
affiché sur `/ville` et `/villes`. Bulletin municipal étendu pour
`technologie_debloquee`.

**Testé.** `tests/unit/technologies.test.ts` (nouveau, 6 tests) :
parité du mirroir TypeScript avec les formules SQL, plus
`technologiesDepuisPalier()` (dérive les 5 booléens depuis le nombre de
paliers débloqués). `tests/e2e/jalon20-technologies.spec.ts` (nouveau,
2 tests, écrits mais **pas encore exécutés** — migration `0029` pas
encore appliquée par Adrien au moment de l'écriture) : déblocage
progressif (plusieurs paliers d'un coup si les points le permettent),
bulletin par palier, idempotence ; **régression ciblée sur le bug
ci-dessus** — `stock_ville()`/`etat_megaprojets()` appelées par un
client authentifié (pas service_role) voient bien les visites de
tous les visiteurs, pas seulement les siennes. Vérification
programmatique du rendu 3D (script jetable, comme aux Jalons 19/20 1/3) :
présence de la couleur LED et augmentation du nombre de sommets avec
les 5 technologies actives, aucun NaN. Contrôle visuel dans le
navigateur : lampadaires en teinte froide bien visibles ; rails,
panneaux de toit et drones **pas repérés à l'œil** dans le temps
disponible (rendu nocturne, géométries fines sur fond sombre) —
confirmés uniquement par la vérification programmatique, comme
certains éléments du Jalon 19. Migration `0029` appliquée par Adrien ;
premier essai des 2 tests en échec (bug de timing dans le test
lui-même — les visites de la vérification RLS étaient insérées avant
`choisi_le` du mégaprojet, donc hors de la fenêtre de comptage des
points), corrigé, les 2 tests vérifiés verts contre la vraie base
ensuite, puis suite complète : 84/88 verts (échecs = flakiness de
connexion déjà documentée, sans rapport). Typecheck, lint et suite
unitaire (100 tests) vérifiés verts.

**Hors-jalon, traité le même jour** : `docs/A-INTEGRER.md` §21 (Adrien,
précision sur l'affichage des jauges d'activité) — après clarification,
Adrien confirme ne changer que l'affichage, pas le calcul ni les
seuils du Jalon 18 ("c'est très bien comme ça, ça ne change rien").
`JaugesActivites.tsx` : l'état (Crise/Fragile/Équilibré/Point fort)
devient le texte principal, le pourcentage exact passe en infobulle
(`title`). Pur front-end, aucune migration, aucun test cassé.

### Jalon 20 (3/3) — Système de développement des villes (4/4) : les monuments d'influence — 27/09/2026

**Contenu.** Dernier des trois sous-jalons — et donc dernier jalon du
chantier "système de développement des villes" ouvert au Jalon 17.
`docs/A-INTEGRER.md` §19 : des monuments (bornes, statues, arches...)
débloqués automatiquement par paliers d'**influence record**, jamais
retirés même si l'influence courante rebaisse ensuite. Mécaniquement
très proche des technologies (2/3) — aucun choix du maire, aucun
financement, déblocage automatique — mais un **catalogue fini de 16
paliers** (10 à 1 000 000, cf. §19), pas de "puis ×2" à l'infini
au-delà comme les mégaprojets/technologies.

**`cities.influence_max`, nouveau record jamais décroissant** — même
principe que `population_max`. Comme ce projet maintient ces records
**en ligne, explicitement, dans chaque fonction anti-triche** plutôt
que via un trigger caché (cohérent avec le reste du code), les deux
seules fonctions qui touchent `cities.influence` aujourd'hui —
`influencer_ville()` et `lancer_action_antiville()` (branche
propagande) — sont recréées pour maintenir `influence_max` en même
temps. Une perte de propagande ne peut jamais faire reculer le record
(pas besoin d'écrire `greatest(influence_max, ...)` dans cette
branche : ce serait un no-op).

**Catalogue des 16 paliers repris tel quel du document** (§19) :
borne commémorative, banc public, fontaine simple, buste, obélisque,
arc de triomphe miniature, horloge municipale, fontaine monumentale,
statue équestre, mur des remerciements, arche monumentale,
tour-observatoire, statue emblématique, temple national, statue
géante, monument ultime.

**Bâtiments 3D, plus modestes que les mégaprojets** — même philosophie
"simple d'abord", mais volontairement plus petits et plus sobres (une
borne ou un buste n'est pas un bâtiment civique) : un socle, une
silhouette parmi trois archétypes (colonne/obélisque, statue/buste,
arche/fontaine) selon le type, une teinte dorée/bronze commune plutôt
que liée à une activité (les monuments ne sont rattachés à aucune
activité). Placés plus près du centre-ville que les mégaprojets (§19 :
"près du croisement central... zone symbolique"), mais toujours à une
distance fixe par palier (jamais relative au rayon courant de la
ville, même raison que pour les mégaprojets) — **risque de
chevauchement avec un bloc réel un peu plus élevé que pour les
mégaprojets**, puisque les premiers paliers (10-50 d'influence, faciles
à atteindre même très tôt) sont placés proches du rayon minimal d'une
ville (`CITY_R_MIN`) : simplification assumée, à surveiller.

**Base de données** (migration `0030`) :
- `cities.influence_max` (nouvelle colonne, rétro-remplie à `influence`
  pour les villes déjà existantes).
- `influencer_ville()`, `lancer_action_antiville()` : signatures
  inchangées, `create or replace` direct, modifiées pour maintenir
  `influence_max`.
- `monument_catalogue()` : catalogue fixe (palier, seuil, type).
- `monuments(id, ville_id, palier, debloque_le)`, lecture publique,
  `unique (ville_id, palier)`.
- `city_events.type` : nouvelle valeur `monument_debloque` (contrainte
  CHECK réécrite).
- `avancer_monuments()` : opportuniste, s'arrête dès le premier palier
  pas encore atteint (paliers croissants, pas besoin de tout parcourir).

**Interface** : nouveau composant `Monuments.tsx` (lecture seule, même
forme que `Technologies.tsx`), affiché sur `/ville` et `/villes`.
Bulletin municipal étendu pour `monument_debloque`.

**Testé.** `tests/unit/monuments.test.ts` (nouveau, 5 tests) : parité
du catalogue TypeScript avec le catalogue SQL, `nbMonumentsDebloques()`
plafonne bien à 16 très au-delà du dernier seuil.
`tests/e2e/jalon20-monuments.spec.ts` (nouveau, 3 tests, écrits mais
**pas encore exécutés** — migration `0030` pas encore appliquée par
Adrien au moment de l'écriture) : déblocage progressif jusqu'à 16
paliers max (testé avec une influence très au-delà du dernier seuil) ;
`influencer_ville()` fait bien avancer `influence_max` en même temps
qu'`influence` ; une perte de propagande réduit `influence` mais jamais
`influence_max`, et aucun monument déjà débloqué ne disparaît ensuite.
Vérification programmatique du rendu 3D (script jetable) : présence de
la couleur dorée/bronze, augmentation du nombre de sommets, aucun NaN
— pas de contrôle visuel dans le navigateur cette fois (diminishing
returns après les contrôles similaires des Jalons 19/20 1-2, la
géométrie est du même type que celle déjà vérifiée à l'œil pour les
mégaprojets). Typecheck, lint et suite unitaire (105 tests) vérifiés
verts.

**Chantier "système de développement des villes" (Jalons 17 à 20)
terminé côté code** — reste la vérification manuelle d'Adrien sur
l'ensemble, et les points ouverts déjà notés en cours de route (portée
réduite du détail visuel des quartiers, validée puis reprise ; bonus
non câblés pour la plupart des mégaprojets/technologies ; risque de
chevauchement des monuments proches du centre, ci-dessus).

### Niveau "Mégapole" (250 000 habitants) — rattrapage d'un point déjà validé — 28/09/2026

**Retrouvé en faisant le point une fois le chantier ci-dessus
terminé** : Adrien avait validé un niveau au-delà de Métropole dès le
26/09/2026 (`docs/SYSTEME-DEVELOPPEMENT.md` §10 point 4, "oui, ajouté
— Mégapole à 250 000 habitants"), consigné comme point ouvert §10
point 20 ("à trancher par Adrien" — en réalité déjà tranché, la note
n'avait juste jamais été mise à jour) — mais **jamais réellement
câblé** : `NIVEAU_MAX` valait toujours 5 et `population_vers_niveau()`
plafonnait toujours à Métropole. Une ville franchissant 250 000
habitants restait donc affichée "Métropole" indéfiniment. Pas une
nouvelle décision, juste un oubli pendant le sprint des Jalons 17-20 —
corrigé directement, sans repasser par Adrien.

**Changé** : `NIVEAU_MAX` (6), `SEUILS_NIVEAU` (`src/lib/game/niveauVille.ts`),
`population_vers_niveau()` (migration `0031`, `create or replace`
direct), clé i18n `niveau.6` ("Mégapole"/"Megapolis"), et la copie
locale de seuils dans `scripts/charger-villes-test.mjs`. Rattrapage
`cities.niveau` pour une ville déjà existante qui dépasserait déjà
250 000 (aucune parmi les villes de test actuelles, la plus grande
fait 114 000, mais la migration le fait au cas où). Aucun autre
endroit du code ne supposait Métropole comme niveau maximal (recherché
explicitement) — `progressionNiveau()`/`libelleNiveau()` et leur
affichage (`ville/page.tsx`, `villes/page.tsx`) itèrent déjà
génériquement sur `SEUILS_NIVEAU`, pas de segment figé à corriger.

**Testé.** `tests/unit/niveauVille.test.ts` : les deux tests qui
plafonnaient à Métropole/5 (bornes du niveau maximal) mis à jour pour
Mégapole/6, le test de refus d'un niveau hors plage déplacé de 6 à 7.
`tests/e2e/jalon6-donnees-rendu-3d.spec.ts` : seuils étendus jusqu'à
250 000/6, la valeur à 1 000 000 (qui attendait encore 5) corrigée.
Typecheck, lint et suite unitaire (105 tests) vérifiés verts. Suite
e2e complète pas encore relancée — migration `0031` pas encore
envoyée/appliquée au moment de l'écriture.

---

### Jalon 21 — « Revoir les règles du jeu » appliqué à la guerre entre pays — 28/09/2026

**Origine** : §10 point 22, retour d'Adrien après le Jalon 4 ("−10 % de
population, c'est exagéré") — grille à appliquer à tous les mécanismes
(effet unitaire faible, cumul du jour, plafond, paliers visibles), déjà
faite pour AntiVille au Jalon 18. Choix d'Adrien (multiSelect,
28/09/2026) : reprendre uniquement **Pays (guerre/mobilisation)** dans
cette passe — visites, influence et jumelages restent non touchés.

**Constat avant de coder** (relecture des migrations 0016/0017) :
contrairement à AntiVille, un conflit pays n'avait **encore aucun effet
concret** — `resoudre_conflits_en_cours()` posait juste un badge
attaquant/défenseur/égalité à J+7, sans jamais toucher `population` ni
`influence`. Signalé et tranché avec Adrien via `AskUserQuestion` avant
de coder (le point n'était pas "quel chiffre choisir" mais "est-ce
qu'on crée un effet réel ou juste un affichage narratif ?") : Adrien a
choisi l'effet réel.

**Traduction de la grille sur un mécanisme sans clic individuel**
(l'automatisation `effort_national()` du correctif Jalon 13 reste
inchangée) : l'« unité » devient la JOURNÉE du conflit, pas une
attaque. `resoudre_conflits_en_cours()` (migration `0032`,
`create or replace` direct) avance chaque conflit `en_cours` jour par
jour depuis son `dernier_jour_traite` (nouvelle colonne) :
- **effet unitaire faible** : le camp qui perd la comparaison
  `effort_national()` du jour (bonus défensif ×1,5 inchangé) perd
  0,1 % de population sur chacune de ses villes ce jour-là ;
- **cumul du jour** : compteurs `jours_gagnes_attaquant`/
  `jours_gagnes_defenseur` (nouvelles colonnes `conflits`) ;
- **plafond** : 5 % de perte maximum par ville sur toute la durée du
  conflit, suivi via `city_events` (nouveau type `'guerre'` + nouvelle
  colonne `conflit_id`, pour ne pas confondre deux guerres simultanées
  d'un même pays contre deux adversaires différents) ;
- **paliers visibles** : `palierGuerre()` (`src/lib/game/conflits.ts`,
  copie TS pure comme `palierAttaques()`), 6 paliers de "Calme" à
  "Victoire écrasante" selon le nombre de journées gagnées par le camp
  en tête, affichés sur `/pays`.

Le verdict final à J+7 se base désormais sur la **majorité des
journées gagnées cumulées**, pas sur un seul instantané du dernier
jour — plus fidèle à l'esprit "cumul" de la grille, et plus juste (un
camp qui a dominé 5 jours sur 7 ne peut plus perdre sur un simple sursaut
du 7e jour). Chiffres (0,1 %/jour, plafond 5 %) : décision de Claude
Code, contestable — mêmes ordres de grandeur que le 0,01 %/plafond
10 % d'AntiVille, ajustés pour un rythme "1 unité/jour" plutôt que
"potentiellement des centaines d'unités/jour".

**Rattrapage documenté comme simplification assumée** : la fonction
est opportuniste (pas de cron), appelée à chaque affichage de `/pays`.
Si personne ne consulte la page plusieurs jours de suite, tous les
jours manqués sont rattrapés d'un coup — mais `effort_national()` ne
reflète que l'état ACTUEL des pays (pas d'historique jour par jour),
donc les jours rattrapés réutilisent le même instantané. Même famille
d'approximation que l'activité 7 jours glissants (Jalon 9).

**Testé.** `tests/unit/conflits.test.ts` (4 tests, parité `palierGuerre()`).
`tests/e2e/jalon21-grille-guerre.spec.ts` (4 tests) : cumul sur
plusieurs jours rattrapés en un seul appel (valeurs exactes) ; plafond
qui borne strictement la perte totale même sur ~90 jours rattrapés
d'un coup (preuve : le plafond est toujours calculé sur la population
courante, qui ne fait que décroître, donc toujours ≤ 5 % de la
population de départ) ; verdict basé sur le cumul et non le dernier
jour (scénario où le camp qui gagne "aujourd'hui" perd quand même la
guerre) ; affichage du palier et des compteurs sur `/pays`.
`tests/e2e/jalon13-france-contre-allemagne.spec.ts` mis à jour : le
test qui vérifiait un recalcul "à la volée" par `conflit_pays()` avant
toute résolution a été adapté (ce recalcul n'existe plus, les valeurs
sont désormais toujours figées par `resoudre_conflits_en_cours()`).
Typecheck et suite unitaire complète (109 tests) vérifiés verts. Suite
e2e pas encore relancée — migration `0032` pas encore envoyée/appliquée
au moment de l'écriture.

---

### Jalon 22 — « Revoir les règles du jeu », suite : paliers pour visites, influence, jumelages — 28/09/2026

**Suite du Jalon 21** : Adrien a choisi de continuer sur le reste de la
grille (visites, influence, jumelages — §10 point 22).

**Différence assumée, tranchée avec Adrien avant de coder**
(`AskUserQuestion`) : contrairement à AntiVille et à la guerre entre
pays, ces trois mécaniques sont des effets **positifs** pour la ville
qui les reçoit (population/influence gagnées, bonus de jumelage), déjà
plafonnés **par joueur** (3 visites/jour, 5 actions d'influence/jour,
délais anti-rafale, 3 jumelages actifs max, bonus de jumelage borné à
une fois par jour) — contrairement à AntiVille/guerre qui n'avaient
aucun plafond par cible avant leur passage sur cette grille. Ajouter un
plafond quotidien PAR VILLE CIBLÉE (tous visiteurs confondus)
freinerait la croissance d'une ville populaire, ce qui n'a pas le même
esprit que la demande initiale ("−10 %, c'est exagéré", un effet
négatif à adoucir). Décision d'Adrien : **paliers visibles seulement,
aucun plafond ajouté** sur ces trois mécaniques.

**Fait** (migration `0033`, 3 nouvelles fonctions `security definer` —
même raison que `attaques_recues_aujourdhui()` au Jalon 18 : les
tables sous-jacentes (`visites`, `actions_influence`, `jumelage_bonus`)
ont des policies RLS "lecture propre", un maire ne peut pas lire
directement les lignes des AUTRES joueurs sur sa ville) :
- `visites_recues_aujourdhui()` / `palierVisites()`
  (`src/lib/game/popularite.ts`) : popularité du jour (Calme →
  Fréquentée → Très fréquentée → En vogue → Virale) ;
- `actions_influence_recues_aujourdhui()` / `palierInfluence()`
  (même fichier) : renommée du jour (Calme → Respectée → Renommée →
  Célèbre → Légendaire) ;
- `jours_bonus_jumelages_ville()` / `palierJumelage()`
  (`src/lib/game/jumelages.ts`) : solidité d'un jumelage actif, sur le
  cumul de jours où son bonus a déjà été accordé (Naissant → Solide →
  Indéfectible → Légendaire).

Badges affichés sur `/ville`, `/villes` (panneau détail) et
`/jumelages`. Seuils choisis par Claude Code, contestables — ordre de
grandeur cohérent avec les quotas existants (3-5 actions/jour/joueur).

**Testé.** `tests/unit/popularite.test.ts` (6 tests) et
`tests/unit/jumelages.test.ts` (3 tests), parité des trois fonctions de
palier. `tests/e2e/jalon22-paliers-visites-influence-jumelages.spec.ts`
(3 tests) : régression RLS sur les deux nouvelles fonctions de comptage
(client authentifié réel, pas service_role) ; cumul exact des jours de
bonus pour `jours_bonus_jumelages_ville()` (et absence d'un jumelage
"en_attente" dans le résultat) ; affichage des badges sur `/villes`.
Typecheck, lint et suite unitaire complète (127 tests) vérifiés verts.
Suite e2e pas encore relancée — migration `0033` pas encore
envoyée/appliquée au moment de l'écriture.

---

### Jalon "Bibliothèque de bâtiments" (1/4 : catalogue + premiers modèles) — 30/09/2026

**Suite du Jalon 22** : `docs/BATIMENTS-ET-PACKS.md`, §10 point 21 de
ce document. Trois questions tranchées avec Adrien avant de coder
(`AskUserQuestion`) : (1) packs purement cosmétiques — **oui** ; (2)
variantes gratuites par pays — **non pour l'instant** ; (3) thème
prioritaire pour le premier pack payant — **Haussmannien** (pas encore
codé, seule l'infrastructure de packs existe — voir plus bas) ; (4)
découpage du chantier — Adrien a choisi **"tout en une fois"** plutôt
qu'un lot réduit à valider d'abord.

**Portée réellement livrée dans cette passe, plus modeste que les
"~30-40 modèles" du document** (décision de Claude Code, à signaler
explicitement à Adrien — voir DECISIONS.md, convention habituelle de
transparence sur les réductions de portée) : **6 maisons, 4 immeubles,
2 tours**, plus l'infrastructure complète (catalogue typé, sélection
stable, showroom, tests). Un rythme soutenable pour une seule passe
sans dégrader la qualité/vérification de chaque modèle ; l'ajout d'un
modèle de plus est maintenant juste une entrée de tableau, donc les
prochains lots seront plus rapides. Mobilier urbain non repris en
catalogue cette fois (arbres/voitures restent gérés par mobilier.ts).

**Point technique tranché avec Adrien avant de coder** (`AskUserQuestion`) :
le document demande qu'ajouter un modèle au catalogue ne change jamais
l'apparence d'une ville déjà construite. Garantir ça à 100 % demanderait
de mémoriser en base, une fois pour toutes, le modèle choisi par chaque
parcelle — un coût d'écritures que le jeu n'a pas aujourd'hui. Adrien a
confirmé qu'une ville peut changer d'apparence (cas des packs de
thèmes, activables/désactivables librement) : choix retenu = **tirage
par hachage stable** (fonction pure de la graine de ville + position de
la parcelle + identifiant du modèle, insensible à l'ORDRE des modèles
dans le tableau), sans nouvelle table. Limite assumée et documentée
(`src/lib/ville3d/catalogue.ts`) : ajouter un nouveau modèle peut, de
façon rare, faire basculer une parcelle déjà construite vers ce nouveau
modèle — pas une garantie à 100 %, un compromis délibéré.

**Un second risque de dérive, repéré en implémentant** (pas anticipé
dans la question posée à Adrien, corrigé directement) : le niveau
d'une ville n'est pas figé une fois une parcelle construite — si le
tirage dépendait du niveau courant (`stadeMin`), une maison déjà posée
changerait d'aspect dès que la ville franchit un seuil de niveau, le
même défaut que la grille est censée éviter. Fixé en gardant
`stadeMin` à 0 pour tous les modèles "classique" de cette passe (le
champ reste dans l'infrastructure pour un futur pack premium à
débloquer par niveau, juste inexploité pour l'instant).

**Showroom** (`/dev/showroom`, outil de développement jamais lié
depuis la navigation) : rendu Three.js simplifié (couleurs de sommets,
une lumière), bascule jour/nuit, cadrage automatique sur la vraie boîte
englobante de chaque modèle construit (une tour ne tient pas dans un
cadrage pensé pour une maison). Pas la scène finale du jeu — juste de
quoi valider formes et proportions d'un coup d'œil, comme demandé par
le document (§2).

**Vérifié dans le vrai rendu du jeu** (page d'accueil, population
temporairement montée à 60 000 pour voir tours et immeubles, revenue à
1200 après vérification) : variété visible de maisons, immeubles et
tours, aucune erreur console, géométrie propre.

**Testé.** `tests/unit/catalogue.test.ts` (11 tests) : déterminisme du
tirage, insensibilité à l'ordre du tableau, répartition statistique
proche des poids déclarés, filtre par niveau, repli du pack vers le
classique, erreur explicite si aucun modèle disponible, limite de
triangles par modèle (docs/BATIMENTS-ET-PACKS.md §2). Suite unitaire
complète (129 tests), typecheck et lint vérifiés verts. Aucune
migration pour ce jalon (purement front-end/génération 3D) — pas de
recette à faire valider par Adrien côté base de données, juste le rendu
visuel.

---

### Jalon "Bibliothèque de bâtiments" (2/4 : deuxième lot de modèles) — 30/09/2026

**Suite immédiate du 1/4**, choix confirmé par Adrien (`AskUserQuestion` :
continuer sur plus de modèles "classique" plutôt que démarrer le pack
Haussmannien). Catalogue étendu de 12 à **20 modèles** : +3 maisons
(mitoyenne, méditerranéenne, fermette → 9 au total), +3 immeubles
(art déco, barre, loggias → 7 au total), +2 tours (béton brutaliste,
flèche → 4 au total). Mobilier urbain toujours pas repris en catalogue
(reste pour un prochain lot).

Aucun nouveau choix de conception cette fois — même infrastructure,
mêmes conventions (`stadeMin` à 0, pack "classique", `decorJardin()`
partagé pour les maisons, `edicule()`/`chantierGratteCiel()`/
`grueChantier()` partagés pour immeubles/tours). Les deux nouvelles
tours réutilisent le même squelette chantier/grue que tour-verre —
seul le fût final change (bandeaux de béton alternés pour tour-beton,
fût étroit + flèche toujours présente, jamais d'héliport, pour
tour-fleche).

**Vérifié dans le vrai rendu du jeu** (page d'accueil, population
temporairement montée à 60 000 pour voir les nouvelles tours, revenue
à 1200 après vérification) et dans le showroom (`/dev/showroom`,
20 modèles listés) : aucune erreur console, silhouettes distinctes.

**Testé.** `tests/unit/catalogue.test.ts` couvre déjà tous les modèles
du catalogue génériquement (boucle sur `MODELES_MAISONS`/
`MODELES_IMMEUBLES`/`MODELES_TOURS`) — aucun nouveau test nécessaire,
les 8 nouveaux modèles sont automatiquement couverts par la limite de
triangles et les tests de détermisme/pondération. Suite unitaire
complète (129 tests), typecheck et lint vérifiés verts. Suite e2e
complète relancée pour confirmer l'absence de régression sur le rendu
3D : 81 passés, 6 échecs — tous la même flakiness de connexion
pré-existante déjà documentée plusieurs fois ce jour (redirection vers
`/connexion` au lieu de `/ville`, répartie sur des jalons sans aucun
rapport avec le rendu 3D comme les Jalons 1/3/4/5/8/9), pas une
régression liée à ce jalon.

---

### Jalon "Bibliothèque de bâtiments" (3/4 : mobilier urbain) — 30/09/2026

**Suite immédiate du 2/4**, dernière catégorie du document encore
absente (`docs/BATIMENTS-ET-PACKS.md` §3 : "arbres, lampadaires,
abribus, fontaines, kiosques, bancs, voitures variées"). Contrairement
aux bâtiments (maisons/immeubles/tours), le mobilier urbain n'est **pas**
assigné une fois pour toutes à une parcelle précise — ce sont des
éléments dispersés dans le décor (trottoirs, parcs, cours), donc pas
besoin du catalogue à sélection stable : ajoutés comme fonctions
réutilisables dans `mobilier.ts` et placés via des tirages `r() < p`
classiques (même convention que les arbres d'alignement déjà en place).

**Ajouté** (`src/lib/ville3d/mobilier.ts`) : `banc()`, `fontaine()`
(la fontaine de cour existait déjà en dur dans `buildCourtyard()`,
extraite en fonction réutilisable et enrichie d'un jet d'eau),
`abribus()`, `kiosque()`. Arbres (feuillu + conifère) et voitures (8
couleurs) existaient déjà. Lampadaires restent une fonction locale à
`buildBlock()` (pas de variante de forme pour l'instant — seulement la
couleur selon la technologie LED, Jalon 20 2/3).

**Câblé** : `buildPark()` place un banc (ou deux) systématiquement, un
kiosque de temps en temps (30 %) à la place ; `buildCourtyard()`
utilise `fontaine()` (même rendu qu'avant, code partagé) ;
`buildBlock()` place un abribus sur un des 4 trottoirs, 40 % du temps.

**Vérifié** : suite unitaire dédiée (`tests/unit/mobilierUrbain.test.ts`,
5 tests — géométrie non vide, sans `NaN`, déterminisme) plutôt qu'une
vérification visuelle seule (petits éléments, difficiles à distinguer
à l'œil sur une capture de ville entière) ; suite `ville3dGenerer`/
`ville3dCroissance` toujours vertes (déterminisme global de
`generate()` préservé) ; vérifié aussi dans le vrai rendu du jeu, sans
erreur console.

---

### Jalon "Bibliothèque de bâtiments" (4/4 pour les modèles de base : troisième lot) — 30/09/2026

**Suite immédiate du 3/4**, décision de Claude Code de continuer sur le
même chantier plutôt que de redemander à Adrien à chaque petit pas
(le sens de "passe à la suite" répété plusieurs fois de suite sur ce
chantier précis) — si ce n'est pas ce qu'il voulait, à corriger.
Catalogue étendu de 20 à **26 modèles** : +3 maisons (duplex,
split-level, cottage → 12 au total), +2 immeubles (gradins multiples,
vitrée → 9 au total), +1 tour (obélisque, fût mince et uniforme sans
palier → 5 au total). Se rapproche des ~30 modèles visés par
`docs/BATIMENTS-ET-PACKS.md` §3 (bâtiments seuls, hors mobilier urbain
déjà fait au 3/4).

**Vérifié** : suite unitaire complète (134 tests, `catalogue.test.ts`
couvre génériquement tous les modèles) ; typecheck et lint verts ;
vérifié dans le vrai rendu du jeu (population 60 000, silhouettes
distinctes visibles pour toutes les nouvelles tours, notamment
tour-obélisque très reconnaissable — fût mince et uniforme au milieu
des autres tours), aucune erreur console. Suite e2e complète relancée :
75 passés, 10 échecs + 12 non exécutés — tous la même flakiness de
connexion pré-existante (`toHaveURL(/\/ville$/)`, vérifié ligne par
ligne dans les logs), y compris le test `jalon6bis-rendu-3d.spec.ts`
qui teste le canvas WebGL : son échec est dû au même blocage de
connexion AVANT même d'atteindre la vérification du canvas, pas à un
problème de rendu 3D. Nombre d'échecs plus élevé que d'habitude ce
jour-là, probablement lié à la charge de la machine (serveurs de
développement et suites e2e enchaînés sans pause) plutôt qu'à une
nouvelle cause — à surveiller si ça persiste.

---

### Jalon "Bibliothèque de bâtiments" (4/4 : premier pack de thème, Haussmannien) — 30/09/2026

**Dernier morceau de ce chantier**, décision de Claude Code de
poursuivre dans la même direction plutôt que de redemander à Adrien à
chaque étape (voir aussi la note du 3/4 sur "passe à la suite" répété).
Premier pack de thème payant du document (§4), choisi en priorité par
Adrien le 30/09/2026 (AskUserQuestion). **Première migration de tout ce
chantier** — tout le reste (catalogue, 3 lots de modèles, mobilier
urbain) était purement front-end.

**Portée assumée** (décision de Claude Code, à contester si besoin) :
le document prévoit des packs PAYANTS (§5), mais la boutique elle-même
est explicitement une étape ultérieure ("après le MVP, une fois le
statut légal réglé" — §6 point 4). Comme aucun système de paiement
n'existe encore, le thème Haussmannien est sélectionnable librement par
n'importe quel joueur pour l'instant, sans colonne `joueur_packs` ni
réservation aux comptes de test (le document proposait pourtant cette
option à moindre coût — §5). La restriction viendra avec la boutique,
pas avant : plus simple pour tester/juger le rendu maintenant, cohérent
avec "pas de fausse promesse de paiement avant d'avoir vraiment un
moyen de payer".

**Pack partiel** (§2, "si un thème n'a pas de modèle pour une famille,
le catalogue prend celui du pack Classique") : seuls les IMMEUBLES ont
des modèles Haussmannien dédiés (`immeuble-haussmannien` — façade
pierre claire, garde-corps en fer forgé filants, étage mansardé en zinc
avec lucarne ; `immeuble-haussmannien-angle` — même archétype avec une
tourelle d'angle arrondie). Maisons et tours retombent sur "classique"
pour ce thème — choix délibéré : Haussmann est avant tout une
architecture d'immeubles parisiens, pas de pavillons ni de
gratte-ciel.

**Fait** :
- Migration `0034` : `cities.theme` (défaut `'classique'`, contrainte
  `check`), `definir_theme_ville()` (security definer, maire
  uniquement, même anti-triche que `definir_recommandation()`).
- `theme` propagé sur toute la chaîne de rendu (déjà prévu dans
  l'infrastructure du catalogue, `choisirModele(cle, modeles, niveau,
  packActif)`) : `generate()` → `buildBlock()` → `buildHouse`/
  `buildApart`/`buildTower` → `choisirModele()`. `ParametresVille.theme`
  (scene.ts), `SincroniserScene`, `/ville` et `/villes` (le visiteur
  voit le thème choisi par LE MAIRE de la ville regardée, pas le sien).
- Sélecteur sur `/ville` (le maire uniquement) : un `<select>` +
  bouton "Appliquer", même style que le sélecteur de recommandation
  d'activité (Jalon 17).

**Testé.** `tests/unit/catalogue.test.ts` étendu (4 nouveaux tests,
15 au total) : le pack haussmannien fournit bien des modèles
d'immeuble, un immeuble avec ce thème actif utilise toujours un modèle
haussmannien, une maison/tour avec ce thème actif retombe toujours sur
classique (aucun modèle disponible pour ces familles). Nouveau fichier
e2e (`tests/e2e/jalon-bibliotheque-theme-haussmannien.spec.ts`, 2
tests) : anti-triche de `definir_theme_ville()` (réservé au maire,
thème invalide refusé, valeur par défaut `'classique'` vérifiée) ; page
`/ville` permet de choisir le thème et la valeur est bien persistée en
base. Suite unitaire complète (134 tests), typecheck et lint vérifiés
verts. Suite e2e complète pas encore relancée — migration `0034` pas
encore envoyée/appliquée au moment de l'écriture.

---

### Noms uniques (pseudos et villes) + fiabilisation de la suite e2e — 02/10/2026

**Noms uniques** (`docs/A-INTEGRER.md` §8, règle ferme d'Adrien du
24/09/2026, oubliée depuis le Jalon 8 — §10 point 26 ; même histoire que
le niveau Mégapole : validée, jamais codée). Migration `0035` :
`nom_normalise()` (minuscules, sans accents, uniquement a-z0-9),
colonnes générées `users.pseudo_normalise` / `cities.nom_normalise`,
index uniques, `nom_disponible()` ("✓ disponible / ✗ déjà pris" à la
saisie), `renommer_pseudo()` / `renommer_ville()`, `creer_ville()`
redéfinie (erreurs dédiées **P0027** pseudo pris, **P0028** nom de ville
pris). Doublons existants : le plus ancien garde le nom, les autres sont
marqués `*_a_changer` (exclus de l'index) et passent par l'écran de
rattrapage `/ville/noms` à leur prochaine page de jeu
(`exigerRegionChoisie()` étendue). Création : indication de disponibilité
sous les champs, pseudo limité à 20 caractères, noms réservés et mots
interdits refusés (`src/lib/game/nomsUniques.ts`).

*Écarts assumés avec la lettre du §8, à contester si besoin* : (1) pas
d'extension `unaccent` (non IMMUABLE donc inutilisable dans une colonne
générée indexée, et son schéma varie selon le projet Supabase) — une
translittération explicite des lettres latines accentuées la remplace,
vérifiée identique en SQL et en TypeScript par un test de parité ; (2)
les règles de FORMAT (3-20 caractères, réservés, interdits) sont
appliquées dans l'application, pas dans `creer_ville()`, que les specs
et scripts appellent directement — seule l'UNICITÉ est garantie par la
base. Pas de test « retirer l'index fait échouer » (pas d'accès psql) :
les assertions de collision échouent d'elles-mêmes sans l'index.

*Correctif découvert en chemin* : la contrainte `cities_niveau_check`
(migration 0001) plafonnait encore `niveau` à 5, la migration `0031`
(Mégapole, niveau 6) ne l'ayant jamais élargie — toute ville à 250 000
habitants ou plus faisait échouer sa mise à jour. Le journal e2e
affichait ce message depuis des jours sans que je le relève. Corrigé
dans `0035`.

**Fiabilisation de la suite e2e** — la « flakiness de connexion »
invoquée à chaque run depuis le Jalon 6bis n'en était pas une, et je
l'avais écartée trop vite (y compris dans les entrées précédentes
d'aujourd'hui). Causes réelles, toutes corrigées : (a) `/ville` enchaîne
**~26 appels Supabase séquentiels** (31 pour `/villes`) à 100-400 ms
chacun — plusieurs secondes de rendu, donc le `toHaveURL` de 5 s tombait
; délai d'assertion porté à 20 s et de test à 60 s (`playwright.config.ts`)
**en attendant de paralléliser ces appels** (tâche proposée à part, vraie
amélioration pour les joueurs) ; (b) serveur de dev lancé à froid :
préchauffage des pages (`tests/e2e/prechauffage.ts`) ; (c) des villes de
test à **9 000 000 d'habitants** (près de 1 800 blocs à générer côté
navigateur — le point ouvert §10 n°19 « plafond de rendu » n'est donc pas
théorique) bloquaient la page ; ramenées à 400 000 ; (d) formulaire de
connexion : clic possible avant l'hydratation de React (bouton désactivé
jusque-là, valeurs lues dans le DOM) ; (e) helper de délai anti-rafale
reculé de 2 s pile (la limite) à 10 s ; (f) `getByText("1")` par
sous-chaîne qui matchait le rang « 31 » ; (g) lecture en base avant la
fin d'une action serveur (attente active). Les specs créent maintenant
leurs comptes avec un suffixe aléatoire (sinon un compte oublié par un
run raté bloquerait le suivant). Résultat : de 12 échecs + 14 non
exécutés à 98 verts sur 99 (le dernier, un test à correspondance par
sous-chaîne, corrigé depuis).

**Testé.** `tests/unit/nomsUniques.test.ts` (9 tests) ;
`tests/e2e/noms-uniques.spec.ts` (8 tests : parité SQL/TypeScript,
collisions casse/accent/tiret/espace, création simultanée, disponibilité,
renommage, absence de doublon en base, rattrapage `/ville/noms`).

**Complément du 05/10/2026** (relecture du §8 point par point, demandée
par Adrien alors que l'encadré d'état de `A-INTEGRER.md` disait encore
« pas fait » : le code existait déjà, seul le statut était périmé).
Vérifié : migration `0035` **appliquée** sur la base de dev (colonnes
`pseudo_normalise` / `nom_normalise` présentes, aucun doublon en attente,
24 villes et 24 pseudos de test distincts, aucun vrai joueur en collision) ;
e2e 8/8 verts, suite unitaire 223 verts, typecheck et lint propres.
Deux manques réels comblés :
- **Test rouge par sabotage** (jamais fait en octobre faute d'accès
  `psql`) : `tests/unit/nomsUniquesSchema.test.ts` lit les migrations et
  garantit que les deux index uniques et leurs colonnes générées existent
  et ne sont ni supprimés plus tard, ni commentés, ni vidés par un
  prédicat (`where false`). Dix sabotages du texte SQL passent le garde au
  rouge ; vérifié en plus en retirant les deux index du vrai fichier `0035`
  (9 échecs, fichier restauré à l'identique). **Limite assumée** : c'est un
  sabotage du schéma écrit, pas d'une vraie base — aucun outil SQL
  (`psql`, CLI Supabase, client Postgres) n'est disponible pour retirer
  l'index d'une base réelle. Une base Postgres en mémoire (PGlite) le
  permettrait mais serait une nouvelle dépendance de développement :
  **pas ajoutée sans décision d'Adrien** ; geste manuel décrit dans
  `docs/recette-noms-uniques.md`.
- **`villes-de-test.json`** : contrôle sans base (noms et pseudos
  distincts après normalisation, ni réservés ni interdits, détecteur
  lui-même testé par sabotage) ; le test e2e « sans collision » ne
  vérifiait en réalité que les villes, pas les pseudos — corrigé.
Les deux écarts avec la lettre du §8 (pas d'`unaccent`, règles de format
côté application) restent inchangés.

---

### Plafond de rendu des très grandes villes — 02/10/2026

**Arbitrage d'Adrien** (`AskUserQuestion`, 02/10/2026) : principe validé
pour le point ouvert §10 n°19, devenu concret en cherchant pourquoi les
specs e2e à villes de 9 000 000 d'habitants gelaient le navigateur.
Mesure : sans plafond, `generate()` produit **1 808 blocs** pour une ville
à 9 M d'habitants et prend ~5,4 s *dans Node* (le navigateur, plus lent,
gelait 10 à 15 s) ; la population, elle, n'a aucune limite.

**Fait** : `PLAFOND_RENDU_POPULATION = 250 000` (`constantes.ts`),
appliqué dans `planifierBlocs()` — le nombre de blocs dessinés cesse de
croître à ce seuil (~58 blocs). La population continue de monter, le
niveau aussi (Mégapole = 250 000, le dernier), et les bâtiments déjà
construits gardent leur logique de hauteur. **Chiffre choisi par Claude
Code, à ajuster après mesure sur téléphone** (le §10 point 19 estimait
que ça ramerait vers 500 000) : 250 000 = seuil du dernier niveau, un peu
plus de deux fois la plus grande ville de test (114 000).

*Nuance à connaître* : `docs/A-INTEGRER.md` §2 (demande d'Adrien) disait
« la ville ne s'arrête jamais de grandir » ; cette règle s'applique donc
désormais à la *population* et à la *densité*, pas à l'étendue au-delà
de 250 000 habitants — c'était précisément le compromis prévu au §10
point 19.

**Testé.** `tests/unit/ville3dCroissance.test.ts` (+2 tests) : au-delà
du plafond le nombre de blocs ne change plus ; une ville à 9 000 000
se génère presque aussi vite qu'une ville au plafond. **Sabotage
vérifié** : avec la constante neutralisée, les deux tests échouent
(1 808 blocs au lieu de ~58, 5,4 s).

---

### Refonte de l'onglet Pays (A-INTEGRER §23) — 02/10/2026

**Demande d'Adrien** (`docs/A-INTEGRER.md` §23) : retirer la carte du
pays (Jalon 9 ter, qui était pourtant sa propre demande du 25/09 —
revirement assumé après usage), afficher à la place le **statut de la
semaine** et un **historique hebdomadaire** complet. Migration `0036`.

**Fait.** `/pays` n'a plus de carte : `CartePays.tsx` supprimé, ainsi
que tout ce qui ne servait qu'elle dans la page (chargement du JSON de
carte, population par région, marqueurs) et la spec e2e du Jalon 9 ter
(`jalon9ter-carte-du-pays.spec.ts`, qui testait la carte). En haut de
page, un badge de statut : *En paix* / *En guerre · pays adverse* /
*Alliance · pays allié* (`statut_pays_semaine()` : un conflit en cours
l'emporte ; sinon une alliance adoptée la semaine dernière, par ce pays
ou par un pays qui le vise ; sinon paix — les décisions sont résolues en
fin de semaine, d'où « adoptée la semaine dernière »). Historique
(`historique_pays()`, 12 dernières semaines, plus récente d'abord, semaine
courante exclue) : par semaine, la **ressource votée** (catégorie la plus
votée, égalité départagée dans l'ordre industrie/techno/culture/
commerce), la **décision diplomatique** de CE pays (catégorie, pays visé,
adoptée ou rejetée, pour/contre) et le **conflit** commencé cette semaine-là
(rôle attaquant/défenseur, adversaire, victoire/défaite/égalité, pertes de
population de chaque camp, sommées depuis `city_events`, Jalon 21).

**Choix laissé à Claude Code par le §23 : pas de table de synthèse.**
Tout est déjà conservé avec sa semaine (propositions/résultats
diplomatiques, conflits, `city_events`, `votes_pays`) et le volume est
minuscule : recalculer à la demande évite une deuxième source de vérité
qui pourrait diverger. Fonctions `security definer` (`votes_pays` n'est
lisible que par son auteur). À revisiter seulement si l'historique
devenait lent (des années de semaines).

*Interprétations de Claude Code, à contester* : (1) un conflit est
rattaché à la semaine de son **début** (donc la semaine suivant la
décision de rivalité qui l'a déclenché), pas à celle du vote — c'est la
semaine où l'on s'est réellement battu ; (2) l'historique d'un pays
montre ses *propres* propositions diplomatiques, pas celles que d'autres
pays lui adressent (sauf via le conflit qui en découle) ; (3) « paix » et
« embargo » adoptés n'ont pas de badge propre (seulement les trois états
demandés : paix par défaut).

**À savoir** : le canvas 3D de fond ne « disparaît » pas avec la carte
— comme sur les autres pages sans ville (classement, palmarès), la scène
partagée du layout montre la ville d'accueil derrière le panneau. Les
données de carte (`src/data/cartes`, ~930 Ko) et le script qui les génère
(`scripts/generer-cartes-pays.mjs`) ne servaient plus à rien : laissés en
place pour qu'Adrien décide, **supprimés le 02/10/2026** (« petits points »).
§10 point 28 (détails laissés de côté de la carte) est devenu sans objet.

**Testé.** `tests/e2e/refonte-pays-historique.spec.ts` (3 tests) :
`historique_pays()` (vote gagnant, décision, conflit, pertes par camp
côté attaquant ET côté défenseur, semaine courante exclue),
`statut_pays_semaine()` (paix par défaut, alliance des deux côtés,
guerre prioritaire), et la page `/pays` (badge, historique, plus de
carte). Typecheck et lint verts. Pas encore lancés : migration `0036`
pas encore appliquée au moment de l'écriture.

---

### Guerres équilibrées : effort national à la moyenne par ville (A-INTEGRER §24) — 02/10/2026

**Demande d'Adrien** (`docs/A-INTEGRER.md` §24) : ne plus laisser un
pays de 50 villes écraser mécaniquement un pays de 2 villes. Constat
(Claude chat) : `effort_national()` additionnait l'activité 7 jours de
toutes les villes, un choix que la migration `0017` qualifiait elle-même
d'« assumé mais contestable ». Adrien choisit l'option radicale : **une
vraie moyenne par ville**. Migration `0037`.

**Fait.** `effort_national()` = activité 7 jours **moyenne** par ville
+ `floor(sqrt(ressources nationales / nombre de villes))` ; un pays sans
ville vaut 0. La comparaison quotidienne de `resoudre_conflits_en_cours()`
et tout le reste du mécanisme de guerre (bonus défensif ×1,5, perte
quotidienne de 0,1 % plafonnée à 5 %, paliers visibles, verdict à la
majorité des journées — Jalon 21) sont inchangés. Affichage de `/pays` :
libellés « Effort moyen par ville (attaquant/défenseur) », une décimale.

*Choix de Claude Code, le §24 ne le tranchait pas* : l'effort devient une
valeur **décimale** (`numeric(12,2)`). Une moyenne d'activité vaut entre
0 et 7 ; l'arrondir à l'entier effacerait presque toute différence entre
deux pays (2,4 et 2,9 donneraient tous deux 2). Conséquences :
`conflits.effort_*` en `numeric(12,2)`, `conflit_pays()` recréée, et le
seuil défensif n'est plus arrondi (`effort_attaquant > effort_defenseur
× 1,5` — le `floor` servait seulement à rester en entiers).

*À savoir* : « une ville » = « un joueur » ici (une ville par joueur),
donc une ville inactive compte comme zéro dans la moyenne, ce qui est le
but (seule l'implication réelle des joueurs compte), mais pénalise un
pays dont beaucoup de comptes dorment. Les villes de test comptent comme
les autres, comme avant. L'option écartée par Adrien (diviser par la
racine carrée du nombre de villes, pour atténuer sans annuler l'avantage
de taille) reste la solution de repli si la moyenne pure s'avère trop
punitive une fois testée.

**Testé.** `tests/e2e/effort-national-moyenne.spec.ts` (3 tests, pays
BG/RO/MT réservés) : pays sans ville = 0 ; même activité par joueur =
même effort que le pays ait 1 ou 3 villes (avant : 9 contre 3) ; villes
inactives qui tirent la moyenne vers le bas, et terme ressources lui aussi
divisé par le nombre de villes. `jalon13-france-contre-allemagne.spec.ts`
adapté (attendus 4,5 et 1 au lieu de 9 et 1, nouveaux libellés).
Typecheck et lint verts. Pas encore lancés : migration `0037` pas encore
appliquée au moment de l'écriture.

---

### Catalogue des monuments + « voir où il est » + secteurs fixes hors de la ville (A-INTEGRER §25, sous-jalon 25a) — 02/10/2026

**Demande d'Adrien** (`docs/A-INTEGRER.md` §25) : « tout est mélangé
actuellement, d'ailleurs je ne vois pas les bâtiments pour chaque ».
Deux chantiers : (1) zonage des blocs, (2) rendre repérable ce que le
joueur débloque. **Découpage choisi par Adrien : deux sous-jalons,
visibilité d'abord (25a, ci-dessous), zonage des blocs ensuite (25b, pas
commencé, décisions à prendre avec lui avant de coder).**

**Fait (25a), sans migration SQL.**
- *Catalogue* : le panneau Monuments de `/ville` (et de `/villes`) liste
  maintenant les **16 paliers**, repliable (`Monuments · 5/16`) : ✓ pour
  les débloqués, 🔒 pour les autres avec leur seuil d'influence (le
  prochain montre aussi la progression `300 / 500`). Avant, seuls les
  débloqués et le prochain étaient listés.
- *« Voir où il est »* : un bouton par monument débloqué. La caméra 3D
  s'y rend en ~0,9 s (courbe douce, zoom ramené à 0,8 si on était plus
  loin) et un **repère lumineux** (anneau qui pulse + colonne ambrée)
  y reste 10 s en s'effaçant. Adrien avait suggéré de commencer par un
  simple repère sans bouger la caméra ; le trajet de caméra s'est avéré
  peu coûteux (le contrôleur de scène a déjà un état de caméra), donc
  les deux sont livrés d'emblée. Toute action du joueur sur la scène
  pendant le trajet reprend aussitôt la main. Sur mobile le panneau
  flottant se replie pour ne pas cacher la cible. Le contrôleur de scène
  expose `allerA(x, z)` (via `useSceneVille()`), le bouton est un
  composant client (`BoutonVoirOu`) dans un panneau resté serveur.
- *Secteurs fixes* (`src/lib/ville3d/emplacements.ts`, fonctions pures
  partagées par le rendu et le panneau — donc jamais de décalage entre
  « où il est » et où il est vraiment) : Énergie, mégaprojets et
  monuments ont chacun un **secteur de 60° identique pour toutes les
  villes** (axes +x, +z, −x ; l'axe −z reste libre), à partir d'une
  **ceinture fixe à 450 m** (norme du max, comme le rayon de ville).
  Mégaprojets : grille 3 colonnes × rangées de 60 m ; monuments : grille
  4 × 4, rangée de 55 m, les paliers hauts plus loin ; Énergie : hasard
  stable dans le secteur, 0 à 250 m au-delà de la ceinture. Pas de
  boussole affichée (la caméra tourne) : c'est « voir où il est » qui
  guide.

**Défauts trouvés en chemin (corrigés).**
- *Les monuments étaient à l'intérieur de la ville* : placés à 200 +
  15 × palier m en distance euclidienne, donc à 141 m seulement du
  centre sur une diagonale — sous la ville dès « Ville » (rayon 168).
  Rien ne les écartait. La ceinture (450 m) est au-delà du rayon de la
  ville au plafond de rendu (400 m à 250 000 habitants), vérifié par
  test.
- *Les mégaprojets pouvaient atterrir à des dizaines de km* : distance
  220 + 90 × palier, jusqu'à 16 000 m pour une ville à 9 millions
  (palier 180), hors du sol dessiné (±4000 m). Grille bornée à 39 cases.
- *Le maillage entier de la ville était écarté dès que l'origine sortait
  du champ de la caméra* : la géométrie utilise des attributs
  personnalisés (`aPos`…), Three.js ne peut donc pas calculer la sphère
  englobante et croit la ville réduite à l'origine. Invisible tant que le
  pan était borné à `cityR + 150`. `frustumCulled = false` sur les deux
  meshes. Trouvé en regardant la capture du premier « voir où il est »
  (fond uni).
- Le brouillard de distance démarrait à `cityR + 80` : un monument à
  450 m aurait été dans la brume pour un hameau (rayon 168). Nouveau
  `uFogR = max(cityR, 440)` — le haze lointain d'un petit village recule
  un peu, changement purement visuel.

**Effets de bord assumés.**
- Les installations d'Énergie, mégaprojets et monuments **déjà dessinés
  changent de place une fois** (ancien angle aléatoire sur 360°, nouveau
  secteur). Ils ne bougeront plus ensuite. Point 5 du §25 le demandait
  (« emplacement plus prévisible ») ; sans migration de données on ne
  peut pas faire autrement qu'un déplacement unique.
- Le pan manuel de la caméra va maintenant jusqu'à 1100 m du centre
  (avant : rayon de ville + 150), pour que le joueur puisse aussi aller
  voir à la main.
- Les monuments eux-mêmes restent minuscules (2 à 6 m de haut, socle de
  2 à 4 m ; le bloc fait 64 m) — décision de la bibliothèque de
  modèles, non touchée ici. Le repère lumineux sert justement à les
  retrouver. Les agrandir, ou leur donner une silhouette plus haute, est
  à décider avec Adrien.
- Ombres : la passe d'ombres n'est plus refaite à chaque image mais
  seulement quand la géométrie, le rayon ou la direction du soleil
  changent (nécessaire : le repère pulsant redessine la scène en continu
  pendant 10 s ; sans cela chaque image refaisait la passe d'ombres de
  toute la ville).

**Pas fait (volontairement).** « Voir où il est » pour les mégaprojets,
les installations d'Énergie et les technologies (§25 : « à étendre si
Adrien le souhaite plus tard »). Les positions existent déjà
(`emplacementMegaprojet`, `emplacementEnergie`), c'est un bouton à
ajouter à leurs panneaux.

**Testé.** `tests/unit/ville3dEmplacements.test.ts` (7) : ceinture
au-delà de la ville au plafond de rendu ; chaque famille reste dans son
secteur et hors de la ville ; jamais deux monuments (ou mégaprojets) à
moins de 40 m ; position stable (ne dépend que de la ville et du
palier) ; paliers hauts plus loin ; la géométrie change quand on
débloque un monument. `tests/e2e/catalogue-monuments-voir-ou.spec.ts` :
16 lignes, 5 débloquées / 11 verrouillées avec seuils, 5 boutons, et le
clic envoie à la scène exactement l'emplacement attendu (lu sur
`canvas[data-repere]`). Capture vérifiée à l'œil : anneau + colonne sur
l'obélisque, sol et décor affichés après correction du culling.

---

### Zonage des quartiers « par secteur » (A-INTEGRER §25, sous-jalon 25b) — 02/10/2026

**Demande d'Adrien** (`docs/A-INTEGRER.md` §25 points 1 à 4) : les blocs
sont mélangés (un commerce au rang 2, du résidentiel au rang 40) parce
que la position d'un bloc est fixée avant de connaître sa vocation ;
il veut les gratte-ciels au centre et les maisons repoussées en
périphérie. **Arbitrage d'Adrien** : « quartiers par secteur » (avec une
petite migration, `0038`) plutôt que « cœur + anneau » ou « ne rien
changer ».

**Contrainte découverte en simulant** (sur la vraie géométrie, avant de
coder) : une ville grandit du centre vers l'extérieur et un bloc ouvert
ne bouge jamais, donc un anneau parfait (tours, puis commerces, puis
maisons) est impossible — les maisons de l'anneau extérieur devraient
exister avant les commerces du milieu. Un « cœur + anneau » donnait un
gradient à peine visible ; les secteurs d'angle donnent des quartiers
lisibles et ne dépendent pas de l'ordre de croissance.

**Fait.**
- *Règle de choix de la vocation inchangée* (résidentiel ≥ moitié, puis
  activité la plus en retard) : la migration `0038` recrée
  `assigner_vocations_blocs()` à l'identique aux deux `insert` près et
  ajoute `city_blocks.zonee` (`false` par défaut).
- *Position rejouée côté client* (`src/lib/ville3d/zonage.ts` +
  `planifierBlocs()`), rang après rang, à partir de la suite des
  vocations lue en base. Le rang reste l'ordre d'ouverture (inchangé en
  base) ; ce qui change, c'est la case occupée :
  - **cœur** : les 5 cases les plus centrales sont réservées au
    résidentiel (→ gratte-ciels) ;
  - **résidentiel** hors cœur : case libre la plus proche dans la moitié
    d'angle ≥ 180° ;
  - **activités** : case libre la plus proche (hors cœur) dans son
    secteur de 36° dans la moitié d'angle 0–180°, dans l'ordre
    commerce, industrie, loisirs, recherche, services ; si le secteur
    n'a plus de case, la plus proche hors cœur.
- *Stabilité* : le choix du rang r ne dépend que des rangs déjà placés
  et d'une fenêtre de candidats de taille fixe (r + 24 cases) — jamais de
  la taille actuelle de la ville : une ville qui grandit ne déplace
  jamais un bloc ouvert (même piège que la liste de candidats variable
  qui aurait déplacé un bloc quand elle s'allongeait).
- *Portée* (§25 point 4) : les blocs déjà en base gardent `zonee =
  false`, donc leur emplacement historique (rang = case). Seuls les
  nouveaux blocs sont zonés. Le client reçoit `zonageDepuisRang` (le plus
  petit rang zoné, `premierRangZone()`), les rangs avant lui sont placés
  comme avant.
- *Gratte-ciels* : `towerAt` dépend maintenant de la case et non plus du
  rang (identique pour les blocs historiques). Choix de Claude Code, le
  §25 demandait des maisons « durablement » en périphérie : un bloc zoné
  au-delà de la 24ᵉ case (`TOURS_CASE_MAX`) n'a jamais de gratte-ciel.
  Pour les blocs historiques, rien ne change.
- *Rendu* : `ev` (événements de croissance) est calculé par rang et non
  plus par case ; `Bloc.openAt`/`gap` suivent le rang du bloc.

**À savoir.**
- *Orientation fixe* : la moitié résidentielle est toujours du même côté
  pour toutes les villes (angle ≥ 180° dans le plan du générateur). Une
  rotation propre à chaque ville est possible si Adrien trouve ça trop
  uniforme.
- *Cases vides pendant la croissance* : un secteur d'activité peut
  rester vide un moment (aucun bloc de cette activité n'est encore
  ouvert) : la case est alors une friche, comme avant pour les blocs à
  venir.
- *Effet sur les villes existantes* : aucun tant qu'elles n'ouvrent pas
  de nouveau bloc ; ensuite leurs nouveaux blocs sont zonés, les anciens
  restent mélangés. La page `/ville` d'une ville historique devient
  donc progressivement « mi-ancienne, mi-zonée ».
- *Migration non appliquée = ville tout en résidentiel* : `/ville` et
  `/villes` sélectionnent la nouvelle colonne ; sans `0038` la requête
  échoue et la ville retombe sur le résidentiel par défaut (même
  dégradation que pour toute migration manquante).

**Testé.** `tests/unit/ville3dZonage.test.ts` (8) : ville historique
inchangée ; cœur résidentiel et > 75 % des activités dans leur secteur
(3 graines) ; jamais deux blocs sur la même case ; croissance sans
déplacement ni changement de seuil ; placement du rang r indépendant des
vocations suivantes ; zonage partiel (les 12 premières cases comme avant) ;
pas de gratte-ciel au-delà de la case 24 pour les blocs zonés ;
`premierRangZone`. Sabotage : zonage neutralisé => 2 tests échouent.
`tests/e2e/zonage-quartiers.spec.ts` (3) : blocs historiques intacts et
nouveaux zonés, ville neuve entièrement zonée avec la règle de vocation
inchangée, `/ville` s'affiche. `jalon19-quartiers.spec.ts` inchangé et
vert.

---

### Plafond de visites à 8, « +1 visite » et choix d'emblée, page des règles (A-INTEGRER §27) — 02/10/2026

**Demande d'Adrien** (`docs/A-INTEGRER.md` §27, trois points).

**A. Plafond de visites quotidien : 3 → 8** (par jour et par ville
visitée). Migration `0039` : une fonction `plafond_visites_quotidien()`
(= 8) et `visiter_ville()` recréée à l'identique de la `0024` en
l'appelant — le chiffre n'est plus recopié à chaque redéfinition. Côté
TypeScript : `src/lib/game/visites.ts` (`QUOTA_VISITE_QUOTIDIEN`), qui
remplace les deux constantes locales de `ville/page.tsx` et
`villes/page.tsx` ; `tests/unit/visites.test.ts` lit la dernière
migration pour vérifier la parité TS/SQL et l'absence de littéral dans
`visiter_ville()`. Délai d'une heure (P0018) et code d'erreur (P0019)
inchangés. *Correction de la note du §27* : elle situait la définition
de `visiter_ville()` dans la `0030` ; la dernière est en réalité la
`0024` (les `>= 3` de `0025`, `0028` et `0030` sont le quota des actions
AntiVille, pas touché).
*Effet à garder en tête* : le gain par visiteur et par ville est multiplié
par 8/3 ; les paliers de popularité du Jalon 22 (visites reçues
aujourd'hui) ont été calibrés avant ce changement — à relever peut-être,
**question posée à Adrien**.

**B. « +1 visite » puis les choix d'activité tout de suite en dessous.**
`VisiteAutomatique` affiche « **+1 visite** · Visite comptée, +X
habitant(s) » ; `ChoisirActivite` (donnée serveur, survit aux
rafraîchissements) affiche « **+1 visite** » pendant toute la fenêtre de
5 minutes et ouvre la liste des activités **d'emblée** si la visite a
moins de 2 minutes (`DUREE_VISITE_FRAICHE_MS`), sinon derrière « Changer »
(cas d'un joueur qui revient dans la fenêtre de grâce, comme le §27 le
laisse entendre). Choix : l'ouverture d'emblée vaut 2 minutes et non
toute la fenêtre de 5, pour que « Changer » garde un sens.

**C. Règles du jeu.** Page publique `/regles` (lisible sans compte),
lien discret « Règles » à gauche du sélecteur de langue dans la barre du
haut. v1 : le cœur de boucle seulement (principe, visites, activités et
jauges, influence, AntiVille, jumelages), plus une section « La suite »
qui annonce pays/guerre/mégaprojets/technologies. Contenu structuré dans
`src/lib/game/regles.ts`, **FR + EN dès la première version**
(`tests/unit/regles.test.ts` : chaque section dans les deux langues, même
nombre de paragraphes, plafond de visites cité depuis la constante). À
étoffer au rythme des jalons ; sert de base au parcours de découverte
(§26 F) sans l'attendre.

**Testé.** Unitaires : `visites.test.ts` (2), `regles.test.ts` (3).
E2E : `jalon13bis` réécrit pour 8 visites + refus de la 9ᵉ (population
9, 8 lignes en base) et pour l'interface jusqu'à « 8/8 » puis « Quota
atteint » (6 visites antérieures insérées pour ne pas rejouer 8 fois le
cycle d'interface) ; `jalon13ter` et `jalon5` en « x/8 » ;
`jalon17` : « +1 visite » et choix visibles sans « Changer » ;
`visites-regles.spec.ts` (3) : visite de 3 min => liste derrière
« Changer », page des règles FR puis EN (cookie de langue), lien de la
barre du haut.

---

### Découverte des petites villes neuves sur `/villes` (A-INTEGRER §26 E) — 02/10/2026

**Contexte.** Proposition E du §26 (idée de Claude chat, validée par
Adrien, qui l'a choisie comme première des six) : `/villes` est trié par
population décroissante depuis le Jalon 2, donc une ville neuve est
tout en bas, quasi invisible, et ne reçoit jamais ses premières visites.
Le §26 laissait « quel tri, où l'afficher » à spécifier : choix de
Claude Code ci-dessous.

**Fait.**
- *Sélecteur « Trier les villes »* sur `/villes`, sous le filtre de pays
  (paramètre d'URL `tri`, conservé par la sélection d'une ville et le
  bouton retour, combinable avec le pays et la recherche) :
  - **Les plus peuplées** (défaut, inchangé — choix d'Adrien du Jalon 2) ;
  - **Villes récentes** : création décroissante ;
  - **Qui attendent des visites** : visites reçues sur 7 jours croissantes
    (une ville sans aucune visite d'abord), à égalité la plus récente
    d'abord, **sans sa propre ville** ; chaque ligne affiche « n visite(s)
    / 7 j ».
- *Rang affiché* : au tri par défaut, comme avant (position dans la liste
  filtrée) ; avec les autres tris, le rang mondial de population (un rang
  1, 2, 3 n'aurait plus de sens dans une liste triée autrement).
- *Migration `0040`* : `visites_recues_7j_par_ville()` (aujourd'hui + 6
  jours précédents, UTC, comptes agrégés par ville sans révéler qui a
  visité, `security definer` parce que `visites` est restreinte au
  visiteur par RLS). Aucune table, aucun code d'erreur. Appelée
  uniquement quand le tri « à visiter » est choisi.
- *Logique pure* : `src/lib/game/triVilles.ts` (`trierVilles`,
  `triValide` : valeur inconnue => tri par défaut).

**Pas fait (volontairement).** Aucune mise en avant en dehors de
`/villes` (accueil, `/ville`) ni badge « nouvelle ville » : le tri est
discret, un joueur qui ne le cherche pas ne le verra pas. Proposition
possible si Adrien veut plus visible : trois « villes qui attendent une
visite » sur `Ma ville`.

**Testé.** `tests/unit/triVilles.test.ts` (6) : tri par défaut,
récentes, à visiter (ordre, ville du joueur exclue, égalités), liste
d'entrée non modifiée. `tests/e2e/decouverte-petites-villes.spec.ts` (2,
pays LU réservé) : fenêtre de 7 jours exacte du compteur SQL (aujourd'hui
et J-6 comptés, J-7 et J-20 non) ; ordre des trois tris dans l'interface,
badges « 0 / 1 visite(s) / 7 j », sélecteur reflétant le tri.
*Incident de mise en œuvre* : la fonction n'était pas visible côté API
après un premier collage de la migration (PGRST202) ; elle l'a été après
exécution complète de la migration puis `notify pgrst, 'reload schema'`.

---

### Parcours de découverte des nouveaux joueurs (A-INTEGRER §26 F) — 02/10/2026

**Contexte.** Proposition F du §26 (idée de Claude chat, validée par
Adrien) : avec 7 activités, des jauges, des monuments, des mégaprojets,
la guerre… un nouveau joueur arrive sans aucun guide progressif. Le §26
laissait « combien d'étapes, quels écrans » à spécifier : choix de Claude
Code ci-dessous, tous réglables.

**Fait.**
- *Une carte non bloquante* (`GuideDecouverte`), en haut au centre sous la
  barre (en haut pleine largeur sur mobile, où les panneaux sont en bas),
  **5 étapes courtes, une idée chacune** : (1) sa ville, (2) visiter —
  avec lien vers « Villes », (3) choisir une activité après une visite,
  (4) agir sur les autres (influence, jumelage, AntiVille), (5) le pays et
  les règles — avec lien vers « Règles ». Boutons « Suivant » /
  « Passer le guide » (« Terminer » à la dernière).
- *Qui le voit* : les comptes **créés il y a moins de 14 jours**
  (`estNouveauJoueur`, lu sur `user.created_at` dans `Nav`), sur les
  écrans du jeu seulement (Ma ville, Villes, Jumelages, Classement,
  Palmarès, Pays) — jamais sur l'accueil, la connexion, la création de
  ville, les écrans de rattrapage ni les règles.
- *Mémoire* : **localStorage** (`jeu-miniville-guide` : numéro d'étape ou
  `fini`), donc **aucune migration** et aucune donnée serveur. Conséquence
  assumée : par appareil — un joueur qui change de téléphone revoit le
  guide, et vider le navigateur le relance. La progression suit le joueur
  d'une page à l'autre et survit au rechargement.
- *Revoir le guide* : bouton en bas de la page `/regles` (remet à
  l'étape 1 et renvoie sur « Ma ville »). C'est aussi la seule façon pour
  un compte de plus de 14 jours de le lire.
- Textes **FR + EN** dans le dictionnaire.
- `playwright.config.ts` marque le guide « fini » par défaut pour tous
  les tests (comptes neufs => la carte recouvrirait les écrans testés) ;
  `guide-decouverte.spec.ts` repart d'un navigateur vierge.

**Pas fait (volontairement).** Pas de pointage d'éléments précis de
l'écran (« regarde ce bouton »), pas de blocage tant qu'une étape n'est
pas accomplie, pas de détection de l'action réelle du joueur (la carte
avance au clic sur « Suivant », pas quand il visite vraiment). Une v2
pourrait suivre les actions réelles (première visite, premier choix
d'activité) si Adrien juge ce guide trop passif. Pas de test e2e d'un
compte « ancien » : on ne peut pas antidater `auth.users` via l'API,
l'ancienneté est couverte en test unitaire.

**Testé.** `tests/unit/guide.test.ts` (3) : textes FR + EN de chaque étape,
écrans concernés, fenêtre de 14 jours. `tests/e2e/guide-decouverte.spec.ts`
(1 scénario complet) : pas de carte sur la connexion ; étape 1/5 à la
première arrivée sur Ma ville ; progression conservée après un changement
de page et un rechargement ; Terminer définitif ; Revoir le guide ;
Passer définitif. Captures vérifiées à l'œil, desktop et mobile (390 px).

---

### Page publique d'une ville, partageable (A-INTEGRER §26 C) — 02/10/2026

**Contexte.** Proposition C du §26 (cahier des charges §24, validée par
Adrien) : chaque ville doit avoir une page partageable publiquement, sans
connexion, en lecture seule, avec des liens vers un événement précis.
Prérequis de D (amis et suivi).

**Fait (sans migration).**
- *Page `/v/<id>`* (publique : hors de `PAGES_PROTEGEES` du middleware,
  qui protège les préfixes `/ville`, `/villes`, `/jumelages` — d'où le
  choix de `/v/` et non `/ville/<id>`) : nom de la ville en enseigne,
  pays, maire (pseudo), rang dans son pays, niveau, population,
  influence, **ville en 3D** (vocations, zonage, énergie, mégaprojets,
  technologies, monuments — tout est lu, rien n'est recalculé), liste
  « Réussites » avec un bouton Partager par événement, bouton « Partager
  cette ville ». Connecté : bouton vers `/villes?ville=…` pour la visiter
  (ou « Voir ma ville » pour sa propre ville) ; non connecté :
  « Créer un compte » / « Se connecter ».
- *Lien vers un événement* : `/v/<id>?evenement=<id>` met l'événement en
  avant en tête de page. Un identifiant invalide ou d'une autre ville
  n'affiche rien d'autre qu'un message neutre ; un identifiant de ville
  inconnu ou mal formé renvoie un vrai 404.
- *Événements partageables* : les **réussites** seulement (mégaprojet
  construit, technologie, monument). Attaques subies, manifestations et
  pertes de guerre restent dans le bulletin du maire et **n'apparaissent
  pas** sur la page publique ni n'ont de bouton de partage (choix de
  Claude Code : on partage ses victoires, pas ses déboires).
- *Bouton `BoutonPartager`* : feuille de partage du système sur mobile
  (Web Share API, si écran tactile), sinon copie du lien complet dans le
  presse-papiers avec confirmation « Lien copié ✓ » ; repli sur une
  boîte de dialogue si le presse-papiers est refusé. Présent sur la page
  publique, sur « Ma ville » (« Partager ma ville ») et dans le bulletin
  municipal de « Ma ville » et de « Villes » (une réussite se partage
  aussi depuis là).
- *Aperçu de lien* : balises `title`/`description`/Open Graph (nom de la
  ville) pour que le lien partagé s'affiche proprement. **Pas d'image
  d'aperçu** (génération côté serveur de la vue 3D : chantier à part).
- Refactor : le texte des événements est extrait dans
  `src/components/evenements.ts` (`libelleEvenement`) et partagé avec le
  bulletin municipal, dont le rendu reste le même.
- Textes FR + EN (`partage.*`).

**Sécurité / données.** La page ne lit que des tables et fonctions déjà
publiques (RLS `lecture_publique` : villes, utilisateurs/pseudos, blocs,
événements, monuments, technologies ; `jauges_ville` et `etat_megaprojets`
sont appelables sans connexion, vérifié). Elle n'**écrit jamais**
(aucune attribution opportuniste de vocations, mégaprojets, technologies
ou monuments, contrairement à `/ville`) : un visiteur anonyme ne
déclenche rien en base. Le pseudo du maire est affiché : il l'est déjà
dans les classements publics.

**Pas fait (volontairement).**
- Les événements « passage n°1 » et « accession à la présidence » du
  cahier des charges : ils ne sont **pas enregistrés** comme événements
  (la présidence est recalculée à la volée par le rang) ; les partager
  suppose de les journaliser — c'est le chantier A (journal mondial).
  « Victoire internationale » et « appel à la mobilisation » idem.
- Image d'aperçu (Open Graph image).
- Partage d'un classement ou d'un pays.

**Testé.** `tests/unit/evenements.test.ts` (6) : texte de chaque type en FR
et EN, donnée incomplète, quelles réussites se partagent, chemins.
`tests/e2e/partage-ville.spec.ts` (4) : page publique sans connexion
(maire, réussites, aucune attaque, invitation à s'inscrire, événement
mis en avant) ; 404 (ville inconnue, identifiant mal formé) et événement
d'une autre ville refusé ; boutons Partager qui copient le lien exact de
la ville et de l'événement (presse-papiers lu) ; connecté, « Voir ma
ville », « Partager ma ville » et partage d'une réussite depuis le
bulletin. Capture vérifiée à l'œil.

---

### Amis et suivi : suivre des villes (A-INTEGRER §26 D) — 02/10/2026

**Contexte.** Proposition D du §26 (cahier des charges §25 : « les joueurs
peuvent suivre leurs amis, consulter leurs villes et voir leurs
classements. Les relations sociales doivent rester simples »), validée par
Adrien. Le §26 laissait « à confirmer au moment de spécifier » si une
amitié réciproque est nécessaire.

**Choix de Claude Code.** Un **suivi unilatéral d'une ville**, sans demande
ni acceptation ni amitié réciproque : une liste de raccourcis personnelle
vers des villes d'autres joueurs, avec leur rang. L'autre joueur **n'est
pas prévenu** et personne ne voit qui suit quoi (RLS `lecture_propre` : on
ne lit que sa propre liste, pas de compteur d'abonnés). Si Adrien veut une
vraie notion d'« ami » (réciprocité, demandes), c'est une extension — le
modèle actuel n'en empêche pas.

**Fait.**
- *Migration `0041`* : table `villes_suivies (joueur_id, ville_id)`
  (clé primaire = la paire, `on delete cascade` des deux côtés) ;
  `suivre_ville()` (idempotente ; refuse sa propre ville `P0005`, une
  ville inconnue `P0004`, un autre joueur `P0007` ; **quota de 50**, nouveau
  code `P0029`, non appliqué à un suivi déjà existant) ;
  `ne_plus_suivre_ville()` ; `villes_suivies_rangs()` (rang dans le pays
  et dans le monde de chaque ville suivie, `rank()` comme partout : ex
  æquo au même rang, un seul appel pour toute la page). Aucune policy
  d'écriture : tout passe par les fonctions.
- *Page `/suivi`* (protégée, ajoutée à `PAGES_PROTEGEES` et aux écrans du
  guide) : liste triée par population, avec pays, niveau, population, rang
  dans le pays (badge Président si 1ᵉʳ) et rang mondial, lien vers la
  ville dans « Villes », bouton « Ne plus suivre », compteur `n/50`.
- *Bouton « ☆ Suivre » / « ★ Ne plus suivre »* (`BoutonSuivre`, composant
  serveur + actions `src/app/suivi/actions.ts`) dans le détail d'une ville
  sur « Villes » et sur la page publique `/v/<id>` (connecté, hors sa
  propre ville) ; désactivé quand la liste est pleine.
- *Découverte* : lien « ★ Mes villes suivies (n) » dans le panneau de
  « Villes », étoile ★ sur les villes suivies dans la liste.
- Textes FR + EN (`suivi.*`). `src/lib/game/suivi.ts` : miroir du quota,
  parité avec la migration vérifiée par `tests/unit/suivi.test.ts`.

**Pas fait (volontairement).** Pas d'onglet « Suivi » dans la barre de
navigation (7 onglets ne tiennent pas sur un téléphone : l'accès se fait
depuis « Villes ») ; pas de notification quand une ville suivie change de
rang ou débloque quelque chose (c'est le chantier B) ; pas de fil
d'activité des villes suivies (chantier A, journal mondial, pourra les
filtrer) ; pas de suivi d'un joueur ou d'un pays, seulement de villes.

**Testé.** `tests/unit/suivi.test.ts` (1) : parité quota TS/SQL.
`tests/e2e/suivi-villes.spec.ts` (4, pays AT réservé) : suivre idempotent,
refus de sa propre ville / ville inconnue, quota de 50 (49 + le 50ᵉ passe,
le 51ᵉ refusé en P0029, un suivi déjà existant jamais refusé) ; rangs pays
et monde avec ex æquo ; interface complète (suivre depuis « Villes », liste
vide puis remplie avec « 1ᵉʳ dans le pays » et Président, état du bouton
sur la page publique, retirer) ; accès réservé aux connectés et pas de
bouton sur sa propre ville.

---

### Journal du monde et centre de notifications (A-INTEGRER §26 A et B) — 02/10/2026

**Contexte.** Propositions A (journal mondial, cahier des charges §22) et
B (notifications de rivalité, §23) du §26, validées par Adrien. Elles
allaient ensemble : mêmes faits, deux présentations.

**Constat qui a simplifié le chantier.** Les faits dont elles ont besoin
sont **déjà enregistrés de façon durable** — `presidents` (chaque mandat
du n°1 d'un pays), `conflits` (chaque guerre, début, fin, résultat),
`resultats_diplomatiques` (alliances adoptées) et `city_events`
(mégaprojets, technologies, monuments, attaques, manifestations). **Aucune
table d'événements ne s'ajoute** : le journal et les notifications sont des
*lectures agrégées* (l'historique existant est disponible d'emblée, aucun
doublon à garder cohérent, rien à rattraper). Seul stockage nouveau :
`users.notifications_vues_le`.

**Fait (migration `0042`).**
- *`journal_monde(p_limite)`* : fil public. Retient les changements de
  présidence (un mandat qui a un prédécesseur ; le tout premier mandat
  d'un pays n'est pas une nouvelle), guerres déclarées et terminées,
  alliances adoptées, mégaprojets construits, **grands monuments**
  (palier 8 et au-delà sur 16 : un fil mondial noyé sous les 16 monuments
  de chaque ville serait illisible). Technologies de ville, attaques et
  manifestations restent à l'échelle de la ville.
- *`notifications_joueur(joueur, limite)`* : ce qui concerne la ville et le
  pays du joueur — tous les événements de sa ville (attaques subies et
  manifestations comprises), sa présidence gagnée ou perdue, les guerres
  et alliances de son pays. **30 derniers jours** et **rien d'antérieur à
  la création du compte** (un nouveau joueur ne reçoit pas l'histoire du
  monde). Colonne `non_lue` : plus récent que la dernière consultation.
- *`nb_notifications_non_lues`*, *`marquer_notifications_lues`*. Identité
  vérifiée (`P0007`) : un joueur connecté ne lit ni ne marque les
  notifications d'un autre (testé avec un vrai jeton de connexion).
- *Pages* : `/journal` (**publique**, sans connexion — comme `/regles` et
  `/v/<id>`) et `/notifications` (protégée) ; les « Nouveau » sont montrés
  cette fois-là, puis la page marque tout lu. **Cloche 🔔 avec pastille**
  de non lus dans la barre du haut, à côté des liens « Journal » et
  « Règles ». Textes en modèles `{ville}` `{pays}` du dictionnaire (FR +
  EN), personnalisés pour le joueur concerné (« Ton pays entre en conflit
  avec… », « Ta ville perd la tête de… »).
- Sur petit écran (≤ 480 px), le titre du jeu cède la place (le logo
  reste) pour que Journal, Règles, la cloche, le sélecteur de langue et
  « Se déconnecter » tiennent sur 360 px.

**Défauts trouvés en chemin (corrigés).**
- Un conflit terminé *avant* sa date de fin aurait daté l'événement dans
  le futur (visible seulement dans un test qui terminait un conflit à la
  main) : il restait « non lu » à jamais. En production un conflit ne se
  termine qu'une fois sa date passée ; le test a été corrigé.
- Dans la base de développement, des villes supprimées laissent des
  mandats de présidence dont le prédécesseur est la ville elle-même :
  « X prend la tête, devant X ». Ces lignes sont écartées à l'affichage
  (pas de nouvelle migration).

**Pas fait (volontairement).**
- **Notifications poussées du navigateur** (permissions, abonnement,
  backend d'envoi) : chantier à part, comme le §26 B le disait.
- **« Tu viens de perdre ta place n°1 (mondiale) »**, « ton rival vient de
  te dépasser » : seul le n°1 d'un *pays* est enregistré, pas le rang
  mondial ni une notion de « rival ». Il faudrait journaliser les
  changements de rang. Idem « passage n°1 » partageable sur la page
  publique d'une ville (§26 C).
- **« Ton pays débloque une technologie »** : les technologies existent par
  ville, pas par pays.
- **« Ton pays est en train de perdre la guerre »** : c'est un état en
  cours (jours gagnés), pas un événement ; il reste visible sur `/pays`.
- Pas d'e-mail ni de pastille sur l'icône de l'application.

**Testé.** `tests/unit/journal.test.ts` (8) : tous les modèles FR/EN, les
variantes « ton pays », la ville qui est son propre prédécesseur, donnée
incomplète. `tests/e2e/journal-notifications.spec.ts` (4, pays EE/LV/LT
réservés) : présidence (journal + notifications gagnée/perdue, premier
mandat absent du journal), guerre et alliance (journal public, notifiés =
seuls les pays concernés), événements de ville (attaque notifiée mais
absente du journal public ; grand monument dans le journal, petit non),
non-lus (pastille, marquage, nouvel événement, journal visible sans
connexion, refus d'identité `P0007`). Captures desktop et 360 px vérifiées.

---

### Place de n°1 mondial journalisée (suite de A-INTEGRER §26 A et B) — 02/10/2026

**Contexte.** Le journal du monde et les notifications (migration `0042`)
ne pouvaient pas dire « tu viens de perdre ta place n°1 » (cahier des
charges §23) : seul le n°1 d'un *pays* était enregistré (`presidents`). Ce
manque était noté « pas fait » dans l'entrée précédente.

**Fait (migration `0043`).**
- Table `premiers_mondiaux` (un mandat par ligne, `fin` nulle = en cours,
  au plus un mandat ouvert, lecture publique) et
  `verifier_premier_mondial()` : réconciliation opportuniste et
  idempotente, **exactement le mécanisme de `verifier_president`** à
  l'échelle du monde (appelée à l'affichage de « Ma ville », pas de tâche
  planifiée). Égalité de population : la ville la plus ancienne reste en
  tête, pas d'oscillation. Le premier appel ouvre un mandat sans passé :
  l'histoire d'avant n'a jamais été enregistrée et n'est pas inventée.
- `journal_monde()` et `notifications_joueur()` recréées avec une branche de
  plus : `premier_mondial` (« X devient la ville n°1 du monde, devant Y »,
  seulement s'il y a un prédécesseur d'une *autre* ville),
  `premier_mondial_acquis` et `premier_mondial_perdu` (notifications du
  propriétaire : « Ta ville X devient la n°1 du monde ! » / « …perd la
  place de n°1 mondiale au profit de Y »). Textes FR + EN.
- Test e2e : deux villes à 2 et 2,1 milliards d'habitants (< 2³¹) deviennent
  brièvement n°1 ; remises à 1 habitant aussitôt après pour ne pas fausser
  les autres suites.

**Toujours pas fait.** « Ton rival vient de te dépasser » : il n'existe pas
de notion de rival dans le jeu (à définir avec Adrien : la ville juste
devant ? une ville choisie ?). Partage d'un « passage n°1 » sur la page
publique d'une ville (§26 C) : les événements partageables sont des lignes
de `city_events` ; ce serait un nouveau type d'événement partageable à
rattacher aux mandats.

**Testé.** `tests/unit/journal.test.ts` (+1) ; `tests/e2e/journal-notifications.spec.ts`
(+1) : un seul mandat ouvert, idempotent, dépassement journalisé avec le
nom de la ville dépassée, gain notifié à l'une et perte à l'autre.

---

### Préparation de la mise en ligne (suite de la Phase 6) — 02/10/2026

**Contexte.** Le backlog fonctionnel documenté étant vide, le seul vrai jalon
restant est le **déploiement en ligne**, préalable à l'APK (A-INTEGRER §28)
et aux tests Play Store. Rien n'est déployé ni dépensé ; cette étape
prépare et vérifie tout ce qui peut l'être côté code. Guide complet :
`docs/DEPLOIEMENT.md`.

**Fait.**
- *Build de production vérifié* : `npm run build` (19 routes, aucune erreur
  de types ni de lint) et **25 tests de parcours réels contre `next start`**
  (connexion, création de ville, visites, choix d'activité, page publique,
  suivi, zonage) tous verts. Les pages protégées redirigent vers la
  connexion, les pages publiques répondent.
- *Défaut corrigé* : **`/dev/showroom`, outil de développement, était publié
  tel quel en production** (le commentaire en tête disait « jamais dans le
  jeu publié » sans rien l'empêcher). La page renvoie désormais 404 quand
  `NODE_ENV === "production"` (vérifié sur le build).
- *`npm run schema:complet`* (`scripts/assembler-migrations.mjs`) : assemble
  les migrations en un seul fichier (`supabase/schema-complet.sql`, ~380 Ko,
  ignoré par git, se régénère) pour initialiser un projet Supabase neuf
  d'un collage ; refuse un trou dans la numérotation.
- *`docs/DEPLOIEMENT.md`* : décisions à prendre, variables d'environnement,
  déroulé en 5 étapes, points d'attention après la mise en ligne.

**À savoir / à décider par Adrien** (détaillé dans le guide) : projet
Supabase de production séparé de celui de dev (les tests suppriment des
comptes en masse) ; plan gratuit Vercel Hobby **non commercial** (le plan
Pro, ~20 $/mois, deviendra nécessaire avec des packs payants — dépense à
valider) ; nom de domaine payant, facultatif ; e-mails de confirmation
d'inscription limités à quelques par heure avec le service intégré de
Supabase (SMTP à soi, ou confirmation désactivée pendant la phase d'amis) ;
même région pour Supabase et Vercel (« Ma ville » fait ~26 requêtes à la
suite).

**Pas vérifié** (impossible sans un vrai projet Supabase neuf) : que les 43
migrations s'appliquent d'un seul bloc sur une base vide (elles l'ont été
une à une en développement, dans cet ordre) ; le comportement réel des
e-mails de confirmation. Le premier essai réel (guide §4) le dira.

---

### Paliers de popularité relevés avec le plafond de visites à 8 (suite de A-INTEGRER §27 A) — 02/10/2026

**Contexte.** Question laissée à Adrien après le §27 A : le plafond de
visites passant de 3 à 8 par jour et par visiteur, les paliers de
popularité du Jalon 22 (visites reçues aujourd'hui : 5 / 15 / 50, calibrés
pour 3 visites par jour) deviennent trop faciles à atteindre. Adrien :
« paliers de popularité » (relever).

**Fait (purement TypeScript, aucune migration : les paliers sont de
l'affichage, la base ne fait que compter).**
- Les seuils de `palierVisites()` (`src/lib/game/popularite.ts`) suivent le
  plafond : seuils d'origine × `QUOTA_VISITE_QUOTIDIEN` / 3, arrondis —
  **1 / 13 / 40 / 133** à 8 visites par jour (Fréquentée dès 1, Très
  fréquentée 13, En vogue 40, Virale 133). Ils se recalculent d'eux-mêmes si
  le plafond change encore, sans retoucher ce fichier. Exportés sous
  `SEUILS_POPULARITE`.
- Choix de Claude Code : proportionnel au plafond (×8/3) plutôt qu'un
  chiffre rond arbitraire, pour que « Virale » garde le sens qu'elle avait
  (≈ 17 visiteurs utilisant leur quota) ; seuils facilement ajustables si
  Adrien les trouve trop hauts ou trop bas à l'usage.
- **Paliers de renommée (influence) inchangés** : le quota d'influence
  (5 actions par jour et par joueur) n'a pas bougé. Paliers de jumelage
  inchangés.

**Testé.** `tests/unit/popularite.test.ts` : valeurs aux bornes (12/13,
39/40, 132/133), seuils recalculés depuis le plafond, strictement croissants.
`jalon22-paliers…spec.ts` : 5 visiteurs × 3 visites = 15 → « Très
fréquentée » à l'écran (avant : 5 visites).

---

### Petits points : « voir où il est » étendu, monuments agrandis, notification de crise, données de carte retirées — 02/10/2026

**Contexte.** Adrien : « petits points ». Les points qui demandaient un
arbitrage lui ont été posés (monuments, §10 points 33 à 35) ; les autres
ont été traités directement.

**Fait.**
- *« Voir où il est » étendu* aux **mégaprojets construits** (bouton à côté de
  chaque mégaprojet construit, panneau Mégaprojets) et à l'**Énergie**
  (bouton 📍 sur la jauge Énergie dès que la ville a des installations —
  amène sur la centrale si elle existe, sinon sur la première installation).
  Même mécanisme que pour les monuments (emplacements déterministes,
  `emplacements.ts`) ; le test lit `canvas[data-repere]` pour vérifier la
  cible exacte. Les technologies n'ont pas d'objet visible en 3D : pas de
  bouton.
- *Monuments agrandis* (décision d'Adrien : « les agrandir nettement ») : un
  coefficient `ECHELLE_MONUMENT = 2,5` sur les mêmes silhouettes — de **4 m**
  (palier 0) à **15 m** (derniers paliers) de haut au lieu de 2 à 6 m, socle
  de 2,75 à 5 m de rayon. Toujours très en deçà de l'espacement des monuments
  (≥ 40 m). Réglable avec ce seul coefficient. Test : hauteur 4-15,5 m,
  emprise < 12 m.
- *Notification « Crise »* (§10 point 35, décision d'Adrien : notification
  seulement, **pas de fumée 3D**) : quand une ville atteint 500 attaques
  AntiVille dans la journée (palier Crise du Jalon 18), **tous les joueurs de
  son pays**, le sien compris, reçoivent « Une ville de ton pays est en crise
  : X a subi N attaques AntiVille en une journée » avec un lien vers sa page
  publique. Migration `0044` : branche `ville_en_crise` dans
  `notifications_joueur()` + index `actions_antiville (ville_id, jour)`
  (nécessaire : cette branche et `attaques_recues_aujourdhui()` comptent par
  ville et par jour). L'instant est celui de la 500ᵉ attaque.
- *Données de carte supprimées* : `src/data/cartes` (~930 Ko) et
  `scripts/generer-cartes-pays.mjs`, devenus inutiles depuis le retrait de la
  carte du pays (§23). Restent dans l'historique git si besoin.

**Tranché par Adrien, sans code.** §10 point 34 (gratte-ciel figés en crise
Énergie) : **non**, les tours continuent de monter, seul l'effet réel
(manifestation ×2) s'applique. §10 point 33 (immeubles et tours en
« logements ») : **non**, on garde le rythme en étages (les repères de
densité du cahier des charges restent valables).

**Pas fait.** *Rotation du zonage par ville* : écartée volontairement — elle
déplacerait les blocs déjà ouverts et déjà zonés des villes existantes
(contraire à « un bloc ouvert ne bouge jamais ») ; la rendre sûre demande un
champ d'orientation par ville fixé à la création, donc une migration et un
rattrapage pour peu de bénéfice. À rouvrir si l'orientation fixe gêne à
l'usage.

**Testé.** `tests/unit/monumentsEchelle.test.ts` (2) ;
`tests/unit/journal.test.ts` (+1 : texte de la notification de crise, FR/EN) ;
`tests/e2e/voir-ou-megaprojets-energie.spec.ts` (1 : mégaprojet construit et
Énergie, cible exacte de la caméra) ; `tests/e2e/journal-notifications.spec.ts`
(+1 : 499 attaques ne notifient pas, la 500ᵉ notifie le voisin et la victime
mais pas un pays étranger). Capture vérifiée à l'œil (monuments lisibles).

---

### Notes §29 à §34 d'Adrien : marques, boutique, présidence hebdomadaire, monuments dans la ville, AntiVille et visite — 02/10/2026

**Réception.** `docs/A-INTEGRER.md` a reçu six sections (§29 à §34). Une
contradiction avec le code a été **signalée à Adrien avant de coder**
(CLAUDE.md : ne pas trancher seul) : le §31 parle d'une bascule « dimanche
20 h » commune au vote de ressource et à la décision diplomatique, or aucun
mécanisme du code ne bascule à cette heure (semaine ISO, lundi 00 h UTC).

**§29 — bannières de vraies marques : règle permanente, rien à coder.** Ne
jamais nommer ni reproduire une vraie marque (logo, nom, produit reconnaissable)
dans un bâtiment, un monument, un mégaprojet ou un pack, sans validation
explicite d'Adrien au cas par cas. Ajoutée à `CLAUDE.md` (règles permanentes).
À rattacher à la section monétisation (§9, §10 point 4) le jour où elle est
prise.

**§30 — boutique : noté ici, FAIT le 05/10/2026 (voir « La boutique de packs de
thèmes », plus bas).** Deux surfaces distinctes prévues pour le
jalon « La boutique » de `BATIMENTS-ET-PACKS.md` §6 (après le MVP et le statut
légal du paiement) : une section secondaire dans « Ma ville » (thèmes possédés,
changement rapide — le sélecteur de thème actuel en est l'embryon) et un onglet
« Boutique » séparé (catalogue, aperçus, achat), « pas forcément principal ».
Questions laissées ouvertes par la note, à trancher le moment venu : emplacement
exact dans « Ma ville », onglet vide avant le paiement ou non, place dans la
navigation mobile (déjà dense : un 7ᵉ onglet n'y tient pas, voir `/suivi`).

**§31 — présidence à la semaine (migration `0046`).** Arbitrage d'Adrien : on
**garde la bascule existante, lundi 00 h UTC** (celle du vote et de la
diplomatie), plutôt que de passer les trois à dimanche 20 h. Nouvelle table
`presidents_semaine` (une ville présidente par pays et par semaine, figée) ;
`verifier_president()` ne désigne une présidente que s'il n'y en a pas encore
pour la semaine en cours, puis les mandats (`presidents`) suivent : un mandat
commence et finit un lundi 00 h UTC. Approximation assumée : l'ancien
classement n'étant pas archivé, la première lecture de la semaine désigne le
n°1 *à cet instant*, daté du lundi. Si la ville présidente est supprimée en
cours de semaine, une nouvelle est désignée à la lecture suivante.
`historique_pays()` donne le président de chaque semaine passée (une entrée par
semaine) et `/pays` l'affiche. Le badge « Président » en direct (rang n°1,
Jalon 7) n'est pas touché. Transition : les présidents actuels sont reconduits
pour la semaine en cours. *Non traité, à signaler* : la place de n°1 **mondial**
(`premiers_mondiaux`, ajoutée plus tôt aujourd'hui) reste calculée en direct —
le §31 ne parle que de la présidence d'un pays ; à aligner sur la semaine si
Adrien le souhaite.

**§32 — « Partager » des monuments : gardé tel quel.** Décision d'Adrien après
discussion : pas de changement de code (« Voir où il est » est inchangé).

**§33 — monuments DANS la ville (pas de migration).** Le retour d'Adrien lève
le point 5 du §25 (monuments hors de la ville). Décision : **dans les cours des
blocs**, du centre vers l'extérieur. Règle (`monumentsVille.ts`) : le monument
du palier p occupe la cour de la case n° ⌊p/2⌋ dans l'ordre de distance au
centre (`cases.ts`, extrait de `planifierBlocs()` sans changer le rendu —
empreinte de géométrie identique avant/après), deux par cour, le long du grand
côté. 16 paliers = les 8 cases les plus centrales. Les cases ne dépendent que
de la graine de la ville : un monument ne se déplace jamais, même si son bloc
n'est pas encore ouvert (la case est alors une friche au cœur de la ville).
`buildBlock()` ne décore pas une cour qui accueille des monuments
(`sansCour`) ; les friches évitent de planter des arbres dessus. Énergie et
mégaprojets **restent dehors** (une centrale en pleine ville serait étrange ;
décision par défaut, Adrien peut la renverser). Les monuments déjà dessinés
changent donc de place une fois (même effet de bord assumé qu'au 25a). La
position de la cour dépend d'un tirage au milieu du flux aléatoire du bloc : au
lieu de la deviner, `rectCourBloc()` exécute `buildBlock()` sur une géométrie
jetable. Taille ×2,5 déjà réglée plus tôt (« petits points »).

**§34 — une attaque AntiVille n'est pas une visite (migration `0045`).**
Arbitrage d'Adrien : *annuler aussi la visite déjà comptée*. (1) Côté
navigateur, toucher au panneau AntiVille (clic ou focus) suspend la visite
automatique de la page (`EVENEMENT_INTENTION_HOSTILE`). (2) Côté base,
`visites.gain` mémorise ce que chaque visite a rapporté (bonus de solidarité
compris) et `lancer_action_antiville()` supprime la visite de l'attaquant sur
cette ville si elle date de moins d'une minute : quota du jour et délai d'une
heure rendus, activité retirée des jauges, habitants repris,
`visite_annulee` renvoyé et affiché au joueur. `population_max` (record, ne
décroît jamais) n'est pas rendue ; les visites d'avant la migration ont un gain
de 0 (annulées sans reprise d'habitants). Délai de la visite automatique
inchangé (2,5 s).

**Testé.** Unitaires : `monumentsVille.test.ts` (6 : 8 cases centrales, deux par
cour, dans le bloc, jamais en contact, position stable quelle que soit la
population, tous à moins de 168 m du centre), parité visites adaptée, journal.
E2E (nouveau) `presidence-hebdo-antiville-visite.spec.ts` : présidence figée en
cours de semaine puis relevée à la semaine suivante, mandat daté d'un lundi
00 h UTC, une entrée par semaine dans `historique_pays`, relais si la ville
présidente disparaît ; annulation d'une visite récente (ligne supprimée,
habitants repris) et non-annulation d'une visite de 2 minutes ; visite
automatique suspendue au premier geste (horloge simulée). `jalon11` et
`journal-notifications` adaptés à la bascule hebdomadaire.

---

### Services, Commerce, Recherche et arbres de jardin (A-INTEGRER §36) — 05/10/2026

**Demande d'Adrien** : (A) les bâtiments Services, Commerce et Recherche
(`quartiers.ts`) restaient de simples boîtes à toit plat gris — seuls Énergie et
Industrie avaient été repris (défaut déjà signalé au §20 A) ; (B) l'arbre de
jardin était placé avec un décalage latéral fixe ±3,5 m, indépendant de la largeur
réelle de la maison, et touchait parfois le mur.

**A. Quartiers (aucune migration, aucun changement de règle).** Silhouettes
distinctes par stade, tirées de la graine de la parcelle (même parcelle = même
bâtiment) :
- **Services** — stade 0 : *école* (briques chaudes, toit à pignon, aile de classes
  derrière, cour pavée, mât de drapeau) ou *mairie* (pierre claire, perron à deux
  marches, deux drapeaux) ; stade 1 : *collège* (gymnase derrière,
  porche coloré) ou *clinique* (croix de façade, bandeau turquoise, auvent des
  urgences, ambulance) ; stade 2 :
  *hôpital* (aile latérale, grande croix, auvent des urgences, ambulance,
  hélistation sur le toit).
- **Commerce** — stade 0 : *boutique* de quartier (toit de tuiles, auvent rayé,
  terrasse avec parasols) ou *supérette* (vitrine, enseigne dressée sur le toit,
  voitures) ; stade 1 : grand magasin (second bandeau, marquise d'entrée sur piliers,
  gradin en retrait, lanterneau vitré) ; stade 2 : centre commercial (parvis pavé,
  voitures, climatiseurs).
- **Recherche** — façade vitrée côté rue, annexe, panneaux solaires, dôme ; stade 1 :
  rotonde cylindrique dans 45 % des cas ; stade 2 : aile de campus.
- Industrie et Stade inchangés. Couleurs nouvelles dans `constantes.ts`
  (`SERVICES_ECOLE_WALLS`, `SERVICES_PIERRE_WALLS`, `SERVICES_BANDEAU`,
  `RECHERCHE_PANNEAU`). Nouveaux petits assistants dans `quartiers.ts` (repère local
  de parcelle, acrotère, drapeau, auvent rayé, terrasse, croix, panneaux solaires).
- Toujours dans la parcelle (largeur ≤ 9,8 m, marge de 1,2 m testée) et une seule
  empreinte d'ombre par bâtiment.

**B. Arbre de jardin.** `placerArbreJardin()` (`batiments.ts`) choisit la plus
grande bande libre autour de la maison (hors côté rue), exige **2,0 m** entre le
mur et le bord du feuillage et **0,9 m** du bord de parcelle, et réduit l'arbre
(échelle ≥ 0,65) si la bande est étroite ; s'il n'y a vraiment pas de place, pas
d'arbre. Plus de décalage fixe : la marge dépend de la largeur réelle du bâtiment.

**Vérifié.** `arbreJardin.test.ts` (4) et `quartiersServicesCommerceRecherche.test.ts`
(12) : dans la parcelle, pas de valeur absurde, déterminisme, silhouettes variées,
plus riche qu'une boîte de 24 sommets. Section « Quartiers » ajoutée au showroom de
développement (`/dev/showroom`, 36 vignettes) ; revue visuelle : le commerce de stade 1
était encore une boîte avec une enseigne, d'où la marquise, le gradin et le lanterneau.
La géométrie des autres bâtiments est inchangée.

---

### Palmarès fusionné dans Classement (A-INTEGRER §35) — 05/10/2026

**Demande d'Adrien** : « retirer l'onglet historique et ajouter l'historique des
classements dans l'onglet classement ». Il n'existe pas d'onglet nommé
« Historique » ; la note du §35 l'identifiait comme **Palmarès** (classements
par période) et demandait de confirmer. **Confirmé par Adrien**
(`AskUserQuestion`) : c'est bien Palmarès.

**Fait (aucune migration, calcul des palmarès inchangé).**
- `/classement` a maintenant un commutateur **« Classement actuel » /
  « Palmarès »** (`?section=palmares`). « Classement actuel » est la vue par
  défaut, identique à avant (mondial / national / régional, par population,
  « ma position »). « Palmarès » affiche les 7 classements × 4 périodes ×
  3 échelles de l'ancienne page, avec les mêmes filtres.
- Le contenu de l'ancienne page est devenu une section réutilisable
  (`src/app/classement/Palmares.tsx`, `SectionPalmares`) : mêmes appels
  `palmares_*`, mêmes sous-composants ; seule la coquille (page, scène 3D,
  panneau) change. En vue Palmarès, les requêtes du classement en direct ne
  sont pas exécutées.
- **L'onglet Palmarès disparaît de la barre** (5 onglets au lieu de 6 : Ma ville,
  Villes, Jumelages, Classement, Pays — ce qui desserre aussi la barre
  mobile signalée au §30).
- `/palmares` reste valable et **redirige** vers
  `/classement?section=palmares` en conservant `classement`, `periode` et
  `echelle`. Aucun lien interne ne pointait vers `/palmares` (vérifié) ;
  `guide.ts` et le préchauffage des tests ont été mis à jour.
- Textes FR + EN (`classement.sectionActuel`, `classement.sectionPalmares`).

**Défaut trouvé en chemin (corrigé).** `tests/unit/visites.test.ts`, commité
dans la version `0.39.0`, contenait une chaîne littérale coupée par un retour à
la ligne (erreur de syntaxe TypeScript introduite par un script d'édition) :
ses 2 tests ne se chargeaient plus. J'avais lu « 202 passed » sans voir que le
fichier lui-même échouait au chargement. Corrigé ; le compte est maintenant
204 tests unitaires.

**Testé.** `jalon8bis-palmares.spec.ts` (le test d'interface réécrit) :
`/palmares?…` redirige en conservant les filtres, plus d'onglet Palmarès dans la
barre, le commutateur est présent avec la bonne section active, les filtres
(éprouvées, semaine, national) fonctionnent, `/classement` reste sur le
classement actuel par défaut. `guide.test.ts` mis à jour. Capture vérifiée.

---

### Mégaprojets à la bordure de la ville et centrale hors de la route (A-INTEGRER §37) — 05/10/2026

**Demande d'Adrien.** (A) Énergie reste à l'extérieur (rien à changer, bouton
« voir où il est » à **conserver** — *retiré ensuite sur ordre d'Adrien, voir plus
bas*) ; les mégaprojets viennent à la **bordure de la
ville** au lieu de la ceinture fixe à 450 m+, et un mégaprojet déjà construit
**ne bouge jamais**, même quand la ville grandit ensuite. (B) Bug : la centrale
électrique apparaît parfois à moitié sur une route. Les deux points sont laissés
à mon choix d'implémentation ; **aucune migration, aucun changement de règle de jeu.**

**A. Comment concilier « à la bordure » et « jamais déplacé » (décidé ici).**
La bordure change à chaque palier de population ; on ne la recalcule donc jamais :
chaque palier a une **case fixe**, tout juste hors de la ville *au moment où ce
palier s'ouvre*, et la position est une **fonction pure de (graine de la ville,
palier)** — `src/lib/ville3d/megaprojetsVille.ts`, même famille que
`monumentsVille.ts`. Aucune colonne en base : la scène 3D et le bouton « Voir où
il est » lisent exactement le même calcul.
- *Quelle case.* Dans l'ordre de distance de `cases.ts` (qui ne dépend que de la
  graine), la case d'indice **K + FENETRE_CANDIDATS − 1**, où K est le nombre de
  blocs ouverts au seuil du palier (`seuilMegaprojet()`, plafonné au rendu). Le
  zonage (25b) ne regarde que les `rang + 24` premières cases : à l'ouverture du
  palier, aucun bloc ne peut donc occuper cette case, **quelles que soient les
  vocations** (testé sur 3 tirages de vocations × zonage ou non). Au-delà du
  plafond de rendu (250 000 hab.), la ville cesse de s'étendre : les paliers
  suivants prennent les cases d'après (un cran par palier), que nul bloc
  n'atteindra jamais.
- *Où dans la case.* Au centre de la **cour commune** du bloc, comme les monuments.
  Quand la ville atteint plus tard cette case, son bloc se construit **autour** du
  mégaprojet (`sansCour`, `generer.ts` : la fontaine et les arbres de la cour
  disparaissent) : il se retrouve dans la ville, **à sa place d'origine**. Les
  friches (`buildIdleBlock`) et les forêts (`buildCountryside`, nouveau paramètre
  `evite`) ne plantent plus d'arbre dans les 12 m.
- *Distance.* À l'ouverture du palier, la case est à une à trois cases du bloc
  ouvert le plus proche ; à **190-280 m du centre pour les paliers 0 à 3**, 280-360 m
  pour le 4 (au lieu de 450 m et plus). Paliers suivants, au-delà du plafond de
  rendu : ~280-450 m jusqu'au palier 40, ~600 m au palier 100, ~680 m au 180
  (ville à 9 M d'habitants) — toujours dans le sol dessiné (±4 000 m) et le pan de
  caméra (1 100 m). `AXE_MEGAPROJETS` et `emplacementMegaprojet()` sont supprimés ;
  la ceinture à 450 m ne sert plus qu'à Énergie.
- *Côté interface.* Le composant `Megaprojets` est un composant client : importer
  `terrain.ts` (via `rectCourBloc`) alourdirait le paquet initial (§1 point 6). Les
  deux pages (`/ville`, `/villes`) calculent donc la place côté serveur et la passent
  dans `EtatMegaprojet.place`.

**Écart à signaler.** Adrien suggérait d'ancrer « au moment de la construction ». Je
l'ancre à l'**ouverture du palier** : la base n'enregistre que `construit_le`, pas la
taille de la ville à cet instant, et calculer la bordure à partir de l'état courant
au moment de l'affichage la ferait bouger. Si la ville a déjà dépassé la case quand
le maire achève le chantier, le mégaprojet apparaît directement dans la cour d'un
bloc ouvert (elle perd alors sa fontaine et ses arbres, comme pour un monument).
L'ancrage exact à la construction demanderait une colonne et une migration : à
décider avec Adrien si ce comportement ne lui convient pas.

**Effets de bord assumés.**
- Les mégaprojets **déjà construits** dans les bases de dev changent de place une
  fois (ancienne grille à 450 m → nouvelle case) ; rien n'est encore en production,
  et ils ne bougeront plus ensuite.
- Un mégaprojet construit retire la décoration de la cour de son bloc (une cour par
  mégaprojet), sans effet sur le reste du bloc.
- Taille inchangée (socle 2,4 m + 0,4 m par palier, comme au §25) : toujours petit
  à côté d'un bloc de 64 m ; l'agrandir reste à décider avec Adrien.

**B. Centrale à moitié sur une route.** Cause confirmée, mais la note désignait la
mauvaise fonction : `buildRoadsAndTraffic()` s'arrête au rayon de la ville ; c'est
`buildCountryRoads()` qui prolonge les deux grands axes jusqu'à 3 800 m, sur 10 m de
large avec des arbres d'alignement jusqu'à ~13 m de l'axe. L'axe +x traverse donc
le **milieu** du secteur d'Énergie (±30° autour de +x) : un tirage proche de l'axe
(environ 1 sur 10) posait la centrale, ou une ferme solaire, sur la chaussée.
- *Choix.* Écarter au tirage plutôt que retirer la route (ses prolongements sont
  voulus) ou décaler le secteur (`AXE_ENERGIE` et ses tests restent valables) :
  `emplacementEnergie()` et `emplacementCentrale()` repoussent du même côté, à
  `GARDE_ROUTE_ENERGIE` = 25 m de l'axe (13 m de bande route + arbres, plus 12 m
  d'emprise de la plus large installation, la ferme solaire) + un petit tirage pour ne
  pas aligner les objets déplacés. **Seuls les tirages qui tombaient dans la bande
  bougent** (une fois) ; les autres installations gardent leur place. Constantes
  `DEMI_ROUTE_CAMPAGNE` et `DEMI_BANDE_ROUTE_CAMPAGNE` dans `constantes.ts`,
  partagées avec `buildCountryRoads()`.
- **Bouton « Voir où il est » d'Énergie retiré** (`JaugesActivites`, prop `energie`
  supprimée) à la demande d'Adrien, le jour même, après que je l'avais conservé comme
  demandé au §37 A : il l'a explicitement désigné (« énergie ») quand je lui ai demandé
  quel bouton retirer avant le commit. Les boutons des **mégaprojets** et des
  **monuments** restent. `emplacementEnergie()` et `emplacementCentrale()` ne servent
  plus qu'au rendu 3D. La règle `.jauge .jauge-voir` de `globals.css` n'est plus
  utilisée (non retirée : le fichier portait des changements d'une autre session non
  commités).
- Les forêts n'empiètent plus sur l'Énergie (`zonesEnergie()`).

**Testé.** `tests/unit/megaprojetsVille.test.ts` (nouveau, 10) : case libre à
l'ouverture du palier malgré le zonage ; à une à trois cases de la ville et bien
en deçà de 450 m ; au centre de la cour, loin des rues ; cases distinctes même
au-delà du plafond de rendu ; position indépendante des autres paliers et de la
population ; dans la scène, même position à 5 000, 15 000, 40 000, 100 000, 250 000
et 9 000 000 d'habitants ; rien d'autre ne se superpose ; la cour perd exactement sa
décoration (comptage de sommets). `ville3dEmplacements.test.ts` (8, refait) : plus
aucune installation d'Énergie à moins de 25 m de l'axe sur 400 villes, et seuls les
tirages sur la route sont déplacés. **Sabotages vérifiés rouges** : retirer l'écart
de route, retirer `sansCour` pour les mégaprojets, retirer l'évitement des friches.
Suite unitaire complète verte, `tsc` propre. Vérifié à l'œil sur une page temporaire
(supprimée) : à 5 000 habitants le mégaprojet est juste au bord de la ville, à
250 000 il est au même endroit dans la cour d'un bloc entouré de maisons, et la
centrale est nettement à l'écart de la route. `voir-ou-megaprojets-energie.spec.ts`
adapté (nouvelle fonction de place, et vérifie maintenant que la jauge Énergie n'a
plus de bouton) mais **pas rejoué** (il demande Supabase).

---

### La boutique de packs de thèmes : « Thèmes de la ville » dans Ma ville + onglet Boutique (A-INTEGRER §30) — 05/10/2026

**Demande d'Adrien** (§30, 02/10/2026) : deux surfaces distinctes — (1) dans « Ma ville »,
une section secondaire qui montre les packs possédés, celui qui est appliqué et un moyen de
changer de thème sans quitter la page ; (2) un onglet « Boutique » séparé, pas forcément
mis en avant, avec le catalogue complet (possédés ou non), les aperçus et le point d'entrée
de l'achat. Packs cosmétiques, jamais d'avantage de jeu (`BATIMENTS-ET-PACKS.md` §4). Les
trois points laissés ouverts par la note ont été tranchés par Claude Code (ci-dessous, à
contester d'un mot).

**Décisions prises (raisonnement).**
- **Emplacement dans Ma ville.** Une section repliable « Thèmes de la ville · *thème
  appliqué* », placée après « Monuments » : c'est la même famille que Mégaprojets,
  Technologies et Monuments (catalogues repliables du panneau) et elle est repliée par
  défaut, donc jamais au premier plan. Elle remplace le sélecteur de thème qui, lui, était
  tout en haut du panneau — l'inverse de ce que demandait Adrien.
- **L'onglet existe dès maintenant, avec les packs gratuits.** Il n'y a rien à cacher
  (l'aperçu et le changement de thème marchent déjà) et les joueurs prennent l'habitude de
  l'endroit avant que le paiement n'arrive. Pas de pack inventé pour remplir la vitrine, et
  aucun nom de pack futur annoncé : seulement « d'autres packs arriveront ici, les payants
  ne s'ouvriront qu'avec le paiement ».
- **Navigation.** Ordinateur : « Boutique » est le 6ᵉ et dernier onglet. Sous 900 px et sur
  mobile, l'onglet laisse la place à une icône 🛍️ dans la barre du haut, à côté de la cloche.
  La barre du bas du mobile reste à **5 onglets** : à 375 px un 6ᵉ onglet laisserait ~60 px
  chacun, or « Jumelages » et « Classement » en demandent ~66. On y arrive aussi depuis le
  lien « Voir tous les packs dans la Boutique » de Ma ville.
- **[Remplacé le 05/10/2026 : Adrien a décidé qu'Haussmannien est PAYANT, voir « Mise à
  jour » en fin d'entrée.] Choix d'origine, gardé pour mémoire : Haussmannien reste gratuit
  pour tous**, comme depuis la migration `0034` (« la restriction viendra avec la
  boutique »). Rendre payant, du jour au lendemain, un pack que des joueurs utilisent est
  une décision commerciale, pas technique, et le paiement n'est ni branché ni validé (statut
  légal, `BATIMENTS-ET-PACKS.md` §5). La structure était prête : une ligne SQL, et ceux qui
  l'utilisent déjà le gardent (rattrapage `avant_boutique`).
- **L'aperçu est la VRAIE ville du joueur**, redessinée avec le pack dans la scène 3D de
  fond. Aucune image, aucun modèle, aucune dépendance : poids inchangé. Rien n'est
  enregistré ; c'est permis sur un pack qu'on ne possède pas (c'est tout l'intérêt de
  « essayer avant d'acheter », `BATIMENTS-ET-PACKS.md` §4). Sur mobile l'aperçu replie le
  panneau pour qu'on voie la ville (même mécanisme que « voir où il est »).
- **Le bouton « Acheter » est désactivé, avec sa raison écrite** (principe des maquettes :
  « boutons désactivés avec la raison écrite »). Il n'apparaît que pour un pack payant non
  possédé ; **[depuis la mise à jour du 05/10/2026, Haussmannien étant payant, il s'affiche
  pour tout joueur qui ne l'a pas]**. C'est le seul endroit à brancher le jour où le paiement
  existe.

**Fait.**
- **Migration `0047_boutique_packs.sql` (pas encore appliquée)** : tables `packs` (gratuit
  pour tous ou non) et `joueur_packs` (RLS : chacun ne voit que ses lignes, aucune policy
  d'écriture), `possede_pack()`, et `definir_theme_ville()` qui refuse un pack non possédé
  (nouveau code **P0030**) en gardant ses contrôles de la `0034` (maire seul, thème connu).
  Rattrapage : qui utilisait déjà un pack le garde. Elle ne touche à aucune colonne de jeu.
- **Front.** `src/lib/game/themes.ts` (catalogue `PACKS`, `packsDuJoueur()`, `etatPack()`,
  purs) ; `lirePacksDuJoueur()` (retombe sur « tout thème connu est libre » tant que la table
  n'existe pas — jamais une ville verrouillée sur une erreur de lecture) ; `lireDonneesRendu3D()`
  (les lectures de la page publique `/v/<id>`, extraites et lancées en parallèle ; `/v/<id>`
  l'utilise désormais) ; `useChoixTheme()` (changement immédiat à l'écran, retour en arrière +
  message si le serveur refuse) ; `PacksVille`, `CatalogueBoutique`/`CartePack`, page `/boutique`
  (protégée par le middleware) ; `definirTheme(villeId, theme)` renvoie maintenant un résultat
  au lieu d'être une action de formulaire muette ; la scène a `definirTheme()` pour l'aperçu.
  Textes fr/en ; `theme.titre` supprimée.
- **Barre du haut.** La barre débordait déjà à 820 px **avant** ce jalon (zone de droite hors
  de l'écran, « Ma ville » sur deux lignes) et le 6ᵉ onglet repoussait la limite d'environ
  90 px. Onglets en `white-space: nowrap`, barre resserrée entre 641 et 1040 px (logo seul,
  marges réduites) : plus aucun débordement mesuré à 820 px, 1024 px et 375 px.

**Testé.**
- `tests/unit/boutique.test.ts` (30) : droit d'usage (gratuit pour tous, payant seulement
  une fois obtenu, repli sans catalogue) ; états d'un pack ; le catalogue TypeScript colle au
  catalogue réel de bâtiments (familles annoncées = familles où le pack a de vrais modèles) ;
  **cosmétique** : la fiche d'un pack n'a que `id`, `familles`, `palette` (un champ de jeu
  casse le test), la migration ne mentionne ni population, ni influence, ni activité, ni
  défense, et `definir_theme_ville` ne modifie que `cities.theme` ; la migration fait
  respecter le droit d'usage (P0030 avant l'écriture, aucune policy d'écriture, listes de
  thèmes SQL = `THEMES`) ; rendu de `CartePack` dans ses trois états (« Acheter » désactivé
  avec sa raison, pas d'« Appliquer » sans droit, aperçu possible). Vitest rend maintenant
  le JSX (`esbuild.jsx: "automatic"` dans `vitest.config.ts`, tsconfig étant en `preserve`).
- **Sabotages vérifiés rouges (5/5)** : un pack payant possédé par tout le monde ; retirer
  `possede_pack` de `definir_theme_ville` ; un champ de jeu sur un pack ; l'aperçu qui
  enregistre le thème ; la Boutique qui reste dans la barre du bas mobile.
- `tests/e2e/boutique-packs.spec.ts` (7) : l'onglet (catalogue, aperçu sans rien enregistrer,
  application, base à jour), la section de Ma ville (repliée, changement sans quitter la page,
  lien vers la Boutique), mobile (5 onglets visibles, icône, pas de débordement), accès
  protégé, un thème ne modifie **aucune autre colonne** de la ville ; et deux tests qui
  s'ignorent tant que `0047` n'est pas appliquée (droit d'usage avec un pack jetable, RLS :
  pas d'auto-attribution, pas de modification du catalogue, pas de lecture des packs d'autrui).
  **5 passés, 2 ignorés.** Suite unitaire complète 276 verts, `tsc` et `lint` propres,
  `partage-ville.spec.ts` (4) vert après l'extraction de `/v/<id>`. Vérifié à l'œil à
  1024 px, 820 px et 375 px.

**Pas vérifié, à savoir.**
- **La migration `0047` n'est pas appliquée** (je n'ai pas d'accès SQL) : le chemin
  « pack payant non possédé refusé » n'est donc couvert que par le test statique du SQL et les
  tests de rendu, pas encore sur la vraie base. Les deux e2e concernés s'activeront seuls une
  fois la migration appliquée. **Aucun test ne modifie la ligne `haussmannien` de `packs`**,
  même un instant : « gratuit ou payant » est une décision commerciale d'Adrien, qu'une suite
  de tests ne doit pas renverser (le pack jetable `e2e-payant` sert à tester le droit d'usage).
- **Le paiement n'est pas branché**, volontairement (§5 : statut légal d'abord). Pas non plus
  de « pack premium débloqué pour les comptes de test » (§5) : aucun pack premium n'existe.
- Sur mobile, un aperçu replie le panneau : le bandeau « Terminer l'aperçu » se retrouve en
  le dépliant avec la poignée.

**Mise à jour — Haussmannien devient payant (décision d'Adrien, 05/10/2026).** La graine de
`packs` dans la migration `0047` (**toujours pas appliquée** : la modification s'est donc faite
dans la migration plutôt que dans une `0048`) donne `haussmannien` à `gratuit = false` ;
Classique reste gratuit pour tous. Conséquences : (1) tant que la `0047` n'est pas appliquée,
rien ne change (la boutique retombe sur « tout thème libre ») ; une fois appliquée, quiconque
n'a pas Haussmannien voit « Pack payant », « Aperçu » possible, « Acheter » désactivé, et le
serveur refuse l'application (P0030) ; (2) **ceux qui l'utilisent déjà le gardent** (rattrapage
`avant_boutique` de la migration, une ville en base l'utilisait) ; (3) comme **le paiement n'est
pas branché, personne ne peut l'obtenir** hormis par attribution : `insert into
public.joueur_packs (joueur_id, pack) values ('<id>', 'haussmannien');` ; (4) les comptes de
test e2e le reçoivent comme un achat (`accorderHaussmannien`), et un nouveau e2e vérifie l'état
« payant, pas possédé » sur la valeur réelle de la base (ignoré tant que la migration n'est pas
appliquée, ou si le pack redevenait gratuit) ; un test unitaire garde « Classique gratuit,
Haussmannien payant » dans la graine SQL. Pour revenir en arrière : `update public.packs set
gratuit = true where id = 'haussmannien';`.

---

### Bouton « Appliquer » du thème sans effet : doublon retiré (A-INTEGRER §38) — 05/10/2026

**Retour d'Adrien.** Cliquer sur « Appliquer » pour le thème haussmannien ne change rien.

**Cause (plausible, pas reproduite).** `/ville` portait deux contrôles de thème. Le
vieux formulaire HTML brut (`<form action={definirTheme}>`, en haut du panneau) était
le seul visible d'emblée, sans aucun retour d'erreur. À `HEAD`, `definirTheme` est
encore une action de formulaire (`FormData`) et le formulaire fonctionne ; mais la
boutique l'a changée en `definirTheme(villeId, theme)` : dans tout état où l'action
a la nouvelle signature et la page l'ancien formulaire, celui-ci lui passe un
`FormData` à la place du `villeId`, et le refus est silencieux — ni changement ni
message. Le vrai système (`<PacksVille>`, `useChoixTheme`) était replié sous un
`<details>`, plus bas. Dans les deux cas, retirer le doublon est la bonne correction.

**Fait.** Le formulaire et son import `THEMES` sont retirés de `src/app/ville/page.tsx`
(au moment de la reprise du §38, ce retrait était déjà dans l'arbre de travail non
commité, avec la clé `theme.titre` du dictionnaire : rien d'autre à retirer).
`PacksVille` est désormais le seul moyen de changer de thème sur « Ma ville ».

**Testé pour de vrai.** `jalon-bibliotheque-theme-haussmannien.spec.ts` (le test de la
page, qui visait l'ancien `<select>`, est refait) joue le vrai parcours : connexion,
ouverture de « Thèmes de la ville », clic sur « Appliquer : Haussmannien » → badge
« Appliqué », scène 3D en haussmannien, `cities.theme` à jour en base, aucune alerte ;
rechargement → le thème tient ; retour au classique par le même chemin ; et il vérifie
que l'ancien `<select name=theme>` n'existe plus. Pour lire le thème réellement rendu,
la scène pose `data-theme` sur le canvas (même principe que `data-repere`, §25).
**Aucun bug restant** dans `PacksVille` / `useChoixTheme` / `definirTheme`.

**À savoir.**
- L'enregistrement passe par une action serveur que Next met en file derrière la visite
  automatique (`visiterVille`) ; en dev, avec le re-rendu de `/ville` (~26 appels
  Supabase), il peut tarder de plusieurs secondes. L'écran, lui, change tout de suite
  (changement optimiste, bouton désactivé le temps de l'enregistrement). Pas de
  correction : c'est le comportement normal d'une action serveur, mais d'où des
  délais de 60 s dans le test.
- **La migration `0047_boutique_packs.sql` n'est pas encore appliquée sur la base de
  dev** (vérifié le 05/10/2026 : la table `packs` n'existe pas). Rien ne casse :
  `lirePacksDuJoueur` retombe sur « tout thème connu est libre » et
  `definir_theme_ville` est encore la version de `0034`. Les tests ci-dessus ont donc
  tourné sans le droit d'usage de la boutique. À appliquer par Adrien (SQL Editor,
  comme `0034`) ; je ne l'ai pas fait moi-même.

---

### Nouveau nom du jeu : Villopia — 05/10/2026

**Décision d'Adrien** (05/10/2026) : le jeu s'appelle **Villopia**. Le dépôt
GitHub a déjà déménagé vers `adriensaulme-prog/Villopia` (remote local mis à
jour). Résout le point ouvert §10 n°1. L'ancien nom, « jeu_miniville », n'était
qu'un nom de travail.

**Changé, côté joueur** : manifeste de l'appli installée (nom et nom court — le
nom court « MiniVille » désignait en réalité le jeu qui a inspiré celui-ci, pas
le nôtre), titre de page, accueil, barre de navigation, titres et aperçus de
partage (page publique d'une ville, partage depuis Ma ville), textes fr/en
(`accueil.titre`, `partage.descriptionMeta`). Le marqueur « (nom provisoire) »
est retiré, et la clé `accueil.nomProvisoire`, inutilisée, supprimée.
`villopia` rejoint les **noms réservés** (§8 : « le nom du jeu » ; les anciens
restent réservés, ils protègent encore de l'usurpation). Test de fumée mis à
jour.

**Changé, côté technique (sans effet de bord)** : nom du paquet npm, cache du
service worker (`villopia-shell-v2` : l'ancien cache est supprimé à
l'activation, le shell se reconstruit au prochain chargement), noms des
événements internes et clé de session du panneau, domaine des e-mails des
comptes de test (`@test.villopia.local` : ne concerne que les prochains
chargements de villes de test, les anciens comptes de test sont supprimés par
`is_test`, pas par leur adresse).

**Volontairement laissé** :
- la clé `localStorage` **`jeu-miniville-guide`** : la renommer ferait
  réapparaître le guide de démarrage chez ceux qui l'ont déjà terminé ;
  commentée dans `GuideDecouverte.tsx` ;
- le nom du **dossier local** `jeu_miniville` : le renommer casse chemins,
  sessions et historique de l'outil ; à faire par Adrien, hors session, s'il
  le souhaite ;
- les mentions de **« MiniVille »** qui désignent le jeu d'inspiration
  (Motion Twin, 2007) : §8, `GUIDE-METHODE.md` §1, `A-INTEGRER.md` ;
- les anciennes entrées de ce journal, qui citent « jeu_miniville » : c'est
  l'histoire.

**Pas fait, à décider par Adrien** : les icônes de l'appli sont de simples
barres sans texte (rien à changer, mais rien non plus ne porte le nom). Le
**nom de domaine** reste à choisir : c'est une dépense, donc validation
préalable (règle permanente, §1 point 1), et `docs/AUTHENTIFICATION.md` (e-mails
de confirmation depuis une adresse à soi) en dépend. La **disponibilité du
nom** (Play Store, marque déposée, domaine) n'est pas vérifiée : je ne peux
pas le faire sérieusement d'ici.

---

### La tour béton s'éclaire la nuit (A-INTEGRER §39) — 05/10/2026

**Retour d'Adrien** : les tours grises ne s'éclairent pas la nuit, à la différence des
tours vitrées colorées. **Aucune migration, aucun changement de règle de jeu.**

**Cause (confirmée).** Les fenêtres allumées viennent du matériau « mur-rideau vitré »
(`shaders.ts`, `m == 3`) ; la tour béton (`construireTourBeton`, `batiments.ts`) n'utilisait
que `MAT.CONCRETE` (`m == 8`), un matériau sans fenêtre ni émission : il n'y avait rien à
éclairer. Les quatre autres modèles de tour (verre, gradins, flèche, obélisque) sont déjà
vitrés ; seule la tour béton était aveugle.

**Fait.**
- *Fût* : un **noyau vitré** (`MAT.GLASS`, reculé de 0,7 m) dans une **ossature de béton
  apparent** : une dalle en saillie (1,0 m de haut) à chaque étage, quatre poteaux d'angle
  (2,2 m) et deux trumeaux par façade. Le noyau part du pied du fût, donc les étages du
  shader (`FLOOR_H` = 3,6 m) tombent pile sur les dalles ; la dalle cache l'allège (0,72 m)
  et laisse des **fenêtres en bandeau de 2,6 m**. Mêmes fenêtres éclairées que les tours
  vitrées (même shader : environ une sur trois allumée, lueur chaude). Vitrage gris-bleu
  sombre, pour rester une tour « grise ».
- *Socle* : `MAT.PODIUM` (vitrines et enseignes éclairées) au lieu du béton plein, comme
  les tours vitrées. La note ne parlait que du fût, mais un socle aveugle sous un fût allumé
  aurait laissé le rez-de-chaussée noir.
- *Chantier* : inchangé (grue, verre jusqu'aux deux derniers étages, squelette). Le vitrage
  est tiré dans le générateur de la tour **après** le cas « chantier nu » (F = 0), dont le
  tirage ne change donc pas.
- *Coût* : une dalle par étage comme avant, plus 13 boîtes fixes (noyau et poteaux). Pas de
  nouvelle dépendance ni de nouveau matériau (budget léger, §1 point 6).

**Effet de bord assumé.** Toutes les tours béton changent d'aspect (nouvelle géométrie),
sans rien déplacer ; rien n'est encore en production.

**Testé.** `tests/unit/tourBeton.test.ts` (nouveau, 7) : la tour finie contient du verre et du
béton ; le verre couvre exactement les étages du fût, calés sur ceux du shader ; le socle est
un socle commercial ; rien ne sort du lot (tour finie) ; en chantier le verre s'arrête avant
le squelette et le chantier nu n'a pas de verre ; déterminisme ; empreinte d'ombre. **Sabotage
vérifié rouge** : sans le noyau vitré, 3 tests échouent. Vérifié à l'œil dans la vraie scène
(page temporaire, supprimée) : de jour, les tours grises montrent leurs bandeaux de fenêtres
entre les dalles ; à 22 h 30 (Paris), elles s'éclairent comme les tours vitrées.

### Point fort du Résidentiel (A-INTEGRER §42) — 05/10/2026

**Demande d'Adrien.** Donner au Résidentiel un effet point fort/crise « symétrique aux rôles
défensifs d'Industrie/Services/Loisirs », en jouant sur la croissance de la population.
Le chiffre exact était laissé à mon choix.

**Correction de l'état des lieux du §42 (à connaître avant de relire la note).** Le tableau du
§42 dit « Résidentiel : aucun effet, ni bonus ni malus ». **C'est faux pour la crise** : la
*crise du logement* existe depuis le Jalon 18 (`visiter_ville()`, migration `0024`,
`SYSTEME-DEVELOPPEMENT.md` §4) — sous 60 % de jauge, la visite n'apporte l'habitant qu'avec
une probabilité jauge ÷ 60 %, avec son message dédié (`villes.visiteComptSansGain`) et son
test (`jalon18-effets-equilibre.spec.ts`). Seul le **point fort** était vide. Le tableau est
aussi inexact pour deux autres lignes : Commerce a bien un malus de crise (plus de bonus des
jumelages, `reclamer_bonus_jumelages()`) et Énergie aussi (sa jauge en crise compte double
dans le risque de manifestation, `verifier_manifestation()`) ; seule la Recherche n'a pas
de malus (« pas de nouvelle technologie » du §4 n'est pas codé).

**Décision.** Je **garde la crise du logement telle quelle** et j'ajoute le point fort qui
manquait, du même côté — le gain d'habitants par visite — plutôt que d'empiler un second malus
(« la ville perd des habitants plus facilement », proposé par le §42 qui ignorait la crise
existante) : ce serait une double peine sur la même jauge, et il toucherait l'équilibre des
manifestations et d'AntiVille réglé aux Jalons 14 et 18. Si Adrien veut quand même ce
second malus, c'est un ajout séparé.

| | Crise (< 60 %) | Point fort (> 120 %) |
|---|---|---|
| 🏠 Résidentiel | la visite ne rapporte l'habitant qu'avec une probabilité jauge ÷ 60 % (inchangé) | la visite a une chance de rapporter **un habitant de plus**, jusqu'à **25 %** à 150 % de jauge et au-delà (nouveau) |

- *Mécanique.* Migration `0049_residentiel_point_fort.sql` : une fonction pure
  `bonus_croissance_residentiel(jauge)` = `intensite_point_fort(jauge) × 0,25` (nulle jusqu'à
  120 %, progressive jusqu'à 150 %, plafonnée — comme tous les effets du §4), et
  `visiter_ville()` recréée à l'identique de la `0045` + 5 lignes : un tirage indépendant de celui
  du Commerce, dans le bloc où la visite rapporte l'habitant. Les deux se cumulent : au plus
  1 + 1 + 1 habitants par visite (+ la solidarité du §6bis, inchangée). Les zones de crise et de
  point fort ne se recouvrent jamais. `visites.gain` enregistre le gain réel, bonus compris : une
  visite annulée (§34) reprend aussi l'habitant de plus. Aucune colonne, aucun code d'erreur.
- *Pourquoi 25 % et pas 50 %.* 50 % est le plafond des rôles défensifs, mais ici l'effet joue
  sur la **vitesse de croissance**, déjà réglée au §17. Or un Hameau n'a que deux activités
  (Résidentiel et Loisirs) : son Résidentiel passe naturellement au-dessus de 120 % après une
  dizaine de visites, vers 150 % après une soixantaine (jauge = (élan + 6) ÷ (élan total + 20)
  ÷ 0,3). À 50 %, le début de partie aurait pris jusqu'à moitié de vitesse en plus ; à 25 %,
  comme le « croissance » du Commerce (seul autre effet sur le gain d'une visite), le changement
  reste modéré. **Un seul chiffre à relever** (`0.25` dans `bonus_croissance_residentiel()`)
  si Adrien veut plus.
- *Effet de bord à connaître.* À cause du point précédent, les **petites villes** profitent
  de ce point fort presque d'office (Résidentiel et Loisirs seuls dans les jauges), alors que
  les grandes villes, qui répartissent leurs visites sur sept activités, devront le chercher
  (se spécialiser en Résidentiel, au prix de crises ailleurs — manifestations, §5). C'est le
  même arbitrage « se spécialiser ou rester équilibré » que le reste du §4.
- *Pas de texte d'interface.* Aucun écran ne décrit aujourd'hui les effets des activités (seuls
  les états Crise/Fragile/Équilibré/Point fort sont affichés) ; rien à ajouter. Le message de
  visite affiche déjà le gain réel (`+2 habitants` quand le bonus tombe).

**Testé.** `tests/unit/residentielPointFort.test.ts` (nouveau, 11) : garde de schéma sans base
sur la **dernière** définition de `visiter_ville()` — crise du logement présente, tirage
du point fort présent dans le bloc de gain avec la jauge du Résidentiel, tirage du Commerce
conservé, `bonus_croissance_residentiel()` dérivée de `intensite_point_fort()` avec un plafond
dans ]0 ; 1]. **Sabotages vérifiés rouges** (sur le texte du schéma, comme
`nomsUniquesSchema.test.ts`) : tirage retiré, branché sur la jauge du Commerce, sorti du bloc ;
une migration ultérieure qui recopie `visiter_ville()` sans le point fort (la régression réelle :
onze recopies avant celle-ci) ; crise retirée ; tirage du Commerce retiré ; plafond à 1,5 ou à 0 ;
fonction ne dépendant plus de `intensite_point_fort()` ou supprimée.
`tests/e2e/residentiel-point-fort.spec.ts` (nouveau, 2) : la fonction pure aux jauges 0, 0,5, 1,
1,2, 1,35, 1,5 et 3 ; et, sur une ville poussée à ~240 % de Résidentiel, 50 visites dont le
total dépasse 50 (probabilité d'échec par malchance 0,75⁵⁰ ≈ 6×10⁻⁷), chaque visite à 1 ou 2
habitants, population et `visites.gain` égaux au total. **Ces deux tests n'ont pas pu être
joués** : ils s'ignorent tant que la migration `0049` n'est pas appliquée à la base (même principe
que `0047`) — et le SQL lui-même n'a donc été exécuté nulle part (il n'y a pas de base locale ;
`visiter_ville()` a été comparée ligne à ligne à la `0045`, seules les 5 lignes du §42 diffèrent).
**À appliquer par Adrien** (éditeur SQL de Supabase, comme les précédentes), puis relancer
`npx playwright test tests/e2e/residentiel-point-fort.spec.ts`.

---

### Cinq nouveaux packs de thème : Bord de mer, Village de pierre, Quartier industriel, Futuriste/éco, Nordique (A-INTEGRER §40) — 05/10/2026

**Demande d'Adrien** : construire cinq packs sur le modèle du pack Haussmannien, décider
gratuit ou payant, mettre à jour le statut du §40.

**Les cinq packs** (identifiants = valeurs de `cities.theme` : `bord_de_mer`, `village_de_pierre`,
`quartier_industriel`, `futuriste_eco`, `nordique`) — 17 nouveaux modèles, dans
`src/lib/ville3d/batimentsPacks.ts`, inscrits au catalogue de `batiments.ts` :

| Pack | Familles | Modèles | Silhouettes |
|---|---|---|---|
| Bord de mer | maisons | `maison-balneaire`, `maison-cabane-pilotis`, `maison-balneaire-vigie` | villa pastel à toit en pente douce, terrasse de bois et parasol ; cabane sur pilotis avec escalier ; villa à petite tour de vigie rayée |
| Village de pierre | maisons | `maison-pierre-bloc`, `maison-pierre-grange`, `maison-pierre-tourelle` | pierre sèche sous ardoise à faible pente, cheminée massive, auvent de bois, muret de pierre ; maison + grange en bois brut ; tourelle ronde coiffée d'ardoise |
| Quartier industriel reconverti | immeubles | `immeuble-loft-briques`, `immeuble-loft-verriere` | brique rouge, poteaux d'acier noirs, grande verrière centrale, sheds vitrés et cheminée ; socle de brique + étage-atelier vitré et château d'eau |
| Futuriste / éco | tours | `tour-eco-vegetale`, `tour-eco-solaire` | noyau vitré vert d'eau, terrasses plantées en quinconce, toit solaire + éolienne ; deux tours jumelles à panneaux solaires reliées par des passerelles |
| Nordique | maisons, immeubles, tours | `maison-nordique-bois`, `-pastel`, `-cabane` ; `immeuble-nordique-bois`, `-pastel` ; `tour-nordique-bois`, `-clocher` | bois clair, toits pentus sombres ou terracotta, sapins au lieu de feuillus ; cabane en A ; balcons de bois, lucarnes ; tour de bois lamellé à cap pentu |

- **Concurrents.** Une ville ne porte qu'un seul thème (`cities.theme`) : « Bord de mer » et « Village de
  pierre » (maisons), « Quartier industriel » et « Haussmannien » (immeubles) sont donc concurrents
  d'office, sans code en plus. Une famille sans modèle dans le pack choisi retombe sur « classique ».
- **Palettes** des fiches (`themes.ts`) = approximation des matériaux, comme pour Haussmannien. Les
  palettes suggérées du §40 ont servi de point de départ.
- **Un seul fichier de plus, deux fonctions partagées** : `decorJardin()` (batiments.ts) prend une
  essence d'arbre (« conifere » pour le Nordique, petit sapin) ; le repère local de parcelle de
  `quartiers.ts` (§36) a été extrait dans `repere.ts` pour être réutilisé, sans changement de comportement.
- **Tours** : même trame que les tours du pack de base (chantier à F = 0, ossature en construction, grue,
  couronnement à la fin), via une trame commune `tourModulaire()`. Les fenêtres des tours Nordique et
  Éco sont en matériau vitré : elles s'éclairent la nuit (à ne pas confondre avec le §39, tour béton).

**Gratuit ou payant : payants** (décision de Claude Code, à contester par Adrien). Haussmannien est
payant depuis le 05/10/2026 ; les packs sont le produit de la boutique, donc les cinq le sont aussi.
Le paiement n'étant pas branché, personne ne les possède tant qu'on ne les lui attribue pas :
`insert into public.joueur_packs (joueur_id, pack) values ('<id>', 'nordique');`. L'**aperçu** dans la
Boutique reste ouvert à tous. Pour en ouvrir un à tout le monde :
`update public.packs set gratuit = true where id = 'nordique';`.

**Migration `0048_cinq_packs_de_theme.sql`** (nouvelle, ne modifie pas la `0047`) : ajoute les cinq lignes
à `packs`, remplace la contrainte `cities_theme_check` (0034) par la liste de sept thèmes et redéfinit
`definir_theme_ville()` avec la même liste (mêmes contrôles et codes d'erreur P0004/P0007/P0022/P0030).
**À appliquer par Adrien** après la `0047`. Tant qu'elle ne l'est pas, les cinq packs apparaissent dans la
Boutique et s'aperçoivent, mais « Appliquer » est refusé par la base.

**Testé.** `packsTheme.test.ts` (66 tests) : chaque pack a de vrais modèles pour exactement les familles
annoncées et seulement elles ; chaque parcelle d'une de ses familles reçoit un modèle du pack ; chaque
modèle reste dans la parcelle (4 façades × 12 tirages), est déterministe, plus riche qu'une boîte et sous
le budget de triangles (600, 1 800 pour une tour) ; les tours gèrent le chantier. `boutique.test.ts`
suit désormais la dernière migration (liste des thèmes, contrainte, fonction), vérifie que les cinq sont
payants et que la `0048` ne touche à aucune donnée de jeu. E2E : les cinq packs sont dans la Boutique
(payants une fois la `0048` appliquée) et l'aperçu de chacun change le thème de la scène 3D sans rien
enregistrer. Revue visuelle : showroom (maintenant façade vers la caméra pour les trois familles) et ville
de démonstration rendue avec chaque thème.

---

### Monuments : une silhouette par type, trois rangs visuels (A-INTEGRER §43) — 05/10/2026

**Demande d'Adrien** (§43) : améliorer la qualité visuelle des monuments au-delà de leur taille (déjà
corrigée le 02/10/2026) : plus de variété de silhouettes, plus de détail de surface, un
`temple_national` ou un `monument_ultime` qui se distinguent d'une `borne_commemorative` autrement
que par la taille, la teinte or/bronze gardée comme signature. **Aucune migration, aucune règle de jeu
touchée**, `ECHELLE_MONUMENT` et la hauteur par palier (4 m à 15 m) inchangés.

**Constat.** `buildMonument()` choisissait l'une de trois silhouettes (colonne, statue, arche) par
`hashType(type) % 3` : sans rapport avec le vrai monument (un « banc public » pouvait sortir en colonne)
et 1 à 3 primitives nues, une seule teinte. Il y a désormais **une silhouette par type**, dessinée à la
main dans un registre `FORMES` (`src/lib/ville3d/monuments.ts`), sur des formes de base nouvelles
(`src/lib/ville3d/monumentsFormes.ts` : tronc de pyramide, arche, disque vertical, ellipsoïde lisse,
plaque d'inscription, marches, lampadaire, flamme).

| Palier | Type | Silhouette |
|---|---|---|
| 0 | `borne_commemorative` | bloc de pierre, fût effilé de bronze à plaques, coiffe pyramidale et boule |
| 1 | `banc_public` | banc de pierre à lattes de bronze et dossier, lampadaire derrière (allumé la nuit) |
| 2 | `fontaine_simple` | margelle, bassin d'eau, colonne de bronze, vasque, jet, quatre bornes |
| 3 | `buste` | piédestal à plaques, buste de bronze (épaules, cou, tête) |
| 4 | `obelisque` | deux assises, fût effilé à cartouches, pyramidion poli et pointe |
| 5 | `arc_triomphe_miniature` | piliers à reliefs, massif percé d'une arche ronde, archivolte dorée, attique à inscription, groupe sculpté |
| 6 | `horloge_municipale` | tour à pilastres et fenêtres éclairées la nuit, quatre cadrans (3 h), toit pyramidal doré |
| 7 | `fontaine_monumentale` | grand bassin, trois vasques étagées, quatre jets satellites, jet central |
| 8 | `statue_equestre` | haut piédestal à plaques, cheval et cavalier au sabre levé |
| 9 | `mur_remerciements` | mur couvert de plaquettes, deux pylônes à braseros, stèle centrale à médaillon |
| 10 | `arche_monumentale` | deux pylônes d'or, grand anneau en plein cintre, clé de voûte, soleil et flèche |
| 11 | `tour_observatoire` | fût trapu à fenêtres éclairées, plate-forme à garde-corps, grand dôme, lunette, mât |
| 12 | `statue_emblematique` | piédestal de marbre, figure drapée, couronne de rayons, torche levée, tablette |
| 13 | `temple_national` | stylobate, 12 colonnes, cella à porte dorée, deux frontons à médaillon, dôme et lanterne |
| 14 | `statue_geante` | colosse jambes écartées, bras ouverts (flamme, globe), couronne de rayons, disque solaire dans le dos |
| 15 | `monument_ultime` | trois gradins, quatre braseros, quatre obélisques d'angle, pylône d'or à plaques et bandeaux, lanterne, globe, flèche |

**Trois rangs, pour que le prestige se lise sans la taille** (`rangMonument()`, **choix de Claude Code, à
contester** : coupures aux paliers 5 et 10) :

| | Modeste (0-4) | Notable (5-9) | Prestigieux (10-15) |
|---|---|---|---|
| Socle | 1 marche | 2 marches | 3 marches |
| Pierre | brute, chaude | tire vers le marbre | marbre clair |
| Métal | bronze patiné, **mat** | or, **poli** | or poli, **plus vif** |
| Plaques | 1 ligne | cadre doré, 2 lignes | cadre doré, 3 lignes |
| Nuit | (le banc a son lampadaire) | fenêtres/lanternes propres au type | **4 lampadaires d'angle** allumés + flammes |

La **teinte or/bronze reste la signature** : `couleurMetal()` glisse du bronze (palier 0) à l'or
d'origine `#c9a227` (palier ~7) puis à l'or poli (palier 15), toujours en tons chauds ; les corps de
pierre sont teintés d'or (« grès doré »).

**Contraintes tenues, vérifiées par test.** Chaque monument reste dans le cercle de son socle (les
emplacements de `monumentsVille.ts` supposent ≤ 5,14 m : deux monuments par cour, à 14,5 m l'un de l'autre), au
sol (y ≥ 0,15) et sous la hauteur de son palier, en l'utilisant (≥ 90 %). Aucun nouveau matériau ni
shader : `MAT.PLAIN`, `PAINT` (poli), `WATER`, `LAMP` et `BEACON` (flammes, lanterne sommitale) existent
déjà. Poids : **+7 Ko gzip** de code (mesuré à l'esbuild), pas d'image, pas de dépendance. Géométrie : 300
à 1 500 sommets par monument ; les 16 ensemble ajoutent environ 8 800 sommets à une ville de 30 000
habitants (217 000 sommets, soit +4 %).

**Vérifié à l'œil dans la vraie scène** (`creerSceneVille`, vrais shaders, dans un harnais jetable hors du
dépôt, avec les 16 monuments débloqués, de jour et à 22 h 30). Ce contrôle a fait corriger cinq choses :
l'or poli virait au **jaune citron** (le matériau brillant éclaircit sa couleur : base assombrie de 20 %
ou 30 % selon le rang), les corps de pierre sortaient **presque blancs** (pierre plus sombre, grès teinté
à 55 % d'or), la tour d'observatoire faisait **minaret** (fût trapu, grand dôme, lunette), le cheval était
un meuble (jambes courtes, encolure en deux pièces, cavalier plus grand) et le mur ressemblait à une
façade d'église (plus bas, plus large).

**Pas couvert ici : les mégaprojets (§41).** La fusion des mégaprojets dans le catalogue était en cours
dans une autre session au moment de ce travail (migration `0050` présente, `CATALOGUE_BATIMENTS` en cours
d'écriture). Les 18 mégaprojets sont toujours dessinés par `buildMegaprojet()` (`megaprojets.ts`, inchangé :
trois silhouettes primitives, teinte d'activité), donc nettement moins détaillés que les monuments : c'est
l'incohérence que le §43 demandait d'éviter une fois la fusion faite. Pour la lever : une silhouette par
mégaprojet (18 dessins) et **une décision d'Adrien** : un mégaprojet garde-t-il sa teinte d'activité
(`MEGAPROJET_ACCENT`) ou prend-il l'or des monuments ? `buildMonument()` est prêt à les recevoir (registre
`FORMES`, et repli stable vers l'une de trois silhouettes pour un type inconnu : obélisque, buste, arc), mais
rien ne les y envoie aujourd'hui ; un palier ≥ 16 y serait en rang prestigieux, or poli. Non tranché ici.

**Testé.** `tests/unit/monumentsDetail.test.ts` (nouveau, 12) : les 16 types au même palier donnent 16
silhouettes différentes ; tout prestigieux est plus détaillé que tout modeste ; lampadaires d'angle
seulement chez les prestigieux ; métal mat chez les modestes, poli ensuite ; 1, 2, 3 marches ; échelle du
métal chaude et croissante ; ≥ 30 % de sommets chauds par monument ; emprise, sol et hauteur ; type
inconnu stable ; graine sans effet sur la forme. **Sabotage vérifié rouge** : retour au choix par
hachage → le test des silhouettes échoue. Les tests existants (`monumentsEchelle`, `monumentsVille`,
`monuments`) passent sans changement ; suite unitaire complète verte. Les e2e Supabase n'ont pas été
rejoués (aucune donnée touchée, et le serveur de dev partagé était cassé par le chantier §41).

**À vérifier par Adrien.** (1) `/dev/showroom`, nouvelle section « Monuments d'influence » : les 16
formes côte à côte, rendu simplifié (sans poli ni nuit). (2) Dans le jeu, les villes de test montent à
13 680 d'influence, donc jusqu'au palier 9 : pour voir les prestigieux, passer une ville de dev à
l'influence maximale, par exemple `update public.cities set influence_max = 1000000 where id = '<id>';`
puis recharger `/ville` (`avancer_monuments()` débloque tout, les monuments sont dans les cours des huit
blocs centraux), de jour puis la nuit.

---

### Fin des ressources de ville, mégaprojets fusionnés dans le catalogue des monuments (A-INTEGRER §41) — 05/10/2026

**Décision d'Adrien, structurante** (05/10/2026, confirmée par `AskUserQuestion`) : plus de ressources de
ville du tout (ni matériaux, ni revenus), et les mégaprojets rejoignent le catalogue à seuils d'influence
des monuments au lieu d'avoir leur propre système de financement. Mécanisme retenu : « automatique, comme
les monuments » — plus de choix du maire entre 3 options, plus de financement par les visiteurs, plus de
barre de chantier. Un mégaprojet apparaît tout seul quand le record d'influence (`influence_max`)
franchit son seuil. Les bonus permanents sont conservés ; seul le déblocage change. La structure de table
et la répartition des seuils étaient laissées à Claude Code.

**Structure : une seule table, un seul catalogue.** `monuments` (inchangée : ville, palier, date) et
`monument_catalogue()`, qui gagne deux colonnes (`famille` = `monument` | `megaprojet`, et `activite`, la
teinte d'un mégaprojet). Deux tables avec un déblocage partagé auraient obligé à tenir deux listes de
lignes synchronisées pour un comportement identique. **`palier` devient un identifiant stable, plus un
rang** : les monuments gardent 0 à 15 (leurs lignes existantes restent valides, rien à migrer), les 18
mégaprojets prennent 16 à 33. Conséquence : le catalogue n'est plus « palier croissant = seuil croissant »,
donc `avancer_monuments()` ne s'arrête plus au premier seuil non atteint, elle parcourt tout ce dont le
seuil est atteint. **Ne jamais renuméroter un palier existant** (écrit dans la migration et gardé par un
test). `avancer_monuments()` est aussi devenue sans course (`on conflict do nothing` + `found`) : deux
affichages simultanés ne créent ni doublon de ligne ni doublon d'événement.

**Seuils (répartition de Claude Code, modifiable).** Les 18 mégaprojets gardent l'ordre de leurs anciens
stades de population et s'intercalent entre les monuments, sans jamais partager un seuil : Bourg — Grande
école 400, Parc des sports 750, Marché couvert 1 500 ; Ville — Hôpital 2 000, Stade 3 500, Centrale
solaire 6 000, Zone logistique 8 000 ; Grande ville — Technopole 12 000, Gare TGV 15 000, Parc éolien
20 000, Opéra 30 000 ; Métropole — Tour emblématique 40 000, Aéroport 60 000, Centre de recherche 80 000,
Centrale 120 000 ; Mégapole — Grand stade 150 000, Centrale nouvelle génération 300 000, Siège
international 400 000. Le catalogue unifié compte 34 entrées. Les villes de test (jusqu'à 13 680 d'influence)
débloquent donc 8 mégaprojets sur 18 (jusqu'au Technopôle) et 18 entrées sur 34. L'ancienne suite « un palier de plus tous les 50 000 habitants »
(qui répétait le catalogue de la Mégapole) disparaît : sans choix, répéter les mêmes types n'a plus de sens.

**Bonus conservés à l'identique** : Stade et Grand stade (pertes de manifestation ×0,75), Centrale solaire,
Parc éolien, Centrale, Centrale nouvelle génération (élan Énergie +20 % chacune, cumulatif), Hôpital
(contamination ÷2), Opéra (propagande ÷2). Les trois fonctions qui les appliquent ne sont **pas
recréées** : elles appellent `nb_megaprojets_construits()`, dont seul le corps change (le nom reste,
« construit » veut dire « débloqué »). Elle lit désormais **directement le catalogue et `influence_max`**,
pas les lignes de `monuments` : un bonus ne dépend jamais d'un affichage de page, et il n'y a pas deux
sources de vérité.

**Supprimé** : `choisir_megaprojet`, `avancer_megaprojets`, `etat_megaprojets`, `megaprojet_options`,
`seuil_megaprojet`, `nb_megaprojets_ouverts`, `cout_megaprojet`, la table `megaprojets`, les colonnes
`cities.materiaux_depenses` et `revenus_depenses`, le composant `Megaprojets.tsx`, l'action
`choisirMegaprojet`, les clés de texte du choix et du financement. Les codes d'erreur P0024, P0025 et P0026
ne servent plus (laissés au registre, comme P0005). **Ce qui n'a PAS été supprimé, volontairement** :
`stock_ville()` reste, mais seulement pour les technologies (compteur de points de Recherche cumulés, jamais
dépensé : ce n'est pas une ressource à dépenser, et le §41 ne cite que matériaux et revenus). Les
**ressources nationales** des pays (Jalon 10) n'ont rien à voir et ne bougent pas.

**Placement 3D inchangé (§41 le demande).** Un mégaprojet se débloque par l'influence, donc on ne sait plus à
quelle taille de ville il apparaît ; sa case ne peut plus venir d'une population courante. Chaque mégaprojet
garde donc le **stade** qu'il avait (`POPULATION_STADE`, 5 000 à 250 000), constante du catalogue, qui fixe sa
case à la bordure d'une ville de cette taille — les premiers de chaque stade tombent exactement où ils
tombaient avant — et les 3 ou 4 d'un même stade se rangent sur des cases voisines, dans l'ordre du
catalogue. La taille du bâtiment suit le stade (pas le palier 16 à 33, qui donnerait des tours de 60 m). Une
alternative écartée : mémoriser la population au déblocage dans une colonne, plus fidèle à « à la bordure de
la ville » pour une petite ville très influente, mais une colonne de plus, un rattrapage et des positions
qui changent. **À contester par Adrien** si une petite ville très influente doit voir ses mégaprojets contre
son propre bord.

**Fusion des deux panneaux.** Le panneau « Mégaprojets du maire » n'existe plus ; « Monuments » devient
« Monuments et mégaprojets » : 34 entrées dans l'ordre où elles se débloquent, débloquées ou verrouillées avec
leur seuil, et « Voir où il est » pour chacune. Il est replié par défaut, comme l'était déjà celui des
monuments (les mégaprojets, eux, étaient dépliés). Les deux familles partagent le même type d'événement de
bulletin (`monument_debloque`, valeur = palier) ; `libelleEvenement()` lit la famille dans le catalogue. Les
anciens événements `megaprojet_construit` restent comme histoire, le type reste autorisé.

**Données existantes (base de dev).** La table `megaprojets` et ses chantiers sont supprimés, sans
reprise. Chaque ville récupère **silencieusement**, sans événement de bulletin (pour ne pas inonder le
journal mondial), les mégaprojets que son record d'influence atteint déjà. Une ville qui avait construit
un mégaprojet par sa population mais dont l'influence est faible le perd ; il reviendra avec l'influence.

**Testé.** Nouveau `tests/unit/catalogueBatiments.test.ts` (19) : structure (34 entrées, seuils tous
distincts, ordre, stades), fonctions, **parité du catalogue de la migration `0050` avec celui du code, lue
dans le texte SQL**, les 16 monuments inchangés par rapport à la `0030`, les bonus visant les mêmes types
que le SQL qui les applique, le financement bien supprimé, et aucune trace de l'ancien système dans `src/`.
**Sabotage vérifié rouge** (seuil changé côté code, type changé côté SQL, `drop table` retiré, un monument
renuméroté) ; ce garde a aussi trouvé un commentaire périmé dans `scene.ts`. `megaprojetsVille.test.ts`
réécrit (15, dont les 18 d'un coup, aucune collision avec les cours des monuments) ; `evenements.test.ts`
complété. Suite unitaire complète verte, typecheck et lint propres. **E2E, jouées sur une copie isolée de
l'application** (le serveur de dev partagé répondait 500 pendant le refactor, cause non établie : je n'avais
pas accès à ses journaux) : panneau à 34 entrées, bouton « Voir où il est » d'un mégaprojet
et scène 3D (avec la ligne de déblocage posée à la main, la migration n'étant pas appliquée), page
publique, journal, technologies, guide. **Pas jouées, faute de migration appliquée** : le nouveau
`tests/e2e/catalogue-monuments-megaprojets.spec.ts` (catalogue de la base identique à celui du code, 7
fonctions et colonnes disparues, déblocage automatique et sans doublon sous appels simultanés, Hôpital,
Opéra, centrales), le premier test de `jalon20-monuments.spec.ts` (maintenant 34 paliers) et
`voir-ou-megaprojets-energie.spec.ts` tel qu'écrit (déblocage par la base). **La migration
n'a pas été exécutée ni analysée par un moteur SQL** (aucun outil disponible) : relue instruction par
instruction, mais le premier vrai test est son application.

**À faire par Adrien.** Appliquer `0050` dans l'éditeur SQL Supabase, puis `notify pgrst, 'reload schema';`
(sinon l'API ne voit pas le nouveau `monument_catalogue()`), puis rejouer les trois e2e ci-dessus. Tant que
la `0050` n'est pas appliquée, le jeu fonctionne (plus aucun appel aux fonctions supprimées) mais les
mégaprojets ne se débloquent pas. Voir `docs/recette-catalogue-unifie.md`.

**Points ouverts.** (1) La **Zone logistique** (« insensible à la pause de chantier ») n'a plus de sens :
plus de chantier, elle reste purement cosmétique, comme avant (l'effet n'avait jamais été câblé). (2) La
**grève** ne « met plus en pause le chantier ni les matériaux » (§6 bis du document de conception, corrigé).
(3) `buildMegaprojet()` dessine encore les 18 mégaprojets avec trois silhouettes primitives et la teinte de
leur activité ; le niveau de détail des monuments (§43) ne les couvre pas, et une décision d'Adrien est en
attente (teinte d'activité ou or des monuments).

---

### Malus de crise de la Recherche : pas de nouvelle technologie (A-INTEGRER §42, suite) — 05/10/2026

**Demande d'Adrien** : après le point fort du Résidentiel, traiter les « malus de crise
Commerce / Énergie / Recherche » signalés comme absents au §42.

**État des lieux vérifié dans le code (le §42 se trompait sur deux lignes sur trois).**
- *Commerce* : a bien un malus de crise — plus de bonus des jumelages en dessous de 60 %
  (`reclamer_bonus_jumelages()`).
- *Énergie* : a bien un malus de crise — sa jauge en crise compte double dans le risque de
  manifestation (`verifier_manifestation()`) et les gratte-ciel s'arrêtent de monter.
- *Recherche* : **seule sans malus** — le tableau du §4 (`SYSTEME-DEVELOPPEMENT.md`) prévoyait
  « pas de nouvelle technologie débloquée », jamais codé. Rien à ajouter pour Commerce et Énergie.

**Fait : la crise de la Recherche gèle le déblocage des technologies** (migration
`0051_recherche_crise_technologies.sql`, **envoyée à Adrien, à appliquer** ; le SQL ne peut pas être
exécuté ici).
- `recherche_en_crise(ville)` : vrai quand `intensite_crise(jauge de Recherche) > 0`, c'est-à-dire sous
  60 % (seuil et lecture « Crise » de la barre, inchangés).
- `avancer_technologies()` (0029) sort aussitôt si la Recherche est en crise ; le reste de la fonction est
  identique (mêmes seuils, même bulletin « technologie débloquée »).
- **Rien n'est perdu** (règle permanente « jamais de destruction ») : les technologies déjà débloquées restent ;
  les points de Recherche continuent de s'accumuler ; au retour à 60 % le prochain affichage de la ville
  débloque d'un coup tous les paliers déjà atteints. C'est un gel, pas une pénalité chiffrée.
- Interface : sous « Technologies » dans Ma ville, une phrase explique la crise (« tes points continuent de
  s'accumuler, rien n'est perdu »), calculée depuis les jauges déjà lues (elle s'affiche même avant la `0051`,
  où le gel n'est pas encore actif — voir le point d'attention ci-dessous).

**Choix à contester.**
1. *Gel binaire plutôt que progressif.* Les autres effets du §4 montent de 0 à leur maximum ; un palier à
   débloquer n'a pas de demi-mesure honnête. Variante possible si Adrien préfère : le seuil du prochain palier
   multiplié par `1 + intensité de crise` (jusqu'à ×2 à jauge nulle) — rien d'autre à changer.
2. *Un gel qui se produit naturellement.* La jauge de Recherche vise 8 % des visites sur 180 jours avec un élan
   qui décroît : une ville qui néglige la Recherche passe sous 60 % (≈ moins de 4,8 % des visites récentes). C'est
   l'esprit du §5 (« équilibre ta ville »), mais le gel touche surtout les villes déjà grandes, où la Recherche
   est débloquée (dès « Ville », 15 000 habitants).
3. *Pas de second malus* (« perte de points de Recherche », etc.) : ce serait une double peine, comme pour le
   Résidentiel.

**Point d'attention.** Tant que la `0051` n'est pas appliquée, l'interface annonce un gel que la base n'applique
pas encore ; l'écart disparaît à l'application de la migration (l'avertissement ne bloque rien).

**Testé.** `rechercheCrise.test.ts` : seuil identique à `intensite_crise()` ; la garde précède tout déblocage ;
le déblocage de la `0029` est conservé ; aucune donnée de jeu touchée ; le message s'affiche en crise seulement
(FR et EN). E2E `recherche-crise-technologies.spec.ts` : l'avertissement apparaît en crise et disparaît quand la
Recherche en sort (passe) ; le comportement SQL — rien ne se débloque en crise, tout se débloque d'un coup au retour
à 60 %, rien n'est retiré à une nouvelle crise — s'ignore tant que la `0051` n'est pas appliquée.

### Mégaprojets : une silhouette par type, couleur naturelle (A-INTEGRER §44) — 05/10/2026

**Demande d'Adrien.** Redessiner `buildMegaprojet()` : une vraie silhouette par type, comme pour les monuments
(§43), avec « la couleur et la matière naturelles du bâtiment réel » plutôt qu'une teinte d'activité ou l'or des
monuments (décision tranchée par Adrien, qui levait le point ouvert du §43). Réutiliser les modèles d'Énergie
pour Centrale solaire / Parc éolien / Centrale, et la croix de `buildServices()` pour l'Hôpital. **Aucune
migration, aucune règle de jeu touchée** : déblocage, seuils et bonus du §41 inchangés.

**Fait.** `megaprojets.ts` n'est plus qu'un répartiteur : une table `SILHOUETTES` typée sur les 18 types du
catalogue (le compilateur exige une entrée par type ; un type inconnu retombe sur un bâtiment de pierre sobre).
Les dessins sont répartis en trois fichiers par famille — `megaprojetsCivils.ts` (école, hôpital, opéra, tour
emblématique, siège, technopole, centre de recherche), `megaprojetsEquipements.ts` (parc des sports, stade, grand
stade, marché, logistique, gare, aéroport), `megaprojetsEnergie.ts` — sur des briques communes
(`megaprojetsFormes.ts` : quad/triangle libres, toit à deux pans de matière libre, voûte, murs et gradins ovales,
mât lumineux, panneaux sur toit). `buildMegaprojet()` perd son paramètre `activite` ; `MEGAPROJET_ACCENT`
(constantes.ts) est supprimé ; `activite` reste dans le catalogue pour l'emoji de l'interface.

| Type | Silhouette et matières |
|---|---|
| Grande école | deux ailes de pierre claire, atrium vitré à lanterneau, perron et portique |
| Parc des sports | pelouse tracée dans une piste rouge, tribune à gradins bleus sous toit léger, deux mâts |
| Marché couvert | halle de brique et fonte verte, nef à verrière, bas-côtés de zinc, étals sous auvents rayés |
| Hôpital | bloc blanc, bandeau turquoise, **grande croix rouge de `buildServices()`**, urgences, hélistation |
| Stade | cuvette ovale à gradins bleus et blancs, pelouse tracée, quatre mâts d'éclairage |
| Centrale solaire | **trois rangées de la ferme de panneaux d'Énergie**, poste de transformation, grillage |
| Zone logistique | deux hangars bardés à toit bas, quais sous auvent, camion, piles de conteneurs |
| Technopole | campus : aile toute vitrée, aile blanche, atrium de verre, galerie, dôme, panneaux solaires |
| Gare TGV | halle en voûte de verre sur nervures d'acier, voies et quai, rame blanche, horloge |
| Parc éolien | **trois éoliennes d'Énergie** (mât, bande rouge, nacelle, pales, balise) |
| Opéra | façade classique à six colonnes et fronton, dôme de cuivre patiné, tour de scène |
| Tour emblématique | trois volumes vitrés en retrait, ailerons d'acier, couronne en pyramide, flèche, feu rouge |
| Aéroport | piste marquée, terminal à toit en voûte, tour de contrôle, avion sur l'aire |
| Centre de recherche | rotonde vitrée sous dôme, aile de laboratoires, tour technique, parabole, mât radio |
| Centrale | **bâtiments de la centrale d'Énergie** (hall à bandeau jaune, réservoirs, poste, grillage) |
| Grand stade | deux anneaux de gradins, galerie vitrée, toit-couronne blanc sur seize mâts, feux |
| Centrale nouvelle génération | enceinte à dôme, deux tours de refroidissement, halle à toit solaire, batteries |
| Siège international | lame de verre, salle des assemblées sous voûte, bassin, rang de mâts à fanions neutres |

**Réemploi des modèles d'Énergie.** `energie.ts` dessine pour le plein champ (une centrale s'étend sur ~45 m avec
ses pylônes ; une cour de bloc n'a que 14,5 m au minimum). Ces modèles sont donc **réduits** à l'emprise du
mégaprojet par `reutiliser()` (échelle uniforme des sommets, normales et motifs de texture intacts) : on appelle
les vraies fonctions `buildPanneauSolaire()`, `buildEolienne()` et — nouveau — `buildBatimentsCentrale()`.
Pour ce dernier, `buildCentraleEnergie()` a été scindée en bâtiments + pylônes de raccordement, **sans rien
changer à son résultat** (même ordre de tirages et de géométrie) : une centrale réduite avec ses lignes
électriques aurait débordé de la cour. La centrale « nouvelle génération » n'a pas de modèle d'Énergie à
reprendre : elle est dessinée à part, dans la même palette (murs clairs, bandeau jaune).

**Taille inchangée, à décider avec Adrien.** L'emprise (`rayonMegaprojet(stade)` = 2,4 + 0,4 × stade) et la
hauteur (`hauteurMegaprojet(stade)` = 4 + 1,7 × stade) sont celles d'avant, pour ne rien changer au placement
(§37) ni aux tests. Vu dans la vraie scène (zoom maximal de la caméra), un mégaprojet de stade 0 ou 1 est **plus
petit qu'un arbre** : les détails (colonnes, cadrans, gradins) ne se lisent bien que dans le showroom. Les
modèles sont dessinés en fractions de ces deux valeurs : les agrandir est un changement de ces deux fonctions,
dans la limite de la plus petite cour d'un bloc (14,5 m, donc un demi-côté de 7 m au plus).

**Vérifié.** Showroom `/dev/showroom` (nouvelle section « Mégaprojets », comme pour les monuments) puis vraie
scène sur une page temporaire (supprimée) : les 18 se dessinent à leur place, avec leurs vitrages et leurs
ombres. Une vérification a corrigé le Grand stade, d'abord haut comme un gazomètre.

**Testé.** `tests/unit/megaprojetsSilhouettes.test.ts` (nouveau, 14) : les 18 dessinés, sommets finis, dans
l'emprise du stade et sous le plafond de hauteur ; une seule empreinte carrée (ombre et placement) ; **à stade
égal les 18 géométries sont toutes différentes** ; aucun type ne retombe sur la silhouette de secours ; palette
propre (≥ 4 couleurs, ≥ 2 matières) ; déterminisme ; budget de poids (< 6 000 sommets chacun, < 40 000 pour les 18) ;
réemploi (cellules solaires en trois rangées, trois mâts blancs à balise, bandeau jaune et grillage sans pylône,
croix de façade à barre haute et barre large + bandeau turquoise). **Sabotages vérifiés rouges** : deux types sur la
même fonction, un type renvoyé au secours, réemploi retiré pour la centrale solaire, le parc éolien et la centrale,
croix retirée. Les vérifications d'emprise ont d'ailleurs trouvé de vrais débords (toit de hangar, conteneurs,
arbres, corniche), corrigés. Un seul cas de test ne distingue pas : une croix posée à l'arrière du bâtiment passerait
(tout parallélépipède a une face +z) ; le showroom la montre à l'avant.

---

### Mégaprojets à taille réelle : un bloc entier réservé (A-INTEGRER §45) — 05/10/2026

**Demande d'Adrien.** « Agrandis nettement `rayonMegaprojet()` / `hauteurMegaprojet()` pour que les
mégaprojets aient une taille réaliste à côté des maisons et des immeubles » ; résoudre le conflit avec
l'espace disponible à ma discrétion, sans jamais déplacer un mégaprojet déjà construit.

**Avant.** Demi-côté de 2,4 à 4,0 m (4,8 à 8 m de large), hauteur de 4 à 10,8 m : plus petit qu'un arbre
au zoom maximal, posé dans une cour de bloc (≥ 14,5 m).

| Stade | Mégaprojets | Largeur (avant → maintenant) | Hauteur (avant → maintenant) |
|---|---|---|---|
| 0 | Grande école, Parc des sports, Marché couvert | 4,8 → **22 m** | 4 → **11 m** |
| 1 | Hôpital, Stade, Centrale solaire, Zone logistique | 5,6 → **30 m** | 5,7 → **17 m** |
| 2 | Technopole, Gare TGV, Parc éolien, Opéra | 6,4 → **38 m** | 7,4 → **25 m** |
| 3 | Tour emblématique, Aéroport, Centre de recherche, Centrale | 7,2 → **46 m** | 9,1 → **40 m** |
| 4 | Grand stade, Centrale nouvelle génération, Siège international | 8 → **~50 m** (54 réduit à la place) | 10,8 → **55 m** |

Repères : une maison fait ~9 m de large, un immeuble 12 m, une tour 21 m ; un bloc 64 m.

**Le conflit d'espace, tranché : le bloc entier est réservé au mégaprojet** (première piste du §45).
- *Position inchangée* : le mégaprojet reste EXACTEMENT au centre de la cour de sa case (celle d'avant le
  §45 ; testé). Seule sa taille change.
- *Aucun lot ne s'y construit* (`siteMegaprojet`, `terrain.ts`) : ni maison, ni immeuble, ni gratte-ciel, ni
  cour. Le bloc garde sa pelouse, ses trottoirs et ses lampadaires (la rue reste éclairée) ; les arbres
  d'alignement disparaissent (ils seraient sous la plateforme). Quand la ville atteint la case, le bloc
  *devient* le mégaprojet : une grande place dans la ville, pas un bâtiment coincé entre des maisons. Les
  autres blocs sont identiques à ce qu'ils étaient (testé : mêmes empreintes à plus de 20 m).
- *Jamais de débord sur une rue ni sur le bloc voisin* : la cour est décalée de 7,25 m du centre de son bloc,
  donc le plus grand carré qui tient a un demi-côté de **24,75 m** (≈ 49,5 m de large). Le rayon du stade 4
  (27 m) est volontairement au-dessus : `placesMegaprojets()` le ramène à la place disponible (`rayon`,
  fonction de la graine et du palier seulement, comme la position), et `buildMegaprojet()` réduit alors le
  bâtiment *en toutes dimensions, hauteur comprise* (mêmes proportions). La deuxième piste du §45 (empiéter
  sur les rues) n'a pas été retenue : des plateformes sur la chaussée, avec leurs voitures, auraient été laides.
- *Forêts et friches* : la zone sans arbre autour d'un mégaprojet suit maintenant son emprise (un carré, plus un
  disque de 12 m).

**Ce que ça coûte (à connaître).** Une ville qui atteint la case d'un mégaprojet a *un bloc de moins* de maisons
et d'immeubles : le bloc compte comme ouvert (étendue, rues, événements de croissance), mais sans habitations.
C'est l'effet voulu (un aéroport prend la place d'un quartier), mais il est visible dans une grande ville. Les
mégaprojets étant à la bordure (§37), ce n'est pas le cœur de la ville. Si Adrien préfère garder les maisons
autour d'un mégaprojet plus petit, il suffit de ne réserver que le centre : le rayon est une constante.

**Hors périmètre, à signaler.** Le §46 (mégaprojets qui apparaissent loin du bâti quand l'influence dépasse
la population) propose de changer le choix de case ; il se recoupe avec ce chantier et déplacerait des
mégaprojets : à décider avec Adrien avant de coder, vu la règle « jamais bouger une fois posé ».

**Testé.** `megaprojetsVille.test.ts` (21 tests) : rayon et hauteur croissants, nettement plus grands qu'une
maison ou un immeuble ; position égale au centre de la cour ; emprise dans le bloc pour 6 villes et les 18
paliers ; rayon de stade conservé jusqu'au stade 2 et réduit seulement à 24,75 m au-delà ; réduction
proportionnelle (hauteur comprise) ; bloc réservé = une seule empreinte contre plus de 5 sans mégaprojet ;
lampadaires conservés ; reste de la ville intact. Silhouettes : bornes au bloc. E2E « Voir où il est » et
catalogue : passent. Revue visuelle dans la vraie scène (ville de démonstration à 60 000 habitants avec 9
mégaprojets) : stades, centrales et gares ont désormais la taille d'un bloc à côté des maisons.


### Mégaprojets étoffés : cotes réelles, abords, Grand stade refait (retour d'Adrien du 05/10/2026, suite du §44)

**Retour d'Adrien.** « Améliore les graphismes, certains sont très peu développés et moches (comme le grand
stade). » Constat dans la vraie scène : les modèles du §44 étaient des volumes nus aux détails à l'échelle d'une
maquette (mâts de 12 cm, arbres à 30 % de la hauteur, voitures absentes), et le Grand stade ressemblait à un
gazomètre (mur de 0,58 H, toit qui recouvre tous les gradins). Aucune migration, aucune règle de jeu touchée.

**Fait** (mêmes fichiers, même table `SILHOUETTES`, même signature de `buildMegaprojet()`) :
- *Cotes réelles.* Les volumes restent en fractions de R et de H (donc suivent la taille réelle du §45) mais
  tous les détails sont en mètres : marches de 17 cm, colonnes à base et chapiteau, mâts de 18 cm, quais,
  portes, voitures de 4,3 m (`car()`), arbres de ville (`tree()` de `mobilier.ts`, 4,5 à 7 m ; rapetissés sur
  les petites plateformes et ramenés à l'intérieur de l'emprise par `rangeeArbres()`).
- *Abords.* Pelouses, allées dallées, rangées d'arbres, lampadaires, bancs, parkings avec voitures,
  fontaines, grillages, routes d'accès, toitures équipées (climatisations) : nouvelles briques de
  `megaprojetsFormes.ts` (`pelouse`, `pelouseRayee`, `allee`, `escalier`, `colonne`, `acrotere`,
  `toitureEquipee`, `parking`, `rangeeArbres`, `pilastres`, `anneauPente` à secteur).
- *Grand stade refait.* Bas et large (hauteur ≤ 0,3 H et ≤ 0,62 R), façade à 40 pilastres et bannières
  bleu et rouge, bandeau vitré sombre, cuvette à sièges colorés par secteurs, toit-couronne blanc sur seize
  mâts avec sa couronne de feux, pelouse rayée aux lignes et aux buts, quatre grands mâts, parvis dallé.
- *Autres types* : hôpital en tour, deux ailes, auvent des urgences, ambulances et parking ; école à tour
  d'horloge, portique et mâts à fanions ; opéra à huit colonnes, grand escalier et fontaine ; gare à quatre
  voies, caténaires, quais couverts, deux rames, passerelle et taxis ; aéroport à piste balisée, deux avions,
  passerelles, tour de contrôle, hangar et parking ; stade à tribunes couvertes ; parc des sports à piste,
  tribune, club-house et courts ; marché à arcades, lanterneau et étals ; logistique à quais, camions,
  conteneurs, silos ; tour emblématique en **fût de verre effilé** (et non plus une pagode à retraits) ;
  centrale solaire en **champ** de rangées d'Énergie à leur taille d'origine ; parc éolien à pistes d'accès
  et poste ; centrale à panaches de vapeur.

**Testé.** `megaprojetsSilhouettes.test.ts` : deux tests nouveaux (chaque modèle fait au moins 1 000 sommets ;
chaque site a des arbres et un sol de pelouse, de parking ou d'allée) ; bornes ajustées (hauteur ≤ 1,7 H ;
moins de 8 000 sommets par modèle, 60 000 pour les 18 au stade 4 ; en réalité 1 500 à 4 800 chacun, ~40 000 au
total). **Sabotage vérifié rouge** : arbres supprimés. Les vérifications d'emprise ont fait corriger de vrais
débords (feuillage, étals, silos, nez de train, voitures de parvis). Effet de bord corrigé en route : les
sabotages de `residentielPointFort.test.ts` (§42) ne touchaient que la première copie de `visiter_ville()` ;
une migration d'une autre session (`0052`) en recopie une dernière avec le point fort, et trois sabotages
passaient au vert à tort — ils utilisent maintenant `replaceAll`.

**Vérifié.** Showroom (section « Mégaprojets ») et vraie scène sur une page temporaire de Belval-sur-Loire :
les 18 se lisent, le Grand stade est devenu un stade.

---

### Classement des pays et développements nationaux (A-INTEGRER §47 et §48) — 05/10/2026

**Demande d'Adrien** : implémenter ensemble le §47 (classement hebdomadaire des pays par catégorie de
ressource, bonus au n°1) et le §48 (vote hebdomadaire de développement national : attaque / défense /
développement, débloqué quand le stock couvre le coût), et refaire le visuel de `/pays` pour accueillir
les deux. Un seul système : les ressources nationales (une ressource = un vote de ressource d'un joueur,
Jalon 10) **se classent** entre pays ET **se dépensent**. Découpé en quatre étapes, comme le système des
7 activités : migration `0052` (classement et effets, §47), `0053` (avis des pays visés : l'effet
Culture n°1 et le Rayonnement), `0054` (développements, §48), puis la refonte de `/pays`. **Trois
migrations à appliquer par Adrien, dans l'ordre.** Tant qu'elles ne le sont pas, `/pays` fonctionne comme
avant (les nouvelles sections restent vides ou absentes : tous les appels échouent proprement).

**Méthode : le SQL a été EXÉCUTÉ, pour la première fois.** Le dépôt n'a pas de base locale, donc le SQL
des jalons précédents n'était vérifié que par relecture et par des gardes sur son texte. Cette fois, un
Postgres local jetable (PGlite, du Postgres en WebAssembly, installé hors du projet) rejoue les 51
migrations existantes puis les trois nouvelles, et fait tourner des scénarios : **111 vérifications
vertes** (28 pour `0052`, 16 pour `0053`, 49 pour `0054`, 18 pour le rejeu de la spec e2e). Les scénarios
et le harnais sont dans `scripts/postgres-local/` (pas une dépendance du projet : voir §10 point 41).
Cette exécution a aussi trouvé un défaut de la spec e2e avant qu'elle ne parte (deux dépôts de ressources
d'un même joueur sur les mêmes semaines : unicité d'un vote par semaine).

**Étape 1 — Classement et effets du §47 (`0052`).**
- *Le classement n'a pas de table* (§47). Le classement de la semaine S se calcule sur les ressources
  accumulées **avant** S (votes de ressource de semaines strictement passées) : il est **figé toute la
  semaine** (rien ne le déplace en cours de semaine), identique quel que soit le moment où on le lit, et
  reproductible pour n'importe quelle semaine passée. Conséquences assumées : la première semaine d'un
  monde neuf n'a pas de n°1 ; un pays sans ressource dans une catégorie n'y est jamais classé. Égalité :
  le code de pays le plus petit passe devant.
- *Chiffres* (laissés à Claude Code par le §47, **à contester**) : Industrie n°1 **+15 %** d'effort
  national en guerre (attaquant comme défenseur) ; Commerce n°1 **+10 %** de chance d'un habitant de plus
  par visite, dans toutes les villes du pays ; Technologie n°1 **−10 %** sur les seuils d'influence des
  monuments et mégaprojets ; Culture n°1 : avis ×2 (voir étape 2). Volontairement plus modestes que les
  points forts d'activité (+25 %) : un n°1 hebdomadaire est un effet de palier, pas une jauge qui se mérite.
- *Branchements* : `resoudre_conflits_en_cours()` (effort, bonus défensif et pertes passent par trois
  petites fonctions de réglage ; le bonus est évalué pour la semaine de chaque jour du conflit, donc la
  résolution paresseuse ne change pas le verdict), `visiter_ville()` (une chance de plus, tirée
  indépendamment de celles du Commerce et du Résidentiel), `avancer_monuments()` (seuil effectif =
  plafond(seuil × (1 − réduction)) ; un monument débloqué reste acquis si la réduction disparaît). Chaque
  fonction lourde est recopiée à l'identique de sa dernière version, aux lignes marquées §47 près.

**Étape 2 — Avis des pays visés (`0053`). Interprétation à valider.** Le §47 dit « Culture n°1 : son
vote pèse double dans les décisions diplomatiques des AUTRES pays qui le concernent » ; le §48 dit, pour
Rayonnement diplomatique, « le vote de ce pays pèse plus dans les décisions diplomatiques des autres pays ».
Or une décision diplomatique n'est votée **que par les citoyens du pays qui la propose** (Jalons 12-13) : le
pays visé n'a aucun vote, et doubler le poids des citoyens d'un pays dans SA PROPRE décision ne change rien à
une majorité pour/contre. **Interprétation retenue** : le pays visé obtient une voix, mais seulement s'il a de
l'influence culturelle (c'est ce que les deux bonus récompensent). Un citoyen d'un pays qui a « voix au
chapitre » peut donner un **avis** pour ou contre, pendant la semaine, sur une décision d'un autre pays qui
vise le sien ; l'avis pèse le poids du pays (2 pour Culture n°1, 1,5 avec le Rayonnement, 2,5 avec les deux) et
s'ajoute au décompte des citoyens du pays proposant à la clôture (adoptée si pour + avis pour > contre + avis
contre). Sans avis, la règle est celle d'avant. Un pays sans influence culturelle n'a pas de voix : on n'a pas
créé un vote de la cible pour tous les pays, qui changerait l'équilibre de la diplomatie bien au-delà des §47
et §48. Poids figé à l'avis ; un avis par joueur et par décision ; `resultat_decision_semaine()` n'est pas
modifiée (les avis ont leur fonction), pour ne pas changer des colonnes dont `/pays` et les tests dépendent.

**Étape 3 — Développements nationaux (`0054`).**
- *Catalogue fixe de 9* (les exemples du §48, repris), 3 par famille, coût en 2 catégories au plus, de 10 à
  16 ressources (`developpements_catalogue()`, seule source ; `developpements.ts` le reflète, un test les
  compare). Coûts **à calibrer** avec de vrais pays : une ressource = un vote d'un joueur, un pays de 10
  joueurs en produit 10 par semaine.
- *Le vote, chaque semaine* : **un développement par famille** est proposé (choix de Claude Code ; le §48
  laissait le choix avec un tirage dans tout le catalogue — un par famille garantit un vrai choix entre
  attaque, défense et développement). Tirage déterministe (hachage du pays, de la semaine, du
  développement), qui exclut les acquis. Un vote par joueur et par semaine. En fin de semaine, le plus voté
  (égalité : ordre du catalogue) est **débloqué automatiquement** si le stock couvre son coût **dans chaque
  catégorie** ; sinon il **repasse au vote la semaine suivante** à la place du tirage de sa famille.
- *Stock = production − dépense.* Le stock pris en compte est celui de la **fin de la semaine du vote**
  (pas celui du moment où la page est lue : la clôture est paresseuse). **Le classement et l'effort de
  guerre restent sur la PRODUCTION cumulée** : dépenser ne fait ni perdre la 1ère place ni baisser l'effort
  (sinon débloquer une attaque affaiblirait l'effort). Un acquis ne se retire jamais (aucune migration ne le
  supprime ni ne le modifie : le garde de schéma y veille).
- *Clôture paresseuse et idempotente* (comme la présidence et la diplomatie) : à l'affichage de `/pays`, au
  vote, et par chaque réglage de jeu qui lit les développements (croissance, seuils, guerre, AntiVille, rendus
  `volatile` pour cela). Un développement débloqué le lundi s'applique donc dès qu'on s'en sert, sans attendre
  qu'on ouvre `/pays`. Pas de double dépense entre deux lectures simultanées : le résultat est inséré d'abord,
  et seul celui qui l'a inséré débloque. Date d'effet = lundi suivant la semaine du vote.
- *Effets* (chiffres laissés à Claude Code, **à contester**) : Arsenal national +20 % d'effort quand le pays
  attaque ; **Mobilisation éclair** effort ×2 le premier jour d'un conflit où le pays attaque ;
  **Service de renseignement** voir l'effort national d'un pays visé avant de voter une rivalité ;
  Fortifications bonus défensif ×1,5 → ×1,75 ; **Bouclier civil** pertes de population quotidiennes de la
  guerre ÷2 (arrondi inférieur : une ville qui perdait 1 habitant par jour n'en perd plus) ; Résistance à la
  propagande attaques AntiVille subies ×0,75 (les trois types) ; Expansion urbaine +10 % de croissance
  (cumulable avec Commerce n°1 : +20 % au plus) ; Rayonnement diplomatique voix au chapitre et +0,5 de poids
  d'avis ; Avance technologique −10 % des seuils (cumulable avec Technologie n°1 : −20 %). **Deux écarts
  avec le texte du §48, à connaître** : (a) « Mobilisation éclair : effort au maximum dès le premier jour, sans
  montée en puissance » — il n'y a pas de montée en puissance dans la mécanique (l'effort est recalculé chaque
  jour, sans rampe) ; j'ai retenu une impulsion initiale (×2 le jour 1) ; (b) « Bouclier civil : plafond de
  perte réduit en dessous de 5 % » — ce plafond n'est **jamais atteint** (7 jours à 0,1 % font 0,7 %), l'abaisser
  n'aurait eu aucun effet : l'effet porte sur la perte quotidienne.
- `historique_pays()` gagne le développement voté de chaque semaine (et s'il a été financé) et les catégories
  où le pays était n°1 mondial (type de retour modifié : `drop` puis `create`).

**Étape 4 — Refonte de `/pays`.** Le §48 laissait le choix entre « ajouter à la suite » et « repenser
l'organisation » ; **première proposition** (Adrien donnera son avis) : l'en-tête du pays reste toujours
visible (statut, président, quatre chiffres), puis **cinq onglets** (`?onglet=`, rendus côté serveur comme
les sections de `/classement`, chacun ne charge que ses données) : **Cette semaine** (par défaut : les trois
décisions hebdomadaires — ressource, développement, diplomatie —, les décisions des autres pays qui visent le
nôtre avec l'avis pondéré, le renseignement, le conflit), **Classement** (4 lignes : rang, en tête, effet
actif signalé), **Développement** (stock produit/dépensé/disponible, catalogue des 9 par famille avec coûts
colorés selon que le stock couvre, acquis), **Pays** (villes principales, présidents), **Historique**. Le
panneau est plus large sur ordinateur, les quatre chiffres de l'en-tête tiennent sur une ligne sur mobile,
`page.tsx` passe de 635 à 199 lignes (un composant par onglet dans `src/app/pays/onglets/`). Le panneau des
monuments (`/ville`, `/villes`) affiche le seuil **réduit** (« −10 % ») quand le pays en a un.

**Testé.** `developpements.test.ts` (14 : catalogue du code identique au SQL, 9 développements 3 par famille,
`peutFinancer`/`manque`, chaque chiffre d'effet retrouvé dans le SQL, i18n fr/en), `classementPays.test.ts`
(11 : chiffres du n°1 retrouvés dans le SQL, `seuilEffectif`, poids de voix, cumuls), `paysSchema.test.ts`
(24 : le garde passe, et **23 sabotages le font passer au rouge** — branchements retirés, recopies d'anciennes
migrations qui les perdraient, classement qui compte la semaine en cours, effort lu sur le stock, clôture sans
garde de double dépense, acquis supprimés...). Deux sabotages avaient d'abord une ancre fausse (fins de ligne
CRLF, remplacement de la première occurrence seulement) : corrigés, c'est précisément ce que ces tests devaient
attraper. E2E : les trois specs qui lisaient `/pays` (jalons 9 et 11, refonte de l'historique) changent
d'onglet cible ; **les 26 tests des specs existantes sur `/pays`, le vote, la diplomatie et la guerre passent** avec la
nouvelle page, migrations non appliquées (preuve que la dégradation est propre). Nouvelle spec
`classement-developpements-pays.spec.ts` (4 tests : classement figé et effets, avis, développements
financé/reconduit, écran) : **s'ignore** tant que la `0054` n'est pas appliquée ; sa logique a été rejouée
dans le Postgres local. **Vérifié à l'œil** (Playwright sur une page de maquette à fausses données, supprimée) :
les cinq onglets sur ordinateur, trois sur mobile ; deux défauts trouvés et corrigés (la classe `.meta`,
réservée aux lignes de liste, cassait les cartes en grille ; un badge trop long).

**Limites.** Les trois migrations ne sont pas appliquées à la base de dev (je n'ai aucun moyen d'y exécuter du
SQL) ; la spec e2e et l'écran avec de vraies données n'ont donc pas tourné. Un monument à seuil réduit
n'apparaît qu'à l'affichage de la ville (le déblocage est paresseux, comme avant). Les règles du jeu
(`/regles`) ne décrivent toujours pas les pays (« dans une prochaine version »). Les notifications (cloche)
ne signalent pas un développement débloqué : suite possible.

**À appliquer par Adrien** (éditeur SQL de Supabase, dans l'ordre) : `0052_classement_pays.sql`,
`0053_avis_pays_vises.sql`, `0054_developpements_nationaux.sql`, puis relancer
`npx playwright test tests/e2e/classement-developpements-pays.spec.ts`. Recette :
`docs/recette-pays-classement-developpements.md`.

---

### Énergie à l'écart, paysage pour /pays, monuments et stades agrandis (retour d'Adrien du 05/10/2026, A-INTEGRER §49)

**Demande d'Adrien (§49, cinq corrections, traitées dans cet ordre).** C : l'Énergie est trop proche du Siège
international. E : le fond de `/pays` doit être un paysage de campagne, sans ville. A + B ensemble : monuments plus
grands et plus détaillés (la statue géante à 50 m ou plus), posés sur une parcelle de façade au bord de la rue, plus
dans les cours. D : Stade et Grand stade beaucoup plus grands, sur plusieurs blocs réservés. Règles : fonction pure
de la graine, un objet posé ne bouge plus, application légère, pas de migration SQL, aucune vraie marque.

**Texte du §49 absent de la copie locale.** `docs/A-INTEGRER.md` s'arrête au §48 et la version à jour (projet
Claude « Jeu », `claude/A-INTEGRER.md`) n'est pas lisible depuis la session de code : le travail suit la consigne
reçue telle quelle. À resynchroniser (le statut du §49, dans l'encadré de `A-INTEGRER.md`, le dit aussi).

**Ce qui bouge une fois (à connaître).** « Un objet posé ne bouge plus » reste vrai *après* ce changement, mais
trois choses ont dû changer de place, une seule fois chacune, et c'est voulu par les demandes elles-mêmes :
- *C* — les mégaprojets déjà posés dans le secteur d'Énergie (ou à moins de 150 m) : **133 couples graine × palier
  sur 3 600 (3,7 %)**, uniquement aux paliers 28 à 33 (aéroport, centre de recherche, centrale, grand stade,
  centrale nouvelle génération, Siège international), les seuls qui arrivent jusque-là ;
- *D* — le Stade et le Grand stade (leur bloc d'origine n'est plus qu'une partie de leur site) ;
- *A+B* — les 16 monuments quittent les cours pour une parcelle de façade.
Tout le reste est exactement où il était (testé).

#### C — le secteur d'Énergie est exclu du placement des mégaprojets

*Cause mesurée.* Le Siège international (palier 33, stade 4) tombait à la case la plus lointaine, vers 440 m,
pile à l'entrée du secteur d'Énergie (axe +x, ±30°, à partir de 450 m) : sur la graine `graine-89`, **17 m** d'une
éolienne ; sur 200 graines × 18 paliers, 121 couples passaient sous 150 m d'une installation réelle (paliers 28 à 33).
*Règle.* Une case est refusée si son centre est à moins de **150 m** du secteur d'Énergie
(`distanceAuSecteurEnergie`, `emplacements.ts` : distance au trapèze où tombent toutes les installations ; elle
minore donc la distance à n'importe laquelle). Le mégaprojet refusé prend la **première case libre plus loin** dans
l'ordre de `cases.ts` (jamais entre la ville et son ancienne case : il reste hors de la ville quand elle atteint son
stade), les autres gardent leur case. Le calcul porte toujours sur les 18 paliers, puis on ne rend que ceux demandés :
la place d'un mégaprojet ne dépend ni des autres mégaprojets débloqués ni de leur ordre. Mémorisé par graine.
*Résultat.* Sur 200 graines × 18 paliers, la distance la plus faible entre le centre d'un mégaprojet et une
installation d'Énergie réelle est de **164 m** (consigne : environ 150 m).

#### E — `/pays` : un paysage, sans aucune ville

Avant : `/pays` n'annonçait pas de scène, il montrait donc celle de la dernière page visitée, une ville tirée au
hasard. Maintenant `<SincroniserScene paysage seed={countryId} …/>` : un mode `paysage` de la scène (`scene.ts`,
`generatePaysage`, `generer.ts`) pose la campagne des villes (forêts, route bordée d'arbres) *jusqu'au centre* :
un carrefour de campagne, 64 bosquets autour, aucun bloc, aucun bâtiment. La graine est l'id du pays consulté (un
paysage par pays, toujours le même) ; le soleil suit la latitude, la longitude et le fuseau de ce pays. Caméra,
brouillard, ombres et occlusion utilisent un rayon propre (260 m). Une ville du jeu n'est pas touchée (les arbres
d'alignement de la route démarrent toujours à 190 m ; seul le paysage les rapproche, à 30 m).
*Première proposition* : c'est volontairement sobre (le but du fond est de laisser lire le panneau) ; relief,
champs, fermes ou plans d'eau sont possibles si Adrien en veut.

#### A + B — monuments : plus grands, plus détaillés, sur une parcelle de façade

*Taille.* Un monument tient dans le carré d'une parcelle (14,5 m) : son emprise est un cercle de 8 à 13 m, et c'est
en hauteur qu'il grandit. Chaque type a son gabarit (rayon, hauteur ; `GABARITS`, `monuments.ts`) — un banc ne monte
pas à 50 m :

| Rang | Monuments (hauteur) |
|---|---|
| Modestes | borne 9 m · banc 7 m · fontaine 9 m · buste 13 m · obélisque 22 m |
| Notables | arc de triomphe 17 m · horloge 27 m · fontaine monumentale 15 m · statue équestre 22 m · mur 11 m |
| Prestigieux | arche 34 m · observatoire 40 m · statue emblématique 46 m · temple 24 m · **statue géante 56 m** · **monument ultime 62 m** |

(Avant : de 4 à 15 m, la statue géante à 15 m.) Un type inconnu retombe sur un gabarit tiré de son palier.
*Détail.* Les 16 silhouettes sont redessinées à cette échelle, pas simplement agrandies : proportions des statues
(équestre, Liberté, colosse) liées à la hauteur de la figure et non à la largeur du socle, rangs de fenêtres éclairées
des tours, cadrans à repères, beffroi, quadrige de l'arc, triglyphes du temple, rayons du soleil de l'arche, dauphins
et mufles des fontaines, plaquettes du mur, pagne et torse du colosse. Ellipsoïdes lisses (méridiens/parallèles) à la
place de l'icosphère, cylindres à 1,5 fois plus de pans. Un défaut corrigé en route : le disque solaire du colosse
était posé *devant* sa tête.
*Place pavée.* Chaque monument vient avec une place pavée de la taille de sa parcelle, avec bordure et quatre
jardinières d'angle (`buildPlaceMonument`), y compris quand son bloc n'est pas encore ouvert (friche).
*Emplacement (B).* Un monument par bloc, dans les **16 blocs les plus centraux** (le palier p dans le p-ième) ; dans le
bloc, une parcelle du pourtour tirée au hasard parmi les **jardins publics** (rang 6 et au-delà ; jamais le parking, une
maison, un immeuble ni le gratte-ciel : un monument ne déloge rien) ; sa façade (le côté +z de la construction) est
tournée vers la rue de la parcelle. Les cours gardent leur fontaine et leurs arbres. Les mégaprojets évitent ces 16
blocs. Les monuments sont tous à moins de 222 m du centre.
*Pourquoi un par bloc et pas deux par cour dans huit blocs.* Deux monuments de 40 à 60 m côte à côte se cachent
mutuellement ; un par bloc les espace d'au moins 80 m et les rend lisibles du centre à la périphérie.

#### D — Stade et Grand stade : plusieurs blocs réservés

*Taille.* Le Stade occupe un carré de **2 × 2 blocs** (144 m de côté, rues intérieures comprises, plateforme de
136 m, 36 m de haut) et le Grand stade **3 × 3 blocs** (224 m, plateforme de 216 m, 60 m de haut — ramené à 3 × 2 blocs après le
retour d'Adrien, voir l'entrée suivante), contre un seul
bloc avant (Stade 30 m de large, Grand stade ~50 m). Pelouse tracée : 63 × 38 m et 106 × 67 m (le terrain de football
réglementaire est de 105 × 68 m).
*Placement* (`megaprojetsVille.ts`). Le site part de la case d'ancrage de son stade et s'étend **vers l'extérieur** de
la ville (même signe que la case en x et en z) : les blocs ajoutés sont plus loin du centre que l'ancre, et le carré ne
chevauche jamais un axe central. Tous ses blocs sont réservés : libres de tout autre mégaprojet et des 16 blocs de
monuments, et à plus de 150 m du secteur d'Énergie par leur **bord** (`distanceRectAuSecteurEnergie`). Les mégaprojets
d'un bloc sont placés d'abord (positions inchangées, sauf l'Énergie) ; le Stade et le Grand stade prennent ensuite la
première case libre à partir de la leur.
*Ce que ça change dans la ville.* Les blocs réservés n'ont ni lots ni cour ; les **rues intérieures disparaissent**
(chaussées, trottoirs, lampadaires, arbres d'alignement, abribus, voitures : `buildRoadsAndTraffic(…, sansRue)` et
`cotesInternes` de `buildBlock`), le pourtour garde sa rue et ses lampadaires. Quand la ville atteint le site, elle
perd donc jusqu'à 4 ou 6 blocs d'habitations (le §45 en retirait un ; 9 pour le Grand stade avant son passage à 3 × 2) — voir §10 point 43.
*Bâtiments* (`megaprojetsEquipements.ts`, réécrits) : cuvette à deux niveaux de gradins (sièges bleus et blancs au
Stade, bleus et rouges au Grand stade) séparés par un déambulatoire vitré, mur à 48 ou 96 pilastres avec vomitoires
sombres, corniche, bandeaux vitrés, bannières, toits des tribunes sur mâts (Stade) ou toit-couronne blanc sur 28 mâts
(Grand stade), quatre pylônes d'éclairage à projecteurs allumés la nuit, entrées (porche, enseigne, guichets,
portiques, allées), parkings aux voitures garées, abris de touche, panneaux publicitaires, fanions, tableau
d'affichage, rangées d'arbres.

#### Poids et vérifications

- Code : **+6,4 Ko gzip** pour toute la scène 3D (mesuré à l'esbuild, minifié : 57,5 → 63,8 Ko), pas de dépendance,
  pas d'image, pas de modèle 3D, aucune migration SQL, aucune vraie marque.
- Sommets par mégaprojet : le Stade 12 500, le Grand stade 17 800 (les autres, de 1 800 à 2 700) ; le garde-fou de
  `megaprojetsSilhouettes.test.ts` passe à 14 000 et 20 000 pour ces deux-là, 90 000 pour les 18.
- Tests : `megaprojetsEnergie.test.ts` (6, dont 200 graines × 18 paliers), `megaprojetsStades.test.ts` (13),
  `ville3dPaysage.test.ts` (6), `monumentsVille.test.ts` et `monumentsEchelle.test.ts` réécrits, `monumentsDetail`,
  `megaprojetsVille` et `megaprojetsSilhouettes` adaptés ; suite unitaire complète : 508 tests verts, `tsc` et lint
  propres. Revue visuelle dans la vraie scène (avant / après) : monuments, statue géante, stades, secteur d'Énergie,
  fond de `/pays` (page réelle, dans le navigateur de l'application).

---

### Grand stade ramené à 3 × 2 blocs, monuments plus atypiques (retour d'Adrien du 05/10/2026, suite du §49)

**Retour d'Adrien après essai du jeu.** « Le Grand stade est trop grand, c'est disproportionné. Certains monuments
ne sont pas assez bien faits : fais des choses avec plus de détail et atypiques. » Cette entrée complète celle du §49
(qui reste exacte pour le reste) et la remplace sur la taille du Grand stade.

#### Grand stade : un tiers de surface en moins, plus long que large

- **Site : 3 × 2 blocs** (224 × 144 m, plateforme de 216 × 136 m, 48 m de haut) au lieu de 3 × 3 (224 × 224 m, 60 m de
  haut). La cuvette fait **168 × 122 m** (au lieu de 203 × 168 m), la pelouse **87 × 55 m** (terrain réglementaire
  105 × 68 m, un peu réduit pour que la cuvette tienne). Il reste plus grand que le Stade (2 × 2 blocs, cuvette de
  122 × 99 m), et sa forme rappelle un vrai stade (rapport 1,4).
- **Sites rectangulaires** : `SITES_MULTI_BLOCS` (`megaprojets.ts`) donne maintenant `x` et `z` ; `Site` a un `Rz`
  (égal à `R` pour tous les autres mégaprojets) ; `blocsDuSite(case, nx, nz)` ; `PlaceMegaprojet` perd `taille` et
  gagne `nx`, `nz`, `rayonZ` ; `ZoneSansArbre` gagne `demiZ`. Même règle de placement : le rectangle part de la case
  d'ancrage vers l'extérieur, hors des blocs de monuments, à 150 m de l'Énergie par son bord (testé).
- **Bâtiment redessiné** pour ce rectangle : parkings aux deux bouts (avec une allée centrale pour l'entrée), parvis en
  couronne, 80 pilastres, 20 vomitoires, 24 mâts, entrées sur les quatre côtés. Sommets : 15 500 (17 800 avant).
- Le Grand stade ne perd plus que **6 blocs** d'habitations quand la ville atteint le site (9 avant) : §10 point 43.

#### Monuments : dix redessinés, formes atypiques

De nouvelles briques (`monumentsFormes.ts`) : `membre` (un cylindre effilé entre deux points quelconques : bras,
jambes, pattes, rayons), `tore` (anneaux), `tourVrillee` (une tour carrée qui tourne sur elle-même, bandes alternées).
Elles permettent des formes impossibles à la boîte et au cylindre droit.

| Monument | Avant | Maintenant |
|---|---|---|
| Borne commémorative | bloc de pierre et boule | **sphère armillaire** de bronze (équateur, deux méridiens, écliptique incliné de 23,5°, axe polaire) sur un chapiteau |
| Banc public | banc droit, deux lampadaires | **banc ondulé** (une onde de sept tronçons, dossier à crêtes) sous une **treille** d'arceaux fleuris |
| Fontaine simple | un jet et deux vasques | trois bassins étagés, une **sphère de bronze flottante** frappée par douze arcs d'eau, méridiens gravés |
| Buste | tête, épaules | **couronne de lauriers** (anneau et douze feuilles), chevelure bouclée, toge à plis diagonaux, agrafe |
| Obélisque | fût droit | **fût hélicoïdal** : un tour et quart, bandes de bronze et d'or, pyramidion qui prolonge la torsion, quatre lions couchés |
| Horloge municipale | toit pointu | idem, avec un **orrery** au sommet (soleil éclairé, anneaux inclinés, planètes) |
| Fontaine monumentale | trois vasques | quatre **hippocampes** crachant l'eau, **Neptune** et son trident au sommet |
| Statue équestre | cheval au pas | **cheval cabré** : jambes arrière plantées, avant-train dressé, pattes repliées, queue flottante, cavalier penché |
| Mur des remerciements | mur droit | **mur en S** à plaquettes sur ses deux faces, ruban doré sur le faîte, deux bancs dans les creux |
| Arche monumentale | arc et soleil | arc **doublé d'une rosace à rayons**, guirlande d'ampoules éclairées, boules lumineuses sur les aiguilles, contreforts |
| Tour d'observatoire | tour ronde à dôme | **tour qui vrille d'un tour et demi**, cordon de fenêtres éclairées le long d'une arête, **sphère armillaire** et lunette |
| Statue emblématique | figure drapée | plis de la robe, manteau flottant, sandales sur la chaîne brisée, diadème de sept rayons, torche à balcon, tablette |
| Statue géante | colosse sur un piédestal | **colosse qui enjambe un passage** : pieds sur deux socles, jambes en arche, torse sculpté, pagne à plis, globe gravé |
| Monument ultime | pylône droit | **flèche d'or vrillée** d'un tour et demi, **trois anneaux en orbite**, soleil de quatorze rayons éclairé |
| Arc de triomphe, temple | — | retouchés : soleil et cannelures (arc), seize nervures dorées sur le dôme (temple) |

(Rang modeste : borne, banc, fontaine simple, buste, obélisque — ni lampes ni métal poli, mais plus de forme et de
détail ; la règle du §43 « un rang plus haut est plus riche » tient toujours.) Les gabarits (rayon, hauteur) ne changent
pas ; chaque monument tient toujours dans son cercle de socle et sous sa hauteur (testé, `monumentsDetail.test.ts`).

#### Poids et vérifications

- Code : **67,8 Ko gzip** pour toute la scène 3D (mesuré à l'esbuild, minifié), soit +4,0 Ko pour ce retour et +10,4 Ko
  depuis avant le §49 (57,5 Ko). Aucune dépendance, image, modèle 3D ni migration.
- Les 16 monuments pèsent 49 000 sommets en tout (jusqu'à 5 800 pour le plus riche) ; la règle « un rang plus haut est
  plus riche » du §43 tient toujours (tout prestigieux dépasse tout modeste).
- Tests : `monumentsAtypiques.test.ts` (8 : briques `membre`, `tore`, `tourVrillee`, passage ouvert entre les jambes
  du colosse, torsion de l'obélisque, lumières des tours), `megaprojetsStades.test.ts` adapté aux rectangles ; suite
  unitaire complète : **516 tests verts**, `tsc` et lint propres. Revue visuelle dans la vraie scène, avant / après.

---

### Mégaprojets dans la ville, Parc d'attractions, stade futuriste, éclairage de nuit, /pays plein écran (retour d'Adrien du 05/10/2026, suite du §49 ; résout le §46)

*(Depuis, le Stade a été réduit à 2 × 1 blocs et le Parc d'attractions entièrement refait : voir l'entrée suivante, A-INTEGRER §50.)*

**Retour d'Adrien après essai du jeu.** « Le Grand stade ne sert à rien, il y a déjà le petit : on peut remplacer par
un parc d'attractions. Je veux que l'autre stade soit plus joli, plus futuriste (comme les stades actuels). Les
mégaprojets doivent être dans les villes : là ils sont loin des villes et pas toujours à côté d'une route. Je veux un
éclairage de nuit. Pour le fond de l'onglet Pays, un paysage de campagne sans ville ne me plaît pas : l'onglet avec
le texte devrait prendre toute la page, et pas d'autre fond. » Cette entrée complète celle du §49 et la suivante
(le Grand stade 3 × 2 n'existe plus ; le fond de `/pays` en paysage non plus) et **règle le §46** de
`A-INTEGRER.md` (mégaprojets loin du bâti).

#### Les mégaprojets sont dans la ville, avec leurs rues (A-INTEGRER §46)

- **Règle** (`megaprojetsVille.ts`, réécrit). Les 16 blocs les plus centraux restent aux monuments. Chaque mégaprojet
  prend, **dans l'ordre du catalogue** (donc des seuils d'influence : les plus modestes au plus près du centre), la
  **première case libre de l'ordre de distance de `cases.ts` à partir de la 17e** : un bloc entier contre le noyau de
  la ville. Le Stade et le Parc d'attractions (2 × 2 blocs) prennent le premier carré de blocs entièrement libre,
  ancré sur une case et poussé vers l'extérieur (ne chevauche jamais un axe central). Le secteur d'Énergie reste
  exclu (§49 C : 150 m, par le centre pour un bloc, par le bord pour plusieurs). Les stades de population (§37, §41)
  ne décident plus de rien : `indiceCaseMegaprojet` et `indiceCaseStade` n'existent plus. Fonction pure de la
  graine, mémorisée par graine ; la place de l'un dépend de celle des précédents, donc le calcul porte toujours sur les
  18 puis on filtre.
- **Mesuré** sur 200 graines : un mégaprojet est à 4,5 blocs du croisement central au plus, et tout rectangle de site
  tient dans les 392 m du centre (avant : jusqu'à 450 m, en pleine campagne ; la ceinture d'Énergie est à 450 m) ; les
  blocs pris sont en moyenne à la 28e case en partant du centre, au plus à la 85e (100 graines).
- **Les rues les accompagnent toujours.** Un site de mégaprojet (ou le bloc d'un monument) a ses rues, trottoirs,
  lampadaires et pelouse **même si la ville ne l'a pas encore atteint** (blocs « aménagés », dessinés par
  `buildBlock` sans rien construire : le bloc ouvert plus tard reprend là où il en est), et les blocs qui le relient au
  croisement central, en escalier, ont leurs rues aussi (`blocsDeLiaison`) : fini les mégaprojets « pas toujours à
  côté d'une route ».
- **L'étendue de la ville les compte** : son rayon (`cityR`) inclut les sites et les monuments, donc sa carte
  d'occlusion et de lueur de nuit, ses ombres et son brouillard les couvrent (sans cela, leurs lampadaires
  n'éclairaient rien).
- **Ils ont tous changé de place, une seule fois** (ils étaient à la bordure, ils sont dans le noyau). Ensuite plus
  jamais : la place ne dépend que de la graine et du palier (testé : ni des autres paliers demandés, ni de la
  population).
- **Contrepartie** (§10 point 47) : ce sont des blocs du cœur de la ville qui ne sont plus des quartiers.

#### Le Grand stade devient le Parc d'attractions

- **Identifiant inchangé** : `grand_stade` (ligne du catalogue en base, palier 31, seuil 150 000, activité loisirs, bonus
  « pertes de manifestation ×0,75 » inchangés). Seuls le **dessin** et le **nom affiché** changent (« Parc
  d'attractions » / « Amusement park », `dictionaries.ts`). **Aucune migration.** Renommer l'identifiant, ou changer
  son bonus (un parc d'attractions qui réduit les pertes de manifestation, c'est étrange), demanderait une migration :
  §10 point 48.
- **Taille** : 2 × 2 blocs (136 m de plateforme, 48 m de haut), comme le Stade (le 3 × 2 devient obsolète : §49 D et
  l'entrée suivante).
- **Contenu** (`megaprojetsLoisirs.ts`, `parcAttractions`) : une pelouse, des allées dallées de couleur (promenade de
  l'entrée, traversée, un chemin vers chaque attraction), un portique d'entrée à pylônes à coupole et guichets rayés, une
  fontaine, une **grande roue** (deux jantes, seize rayons, seize nacelles, pieds en A), des **montagnes russes** (circuit
  fermé à bosses, deux rails, traverses, piles, une rame), un **carrousel** (douze chevaux, toit en cône rayé), des
  **chaises volantes**, une **tour de chute** blanche et rouge, un **chapiteau** de cirque, des stands à auvents rayés et
  des bouquets de ballons. Tout est dessiné avec des briques existantes (`membre`, `tore`, `ellipsoide`) : aucune
  image, aucun modèle 3D, aucune marque.

#### Le Stade, plus joli et plus futuriste (comme les stades actuels)

Redessiné (`megaprojetsLoisirs.ts`, `stade`) sur le même site de 2 × 2 blocs (136 m, 36 m de haut) : une **façade en
résille** (deux familles de lames blanches qui se croisent) autour d'un **mur de verre bleu profond**, un **toit ondulé**
(plus haut au milieu des grands côtés qu'aux bouts : `anneauPenteVar`) qui porte ses **panneaux solaires**, des
**colonnes en V** qui le soutiennent, une **douve d'eau** autour de l'arène franchie par six ponts, des **pylônes à LED**
aux quatre angles, des pavillons d'entrée en verre à enseigne lumineuse, deux étages de gradins argent et bleus
séparés par un déambulatoire vitré. Pelouse tracée de 57 × 34 m (`terrainFoot`), panneaux publicitaires et abris de
touche réutilisés du stade d'avant.

#### Éclairage de nuit

- **Tous les mégaprojets** (`buildMegaprojet`) : une rangée de lampadaires (`MAT.LAMP`, mât de 5,4 m, un tous les 11 ou
  14 m) tout autour de la plateforme, une lueur au sol par lampadaire ; pour les sites d'un bloc, un halo de lumière au
  sol tous les ~9 m sous le bâtiment (`eclairerZone`), pour que ni la façade ni ses abords ne restent noirs. Les halos
  sont des points dans la carte de lueur de `generate()` : aucun sommet de plus.
- **Le Stade** : mur de verre qui brille d'un bleu profond (`MAT.BEACON`, matière qui s'éclaire de sa propre couleur),
  liserés de LED cyan sur les gradins et sous le toit, pylônes à LED, bornes lumineuses de la douve, pelouse et esplanade
  éclairées (halos tous les 5 m sur le terrain).
- **Le Parc d'attractions** : ampoules de couleur sur la grande roue, les montagnes russes, le carrousel, les chaises et la
  tour de chute ; pelouse et allées éclairées (halos tous les 8 m).
- *Limite* : les façades des autres mégaprojets ne s'éclairent que par leurs vitrages (fenêtres allumées au hasard,
  comme les immeubles de la ville) ; les accents propres à chaque type (enseignes, projecteurs de façade) ne sont pas
  dessinés : §10 point 49.

#### `/pays` : toute la page pour le texte, plus de fond

Le paysage de campagne du §49 E est **supprimé** (`buildPaysage`, `generatePaysage`, `RAYON_PAYSAGE`, le paramètre
`paysage` de la scène et son test `ville3dPaysage.test.ts`). La page `/pays` n'a plus de scène 3D : `SansScene.tsx`
ajoute la classe `sans-scene` à `<body>` le temps de la page (le canevas est masqué, `globals.css`), et le contenu
(en-tête, onglets, panneaux) occupe **toute la page** sur le fond uni de l'interface, centré sur 1 120 px au plus,
avec son propre défilement. Rien d'autre de la page ne change.

#### Poids et vérifications

- Code : **67,3 Ko gzip** pour toute la scène 3D (mesuré à l'esbuild, minifié), soit −0,5 Ko : l'ancien Stade, l'ancien
  Grand stade et le paysage retirés pèsent plus que le nouveau Stade et le Parc d'attractions. Aucune dépendance,
  image ni modèle 3D. Sommets : le Stade 14 060, le Parc d'attractions 16 719 (les autres de 2 300 à 4 300) ; les 18
  mégaprojets au stade 4 : ~81 000 (garde-fou de 90 000), dont ~800 de lampadaires chacun.
- Tests réécrits (`megaprojetsVille.test.ts`, `megaprojetsEnergie.test.ts`, `megaprojetsStades.test.ts`,
  `megaprojetsSilhouettes.test.ts`) : première case libre à partir de la 17e (vérifiée case par case sur 6 graines),
  dans les 5,5 blocs du centre (60 graines), rues de liaison (`blocsDeLiaison` ; scène à 3 000 habitants), rayon de la
  ville qui contient les sites, Énergie (200 graines × 18 paliers), 2 × 2 blocs pour les deux sites, éclairage de nuit
  de chacun des 18 (lampadaires, lueurs dans la plateforme), sommets lumineux du Stade et du Parc. Suite unitaire :
  **515 tests verts**, `tsc` et lint propres.
- Revue visuelle dans la vraie scène (harnais esbuild, vrais shaders) : ville de 60 000 habitants, tout débloqué, de jour
  et de nuit ; page `/pays` vérifiée dans le navigateur de l'application.


### Règles : les jauges expliquées (A-INTEGRER §49) et l'espagnol, troisième langue (§50) — 05/10/2026

**Numérotation.** Le « §49 » traité plus haut (cinq corrections A à E) l'avait été d'après une consigne sans texte
dans ce fichier ; le §49 qui s'y trouve maintenant est autre chose : expliquer les jauges dans la page Règles. Le
point ouvert 46 est résolu (voir §10).

**§49 : fait.** `src/lib/game/regles.ts`, section `activites` : huit paragraphes de plus en FR, EN et ES — une
introduction (les mêmes jauges servent aux attaques AntiVille et aux manifestations) puis un paragraphe par activité,
texte repris tel que dans la note. Le tableau du §49 (qui remplace celui du §42) a été recoupé avec les migrations
`0024` (±50 % de l'Industrie, des Services et des Loisirs ; bonus des jumelages du Commerce ; manifestations de
l'Énergie ; double influence de la Recherche) et `0049` (Résidentiel : +25 %) ; la `0051` est prise sur la note.
Le mot « manifestation » est employé de façon cohérente (Loisirs, Énergie et introduction).

**§50 : fait.** `locales` passe à `["fr", "en", "es"]` ; les 540 clés sont traduites (bloc `es` de `dictionaries.ts`,
parité stricte, tutoiement comme le français) ; `regles.ts` a sa version espagnole de chaque section (TypeScript a
signalé les sept sections et `chargerVille()` de `/v/[id]`, typé `"fr" | "en"`, comme le prévoyait la note) ;
`ordinal()` écrit « 1.º, 2.º… » ; `LangSwitcher` lit `locales` (FR · EN · ES).
- *Tests.* `dictionaries.test.ts` couvre toutes les langues : mêmes clés (aucune manquante ni orpheline, avec la liste),
  mêmes `{variables}`, aucune valeur vide, **aucune valeur espagnole copiée du français** (cinq mots identiques assumés :
  « de », « disponible », « hab. »), ponctuation espagnole (`¿` et `¡` ouvrants). Cinq tests qui bouclaient sur
  `["fr", "en"]` à la main bouclent sur `locales` (boutique, catalogue de bâtiments, classement et développements des
  pays, crise de la Recherche). **Sabotages vérifiés rouges** : clé espagnole supprimée, variable perdue, valeur laissée
  en français, `¿` oublié. `ordinal.test.ts` : cas espagnols.
- *Vérifié à l'œil* sur le vrai site : sélecteur FR · EN · ES, navigation, Règles, Ma ville (« 12.º de France »).
- *Hors scope, signalé.* Noms de pays et de régions, poids, relecture native, phrase obsolète des Règles : voir §10 point 50.
- *Poids.* +33 Ko bruts, +10 Ko gzip. `npm run build` passe (pages de 103 à 302 Ko, budget de 500 Ko).
- *Règle étendue.* Toute nouvelle clé doit avoir ses trois langues : le test échoue sinon, y compris pour les chantiers des
  autres sessions.

---

### Stade plus petit, Parc d'attractions refait, monuments revus par lots (3ᵉ consigne d'Adrien du 05/10/2026, dite « §50 » dans le chat)

**Consigne reçue** (collée en séance, sa capture d'écran absente de la session ; elle cite « A-INTEGRER §50 », or le §50 de
`A-INTEGRER.md` est l'espagnol, fait par une autre session : comme les « cinq corrections A à E », cette consigne n'a donc pas de §
propre dans le fichier — **numérotation à réconcilier par Adrien**, `DECISIONS.md` §10 point 51). Trois corrections, dans cet ordre : 1. le Stade est trop
grand — fixer une règle de proportion écrite dans le code, vérifier sur une capture avec une tour et des maisons, montrer
l'avant / après ; 2. Parc d'attractions : beaucoup plus de détail, plusieurs dispositions selon la graine, il s'étoffe avec le
niveau du quartier Loisirs ; 3. monuments « de grande qualité », livrés par lots de quatre avec une capture à la distance de
jeu et une vue rapprochée de chacun. Règles : aucune migration, aucune vraie marque, un objet posé ne bouge plus ; signaler ce
qui change de taille ou de place une fois. Cette entrée remplace celles qui précèdent sur le Stade et sur le Parc.

#### 1. Règle de proportion des stades (écrite dans `megaprojetsFormes.ts`)

- **La règle.** Un stade a une arène de **1 à 1,5 bloc de long, toit compris** (`STADE_LONGUEUR_MAX` = 1,5 × 64 = 96 m), sur un
  site de **2 × 1 blocs au plus** ; sa **hauteur reste sous celle des tours voisines** : au plus la moitié de la plus petite tour
  qu'une ville puisse bâtir (`HAUTEUR_TOUR_MIN` = 14 étages de 3,6 m = 50,4 m, car `cap` ≥ 14 dans `terrain.ts`), soit
  `STADE_HAUTEUR_MAX` = **25,2 m** (un grand immeuble de 7 étages et son toit). Le **Parc d'attractions**, le plus grand des deux
  sites, tient dans **2 × 2 blocs au plus** et reste lui aussi sous la plus petite tour (44 m). Testé (`megaprojetsProportions.test.ts` :
  l'eau de la douve ne dépasse pas 96 m, aucun sommet ne dépasse la hauteur permise, le Stade est plus petit que le Parc).
- **Stade.** Passé de 2 × 2 à **2 × 1 blocs** (plateforme 136 × 56 m, 36 → **25 m** de haut) : arène de 86 × 44 m (96 × 49 m avec le
  toit et ses colonnes), pelouse de 36 × 22 m. Même langage (résille de lames, mur de verre qui brille, toit ondulé à panneaux
  solaires, douve, pylônes à LED), mais l'arène est décalée vers l'ouest : à l'est un **parking** devant le pavillon d'entrée,
  à l'ouest une **esplanade** plantée. `dimensionsStade()` donne ses dimensions au dessin et aux tests.
- **Grand stade.** Il n'existe plus sous ce nom (il est devenu le Parc d'attractions, entrée précédente) : il reste à **2 × 2 blocs**,
  la limite haute de la consigne (« 2 × 1 ou 2 × 2 au plus »), et sa hauteur passe de 48 à 44 m.
- **Vérifié** sur capture dans la vraie scène (ville de 60 000 habitants, avec une tour, des maisons, le parc) : avant 2 × 2 blocs, 36 m,
  arène de 114 × 92 m ; après 2 × 1 blocs, 25 m, arène de 86 × 44 m, très en dessous de la tour voisine.

#### Ce qui change de taille ou de place, une fois (à connaître)

- **Le Stade** : taille (2 × 2 → 2 × 1 blocs ; 36 → 25 m) et **place** (il libère deux blocs).
- **Les mégaprojets qui le suivent dans le catalogue** (le placement est séquentiel) : mesuré sur 100 graines, **17 %** des couples
  graine × palier changent de place par rapport à un Stade de 2 × 2 — le Stade à chaque fois, puis de 1 % (palier 21) à 34 % (palier 33) :
  surtout les paliers 28 à 33 (aéroport, centre de recherche, centrale, Parc d'attractions, centrale nouvelle génération, Siège
  international).
  Ces places n'ont jamais été publiées (tout le travail de la séance est non commité) : **depuis le dernier commit poussé
  (`ff282c3`), les 18 mégaprojets changent de place une seule fois, en tout** (A-INTEGRER §46 : du bord de la ville au noyau, puis ce
  réajustement du Stade).
- **Le Parc d'attractions** : sa hauteur (48 → 44 m) et tout son contenu ; son emprise de 2 × 2 blocs ne change pas.
- **Les 16 monuments** : ni leur place, ni leur gabarit (rayon, hauteur) ; seul le dessin change (testé : tous restent dans leur
  cercle de socle et sous leur hauteur).

#### 2. Parc d'attractions : beaucoup plus de détail, seize dispositions, des niveaux

Nouveau fichier `megaprojetsParc.ts` (+ `montagnesRusses.ts`) : l'ancien dessin (`megaprojetsLoisirs.ts`) est supprimé. Tout se dessine
dans un repère local que le `Pinceau` retourne et fait tourner.

- **Contenu.** *Entrée monumentale* : deux tours rayées de 18 m à coupole, une poutre-enseigne éclairée (ampoules, anneau doré à
  étoile : ni mot ni marque), guichets rayés, tourniquets, files d'attente, mâts à fanions, parvis dallé. *Montagnes russes* : un
  circuit de **248 m de voie, 33 m de haut**, calculé (courbe de Catmull-Rom fermée) : gare à toit léger, côte, chute, **looping vertical**
  de 13 m, bosses et virages ; **deux rails, une poutre lumineuse, des traverses, des piles** et un **train de cinq wagons** (avec ses
  passagers) ; le tracé ne se recoupe jamais (écart minimal de 3 m, testé). *Grande roue* de 30 m (jantes doubles, seize rayons, douze
  nacelles, pieds en A), *chute libre* en treillis rayé de 43 m, *chaises volantes* à quatorze chaînes, *manège* à deux rangs de
  chevaux et toit à festons, *autos tamponneuses* (hall, piste, onze voitures aux perches), *chapiteau*, *bateau pirate* en plein élan,
  *lac et pédalos*, *fontaine* à jets, *stands*, ballons, parterres de fleurs ; **allées sinueuses** (rubans lissés bordés de pierre) et
  un lampadaire tous les 14 m environ.
- **Seize dispositions.** Deux gabarits (positions des attractions et tracé des allées) × huit symétries (quatre quarts de tour, avec ou
  sans miroir), tirés de la graine du site : `varianteParc(seed)`. Testé : seize géométries différentes, toutes dans la plateforme et sous 44 m.
- **Niveau du quartier Loisirs** (`Site.niveau`, 0 à 3, `niveauLoisirs()`). Le niveau est calculé par `generate()` d'après les **stades
  de loisirs construits** dans les blocs de vocation Loisirs de la ville (`stats.stadesLoisirs`, le second lot de chaque bloc Loisirs) :
  0 aucun, 1 de un à deux, 2 de trois à cinq, 3 six ou plus. Niveau 0 : entrée, fontaine, allées, carrousel, grande roue, chapiteau,
  stands ; 1 : + montagnes russes et chaises volantes ; 2 : + chute libre et autos tamponneuses ; 3 : + bateau pirate, lac, parterres de
  fleurs, deuxième rame. **Un parc qui s'étoffe n'ajoute que des choses** : chaque attraction a son emplacement fixe, hors des arbres même
  quand elle n'est pas encore construite, et ses hasards (arbres, voitures, fleurs) ont leur propre générateur ; testé — tout ce qui existe
  à un niveau existe, au sommet près, au niveau suivant. *Définition du « niveau du quartier Loisirs » choisie par Claude Code : §10 point 51.*
- **Éclairage de nuit.** Des ampoules de couleur (`MAT.BEACON`, grossies pour se voir d'en haut) sur chaque attraction, la poutre-
  enseigne, l'anneau doré, la poutre des montagnes russes et l'anneau de la grande roue qui brillent, des lampadaires le long de chaque
  allée, des halos au sol (plus de 300).
- **Poids.** Le Parc fait **26 600 sommets au niveau 0, 44 600 au niveau 3** (l'ancien : 16 700) ; garde-fou de 50 000, et de 115 000 pour
  les 18 mégaprojets (106 000 mesurés). La ville de 60 000 habitants fait 245 000 sommets sans mégaprojet.

#### 3. Monuments « de grande qualité » : revue par lots, à la distance de jeu et de près

Les 16 monuments ont été regardés dans la vraie scène (ville de 12 000 habitants, voisins autour) à deux distances ; ceux qui le méritaient
ont été refaits, les autres jugés bons et laissés tels quels. Captures montrées à Adrien lot par lot.

| Lot | Monument | Décision |
|---|---|---|
| 1 | Borne commémorative | chaîne de bronze entre les bornes d'angle, lanternes en tête de borne (qui brillent la nuit) |
| 1 | Banc public | lierre sur les arceaux, boule dorée au faîte de chacun, deux jardinières fleuries |
| 1 | Fontaine simple | seize projecteurs bleus sous l'eau, couronne cyan sur le deuxième bassin |
| 1 | Buste | piédestal plus bas donc buste plus grand ; tête plus grande, cou plus épais, masse de cheveux sur la nuque, deux lanternes au pied |
| 2 | Obélisque, Horloge municipale | jugés bons, inchangés |
| 2 | Arc de triomphe | **quadrige refait** : char à deux roues, quatre chevaux de front (encolures arquées, pattes levées), Victoire dressée sous une couronne, ailes |
| 2 | Fontaine monumentale | **hippocampes refaits** (échine en S, crête, nageoires, queue enroulée) ; Neptune gagne un manteau et une conque |
| 3 | Statue équestre | **cheval refait** : corps d'un seul galbe (fuseaux) au lieu d'un chapelet de boules, croupe, queue en mèche, crins |
| 3 | Mur des remerciements, Arche, Tour d'observatoire | jugés bons, inchangés |
| 4 | Statue emblématique | vingt-quatre plis du manteau et de la robe, ourlet, plis croisés, huit mèches, maillons de la chaîne brisée, **diadème de neuf rayons** (sept avant), liseré de LED au pied |
| 4 | Temple national | jugé bon, inchangé |
| 4 | Statue géante | disque solaire plein (anneau et cœur) au lieu d'un disque creux vu de dos, omoplates et manteau dans le dos |
| 4 | Monument ultime | soleil et rayons qui brillent, anneaux en orbite avec trois perles lumineuses chacun |

La règle « un rang plus haut est plus riche » du §43 tient (testé) : le plus pauvre des prestigieux dépasse le plus riche des modestes
(le banc, avec 3 900 sommets). Aucun modeste n'a de lampadaire (`MAT.LAMP`) : leurs lanternes sont en `MAT.BEACON`.

#### Poids et vérifications

- Code : **74,5 Ko gzip** pour toute la scène 3D (mesuré à l'esbuild, minifié), soit +7,2 Ko (le parc, le circuit, les monuments).
  Aucune dépendance, image, modèle 3D ni migration, aucune marque. Budget de l'application inchangé (premier chargement ≤ 500 Ko).
- Tests : `megaprojetsProportions.test.ts` (5 : la règle), `parcAttractions.test.ts` (15 : circuit sans croisement et plus de 30 m de haut,
  seize dispositions, niveaux et « rien ne bouge », éclairage de nuit, niveau dans la ville), `megaprojetsStades.test.ts` et
  `megaprojetsSilhouettes.test.ts` adaptés ; suite unitaire : **540 tests verts**, `tsc` et lint propres.
- Revue visuelle dans la vraie scène (harnais esbuild et vrais shaders) : Stade avant / après, Parc (jour, nuit, niveau 0, deux
  dispositions), seize monuments à deux distances.

---

### Monuments plus beaux : vraies matières, jardin, mise en lumière, six sculptures refaites (retour d'Adrien du 05/10/2026)

**Retour d'Adrien.** « Améliore les monuments, ils sont trop simplistes et pas assez beaux. » Constat sur captures (vraie scène, à la
distance de jeu et de près) : tout le métal était une peinture jaune unie (`MAT.PLAIN` ou `MAT.PAINT`), la pierre une teinte crème sans
relief, les plaques des « fenêtres » noires, la place un carré dallé nu, et plusieurs sculptures se lisaient comme des empilements de
boules. Cette entrée complète la revue par lots de l'entrée précédente.

#### Quatre vraies matières (shaders.ts, constantes.ts)

- **`MAT.OR` (28)** : un or poli, presque un miroir teinté de sa couleur, qui reflète le ciel au-dessus de l'horizon et la ville en dessous
  (`envMetal`), avec un reflet du soleil teinté d'or. **`MAT.BRONZE` (27)** : un bronze satiné à patine plus sombre par endroits.
  La signature « or et bronze » du §43 reste exactement la même (bronze pour les modestes, or ensuite) : seule la matière change.
- **`MAT.MARBRE` (29)** : marbre veiné (deux réseaux de veines), légèrement poli. **`MAT.PIERRE` (30)** : pierre de taille, assises de
  0,6 m, blocs décalés, joints creux. Les modestes sont en pierre de taille, les notables et prestigieux en marbre (socles, fûts,
  piédestaux, marches).
- **Mise en lumière la nuit** : ces quatre matières reçoivent la lumière chaude de projecteurs au pied, qui faiblit en montant ; un
  monument se voit de loin la nuit, l'or brille au lieu de refléter un ciel noir.
- Les plaques des piédestaux deviennent des **plaques de bronze** à lettres et cadre dorés (elles ressemblaient à des fenêtres noires).
- Ces matières ne servent qu'aux monuments ; aucune autre partie de la ville ne change.

#### La place : un jardin à la française (`buildPlaceMonument`)

Au lieu d'un carré dallé et de quatre arbustes : un dallage à **rosace de deux tons** autour du socle, une **haie de buis taillée** sur
les trois côtés qui ne donnent pas sur la rue, une **entrée côté rue entre deux lanternes** (allumées la nuit), et aux quatre coins un
**parterre fleuri** (cinq couleurs) avec un **if taillé en cône** ou une **double boule de buis**. Rien ne touche le cercle du socle :
la place se règle sur le gabarit du monument (`generate()` lui passe le côté rue et le rayon du socle).

#### Six sculptures et architectures refaites

| Monument | Avant | Maintenant |
|---|---|---|
| Buste | un vase doré coiffé d'une boule | **buste à l'antique sur piédouche** : poitrine coupée en arrondi, épaules, pan de toge à plis et agrafe, cou, visage dessiné (front, arcades, yeux, nez, bouche, menton, oreilles), boucles, couronne de lauriers à feuilles par paires |
| Statue équestre | un fuseau unique | **anatomie de cheval** : croupe, cage, épaules, encolure arquée, tête en coin (ganache, chanfrein, naseaux, oreilles), crinière en mèches, jambes articulées (cuisse, jarret, canon, sabot) ; cavalier à bicorne, manteau, sabre et rênes |
| Arc de triomphe | grandes faces nues, colonnettes | **grands reliefs** sculptés sur les piles (une figure qui lève une couronne), **huit colonnes** du socle à l'entablement, **Victoires ailées** dans les écoinçons, architrave et **denticules** |
| Fontaine monumentale | deux disques d'eau | quatre **coquilles** sous la vasque, une **margelle dorée**, **trente-six filets d'eau** qui retombent en arc d'une vasque à l'autre |
| Mur des remerciements | crème, plaquettes en grille | **granit noir poli** couvert de **noms gravés en lettres d'or** (deux colonnes de lignes par tronçon et par face), comme un mémorial |
| Statue géante | un pagne en forme de boîte | **pagne rond à vingt-quatre plis** et ceinture qui suit la taille |

#### Vérifications

- Tests : `monumentsDetail.test.ts` (le métal est en bronze chez les modestes, en or ensuite, jamais en « peinture » ; la pierre est en
  pierre de taille ou en marbre), et toujours : chaque monument tient dans son cercle de socle et sous sa hauteur, un rang plus haut est
  plus riche, seuls les prestigieux ont des lampadaires. Suite unitaire : **541 tests verts**, `tsc` et lint propres.
- Poids : code de la scène **77,2 Ko gzip** (+2,7 Ko : les quatre matières, la place, les sculptures). Les seize monuments font
  66 000 sommets en tout (49 000 avant ; le plus riche, l'arc de triomphe, 7 400), chaque place 2 000. Aucune dépendance, image, modèle 3D
  ni migration, aucune marque.
- Revue visuelle dans la vraie scène : les seize monuments à deux distances, de jour, et de nuit pour la mise en lumière.

---

### Drapeaux des pays dans l'onglet Pays (décision d'Adrien du 06/10/2026)

**Demande d'Adrien.** « Dans l'onglet Pays, ce serait bien d'avoir le drapeau du pays qui s'affiche » — et pas en 3D, « trop
volumineux ». Trois options lui ont été présentées (émoji : 0 Ko mais rien sur un ordinateur Windows ; un fichier SVG par pays ;
drapeaux dessinés par le code, approximatifs pour les armoiries) ; **il a choisi le fichier SVG par pays** et validé l'ajout de ces
images et le téléchargement du paquet.

- **Source** : `flag-icons` 7.5.0 (licence MIT, https://github.com/lipis/flag-icons), format 4 × 3, fichiers copiés tels quels dans
  `public/drapeaux/<code>.svg` pour les **250 pays du jeu** (`0002_jalon1_seed_pays.sql`), avec la licence
  (`public/drapeaux/LICENCE.txt`). **Pas de dépendance npm** : le paquet a seulement servi de source.
- **Poids** : 2 Mo dans le dépôt pour les 250, mais **seul le drapeau affiché est téléchargé** — la moitié font moins de 1 Ko, les plus
  détaillés (armoiries de la Serbie, de la Bolivie, du Mexique, de l'Espagne) de 80 à 180 Ko avant compression — puis gardé en cache par
  le service worker. Rien dans le paquet de code ni dans le premier chargement.
- **Affichage** (`src/components/Drapeau.tsx`) : dans le panneau du pays en tête de `/pays`, à gauche du nom ; dans l'onglet
  « Classement », devant le pays en tête de chaque catégorie. Décoratif (le nom est toujours écrit), liseré fin pour les drapeaux
  blancs. Vérifié dans le navigateur, sur ordinateur et sur téléphone (France, Espagne, Centrafrique).
- **Tests** : `drapeaux.test.ts` (4) — un drapeau SVG 4 × 3 pour chacun des 250 pays, rien d'autre dans le dossier, la licence présente,
  la moitié sous 1 Ko et aucun au-dessus de 200 Ko, le composant ignore un code invalide.
- **Non fait** : le sélecteur de pays est une liste native (`<select>`), qui ne peut pas montrer d'image dans ses options.

### Logo de l'application (décision d'Adrien du 07/10/2026)

**Demande d'Adrien.** « Propose-moi un logo pour l'application. » Trois pistes, puis dix modèles, puis huit mélanges de ses favoris
(panneau, globe, bloc 3D) lui ont été montrés ; il a aimé « avoir différentes tailles de bâtiments » et **a choisi le modèle 6, « la
tour qui sort »** : le panneau blanc bordé de rouge (déjà la marque de la barre du haut), une skyline de hauteurs variées (vert, jaune,
bleu, encre, maison verte) et une grande tour bleue qui dépasse du cadre, sur une tuile gris clair (`--bg`). Fenêtres blanches sur chaque bâtiment, ajoutées à la
demande d'Adrien pour qu'on ne lise pas un graphique à barres. Pas de vraie marque.

- **Source unique** : `public/icons/logo.svg` (≈ 1 Ko). Le même dessin sans la tuile est dans `src/components/LogoVillopia.tsx`,
  affiché dans la barre du haut à la place de l'ancien rectangle `.brand-mark`.
- **Icônes dérivées** (générées avec `sharp`, déjà présent dans `node_modules` comme dépendance de Next, **aucune dépendance
  ajoutée**) : `icon-192.png` et `icon-512.png` (tuile arrondie, usage `any`), `icon-maskable-512.png` (plein cadre, dessin réduit à
  80 % pour la zone sûre Android), `src/app/apple-icon.png` (180 px, iOS) et `src/app/icon.svg` (favicon, servi par Next). Total
  ≈ 15 Ko, rien dans le paquet de code. Elles remplacent l'ancienne icône (graphique à barres bleu, sans lien avec le jeu).
- **Couleur de thème** : `#2563eb` (bleu, hérité du jalon 0) remplacé par le fond du jeu, `#e9eef2` en clair et `#0f151b` en sombre
  (`layout.tsx`), et `#e9eef2` dans `manifest.json` (`theme_color`, `background_color`).
- **Vérifié** dans le navigateur (barre du haut en clair et en sombre, favicon, icône Apple, manifeste) ; tests Vitest au vert.
- **Pour régénérer les PNG** après une retouche du SVG : rendre `logo.svg` avec `sharp` aux tailles ci-dessus (script ponctuel, non
  conservé dans le dépôt).

### Inscription sans confirmation d'email (A-INTEGRER §52) — 07/10/2026

**Constat d'Adrien.** « Confirm email » est désactivé dans Supabase, mais l'écran affiché après l'inscription restait « Compte créé.
Vérifie ta boîte mail… ». Bug du formulaire, pas de la configuration : `InscriptionForm.tsx` affichait ce message dès que `signUp()`
ne renvoyait pas d'erreur, sans regarder si une session avait été ouverte.

- **Correction** (celle proposée au §52, appliquée telle quelle) : si `signUp()` renvoie une session (confirmation désactivée),
  le joueur part vers `/ville`, qui le mène à la création de ville, comme après une connexion ; sans session (confirmation
  exigée), le message de confirmation reste affiché. Le formulaire est donc correct dans les deux réglages, y compris si Adrien
  réactive la confirmation une fois le SMTP branché. Aucune migration, aucune nouvelle clé de traduction.
- **Test** : `tests/e2e/inscription-sans-confirmation.spec.ts` (2 cas). L'appel `/auth/v1/signup` est intercepté et sa réponse
  simulée (avec ou sans session) : **aucun compte n'est créé** dans Supabase et le test ne dépend pas du réglage du projet.
  Contre-épreuve faite : avec l'ancien formulaire, le cas « session ouverte » échoue. Tests Vitest au vert (545).
- **Non fait** : le §51 (mot de passe oublié), qui reste à faire.

---

## §5. i18n

Toute chaîne affichée passe par une clé (`ville.nom`, `jeu.connexion_jour`,
...) avec traduction fr, en et es (A-INTEGRER §50) remplies au même moment que la
clé est créée. Défaut : français. Pas de clé orpheline en prod.
`tests/unit/dictionaries.test.ts` le vérifie pour TOUTES les langues de `locales` : mêmes clés,
mêmes `{variables}`, aucune valeur vide, aucune copie du français en espagnol.

---

## §6. Méthode de travail (résumé — détail dans `GUIDE-METHODE.md`)

- Un jalon = un livrable testable.
- Pas de test jetable, jamais.
- Vérification rouge par sabotage sur toute mécanique qui touche au score,
  aux ressources ou à l'anti-triche.
- Mini cahier de recette à jouer par Adrien après chaque jalon
  (`docs/recette-jalon-N.md`).
- Claude Code signale les points ouverts au lieu de trancher seul le
  design ou l'architecture.

---

## §7. Versionnage, infrastructure et coûts

- SemVer : `0.x.0` par jalon, `0.x.y` pour un correctif, `1.0.0` pour la
  première mise en ligne publique au périmètre MVP.
- **Suivi des paliers gratuits** (à mettre à jour à chaque jalon qui ajoute
  de la charge) :

| Service | Palier gratuit actuel | Usage actuel | Marge |
|---|---|---|---|
| Supabase | à renseigner au premier déploiement | — | — |
| Vercel | à renseigner au premier déploiement | — | — |

Dès qu'un de ces paliers est approché (ex. > 70 % du quota), c'est un point
ouvert à signaler à Adrien, pas une décision technique à prendre seul.

- **Suivi des dépenses en cours** (§1 point 1, assoupli le 25/09/2026) —
  aucune ligne pour l'instant, à remplir dès qu'une dépense est validée
  par Adrien :

| Dépense | Montant | Fournisseur | Approuvée le | Motif |
|---|---|---|---|---|
| *(aucune pour l'instant)* | — | — | — | — |

---

## §8. Direction artistique et rendu des villes

*(Section rédigée côté Claude chat/Cowork le 23/09/2026, avec Adrien —
décisions de design, pas encore implémentées dans le jeu.)*

### Ce qui a été essayé, et pourquoi on a changé

Quatre essais d'images 2D générées par script (vue de face, puis
isométrique, puis quadrillage de blocs) ont été jugés insuffisants par
Adrien ("pas assez réaliste"). Constat : ce qui rend l'ancien MiniVille
(Motion Twin, 2007) réaliste, ce sont des bâtiments **en 3D éclairés**
(ombres portées, reflets, pieds de murs plus sombres), pas des formes 2D
mieux coloriées. D'où le choix d'une **vraie 3D temps réel dans le
navigateur**.

### Prototype de référence

`docs/prototypes/prototype-ville-3d.html` — un seul fichier, WebGL 2,
aucune bibliothèque, aucun coût. Il contient tout le rendu attendu :
caméra isométrique qu'on tourne/zoome/déplace (souris et tactile),
ombres douces, occlusion ambiante, reflets des vitrages, rues avec
marquages et passages piétons, voitures, maisons à toit de tuiles et
volets, petits immeubles avec balcons et commerces, cours et squares,
parkings, lampadaires, campagne et forêts, routes qui partent vers
l'horizon. Il sert de **référence visuelle et de base de code** pour le
jalon qui l'intègre (`ROADMAP.md`).

### Règles de la ville (décidées par Adrien)

- **Plan** : un quadrillage de rues délimite des blocs (4×4 blocs). Dans
  chaque bloc : **4 maisons, 2 petits immeubles, 1 gratte-ciel**, tous au
  bord d'une rue (le centre du bloc est une cour commune, jamais
  construite). Les deux grands axes traversent la carte et partent en
  routes de campagne : **la ville naît à leur croisement**.
- **Chaque ville est unique et stable** : la forme, les couleurs et les
  modèles des bâtiments sont tirés une seule fois à partir de l'identité
  de la ville ; la même ville revisitée est toujours identique, et un
  bâtiment déjà posé ne change jamais d'aspect quand la ville grandit.
- **Progression : maisons → immeubles → tours**, pilotée par le nombre
  d'habitants (1 connexion = +1 habitant) :

| Stade | À partir de | Ce qui apparaît |
|---|---|---|
| Hameau | 0 | la première maison au croisement, puis les suivantes une par une |
| Village | 1 000 | nouveaux blocs, toujours des maisons |
| Bourg | 5 000 | premiers petits immeubles (2 étages, jusqu'à 7 ensuite) |
| Ville | 15 000 | premier gratte-ciel, dans le bloc du centre |
| Grande ville | 40 000 | les 16 blocs sont ouverts, les tours se lancent bloc après bloc |
| Métropole | 100 000 | toutes les tours sont construites ou presque |

- **Blocs** : ils s'ouvrent du centre vers l'extérieur (16 blocs, le
  dernier vers 40 000 habitants). Dans un bloc, les 4 maisons arrivent
  une par une.
- **Gratte-ciel** : son emplacement est d'abord un **square public**
  (aucune maison détruite). Le chantier démarre à 15 000 habitants dans
  le bloc du centre, puis un nouveau chantier tous les 4 500 habitants.
  La tour gagne **un étage tous les 500 habitants** depuis le début de son
  chantier, avec une grue et des étages en béton brut tant qu'elle n'est
  pas finie. Hauteur maximale plus grande au centre (~38 étages) qu'en
  périphérie (~23) : **les plus hautes tours au milieu**.
- Toutes ces valeurs sont réglables et à équilibrer en jouant avec les
  villes de test ; l'échelle (Métropole = 100 000) est une décision
  d'Adrien.

### Lumière : l'heure réelle du pays de la ville

Le soleil suit l'heure et la date réelles **du pays de la ville** (pas
celles du joueur qui regarde) : vraie position du soleil calculée avec la
latitude, la longitude et le fuseau horaire du pays, saisons comprises.
Aube et crépuscule dorés, nuit au clair de lune avec fenêtres allumées et
lampadaires. Une ville japonaise visitée depuis Paris à 17 h est donc en
pleine nuit. **Conséquence pour les données** : la table `countries` doit
porter latitude, longitude et fuseau horaire (IANA, ex. `Europe/Paris`).

### Villes de test

`supabase/seed/villes-de-test.json` : 24 villes fictives de tous les
stades et plusieurs pays (France et Allemagne en tête), pour tester
rendu, classements et interactions. Règles dans `GUIDE-METHODE.md`
(section recette) : jamais en production (`is_test`), enrichies à chaque
jalon, animées plus tard par un script "simuler N jours".

---

## §9. Ambitions long terme

Notées maintenant pour ne pas fermer de portes par accident, mais **hors
périmètre MVP** :

- Présence sur l'App Store / Play Store (nécessite un compte développeur
  payant côté Apple — décision explicitement repoussée à Adrien).
- Notifications push (rappel quotidien de connexion).
- Système de publicité et premium (cahier des charges §7, volontairement
  laissé ouvert par Adrien lui-même).
- Alliances et coalitions complexes entre pays.
- Journal mondial et système de viralité/partage.

---

## §10. Points ouverts

Liste vivante des points signalés, avec qui doit trancher. À jour au
23/09/2026 :

1. ~~**Nom définitif du jeu.**~~ **Tranché le 05/10/2026 par Adrien : le jeu
   s'appelle Villopia** (voir §4, « Nouveau nom du jeu »). "jeu_miniville"
   n'était qu'un nom de travail choisi par Claude pour nommer le dépôt et les
   dossiers. Restent à faire par Adrien : le nom de domaine (dépense, à
   valider) et la vérification de disponibilité du nom avant le Play Store.
2. **Seuils exacts d'évolution visuelle des villes** (Hameau → ... →
   Métropole). Le cahier des charges dit explicitement "seuils à équilibrer
   pendant les tests". → **À trancher par Adrien après les premiers
   tests.**
3. ~~Nombre de jumelages actifs autorisés par ville.~~ **Tranché au
   Jalon 5** : 3 jumelages actifs par ville, délégué à Claude Code
   ("tranche selon tes reco"). Détail et raisonnement dans
   `DECISIONS.md` §4, journal du Jalon 5.
4. **Publicités et premium.** Chapitre volontairement laissé ouvert par le
   cahier des charges lui-même (§7). → **Hors MVP, à rouvrir plus tard par
   Adrien.**
5. **Stratégie App Store / Play Store.** PWA au démarrage ; passage aux
   stores nécessiterait un compte développeur Apple payant. → **À trancher
   par Adrien si/quand le jeu a une communauté.**
6. ~~Accès réseau indisponible pour Claude Code depuis cette session.~~
   **Périmé au Jalon 1** : cette session Claude Code a bien un accès
   réseau sortant (installation de `@supabase/ssr`, appels au projet
   Supabase réel pour diagnostiquer le point 8 ci-dessous). Reste vrai
   que la création du dépôt GitHub et le déploiement Vercel n'ont pas
   été retentés depuis cette session. Corrigé ici pour ne pas induire en
   erreur un jalon futur.
7. **Clé `anon` invalide dans `.env.local` (projet Supabase réel).**
   Le `SUPABASE_SERVICE_ROLE_KEY` fonctionne contre le projet
   (`wdqsbazuxnhhtnejbvwc.supabase.co`), mais `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   est rejetée avec "Invalid API key" (signature invalide) — bloque
   toute action faite depuis le navigateur (inscription, connexion),
   donc la recette du Jalon 1. → **À corriger par Adrien** : recopier la
   clé `anon public` depuis Project Settings → API sur supabase.com,
   remplacer la ligne dans `.env.local`.
8. **Migrations `0001`/`0002` pas encore appliquées sur le projet
   Supabase réel.** Écrites dans `supabase/` mais cette session n'a pas
   les moyens de les pousser elle-même (pas de mot de passe de base de
   données ni de session `supabase login`). → **À faire par Adrien** :
   coller le contenu des deux fichiers dans l'éditeur SQL du tableau de
   bord Supabase (voir `supabase/README.md`).
9. **Format exact des paliers de guerre / rivalité internationale**
   (coefficients de réduction sur attaques répétées, plafonds de coalition).
   Le cahier des charges donne le principe, pas les chiffres ("les
   coefficients exacts seront définis lors du balancing"). → **À trancher
   par Adrien avec appui de Claude Code sur les tests d'équilibrage.**
10. ~~Seuils de population à revoir dans le code.~~ **Appliqué au
    Jalon 6** : `SEUILS_NIVEAU` (TS) et `population_vers_niveau()` (SQL,
    migration `0008`) utilisent désormais 1 000 / 5 000 / 15 000 /
    40 000 / 100 000.
11. ~~Rendu basé sur la population… ou sur son record ?~~ **Tranché au
    Jalon 6** : Adrien n'avait pas de préférence tranchée, la reco de
    Claude s'applique — `population_max` (record jamais atteint), pas la
    population du moment. Implémenté pour `niveau` dès ce jalon (avant
    même le rendu 3D lui-même) — voir `DECISIONS.md` §4, journal du
    Jalon 6.
12. ~~Bibliothèque 3D pour la version de production.~~ **Fait au
    Jalon 6bis** : Adrien a confirmé Three.js (reco de Claude), portage
    complet du prototype effectué — voir `DECISIONS.md` §4, journal du
    Jalon 6bis.
13. ~~Fluidité sur mobile.~~ **Testé après le Jalon 6bis** (23/09/2026,
    sur le téléphone d'Adrien via l'IP locale du PC) : fluide. Au passage,
    deux bugs trouvés et corrigés lors de ce test (voir `DECISIONS.md`
    §4, entête "Corrections post-Jalon 6bis") : la nav mobile qui
    débordait (classes Tailwind de `src/components/` jamais scannées) et
    un double encodage gamma qui délavait le ciel/fond en gris-bleu.
14. **Halo des lampadaires qui semble traverser les bâtiments la nuit**
    (signalé par Adrien le 23/09/2026, après les corrections ci-dessus).
    **Probablement expliqué le 24/09/2026** par le bug de culling (voir
    §4, journal du Jalon 7, "le sol n'était pas dessiné") : sans leurs
    toits (et sans les faces éliminées), on voyait à travers les
    bâtiments les fenêtres éclairées des murs du fond. → **À reconfirmer
    par Adrien de nuit** avant de clore ; l'hypothèse ci-dessous sur le
    halo au sol reste une piste secondaire.
    Hypothèse la plus probable après relecture du code : le halo au sol
    des lampadaires (`ao.ts`, fonction `bakeAO`) est une carte 2D floutée
    autour de chaque lampadaire, sans notion des murs — un halo peut donc
    déborder sous un bâtiment proche d'un trottoir. Pas reproduit
    visuellement avec certitude (ville de test = un hameau avec une seule
    maison, écran trop petit/sombre pour trancher). → **À reprendre** dès
    qu'Adrien peut décrire précisément l'effet ou envoyer une capture
    (idéalement de jour, sur une ville avec plusieurs bâtiments) — pas de
    correction à l'aveugle sur un shader.
15. ~~Jalon 7 : classement ou refonte visuelle d'abord ?~~ **Tranché par
    Adrien le 23/09/2026** : refonte visuelle d'abord (nouveau Jalon 7
    "Un jeu agréable à regarder", proposé dans `docs/A-INTEGRER.md`
    déposé par une session Claude chat/Cowork le même jour). "Se classer"
    devient le Jalon 8. Détail dans `ROADMAP.md` et `DECISIONS.md` §4,
    journal du Jalon 7.
16. **Système de développement des villes (7 activités, jauges,
    mégaprojets, décisions du maire — `docs/SYSTEME-DEVELOPPEMENT.md`).**
    Proposition déposée le 23/09/2026, explicitement **non validée par
    Adrien** — présente dans la maquette du Jalon 7
    (`docs/prototypes/maquette-ecrans.html`) mais volontairement exclue de
    l'implémentation de ce jalon (gaz d'échappement de la maquette, pas
    une spécification). → **À trancher par Adrien** avant tout code sur
    ce système. Note associée : à l'échelle 100 000 habitants, la
    contamination à −10 % serait trop forte si ce système était activé un
    jour (2 000 habitants perdus d'un coup pour une ville de 20 000) —
    proposition en attente : −1 % et plafond de 3 % de pertes/jour toutes
    causes confondues (sans lien avec ce système, applicable dès
    maintenant si Adrien le souhaite pour l'antiville existante — à
    confirmer séparément). **[Résolu — validé par Adrien le 26/09/2026
    (`docs/A-INTEGRER.md` §18), codé aux Jalons 17-20, voir §4. Modifié
    le 05/10/2026 (§41) : plus de ressources de ville ni de financement,
    les mégaprojets rejoignent le catalogue des monuments, voir §4.]**
17. **"Bulletin municipal" (journal d'événements) et lien de partage
    personnalisé** — présents dans la maquette du Jalon 7 comme "clins
    d'œil", mais demanderaient chacun une vraie fonctionnalité qui
    n'existe pas encore (une table d'événements par ville ; un mécanisme
    d'invitation/visite anonyme via un lien). Non codés en façade pour ce
    jalon plutôt que de simuler quelque chose de creux. → **À trancher
    par Adrien** : si ces "clins d'œil" valent la peine d'un mini-jalon
    dédié, et avec quel contenu réel pour le bulletin (quels événements
    logger : nouveaux habitants, influence reçue, attaques subies,
    étages construits ?).
18. **Aspect des villes existantes changé une fois par le Jalon 7bis**
    (nouveau plan de blocs, maisons, voitures, forêts). Tranché par
    Claude, raisonnement dans §4, journal du Jalon 7bis. → **À contester
    par Adrien s'il préfère une migration** qui garde l'ancien plan. À
    partir de maintenant, la règle redevient stricte : toute évolution du
    générateur doit garder à l'identique les villes déjà construites (le
    test de stabilité du Jalon 7bis en couvre l'ordre des blocs ; la
    future bibliothèque de bâtiments, `docs/BATIMENTS-ET-PACKS.md` §2,
    devra faire de même pour les modèles).
19. **Plafond de rendu pour les très grandes villes ?** **[Résolu le
    02/10/2026 : plafond à 250 000 habitants, voir §4 — chiffre à
    ajuster après mesure sur téléphone.]** Texte d'origine : La croissance est
    sans limite comme demandé, mais le coût monte : 436 000 sommets à
    250 000 habitants, 706 000 à 500 000, 1,25 million à 1 000 000 (mesures
    au §4, Jalon 7bis). Sur téléphone, au-delà de ~500 000 habitants, ça
    risque de ramer. Pistes : plafonner le *rendu* (la population continue
    de monter, la ville dessinée arrête de s'étendre) ; ou simplifier les
    blocs lointains (moins de détails loin du centre). → **À trancher par
    Adrien**, sans urgence : la plus grande ville de test fait 114 000
    habitants. À mesurer sur son téléphone avec une ville de test géante
    avant de décider.
20. **Un stade au-delà de Métropole ?** (ex. "Mégapole" à 250 000
    habitants, question posée dans `docs/A-INTEGRER.md` §2). Le rendu
    continue de grandir mais le niveau reste Métropole au-delà de
    100 000. → **À trancher par Adrien** ; toucherait `SEUILS_NIVEAU` et
    la fonction SQL `population_vers_niveau()` (nouvelle migration).
    **[Résolu — validé par Adrien le 26/09/2026, câblé le 28/09/2026
    (migration `0031`), voir §4 "Niveau Mégapole".]**
21. **Bibliothèque de bâtiments et packs de thèmes**
    (`docs/BATIMENTS-ET-PACKS.md`, proposition du 24/09/2026).
    **Questions du §7 répondues par Adrien le 30/09/2026** : packs
    cosmétiques uniquement (oui), variantes par pays (non pour
    l'instant), thème prioritaire (Haussmannien), ordre (devenu sans
    objet, le Jalon 8 est fait depuis longtemps). **Catalogue + showroom
    + mobilier urbain
    codés le 30/09/2026, trois lots de bâtiments le même jour : 12 maisons,
    9 immeubles, 5 tours (26 au total, proche des ~30 visés), plus
    banc/fontaine/abribus/kiosque**, voir §4. **Point maintenant
    entièrement résolu** : premier pack de thème Haussmannien (partiel,
    immeubles seulement) codé le 30/09/2026, migration `0034`,
    sélectionnable librement par le maire sur `/ville` (pas de
    restriction de paiement, la boutique reste une étape ultérieure —
    §6 point 4 du document). Reste, si Adrien le souhaite un jour : plus
    de modèles pour atteindre exactement les ~30 visés, d'autres packs
    de thèmes (Méditerranée, Nordique, Japon...), la boutique elle-même.
22. **Revoir les règles du jeu** (retour d'Adrien après le Jalon 4 :
    "−10 % de population, c'est exagéré" — `docs/A-INTEGRER.md` §3 et
    `docs/SYSTEME-DEVELOPPEMENT.md` §6 bis). Proposition en réflexion :
    effets unitaires faibles, cumul des attaques de la journée, plafond de
    10 %/jour, paliers visibles. Ajouté à `ROADMAP.md` comme jalon **à
    placer par Adrien**. Pas de code d'ici là. **[Partiellement résolu —
    cette grille (effet unitaire faible, cumul du jour, plafond, paliers
    visibles) est appliquée à AntiVille depuis le Jalon 18 (§4), à la
    guerre entre pays depuis le Jalon 21 (§4, 28/09/2026), et à
    visites/influence/jumelages depuis le Jalon 22 (§4, 28/09/2026 —
    sous forme de paliers visibles seulement, sans nouveau plafond,
    puisque ce sont des effets positifs déjà plafonnés par joueur).
    **Ce point est maintenant entièrement résolu** : AntiVille, guerre,
    visites, influence et jumelages ont tous été revus sur cette
    grille.]**
23. **Titre de gouverneur de région ?** (idée à valider,
    `docs/CLASSEMENTS.md` §2 et §6 question 2) — badge et historique pour
    la ville n°1 d'une région, sur le modèle du président du pays, sans
    pouvoir particulier pour l'instant. Non codé au Jalon 8. → **À
    trancher par Adrien.**
24. **Régions réelles pour le Japon, et d'autres pays ?** Le Jalon 8 a
    donné des régions réelles aux 6 pays cités nommément par Adrien
    (France, Allemagne, Belgique, Suisse, Canada, États-Unis) ; le Japon,
    présent dans les villes de test, a reçu la région de repli "Tout le
    pays" comme les ~240 autres pays (décision de Claude Code, §4,
    journal du Jalon 8, à contester si besoin). → **À trancher par
    Adrien** : étendre à d'autres pays (Japon, Espagne, Italie,
    Royaume-Uni ?) ne demande qu'une nouvelle migration insert.
25. **Jalon 8bis "Les palmarès"** — fait, §4 journal du Jalon 8bis (sept
    classements annexes, 4 périodes × 3 échelles, calculés par requête
    directe sur les journaux existants plutôt que par
    `city_stats_jour`/`pg_cron`, écart documenté dans le journal).
    Question encore ouverte pour Adrien (`docs/CLASSEMENTS.md` §6,
    question 4 — la question 3 est tranchée, l'absence de classement des
    attaquants) : d'autres classements annexes en tête ?
26. **Noms uniques (pseudos et villes)** — **[Codé le 02/10/2026,
    migration `0035` appliquée (vérifié le 05/10/2026), voir §4. Reste
    un test rouge sur une VRAIE base, impossible sans accès SQL.]**
    Ancien texte : pas encore faits.
    `docs/A-INTEGRER.md` §8 demandait cette règle **dans le Jalon 8**
    ("qui touche déjà l'écran de création"), mais le contenu réel de ce
    jalon a été fixé par `docs/CLASSEMENTS.md` (régions + classements)
    avant que ce §8 ne soit pris en compte — la demande d'unicité n'a
    pas été codée ici. Aujourd'hui, ni `users.pseudo` ni `cities.nom`
    n'ont de contrainte d'unicité (toujours vrai depuis les migrations
    0001-0010). → **À trancher par Adrien** : mini-jalon dédié (colonne
    normalisée + index unique, vérification à la création, migration de
    dédoublonnage des données existantes, écran de rattrapage) ou
    intégré à un prochain jalon proche.
27. **Ressources nationales : aucun effet de gameplay pour l'instant.**
    Le Jalon 10 construit le vote hebdomadaire et l'accumulation des
    ressources par catégorie (Industrie/Techno/Culture/Commerce),
    visibles sur `/pays`, mais le cahier des charges ne dit nulle part
    ce que ces ressources *font* une fois accumulées — rien codé, décision
    volontairement pas prise seul (`DECISIONS.md` §4, journal du
    Jalon 10). **Partiellement touché au Jalon 13** : le "coût en
    ressources" d'un conflit est désormais un instantané informatif
    (`conflits.cout_ressources`), affiché mais jamais déduit — voir point
    30 ci-dessous. → **TRANCHÉ le 05/10/2026 par Adrien (A-INTEGRER §47 et §48)** : les
    ressources nationales servent désormais à deux choses — un classement
    hebdomadaire des pays qui récompense le n°1 de chaque catégorie, et une vraie
    dépense (les développements nationaux, votés chaque semaine). Détail : §4,
    journal « Classement des pays et développements nationaux ».
28. **Carte du pays (Jalon 9 ter) : détails laissés de côté faute de
    temps ou de données.** Pas de scintillement nocturne des grandes
    villes, pas de repères de jumelages en bord de carte (les deux
    prévus par `docs/CARTE-DU-PAYS.md` §2), pas d'interaction au clic
    sur une région (résumé population/ville n°1). 5 régions d'outre-mer
    françaises et 2 États américains (Rhode Island, DC) absents de la
    carte elle-même (données sources incomplètes/perdues à la
    simplification — les classements/votes de ces régions restent
    corrects). Le canvas 3D partagé continue de tourner, invisible,
    derrière la carte plutôt que d'être mis en pause (petit gaspillage
    CPU/GPU assumé). → **À trancher par Adrien** : lesquels de ces
    points valent une seconde passe, et avec quelle priorité par
    rapport aux autres jalons ?
29. ~~Décisions diplomatiques (Jalon 12) : aucun effet de gameplay pour
    l'instant.~~ **Tranché au Jalon 13** : un vote pour/contre majoritaire
    en fin de semaine adopte ou non la décision ; une "rivalité" adoptée
    déclenche un conflit d'une semaine entre les deux pays. Alliance/
    Paix/Embargo restent sans effet de gameplay au-delà du vote
    lui-même — non demandés par le cahier des charges, qui ne cite que
    la rivalité comme scénario de test. Détail dans `DECISIONS.md` §4,
    journal du Jalon 13.
30. **Coût en ressources d'un conflit (Jalon 13) : informatif seulement,
    jamais déduit.** `conflits.cout_ressources` capture un instantané des
    ressources nationales de l'attaquant (Jalon 10) au moment du
    déclenchement, affiché sur `/pays`, mais rien n'est retiré nulle
    part — les ressources du Jalon 10 sont un compteur cumulatif en
    lecture seule, sans mécanisme de dépense (voir point 27). En faire
    une vraie monnaie dépensable aurait été un jalon à part entière ;
    décision prise sans attendre Adrien pour ne pas bloquer ce jalon.
    → **À confirmer par Adrien** : simplification acceptée telle quelle,
    ou faut-il un vrai coût déduit ? *(05/10/2026 : la vraie dépense existe maintenant,
    mais ailleurs — les développements du §48 ; le coût d'un conflit reste
    informatif, rien n'a changé pour lui.)*
31. **"Avantages nationaux" (dont Défense, cahier des charges §13) :
    système pas encore construit.** Signalé par Adrien lui-même comme un
    ingrédient attendu de l'effort national en temps de guerre
    (`docs/A-INTEGRER.md` §12, 25/09/2026) — `effort_national()` du
    Jalon 13 s'appuie pour l'instant seulement sur l'activité (Jalon 9)
    et les ressources nationales (Jalon 10), les deux seuls ingrédients
    qui existent déjà, plutôt que d'inventer un substitut. → **TRANCHÉ le 05/10/2026
    (A-INTEGRER §48)** : ce sont les développements nationaux (Arsenal national,
    Mobilisation éclair, Fortifications, Bouclier civil...), débloqués par un vote
    hebdomadaire et financés par les ressources ; leurs effets sont dans la résolution
    des conflits. Détail : §4, journal « Classement des pays et développements
    nationaux ».
32. **Visites multiples par jour (Jalon 13 bis) : Influence et AntiVille
    pas étendus au même système.** Seule l'action Visiter permet
    désormais plusieurs fois par jour (délai d'une heure, plafond de 3) ;
    Influence (5/jour) et AntiVille (3/jour) gardent leur ancienne limite
    d'une fois par (joueur, ville, jour). Adrien n'a demandé l'extension
    que pour Visiter. → **À trancher par Adrien** : l'objectif de
    rétention justifie-t-il d'étendre le même principe à Influence et/ou
    AntiVille, ou ces deux actions restent-elles volontairement à une
    fois par jour ?
33. ~~"Combien d'habitants par habitation" — maisons.~~ **Immeubles et tours :
    tranché le 02/10/2026, non — on garde le rythme en étages.** **Fait le
    27/09/2026** : Adrien choisit la refonte complète par type de
    bâtiment (plutôt que juste retoucher les seuils existants) ;
    implémenté pour les **maisons** (`HABITANTS_PAR_LOGEMENT_MAISON = 4`,
    voir `DECISIONS.md` §4 "Habitants par habitation"). **Reste ouvert
    pour les immeubles et les tours** : leur rythme actuel
    (`APART_FLOOR_EVERY`, `PER_FLOOR`) est resté inchangé, un choix
    assumé pour ne pas casser les repères de densité du cahier des
    charges (~28 blocs à 100 000 habitants, ~58 à 250 000) plutôt qu'un
    oubli. → **À trancher par Adrien** : le rythme des immeubles/tours
    doit-il lui aussi être repensé en "logements", ou son rythme actuel
    (mesuré en étages) reste-t-il satisfaisant tel quel ?
34. ~~Gratte-ciel figés en crise Énergie~~ **Tranché le 02/10/2026 : non**
    (décision d'Adrien, les tours continuent de monter — voir `DECISIONS.md` §4
    « Petits points »). Texte d'origine : **Gratte-ciel figés en crise Énergie (Jalon 18, docs/SYSTEME-DEVELOPPEMENT.md
    §4).** "Les gratte-ciel arrêtent de monter" en crise Énergie n'est
    pas implémenté — nécessiterait un nouvel état persistant (un
    "population gelée pour les tours", mise à jour uniquement quand
    l'Énergie n'est pas en crise) pour un effet purement visuel ; jugé
    disproportionné pour ce jalon. → **À trancher par Adrien** : vaut-il
    le coût d'implémentation, ou peut-on laisser les tours continuer de
    monter même en crise Énergie (l'effet réel — risque de
    manifestation ×2 — reste lui bien appliqué) ?
35. ~~Fumée 3D et notification du pays~~ **Tranché le 02/10/2026 :
    notification seulement, sans fumée 3D** (migration `0044`, voir §4
    « Petits points »). Texte d'origine : **Fumée 3D (palier Émeutes) et notification du pays (palier Crise),
    Jalon 18, docs/SYSTEME-DEVELOPPEMENT.md §6bis.** Pas d'infra de
    notification pays pour l'instant (pas de boîte de réception, pas de
    page dédiée) ; l'effet 3D "fumée visible" nécessiterait de toucher
    le générateur de ville pour un affichage temporaire. Les paliers
    eux-mêmes sont bien calculés et visibles (badge + bulletin), seuls
    ces deux effets d'accompagnement manquent. → **À trancher par
    Adrien** : à construire maintenant, ou repoussé à un futur jalon
    (ex. quand une vraie page pays avec notifications existera) ?
36. **Monuments d'influence (docs/A-INTEGRER.md §19, 27/09/2026).**
    Bâtiments spéciaux (statues, fontaines, arcs...) débloqués
    automatiquement par paliers d'influence RECORD (`influence_max`,
    nouveau champ, jamais décroissant — même principe que
    `population_max`), 16 paliers proposés de 10 à 1 000 000, purement
    cosmétique. Rangé dans `ROADMAP.md` au Jalon 20 (mégaprojets/
    technologies), à la discrétion de Claude Code selon la note
    d'Adrien. → **Chiffres des paliers et liste des bâtiments à
    ajuster avec les villes de test**, comme d'habitude — pas encore
    codé.
37. **Boutique de packs (A-INTEGRER §30, 05/10/2026) : quand rendre un pack payant,
    et brancher le paiement.** Les deux surfaces (section « Thèmes de la ville » dans
    Ma ville, onglet Boutique) et le droit d'usage côté serveur (migration `0047`,
    **à appliquer par Adrien**) sont construits, mais **le paiement n'est pas branché** :
    Haussmannien était gratuit pour tous comme depuis la `0034` (§4, journal « La
    boutique de packs de thèmes »). **(a) Tranché le 05/10/2026 : Haussmannien est PAYANT** (graine
    de la `0047` à `gratuit = false`, ceux qui l'utilisent déjà le gardent) — seulement
    attribuable à la main tant que le paiement n'existe pas. → **Reste à trancher par Adrien** :
    (b) le paiement : statut légal et service
    (`BATIMENTS-ET-PACKS.md` §5), toute dépense passant d'abord par Adrien (§1 point 1) ;
    (c) un pack « premium » débloqué pour les comptes de test (§5) — utile dès qu'un
    pack payant existe. Le bouton « Acheter » (désactivé, avec sa raison) est le seul
    endroit à brancher.
38. **Mesure du classement des pays (A-INTEGRER §47, 05/10/2026) : total ou moyenne ?** Le §47 classe
    les pays sur leur **total** de ressources accumulées, et c'est ce qui est codé. Risque connu : à
    total brut, un grand pays (beaucoup de joueurs, donc beaucoup de votes) domine mécaniquement les
    quatre catégories — exactement le défaut que le §24 a corrigé pour l'effort de guerre (passage à la
    moyenne par ville). → **À trancher par Adrien** : total (tel quel), total par ville, ou total par
    joueur actif. Le changement tient dans une seule fonction SQL (`valeur_classement_pays()`, migration
    `0052`) : tout le reste la lit.
39. **Avis des pays visés (§47 « Culture n°1 », §48 « Rayonnement diplomatique », migration `0053`) :
    interprétation de Claude Code.** Le texte parle du « vote » d'un pays dans les décisions diplomatiques
    des autres, qui n'existe pas dans le jeu (seuls les citoyens du pays proposant votent). Retenu : un
    pays qui a de l'influence culturelle peut donner un avis pondéré (2 / 1,5 / 2,5) sur les décisions qui
    le visent. → **À valider ou à réorienter par Adrien** : est-ce bien l'idée ? Autre lecture possible :
    ouvrir ce vote de la cible à TOUS les pays (poids 1), la Culture le doublant — plus large, plus
    risqué pour l'équilibre.
40. **Chiffres des développements et des effets (§48), à calibrer.** Coûts de 10 à 16 ressources,
    effets de +10 % à +20 %, bonus du n°1 à 10-15 % : tous posés par Claude Code sans donnée de jeu réelle.
    Deux écarts avec le texte (§4, journal : « Mobilisation éclair » = ×2 le premier jour, faute de montée
    en puissance à supprimer ; « Bouclier civil » agit sur la perte quotidienne, le plafond de 5 % n'étant
    jamais atteint). → **À ajuster après essai** : les coûts (une ligne de `developpements_catalogue()`
    et de `developpements.ts`) et les effets (une petite fonction SQL chacun).
41. **Postgres local jetable (PGlite) : en faire une dépendance de développement ?** Il a permis
    d'exécuter 111 vérifications SQL sur les migrations `0052` à `0054` (§4, journal « Classement des pays
    et développements nationaux »), ce que le dépôt ne permettait pas. Il est utilisé hors de
    `package.json` (`npm install --no-save @electric-sql/pglite`, voir `scripts/postgres-local/`). Règle de
    poids (§1 point 6) : une dépendance de **développement** ne pèse rien sur l'application livrée, mais
    pèse sur `node_modules` (~25 Mo). → **À trancher par Adrien** : l'ajouter à `devDependencies` et en
    faire une suite (`npm run test:sql`), ou rester en usage ponctuel.
42. **Taille des monuments (A-INTEGRER §49 A, 05/10/2026) : gabarits à valider.** Hauteurs de 7 à 62 m, posées par
    Claude Code à partir du seul texte de la demande (« la statue géante à 50 m ou plus » : 56 m) ; les autres types
    sont proportionnés à leur nature (un banc ne monte pas à 50 m). Limite physique : le carré d'une parcelle de
    14,5 m, donc un rayon de 6,6 m au plus. → **À ajuster par Adrien après avoir regardé en jeu** : une ligne par type
    dans `GABARITS` (`monuments.ts`), la hauteur seulement si le monument est déjà à la limite de largeur.
43. **Stade (2 × 1 blocs) et Parc d'attractions (2 × 2) : le coût en habitations.** Quand une ville atteint un de ces sites,
    elle perd 2 blocs d'habitations (Stade) ou 4 (Parc), et les rues qui les traversent disparaissent. Le Stade a été 2 × 2 (§49 D),
    puis jugé trop grand (3ᵉ consigne du 05/10/2026) : 2 × 1 blocs, 1,5 bloc de long au plus, règle de proportion écrite dans
    `megaprojetsFormes.ts`. Le Grand stade a été 3 × 3, puis 3 × 2, avant de devenir le Parc d'attractions. Les sites sont dans le
    noyau de la ville (point 47). → **À confirmer par Adrien** : acceptable tel quel, ou un Stade encore plus petit (1 × 1 bloc,
    plateforme de 56 m) ; la taille est une constante (`SITES_MULTI_BLOCS`, `megaprojets.ts`), le reste suit.
44. **Un monument par bloc, dans les 16 blocs les plus centraux (§49 B).** Choix de Claude Code : deux monuments de
    40 à 60 m dans le même bloc se cachent l'un l'autre ; un par bloc les espace d'au moins 80 m. Contrepartie : ils
    s'étalent jusqu'à 222 m du centre (avant : dans les 8 blocs centraux, deux par cour). → **À confirmer par Adrien**,
    ou à resserrer sur 8 blocs (une constante, `NB_BLOCS_MONUMENTS`, `monumentsVille.ts`, et un tirage de parcelle
    qui évite deux parcelles voisines).
45. **Fond de `/pays` (§49 E) : résolu.** Le paysage de campagne a été supprimé sur retour d'Adrien (« ne me plaît pas ») :
    la page `/pays` prend toute la page, sans scène 3D ni autre fond (`SansScene.tsx`, `globals.css`). Plus de point
    ouvert.
46. **Texte du §49 absent de la copie locale de `A-INTEGRER.md`** (elle s'arrête au §48 ; la version à jour est dans
    le projet Claude « Jeu »). Le §49 a été traité d'après la consigne reçue (cinq corrections A à E). → **À
    resynchroniser** : si le texte du §49 dit autre chose sur un point (chiffres, ordre, règle), le signaler.
    **→ Résolu le 05/10/2026** : le texte du §49 est arrivé dans le fichier, et c'est **autre chose** (« Expliquer les
    jauges dans la page Règles », fait). Les cinq corrections A à E n'ont donc **aucun § propre** dans `A-INTEGRER.md` : à
    rattacher à la note du projet Claude « Jeu » dont elles viennent, ou à renuméroter.
47. **Mégaprojets dans le noyau de la ville : le coût en habitations (retour d'Adrien du 05/10/2026, règle le §46).** Les 18
    mégaprojets occupent 22 blocs (16 d'un bloc, plus 2 pour le Stade et 4 pour le Parc d'attractions) pris dans l'ordre de
    distance au centre, juste après les 16 blocs des monuments : en moyenne à la 28e case en partant du centre, au plus à
    la 85e (100 graines, mesuré avant le Stade en 2 × 1). Une ville qui grandit atteint donc ces blocs tôt, et ce ne sont plus des quartiers (les 16
    monuments et ces 22 blocs : 38 blocs du cœur). → **À juger par Adrien en jouant** : acceptable (la ville est dense
    autour d'eux), ou à décaler (commencer après la 25e case plutôt que la 17e : `NB_BLOCS_MONUMENTS` et la boucle de
    `placesDeTous`, `megaprojetsVille.ts`), ou à rendre moins gourmand (le Stade en 1 × 1 bloc, point 43).
48. **Le Grand stade est devenu le Parc d'attractions, mais son identifiant et son bonus n'ont pas changé.** `grand_stade`
    (catalogue unifié, migrations `0028` et `0050`, palier 31, seuil 150 000, activité loisirs) donne toujours « pertes de
    manifestation ×0,75 », un bonus de stade : étrange pour un parc d'attractions. Seuls le dessin et le nom affiché (FR,
    EN) ont changé, sans migration. → **À trancher par Adrien** : garder tel quel, ou une migration qui renomme
    l'identifiant (`parc_attractions`) et donne un bonus qui lui ressemble (le choix du bonus est un choix de design).
49. **Éclairage de nuit des 16 autres mégaprojets : première proposition.** Lampadaires, halos au sol sous le bâtiment et
    fenêtres allumées au hasard (pour les vitrages) ; le Stade et le Parc d'attractions ont leurs lumières propres (LED,
    ampoules). Les accents propres à chaque type (enseigne de l'Opéra, projecteurs de façade, balisage de piste de
    l'Aéroport, croix lumineuse de l'Hôpital) ne sont pas dessinés. → **À juger par Adrien** de nuit dans le jeu ; une
    ligne par type dans `megaprojetsCivils.ts`, `megaprojetsEquipements.ts` ou `megaprojetsEnergie.ts` si besoin.
50. **Espagnol (A-INTEGRER §50, 05/10/2026) : relecture et noms de pays.** (a) Les 540 clés et les règles ont été
    traduites par Claude Code (tutoiement, vocabulaire du jeu : AntiCiudad, hermanamiento, indicadores, Tienda…) : une
    **relecture par un locuteur natif** est recommandée avant d'annoncer la langue. (b) Les **noms de pays** restent en
    **anglais** en espagnol (la base n'a que `nom_fr` et `nom_en`, onze pages choisissent `nom_en` pour toute langue autre
    que le français) et les noms de régions restent ceux de la base. Option : migration `nom_es` (les noms espagnols
    existent dans `world-countries`) + remplacement des onze `locale === "fr" ? "nom_fr" : "nom_en"` par un seul
    helper — à valider (une migration de plus à appliquer). (c) Poids : +10 Ko gzip, tout le dictionnaire part au client.
    (d) Les Règles FR/EN/ES disent encore que les mégaprojets sont « à la bordure » : faux depuis le §46 (ils sont dans la
    ville), non touché ici.
51. **« Niveau du quartier Loisirs » (3ᵉ consigne du 05/10/2026) : définition à confirmer.** La consigne dit que le Parc d'attractions « s'étoffe avec
    le niveau du quartier Loisirs » sans dire de quel niveau il s'agit. Choix de Claude Code : le nombre de **stades de loisirs
    construits** dans les blocs de vocation Loisirs de la ville (`stats.stadesLoisirs`, le second lot de chaque bloc Loisirs ; `niveauLoisirs()`,
    `megaprojetsFormes.ts`) : 0 aucun, 1 de un à deux, 2 de trois à cinq, 3 six ou plus. Il croît avec la ville et avec le zonage Loisirs
    du joueur ; **sans quartier Loisirs le parc reste au niveau 0** (entrée, fontaine, carrousel, grande roue, chapiteau). → **À trancher par
    Adrien** : c'est bien cela, ou le niveau de la jauge d'activité Loisirs (crise / fragile / équilibre / point fort, demanderait de
    faire passer ce niveau de la page à la scène), ou la population ; les seuils (1, 3, 6) sont une fonction de cinq lignes.
    **Numérotation** : cette 3ᵉ consigne cite « §50 », déjà pris dans `A-INTEGRER.md` par l'espagnol (point 50) ; elle n'a donc pas
    de § propre (comme les « cinq corrections A à E », point 46) → **À réconcilier par Adrien** (le numéro à lui donner).
52. **Poids en sommets du Parc d'attractions (3ᵉ consigne du 05/10/2026).** 26 600 sommets au niveau 0, **44 600 au niveau 3** (l'ancien : 16 700),
    soit 18 % d'une ville de 60 000 habitants (245 000 sommets) ; les 18 mégaprojets au maximum : 106 000. Le gros du poids : les 110
    arbres (79 sommets chacun), les lampadaires d'allée, la grande roue et les montagnes russes. Code : +7,2 Ko gzip pour ce retour
    (74,5 Ko). → **À juger par Adrien sur un téléphone** : si la scène ralentit au niveau 3, on peut réduire les arbres et les ampoules.
53. **Le Stade est toujours allongé le long de x (3ᵉ consigne du 05/10/2026).** Un site de 2 × 1 blocs part de la case d'ancrage vers l'extérieur, le
    long de x ; seul l'intérieur change selon la graine du site (aucune variante pour le Stade). Une rotation d'un quart de tour selon la
    graine demanderait de rendre `blocsMegaprojet` dépendant de la graine (le placement le lit avant de choisir la case).


