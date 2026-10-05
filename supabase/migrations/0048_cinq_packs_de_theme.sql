-- Cinq nouveaux packs de thème (docs/A-INTEGRER.md §40) : « Bord de mer »,
-- « Village de pierre », « Quartier industriel reconverti », « Futuriste / éco »
-- et « Nordique ». Suite de la boutique (migration 0047).
--
-- Principe inchangé (BATIMENTS-ET-PACKS §4) : un pack est PUREMENT COSMÉTIQUE.
-- Cette migration ne lit ni n'écrit aucune colonne de jeu ; `definir_theme_ville`
-- ne modifie toujours que `cities.theme`.
--
-- Contenu :
--   * les cinq lignes du catalogue `packs` ;
--   * la contrainte `cities.theme` (0034), élargie aux sept thèmes connus ;
--   * `definir_theme_ville()` (0047), avec la même liste de sept thèmes — mêmes
--     contrôles qu'avant (maire seul, thème connu, pack possédé), mêmes codes
--     d'erreur (P0004, P0007, P0022, P0030).
--
-- Décision par défaut (à contester par Adrien) : les cinq packs sont PAYANTS
-- (`gratuit = false`), comme Haussmannien depuis la décision d'Adrien du
-- 05/10/2026 : seul le Classique, pack de base, est gratuit pour tous. Le
-- paiement n'est pas branché : en attendant, personne ne les possède (l'aperçu
-- dans la Boutique reste possible), sauf à qui on les attribue :
--     insert into public.joueur_packs (joueur_id, pack)
--     values ('<id du joueur>', 'nordique');
-- Pour en ouvrir un à tout le monde :
--     update public.packs set gratuit = true where id = 'nordique';
-- (si on le repasse payant plus tard, on rattrape d'abord ceux qui l'utilisent :
--     insert into public.joueur_packs (joueur_id, pack, source)
--     select owner_id, theme, 'avant_boutique' from public.cities
--     where theme = 'nordique' on conflict do nothing;)
--
-- « Bord de mer » et « Village de pierre » (maisons), « Quartier industriel
-- reconverti » et « Haussmannien » (immeubles) sont concurrents d'office : une
-- ville ne porte qu'un seul thème.

insert into public.packs (id, gratuit) values
  ('bord_de_mer', false),
  ('village_de_pierre', false),
  ('quartier_industriel', false),
  ('futuriste_eco', false),
  ('nordique', false);

-- La contrainte de colonne créée par 0034 s'appelle cities_theme_check.
alter table public.cities drop constraint if exists cities_theme_check;
alter table public.cities
  add constraint cities_theme_check
  check (theme in ('classique', 'haussmannien', 'bord_de_mer', 'village_de_pierre', 'quartier_industriel', 'futuriste_eco', 'nordique'));

create or replace function public.definir_theme_ville(
  p_owner_id uuid,
  p_ville_id uuid,
  p_theme text
)
returns public.cities
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_ville public.cities;
begin
  if auth.uid() is not null and auth.uid() <> p_owner_id then
    raise exception 'definir_theme_ville: utilisateur non autorisé' using errcode = 'P0007';
  end if;

  if p_theme not in ('classique', 'haussmannien', 'bord_de_mer', 'village_de_pierre', 'quartier_industriel', 'futuriste_eco', 'nordique') then
    raise exception 'definir_theme_ville: thème invalide : %', p_theme using errcode = 'P0022';
  end if;

  select owner_id into v_owner_id from public.cities where id = p_ville_id;
  if v_owner_id is null then
    raise exception 'definir_theme_ville: ville introuvable' using errcode = 'P0004';
  end if;
  if v_owner_id <> p_owner_id then
    raise exception 'definir_theme_ville: seul le maire peut changer le thème' using errcode = 'P0007';
  end if;

  if not public.possede_pack(p_owner_id, p_theme) then
    raise exception 'definir_theme_ville: pack non possédé : %', p_theme using errcode = 'P0030';
  end if;

  update public.cities set theme = p_theme where id = p_ville_id returning * into v_ville;
  return v_ville;
end;
$$;
