/**
 * Classement hebdomadaire des pays (docs/A-INTEGRER.md §47, migration 0052) : le n°1 mondial de
 * chaque catégorie de ressource nationale reçoit un effet pour la semaine.
 *
 * Source de vérité pour l'affichage ; le calcul réel (classement, effets) vit côté serveur
 * (supabase/migrations/0052_classement_pays.sql, 0054_developpements_nationaux.sql, anti-triche) — à
 * tenir synchronisé si ces chiffres changent (tests/unit/classementPays.test.ts compare les deux).
 */
import type { Locale } from "@/lib/i18n/dictionaries";
import type { CategorieRessource } from "./developpements";
import { EFFETS_DEVELOPPEMENTS } from "./developpements";

/** Effet du n°1 de chaque catégorie. */
export const BONUS_PREMIER = {
  /** Industrie n°1 : part ajoutée à l'effort national en guerre (+15 %). */
  industrieEffort: 0.15,
  /** Commerce n°1 : chance d'un habitant de plus par visite, dans toutes les villes du pays (+10 %). */
  commerceCroissance: 0.1,
  /** Technologie n°1 : part retirée des seuils d'influence des monuments et mégaprojets (−10 %). */
  technoSeuil: 0.1,
  /** Culture n°1 : poids de l'avis d'un citoyen sur une décision diplomatique qui vise son pays. */
  culturePoids: 2,
} as const;

/** Une ligne de classement_pays_vue() : le pays consulté dans une catégorie. */
export interface LigneClassementPays {
  categorie: CategorieRessource;
  /** Rang du pays (1 = en tête), null s'il n'a encore aucune ressource accumulée dans la catégorie. */
  rang: number | null;
  total: number;
  nbPays: number;
  premierCountryId: string | null;
  premierTotal: number | null;
}

/** Le pays tient-il la 1ère place de cette catégorie (donc l'effet est-il actif cette semaine) ? */
export function estPremier(l: LigneClassementPays): boolean {
  return l.rang === 1;
}

/**
 * Seuil d'influence effectif d'un monument ou mégaprojet pour une ville dont le pays a une
 * réduction (0 à 1) : plafond(seuil × (1 − réduction)), comme avancer_monuments() côté SQL.
 */
export function seuilEffectif(seuil: number, reduction: number): number {
  // Arrondi à 9 décimales avant le plafond : 10 × 0,9 vaut 9,000000000000002 en flottants.
  return Math.ceil(Math.round(seuil * (1 - reduction) * 1e9) / 1e9);
}

/**
 * Poids de l'avis d'un citoyen du pays sur une décision qui le vise, comme
 * poids_voix_diplomatique_pays() : 0 = pas de voix au chapitre ; sinon 1 + 1 (Culture n°1) + 0,5
 * (Rayonnement diplomatique).
 */
export function poidsVoixDiplomatique(opts: { premierCulture: boolean; rayonnement: boolean }): number {
  if (!opts.premierCulture && !opts.rayonnement) return 0;
  return (
    1 +
    (opts.premierCulture ? BONUS_PREMIER.culturePoids - 1 : 0) +
    (opts.rayonnement ? EFFETS_DEVELOPPEMENTS.rayonnementPoids : 0)
  );
}

/** Chance totale d'un habitant de plus par visite : Commerce n°1 + Expansion urbaine. */
export function bonusCroissancePays(opts: { premierCommerce: boolean; expansionUrbaine: boolean }): number {
  return (
    (opts.premierCommerce ? BONUS_PREMIER.commerceCroissance : 0) +
    (opts.expansionUrbaine ? EFFETS_DEVELOPPEMENTS.expansionCroissance : 0)
  );
}

/** Réduction totale des seuils d'influence : Technologie n°1 + Avance technologique. */
export function reductionSeuilPays(opts: { premierTechno: boolean; avanceTechnologique: boolean }): number {
  return (
    (opts.premierTechno ? BONUS_PREMIER.technoSeuil : 0) + (opts.avanceTechnologique ? EFFETS_DEVELOPPEMENTS.avanceSeuil : 0)
  );
}

/** Un poids ou un décompte pondéré (2, 1,5, 0,5...) : une décimale au plus, selon la langue. */
export function formaterPoids(valeur: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(valeur);
}
