import { redirect } from "next/navigation";
import { getLocale, traduire } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server-session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { exigerRegionChoisie } from "@/lib/supabase/gardes";
import { SelecteurPays } from "./SelecteurPays";
import { PanneauFlottant } from "@/components/PanneauFlottant";
import { SincroniserScene } from "@/components/SincroniserScene";
import { SousOnglets } from "./composants";
import { OngletSemaine } from "./onglets/Semaine";
import { OngletClassement } from "./onglets/Classement";
import { OngletDeveloppement } from "./onglets/Developpement";
import { OngletApercuPays } from "./onglets/ApercuPays";
import { OngletHistorique } from "./onglets/Historique";
import {
  ONGLETS_PAYS,
  premiereLigne,
  type ContextePays,
  type Mandat,
  type MandatBrut,
  type OngletPays,
  type StatsPays,
  type StatutSemaine,
  type VillePrincipale,
} from "./types";

const TAILLE_TOP = 10;
const PAYS_PAR_DEFAUT = { latitude: 46.6, longitude: 2.35, fuseauHoraire: "Europe/Paris" };

/**
 * /pays : l'en-tête du pays (statut, président, chiffres) reste toujours visible ; dessous, cinq
 * onglets (docs/A-INTEGRER.md §48, refonte de la page pour accueillir le classement des pays du §47
 * et le vote de développement du §48) : « Cette semaine » (par défaut), « Classement »,
 * « Développement », « Pays », « Historique ». Chaque onglet est une page rendue côté serveur
 * (?onglet=), comme les sections de /classement : il ne charge que ses propres données.
 */
