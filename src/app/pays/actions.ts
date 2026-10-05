"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server-session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CATALOGUE_DEVELOPPEMENTS } from "@/lib/game/developpements";

const CATEGORIES_VOTE = ["industrie", "techno", "culture", "commerce"] as const;
const CATEGORIES_DIPLOMATIE = ["alliance", "paix", "rivalite", "embargo"] as const;
const IDS_DEVELOPPEMENT = CATALOGUE_DEVELOPPEMENTS.map((d) => d.id);

/**
 * Vote hebdomadaire pour une catégorie de ressource. Toute la logique
 * (résolution du pays du joueur, un seul vote par joueur et par
 * semaine ISO) vit dans la fonction SQL voter_pays() (Jalon 10,
 * docs/DECISIONS.md §4) — cette action ne fait que l'appeler et
 * rafraîchir la page.
 */
export async function voterPays(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const categorie = String(formData.get("categorie") ?? "");
  if (!(CATEGORIES_VOTE as readonly string[]).includes(categorie)) {
    return;
  }

  const { error } = await supabaseAdmin.rpc("voter_pays", {
    p_joueur_id: user.id,
    p_categorie: categorie,
  });

  // 23505 (unique_violation) = déjà voté cette semaine : pas une vraie
  // erreur, l'affichage se corrige tout seul au revalidate ci-dessous.
  if (error && error.code !== "23505") {
    console.error("voterPays a échoué :", error.message);
  }

  revalidatePath("/pays");
}

/**
 * Propose une décision diplomatique (pays cible + catégorie) pour son
 * pays cette semaine. Toute la logique (seule la présidente en exercice
 * peut proposer, une fois par pays et par semaine) vit dans
 * proposer_decision_diplomatique() (Jalon 12, docs/DECISIONS.md §4).
 */
export async function proposerDecisionDiplomatique(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const paysCibleId = String(formData.get("paysCibleId") ?? "");
  const categorie = String(formData.get("categorie") ?? "");
  if (!paysCibleId || !(CATEGORIES_DIPLOMATIE as readonly string[]).includes(categorie)) {
    return;
  }

  const { error } = await supabaseAdmin.rpc("proposer_decision_diplomatique", {
    p_president_id: user.id,
    p_pays_cible_id: paysCibleId,
    p_categorie: categorie,
  });

  // 23505 (déjà proposé cette semaine), P0013 (pas présidente), P0015
  // (cible invalide) : pas de vraies erreurs pour cette action simple,
  // l'affichage se corrige au revalidate (pas de bouton si on n'est pas
  // présidente, pas de formulaire si déjà proposé).
  if (error && !["23505", "P0013", "P0015"].includes(error.code ?? "")) {
    console.error("proposerDecisionDiplomatique a échoué :", error.message);
  }

  revalidatePath("/pays");
}

const POSITIONS_VOTE_DIPLOMATIE = ["pour", "contre"] as const;

/**
 * Vote pour ou contre la proposition diplomatique en cours de son pays,
 * une fois par semaine — voir soutenir_decision_diplomatique() (Jalon
 * 12, position pour/contre ajoutée au Jalon 13 : "le vote majoritaire
 * des personnes de la nation déclenche l'action choisie", demande
 * d'Adrien).
 */
export async function soutenirDecisionDiplomatique(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const position = String(formData.get("position") ?? "");
  if (!(POSITIONS_VOTE_DIPLOMATIE as readonly string[]).includes(position)) {
    return;
  }

  const { error } = await supabaseAdmin.rpc("soutenir_decision_diplomatique", {
    p_joueur_id: user.id,
    p_position: position,
  });

  // 23505 (déjà voté cette semaine), P0016 (aucune proposition) : pas
  // de vraies erreurs, l'affichage se corrige au revalidate.
  if (error && !["23505", "P0016"].includes(error.code ?? "")) {
    console.error("soutenirDecisionDiplomatique a échoué :", error.message);
  }

  revalidatePath("/pays");
}

/**
 * Vote hebdomadaire de développement national (docs/A-INTEGRER.md §48) : un vote par joueur et
 * par semaine, pour l'un des développements proposés à son pays. Toute la logique (options de la
 * semaine, clôture des semaines passées) vit dans voter_developpement() (migration 0054).
 */
export async function voterDeveloppement(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const developpement = String(formData.get("developpement") ?? "");
  if (!(IDS_DEVELOPPEMENT as readonly string[]).includes(developpement)) {
    return;
  }

  const { error } = await supabaseAdmin.rpc("voter_developpement", {
    p_joueur_id: user.id,
    p_developpement: developpement,
  });

  // 23505 (déjà voté cette semaine), P0034 (pas proposé cette semaine) : pas de vraies erreurs,
  // l'affichage se corrige au revalidate.
  if (error && !["23505", "P0034"].includes(error.code ?? "")) {
    console.error("voterDeveloppement a échoué :", error.message);
  }

  revalidatePath("/pays");
}

/**
 * Avis d'un citoyen du pays VISÉ sur une décision diplomatique d'un autre pays (§47 Culture n°1 et
 * §48 Rayonnement diplomatique) — voir donner_avis_decision() (migration 0053) : refusé si le pays
 * n'a pas voix au chapitre.
 */
export async function donnerAvisDiplomatie(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const propositionId = String(formData.get("propositionId") ?? "");
  const position = String(formData.get("position") ?? "");
  if (!propositionId || !(POSITIONS_VOTE_DIPLOMATIE as readonly string[]).includes(position)) {
    return;
  }

  const { error } = await supabaseAdmin.rpc("donner_avis_decision", {
    p_joueur_id: user.id,
    p_proposition_id: propositionId,
    p_position: position,
  });

  // 23505 (avis déjà donné), P0031 (ne vise pas ton pays), P0032 (pas de cette semaine), P0033 (pas
  // de voix au chapitre) : l'affichage ne propose pas ces boutons, donc pas de vraies erreurs.
  if (error && !["23505", "P0031", "P0032", "P0033"].includes(error.code ?? "")) {
    console.error("donnerAvisDiplomatie a échoué :", error.message);
  }

  revalidatePath("/pays");
}
