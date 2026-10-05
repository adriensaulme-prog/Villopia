-- Avis des pays visés par une décision diplomatique (docs/A-INTEGRER.md §47 « Culture n°1 » et §48
-- « Rayonnement diplomatique »).
--
-- LE PROBLÈME DU TEXTE. §47 : « Culture n°1 : son vote (pour ou contre) pèse double dans les
-- décisions diplomatiques des AUTRES pays qui le concernent ». §48 : « Rayonnement diplomatique (le
-- vote de ce pays pèse plus dans les décisions diplomatiques des autres pays) ». Or, dans le code
-- (migrations 0015/0016), une décision diplomatique n'est votée QUE par les citoyens du pays qui la
-- propose : le pays visé n'a aucun vote. « Le vote de ce pays » dans la décision d'un autre pays
-- n'existe donc pas, et doubler le poids des citoyens d'un pays dans SA PROPRE décision ne change
-- rien (la majorité pour/contre est la même si tous les votes valent 2).
--
-- INTERPRÉTATION RETENUE (Claude Code, à valider par Adrien — voir DECISIONS.md §10) : le pays
-- visé obtient une voix, mais seulement s'il a de l'influence culturelle — c'est ce que les deux
-- bonus récompensent. Un citoyen d'un pays qui a « voix au chapitre » peut donner un AVIS (pour ou
-- contre) sur une décision proposée par un autre pays et qui le vise, pendant la semaine du vote.
-- Chaque avis pèse le poids du pays (poids_voix_diplomatique_pays() : 2 pour Culture n°1, 1,5 avec
-- le développement Rayonnement diplomatique, 2,5 avec les deux ; migration 0054) et s'ajoute au
-- décompte des citoyens du pays proposant (un citoyen = 1) à la clôture :
--
--     adoptée  si  (pour + avis pour pondérés)  >  (contre + avis contre pondérés)
--
-- Sans avis, la règle est celle d'avant (pour > contre) : aucun changement de comportement tant
-- qu'aucun pays n'a de voix. Un pays sans influence culturelle n'a PAS de voix : la mécanique
-- n'impose rien à tout le monde (elle ne crée pas un vote de la cible pour tous les pays, qui
-- changerait l'équilibre de la diplomatie bien au-delà de ce que demandent les §47/§48).
--
-- Le poids est figé au moment de l'avis (colonne `poids`) : perdre la 1ère place la semaine
-- suivante ne retire pas un avis déjà donné, et la clôture ne dépend pas du moment où on la lit.
-- Un avis par joueur et par proposition (un joueur peut donc avoir un avis sur chaque décision qui
-- vise son pays, contrairement au vote du pays proposant, limité à un par semaine).
--
-- Codes d'erreur nouveaux : P0031 (la décision ne vise pas le pays du joueur), P0032 (proposition
-- introuvable ou d'une autre semaine), P0033 (le pays n'a pas voix au chapitre). Position invalide :
-- P0014 (déjà utilisé pour la catégorie et la position diplomatiques).
--
-- resultat_decision_semaine() (Jalon 13) n'est PAS modifiée : les avis ont leur propre fonction
-- (avis_decision_semaine), pour ne pas changer ses colonnes de retour dont /pays et les tests
-- dépendent.

alter table public.resultats_diplomatiques
  add column avis_pour numeric not null default 0,
  add column avis_contre numeric not null default 0;

create table public.avis_diplomatie (
  id uuid primary key default gen_random_uuid(),
  joueur_id uuid not null references public.users (id) on delete cascade,
  proposition_id uuid not null references public.propositions_diplomatiques (id) on delete cascade,
  country_id text not null references public.countries (id),
  position text not null check (position in ('pour', 'contre')),
  poids numeric(4, 2) not null check (poids > 0),
  created_at timestamptz not null default now(),
  unique (joueur_id, proposition_id)
);

alter table public.avis_diplomatie enable row level security;

create policy "avis_diplomatie_lecture_propre"
  on public.avis_diplomatie for select
  using (auth.uid() = joueur_id);

-- Aucune policy insert/update/delete : tout passe par donner_avis_decision().

