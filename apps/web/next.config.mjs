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
  ],
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
