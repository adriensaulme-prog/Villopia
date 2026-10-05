import { redirect } from "next/navigation";
import { getLocale, traduire } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server-session";
import { exigerRegionChoisie } from "@/lib/supabase/gardes";
import { lireDonneesRendu3D } from "@/lib/supabase/rendu3d";
import { lirePacksDuJoueur } from "@/lib/supabase/packs";
import { SincroniserScene } from "@/components/SincroniserScene";
import { PanneauFlottant } from "@/components/PanneauFlottant";
import { CatalogueBoutique } from "@/components/CatalogueBoutique";

const PAYS_PAR_DEFAUT = { latitude: 46.6, longitude: 2.35, fuseauHoraire: "Europe/Paris" };

const un = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/**
 * La Boutique (docs/A-INTEGRER.md §30, surface 2) : l'onglet qui montre TOUS les
 * packs de thèmes — possédés ou non — avec leurs aperçus et le point d'entrée de
 * l'achat. Elle n'est pas dans le premier plan du jeu : dernier onglet de la
 * navigation sur ordinateur, et sur mobile (barre du bas déjà pleine) on y
 * arrive depuis « Ma ville » et depuis la barre du haut.
 *
 * Les packs sont purement cosmétiques (docs/BATIMENTS-ET-PACKS.md §4) : cette
 * page ne lit ni n'écrit rien d'autre que le thème. La scène de fond dessine la
 * VRAIE ville du joueur (lecture seule), pour que l'aperçu d'un pack montre
 * exactement ce que sa ville deviendrait.
 */
export default async function BoutiquePage() {
  const locale = await getLocale();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profil } = await supabase.from("users").select("id, city_id").eq("id", user.id).maybeSingle();
  if (!profil) redirect("/ville/creer");
  await exigerRegionChoisie(supabase, user.id);
  const villeId = profil!.city_id as string;

  const { data: ville } = await supabase
    .from("cities")
    .select("id, population_max, theme, pays:countries(latitude, longitude, fuseau_horaire)")
    .eq("id", villeId)
    .maybeSingle();
  if (!ville) redirect("/ville/creer");

  const paysBrut = un(
    ville.pays as unknown as { latitude: number | null; longitude: number | null; fuseau_horaire: string | null } | null
  );
  const pays =
    paysBrut?.latitude != null && paysBrut?.longitude != null && paysBrut?.fuseau_horaire
      ? { latitude: paysBrut.latitude, longitude: paysBrut.longitude, fuseauHoraire: paysBrut.fuseau_horaire }
      : PAYS_PAR_DEFAUT;

  const [rendu, packs] = await Promise.all([lireDonneesRendu3D(supabase, ville.id), lirePacksDuJoueur(supabase, user.id)]);
  const nbPossedes = packs.filter((p) => p.possede).length;

  return (
    <main className="screen" aria-label={traduire(locale, "boutique.titre")}>
      <SincroniserScene
        seed={ville.id}
        populationMax={ville.population_max}
        pays={pays}
        vocations={rendu.vocations}
        elanEnergie={rendu.elanEnergie}
        megaprojets={rendu.megaprojets}
        nbTechnologies={rendu.nbTechnologies}
        monuments={rendu.monuments}
        theme={ville.theme}
        zonageDepuisRang={rendu.zonageDepuisRang}
      />
      <PanneauFlottant locale={locale} className="dock dock-float dock-left">
        <div className="head-row">
          <h1 className="h2">{traduire(locale, "boutique.titre")}</h1>
          <span className="badge">
            {nbPossedes}/{packs.length} {traduire(locale, "packs.possedes")}
          </span>
        </div>
        <p className="note">{traduire(locale, "boutique.intro")}</p>
        <CatalogueBoutique locale={locale} villeId={ville.id} themeApplique={ville.theme} packs={packs} />
        <p className="note">{traduire(locale, "boutique.aVenir")}</p>
      </PanneauFlottant>
    </main>
  );
}
