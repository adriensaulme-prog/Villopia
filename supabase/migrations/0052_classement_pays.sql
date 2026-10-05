-- Classement hebdomadaire des pays + bonus au n°1 de chaque catégorie (docs/A-INTEGRER.md
-- §47, décision d'Adrien du 05/10/2026).
--
-- Constat de départ (DECISIONS.md §10 point 27) : les ressources nationales du Jalon 10
-- (Industrie / Technologie / Culture / Commerce, une ressource = un vote de ressource d'un
-- joueur du pays) n'avaient AUCUN effet de jeu, hormis leur total brut dans effort_national().
--
-- Décision d'Adrien : un classement mondial des pays, recalculé chaque semaine (lundi 00 h UTC,
-- comme le vote de ressource et la décision diplomatique), sur chacune des 4 catégories. Le n°1
-- d'une catégorie reçoit un effet jusqu'au recalcul suivant :
--
--     Industrie n°1   : +15 % d'effort national en guerre (attaquant comme défenseur)
--     Commerce n°1    : +10 % de chance d'un habitant de plus par visite, dans toutes ses villes
--     Technologie n°1 : seuils d'influence des monuments/mégaprojets réduits de 10 %
--     Culture n°1     : son avis pèse double dans les décisions diplomatiques qui le visent
--                       (la mécanique d'« avis » est la migration 0053)
--
-- Les chiffres (15 %, 10 %, 10 %, poids 2) sont laissés à Claude Code par le §47, « dans l'esprit
-- des effets comparables » : point fort du Commerce (+25 % au plafond) et du Résidentiel (+25 %)
-- pour la croissance, bonus défensif ×1,5 pour la guerre. Un n°1 hebdomadaire est un effet de
-- palier, pas un point fort qui se mérite par jauge : volontairement plus modeste (10 %, 15 %).
-- Chaque chiffre est écrit UNE fois, dans une petite fonction ci-dessous.
--
-- PAS DE NOUVELLE TABLE (§47). Le classement de la semaine S se calcule sur les ressources
-- ACCUMULÉES AVANT S, c'est-à-dire les votes de ressource dont la semaine est strictement
-- antérieure : tout ce qui se vote pendant la semaine S compte à partir de la semaine S+1. Le
-- classement est donc FIGÉ pour toute la semaine (aucun vote ne le déplace en cours de semaine),
-- identique quel que soit le moment où on le lit, et reproductible pour n'importe quelle semaine
-- passée, sans instantané à stocker (même principe que historique_pays(), migration 0036).
-- Conséquence assumée : la toute première semaine d'un monde neuf n'a pas de n°1 (rien n'est
-- encore accumulé), et un pays sans aucune ressource dans une catégorie n'y est jamais classé.
--
-- Mesure du classement (laissée ouverte, à contester) : le TOTAL accumulé par le pays, comme le
-- dit le §47 — pas une moyenne par ville ou par joueur. Risque connu : à total brut, un grand
-- pays (beaucoup de joueurs, donc beaucoup de votes) domine mécaniquement les quatre catégories,
-- exactement le défaut que le §24 a corrigé pour l'effort de guerre (passage à la moyenne). Pour
-- changer de mesure il suffit de redéfinir valeur_classement_pays() : tout le reste (rang, n°1,
-- bonus, affichage) la lit. Égalité de total : le code de pays le plus petit (ordre alphabétique)
-- passe devant, de façon stable.
--
-- BRANCHEMENTS (une seule recopie de chaque fonction existante, le reste passe par des petites
-- fonctions de réglage que la migration 0054 — développements nationaux, §48 — redéfinit sans
-- retoucher les grosses fonctions) :
--   * resoudre_conflits_en_cours() : effort multiplié par multiplicateur_effort_pays(), seuil
--     défensif par multiplicateur_defensif_pays(), pertes par facteur_pertes_guerre_pays().
--     Les trois valent 1 + bonus Industrie, 1,5 et 1 ici : AUCUN changement de comportement
--     tant qu'aucun pays n'est n°1 en Industrie. Le bonus est évalué pour la semaine de chaque
--     JOUR du conflit (la résolution est paresseuse : la lire plus tard ne change pas le verdict).
--   * visiter_ville() : une chance en plus de rapporter un habitant (bonus_croissance_pays()).
--   * avancer_monuments() : seuil effectif = plafond(seuil × (1 − réduction)).
-- Aucun nouveau code d'erreur.

-- ---------------------------------------------------------------------
-- semaine_iso : lundi (UTC) de la semaine ISO d'un jour (aujourd'hui par défaut). La même
-- convention que date_trunc('week', now() at time zone 'utc') partout ailleurs.
-- ---------------------------------------------------------------------
create or replace function public.semaine_iso(p_jour date default null)
returns date
language sql
stable
as $$
  select date_trunc('week', coalesce(p_jour, (now() at time zone 'utc')::date)::timestamp)::date;
