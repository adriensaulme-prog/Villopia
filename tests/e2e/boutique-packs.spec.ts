import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * La boutique de packs de thèmes (docs/A-INTEGRER.md §30) : l'onglet Boutique,
 * la section « Thèmes de la ville » de Ma ville, et le droit d'usage côté
 * serveur (migration 0047). Les packs sont purement cosmétiques.
 *
 * Les tests marqués « migration 0047 » s'ignorent tant que cette migration n'est
 * pas appliquée à la base (la raison est affichée) ; les autres passent avant
 * comme après, puisque sans la migration la boutique retombe sur « tout thème
 * connu est libre » (comportement de la migration 0034).
 *
 * Haussmannien est un pack PAYANT (décision d'Adrien, 05/10/2026) : les comptes de
 * test le reçoivent comme s'ils l'avaient acheté (`accorderHaussmannien`), sinon ils
 * ne pourraient pas l'appliquer. Aucun test ne modifie la ligne `haussmannien` de
 * `packs` : « gratuit ou payant » est une décision commerciale d'Adrien, qu'une
 * suite de tests ne doit jamais renverser, même un instant. Le droit d'usage se
 * teste avec un pack jetable (`e2e-payant`), et l'état « payant, pas possédé » avec
 * un compte neuf, sur la valeur réelle de la base.
 */
const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdmin = createClient(URL_SUPABASE, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function creerCompteAvecVille(prefixe: string) {
  const email = `${prefixe}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const motDePasse = "mot-de-passe-test-e2e";
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: motDePasse,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Impossible de créer ${prefixe} : ${error?.message}`);
  }
  const userId = data.user.id;
  const { data: ville, error: erreurVille } = await supabaseAdmin.rpc("creer_ville", {
    p_owner_id: userId,
    p_pseudo: `${prefixe}-${Math.random().toString(36).slice(2, 6)}`,
    p_country_id: "FR",
    p_nom_ville: `${prefixe}-ville-${Math.random().toString(36).slice(2, 6)}`,
  });
  if (erreurVille) {
    throw new Error(`Impossible de créer la ville de ${prefixe} : ${erreurVille.message}`);
  }
  return { userId, email, motDePasse, villeId: ville.id as string };
}

async function supprimerCompte(userId: string) {
  await supabaseAdmin.auth.admin.deleteUser(userId);
}

async function connecter(page: Page, email: string, motDePasse: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(motDePasse);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/ville$/, { timeout: 40_000 });
}

/** La fiche d'un pack, repérée par son titre (le nom d'un pack apparaît aussi dans la description d'un autre). */
const fiche = (page: Page, nom: string) =>
  page.locator(".pack-carte").filter({ has: page.getByRole("heading", { name: nom }) });

const themeEnBase = async (villeId: string) =>
  (await supabaseAdmin.from("cities").select("theme").eq("id", villeId).single()).data?.theme;

async function migration0047Appliquee() {
  const { error } = await supabaseAdmin.from("packs").select("id").limit(1);
  return !error;
}

/** La migration 0048 (cinq packs) est appliquée si le catalogue serveur connaît « nordique ». */
async function migration0048Appliquee() {
  const { data, error } = await supabaseAdmin.from("packs").select("id").eq("id", "nordique");
  return !error && (data ?? []).length > 0;
}

/**
 * Offre Haussmannien à un compte de test, comme un achat. Avant la migration 0047 la
 * table n'existe pas : l'erreur est ignorée, tout thème connu est libre.
 */
async function accorderHaussmannien(userId: string) {
  await supabaseAdmin.from("joueur_packs").insert({ joueur_id: userId, pack: "haussmannien", source: "attribution" });
}

test.describe.configure({ mode: "serial" });

