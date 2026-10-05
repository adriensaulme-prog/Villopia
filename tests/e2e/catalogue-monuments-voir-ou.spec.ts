import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { cleDe } from "../../src/lib/ville3d/emplacements";
import { placesMonuments } from "../../src/lib/ville3d/monumentsVille";

/**
 * A-INTEGRER §25 puis §41 : catalogue complet sur /ville — les 16 monuments
 * et les 18 mégaprojets, dans l'ordre où ils se débloquent (débloqués /
 * verrouillés avec leur seuil) — et « Voir où il est » qui amène la caméra
 * 3D sur le bâtiment. Client service_role recréé ici
 * pour la même raison que les specs des jalons précédents
 * ("server-only" hors du pipeline Next.js).
 */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const suffixe = () => Math.random().toString(36).slice(2, 6);

test.describe.configure({ mode: "serial" });

test("le catalogue liste les 34 monuments et mégaprojets, verrouillés avec leur seuil, et « Voir où il est » cible le bon emplacement", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `cat-mon-${Date.now()}-${suffixe()}@example.com`;
  const motDePasse = "mot-de-passe-test-e2e";
  const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password: motDePasse, email_confirm: true });
  if (error || !data.user) throw new Error(`Création du compte : ${error?.message}`);
  const userId = data.user.id;
  try {
    const { data: ville, error: erreurVille } = await supabaseAdmin.rpc("creer_ville", {
      p_owner_id: userId,
      p_pseudo: `catmon-${suffixe()}`,
      p_country_id: "FR",
      p_nom_ville: `catmon-ville-${suffixe()}`,
    });
    if (erreurVille) throw new Error(`Création de la ville : ${erreurVille.message}`);
    // 300 d'influence : paliers 10, 25, 50, 100, 250 franchis => 5 monuments débloqués, 29 verrouillés
    // (le catalogue compte aussi les 18 mégaprojets depuis le §41 ; le premier, à 400, n'est pas atteint).
    await supabaseAdmin.from("cities").update({ influence: 300, influence_max: 300 }).eq("id", ville.id);

    await page.goto("/connexion");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill(motDePasse);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/ville$/, { timeout: 30_000 });

    // Le panneau des thèmes (PacksVille) réutilise la classe « catalogue-monuments » : on l'écarte.
    const catalogue = page.locator("details.catalogue-monuments:not(.packs-ville)");
    await expect(catalogue.locator("summary")).toContainText("5/34");
    await catalogue.locator("summary").click();
    await expect(catalogue.locator("li")).toHaveCount(34);
    await expect(catalogue.locator("li.debloque")).toHaveCount(5);
    await expect(catalogue.locator("li.verrouille")).toHaveCount(29);
    // Rangés dans l'ordre où ils se débloquent : le prochain est la Grande école (mégaprojet, 400),
    // il montre la progression ; le suivant (l'arc de triomphe, 500) juste son seuil.
    await expect(catalogue.locator("li.verrouille").first()).toContainText("Grande école");
    await expect(catalogue.locator("li.verrouille").first()).toContainText("300 / 400");
    await expect(catalogue.locator("li.verrouille").nth(1)).toContainText("500");
    await expect(catalogue.getByRole("button", { name: /Voir où il est/ })).toHaveCount(5);

    // Clic sur le 3e monument débloqué (palier 2) : la scène reçoit son emplacement exact.
    await catalogue.getByRole("button", { name: /Voir où il est/ }).nth(2).click();
    const attendu = placesMonuments(cleDe(ville.id as string), [2]).get(2)!;
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-repere",
      `${Math.round(attendu.x)},${Math.round(attendu.z)}`
    );
  } finally {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  }
});