-- ---------------------------------------------------------------------
-- donner_avis_decision : un citoyen du pays VISÉ donne son avis sur une décision d'un autre pays,
-- pendant sa semaine. Le pays n'est jamais reçu du client : il vient du profil du joueur.
-- ---------------------------------------------------------------------
create or replace function public.donner_avis_decision(
  p_joueur_id uuid,
  p_proposition_id uuid,
  p_position text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_country_id text;
  v_proposition public.propositions_diplomatiques;
  v_poids numeric;
begin
  if p_position not in ('pour', 'contre') then
    raise exception 'donner_avis_decision: position invalide : %', p_position
      using errcode = 'P0014';
  end if;

  if auth.uid() is not null and auth.uid() <> p_joueur_id then
    raise exception 'donner_avis_decision: utilisateur non autorisé' using errcode = 'P0007';
  end if;

  select country_id into v_country_id from public.users where id = p_joueur_id;
  if v_country_id is null then
    raise exception 'donner_avis_decision: profil introuvable' using errcode = 'P0004';
  end if;

  select * into v_proposition from public.propositions_diplomatiques where id = p_proposition_id;
  if v_proposition.id is null or v_proposition.semaine <> public.semaine_iso() then
    raise exception 'donner_avis_decision: proposition introuvable ou pas de cette semaine'
      using errcode = 'P0032';
  end if;

  if v_proposition.pays_cible_id <> v_country_id then
    raise exception 'donner_avis_decision: cette décision ne vise pas ton pays' using errcode = 'P0031';
  end if;

  v_poids := public.poids_voix_diplomatique_pays(v_country_id, v_proposition.semaine);
  if v_poids <= 0 then
    raise exception 'donner_avis_decision: ton pays n''a pas voix au chapitre' using errcode = 'P0033';
  end if;

  -- Lève une erreur unique_violation (23505) si ce joueur a déjà donné son avis sur cette décision.
  insert into public.avis_diplomatie (joueur_id, proposition_id, country_id, position, poids)
  values (p_joueur_id, p_proposition_id, v_country_id, p_position, v_poids);
end;
$$;

-- ---------------------------------------------------------------------
-- avis_decision_semaine : avis pondérés (pour / contre) reçus par la proposition d'un pays pour une
-- semaine (la semaine courante par défaut). Toujours une ligne, à 0 s'il n'y en a pas.
-- ---------------------------------------------------------------------
create or replace function public.avis_decision_semaine(p_country_id text, p_semaine date default null)
returns table (avis_pour numeric, avis_contre numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(a.poids) filter (where a.position = 'pour'), 0)::numeric,
    coalesce(sum(a.poids) filter (where a.position = 'contre'), 0)::numeric
  from public.propositions_diplomatiques pd
  left join public.avis_diplomatie a on a.proposition_id = pd.id
  where pd.country_id = p_country_id and pd.semaine = public.semaine_iso(p_semaine);
$$;

-- ---------------------------------------------------------------------
-- decisions_visant_pays : les décisions des AUTRES pays qui visent ce pays pendant la semaine, avec
-- leur décompte actuel (citoyens du pays proposant) et les avis déjà reçus. Pour la section
-- « Décisions qui nous visent » de /pays.
-- ---------------------------------------------------------------------
create or replace function public.decisions_visant_pays(p_country_id text, p_semaine date default null)
returns table (
  proposition_id uuid,
  pays_proposant_id text,
  categorie text,
  nb_pour bigint,
  nb_contre bigint,
  avis_pour numeric,
  avis_contre numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pd.id,
    pd.country_id,
    pd.categorie,
    (select count(*)::bigint from public.votes_diplomatie v
       where v.country_id = pd.country_id and v.semaine = pd.semaine and v.position = 'pour'),
    (select count(*)::bigint from public.votes_diplomatie v
       where v.country_id = pd.country_id and v.semaine = pd.semaine and v.position = 'contre'),
    coalesce((select sum(a.poids) from public.avis_diplomatie a where a.proposition_id = pd.id and a.position = 'pour'), 0)::numeric,
    coalesce((select sum(a.poids) from public.avis_diplomatie a where a.proposition_id = pd.id and a.position = 'contre'), 0)::numeric
  from public.propositions_diplomatiques pd
  where pd.pays_cible_id = p_country_id and pd.semaine = public.semaine_iso(p_semaine)
  order by pd.created_at;
$$;

-- ---------------------------------------------------------------------
-- resoudre_decision_diplomatique : recopiée de la migration 0016 (même signature, même type de
-- retour), aux lignes marquées A-INTEGRER §47 près : les avis pondérés du pays visé s'ajoutent aux
-- votes des citoyens du pays proposant, et sont enregistrés avec le verdict.
-- ---------------------------------------------------------------------
create or replace function public.resoudre_decision_diplomatique(p_country_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_semaine_courante date := date_trunc('week', now() at time zone 'utc')::date;
  v_proposition record;
  v_pour bigint;
  v_contre bigint;
  v_avis_pour numeric; -- A-INTEGRER §47
  v_avis_contre numeric; -- A-INTEGRER §47
  v_adoptee boolean;
  v_ressources jsonb;
begin
  select * into v_proposition
    from public.propositions_diplomatiques
    where country_id = p_country_id and semaine < v_semaine_courante
    order by semaine desc
    limit 1;

  if v_proposition is null then
    return; -- rien à résoudre
  end if;

  if exists (select 1 from public.resultats_diplomatiques where proposition_id = v_proposition.id) then
    return; -- déjà résolue (idempotence)
  end if;

  select count(*) filter (where position = 'pour'), count(*) filter (where position = 'contre')
    into v_pour, v_contre
    from public.votes_diplomatie
    where country_id = p_country_id and semaine = v_proposition.semaine;

  -- A-INTEGRER §47 : avis pondérés du pays visé (zéro si son pays n'a pas voix au chapitre).
  select coalesce(sum(poids) filter (where position = 'pour'), 0),
         coalesce(sum(poids) filter (where position = 'contre'), 0)
    into v_avis_pour, v_avis_contre
    from public.avis_diplomatie
    where proposition_id = v_proposition.id;

  v_adoptee := (v_pour + v_avis_pour) > (v_contre + v_avis_contre); -- égalité ou 0-0 : non adoptée

  insert into public.resultats_diplomatiques
    (proposition_id, country_id, pays_cible_id, categorie, nb_pour, nb_contre, adoptee, avis_pour, avis_contre)
  values
    (v_proposition.id, p_country_id, v_proposition.pays_cible_id, v_proposition.categorie, v_pour, v_contre,
     v_adoptee, v_avis_pour, v_avis_contre);

  if v_adoptee and v_proposition.categorie = 'rivalite' then
    select jsonb_object_agg(categorie, total) into v_ressources
      from public.ressources_pays(p_country_id);

    insert into public.conflits (pays_attaquant_id, pays_defenseur_id, fin, cout_ressources)
    values (p_country_id, v_proposition.pays_cible_id, now() + interval '7 days', coalesce(v_ressources, '{}'::jsonb))
    on conflict do nothing; -- un conflit déjà en cours entre ces deux pays : pas de doublon
  end if;
end;
$$;
