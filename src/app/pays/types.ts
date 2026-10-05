import type { Locale } from "@/lib/i18n/dictionaries";
import type { DictionaryKey } from "@/lib/i18n/dictionaries";
import type { createSupabaseServerClient } from "@/lib/supabase/server-session";
import { CATEGORIES_RESSOURCE, type CategorieRessource } from "@/lib/game/developpements";

export type ClientSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Les onglets de /pays (docs/A-INTEGRER.md §48 : refonte de la page), dans l'ordre d'affichage. */
export const ONGLETS_PAYS = ["semaine", "classement", "developpement", "pays", "historique"] as const;
export type OngletPays = (typeof ONGLETS_PAYS)[number];

export type Categorie = CategorieRessource;
export const CATEGORIES = CATEGORIES_RESSOURCE;
export const LABEL_CATEGORIE: Record<Categorie, DictionaryKey> = {
  industrie: "pays.categorie.industrie",
  techno: "pays.categorie.techno",
  culture: "pays.categorie.culture",
  commerce: "pays.categorie.commerce",
};

export type CategorieDiplomatie = "alliance" | "paix" | "rivalite" | "embargo";
export const CATEGORIES_DIPLOMATIE: CategorieDiplomatie[] = ["alliance", "paix", "rivalite", "embargo"];
export const LABEL_DIPLOMATIE: Record<CategorieDiplomatie, DictionaryKey> = {
  alliance: "pays.diplomatie.alliance",
  paix: "pays.diplomatie.paix",
  rivalite: "pays.diplomatie.rivalite",
  embargo: "pays.diplomatie.embargo",
};

export type StatsPays = {
  nb_villes: number;
  population_totale: number;
  influence_totale: number;
  activite_moyenne: number;
};

export type VillePrincipale = { id: string; nom: string; population: number };
export type ResultatVote = { categorie: Categorie; nb_votes: number; pourcentage: number };

export type ResultatDecision = {
  proposition_id: string;
  pays_cible_id: string;
  categorie: CategorieDiplomatie;
  proposee_par_ville_id: string;
  nb_pour: number;
  nb_contre: number;
};

export type StatutConflit = "en_cours" | "termine";
export type ResultatConflit = "attaquant" | "defenseur" | "egalite";
export type ConflitPays = {
  id: string;
  pays_attaquant_id: string;
  pays_defenseur_id: string;
  debut: string;
  fin: string;
  statut: StatutConflit;
  resultat: ResultatConflit | null;
  effort_attaquant: number;
  effort_defenseur: number;
  jours_gagnes_attaquant: number;
  jours_gagnes_defenseur: number;
  cout_ressources: Partial<Record<Categorie, number>>;
};

export type StatutSemaine = "paix" | "guerre" | "allie";

export type LigneHistorique = {
  semaine: string;
  vote_categorie: Categorie | null;
  vote_nb: number | null;
  decision_categorie: CategorieDiplomatie | null;
  decision_cible: string | null;
  decision_adoptee: boolean | null;
  decision_pour: number | null;
  decision_contre: number | null;
  conflit_id: string | null;
  conflit_role: "attaquant" | "defenseur" | null;
  conflit_adversaire: string | null;
  conflit_statut: StatutConflit | null;
  conflit_resultat: ResultatConflit | null;
  pertes_pays: number | null;
  pertes_adversaire: number | null;
  /** Ville présidente de cette semaine (A-INTEGRER §31), null avant la présidence hebdomadaire. */
  president_ville_id: string | null;
  president_ville_nom: string | null;
  /** Migration 0054 : développement voté cette semaine-là, absent tant que la migration n'est pas appliquée. */
  developpement?: string | null;
  developpement_nb?: number | null;
  developpement_finance?: boolean | null;
  premier_de?: Categorie[] | null;
};

export type MandatBrut = {
  ville_id: string;
  debut: string;
  fin: string | null;
  ville: { nom: string } | { nom: string }[] | null;
};
export type Mandat = { villeId: string; nom: string; debut: string; fin: string | null };

/** Tout ce que les onglets partagent : qui regarde quoi, et de quoi parler à la base. */
export type ContextePays = {
  locale: Locale;
  supabase: ClientSupabase;
  userId: string;
  maVilleId: string;
  /** Pays du joueur. */
  monPaysId: string;
  /** Pays consulté (le sien par défaut, ?pays= pour un autre). */
  countryId: string;
  estMonPays: boolean;
  listePays: { id: string; nom: string }[];
  /** Nom d'un pays à partir de son code ("" si le code est absent). */
  nomDe: (id: string | null) => string;
  /** La ville du joueur est la présidente en exercice de son pays. */
  jeSuisPresident: boolean;
};

/** La première ligne d'un résultat de fonction SQL qui renvoie `returns table` (objet ou tableau selon le client). */
export function premiereLigne<T>(brut: unknown): T | undefined {
  return (Array.isArray(brut) ? brut[0] : brut) as T | undefined;
}
