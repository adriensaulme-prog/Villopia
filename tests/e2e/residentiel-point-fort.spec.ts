import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Point fort du Résidentiel (docs/A-INTEGRER.md §42, migration 0049) : au-dessus de 120 %
 * de jauge, une visite a une chance de rapporter un habitant DE PLUS (jusqu'à 25 % à
 * 150 %), du même côté que la crise du logement (sous 60 %, déjà testée dans
 * jalon18-effets-equilibre.spec.ts). Client service_role recréé ici pour la même raison
 * que les specs précédentes ("server-only" hors du pipeline Next.js).
 *
 * Les tests marqués « migration 0049 » s'ignorent tant que cette migration n'est pas
 * appliquée à la base : sans elle, le Résidentiel n'a pas de point fort et la fonction
 * testée n'existe pas. Le garde de schéma sans base (tests/unit/residentielPointFort.test.ts)
 * tourne, lui, dans tous les cas.
 */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function migration0049Appliquee() {
  const { error } = await supabaseAdmin.rpc("bonus_croissance_residentiel", { p_jauge: 1 });
  return error === null;
}

async function creerCompteAvecVille(prefixe: string) {
  const email = `${prefixe}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: "mot-de-passe-test-e2e",
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
  return { userId, villeId: ville.id as string };
}

async function supprimerCompte(userId: string) {
  await supabaseAdmin.auth.admin.deleteUser(userId);
}

/**
 * Pousse une activité loin devant pour une ville, sans vrais visiteurs : insère `nbJours`
 * visites datées de jours différents depuis UN SEUL compte (élan ≈ 30,3 × (1 − 0,967^n),
 * décroissance de 3,3 % par jour, voir jauges_ville()).
 */
async function gonflerActivite(visiteurId: string, villeId: string, activite: string, nbJours: number) {
  const lignes = Array.from({ length: nbJours }, (_, i) => {
    const date = new Date(Date.now() - (i + 3) * 24 * 60 * 60 * 1000);
    return {
      visiteur_id: visiteurId,
      ville_id: villeId,
      activite,
      jour: date.toISOString().slice(0, 10),
      created_at: date.toISOString(),
    };
  });
  const { error } = await supabaseAdmin.from("visites").insert(lignes);
  if (error) {
    throw new Error(`gonflerActivite a échoué : ${error.message}`);
  }
}

test.describe.configure({ mode: "serial" });

test.describe("Point fort du Résidentiel (A-INTEGRER §42)", () => {
  test("migration 0049 : la chance d'un habitant de plus est nulle jusqu'à 120 %, puis monte jusqu'à 25 % à 150 %", async () => {
    test.skip(!(await migration0049Appliquee()), "migration 0049 pas encore appliquée à la base");

    const chance = async (jauge: number) => {
      const { data, error } = await supabaseAdmin.rpc("bonus_croissance_residentiel", { p_jauge: jauge });
      expect(error).toBeNull();
      return Number(data);
    };

    // Crise et zone équilibrée : jamais de bonus (la crise a son propre effet, en sens inverse).
    expect(await chance(0)).toBe(0);
    expect(await chance(0.5)).toBe(0);
    expect(await chance(1)).toBe(0);
    expect(await chance(1.2)).toBe(0);
    // Progressif entre 120 % et 150 %, puis plafonné.
    expect(await chance(1.35)).toBeCloseTo(0.125, 5);
    expect(await chance(1.5)).toBeCloseTo(0.25, 5);
    expect(await chance(3)).toBeCloseTo(0.25, 5);
  });

  test("migration 0049 : sur une ville au point fort, des visites rapportent parfois 2 habitants — jamais plus, et le gain réel est enregistré", async () => {
    test.skip(!(await migration0049Appliquee()), "migration 0049 pas encore appliquée à la base");
    test.setTimeout(240_000);

    const cible = await creerCompteAvecVille("rpf-cible");
    const gonfleur = await creerCompteAvecVille("rpf-gonfleur");
    const visiteur = await creerCompteAvecVille("rpf-visiteur");
    try {
      // 90 jours de Résidentiel seul : élan ≈ 29, jauge = (29 + 6) / (29 + 20) / 0,3 ≈ 2,4,
      // bien au-delà des 150 % du plafond. Hameau : ni Commerce ni solidarité, donc le
      // seul bonus possible est celui du Résidentiel.
      await gonflerActivite(gonfleur.userId, cible.villeId, "residentiel", 90);
      const { data: jauge } = await supabaseAdmin.rpc("jauge_activite", {
        p_ville_id: cible.villeId,
        p_activite: "residentiel",
      });
      expect(Number(jauge)).toBeGreaterThan(1.5);

      const { data: avant } = await supabaseAdmin.from("cities").select("population").eq("id", cible.villeId).single();

      // Un seul visiteur : après chaque visite, on la recule de quelques jours pour rendre le
      // délai d'une heure et le plafond quotidien, qui ne sont pas l'objet de ce test.
      const NB_VISITES = 50;
      const gains: number[] = [];
      for (let i = 0; i < NB_VISITES; i++) {
        const { data, error } = await supabaseAdmin.rpc("visiter_ville", {
          p_visiteur_id: visiteur.userId,
          p_ville_id: cible.villeId,
        });
        expect(error).toBeNull();
        gains.push((data as { gain: number }).gain);
        const date = new Date(Date.now() - (i + 100) * 24 * 60 * 60 * 1000);
        const { error: erreurRecul } = await supabaseAdmin
          .from("visites")
          .update({ created_at: date.toISOString(), jour: date.toISOString().slice(0, 10) })
          .eq("visiteur_id", visiteur.userId)
          .eq("ville_id", cible.villeId)
          .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
        expect(erreurRecul).toBeNull();
      }

      const total = gains.reduce((a, b) => a + b, 0);
      // Sans l'effet, chaque visite rapporte exactement 1 habitant (jauge > 60 %). Avec une
      // chance de 25 % par visite, la probabilité qu'AUCUNE des 50 visites ne rapporte 2
      // habitants est 0,75^50 ≈ 6×10⁻⁷ : si ce test échoue ici, le point fort n'agit plus.
      expect(total).toBeGreaterThan(NB_VISITES);
      // Jamais plus de 2 : un seul bonus possible dans ce cadre.
      expect(Math.max(...gains)).toBeLessThanOrEqual(2);
      expect(Math.min(...gains)).toBe(1);

      // Le gain réel (bonus compris) est celui qui a été ajouté à la population ET celui que
      // retient la visite (pour pouvoir l'annuler, §34).
      const { data: apres } = await supabaseAdmin.from("cities").select("population").eq("id", cible.villeId).single();
      expect((apres?.population ?? 0) - (avant?.population ?? 0)).toBe(total);
      const { data: lignes } = await supabaseAdmin
        .from("visites")
        .select("gain")
        .eq("visiteur_id", visiteur.userId)
        .eq("ville_id", cible.villeId);
      expect((lignes ?? []).reduce((somme, l) => somme + (l.gain as number), 0)).toBe(total);
    } finally {
      await supprimerCompte(cible.userId);
      await supprimerCompte(gonfleur.userId);
      await supprimerCompte(visiteur.userId);
    }
  });
});