export default async function PaysPage({
  searchParams,
}: {
  searchParams: Promise<{ pays?: string; onglet?: string }>;
}) {
  const locale = await getLocale();
  const { pays: paysDemande, onglet: ongletDemande } = await searchParams;
  const onglet: OngletPays = (ONGLETS_PAYS as readonly string[]).includes(ongletDemande ?? "")
    ? (ongletDemande as OngletPays)
    : "semaine";
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/connexion");
  }

  const { data: profil } = await supabase
    .from("users")
    .select("id, city_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profil) {
    redirect("/ville/creer");
  }
  await exigerRegionChoisie(supabase, user.id);
  const maVilleId = profil!.city_id as string;

  const colonneNomPays = locale === "fr" ? "nom_fr" : "nom_en";
  const { data: maVilleBrute } = await supabase
    .from("cities")
    .select("id, nom, country_id, region_id")
    .eq("id", maVilleId)
    .maybeSingle();
  type MaVille = { id: string; nom: string; country_id: string; region_id: string | null };
  const maVille = maVilleBrute as MaVille;

  const { data: listePays } = await supabase
    .from("countries")
    .select(`id, nom:${colonneNomPays}`)
    .order(colonneNomPays);
  const pays = (listePays ?? []) as { id: string; nom: string }[];
  const idsValides = new Set(pays.map((p) => p.id));
  const countryId = paysDemande && idsValides.has(paysDemande) ? paysDemande : maVille.country_id;
  const nomDe = (id: string | null) => (id ? (pays.find((p) => p.id === id)?.nom ?? id) : "");
  const nomPaysAffiche = nomDe(countryId);
  const estMonPays = countryId === maVille.country_id;

  // Mises à jour paresseuses du pays consulté, toutes idempotentes (comme verifier_president au
  // Jalon 11) : la présidence de la semaine, la décision diplomatique de la semaine passée, le vote
  // de développement de la semaine passée (migration 0054 : l'appel est ignoré tant qu'elle n'est pas
  // appliquée). La résolution des conflits vient APRÈS : une rivalité adoptée vient d'en créer un.
  await Promise.all([
    supabaseAdmin.rpc("verifier_president", { p_country_id: countryId }),
    supabaseAdmin.rpc("resoudre_decision_diplomatique", { p_country_id: countryId }),
    supabaseAdmin.rpc("resoudre_developpement_pays", { p_country_id: countryId }),
  ]);
  await supabaseAdmin.rpc("resoudre_conflits_en_cours");

  const [
    { data: mandatsBrutes },
    { data: statsBrutes, error: erreurStats },
    { data: villesBrutes },
    { data: statutBrut },
    { data: geoBrute },
  ] =
    await Promise.all([
      supabase
        .from("presidents")
        .select("ville_id, debut, fin, ville:cities(nom)")
        .eq("country_id", countryId)
        .order("debut", { ascending: false }),
      supabase.rpc("stats_pays", { p_country_id: countryId }),
      onglet === "pays"
        ? supabase
            .from("cities")
            .select("id, nom, population")
            .eq("country_id", countryId)
            .order("population", { ascending: false })
            .limit(TAILLE_TOP)
        : Promise.resolve({ data: [] }),
      supabase.rpc("statut_pays_semaine", { p_country_id: countryId }),
      supabase.from("countries").select("latitude, longitude, fuseau_horaire").eq("id", countryId).maybeSingle(),
    ]);
  if (erreurStats) console.error("Chargement des statistiques du pays a échoué :", erreurStats.message);

  const mandats: Mandat[] = ((mandatsBrutes ?? []) as MandatBrut[]).map((m) => ({
    villeId: m.ville_id,
    nom: (Array.isArray(m.ville) ? m.ville[0] : m.ville)?.nom ?? "",
    debut: m.debut,
    fin: m.fin,
  }));
  const mandatActuel = mandats.find((m) => m.fin === null) ?? null;
  const stats = premiereLigne<StatsPays>(statsBrutes);
  const villesPrincipales = (villesBrutes ?? []) as VillePrincipale[];
  const statutLigne = premiereLigne<{ statut: StatutSemaine; pays_lie: string | null }>(statutBrut);
  const statutSemaine: StatutSemaine = statutLigne?.statut ?? "paix";
  const nomPaysLie = nomDe(statutLigne?.pays_lie ?? null);

  const ctx: ContextePays = {
    locale,
    supabase,
    userId: user.id,
    maVilleId,
    monPaysId: maVille.country_id,
    countryId,
    estMonPays,
    listePays: pays,
    nomDe,
    jeSuisPresident: estMonPays && mandatActuel?.villeId === maVilleId,
  };
  const nf = new Intl.NumberFormat(locale);
  // Le soleil et l'heure du pays consulté (comme les pages de ville le font avec le pays de la ville).
  const geo = geoBrute as { latitude: number | null; longitude: number | null; fuseau_horaire: string | null } | null;
  const positionPays =
    geo?.latitude != null && geo?.longitude != null && geo?.fuseau_horaire
      ? { latitude: geo.latitude, longitude: geo.longitude, fuseauHoraire: geo.fuseau_horaire }
      : PAYS_PAR_DEFAUT;

  return (
    <main className="screen" aria-label={traduire(locale, "pays.eyebrow")}>
      {/* A-INTEGRER §49 E : le fond de /pays est un paysage de campagne sans ville, propre au pays consulté. */}
      <SincroniserScene paysage seed={countryId} populationMax={0} pays={positionPays} />
      <PanneauFlottant locale={locale} className="dock dock-float dock-left dock-pays">
        <div className="head-row">
          <span className="eyebrow">{traduire(locale, "pays.eyebrow")}</span>
        </div>
        <h1 className="sign">
          <span>{nomPaysAffiche}</span>
        </h1>
        <p className="note">
          <span className={`badge ${statutSemaine === "guerre" ? "warn" : statutSemaine === "allie" ? "good" : ""}`}>
            {traduire(locale, `pays.statut.${statutSemaine}`)}
            {statutSemaine !== "paix" && nomPaysLie ? ` · ${nomPaysLie}` : ""}
          </span>
        </p>

        <div className="row">
          <SelecteurPays locale={locale} paysActuel={countryId} pays={pays} onglet={onglet} />
        </div>

        {mandatActuel ? (
          <p className="note">
            <span className="badge pres">{traduire(locale, "classement.president")}</span> <b>{mandatActuel.nom}</b> ·{" "}
            {traduire(locale, "pays.president.depuis")} {new Intl.DateTimeFormat(locale).format(new Date(mandatActuel.debut))}
          </p>
        ) : null}

        <div className="tiles tiles-pays">
          <div className="tile">
            <b>{nf.format(stats?.population_totale ?? 0)}</b>
            <span>{traduire(locale, "ville.population")}</span>
          </div>
          <div className="tile">
            <b>{nf.format(stats?.influence_totale ?? 0)}</b>
            <span>{traduire(locale, "ville.influence")}</span>
          </div>
          <div className="tile">
            <b>{nf.format(stats?.activite_moyenne ?? 0)}</b>
            <span>{traduire(locale, "ville.activite")}</span>
          </div>
          <div className="tile">
            <b>{nf.format(stats?.nb_villes ?? 0)}</b>
            <span>{traduire(locale, "pays.nbVilles")}</span>
          </div>
        </div>

        <SousOnglets locale={locale} actif={onglet} paysConsulte={estMonPays ? null : countryId} />

        {onglet === "semaine" ? <OngletSemaine ctx={ctx} /> : null}
        {onglet === "classement" ? <OngletClassement ctx={ctx} /> : null}
        {onglet === "developpement" ? <OngletDeveloppement ctx={ctx} /> : null}
        {onglet === "pays" ? <OngletApercuPays ctx={ctx} villesPrincipales={villesPrincipales} mandats={mandats} /> : null}
        {onglet === "historique" ? <OngletHistorique ctx={ctx} /> : null}
      </PanneauFlottant>
    </main>
  );
}
