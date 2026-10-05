-- A-INTEGRER §41 (décision d'Adrien, 05/10/2026) : plus de ressources de
-- ville, et les mégaprojets rejoignent le catalogue à seuils d'influence
-- des monuments (migration 0030). Un mégaprojet n'est plus choisi par le
-- maire ni financé par les visiteurs : il apparaît tout seul quand le record
-- d'influence de la ville (`influence_max`, jamais décroissant) franchit son
-- seuil, exactement comme un monument.
--
-- STRUCTURE (décision de Claude Code, laissée libre par le §41) : UNE seule
-- table, `monuments` (inchangée : ville, palier, date de déblocage), et UN
-- seul catalogue, `monument_catalogue()`, qui gagne deux colonnes :
--   famille  : 'monument' | 'megaprojet'
--   activite : l'activité d'un mégaprojet (sa teinte, son thème), null pour
--              un monument.
-- Deux tables avec un déblocage partagé auraient obligé à tenir deux
-- listes de lignes synchronisées pour un comportement identique ; une seule
-- suffit, et `avancer_monuments()` n'a plus qu'une boucle.
--
-- IDENTIFIANTS : `palier` devient un identifiant stable, plus un rang. Les
-- monuments gardent 0 à 15 (leurs lignes existantes restent valides sans
-- rien migrer) ; les 18 mégaprojets reçoivent 16 à 33, dans l'ordre
-- croissant de leurs seuils. Conséquence : le catalogue n'est plus rangé par
-- palier croissant = seuil croissant, donc la boucle de déblocage ne peut
-- plus s'arrêter au premier seuil non atteint — elle parcourt tout ce dont
-- le seuil est atteint. Ne JAMAIS renuméroter un palier existant.
--
-- SEUILS DES MÉGAPROJETS (répartition de Claude Code, modifiable ici et dans
-- src/lib/game/megaprojets.ts ; tests/unit/catalogueBatiments.test.ts
-- vérifie que les deux listes sont identiques). Ils gardent l'ordre des
-- anciens stades de population (Bourg, Ville, Grande ville, Métropole,
-- Mégapole) et s'intercalent entre les monuments sans jamais tomber sur le
-- même seuil :
--   stade 0 (ex-Bourg)       grande_ecole 400 · parc_sports 750 · marche_couvert 1 500
--   stade 1 (ex-Ville)       hopital 2 000 · stade 3 500 · centrale_solaire 6 000 · zone_logistique 8 000
--   stade 2 (ex-Grande ville) technopole 12 000 · gare_tgv 15 000 · parc_eolien 20 000 · opera 30 000
--   stade 3 (ex-Métropole)   tour_emblematique 40 000 · aeroport 60 000 · centre_recherche 80 000 · centrale 120 000
--   stade 4 (ex-Mégapole)    grand_stade 150 000 · centrale_nouvelle_generation 300 000 · siege_international 400 000
-- L'ancienne suite « un palier de plus tous les 50 000 habitants » (qui
-- réutilisait le catalogue de la Mégapole) disparaît : sans choix, répéter
-- les mêmes types n'aurait aucun sens. Le catalogue est fini : 34 entrées.
--
-- BONUS PERMANENTS CONSERVÉS, à l'identique de la migration 0028 : Stade et
-- Grand stade (pertes de manifestation ×0,75), Centrale solaire / Parc
-- éolien / Centrale / Centrale nouvelle génération (élan Énergie +20 %
-- chacune, cumulatif), Hôpital (contamination ÷2), Opéra (propagande ÷2).
-- Seul le déblocage change. Les fonctions qui les appliquent (jauges_ville,
-- verifier_manifestation, lancer_action_antiville) ne sont PAS recréées :
-- elles appellent nb_megaprojets_construits(), dont seul le corps change
-- ci-dessous (le nom reste, « construit » veut maintenant dire « débloqué »).
--
-- RESSOURCES DE VILLE SUPPRIMÉES : les matériaux (visites Industrie) et les
-- revenus (visites Commerce) n'existent plus comme stocks à dépenser —
-- colonnes cities.materiaux_depenses / revenus_depenses retirées.
-- stock_ville() reste, mais UNIQUEMENT pour les technologies (compteur de
-- points de Recherche cumulés, jamais dépensé : ce n'est pas une ressource à
-- dépenser, les technologies ne sont pas concernées par le §41). Les
-- ressources NATIONALES des pays (Jalon 10) n'ont rien à voir et ne bougent
-- pas.
--
-- DONNÉES EXISTANTES : la table `megaprojets` et les chantiers qu'elle
-- contenait sont supprimés (base de dev/recette, aucun joueur réel). Chaque
-- ville récupère SILENCIEUSEMENT, sans événement de bulletin (pour ne pas
-- inonder le journal mondial), les mégaprojets que son record d'influence
-- atteint déjà. Les anciens événements 'megaprojet_construit' restent dans
-- le bulletin comme de l'histoire : le type reste autorisé, plus rien n'en
-- crée de nouveaux (les déblocages sont des 'monument_debloque', valeur =
-- palier, comme pour les monuments — journal_monde() les retrouve par
-- valeur >= 8, ce que tous les mégaprojets, de 16 à 33, satisfont).
--
-- Registre des codes d'erreur : P0024 (palier de mégaprojet pas encore
-- débloqué), P0025 (palier déjà choisi) et P0026 (type invalide pour ce
-- palier) ne servent plus (plus de choix) — laissés dans le registre, comme
-- P0005 depuis la migration 0021, plutôt que réutilisés pour autre chose.
-- Aucun nouveau code : rien n'est appelable directement par un joueur.

