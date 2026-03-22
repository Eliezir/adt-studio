import tseslint from "typescript-eslint"
import linguiPlugin from "eslint-plugin-lingui"

export default [
  { ignores: ["src/routeTree.gen.ts", "src/locales/**/*", "dist/**", "src/**/*.test.*"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { lingui: linguiPlugin },
    rules: {
      "lingui/no-unlocalized-strings": [
        "error",
        {
          ignoreNames: [
            // --- HTML / JSX structural attributes ---
            "className",
            "style",
            "id",
            "type",
            "href",
            "src",
            "key",
            "name",
            "accept",
            "method",
            "action",
            "target",
            "rel",
            "pattern",
            "autoComplete",
            "encType",
            "sandbox",
            "scrolling",
            "charset",
            "role",
            "loading",
            "htmlFor",
            "data-testid",
            { regex: { pattern: "^data-" } },

            // --- SVG attributes ---
            "fill",
            "d",
            "viewBox",
            "strokeLinecap",
            "strokeDasharray",

            // --- Radix UI / shadcn layout props ---
            "variant",
            "size",
            "align",
            "side",

            // --- Router / navigation props ---
            "to",
            "step",
            "tab",

            // --- Form / input props (non-visible values) ---
            "defaultValue",
            "value",

            // --- CSS class & color props (never user-visible) ---
            "color",
            "hex",
            "textColor",
            "bgLight",
            "borderColor",
            "borderDark",
            "iconColor",
            "colorClass",

            // --- Pipeline / config identifiers ---
            "slug",
            "stageSlug",
            "promptName",
            "node",
            "mode",
            "direction",
            "fromStage",
            "toStage",

            // --- TanStack Query cache keys ---
            "queryKey",

            // --- React internals ---
            "displayName",
          ],
          ignoreFunctions: [
            // --- Console / logging ---
            "console.*",
            "*.log",
            "*.warn",
            "*.error",
            "*.info",
            "*.debug",

            // --- Error constructors ---
            "Error",
            "TypeError",
            "RangeError",

            // --- Module system ---
            "require",

            // --- API / fetch calls (URL strings are never translatable) ---
            "request",
            "fetch",

            // --- DOM manipulation ---
            "document.createElement",
            "*.setAttribute",
            "*.removeAttribute",
            "*.getAttribute",
            "*.querySelector",
            "*.querySelectorAll",
            "*.append",
            "*.prepend",
            "*.setProperty",
            "*.open",

            // --- DOM event types ---
            "*.addEventListener",
            "*.removeEventListener",
            "*.scrollIntoView",

            // --- String / array operations (used for internal comparisons) ---
            "*.replace",
            "*.startsWith",
            "*.includes",

            // --- URL / search params manipulation ---
            "*.set",
            "*.get",
            "*.delete",
            "new URL",

            // --- TanStack Router route definitions ---
            "createFileRoute",
          ],
          ignore: [
            // npm package names and module paths (e.g. "@tanstack/react-router")
            "^@?[a-zA-Z0-9_-]+(/[a-zA-Z0-9_.-]+)+",
            // locale codes (e.g. "en", "pt-BR", "es")
            "^[a-z]{2}(-[A-Z]{2})?$",
          ],
        },
      ],
      "lingui/t-call-in-function": "error",
    },
  },
]
