"use client";

import { useEffect, useRef, useState } from "react";
import { definirTheme as definirThemeAction } from "@/app/villes/actions";
import type { Theme } from "@/lib/game/themes";
import { EVENEMENT_REDUIRE_PANNEAU } from "./BoutonVoirOu";
import { useSceneVille } from "./SceneVilleFond";

/**
 * Logique commune aux deux surfaces de la boutique (docs/A-INTEGRER.md §30) :
 * la section « Thèmes de la ville » de Ma ville et le catalogue de l'onglet
 * Boutique. Elles partagent le même thème « appliqué » et la même scène 3D.
 *
 * - `appliquer(id)` : la ville change TOUT DE SUITE à l'écran (la scène est
 *   déjà là, rien à recharger), pendant que le serveur enregistre. Si le
 *   serveur refuse (pack non possédé, erreur réseau), on revient au thème
 *   d'avant et on le dit — jamais d'écran qui ment sur ce qui est enregistré.
 * - `apercevoir(id)` : montre un pack sur SA ville sans rien enregistrer
 *   (BATIMENTS-ET-PACKS §4, « essayer un pack en aperçu avant de l'acheter »).
 *   Possible pour un pack qu'on ne possède pas : c'est le but. Un aperçu n'est
 *   qu'un état d'écran, le serveur ne le voit jamais.
 */
export function useChoixTheme(villeId: string, themeServeur: string) {
  const { definirTheme: afficherTheme } = useSceneVille();
  const [applique, setApplique] = useState(themeServeur);
  const [apercu, setApercu] = useState<Theme | null>(null);
  const [erreur, setErreur] = useState(false);
  const [enCours, setEnCours] = useState(false);

  // Valeurs courantes lisibles depuis les gestionnaires et le nettoyage sans les re-créer.
  const appliqueRef = useRef(themeServeur);
  const apercuRef = useRef<Theme | null>(null);
  const afficherRef = useRef(afficherTheme);
  afficherRef.current = afficherTheme;

  // La page serveur a été rafraîchie (après l'enregistrement, ou ailleurs) : elle fait foi.
  useEffect(() => {
    appliqueRef.current = themeServeur;
    setApplique(themeServeur);
  }, [themeServeur]);

  // On quitte la page avec un aperçu en cours : la scène (partagée par toutes les pages)
  // ne doit pas garder un thème que la ville n'a pas.
  useEffect(
    () => () => {
      if (apercuRef.current) afficherRef.current(appliqueRef.current);
    },
    []
  );

  async function appliquer(id: Theme) {
    if (enCours) return;
    const avant = appliqueRef.current;
    setErreur(false);
    apercuRef.current = null;
    setApercu(null);
    appliqueRef.current = id;
    setApplique(id);
    afficherRef.current(id);
    setEnCours(true);
    try {
      const { succes } = await definirThemeAction(villeId, id);
      if (!succes) throw new Error("refusé");
    } catch {
      appliqueRef.current = avant;
      setApplique(avant);
      afficherRef.current(avant);
      setErreur(true);
    } finally {
      setEnCours(false);
    }
  }

  function apercevoir(id: Theme) {
    setErreur(false);
    apercuRef.current = id;
    setApercu(id);
    afficherRef.current(id);
    // Sur mobile le panneau recouvre la ville : on le replie pour qu'on voie l'aperçu.
    window.dispatchEvent(new Event(EVENEMENT_REDUIRE_PANNEAU));
  }

  function terminerApercu() {
    apercuRef.current = null;
    setApercu(null);
    afficherRef.current(appliqueRef.current);
  }

  return { applique, apercu, erreur, enCours, appliquer, apercevoir, terminerApercu };
}
