import Image from "next/image";

/**
 * Drapeau d'un pays (décision d'Adrien du 06/10/2026 : « dans l'onglet Pays, ce serait bien d'avoir le drapeau du pays »).
 * Un petit fichier SVG par pays, tiré de flag-icons (licence MIT, public/drapeaux/LICENCE.txt), au format 4 × 3 : seul le
 * drapeau affiché est téléchargé (moins de 1 Ko pour la plupart), puis gardé en cache par le service worker.
 * Purement décoratif : le nom du pays est toujours écrit à côté (alt vide).
 */
export function Drapeau({ code, hauteur = 20, className }: { code: string | null | undefined; hauteur?: number; className?: string }) {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return null;
  const largeur = Math.round((hauteur * 4) / 3);
  return (
    <Image
      src={`/drapeaux/${code.toLowerCase()}.svg`}
      width={largeur}
      height={hauteur}
      alt=""
      aria-hidden
      unoptimized
      className={className ? `drapeau ${className}` : "drapeau"}
    />
  );
}
