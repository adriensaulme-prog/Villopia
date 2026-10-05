-- Développements nationaux : attaque / défense / développement, débloqués par vote hebdomadaire
-- (docs/A-INTEGRER.md §48, décision d'Adrien du 05/10/2026). Suite du §47 (migrations 0052-0053).
--
-- Les ressources nationales (une ressource = un vote de ressource d'un joueur du pays, Jalon 10)
-- deviennent DÉPENSABLES. Même principe démocratique que le reste du pays : pas de chef qui choisit,
-- les joueurs votent.
--
-- CATALOGUE FIXE de 9 développements, 3 par famille (les exemples du §48, repris tels quels), chacun
-- avec un coût combinant les 4 catégories (developpements_catalogue(), seule source des coûts).
--
-- LE VOTE, chaque semaine (lundi 00 h UTC, comme le vote de ressource et la décision diplomatique) :
--   * 3 développements sont proposés, UN PAR FAMILLE (choix de Claude Code, le §48 laissait le choix
--     entre un tirage dans tout le catalogue et un par famille : un par famille garantit un vrai choix
--     entre attaque, défense et développement). Dans une famille, le tirage est déterministe (hachage
--     du pays, de la semaine et du développement) et exclut ce que le pays a déjà débloqué ; une
--     famille entièrement débloquée n'est plus proposée.
--   * chaque joueur vote une fois par semaine pour l'un des 3 ;
--   * à la fin de la semaine, le plus voté (égalité : l'ordre du catalogue) est DÉBLOQUÉ
--     AUTOMATIQUEMENT si le stock du pays couvre son coût dans CHAQUE catégorie. Sinon il repasse
--     au vote la semaine suivante, à la place du tirage de sa famille, pendant que le stock grossit ;
--   * un développement débloqué ne se perd jamais (la ligne de developpements_pays ne s'efface pas).
--   * Le stock pris en compte est celui de la FIN de la semaine du vote (production jusqu'à cette
--     semaine incluse, moins ce qui a déjà été dépensé), pas celui du moment où la page est lue :
--     la clôture est paresseuse (voir plus bas) et ne doit pas dépendre de qui la lit quand.
--
-- STOCK = PRODUCTION − DÉPENSE. La production est le compte de votes de ressource (ressources_pays,
-- inchangée) ; la dépense est la somme des coûts payés (instantané `cout` de chaque ligne
-- débloquée). Le classement du §47 et l'effort national (effort_national(), qui lit ressources_pays)
-- restent sur la PRODUCTION cumulée : dépenser ne fait ni perdre la 1ère place, ni baisser l'effort de
-- guerre (sinon débloquer une « attaque » affaiblirait l'effort !).
--
-- CLÔTURE PAREILLE À LA PRÉSIDENCE ET À LA DIPLOMATIE : paresseuse et idempotente
-- (resoudre_developpement_pays), déclenchée à l'affichage de /pays, au vote, et par chaque réglage
-- de jeu qui lit les développements d'un pays (croissance, seuils, guerre, AntiVille) : un
-- développement débloqué le lundi s'applique dès qu'on s'en sert, sans attendre qu'on ouvre /pays.
-- Il prend effet le lundi qui suit la semaine du vote (date effective = semaine_vote + 7), que la
-- clôture soit lue tôt ou tard.
--
-- EFFETS (chiffres laissés à Claude Code par le §48, à contester ; chacun écrit UNE fois) :
--   Attaque
--     arsenal_national         +20 % d'effort national quand le pays attaque
--     mobilisation_eclair      effort ×2 le PREMIER JOUR d'un conflit où le pays attaque. Il n'y a pas
--                              de « montée en puissance » à supprimer dans la mécanique (l'effort est
--                              recalculé chaque jour sans rampe) : l'interprétation retenue est donc
--                              une impulsion initiale, qui peut faire gagner une première journée
--     service_renseignement    voir l'effort national d'un pays visé AVANT de voter une rivalité
--                              (information seulement : effort_national_cible())
--   Défense
--     fortifications           bonus défensif ×1,5 → ×1,75
--     bouclier_civil           pertes de population quotidiennes de la guerre divisées par 2. Le §48
--                              parlait du PLAFOND de 5 % : il n'est jamais atteint (7 jours à 0,1 %
--                              font au plus 0,7 %), l'abaisser n'aurait aucun effet, donc l'effet
--                              porte sur la perte quotidienne (arrondie vers le bas : une ville qui
--                              perdait 1 habitant par jour n'en perd plus)
--     resistance_propagande    attaques AntiVille ×0,75 sur toutes les villes du pays (les trois
--                              types : le §48 dit « les attaques AntiVille », pas seulement la
--                              propagande)
--   Développement
--     expansion_urbaine        +10 % de chance d'un habitant de plus par visite, dans tout le pays
--                              (cumulable avec le Commerce n°1 : +20 % au plus)
--     rayonnement_diplomatique poids de l'avis du pays +0,5 dans les décisions qui le visent (0053)
--                              et lui donne voix au chapitre même sans la 1ère place en Culture
--     avance_technologique     seuils d'influence des monuments et mégaprojets −10 % (cumulable avec
--                              le Technologie n°1 : −20 % au plus)
--
-- Codes d'erreur nouveau : P0034 (développement inconnu ou pas proposé cette semaine). Vote déjà
-- donné : 23505 (unique_violation), comme les autres votes hebdomadaires.

-- ---------------------------------------------------------------------
-- Catalogue : source unique des identifiants, familles et coûts. src/lib/game/developpements.ts le
-- reflète (un test compare les deux).
-- ---------------------------------------------------------------------
create or replace function public.developpements_catalogue()
returns table (
  id text,
  famille text,
  ordre integer,
  cout_industrie integer,
  cout_techno integer,
  cout_culture integer,
  cout_commerce integer
)
language sql
immutable
as $$
  select * from (values
    ('arsenal_national', 'attaque', 1, 6, 4, 0, 0),
    ('mobilisation_eclair', 'attaque', 2, 8, 0, 0, 6),
    ('service_renseignement', 'attaque', 3, 0, 10, 5, 0),
    ('fortifications', 'defense', 4, 8, 4, 0, 0),
    ('bouclier_civil', 'defense', 5, 0, 0, 8, 6),
    ('resistance_propagande', 'defense', 6, 0, 5, 10, 0),
    ('expansion_urbaine', 'developpement', 7, 4, 0, 0, 8),
    ('rayonnement_diplomatique', 'developpement', 8, 0, 0, 10, 5),
    ('avance_technologique', 'developpement', 9, 0, 12, 4, 0)
  ) as t(id, famille, ordre, cout_industrie, cout_techno, cout_culture, cout_commerce);
$$;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.votes_developpement (
  id uuid primary key default gen_random_uuid(),
  joueur_id uuid not null references public.users (id) on delete cascade,
  country_id text not null references public.countries (id),
  developpement text not null,
  semaine date not null,
  created_at timestamptz not null default now(),
  unique (joueur_id, semaine)
);

create index votes_developpement_pays_semaine on public.votes_developpement (country_id, semaine);

alter table public.votes_developpement enable row level security;

create policy "votes_developpement_lecture_propre"
  on public.votes_developpement for select
  using (auth.uid() = joueur_id);

-- Une ligne par pays et par semaine de vote CLÔTURÉE ayant reçu au moins un vote : le gagnant, son
-- nombre de voix, et s'il a été financé.
create table public.resultats_developpement (
  country_id text not null references public.countries (id),
  semaine date not null,
  developpement text not null,
  nb_votes integer not null,
  nb_votants integer not null,
  finance boolean not null,
  resolved_at timestamptz not null default now(),
  primary key (country_id, semaine)
);

alter table public.resultats_developpement enable row level security;

create policy "resultats_developpement_lecture_publique"
  on public.resultats_developpement for select
  using (true);

-- Les acquis : ne s'effacent jamais. `cout` = ce qui a été payé, instantané (jsonb à 4 clés).
create table public.developpements_pays (
  country_id text not null references public.countries (id),
  developpement text not null,
  semaine_vote date not null,
  debloque_le timestamptz not null default now(),
  cout jsonb not null,
  primary key (country_id, developpement)
);

alter table public.developpements_pays enable row level security;

create policy "developpements_pays_lecture_publique"
  on public.developpements_pays for select
  using (true);

-- Aucune policy insert/update/delete : tout passe par les fonctions ci-dessous.

-- ---------------------------------------------------------------------
-- a_developpement : le pays a-t-il ce développement ? Avec un jour, en vigueur ce jour-là (à partir
-- du lundi qui suit la semaine du vote) ; sans jour, acquis tout court.
-- ---------------------------------------------------------------------
create or replace function public.a_developpement(p_country_id text, p_developpement text, p_jour date default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.developpements_pays dp
    where dp.country_id = p_country_id
      and dp.developpement = p_developpement
      and (p_jour is null or dp.semaine_vote + 7 <= p_jour)
  );
$$;

-- ---------------------------------------------------------------------
-- stock_pays : par catégorie, la production (votes de ressource accumulés), ce qui a été dépensé en
-- développements, et le stock disponible.
-- ---------------------------------------------------------------------
create or replace function public.stock_pays(p_country_id text)
returns table (categorie text, production bigint, depense bigint, stock bigint)
language sql
stable
security definer
set search_path = public
as $$
  with prod as (
    select * from public.production_pays(p_country_id)
  ),
  dep as (
    select p.categorie as cat, p.total as produit,
           coalesce((select sum((dp.cout ->> p.categorie)::bigint)
                       from public.developpements_pays dp
                      where dp.country_id = p_country_id), 0)::bigint as depense
    from prod p
  )
  select d.cat, d.produit, d.depense, d.produit - d.depense
  from dep d
  order by array_position(array['industrie', 'techno', 'culture', 'commerce'], d.cat);
$$;

-- ---------------------------------------------------------------------
-- options_developpement : les développements proposés au vote d'un pays pour une semaine (la semaine
-- courante par défaut), un par famille. Calculée à partir de ce qui est CLÔTURÉ avant cette semaine :
-- il faut donc avoir appelé resoudre_developpement_pays() avant de la lire (voter_developpement() et
-- /pays le font).
-- ---------------------------------------------------------------------
create or replace function public.options_developpement(p_country_id text, p_semaine date default null)
returns table (developpement text, famille text, report boolean)
language sql
stable
security definer
set search_path = public
as $$
  with sem as (
    select public.semaine_iso(p_semaine) as s
  ),
  acquis as (
    select dp.developpement as dev
    from public.developpements_pays dp, sem
    where dp.country_id = p_country_id and dp.semaine_vote < sem.s
  ),
  precedent as (
    -- Le gagnant de la dernière semaine clôturée avant celle-ci, s'il n'a pas pu être financé.
    select r.developpement as dev
    from public.resultats_developpement r, sem
    where r.country_id = p_country_id and r.semaine < sem.s and not r.finance
      and r.semaine = (
        select max(r2.semaine) from public.resultats_developpement r2
        where r2.country_id = p_country_id and r2.semaine < sem.s
      )
  ),
  reportes as (
    select c.famille as fam, c.id as dev
    from public.developpements_catalogue() c
    join precedent pr on pr.dev = c.id
    where not exists (select 1 from acquis a where a.dev = c.id)
  ),
  candidats as (
    select c.famille as fam, c.id as dev,
           row_number() over (partition by c.famille order by md5(p_country_id || sem.s::text || c.id)) as rn
    from public.developpements_catalogue() c, sem
    where not exists (select 1 from acquis a where a.dev = c.id)
  )
  select coalesce(rp.dev, ca.dev), f.fam, (rp.dev is not null)
  from (values ('attaque'), ('defense'), ('developpement')) as f(fam)
  left join reportes rp on rp.fam = f.fam
  left join candidats ca on ca.fam = f.fam and ca.rn = 1
  where coalesce(rp.dev, ca.dev) is not null
  order by array_position(array['attaque', 'defense', 'developpement'], f.fam);
$$;

-- ---------------------------------------------------------------------
-- resoudre_developpement_pays : clôture les semaines de vote passées d'un pays, dans l'ordre.
-- Idempotente (une ligne de résultat par semaine) et sans double dépense possible entre deux
-- lectures simultanées : le résultat est inséré d'abord (`on conflict do nothing`), et seul celui
-- qui l'a inséré débloque.
-- ---------------------------------------------------------------------
create or replace function public.resoudre_developpement_pays(p_country_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_semaine record;
  v_gagnant record;
  v_dev record;
  v_nb_votants integer;
  v_finance boolean;
begin
  for v_semaine in
    select distinct v.semaine
    from public.votes_developpement v
    where v.country_id = p_country_id
      and v.semaine < public.semaine_iso()
      and not exists (
        select 1 from public.resultats_developpement r
        where r.country_id = v.country_id and r.semaine = v.semaine
      )
    order by v.semaine
  loop
    -- Le plus voté ; égalité : l'ordre du catalogue.
    select v.developpement as dev, count(*)::integer as n into v_gagnant
      from public.votes_developpement v
      join public.developpements_catalogue() c on c.id = v.developpement
      where v.country_id = p_country_id and v.semaine = v_semaine.semaine
      group by v.developpement, c.ordre
      order by count(*) desc, c.ordre
      limit 1;

    select count(*)::integer into v_nb_votants
      from public.votes_developpement v
      where v.country_id = p_country_id and v.semaine = v_semaine.semaine;

    select * into v_dev from public.developpements_catalogue() where id = v_gagnant.dev;

    -- Déjà acquis (ne devrait pas arriver : les options excluent les acquis) : rien à payer.
    if exists (
      select 1 from public.developpements_pays
      where country_id = p_country_id and developpement = v_gagnant.dev
    ) then
      v_finance := true;
    else
      -- Stock à la fin de la semaine du vote : production jusqu'à cette semaine incluse, moins ce
      -- qui a déjà été dépensé ; chaque catégorie doit couvrir son coût.
      select not exists (
        select 1
        from public.production_pays(p_country_id, v_semaine.semaine) p
        where p.total
              - coalesce((select sum((dp.cout ->> p.categorie)::bigint)
                            from public.developpements_pays dp
                           where dp.country_id = p_country_id), 0)
              < case p.categorie
                  when 'industrie' then v_dev.cout_industrie
                  when 'techno' then v_dev.cout_techno
                  when 'culture' then v_dev.cout_culture
                  else v_dev.cout_commerce
                end
      ) into v_finance;
    end if;

    insert into public.resultats_developpement (country_id, semaine, developpement, nb_votes, nb_votants, finance)
      values (p_country_id, v_semaine.semaine, v_gagnant.dev, v_gagnant.n, v_nb_votants, v_finance)
      on conflict do nothing;

    if found and v_finance then
      insert into public.developpements_pays (country_id, developpement, semaine_vote, cout)
        values (
          p_country_id, v_gagnant.dev, v_semaine.semaine,
          jsonb_build_object(
            'industrie', v_dev.cout_industrie,
            'techno', v_dev.cout_techno,
            'culture', v_dev.cout_culture,
            'commerce', v_dev.cout_commerce
          )
        )
        on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- voter_developpement : un vote par joueur et par semaine, pour l'un des développements proposés à
-- SON pays cette semaine. Le pays vient du profil, jamais du client.
-- ---------------------------------------------------------------------
create or replace function public.voter_developpement(p_joueur_id uuid, p_developpement text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_country_id text;
  v_semaine date := public.semaine_iso();
begin
  if auth.uid() is not null and auth.uid() <> p_joueur_id then
    raise exception 'voter_developpement: utilisateur non autorisé' using errcode = 'P0007';
  end if;

  select country_id into v_country_id from public.users where id = p_joueur_id;
  if v_country_id is null then
    raise exception 'voter_developpement: profil introuvable' using errcode = 'P0004';
  end if;

  -- Les options de cette semaine dépendent des semaines clôturées : on clôt d'abord.
  perform public.resoudre_developpement_pays(v_country_id);

  if not exists (
    select 1 from public.options_developpement(v_country_id, v_semaine) o where o.developpement = p_developpement
  ) then
    raise exception 'voter_developpement: développement inconnu ou pas proposé cette semaine : %', p_developpement
      using errcode = 'P0034';
  end if;

  -- Lève une erreur unique_violation (23505) si déjà voté cette semaine.
  insert into public.votes_developpement (joueur_id, country_id, developpement, semaine)
  values (p_joueur_id, v_country_id, p_developpement, v_semaine);
end;
$$;

-- ---------------------------------------------------------------------
-- resultats_vote_developpement : les options de la semaine avec leur nombre de voix.
-- ---------------------------------------------------------------------
create or replace function public.resultats_vote_developpement(p_country_id text, p_semaine date default null)
returns table (developpement text, famille text, report boolean, nb_votes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select o.developpement, o.famille, o.report,
         (select count(*)::bigint from public.votes_developpement v
           where v.country_id = p_country_id and v.semaine = public.semaine_iso(p_semaine)
             and v.developpement = o.developpement)
  from public.options_developpement(p_country_id, p_semaine) o
  order by array_position(array['attaque', 'defense', 'developpement'], o.famille);
$$;

-- ---------------------------------------------------------------------
-- effort_national_cible : Service de renseignement — l'effort national d'un autre pays, visible
-- seulement pour un pays qui a ce développement (null sinon).
-- ---------------------------------------------------------------------
create or replace function public.effort_national_cible(p_country_id text, p_cible_id text)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.a_developpement(p_country_id, 'service_renseignement') then public.effort_national(p_cible_id)
    else null
  end;
$$;

-- ---------------------------------------------------------------------
-- Les réglages de jeu, redéfinis pour ajouter les développements aux n°1 du §47 (même signature,
-- même type de retour que la migration 0052). Ceux que lisent des fonctions lourdes (croissance,
-- seuils, guerre, AntiVille) commencent par clôturer les votes en attente de leur pays : ils sont
-- donc `volatile` (plpgsql), alors que les lectures de classement restent `stable`.
-- ---------------------------------------------------------------------

-- Croissance : Commerce n°1 (+10 %) et Expansion urbaine (+10 %), cumulables.
create or replace function public.bonus_croissance_pays(p_country_id text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.resoudre_developpement_pays(p_country_id);
  return (case when public.pays_est_premier(p_country_id, 'commerce') then 0.10 else 0 end
        + case when public.a_developpement(p_country_id, 'expansion_urbaine') then 0.10 else 0 end)::numeric;
end;
$$;

-- Seuils d'influence : Technologie n°1 (−10 %) et Avance technologique (−10 %), cumulables.
create or replace function public.reduction_seuil_pays(p_country_id text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.resoudre_developpement_pays(p_country_id);
  return (case when public.pays_est_premier(p_country_id, 'techno') then 0.10 else 0 end
        + case when public.a_developpement(p_country_id, 'avance_technologique') then 0.10 else 0 end)::numeric;
end;
$$;

-- Poids de l'avis d'un citoyen du pays sur une décision qui le vise (0053). 0 = pas de voix au
-- chapitre : il faut être n°1 en Culture ou avoir le Rayonnement diplomatique ; le poids est alors
-- 1 (avis ordinaire) + 1 pour la Culture n°1 + 0,5 pour le Rayonnement : 2, 1,5 ou 2,5.
create or replace function public.poids_voix_diplomatique_pays(p_country_id text, p_semaine date default null)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.pays_est_premier(p_country_id, 'culture', public.semaine_iso(p_semaine))
      or public.a_developpement(p_country_id, 'rayonnement_diplomatique', public.semaine_iso(p_semaine) + 6)
    then 1
      + case when public.pays_est_premier(p_country_id, 'culture', public.semaine_iso(p_semaine)) then 1 else 0 end
      + case when public.a_developpement(p_country_id, 'rayonnement_diplomatique', public.semaine_iso(p_semaine) + 6) then 0.5 else 0 end
    else 0
  end::numeric;
$$;

-- Effort national d'un camp pour un jour de conflit : 1 + Industrie n°1 (+15 %) + Arsenal national
-- (+20 %, seulement en attaque), × 2 le premier jour d'un conflit pour un attaquant qui a la
-- Mobilisation éclair.
create or replace function public.multiplicateur_effort_pays(
  p_country_id text,
  p_role text,
  p_jour date,
  p_premier_jour boolean
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_multiplicateur numeric;
begin
  perform public.resoudre_developpement_pays(p_country_id);
  v_multiplicateur := 1 + public.bonus_effort_guerre_pays(p_country_id, p_jour);
  if p_role = 'attaquant' then
    if public.a_developpement(p_country_id, 'arsenal_national', p_jour) then
      v_multiplicateur := v_multiplicateur + 0.20;
    end if;
    if p_premier_jour and public.a_developpement(p_country_id, 'mobilisation_eclair', p_jour) then
      v_multiplicateur := v_multiplicateur * 2;
    end if;
  end if;
  return v_multiplicateur;
end;
$$;

-- Bonus défensif : 1,5 (Jalon 13), 1,75 avec les Fortifications.
create or replace function public.multiplicateur_defensif_pays(p_country_id text, p_jour date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case when public.a_developpement(p_country_id, 'fortifications', p_jour) then 1.75 else 1.5 end::numeric;
$$;

-- Pertes de population quotidiennes de la guerre : ×0,5 avec le Bouclier civil.
create or replace function public.facteur_pertes_guerre_pays(p_country_id text, p_jour date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case when public.a_developpement(p_country_id, 'bouclier_civil', p_jour) then 0.5 else 1 end::numeric;
$$;

-- Attaques AntiVille subies par les villes du pays : ×0,75 avec la Résistance à la propagande.
create or replace function public.facteur_antiville_pays(p_country_id text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.resoudre_developpement_pays(p_country_id);
  return (case when public.a_developpement(p_country_id, 'resistance_propagande') then 0.75 else 1 end)::numeric;
end;
$$;

-- ---------------------------------------------------------------------
-- lancer_action_antiville : recopiée À L'IDENTIQUE de la migration 0045 (même signature, même type
-- de retour), aux lignes marquées A-INTEGRER §48 près : le multiplicateur de défense de la ville
-- visée est multiplié par facteur_antiville_pays() de SON pays.
-- ---------------------------------------------------------------------
create or replace function public.lancer_action_antiville(
  p_attaquant_id uuid,
  p_ville_id uuid,
  p_type_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_population_avant integer;
  v_influence_avant integer;
  v_niveau integer;
  v_pays_victime text; -- A-INTEGRER §48
  v_jour date := (now() at time zone 'utc')::date;
  v_nb_aujourdhui integer;
  v_derniere_action timestamptz;
  v_activite_defense text;
  v_jauge_defense numeric;
  v_multiplicateur_defense numeric;
  v_perte integer;
  v_perte_existante numeric;
  v_plafond integer;
  v_duree_heures numeric;
  v_nb_greve_aujourdhui integer;
  v_attaquant_ville_id uuid;
  v_ville public.cities;
  v_visite_annulee boolean := false;
  v_visite_id uuid;
  v_gain_visite integer;
begin
  if p_type_action not in ('greve', 'contamination', 'propagande') then
    raise exception 'lancer_action_antiville: type d''action invalide : %', p_type_action
      using errcode = 'P0006';
  end if;

  if auth.uid() is not null and auth.uid() <> p_attaquant_id then
    raise exception 'lancer_action_antiville: utilisateur non autorisé' using errcode = 'P0007';
  end if;

  select c.owner_id, c.population, c.influence, public.population_vers_niveau(c.population_max), c.country_id
    into v_owner_id, v_population_avant, v_influence_avant, v_niveau, v_pays_victime
    from public.cities c where c.id = p_ville_id;
  if v_owner_id is null then
    raise exception 'lancer_action_antiville: ville introuvable' using errcode = 'P0004';
  end if;
  if v_owner_id = p_attaquant_id then
    raise exception 'lancer_action_antiville: impossible de s''attaquer soi-même'
      using errcode = 'P0005';
  end if;

  select count(*) into v_nb_aujourdhui
    from public.actions_antiville
    where attaquant_id = p_attaquant_id and jour = v_jour;

  if v_nb_aujourdhui >= 3 then
    raise exception 'lancer_action_antiville: quota quotidien d''actions AntiVille atteint (3)'
      using errcode = 'P0001';
  end if;

  select max(created_at) into v_derniere_action
    from public.actions_antiville
    where attaquant_id = p_attaquant_id;

  if v_derniere_action is not null and v_derniere_action > now() - interval '2 seconds' then
    raise exception 'lancer_action_antiville: actions trop rapprochées' using errcode = 'P0020';
  end if;

  -- A-INTEGRER §34 (demande d'Adrien, 02/10/2026) : ouvrir la page d'une ville pour
  -- l'attaquer ne doit pas compter comme une visite (action de soutien). La visite
  -- automatique se déclenche au bout de quelques secondes ; si l'attaquant a visité
  -- cette ville dans la dernière minute, cette visite est annulée : ligne supprimée
  -- (donc quota du jour et délai d'une heure rendus, activité retirée des jauges) et
  -- gain d'habitants repris. population_max, un record qui ne décroît jamais, ne bouge pas.
  select v.id, v.gain into v_visite_id, v_gain_visite
    from public.visites v
    where v.visiteur_id = p_attaquant_id and v.ville_id = p_ville_id
      and v.created_at >= now() - interval '1 minute'
    order by v.created_at desc
    limit 1;
  if v_visite_id is not null then
    delete from public.visites where id = v_visite_id;
    update public.cities set population = greatest(population - coalesce(v_gain_visite, 0), 1)
      where id = p_ville_id;
    select population into v_population_avant from public.cities where id = p_ville_id;
    v_visite_annulee := true;
  end if;

  v_activite_defense := public.activite_protectrice(p_type_action);
  v_jauge_defense := public.jauge_activite(p_ville_id, v_activite_defense);
  v_multiplicateur_defense := 1 - 0.5 * public.intensite_point_fort(v_jauge_defense)
                                 + 0.5 * public.intensite_crise(v_jauge_defense);
  -- A-INTEGRER §48 : Résistance à la propagande (×0,75 sur toutes les attaques subies par le pays).
  v_multiplicateur_defense := v_multiplicateur_defense * public.facteur_antiville_pays(v_pays_victime);

  if p_type_action = 'contamination' then
    v_perte := greatest(1, round(v_population_avant * 0.0001 * v_multiplicateur_defense));
    if public.nb_megaprojets_construits(p_ville_id, array['hopital']) > 0 then
      v_perte := greatest(1, round(v_perte * 0.5));
    end if;
    select coalesce(sum(montant), 0) into v_perte_existante
      from public.actions_antiville
      where ville_id = p_ville_id and type_action = 'contamination' and jour = v_jour;
    v_plafond := greatest(1, ceil(v_population_avant * 0.10));
    v_perte := greatest(0, least(v_perte, v_plafond - v_perte_existante::integer));

  elsif p_type_action = 'propagande' then
    v_perte := greatest(1, round(v_influence_avant * 0.001 * v_multiplicateur_defense));
    if public.nb_megaprojets_construits(p_ville_id, array['opera']) > 0 then
      v_perte := greatest(1, round(v_perte * 0.5));
    end if;
    select coalesce(sum(montant), 0) into v_perte_existante
      from public.actions_antiville
      where ville_id = p_ville_id and type_action = 'propagande' and jour = v_jour;
    v_plafond := greatest(1, ceil(v_influence_avant * 0.10));
    v_perte := greatest(0, least(v_perte, v_plafond - v_perte_existante::integer));

  else -- greve
    select count(*) into v_nb_greve_aujourdhui
      from public.actions_antiville
      where ville_id = p_ville_id and type_action = 'greve' and jour = v_jour;
    v_duree_heures := public.duree_blocage_greve_heures(v_nb_greve_aujourdhui + 1, v_niveau) * v_multiplicateur_defense;
  end if;

  insert into public.actions_antiville (attaquant_id, ville_id, type_action, montant, duree_heures)
  values (
    p_attaquant_id, p_ville_id, p_type_action,
    case when p_type_action in ('contamination', 'propagande') then v_perte else null end,
    case when p_type_action = 'greve' then v_duree_heures else null end
  );

  if p_type_action = 'contamination' then
    update public.cities
      set population = greatest(population - v_perte, 1)
      where id = p_ville_id
      returning * into v_ville;

  elsif p_type_action = 'propagande' then
    update public.cities
      set influence = greatest(influence - v_perte, 0)
      -- influence_max ne bouge pas ici : une perte ne peut jamais
      -- augmenter le record, greatest(influence_max, ...) serait un
      -- no-op — inutile de l'écrire.
      where id = p_ville_id
      returning * into v_ville;

  else -- greve
    update public.cities
      set greve_jusqua = now() + (v_duree_heures::text || ' hours')::interval
      where id = p_ville_id
      returning * into v_ville;
  end if;

  select city_id into v_attaquant_ville_id from public.users where id = p_attaquant_id;
  insert into public.city_events (ville_id, type, activite, type_action, valeur, attaquant_ville_id, jour)
    values (
      p_ville_id, 'attaque_recue', v_activite_defense, p_type_action,
      case when p_type_action = 'greve' then v_duree_heures else v_perte end,
      v_attaquant_ville_id, v_jour
    );

  return jsonb_build_object(
    'ville', to_jsonb(v_ville),
    'palier', public.palier_attaques(public.attaques_recues_aujourdhui(p_ville_id)),
    'perte', v_perte,
    'duree_heures', v_duree_heures,
    'visite_annulee', v_visite_annulee
  );
end;
$$;

-- ---------------------------------------------------------------------
-- historique_pays : étendue (drop puis create, le type de retour change) avec, pour chaque semaine
-- passée, le développement voté (et s'il a été financé) et les catégories où le pays était n°1
-- mondial. Recopiée de la migration 0046, aux ajouts A-INTEGRER §47/§48 près.
-- ---------------------------------------------------------------------
drop function if exists public.historique_pays(text, integer);

create function public.historique_pays(
  p_country_id text,
  p_nb_semaines integer default 12
)
returns table (
  semaine date,
  vote_categorie text,
  vote_nb bigint,
  decision_categorie text,
  decision_cible text,
  decision_adoptee boolean,
  decision_pour bigint,
  decision_contre bigint,
  conflit_id uuid,
  conflit_role text,
  conflit_adversaire text,
  conflit_statut text,
  conflit_resultat text,
  pertes_pays bigint,
  pertes_adversaire bigint,
  president_ville_id uuid,
  president_ville_nom text,
  developpement text,
  developpement_nb bigint,
  developpement_finance boolean,
  premier_de text[]
)
language sql
stable
security definer
set search_path = public
as $$
  with courante as (
    select date_trunc('week', now() at time zone 'utc')::date as s
  ),
  votes as (
    select v.semaine, v.categorie, count(*)::bigint as n
    from public.votes_pays v, courante c
    where v.country_id = p_country_id and v.semaine < c.s
    group by v.semaine, v.categorie
  ),
  vote_gagnant as (
    select distinct on (semaine) semaine, categorie, n
    from votes
    order by semaine, n desc,
      array_position(array['industrie', 'techno', 'culture', 'commerce'], categorie)
  ),
  decisions as (
    select p.semaine, r.categorie, r.pays_cible_id, r.adoptee, r.nb_pour, r.nb_contre
    from public.propositions_diplomatiques p
    join public.resultats_diplomatiques r on r.proposition_id = p.id
    cross join courante c
    where p.country_id = p_country_id and p.semaine < c.s
  ),
  conflits_pays as (
    select
      date_trunc('week', k.debut at time zone 'utc')::date as semaine,
      k.id, k.statut, k.resultat,
      case when k.pays_attaquant_id = p_country_id then 'attaquant' else 'defenseur' end as role,
      case when k.pays_attaquant_id = p_country_id then k.pays_defenseur_id else k.pays_attaquant_id end as adversaire,
      coalesce((
        select sum(e.valeur)::bigint
        from public.city_events e join public.cities ci on ci.id = e.ville_id
        where e.conflit_id = k.id and ci.country_id = p_country_id
      ), 0) as pertes_pays,
      coalesce((
        select sum(e.valeur)::bigint
        from public.city_events e join public.cities ci on ci.id = e.ville_id
        where e.conflit_id = k.id and ci.country_id <> p_country_id
      ), 0) as pertes_adversaire
    from public.conflits k, courante c
    where (k.pays_attaquant_id = p_country_id or k.pays_defenseur_id = p_country_id)
      and date_trunc('week', k.debut at time zone 'utc')::date < c.s
  ),
  presidence as (
    select ps.semaine, ps.ville_id, ci.nom
    from public.presidents_semaine ps
    join public.cities ci on ci.id = ps.ville_id
    cross join courante c
    where ps.country_id = p_country_id and ps.semaine < c.s
  ),
  developpements as (
    select r.semaine, r.developpement, r.nb_votes::bigint as n, r.finance
    from public.resultats_developpement r
    cross join courante c
    where r.country_id = p_country_id and r.semaine < c.s
  ),
  semaines as (
    select semaine from vote_gagnant
    union select semaine from decisions
    union select semaine from conflits_pays
    union select semaine from presidence
    union select semaine from developpements
  )
  select
    s.semaine,
    vg.categorie, vg.n,
    d.categorie, d.pays_cible_id, d.adoptee, d.nb_pour, d.nb_contre,
    k.id, k.role, k.adversaire, k.statut, k.resultat, k.pertes_pays, k.pertes_adversaire,
    pr.ville_id, pr.nom,
    dv.developpement, dv.n, dv.finance,
    (select array_agg(cl.categorie order by array_position(array['industrie', 'techno', 'culture', 'commerce'], cl.categorie))
       from public.classement_pays(s.semaine) cl
      where cl.country_id = p_country_id and cl.rang = 1)
  from semaines s
  left join presidence pr on pr.semaine = s.semaine
  left join vote_gagnant vg on vg.semaine = s.semaine
  left join decisions d on d.semaine = s.semaine
  left join conflits_pays k on k.semaine = s.semaine
  left join developpements dv on dv.semaine = s.semaine
  order by s.semaine desc, k.id
  limit greatest(1, p_nb_semaines);
$$;
