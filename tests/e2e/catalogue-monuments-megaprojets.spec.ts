import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { CATALOGUE_BATIMENTS, catalogueParSeuil } from "../../src/lib/game/monuments";

/**
 * A-INTEGRER §41 (décision d'Adrien, 05/10/2026, migration 0050) : plus de
 * ressources de ville ni de financement ; les mégaprojets rejoignent le
 * catalogue à seuils d'influence des monuments, débloqués automatiquement
 * par `influence_max`, avec leurs bonus permanents conservés. Remplace
 * jalon20-megaprojets.spec.ts (choix du maire et financement, supprimés).
 *
 * À JOUER APRÈS AVOIR APPLIQUÉ LA MIGRATION 0050 sur la base de dev, puis
 * `notify pgrst, 'reload schema';` : avant, la fonction monument_catalogue()
 * n'a pas ses nouvelles colonnes et le premier test échoue. Client
 * service_role recréé ici pour la même raison que les specs précédentes
 * ("server-only" hors du pipeline Next.js).
 */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

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
  return { userId, villeId: ville.id as string };
}

async function supprimerCompte(userId: string) {
  await supabaseAdmin.auth.admin.deleteUser(userId);
}

async function donnerVisites(visiteurId: string, villeId: string, activite: string, n: number) {
  const lignes = Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.now() - 60_000 + i * 50);
    return { visiteur_id: visiteurId, ville_id: villeId, activite, jour: d.toISOString().slice(0, 10), created_at: d.toISOString() };
  });
  const { error } = await supabaseAdmin.from("visites").insert(lignes);
  if (error) throw new Error(`donnerVisites a échoué : ${error.message}`);
}

const paliersAttendus = (influenceMax: number) =>
  CATALOGUE_BATIMENTS.filter((e) => e.seuil <= influenceMax)
    .map((e) => e.palier)
    .sort((a, b) => a - b);

test.describe.configure({ mode: "serial" });

