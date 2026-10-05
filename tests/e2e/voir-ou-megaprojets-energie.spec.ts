import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { cleDe } from "../../src/lib/ville3d/emplacements";
import { placesMegaprojets } from "../../src/lib/ville3d/megaprojetsVille";

/**
 * « Voir où il est » pour les mégaprojets débloqués (suite de
 * docs/A-INTEGRER.md §25, place dans la ville, contre les monuments, depuis le §46) ; le
 * bouton d'Énergie, d'abord prévu au §25 puis conservé au §37, a été retiré à
 * la demande d'Adrien (05/10/2026) : la jauge Énergie n'en a plus. Client
 * service_role recréé ici pour la même raison que les specs des jalons
 * précédents ("server-only" hors du pipeline Next.js).
 */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const suffixe = () => Math.random().toString(36).slice(2, 6);

test("un mégaprojet construit a son bouton « Voir où il est », qui cible l'emplacement exact ; la jauge Énergie n'en a plus", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const email = `voir-ou-${Date.now()}-${suffixe()}@example.com`;
  const motDePasse = "mot-de-passe-test-e2e";
  const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password: motDePasse, email_confirm: true });
  if (error || !data.user) throw new Error(`Création du compte : ${error?.message}`);
  const userId = data.user.id;
  try {
    const { data: ville, error: erreurVille } = await supabaseAdmin.rpc("creer_ville", {
      p_owner_id: userId,
      p_pseudo: `voirou-${suffixe()}`,
      p_country_id: "FR",
      p_nom_ville: `voirou-ville-${suffixe()}`,
    });
    if (erreurVille) throw new Error(`Création de la ville : ${erreurVille.message}`);
    const villeId = ville.id as string;
    // Bourg (5 000) : activité Énergie débloquée. Record d'influence à 400 : la Grande école (premier
    // mégaprojet du catalogue unifié, palier 16, A-INTEGRER §41) se débloque toute seule à l'affichage.
    await supabaseAdmin
      .from("cities")
      .update({ population: 6000, population_max: 6000, influence_max: 400 })
      .eq("id", villeId);
    // De l'élan d'Énergie : des visites sur plusieurs jours (la page lit l'élan, pas des compteurs).
    const lignes = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(Date.now() - i * 86_400_000);
      return { visiteur_id: userId, ville_id: villeId, activite: "energie", jour: d.toISOString().slice(0, 10), created_at: d.toISOString() };
    });
    expect((await supabaseAdmin.from("visites").insert(lignes)).error).toBeNull();

    await page.goto("/connexion");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill(motDePasse);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/ville$/, { timeout: 30_000 });

    const cle = cleDe(villeId);
    const canvas = page.locator("canvas");

    // Depuis le §41 le mégaprojet est dans le panneau « Monuments et mégaprojets » (replié par défaut) :
    // on l'ouvre. Le panneau des thèmes (PacksVille) réutilise la même classe, on l'écarte.
    await page.locator("details.catalogue-monuments:not(.packs-ville) summary").click({ timeout: 30_000 });
    const boutonMega = page.getByRole("button", { name: /Voir où il est : Grande école/ });
    await expect(boutonMega).toBeVisible({ timeout: 30_000 });
    await boutonMega.click();
    const m = placesMegaprojets(cle, [16]).get(16)!;
    await expect(canvas).toHaveAttribute("data-repere", `${Math.round(m.x)},${Math.round(m.z)}`);

    // Énergie : de l'élan, donc des installations dans la campagne, mais plus de bouton pour les repérer.
    await expect(page.locator(".jauge-nom", { hasText: "Énergie" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Voir où il est : Énergie/ })).toHaveCount(0);
  } finally {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  }
});
