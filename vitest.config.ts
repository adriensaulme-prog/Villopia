import path from "node:path";
import { defineConfig } from "vitest/config";

// Charge .env.local pour les tests qui en ont besoin (ex.
// pas-de-test-en-production.test.ts, opt-in via VERIFIER_PROD — voir
// son commentaire). Sans effet sur les autres tests, qui n'y touchent
// pas.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Pas de .env.local (ex. environnement CI avec variables injectées
  // autrement) : pas bloquant, les tests qui en dépendent le géreront.
}

export default defineConfig({
  // tsconfig a "jsx": "preserve" (c'est Next qui transforme le JSX) : sans ça, Vitest ne sait
  // pas rendre un composant (« React is not defined »). Réglage des tests seulement.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});
