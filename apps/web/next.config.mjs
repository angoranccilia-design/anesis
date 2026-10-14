/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Autorise l'import depuis les packages du monorepo (@anesis/*) — dashboards/cockpit/auth.
    externalDir: true,
  },
  // Les packages @anesis/* sont du TypeScript source publié sans build : Next doit les transpiler…
  transpilePackages: [
    "@anesis/core",
    "@anesis/db",
    "@anesis/auth",
    "@anesis/events",
    "@anesis/planning",
    "@anesis/assessment",
    "@anesis/sources",
    "@anesis/policy",
    "@anesis/readmodel",
    "@anesis/agent-runtime",
    "@anesis/engine",
    "@anesis/connectors",
    "@anesis/runtime", "@anesis/execution"],
  // PGlite (embedded Postgres) and pg load native/WASM assets at runtime: never bundle them.
  serverExternalPackages: ["@electric-sql/pglite", "pg", "xlsx"],
  // The runtime bundle (copied to .runtime/ by prebuild) and the packages it loads natively must ship with the server functions.
  outputFileTracingIncludes: { "/**": [".runtime/**", "node_modules/@electric-sql/pglite/**", "node_modules/xlsx/**"] },
  webpack: (config) => {
    // …et résoudre leurs imports ESM en `.js` vers les sources `.ts`/`.tsx`.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
