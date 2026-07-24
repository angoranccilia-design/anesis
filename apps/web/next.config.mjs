/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Autorise l'import de types depuis les packages du monorepo (@anesis/*) plus tard (dashboards).
    externalDir: true,
  },
};

export default nextConfig;