-- ---------------------------------------------------------------------
-- Catalogue unifié (34 entrées). Le type de retour change : il faut
-- supprimer l'ancienne fonction avant de recréer.
-- ---------------------------------------------------------------------
drop function if exists public.monument_catalogue();

create function public.monument_catalogue()
returns table(palier integer, seuil integer, type text, famille text, activite text)
language sql
immutable
as $$
  select * from (values
    (0, 10, 'borne_commemorative', 'monument', null::text),
    (1, 25, 'banc_public', 'monument', null),
    (2, 50, 'fontaine_simple', 'monument', null),
    (3, 100, 'buste', 'monument', null),
    (4, 250, 'obelisque', 'monument', null),
    (5, 500, 'arc_triomphe_miniature', 'monument', null),
    (6, 1000, 'horloge_municipale', 'monument', null),
    (7, 2500, 'fontaine_monumentale', 'monument', null),
    (8, 5000, 'statue_equestre', 'monument', null),
    (9, 10000, 'mur_remerciements', 'monument', null),
    (10, 25000, 'arche_monumentale', 'monument', null),
    (11, 50000, 'tour_observatoire', 'monument', null),
    (12, 100000, 'statue_emblematique', 'monument', null),
    (13, 250000, 'temple_national', 'monument', null),
    (14, 500000, 'statue_geante', 'monument', null),
    (15, 1000000, 'monument_ultime', 'monument', null),
    (16, 400, 'grande_ecole', 'megaprojet', 'services'),
    (17, 750, 'parc_sports', 'megaprojet', 'loisirs'),
    (18, 1500, 'marche_couvert', 'megaprojet', 'commerce'),
    (19, 2000, 'hopital', 'megaprojet', 'services'),
    (20, 3500, 'stade', 'megaprojet', 'loisirs'),
    (21, 6000, 'centrale_solaire', 'megaprojet', 'energie'),
    (22, 8000, 'zone_logistique', 'megaprojet', 'industrie'),
    (23, 12000, 'technopole', 'megaprojet', 'recherche'),
    (24, 15000, 'gare_tgv', 'megaprojet', 'commerce'),
    (25, 20000, 'parc_eolien', 'megaprojet', 'energie'),
    (26, 30000, 'opera', 'megaprojet', 'loisirs'),
    (27, 40000, 'tour_emblematique', 'megaprojet', 'residentiel'),
    (28, 60000, 'aeroport', 'megaprojet', 'commerce'),
    (29, 80000, 'centre_recherche', 'megaprojet', 'recherche'),
    (30, 120000, 'centrale', 'megaprojet', 'energie'),
    (31, 150000, 'grand_stade', 'megaprojet', 'loisirs'),
    (32, 300000, 'centrale_nouvelle_generation', 'megaprojet', 'energie'),
    (33, 400000, 'siege_international', 'megaprojet', 'commerce')
  ) as t(palier, seuil, type, famille, activite);