$$;

-- ---------------------------------------------------------------------
-- production_pays : ressources accumulées par un pays dans chaque catégorie, jusqu'à la fin de
-- la semaine `p_jusqua` incluse (null = tout). Même compte que ressources_pays() (Jalon 10),
-- qui en est le cas « tout » ; elle sert de socle au classement et, en 0054, au stock dépensable.
-- ---------------------------------------------------------------------
create or replace function public.production_pays(p_country_id text, p_jusqua date default null)
returns table (categorie text, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  with categories as (
    select unnest(array['industrie', 'techno', 'culture', 'commerce']) as categorie
  ),
  comptes as (
    select v.categorie, count(*)::bigint as n
    from public.votes_pays v
    where v.country_id = p_country_id
      and (p_jusqua is null or v.semaine <= p_jusqua)
    group by v.categorie
  )
  select c.categorie, coalesce(cm.n, 0)
  from categories c
  left join comptes cm on cm.categorie = c.categorie
  order by array_position(array['industrie', 'techno', 'culture', 'commerce'], c.categorie);
$$;

-- ---------------------------------------------------------------------
-- valeur_classement_pays : la mesure qui classe les pays — le total accumulé AVANT la semaine
-- donnée. Un seul endroit à changer si Adrien préfère une moyenne par ville (voir l'en-tête).
-- ---------------------------------------------------------------------
create or replace function public.valeur_classement_pays(p_country_id text, p_categorie text, p_semaine date)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.votes_pays v
  where v.country_id = p_country_id
    and v.categorie = p_categorie
    and v.semaine < p_semaine;
$$;

-- ---------------------------------------------------------------------
-- classement_pays : le classement mondial d'une semaine (la semaine courante par défaut), un
-- rang par pays et par catégorie, du n°1 au dernier pays ayant au moins une ressource dans cette
-- catégorie. Calculé à la demande, comme classement_mondial() le fait pour les villes.
-- ---------------------------------------------------------------------
create or replace function public.classement_pays(p_semaine date default null)
returns table (categorie text, rang integer, country_id text, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  with semaine_cible as (
    select public.semaine_iso(p_semaine) as s
  ),
  totaux as (
    select v.categorie as cat, v.country_id as pays, count(*)::bigint as n
    from public.votes_pays v, semaine_cible sc
    where v.semaine < sc.s
    group by v.categorie, v.country_id
  )
  select
    t.cat,
    (row_number() over (partition by t.cat order by t.n desc, t.pays))::integer,
    t.pays,
    t.n
  from totaux t
  order by array_position(array['industrie', 'techno', 'culture', 'commerce'], t.cat), 2;
$$;

-- ---------------------------------------------------------------------
-- pays_est_premier : ce pays est-il le n°1 mondial de cette catégorie pour la semaine ?
-- ---------------------------------------------------------------------
create or replace function public.pays_est_premier(p_country_id text, p_categorie text, p_semaine date default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.classement_pays(p_semaine) cl
    where cl.categorie = p_categorie and cl.country_id = p_country_id and cl.rang = 1
  );
$$;

-- ---------------------------------------------------------------------
-- classement_pays_vue : pour l'affichage de /pays — une ligne par catégorie : le rang et le total
-- du pays consulté (rang nul s'il n'a encore aucune ressource dans la catégorie), le nombre de
-- pays classés, et le n°1 avec son total.
-- ---------------------------------------------------------------------
create or replace function public.classement_pays_vue(p_country_id text, p_semaine date default null)
returns table (
  categorie text,
  rang integer,
  total bigint,
  nb_pays integer,
  premier_country_id text,
  premier_total bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with cl as (
    select * from public.classement_pays(p_semaine)
  ),
  categories as (
    select unnest(array['industrie', 'techno', 'culture', 'commerce']) as cat
  )
  select
    c.cat,
    (select x.rang from cl x where x.categorie = c.cat and x.country_id = p_country_id),
    coalesce((select x.total from cl x where x.categorie = c.cat and x.country_id = p_country_id), 0)::bigint,
    (select count(*)::integer from cl x where x.categorie = c.cat),
    (select x.country_id from cl x where x.categorie = c.cat and x.rang = 1),
    (select x.total from cl x where x.categorie = c.cat and x.rang = 1)
  from categories c
  order by array_position(array['industrie', 'techno', 'culture', 'commerce'], c.cat);
$$;

-- ---------------------------------------------------------------------
-- Les quatre effets du §47. Chacun lit le classement de la semaine du jour demandé (la semaine
-- courante par défaut). La migration 0054 les redéfinit pour y ajouter les développements
-- nationaux du §48 (même signature, même type de retour).
-- ---------------------------------------------------------------------

-- Industrie n°1 : part ajoutée à l'effort national en guerre (0,15 = +15 %).
create or replace function public.bonus_effort_guerre_pays(p_country_id text, p_jour date default null)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.pays_est_premier(p_country_id, 'industrie', public.semaine_iso(p_jour)) then 0.15
    else 0
  end::numeric;
$$;

-- Commerce n°1 : chance (0 à 1) qu'une visite rapporte un habitant de plus dans toutes les villes
-- du pays (0,10 = +10 %).
create or replace function public.bonus_croissance_pays(p_country_id text)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.pays_est_premier(p_country_id, 'commerce') then 0.10
    else 0
  end::numeric;
$$;

-- Technologie n°1 : part retirée du seuil d'influence des monuments et mégaprojets (0,10 = −10 %).
create or replace function public.reduction_seuil_pays(p_country_id text)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.pays_est_premier(p_country_id, 'techno') then 0.10
    else 0
  end::numeric;
$$;

-- Culture n°1 : poids de l'avis d'un citoyen du pays sur une décision diplomatique qui le vise.
-- 0 = le pays n'a pas voix au chapitre (il ne peut pas donner d'avis, migration 0053) ; 1 serait
-- un avis ordinaire ; 2 = avis qui pèse double (Culture n°1).
create or replace function public.poids_voix_diplomatique_pays(p_country_id text, p_semaine date default null)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.pays_est_premier(p_country_id, 'culture', public.semaine_iso(p_semaine)) then 2
    else 0
  end::numeric;
$$;

-- ---------------------------------------------------------------------
-- Réglages de la guerre. Valeurs de base inchangées (effort × 1 + bonus Industrie, défenseur
-- ×1,5, pertes ×1) : le §48 (migration 0054) les enrichit sans retoucher la résolution.
-- ---------------------------------------------------------------------

-- Multiplicateur de l'effort national d'un camp pour un jour de conflit.
create or replace function public.multiplicateur_effort_pays(
  p_country_id text,
  p_role text,
  p_jour date,
  p_premier_jour boolean
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select 1 + public.bonus_effort_guerre_pays(p_country_id, p_jour);
$$;

-- Bonus défensif : le défenseur gagne la journée sauf si l'attaquant dépasse son effort de ce
-- facteur (1,5 = 50 %, valeur du Jalon 13).
create or replace function public.multiplicateur_defensif_pays(p_country_id text, p_jour date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select 1.5::numeric;
$$;

-- Facteur sur les pertes de population quotidiennes de la guerre pour les villes du camp perdant
-- (1 = pertes normales).
create or replace function public.facteur_pertes_guerre_pays(p_country_id text, p_jour date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select 1::numeric;
$$;

-- ---------------------------------------------------------------------
-- resoudre_conflits_en_cours : recopiée À L'IDENTIQUE de la migration 0037 (même signature, même
-- type de retour, create or replace direct), aux lignes marquées A-INTEGRER §47 près.
-- ---------------------------------------------------------------------
create or replace function public.resoudre_conflits_en_cours()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conflit record;
  v_jour date;
  v_jour_limite date;
  v_effort_attaquant numeric;
  v_effort_defenseur numeric;
  v_jours_gagnes_attaquant integer;
  v_jours_gagnes_defenseur integer;
  v_pays_perdant_id text;
  v_ville record;
  v_perte integer;
  v_perte_existante numeric;
  v_plafond integer;
  v_resultat text;
  v_multiplicateur_defensif numeric; -- A-INTEGRER §47
  v_facteur_pertes numeric; -- A-INTEGRER §47
begin
  for v_conflit in
    select * from public.conflits where statut = 'en_cours'
  loop
    v_jour_limite := least((now() at time zone 'utc')::date, (v_conflit.fin at time zone 'utc')::date);
    v_jour := coalesce(v_conflit.dernier_jour_traite, (v_conflit.debut at time zone 'utc')::date - 1) + 1;

    if v_jour > v_jour_limite then
      continue;
    end if;

    v_jours_gagnes_attaquant := v_conflit.jours_gagnes_attaquant;
    v_jours_gagnes_defenseur := v_conflit.jours_gagnes_defenseur;

    while v_jour <= v_jour_limite loop
      -- A-INTEGRER §47 : l'effort de chaque camp est multiplié par son réglage de guerre (bonus
      -- Industrie n°1 de la semaine de ce jour) ; arrondi à 2 décimales comme effort_national().
      v_effort_attaquant := round(
        public.effort_national(v_conflit.pays_attaquant_id)
          * public.multiplicateur_effort_pays(
              v_conflit.pays_attaquant_id, 'attaquant', v_jour,
              v_jour = (v_conflit.debut at time zone 'utc')::date),
        2);
      v_effort_defenseur := round(
        public.effort_national(v_conflit.pays_defenseur_id)
          * public.multiplicateur_effort_pays(v_conflit.pays_defenseur_id, 'defenseur', v_jour, false),
        2);
      v_multiplicateur_defensif := public.multiplicateur_defensif_pays(v_conflit.pays_defenseur_id, v_jour);

      -- Bonus défensif (1,5 sauf développement national) : le défenseur gagne la journée
      -- sauf si l'attaquant dépasse son effort de ce facteur.
      if v_effort_attaquant > v_effort_defenseur * v_multiplicateur_defensif then
        v_jours_gagnes_attaquant := v_jours_gagnes_attaquant + 1;
        v_pays_perdant_id := v_conflit.pays_defenseur_id;
      elsif v_effort_attaquant < v_effort_defenseur * v_multiplicateur_defensif then
        v_jours_gagnes_defenseur := v_jours_gagnes_defenseur + 1;
        v_pays_perdant_id := v_conflit.pays_attaquant_id;
      else
        v_pays_perdant_id := null;
      end if;

      if v_pays_perdant_id is not null then
        v_facteur_pertes := public.facteur_pertes_guerre_pays(v_pays_perdant_id, v_jour);
        for v_ville in
          select id, population from public.cities where country_id = v_pays_perdant_id
        loop
          v_perte := greatest(1, round(v_ville.population * 0.001));
          if v_facteur_pertes < 1 then
            v_perte := floor(v_perte * v_facteur_pertes); -- A-INTEGRER §47 : jamais en dessous de 0
          end if;
          select coalesce(sum(valeur), 0) into v_perte_existante
            from public.city_events
            where ville_id = v_ville.id and type = 'guerre' and conflit_id = v_conflit.id;
          v_plafond := greatest(1, ceil(v_ville.population * 0.05));
          v_perte := greatest(0, least(v_perte, v_plafond - v_perte_existante::integer));

          if v_perte > 0 then
            update public.cities set population = greatest(population - v_perte, 1) where id = v_ville.id;
            insert into public.city_events (ville_id, type, valeur, jour, conflit_id)
              values (v_ville.id, 'guerre', v_perte, v_jour, v_conflit.id);
          end if;
        end loop;
      end if;

      v_jour := v_jour + 1;
    end loop;

    if v_jour_limite >= (v_conflit.fin at time zone 'utc')::date then
      if v_jours_gagnes_attaquant > v_jours_gagnes_defenseur then
        v_resultat := 'attaquant';
      elsif v_jours_gagnes_attaquant < v_jours_gagnes_defenseur then
        v_resultat := 'defenseur';
      else
        v_resultat := 'egalite';
      end if;

      update public.conflits
        set statut = 'termine',
            resultat = v_resultat,
            effort_attaquant = v_effort_attaquant,
            effort_defenseur = v_effort_defenseur,
            jours_gagnes_attaquant = v_jours_gagnes_attaquant,
            jours_gagnes_defenseur = v_jours_gagnes_defenseur,
            dernier_jour_traite = v_jour_limite
        where id = v_conflit.id;
    else
      update public.conflits
        set effort_attaquant = v_effort_attaquant,
            effort_defenseur = v_effort_defenseur,
            jours_gagnes_attaquant = v_jours_gagnes_attaquant,
            jours_gagnes_defenseur = v_jours_gagnes_defenseur,
            dernier_jour_traite = v_jour_limite
        where id = v_conflit.id;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- visiter_ville : recopiée À L'IDENTIQUE de la migration 0049 (même signature, même type de
-- retour, create or replace direct), aux lignes marquées A-INTEGRER §47 près.
-- ---------------------------------------------------------------------
create or replace function public.visiter_ville(
  p_visiteur_id uuid,
  p_ville_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_population_max integer;
  v_pays_ville text; -- A-INTEGRER §47
  v_niveau integer;
  v_activites text[];
  v_activite text;
  v_jour date := (now() at time zone 'utc')::date;
  v_derniere_visite timestamptz;
  v_nb_aujourdhui integer;
  v_jauge_residentiel numeric;
  v_jauge_commerce numeric;
  v_probabilite_gain numeric;
  v_gain integer := 0;
  v_bonus_solidarite integer := 0;
  v_dernier_type_action text;
  v_derniere_attaque timestamptz;
  v_palier text;
  v_visite_id uuid;
  v_ville public.cities;
begin
  if auth.uid() is not null and auth.uid() <> p_visiteur_id then
    raise exception 'visiter_ville: utilisateur non autorisé' using errcode = 'P0007';
  end if;

  select owner_id, population_max, country_id into v_owner_id, v_population_max, v_pays_ville
    from public.cities where id = p_ville_id;
  if v_owner_id is null then
    raise exception 'visiter_ville: ville introuvable' using errcode = 'P0004';
  end if;

  select max(created_at) into v_derniere_visite
    from public.visites
    where visiteur_id = p_visiteur_id and ville_id = p_ville_id;

  if v_derniere_visite is not null and v_derniere_visite > now() - interval '1 hour' then
    raise exception 'visiter_ville: délai minimum d''une heure non écoulé'
      using errcode = 'P0018';
  end if;

  select count(*) into v_nb_aujourdhui
    from public.visites
    where visiteur_id = p_visiteur_id and ville_id = p_ville_id and jour = v_jour;

  if v_nb_aujourdhui >= public.plafond_visites_quotidien() then
    raise exception 'visiter_ville: plafond quotidien de visites atteint (%)', public.plafond_visites_quotidien()
      using errcode = 'P0019';
  end if;

  v_niveau := public.population_vers_niveau(v_population_max);
  v_activites := array['residentiel', 'loisirs'];
  if v_niveau >= 1 then v_activites := v_activites || array['commerce', 'services']; end if;
  if v_niveau >= 2 then v_activites := v_activites || array['industrie', 'energie']; end if;
  if v_niveau >= 3 then v_activites := v_activites || array['recherche']; end if;
  select a into v_activite from unnest(v_activites) as a order by random() limit 1;

  insert into public.visites (visiteur_id, ville_id, activite) values (p_visiteur_id, p_ville_id, v_activite)
    returning id into v_visite_id;

  -- Jalon 18 §4 : crise du Résidentiel — l'habitant n'est accordé
  -- qu'avec une probabilité jauge ÷ 60 % (formule donnée telle quelle
  -- par le document, pas la formule générique d'intensité).
  v_jauge_residentiel := public.jauge_activite(p_ville_id, 'residentiel');
  v_probabilite_gain := case when v_jauge_residentiel < 0.6 then v_jauge_residentiel / 0.6 else 1 end;

  if random() < v_probabilite_gain then
    v_gain := 1;
    -- Point fort Commerce : jusqu'à +25 % d'habitants par visite —
    -- traité ici comme une chance supplémentaire de +1 (l'habitant est
    -- un entier, pas de fraction possible).
    v_jauge_commerce := public.jauge_activite(p_ville_id, 'commerce');
    if random() < public.intensite_point_fort(v_jauge_commerce) * 0.25 then
      v_gain := v_gain + 1;
    end if;
    -- A-INTEGRER §42 — point fort Résidentiel : jusqu'à 25 % de chance d'un habitant de
    -- plus, tirée indépendamment du Commerce (voir bonus_croissance_residentiel()).
    if random() < public.bonus_croissance_residentiel(v_jauge_residentiel) then
      v_gain := v_gain + 1;
    end if;
    -- A-INTEGRER §47 — Commerce n°1 mondial de la semaine (et, en 0054, Expansion urbaine) :
    -- une chance de plus, tirée indépendamment des deux précédentes, pour toutes les villes
    -- du pays (voir bonus_croissance_pays()).
    if random() < public.bonus_croissance_pays(v_pays_ville) then
      v_gain := v_gain + 1;
    end if;
  end if;

  -- Solidarité (§6bis) : si une attaque a touché cette ville dans les
  -- 24h et que l'activité tirée ici est celle qui protège contre le
  -- type d'attaque le plus récent, +1 habitant de plus (doublé au
  -- palier Émeutes et au-delà). Jamais retiré si l'activité change
  -- ensuite (voir choisir_activite_visite) — bonus_solidarite_applique
  -- empêche seulement un double crédit.
  select type_action, created_at into v_dernier_type_action, v_derniere_attaque
    from public.actions_antiville
    where ville_id = p_ville_id and created_at >= now() - interval '24 hours'
    order by created_at desc limit 1;

  if v_derniere_attaque is not null and public.activite_protectrice(v_dernier_type_action) = v_activite then
    v_palier := public.palier_attaques(public.attaques_recues_aujourdhui(p_ville_id));
    v_bonus_solidarite := case when v_palier in ('emeutes', 'crise', 'sinistree') then 2 else 1 end;
    v_gain := v_gain + v_bonus_solidarite;
    update public.visites set bonus_solidarite_applique = true where id = v_visite_id;
  end if;

  update public.cities
    set population = population + v_gain,
        population_max = greatest(population_max, population + v_gain),
        niveau = public.population_vers_niveau(greatest(population_max, population + v_gain))
    where id = p_ville_id
    returning * into v_ville;

  -- A-INTEGRER §34 : on retient le gain réel de la visite, pour pouvoir l'annuler
  -- si le joueur attaque la ville dans la foulée.
  update public.visites set gain = v_gain where id = v_visite_id;

  return jsonb_build_object('ville', to_jsonb(v_ville), 'gain', v_gain, 'activite', v_activite);
end;
$$;

-- ---------------------------------------------------------------------
-- avancer_monuments : recopiée de la migration 0050 (même signature, même type de retour), aux
-- lignes marquées A-INTEGRER §47 près : le seuil d'un monument ou mégaprojet devient, pour la
-- ville, plafond(seuil × (1 − réduction du pays)). Un monument débloqué reste acquis (la ligne de
-- `monuments` ne s'efface jamais) même si la réduction disparaît la semaine suivante.
-- ---------------------------------------------------------------------
create or replace function public.avancer_monuments(p_ville_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_influence_max integer;
  v_pays text; -- A-INTEGRER §47
  v_reduction numeric; -- A-INTEGRER §47
  v_entree record;
begin
  select influence_max, country_id into v_influence_max, v_pays from public.cities where id = p_ville_id;
  if v_influence_max is null then
    return;
  end if;
  v_reduction := public.reduction_seuil_pays(v_pays);

  for v_entree in
    select k.palier from public.monument_catalogue() k
    where ceil(k.seuil * (1 - v_reduction)) <= v_influence_max
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