test.describe("La boutique de packs de thèmes (§30)", () => {
  test("l'onglet Boutique : catalogue complet, aperçu sans rien enregistrer, application", async ({ page }) => {
    test.setTimeout(120_000);
    const maire = await creerCompteAvecVille("j-boutique-ui");
    await accorderHaussmannien(maire.userId);
    try {
      await connecter(page, maire.email, maire.motDePasse);

      // Onglet de la navigation (ordinateur), dernier de la barre.
      await page.getByRole("link", { name: "Boutique" }).first().click();
      await expect(page).toHaveURL(/\/boutique$/, { timeout: 40_000 });
      await expect(page.getByRole("heading", { name: "Boutique" })).toBeVisible({ timeout: 30_000 });

      // Le catalogue montre TOUS les packs, avec leur état.
      await expect(page.getByRole("heading", { name: "Classique" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Haussmannien" })).toBeVisible();
      const classique = fiche(page, "Classique");
      const haussmannien = fiche(page, "Haussmannien");
      await expect(classique).toContainText("Appliqué sur ta ville");
      await expect(haussmannien.getByRole("button", { name: "Appliquer : Haussmannien" })).toBeVisible();
      // Le principe est dit en clair : purement cosmétique.
      await expect(page.getByText("un pack ne donne jamais d'avantage dans le jeu")).toBeVisible();

      // Aperçu : bandeau, mais RIEN n'est enregistré.
      await haussmannien.getByRole("button", { name: "Aperçu : Haussmannien" }).click();
      await expect(page.locator(".pack-apercu")).toContainText("Aperçu sur ta ville");
      await page.waitForTimeout(1500);
      expect(await themeEnBase(maire.villeId)).toBe("classique");
      await page.getByRole("button", { name: "Terminer l'aperçu" }).click();
      await expect(page.locator(".pack-apercu")).toHaveCount(0);
      expect(await themeEnBase(maire.villeId)).toBe("classique");

      // Appliquer pour de bon : la carte change tout de suite, la base suit.
      await haussmannien.getByRole("button", { name: "Appliquer : Haussmannien" }).click();
      await expect(haussmannien).toContainText("Appliqué sur ta ville");
      await expect(classique.getByRole("button", { name: "Appliquer : Classique" })).toBeVisible();
      await expect.poll(() => themeEnBase(maire.villeId), { timeout: 20_000 }).toBe("haussmannien");
      await expect(page).toHaveURL(/\/boutique$/);
    } finally {
      await supprimerCompte(maire.userId);
    }
  });

  test("Ma ville : section « Thèmes de la ville », changement de thème sans quitter la page", async ({ page }) => {
    test.setTimeout(120_000);
    const maire = await creerCompteAvecVille("j-boutique-ville");
    await accorderHaussmannien(maire.userId);
    try {
      await connecter(page, maire.email, maire.motDePasse);

      // Section secondaire : repliée par défaut, comme les autres catalogues du panneau.
      const section = page.locator("details.packs-ville");
      await expect(section).toBeVisible({ timeout: 30_000 });
      await expect(section).not.toHaveAttribute("open", "");
      await expect(section.locator("summary")).toContainText("Classique");
      await section.locator("summary").click();

      // Les packs possédés, celui qui est appliqué, un moyen de changer.
      await expect(section.locator(".badge.good")).toHaveText("Appliqué");
      await section.getByRole("button", { name: "Appliquer : Haussmannien" }).click();
      await expect(section.locator("summary")).toContainText("Haussmannien");
      await expect.poll(() => themeEnBase(maire.villeId), { timeout: 20_000 }).toBe("haussmannien");
      await expect(page).toHaveURL(/\/ville$/);

      // Le lien vers la Boutique est là, pour le catalogue complet.
      await section.getByRole("link", { name: /Voir tous les packs dans la Boutique/ }).click();
      await expect(page).toHaveURL(/\/boutique$/, { timeout: 40_000 });
      await expect(fiche(page, "Haussmannien")).toContainText("Appliqué sur ta ville", {
        timeout: 30_000,
      });
    } finally {
      await supprimerCompte(maire.userId);
    }
  });

  test("mobile : la barre du bas garde ses 5 onglets, la Boutique s'ouvre depuis la barre du haut", async ({ page }) => {
    test.setTimeout(120_000);
    const maire = await creerCompteAvecVille("j-boutique-mobile");
    try {
      await page.setViewportSize({ width: 375, height: 812 });
      await connecter(page, maire.email, maire.motDePasse);

      await expect(page.locator(".tabbar .tab")).toHaveCount(6); // 6 liens dans le DOM...
      await expect(page.locator(".tabbar .tab:visible")).toHaveCount(5); // ...dont 5 visibles : la Boutique n'y est pas.
      const icone = page.locator(".topbar").getByRole("link", { name: "Boutique" });
      await expect(icone).toBeVisible();
      // Aucun débordement horizontal de la page.
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await icone.click();
      await expect(page).toHaveURL(/\/boutique$/, { timeout: 40_000 });
      await expect(page.getByRole("heading", { name: "Boutique" })).toBeVisible({ timeout: 30_000 });
    } finally {
      await supprimerCompte(maire.userId);
    }
  });

  test("la Boutique exige d'être connecté", async ({ page }) => {
    await page.goto("/boutique");
    await expect(page).toHaveURL(/\/connexion/);
  });

  test("un thème est purement cosmétique : changer de thème ne modifie aucune autre donnée de la ville", async () => {
    const maire = await creerCompteAvecVille("j-boutique-cosmetique");
    await accorderHaussmannien(maire.userId);
    try {
      const { data: avant } = await supabaseAdmin.from("cities").select("*").eq("id", maire.villeId).single();
      const { data: apres, error } = await supabaseAdmin.rpc("definir_theme_ville", {
        p_owner_id: maire.userId,
        p_ville_id: maire.villeId,
        p_theme: "haussmannien",
      });
      expect(error).toBeNull();
      // Toute la ligne est identique, sauf le thème.
      expect(apres).toEqual({ ...avant, theme: "haussmannien" });
    } finally {
      await supprimerCompte(maire.userId);
    }
  });

  test("les cinq packs d'A-INTEGRER §40 sont dans la Boutique, payants ; l'aperçu de chacun s'affiche dans la 3D sans rien enregistrer", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    // Avant les migrations 0047/0048, la boutique retombe sur « tout thème connu est libre » : l'état
    // « payant » ne se vérifie qu'une fois le catalogue serveur à jour (l'aperçu se teste dans tous les cas).
    const catalogueAJour = await migration0048Appliquee();
    const joueur = await creerCompteAvecVille("j-boutique-cinq");
    const packs: [string, string][] = [
      ["Bord de mer", "bord_de_mer"],
      ["Village de pierre", "village_de_pierre"],
      ["Quartier industriel reconverti", "quartier_industriel"],
      ["Futuriste / éco", "futuriste_eco"],
      ["Nordique", "nordique"],
    ];
    try {
      await connecter(page, joueur.email, joueur.motDePasse);
      await page.goto("/boutique");
      await expect(page.getByRole("heading", { name: "Boutique" })).toBeVisible({ timeout: 30_000 });
      for (const [nom] of packs) {
        const carte = fiche(page, nom);
        await expect(carte).toBeVisible();
        // Payants, pas encore achetables : l'aperçu seul est possible, jamais « Appliquer ».
        if (catalogueAJour) {
          await expect(carte).toContainText("Pack payant");
          await expect(carte.getByRole("button", { name: `Appliquer : ${nom}` })).toHaveCount(0);
        }
      }
      // Le pack Nordique couvre les trois familles : pas de mention « le reste reste Classique ».
      await expect(fiche(page, "Nordique")).not.toContainText("Classique");

      for (const [nom, id] of packs) {
        await fiche(page, nom).getByRole("button", { name: `Aperçu : ${nom}` }).click();
        await expect(page.locator(".pack-apercu")).toContainText("Aperçu sur ta ville");
        // La scène 3D porte le thème de l'aperçu (data-theme du canvas).
        await expect(page.locator(`canvas[data-theme="${id}"]`)).toHaveCount(1, { timeout: 30_000 });
      }
      expect(await themeEnBase(joueur.villeId)).toBe("classique");
    } finally {
      await supprimerCompte(joueur.userId);
    }
  });

  test("migration 0047 : Haussmannien (payant) sans l'avoir — refusé par le serveur, aperçu possible, « Acheter » désactivé", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    test.skip(!(await migration0047Appliquee()), "migration 0047 pas encore appliquée à la base");
    const { data: pack } = await supabaseAdmin.from("packs").select("gratuit").eq("id", "haussmannien").single();
    test.skip(pack?.gratuit !== false, "Haussmannien n'est pas (ou plus) un pack payant dans cette base");
    const joueur = await creerCompteAvecVille("j-boutique-payant");
    try {
      // Le serveur refuse : pack payant non possédé (P0030), thème inchangé.
      const { error } = await supabaseAdmin.rpc("definir_theme_ville", {
        p_owner_id: joueur.userId,
        p_ville_id: joueur.villeId,
        p_theme: "haussmannien",
      });
      expect(error?.code).toBe("P0030");
      expect(await themeEnBase(joueur.villeId)).toBe("classique");

      await connecter(page, joueur.email, joueur.motDePasse);
      await page.goto("/boutique");
      const haussmannien = fiche(page, "Haussmannien");
      await expect(haussmannien).toContainText("Pack payant", { timeout: 30_000 });
      // Le point d'entrée de l'achat est là, désactivé, avec sa raison ; pas d'« Appliquer ».
      await expect(haussmannien.getByRole("button", { name: "Acheter : Haussmannien" })).toBeDisabled();
      await expect(haussmannien).toContainText("L'achat n'est pas encore ouvert");
      await expect(haussmannien.getByRole("button", { name: "Appliquer : Haussmannien" })).toHaveCount(0);

      // L'aperçu reste possible (essayer avant d'acheter) et n'enregistre rien.
      await haussmannien.getByRole("button", { name: "Aperçu : Haussmannien" }).click();
      await expect(page.locator(".pack-apercu")).toContainText("Aperçu sur ta ville");
      await page.waitForTimeout(1500);
      expect(await themeEnBase(joueur.villeId)).toBe("classique");

      // Une fois obtenu (achat ou attribution), le pack s'applique.
      await accorderHaussmannien(joueur.userId);
      await page.goto("/boutique");
      await expect(fiche(page, "Haussmannien")).toContainText("Possédé", { timeout: 30_000 });
      await expect(fiche(page, "Haussmannien").getByRole("button", { name: "Appliquer : Haussmannien" })).toBeVisible();
      const { error: erreurApres } = await supabaseAdmin.rpc("definir_theme_ville", {
        p_owner_id: joueur.userId,
        p_ville_id: joueur.villeId,
        p_theme: "haussmannien",
      });
      expect(erreurApres).toBeNull();
    } finally {
      await supprimerCompte(joueur.userId);
    }
  });

  test("migration 0047 : le droit d'usage d'un pack (gratuit pour tous, payant seulement une fois obtenu)", async () => {
    test.skip(!(await migration0047Appliquee()), "migration 0047 pas encore appliquée à la base");
    const joueur = await creerCompteAvecVille("j-boutique-droit");
    const autre = await creerCompteAvecVille("j-boutique-autre");
    await supabaseAdmin.from("packs").delete().eq("id", "e2e-payant");
    try {
      await supabaseAdmin.from("packs").insert([{ id: "e2e-payant", gratuit: false }]);
      const possede = async (id: string, pack: string) =>
        (await supabaseAdmin.rpc("possede_pack", { p_joueur_id: id, p_pack: pack })).data;

      // Le Classique est gratuit pour tout le monde ; un pack inconnu n'est à personne.
      expect(await possede(joueur.userId, "classique")).toBe(true);
      expect(await possede(joueur.userId, "pack-qui-n-existe-pas")).toBe(false);

      // Un pack payant : à personne tant qu'il n'a pas été obtenu, puis au seul acquéreur.
      expect(await possede(joueur.userId, "e2e-payant")).toBe(false);
      const { error: erreurAttribution } = await supabaseAdmin
        .from("joueur_packs")
        .insert({ joueur_id: joueur.userId, pack: "e2e-payant", source: "attribution" });
      expect(erreurAttribution).toBeNull();
      expect(await possede(joueur.userId, "e2e-payant")).toBe(true);
      expect(await possede(autre.userId, "e2e-payant")).toBe(false);
    } finally {
      await supabaseAdmin.from("joueur_packs").delete().eq("pack", "e2e-payant");
      await supabaseAdmin.from("packs").delete().eq("id", "e2e-payant");
      await supprimerCompte(joueur.userId);
      await supprimerCompte(autre.userId);
    }
  });

  test("migration 0047 : un joueur ne peut ni s'attribuer un pack, ni modifier le catalogue, ni voir les packs des autres", async () => {
    test.skip(!(await migration0047Appliquee()), "migration 0047 pas encore appliquée à la base");
    const joueur = await creerCompteAvecVille("j-boutique-rls");
    const autre = await creerCompteAvecVille("j-boutique-rls2");
    try {
      await supabaseAdmin.from("joueur_packs").insert({ joueur_id: autre.userId, pack: "haussmannien", source: "attribution" });

      // Client « navigateur » : jeton du joueur, clé publique, soumis aux règles de sécurité.
      const client = createClient(URL_SUPABASE, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error: erreurConnexion } = await client.auth.signInWithPassword({
        email: joueur.email,
        password: joueur.motDePasse,
      });
      expect(erreurConnexion).toBeNull();

      // Le catalogue se lit, mais ne s'écrit pas.
      const { data: catalogue } = await client.from("packs").select("id, gratuit");
      // Au moins les deux packs d'origine (les cinq de la migration 0048 s'y ajoutent une fois celle-ci appliquée).
      expect((catalogue ?? []).map((l) => l.id)).toEqual(expect.arrayContaining(["classique", "haussmannien"]));
      const modif = await client.from("packs").update({ gratuit: true }).eq("id", "haussmannien").select();
      expect(modif.data ?? []).toHaveLength(0);

      // Pas de fausse attribution : aucune policy d'écriture sur joueur_packs.
      const { error: erreurInsertion } = await client
        .from("joueur_packs")
        .insert({ joueur_id: joueur.userId, pack: "haussmannien", source: "achat" });
      expect(erreurInsertion).not.toBeNull();

      // Il ne voit que SES lignes (aucune ici), jamais celles de l'autre joueur.
      const { data: miennes } = await client.from("joueur_packs").select("joueur_id, pack");
      expect(miennes ?? []).toEqual([]);
    } finally {
      await supabaseAdmin.from("joueur_packs").delete().in("joueur_id", [joueur.userId, autre.userId]);
      await supprimerCompte(joueur.userId);
      await supprimerCompte(autre.userId);
    }
  });
});
