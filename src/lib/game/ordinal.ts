import type { Locale } from "@/lib/i18n/dictionaries";

/**
 * "3ᵉ"/"1ᵉʳ" en français, "3rd"/"1st" en anglais, "3.º"/"1.º" en espagnol (indicateur ordinal masculin
 * invariable, usage courant pour un classement — A-INTEGRER §50) — pour les badges de rang.
 */
export function ordinal(n: number, locale: Locale): string {
  if (locale === "fr") return n === 1 ? "1ᵉʳ" : `${n}ᵉ`;
  if (locale === "es") return `${n}.º`;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
