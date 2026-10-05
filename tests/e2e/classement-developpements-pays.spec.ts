import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Classement hebdomadaire des pays (A-INTEGRER §47, migration 0052), avis des pays visés (0053) et
 * développements nationaux (§48, 0054), sur la base de dev.
 *
 * Les tests s'ignorent tant que la migration 0054 n'est pas appliquée à la base (sans elle, aucune de
 * ces fonctions n'existe) ; le garde de schéma sans base (tests/unit/paysSchema.test.ts) et les tests de
 * parité (developpements.test.ts, classementPays.test.ts) tournent, eux, dans tous les cas. Le même
 * scénario a été exécuté dans un Postgres local jetable avant d'écrire cette spec (DECISIONS.md §4).
 *
 * Isolation : trois pays peu utilisés par les autres specs (NO, DK, FI) et des ressources déposées sur
 * des SEMAINES PASSÉES DISTINCTES (un joueur ne vote qu'une fois par semaine), assez nombreuses pour être
 * n°1 quel que soit le contenu de la base. Tout est nettoyé en fin de test.
 */
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PAYS = ["NO", "DK", "FI"] as const;

async function migrationsAppliquees() {
  const { error } = await supabaseAdmin.rpc("developpements_catalogue");
  return error === null;
}

/** Lundi (UTC) de la semaine courante, "YYYY-MM-DD" (même convention que date_trunc('week', ...)). */
function lundiCourant(): string {
  const maintenant = new Date();
  const jour = maintenant.getUTCDay();
  const depuisLundi = jour === 0 ? 6 : jour - 1;
  return new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate() - depuisLundi))
    .toISOString()
    .slice(0, 10);
}
/** Le lundi `n` semaines avant la semaine courante (n ≥ 1 = semaine passée). */
function semainePassee(n: number): string {
  const [a, m, j] = lundiCourant().split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j - 7 * n)).toISOString().slice(0, 10);
}