test.describe("A-INTEGRER §41 — catalogue unifié monuments + mégaprojets", () => {
  test("le catalogue de la base est exactement celui du code (34 entrées, seuils, familles, activités)", async () => {
    const { data, error } = await supabaseAdmin.rpc("monument_catalogue");
    expect(error).toBeNull();
    const enBase = (data as { palier: number; seuil: number; type: string; famille: string; activite: string | null }[])
      .map((e) => ({ palier: e.palier, seuil: e.seuil, type: e.type, famille: e.famille, activite: e.activite }))
      .sort((a, b) => a.palier - b.palier);
    const code = CATALOGUE_BATIMENTS.map((e) => ({
      palier: e.palier,
      seuil: e.seuil,
      type: e.type,
      famille: e.famille,
      activite: e.activite,
    }));
    expect(enBase).toEqual(code);
    expect(enBase.filter((e) => e.famille === "monument")).toHaveLength(16);
    expect(enBase.filter((e) => e.famille === "megaprojet")).toHaveLength(18);
  });

  test("sabotage : le financement a disparu — fonctions, table et colonnes de dépense n'existent plus", async () => {
    for (const [fonction, args] of [
      ["choisir_megaprojet", { p_owner_id: "00000000-0000-0000-0000-000000000000", p_ville_id: "00000000-0000-0000-0000-000000000000", p_palier: 0, p_type: "grande_ecole" }],
      ["avancer_megaprojets", { p_ville_id: "00000000-0000-0000-0000-000000000000" }],
      ["etat_megaprojets", { p_ville_id: "00000000-0000-0000-0000-000000000000" }],
      ["cout_megaprojet", { p_palier: 0 }],
      ["nb_megaprojets_ouverts", { p_population: 1000 }],
    ] as const) {
      const { error } = await supabaseAdmin.rpc(fonction, args);
      expect(error, `${fonction} devrait ne plus exister`).not.toBeNull();
    }
    expect((await supabaseAdmin.from("megaprojets").select("id").limit(1)).error).not.toBeNull();
    expect((await supabaseAdmin.from("cities").select("materiaux_depenses").limit(1)).error).not.toBeNull();
    expect((await supabaseAdmin.from("cities").select("revenus_depenses").limit(1)).error).not.toBeNull();
  });

  test("déblocage automatique par le record d'influence : monuments et mégaprojets ensemble, une seule fois, jamais retiré", async () => {
    const ville = await creerCompteAvecVille("c41-deblocage");
    try {
      // Ville neuve : rien.
      await supabaseAdmin.rpc("avancer_monuments", { p_ville_id: ville.villeId });
      const { data: aucun } = await supabaseAdmin.from("monuments").select("palier").eq("ville_id", ville.villeId);
      expect(aucun).toHaveLength(0);

      // 2 000 : 7 monuments (jusqu'à l'horloge à 1 000) et 4 mégaprojets (dont l'Hôpital), d'un coup.
      await supabaseAdmin.from("cities").update({ influence_max: 2000 }).eq("id", ville.villeId);
      await supabaseAdmin.rpc("avancer_monuments", { p_ville_id: ville.villeId });
      const lire = async () =>
        ((await supabaseAdmin.from("monuments").select("palier").eq("ville_id", ville.villeId)).data ?? [])
          .map((m) => m.palier as number)
          .sort((a, b) => a - b);
      expect(await lire()).toEqual(paliersAttendus(2000));
      expect((await lire()).filter((p) => p >= 16)).toEqual([16, 17, 18, 19]);

      // Un événement de bulletin par déblocage, dans l'ordre des seuils ; aucun « mégaprojet construit » nouveau.
      const { data: evenements } = await supabaseAdmin
        .from("city_events")
        .select("type, valeur")
        .eq("ville_id", ville.villeId)
        .order("created_at", { ascending: true });
      expect(evenements?.every((e) => e.type === "monument_debloque")).toBe(true);
      expect([...(evenements ?? []).map((e) => e.valeur as number)].sort((a, b) => a - b)).toEqual(paliersAttendus(2000));

      // Idempotent, même sans nouveau seuil.
      await supabaseAdmin.rpc("avancer_monuments", { p_ville_id: ville.villeId });
      expect(await lire()).toEqual(paliersAttendus(2000));
      const { count: nbEvenements } = await supabaseAdmin
        .from("city_events")
        .select("id", { count: "exact", head: true })
        .eq("ville_id", ville.villeId);
      expect(nbEvenements).toBe(paliersAttendus(2000).length);

      // 3 500 : le monument de 2 500 et le Stade (3 500), seulement eux.
      await supabaseAdmin.from("cities").update({ influence_max: 3500 }).eq("id", ville.villeId);
      await supabaseAdmin.rpc("avancer_monuments", { p_ville_id: ville.villeId });
      expect(await lire()).toEqual(paliersAttendus(3500));
      expect(paliersAttendus(3500).length - paliersAttendus(2000).length).toBe(2);

      // Jamais retiré : l'influence courante peut s'effondrer, le record reste.
      await supabaseAdmin.from("cities").update({ influence: 0 }).eq("id", ville.villeId);
      await supabaseAdmin.rpc("avancer_monuments", { p_ville_id: ville.villeId });
      expect(await lire()).toEqual(paliersAttendus(3500));
    } finally {
      await supprimerCompte(ville.userId);
    }
  });

  test("sabotage : deux affichages simultanés ne créent ni doublon de ligne ni doublon d'événement", async () => {
    const ville = await creerCompteAvecVille("c41-concurrence");
    try {
      await supabaseAdmin.from("cities").update({ influence_max: 6000 }).eq("id", ville.villeId);
      await Promise.all([
        supabaseAdmin.rpc("avancer_monuments", { p_ville_id: ville.villeId }),
        supabaseAdmin.rpc("avancer_monuments", { p_ville_id: ville.villeId }),
        supabaseAdmin.rpc("avancer_monuments", { p_ville_id: ville.villeId }),
      ]);
      const attendus = paliersAttendus(6000);
      const { data: lignes } = await supabaseAdmin.from("monuments").select("palier").eq("ville_id", ville.villeId);
      expect(lignes).toHaveLength(attendus.length);
      const { count } = await supabaseAdmin
        .from("city_events")
        .select("id", { count: "exact", head: true })
        .eq("ville_id", ville.villeId)
        .eq("type", "monument_debloque");
      expect(count).toBe(attendus.length);
    } finally {
      await supprimerCompte(ville.userId);
    }
  });

  test("sabotage : Hôpital (2 000) divise encore par deux l'effet d'une contamination", async () => {
    const temoin = await creerCompteAvecVille("c41-hopital-temoin");
    const protegee = await creerCompteAvecVille("c41-hopital-protegee");
    // Deux attaquants distincts : l'anti-rafale de 2 s porte sur le DERNIER attaquant, toutes cibles confondues.
    const attaquant1 = await creerCompteAvecVille("c41-hopital-attaquant1");
    const attaquant2 = await creerCompteAvecVille("c41-hopital-attaquant2");
    try {
      await supabaseAdmin
        .from("cities")
        .update({ population: 1_000_000, population_max: 1_000_000 })
        .in("id", [temoin.villeId, protegee.villeId]);
      // Le seuil de l'Hôpital est 2 000 : la témoin reste juste en dessous, la protégée l'atteint.
      await supabaseAdmin.from("cities").update({ influence_max: 1999 }).eq("id", temoin.villeId);
      await supabaseAdmin.from("cities").update({ influence_max: 2000 }).eq("id", protegee.villeId);

      const { data: resultatTemoin } = await supabaseAdmin.rpc("lancer_action_antiville", {
        p_attaquant_id: attaquant1.userId,
        p_ville_id: temoin.villeId,
        p_type_action: "contamination",
      });
      const { data: resultatProtegee } = await supabaseAdmin.rpc("lancer_action_antiville", {
        p_attaquant_id: attaquant2.userId,
        p_ville_id: protegee.villeId,
        p_type_action: "contamination",
      });
      expect(resultatProtegee.perte).toBe(Math.round(resultatTemoin.perte / 2));
    } finally {
      for (const c of [temoin, protegee, attaquant1, attaquant2]) await supprimerCompte(c.userId);
    }
  });

  test("sabotage : Opéra (30 000) divise encore par deux l'effet d'une propagande", async () => {
    const temoin = await creerCompteAvecVille("c41-opera-temoin");
    const protegee = await creerCompteAvecVille("c41-opera-protegee");
    const attaquant1 = await creerCompteAvecVille("c41-opera-attaquant1");
    const attaquant2 = await creerCompteAvecVille("c41-opera-attaquant2");
    try {
      await supabaseAdmin.from("cities").update({ influence: 100_000 }).in("id", [temoin.villeId, protegee.villeId]);
      // Même record d'influence loin sous le seuil de l'Opéra pour la témoin ; la protégée l'atteint.
      await supabaseAdmin.from("cities").update({ influence_max: 1999 }).eq("id", temoin.villeId);
      await supabaseAdmin.from("cities").update({ influence_max: 30_000 }).eq("id", protegee.villeId);

      const { data: resultatTemoin } = await supabaseAdmin.rpc("lancer_action_antiville", {
        p_attaquant_id: attaquant1.userId,
        p_ville_id: temoin.villeId,
        p_type_action: "propagande",
      });
      const { data: resultatProtegee } = await supabaseAdmin.rpc("lancer_action_antiville", {
        p_attaquant_id: attaquant2.userId,
        p_ville_id: protegee.villeId,
        p_type_action: "propagande",
      });
      expect(resultatProtegee.perte).toBe(Math.round(resultatTemoin.perte / 2));
    } finally {
      for (const c of [temoin, protegee, attaquant1, attaquant2]) await supprimerCompte(c.userId);
    }
  });

  test("sabotage : les centrales multiplient l'élan Énergie par 1,2 chacune (solaire à 6 000, parc éolien à 20 000)", async () => {
    const ville = await creerCompteAvecVille("c41-energie");
    try {
      await donnerVisites(ville.userId, ville.villeId, "energie", 20);
      const elan = async () => {
        const { data } = await supabaseAdmin.rpc("jauges_ville", { p_ville_id: ville.villeId });
        return (data as { activite: string; elan: number }[]).find((j) => j.activite === "energie")!.elan;
      };
      const avant = await elan();

      await supabaseAdmin.from("cities").update({ influence_max: 6000 }).eq("id", ville.villeId);
      expect(await elan()).toBeCloseTo(avant * 1.2, 6);

      await supabaseAdmin.from("cities").update({ influence_max: 20_000 }).eq("id", ville.villeId);
      expect(await elan()).toBeCloseTo(avant * 1.4, 6);
    } finally {
      await supprimerCompte(ville.userId);
    }
  });

  test("le catalogue de test couvre bien les seuils utilisés ci-dessus", () => {
    const seuils = new Map(catalogueParSeuil().map((e) => [e.type, e.seuil]));
    expect(seuils.get("hopital")).toBe(2000);
    expect(seuils.get("stade")).toBe(3500);
    expect(seuils.get("centrale_solaire")).toBe(6000);
    expect(seuils.get("parc_eolien")).toBe(20000);
    expect(seuils.get("opera")).toBe(30000);
  });
});
