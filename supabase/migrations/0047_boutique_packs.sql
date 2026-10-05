-- La boutique de packs de thèmes (docs/A-INTEGRER.md §30, docs/BATIMENTS-ET-PACKS.md
-- §5 et §6 point 4) : qui possède quel pack, et ce que le serveur laisse appliquer.
--
-- Principe (BATIMENTS-ET-PACKS §4, rappelé par le §30) : un pack est PUREMENT
-- COSMÉTIQUE. Rien ici ne touche à la population, à l'influence ni à la défense :
-- cette migration ne lit ni n'écrit aucune colonne de jeu, et `definir_theme_ville`
-- ne modifie toujours que `cities.theme`.
--
-- Contenu :
--   * `packs`        — le catalogue côté serveur : un pack est-il gratuit pour tous ?
--   * `joueur_packs` — les packs obtenus par un joueur (achat, attribution...).
--     Aucune policy d'écriture : le jour où le paiement sera branché, seule une
--     fonction `security definer` appelée après un achat VALIDÉ côté serveur y
--     inscrira une ligne (BATIMENTS-ET-PACKS §5). Rien n'est payable ici.
--   * `possede_pack()` — la règle de droit d'usage, utilisée par
--     `definir_theme_ville()`, qui refuse désormais un pack que le joueur ne possède pas.
--
-- Décision d'Adrien (05/10/2026) : le pack Haussmannien est un pack PAYANT (« la
-- restriction viendra avec la boutique », migration 0034). Le Classique, pack de base,
-- reste gratuit pour tous. Le paiement lui-même n'est pas branché : en attendant, seuls
-- ceux qui l'ont déjà (rattrapage plus bas) ou à qui on l'attribue le possèdent. Pour le
-- redonner à tous : update public.packs set gratuit = true where id = 'haussmannien';
-- Pour l'offrir à un joueur : insert into public.joueur_packs (joueur_id, pack)
-- values ('<id>', 'haussmannien');
--
-- Nouveau code d'erreur : P0030 = pack non possédé.
-- Réutilisés : P0004 (ville introuvable), P0007 (joueur non autorisé), P0022 (thème invalide).

create table public.packs (
  id text primary key,
  gratuit boolean not null default false
);

insert into public.packs (id, gratuit) values
  ('classique', true),
  ('haussmannien', false);

alter table public.packs enable row level security;

-- Le catalogue n'a rien de secret : la boutique l'affiche à tout joueur connecté.
create policy "packs_lecture_publique"
  on public.packs for select
  using (true);

create table public.joueur_packs (
  joueur_id uuid not null references public.users (id) on delete cascade,
  pack text not null references public.packs (id),
  obtenu_le timestamptz not null default now(),
  -- D'où vient le droit : 'achat' (plus tard), 'attribution' (cadeau, compte de test),
  -- 'avant_boutique' (rattrapage de ceux qui utilisaient déjà le pack).
  source text not null default 'attribution' check (source in ('achat', 'attribution', 'avant_boutique')),
  primary key (joueur_id, pack)
);

alter table public.joueur_packs enable row level security;

-- Chacun ne voit que SES packs.
create policy "joueur_packs_lecture_propre"
  on public.joueur_packs for select
  using (joueur_id = auth.uid());

-- Aucune policy insert/update/delete : tout passe par des fonctions security definer.

-- Rattrapage : qui utilise déjà un pack avant l'ouverture de la boutique le garde,
-- bien que Haussmannien soit désormais payant (on ne retire jamais à quelqu'un ce que sa
-- ville porte déjà).
insert into public.joueur_packs (joueur_id, pack, source)
select owner_id, theme, 'avant_boutique'
from public.cities
where theme <> 'classique'
on conflict do nothing;

-- ---------------------------------------------------------------------
-- possede_pack : un pack gratuit est possédé par tout le monde, un pack payant
-- seulement par qui en a une ligne dans joueur_packs. Un joueur connecté ne peut
-- pas interroger les packs d'un autre (la ligne de joueur_packs reste privée).
-- ---------------------------------------------------------------------
create or replace function public.possede_pack(
  p_joueur_id uuid,
  p_pack text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select pk.gratuit from public.packs pk where pk.id = p_pack)
    or (
      (auth.uid() is null or auth.uid() = p_joueur_id)
      and exists (
        select 1 from public.joueur_packs jp
        where jp.joueur_id = p_joueur_id and jp.pack = p_pack
      )
    ),
    false
  );
$$;

-- ---------------------------------------------------------------------
-- definir_theme_ville : même contrôles qu'en 0034 (seul le maire, thème connu),
-- plus le droit d'usage — on ne peut appliquer qu'un pack qu'on possède.
-- ---------------------------------------------------------------------
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

  if p_theme not in ('classique', 'haussmannien') then
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
