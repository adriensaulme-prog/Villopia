// Logo de Villopia (modèle 6 choisi par Adrien le 07/10/2026) : le panneau d'entrée
// de ville, une skyline de hauteurs variées et la grande tour bleue qui sort du cadre.
// Même dessin que public/icons/logo.svg (source des icônes PNG), sans la tuile de fond.
export function LogoVillopia({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="8 6 88 92" aria-hidden="true" focusable="false">
      <rect x="49" y="77" width="6" height="18" fill="#5a6672" />
      <rect x="12" y="30" width="80" height="44" rx="6" fill="#ffffff" stroke="#c8261c" strokeWidth="6" />
      <rect x="22" y="54" width="10" height="14" fill="#3fa15a" />
      <rect x="34" y="42" width="12" height="26" fill="#f2b134" />
      <rect x="48" y="10" width="12" height="58" fill="#1f6fb2" />
      <rect x="62" y="50" width="10" height="18" fill="#1a232d" />
      <polygon points="74,57 79,52 84,57 84,68 74,68" fill="#3fa15a" />
      <g fill="#ffffff">
        <rect x="51" y="16" width="2.5" height="3" />
        <rect x="55" y="16" width="2.5" height="3" />
        <rect x="51" y="24" width="2.5" height="3" />
        <rect x="55" y="24" width="2.5" height="3" />
        <rect x="24" y="58" width="2.5" height="3" />
        <rect x="27.5" y="58" width="2.5" height="3" />
        <rect x="36.5" y="46" width="2.5" height="3" />
        <rect x="41" y="46" width="2.5" height="3" />
        <rect x="36.5" y="53" width="2.5" height="3" />
        <rect x="41" y="53" width="2.5" height="3" />
        <rect x="36.5" y="60" width="2.5" height="3" />
        <rect x="41" y="60" width="2.5" height="3" />
        <rect x="51" y="32" width="2.5" height="3" />
        <rect x="55" y="32" width="2.5" height="3" />
        <rect x="51" y="40" width="2.5" height="3" />
        <rect x="55" y="40" width="2.5" height="3" />
        <rect x="51" y="48" width="2.5" height="3" />
        <rect x="55" y="48" width="2.5" height="3" />
        <rect x="64" y="54" width="2.5" height="3" />
        <rect x="67.5" y="54" width="2.5" height="3" />
        <rect x="64" y="61" width="2.5" height="3" />
        <rect x="67.5" y="61" width="2.5" height="3" />
        <rect x="77.5" y="60" width="3" height="3" />
      </g>
    </svg>
  );
}
