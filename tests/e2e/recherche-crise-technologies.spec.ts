import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Malus de crise de la Recherche (docs/A-INTEGRER.md §42, migration 0051) : tant que la
 * jauge de Recherche est sous 60 %, avancer_technologies() ne débloque rien de nouveau ;
 * rien n'est perdu, et dès le retour à 60 % les paliers déjà atteints se débloquent.
 *
 * Les tests s'ignorent (la raison est affichée) tant que la migration 0051 n'est pas
 * appliquée à la base.
 */
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function creerCompteAvecVille(prefixe: string) {
  const email = `${prefixe}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: "mot-de-passe-test-e2e",
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`Impossible de créer ${prefixe} : ${error?.message}`);
  const userId = data.user.id;
  const { data: ville, error: erreurVille } = await supabaseAdmin.rpc("creer_ville", {
    p_owner_id: userId,
    p_pseudo: `${prefixe}-${Math.random().toString(36).slice(2, 6)}`,
    p_country_id: "FR",
    p_nom_ville: `${prefixe}-ville-${Math.random().toString(36).slice(2, 6)}`,
  });
  if (erreurVille) throw new Error(`Impossible de créer la ville de ${prefixe} : ${erreurVille.message}`);
  return { userId, email, motDePasse: "mot-de-passe-test-e2e", villeId: ville.id as string };
}

async function connecter(page: Page, email: string, motDePasse: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(motDePasse);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/ville$/, { timeout: 40_000 });
}

/** `ilYAJours` : date des visites (la jauge n'en retient que 180 jours, avec un élan qui décroît ; stock_ville() les compte toutes). */
async function donnerVisites(visiteurId: string, villeId: string, activite: string, n: number, ilYAJours = 0) {
  const base = Date.now() - ilYAJours * 86_400_000 - 120_000;
  const lignes = Array.from({ length: n }, (_, i) => {
    const d = new Date(base + i * 50);
    return {
      visiteur_id: visiteurId,
      ville_id: villeId,
      activite,
      jour: d.toISOString().slice(0, 10),
      created_at: d.toISOString(),
    };
  });
  const { error } = await supabaseAdmin.from("visites").insert(lignes);
  if (error) throw new Error(`donnerVisites a échoué : ${error.message}`);
}

/** Redate toutes les visites d'une activité d'une ville (sans en changer le nombre). */
async function dater(villeId: string, activite: string, ilYAJours: number) {
  const d = new Date(Date.now() - ilYAJours * 86_400_000 - 60_000);
  const { error } = await supabaseAdmin
    .from("visites")
    .update({ jour: d.toISOString().slice(0, 10), created_at: d.toISOString() })
    .eq("ville_id", villeId)
    .eq("activite", activite);
  if (error) throw new Error(`dater a échoué : ${error.message}`);
}

async function migration0051Appliquee() {
  const { error } = await supabaseAdmin.rpc("recherche_en_crise", { p_ville_id: "00000000-0000-0000-0000-000000000000" });
  return !error;
}

const paliers = async (villeId: string) =>
  ((await supabaseAdmin.from("technologies").select("palier").eq("ville_id", villeId).order("palier")).data ?? []).map(
    (t) => t.palier as number
  );

test.describe.configure({ mode: "serial" });

test.describe("Crise de la Recherche : pas de nouvelle technologie (§42)", () => {
  test("en crise rien ne se débloque ; au retour à 60 % les paliers atteints se débloquent d'un coup ; rien n'est retiré", async () => {
    test.skip(!(await migration0051Appliquee()), "migration 0051 pas encore appliquée à la base");
    const ville = await creerCompteAvecVille("j-recherche-crise");
    try {
      // 500 points de Recherche, mais anciens (élan presque éteint dans la jauge) face à 200 visites
      // récentes d'une autre activité : la Recherche est largement en crise (< 60 %).
      await donnerVisites(ville.userId, ville.villeId, "recherche", 500, 150);
      await donnerVisites(ville.userId, ville.villeId, "residentiel", 200);
      const { data: enCrise } = await supabaseAdmin.rpc("recherche_en_crise", { p_ville_id: ville.villeId });
      expect(enCrise).toBe(true);

      // Les paliers 0 (100 points) et 1 (300) sont atteints, mais gelés.
      await supabaseAdmin.rpc("avancer_technologies", { p_ville_id: ville.villeId });
      expect(await paliers(ville.villeId)).toEqual([]);

      // Ces mêmes visites deviennent récentes : la Recherche sort de la crise, les deux paliers
      // atteints se débloquent d'un coup (500 points : pas le palier 2, à 800).
      await dater(ville.villeId, "recherche", 0);
      const { data: apres } = await supabaseAdmin.rpc("recherche_en_crise", { p_ville_id: ville.villeId });
      expect(apres).toBe(false);
      await supabaseAdmin.rpc("avancer_technologies", { p_ville_id: ville.villeId });
      expect(await paliers(ville.villeId)).toEqual([0, 1]);

      // Retour en crise (visites de nouveau anciennes) avec 400 points de plus : le palier 2 (800)
      // est atteint mais gelé ; les deux premiers restent, rien n'est retiré.
      await dater(ville.villeId, "recherche", 150);
      await donnerVisites(ville.userId, ville.villeId, "recherche", 400, 150);
      const { data: denouveau } = await supabaseAdmin.rpc("recherche_en_crise", { p_ville_id: ville.villeId });
      expect(denouveau).toBe(true);
      await supabaseAdmin.rpc("avancer_technologies", { p_ville_id: ville.villeId });
      expect(await paliers(ville.villeId)).toEqual([0, 1]);
    } finally {
      await supabaseAdmin.auth.admin.deleteUser(ville.userId);
    }
  });

  // Pas besoin de la migration : l'avertissement se calcule depuis les jauges déjà lues par la page.
  test("Ma ville prévient que la Recherche est en crise, et le message disparaît quand elle en sort", async ({ page }) => {
    test.setTimeout(120_000);
    const ville = await creerCompteAvecVille("j-recherche-crise-ui");
    try {
      await donnerVisites(ville.userId, ville.villeId, "recherche", 20, 150);
      await donnerVisites(ville.userId, ville.villeId, "residentiel", 200);
      await connecter(page, ville.email, ville.motDePasse);
      const message = page.getByText("Recherche en crise : aucune nouvelle technologie");
      await expect(page.getByText("Technologies", { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(message).toBeVisible();

      await dater(ville.villeId, "recherche", 0);
      await donnerVisites(ville.userId, ville.villeId, "recherche", 300);
      await page.reload();
      await expect(page.getByText("Technologies", { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(message).toHaveCount(0);
    } finally {
      await supabaseAdmin.auth.admin.deleteUser(ville.userId);
    }
  });
});
