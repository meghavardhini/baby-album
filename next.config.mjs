/** @type {import('next').NextConfig} */
const nextConfig = {
  // sharp + heic-convert are heavy native deps; keep them server-only and
  // out of the client/edge bundle.
  serverExternalPackages: ["sharp", "heic-convert"],
  experimental: {
    // Large photo uploads go direct-to-storage (not through API routes),
    // so we don't need a big server action body limit. This is just a guard.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
