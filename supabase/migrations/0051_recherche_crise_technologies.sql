-- Malus de crise de la Recherche (docs/A-INTEGRER.md §42, docs/SYSTEME-DEVELOPPEMENT.md §4) :
-- « pas de nouvelle technologie débloquée » quand la jauge de Recherche est en crise (< 60 %).
--
-- Le tableau du §4 prévoyait déjà cet effet, mais il n'avait jamais été codé : de toutes les
-- activités, la Recherche était la seule sans malus (Commerce perd le bonus des jumelages,
-- Énergie double son poids dans le risque de manifestation, Résidentiel a sa crise du logement).
--
-- Mécanique : avancer_technologies() (0029) ne débloque plus rien tant que la jauge de Recherche
-- est sous 60 %. Rien n'est perdu ni retiré :
--   * les technologies déjà débloquées restent (jamais de destruction, règle permanente) ;
--   * les points de Recherche continuent de s'accumuler (stock_ville() compte toutes les
--     visites) ; dès que la jauge repasse à 60 % ou plus, le prochain affichage de la ville
--     débloque d'un coup tous les paliers déjà atteints (la boucle d'origine, inchangée).
-- C'est un gel, pas une pénalité chiffrée : les autres effets de crise du §4 sont, eux,
-- progressifs, mais « un palier à débloquer » n'a pas de demi-mesure honnête, et un palier
-- retardé n'est jamais un palier perdu.
--
-- Nouveauté : recherche_en_crise(ville) → boolean, pour que l'interface puisse l'expliquer.
-- Ne touche ni à la population, ni à l'influence, ni aux visites.
-- Aucun nouveau code d'erreur.

create or replace function public.recherche_en_crise(p_ville_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.intensite_crise(public.jauge_activite(p_ville_id, 'recherche')) > 0, false);
$$;

-- Même corps que la migration 0029, plus la sortie anticipée en crise.
create or replace function public.avancer_technologies(p_ville_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer;
  v_palier integer;
begin
  -- Crise de la Recherche : rien de nouveau tant que la jauge est sous 60 %.
  if public.recherche_en_crise(p_ville_id) then
    return;
  end if;

  select public.stock_ville(p_ville_id, 'recherche') into v_points;
  select coalesce(max(palier), -1) + 1 into v_palier
    from public.technologies where ville_id = p_ville_id;

  while v_points >= public.seuil_technologie(v_palier) loop
    insert into public.technologies (ville_id, palier) values (p_ville_id, v_palier);
    insert into public.city_events (ville_id, type, activite, valeur, jour)
      values (p_ville_id, 'technologie_debloquee', 'recherche', v_palier, (now() at time zone 'utc')::date);
    v_palier := v_palier + 1;
  end loop;
end;
$$;