async function creerCompteAvecVille(prefixe: string, paysId: string) {
  const email = `${prefixe}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const motDePasse = "mot-de-passe-test-e2e";
  const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password: motDePasse, email_confirm: true });
  if (error || !data.user) throw new Error(`Impossible de créer ${prefixe} : ${error?.message}`);
  const userId = data.user.id;
  const { data: ville, error: erreurVille } = await supabaseAdmin.rpc("creer_ville", {
    p_owner_id: userId,
    p_pseudo: `${prefixe}-${Math.random().toString(36).slice(2, 6)}`,
    p_country_id: paysId,
    p_nom_ville: `${prefixe}-ville-${Math.random().toString(36).slice(2, 6)}`,
  });
  if (erreurVille) throw new Error(`Impossible de créer la ville de ${prefixe} : ${erreurVille.message}`);
  return { userId, email, motDePasse, villeId: ville.id as string };
}

/** `nb` ressources déposées pour un pays, une par semaine passée distincte, avec UN seul joueur. */
async function deposerRessources(joueurId: string, paysId: string, categorie: string, nb: number, premiereSemaine = 1) {
  const lignes = Array.from({ length: nb }, (_, i) => ({
    joueur_id: joueurId,
    country_id: paysId,
    categorie,
    semaine: semainePassee(premiereSemaine + i),
  }));
  const { error } = await supabaseAdmin.from("votes_pays").insert(lignes);
  if (error) throw new Error(`deposerRessources a échoué : ${error.message}`);
}

async function nettoyer(userIds: string[]) {
  for (const id of userIds) await supabaseAdmin.auth.admin.deleteUser(id); // supprime aussi leurs votes (cascade)
  await supabaseAdmin.from("developpements_pays").delete().in("country_id", [...PAYS]);
  await supabaseAdmin.from("resultats_developpement").delete().in("country_id", [...PAYS]);
  await supabaseAdmin.from("resultats_diplomatiques").delete().in("country_id", [...PAYS]);
  await supabaseAdmin.from("propositions_diplomatiques").delete().in("country_id", [...PAYS]);
  await supabaseAdmin.from("conflits").delete().in("pays_attaquant_id", [...PAYS]);
}

async function connecter(page: import("@playwright/test").Page, email: string, motDePasse: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(motDePasse);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

test.describe.configure({ mode: "serial" });

test.describe("Classement des pays et développements nationaux (A-INTEGRER §47, §48)", () => {
  test("migration 0052 : le classement ne compte que les semaines passées, figé toute la semaine, et le n°1 reçoit ses effets", async () => {
    test.skip(!(await migrationsAppliquees()), "migrations 0052 à 0054 pas encore appliquées à la base");
    test.setTimeout(120_000);

    const no = await creerCompteAvecVille("clp-no", "NO");
    const dk = await creerCompteAvecVille("clp-dk", "DK");
    const fi = await creerCompteAvecVille("clp-fi", "FI");
    try {
      await deposerRessources(no.userId, "NO", "industrie", 60);
      await deposerRessources(dk.userId, "DK", "industrie", 50);
      await deposerRessources(fi.userId, "FI", "industrie", 40);
      // Un vote de CETTE semaine ne compte pas encore : le classement reste figé jusqu'au lundi.
      const { error } = await supabaseAdmin
        .from("votes_pays")
        .insert({ joueur_id: fi.userId, country_id: "FI", categorie: "industrie", semaine: lundiCourant() });
      expect(error).toBeNull();

      const total = async (pays: string, semaine: string) => {
        const { data } = await supabaseAdmin.rpc("valeur_classement_pays", { p_country_id: pays, p_categorie: "industrie", p_semaine: semaine });
        return Number(data);
      };
      expect(await total("FI", lundiCourant())).toBe(40);
      const lundiSuivant = new Date(Date.parse(lundiCourant()) + 7 * 86_400_000).toISOString().slice(0, 10);
      expect(await total("FI", lundiSuivant)).toBe(41); // le lundi suivant, ce vote compte

      const rang = async (pays: string) => {
        const { data } = await supabaseAdmin.rpc("classement_pays_vue", { p_country_id: pays, p_semaine: null });
        return (data as { categorie: string; rang: number | null; total: number }[]).find((l) => l.categorie === "industrie")!;
      };
      expect([(await rang("NO")).rang, (await rang("DK")).rang, (await rang("FI")).rang]).toEqual([1, 2, 3]);

      const premier = async (pays: string) =>
        (await supabaseAdmin.rpc("pays_est_premier", { p_country_id: pays, p_categorie: "industrie", p_semaine: null })).data;
      expect([await premier("NO"), await premier("DK")]).toEqual([true, false]);

      // Effets : Industrie n°1 → +15 % d'effort ; Culture n°1 absent → pas de voix au chapitre.
      const effet = async (fonction: string, pays: string) => Number((await supabaseAdmin.rpc(fonction, { p_country_id: pays })).data);
      expect(await effet("bonus_effort_guerre_pays", "NO")).toBeCloseTo(0.15, 5);
      expect(await effet("bonus_effort_guerre_pays", "DK")).toBe(0);
      expect(await effet("poids_voix_diplomatique_pays", "NO")).toBe(0);
    } finally {
      await nettoyer([no.userId, dk.userId, fi.userId]);
    }
  });

  test("migration 0053 : l'avis d'un pays visé n'est ouvert qu'à un pays qui a voix au chapitre, pèse son poids, et compte dans le verdict", async () => {
    test.skip(!(await migrationsAppliquees()), "migrations 0052 à 0054 pas encore appliquées à la base");
    test.setTimeout(120_000);

    const no = await creerCompteAvecVille("clp-avis-no", "NO");
    const dk = await creerCompteAvecVille("clp-avis-dk", "DK");
    const fi = await creerCompteAvecVille("clp-avis-fi", "FI");
    try {
      await deposerRessources(dk.userId, "DK", "culture", 60); // DK n°1 en Culture
      const { data: proposition, error } = await supabaseAdmin
        .from("propositions_diplomatiques")
        .insert({ country_id: "NO", pays_cible_id: "DK", categorie: "rivalite", semaine: lundiCourant(), proposee_par_ville_id: no.villeId })
        .select("id")
        .single();
      expect(error).toBeNull();

      const avis = (joueurId: string, position = "contre") =>
        supabaseAdmin.rpc("donner_avis_decision", { p_joueur_id: joueurId, p_proposition_id: proposition!.id, p_position: position });
      expect((await avis(no.userId)).error?.code).toBe("P0031"); // le pays proposant n'est pas le pays visé
      expect((await avis(fi.userId)).error?.code).toBe("P0031"); // un pays non visé non plus
      expect((await avis(dk.userId)).error).toBeNull(); // le pays visé, n°1 Culture : accepté
      expect((await avis(dk.userId)).error?.code).toBe("23505"); // une seule fois par décision

      const { data: ligne } = await supabaseAdmin.from("avis_diplomatie").select("poids, position").eq("proposition_id", proposition!.id).single();
      expect([Number(ligne!.poids), ligne!.position]).toEqual([2, "contre"]);
      const { data: decompte } = await supabaseAdmin.rpc("avis_decision_semaine", { p_country_id: "NO", p_semaine: null });
      const l = Array.isArray(decompte) ? decompte[0] : decompte;
      expect([Number(l.avis_pour), Number(l.avis_contre)]).toEqual([0, 2]);
    } finally {
      await nettoyer([no.userId, dk.userId, fi.userId]);
    }
  });

  test("migration 0054 : un développement voté est financé quand le stock le couvre, sinon reproposé ; effets et stock cohérents", async () => {
    test.skip(!(await migrationsAppliquees()), "migrations 0052 à 0054 pas encore appliquées à la base");
    test.setTimeout(120_000);

    const no = await creerCompteAvecVille("clp-dev-no", "NO");
    const no2 = await creerCompteAvecVille("clp-dev-no2", "NO");
    try {
      // 60 Industrie (n°1) et 5 Technologie, déposées avant les semaines de vote simulées ci-dessous.
      // Deux joueurs : un même joueur ne vote qu'une fois par semaine, les semaines 10 à 14 serviraient deux fois.
      await deposerRessources(no.userId, "NO", "industrie", 60, 1);
      await deposerRessources(no2.userId, "NO", "techno", 5, 10);

      const { data: catalogue } = await supabaseAdmin.rpc("developpements_catalogue");
      expect((catalogue as unknown[]).length).toBe(9);

      // Options de la semaine : une par famille, stables.
      const options = async () =>
        ((await supabaseAdmin.rpc("options_developpement", { p_country_id: "NO", p_semaine: null })).data as { developpement: string; famille: string; report: boolean }[]);
      const avant = await options();
      expect(avant.map((o) => o.famille)).toEqual(["attaque", "defense", "developpement"]);
      expect((await options()).map((o) => o.developpement)).toEqual(avant.map((o) => o.developpement));

      // Vote réel de la semaine : refusé hors options, accepté pour une option, une seule fois.
      const voter = (joueurId: string, dev: string) => supabaseAdmin.rpc("voter_developpement", { p_joueur_id: joueurId, p_developpement: dev });
      expect((await voter(no.userId, "inconnu")).error?.code).toBe("P0034");
      expect((await voter(no.userId, avant[0].developpement)).error).toBeNull();
      expect((await voter(no.userId, avant[1].developpement)).error?.code).toBe("23505");

      // Semaines passées simulées (insertion directe) : l'arsenal (6 Industrie + 4 Technologie) est financé,
      // les fortifications (8 Industrie + 4 Technologie) ne le sont plus : il ne reste qu'1 Technologie.
      await supabaseAdmin.from("votes_developpement").delete().eq("joueur_id", no.userId);
      const voteDev = (joueurId: string, dev: string, semaine: string) =>
        supabaseAdmin.from("votes_developpement").insert({ joueur_id: joueurId, country_id: "NO", developpement: dev, semaine });
      expect((await voteDev(no.userId, "arsenal_national", semainePassee(5))).error).toBeNull();
      expect((await voteDev(no2.userId, "arsenal_national", semainePassee(5))).error).toBeNull();
      expect((await voteDev(no.userId, "fortifications", semainePassee(3))).error).toBeNull();
      expect((await supabaseAdmin.rpc("resoudre_developpement_pays", { p_country_id: "NO" })).error).toBeNull();

      const { data: resultats } = await supabaseAdmin.from("resultats_developpement").select("semaine, developpement, finance").eq("country_id", "NO").order("semaine");
      expect((resultats ?? []).map((r) => [r.developpement, r.finance])).toEqual([["arsenal_national", true], ["fortifications", false]]);

      const { data: stock } = await supabaseAdmin.rpc("stock_pays", { p_country_id: "NO" });
      const parCategorie = Object.fromEntries((stock as { categorie: string; production: number; depense: number; stock: number }[]).map((s) => [s.categorie, s]));
      expect([Number(parCategorie.industrie.production), Number(parCategorie.industrie.depense), Number(parCategorie.industrie.stock)]).toEqual([60, 6, 54]);
      expect([Number(parCategorie.techno.production), Number(parCategorie.techno.depense), Number(parCategorie.techno.stock)]).toEqual([5, 4, 1]);

      // Les fortifications non financées reviennent au vote de cette semaine, marquées reconduites.
      const apres = await options();
      expect(apres.find((o) => o.famille === "defense")).toMatchObject({ developpement: "fortifications", report: true });
      expect(apres.find((o) => o.famille === "attaque")!.developpement).not.toBe("arsenal_national");

      // Effets : Arsenal (+20 %) et Industrie n°1 (+15 %) : l'attaquant a ×1,35 ; le défenseur ×1,15.
      const multiplicateur = async (role: string) =>
        Number((await supabaseAdmin.rpc("multiplicateur_effort_pays", { p_country_id: "NO", p_role: role, p_jour: new Date().toISOString().slice(0, 10), p_premier_jour: false })).data);
      expect(await multiplicateur("attaquant")).toBeCloseTo(1.35, 5);
      expect(await multiplicateur("defenseur")).toBeCloseTo(1.15, 5);
    } finally {
      await nettoyer([no.userId, no2.userId]);
    }
  });

  test("l'écran /pays : onglets, classement avec effet actif, vote de développement puis stock et acquis", async ({ page }) => {
    test.skip(!(await migrationsAppliquees()), "migrations 0052 à 0054 pas encore appliquées à la base");
    test.setTimeout(150_000);

    const no = await creerCompteAvecVille("clp-ui-no", "NO");
    try {
      await deposerRessources(no.userId, "NO", "industrie", 60, 1);
      await connecter(page, no.email, no.motDePasse);
      await expect(page).toHaveURL(/\/ville/, { timeout: 40_000 });

      // « Cette semaine » (par défaut) : le vote de ressource ET le vote de développement.
      await page.goto("/pays");
      await expect(page.getByRole("heading", { name: "Vote hebdomadaire" })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole("heading", { name: "Vote de développement" })).toBeVisible();
      await page.getByRole("button", { name: "Voter" }).first().click();
      await expect(page.getByText("Tu as voté pour").first()).toBeVisible({ timeout: 20_000 });

      // « Classement » : l'Industrie est en tête, effet actif.
      await page.getByRole("navigation", { name: "Pays" }).getByRole("link", { name: "Classement", exact: true }).click();
      await expect(page).toHaveURL(/onglet=classement/);
      await expect(page.getByRole("heading", { name: "Classement mondial des pays" })).toBeVisible({ timeout: 20_000 });
      const carteIndustrie = page.locator(".ligne-classement", { hasText: "Industrie" });
      await expect(carteIndustrie).toContainText("Rang 1");
      await expect(carteIndustrie).toContainText("Effet actif");

      // « Développement » : stock, catalogue des neuf développements, aucun débloqué.
      await page.getByRole("navigation", { name: "Pays" }).getByRole("link", { name: "Développement", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Stock de ressources" })).toBeVisible({ timeout: 20_000 });
      await expect(page.locator(".dev-carte")).toHaveCount(9);
      await expect(page.getByText("Aucun développement débloqué pour l'instant.")).toBeVisible();
    } finally {
      await nettoyer([no.userId]);
    }
  });
});