$$;

-- ---------------------------------------------------------------------
-- avancer_monuments() : débloque tout ce dont le seuil est atteint, monuments
-- et mégaprojets confondus. Appelée de façon opportuniste à chaque
-- affichage d'une ville. Idempotente, et sans course possible entre deux
-- affichages simultanés : `on conflict do nothing` + `found` (vrai
-- seulement si CETTE exécution a inséré la ligne) ne créent l'événement
-- qu'une fois. L'ordre (seuil, palier) rend les événements chronologiques.
-- ---------------------------------------------------------------------
create or replace function public.avancer_monuments(p_ville_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_influence_max integer;
  v_entree record;
begin
  select influence_max into v_influence_max from public.cities where id = p_ville_id;
  if v_influence_max is null then
    return;
  end if;

  for v_entree in
    select k.palier from public.monument_catalogue() k
    where k.seuil <= v_influence_max
    order by k.seuil, k.palier
  loop
    insert into public.monuments (ville_id, palier)
      values (p_ville_id, v_entree.palier)
      on conflict (ville_id, palier) do nothing;
    if found then
      insert into public.city_events (ville_id, type, valeur, jour)
        values (p_ville_id, 'monument_debloque', v_entree.palier, (now() at time zone 'utc')::date);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- nb_megaprojets_construits() : même signature qu'en 0028, nouveau corps.
-- Un mégaprojet « existe » dès que le record d'influence de la ville a
-- atteint son seuil — lu directement sur le catalogue, pas sur les lignes de
-- `monuments` : un bonus ne dépend donc jamais d'un affichage de la page
-- (qui, lui, pose les lignes), et il n'y a pas deux sources de vérité.
-- ---------------------------------------------------------------------
create or replace function public.nb_megaprojets_construits(p_ville_id uuid, p_types text[])
returns integer
language sql
stable
as $$
  select count(*)::integer
  from public.monument_catalogue() k
  join public.cities c on c.id = p_ville_id
  where k.famille = 'megaprojet'
    and k.type = any(p_types)
    and k.seuil <= c.influence_max;
$$;

-- ---------------------------------------------------------------------
-- Rattrapage silencieux des mégaprojets déjà atteints (aucun événement).
-- ---------------------------------------------------------------------
insert into public.monuments (ville_id, palier)
select c.id, k.palier
from public.cities c
join public.monument_catalogue() k on k.famille = 'megaprojet' and k.seuil <= c.influence_max
on conflict (ville_id, palier) do nothing;

-- ---------------------------------------------------------------------
-- Fin du financement : le choix du maire, les chantiers, les coûts, les
-- stocks dépensés. Les fonctions d'abord (aucune autre fonction SQL ne les
-- appelle : vérifié sur toutes les migrations), puis la table, puis les
-- colonnes de dépense.
-- ---------------------------------------------------------------------
drop function if exists public.choisir_megaprojet(uuid, uuid, integer, text);
drop function if exists public.avancer_megaprojets(uuid);
drop function if exists public.etat_megaprojets(uuid);
drop function if exists public.megaprojet_options(integer);
drop function if exists public.seuil_megaprojet(integer);
drop function if exists public.nb_megaprojets_ouverts(integer);
drop function if exists public.cout_megaprojet(integer);

drop table if exists public.megaprojets;

alter table public.cities
  drop column if exists materiaux_depenses,
  drop column if exists revenus_depenses;
