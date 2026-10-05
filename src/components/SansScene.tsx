"use client";

import { useEffect } from "react";

/**
 * Masque la scène 3D persistante (SceneVilleFond, dans le layout) tant que la page est affichée : pour les pages qui
 * sont du texte sur toute la largeur (/pays, retour d'Adrien du 05/10/2026 : « pas d'autre fond »). La classe est
 * retirée au départ de la page, la scène reparaît sur les autres.
 */
export function SansScene() {
  useEffect(() => {
    document.body.classList.add("sans-scene");
    return () => document.body.classList.remove("sans-scene");
  }, []);
  return null;
}
