import type { SupabaseClient } from "@supabase/supabase-js";
import type { Activite } from "@/lib/game/activites";
import { repartirBatiments } from "@/lib/game/monuments";
import { premierRangZone, type VocationsBlocs } from "@/lib/ville3d/generer";
import type { VocationQuartier } from "@/lib/ville3d/quartiers";
import type { MegaprojetConstruit, MonumentDebloque } from "@/lib/ville3d/terrain";

/** Ce que la scène 3D lit en plus de la graine, de la population et du pays (voir ParametresVille). */
export interface DonneesRendu3D {
  vocations: VocationsBlocs;
  zonageDepuisRang: number | undefined;
  elanEnergie: number;
  megaprojets: MegaprojetConstruit[];
  nbTechnologies: number;
  monuments: MonumentDebloque[];
}

/**
 * Données du rendu 3D d'une ville, en LECTURE SEULE : tables publiques, aucun
 * calcul opportuniste (pas d'attribution de vocations, de monuments ou de
 * mégaprojets — ce qui n'est pas encore calculé apparaît à la prochaine visite
 * du maire). Sert aux pages qui doivent dessiner la VRAIE ville sans la
 * modifier : la page publique `/v/<id>` et la Boutique (aperçu d'un pack sur sa
 * propre ville). Les quatre lectures partent ensemble. Monuments et mégaprojets
 * viennent de la même table (catalogue unifié, A-INTEGRER §41).
 */
export async function lireDonneesRendu3D(supabase: SupabaseClient, villeId: string): Promise<DonneesRendu3D> {
  const [blocs, jauges, technologies, batimentsBruts] = await Promise.all([
    supabase.from("city_blocks").select("rang, vocation, zonee").eq("ville_id", villeId),
    supabase.rpc("jauges_ville", { p_ville_id: villeId }),
    supabase.from("technologies").select("id", { count: "exact", head: true }).eq("ville_id", villeId),
    supabase.from("monuments").select("palier").eq("ville_id", villeId),
  ]);

  const vocations: VocationsBlocs = new Map(
    (blocs.data ?? []).map((b) => [b.rang as number, b.vocation as VocationQuartier])
  );
  const zonageDepuisRang = premierRangZone((blocs.data ?? []) as { rang: number; zonee: boolean }[]);
  const elanEnergie =
    ((jauges.data ?? []) as { activite: Activite; elan: number }[]).find((j) => j.activite === "energie")?.elan ?? 0;
  const { monuments, megaprojets } = repartirBatiments((batimentsBruts.data ?? []).map((b) => b.palier as number));

  return {
    vocations,
    zonageDepuisRang,
    elanEnergie,
    megaprojets,
    nbTechnologies: technologies.count ?? 0,
    monuments,
  };
}
