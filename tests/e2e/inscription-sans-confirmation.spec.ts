import { test, expect, type Page } from "@playwright/test";

/**
 * A-INTEGRER §52 — après l'inscription, le message « Vérifie ta boîte
 * mail » ne doit s'afficher que si Supabase exige vraiment une
 * confirmation d'email (pas de session ouverte). Si « Confirm email »
 * est désactivé, signUp() renvoie une session : on entre dans le jeu.
 *
 * L'appel /auth/v1/signup est intercepté et sa réponse simulée dans les
 * deux configurations : aucun compte n'est créé dans Supabase, et le test
 * ne dépend pas du réglage du projet.
 */

const utilisateur = {
  id: "00000000-0000-4000-8000-000000000052",
  aud: "authenticated",
  role: "authenticated",
  email: "inscription-52@example.com",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: new Date().toISOString(),
};

// Jeton factice au format JWT (le client Supabase ne le vérifie pas).
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jetonFactice = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({
  sub: utilisateur.id,
  exp: Math.floor(Date.now() / 1000) + 3600,
})}.signature`;

async function simulerInscription(page: Page, avecSession: boolean) {
  await page.route("**/auth/v1/signup**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        avecSession
          ? {
              access_token: jetonFactice,
              token_type: "bearer",
              expires_in: 3600,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              refresh_token: "refresh-factice",
              user: utilisateur,
            }
          : { ...utilisateur, confirmation_sent_at: new Date().toISOString() }
      ),
    })
  );
  await page.goto("/inscription");
  await page.locator("#inscriptionEmail").fill(utilisateur.email);
  await page.locator("#inscriptionMotDePasse").fill("mot-de-passe-test");
  await page.getByRole("button", { name: /créer|create|crear/i }).click();
}

test.describe("Inscription — confirmation d'email activée ou non (A-INTEGRER §52)", () => {
  test("confirmation exigée (pas de session) : le message « Vérifie ta boîte mail » s'affiche", async ({ page }) => {
    await simulerInscription(page, false);
    await expect(page.locator(".toast")).toBeVisible();
    await expect(page).toHaveURL(/\/inscription/);
  });

  test("confirmation désactivée (session ouverte) : on quitte l'inscription sans le message", async ({ page }) => {
    await simulerInscription(page, true);
    // Le jeton est factice : le serveur le refuse et /ville renvoie vers
    // /connexion. Ce qui compte ici, c'est d'avoir quitté l'inscription
    // pour le jeu, sans afficher le message de confirmation.
    await expect(page).not.toHaveURL(/\/inscription/);
    await expect(page.locator(".toast")).toHaveCount(0);
  });
});
