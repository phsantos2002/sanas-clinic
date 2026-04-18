import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/** @type {import("eslint").Linter.FlatConfig[]} */
const config = [
  // Base: Next.js + TypeScript
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Regras customizadas do projeto
  {
    rules: {
      // Força uso das classes de AppError em vez de lançar strings ou Error genérico
      // (@typescript-eslint/only-throw-error exige que apenas Error seja lançado)
      "@typescript-eslint/only-throw-error": "warn",

      // Proibir any explícito — usar unknown + type guard
      "@typescript-eslint/no-explicit-any": "warn",

      // Evitar variáveis não usadas
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],

      // Exigir tipos de retorno explícitos em funções públicas
      "@typescript-eslint/explicit-function-return-type": "off",

      // Console permitido apenas em lib/logger e lib/prisma
      "no-console": "off",

      // Imports ordenados
      "import/order": [
        "warn",
        {
          "groups": [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling", "index"]
          ],
          "newlines-between": "always",
          "alphabetize": { "order": "asc" }
        }
      ],
    },
  },

  // Ignorar arquivos gerados / ferramental
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "prisma/migrations/**",
      "*.tsbuildinfo",
    ],
  },
];

export default config;
