import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      "ci-build/**",
      "cloudflare-env.d.ts",
      "next-env.d.ts",
    ],
  },
];

export default config;
