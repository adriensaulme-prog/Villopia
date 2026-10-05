import type { SupabaseClient } from "@supabase/supabase-js";
import { packsDuJoueur, type LigneCatalogue, type PackJoueur } from "@/lib/game/themes";

/**
 * Packs de thèmes du joueur connecté (docs/A-INTEGRER.md §30) : le catalogue
 * `packs` (gratuit pour tous ou non) croisé avec ses lignes `joueur_packs`.
 * Lecture seule, avec la session du joueur (RLS : il ne voit que ses packs).
 *
 * Tant que la migration 0047 n'est pas appliquée, la table `packs` n'existe pas :
 * la lecture échoue et on retombe sur le comportement d'avant la boutique
 * (tout thème connu est libre, migration 0034) — jamais une page cassée, jamais
 * une ville verrouillée sur une erreur de lecture.
 */
export async function lirePacksDuJoueur(supabase: SupabaseClient, userId: string): Promise<PackJoueur[]> {
  const [catalogue, obtenus] = await Promise.all([
    supabase.from("packs").select("id, gratuit"),
    supabase.from("joueur_packs").select("pack").eq("joueur_id", userId),
  ]);
  if (catalogue.error) {
    return packsDuJoueur(null, []);
  }
  return packsDuJoueur(
    (catalogue.data ?? []) as LigneCatalogue[],
    ((obtenus.data ?? []) as { pack: string }[]).map((l) => l.pack)
  );
}
