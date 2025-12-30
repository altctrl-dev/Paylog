/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Railway build should not fail on lint-only issues; linting runs in CI separately
    ignoreDuringBuilds: true
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'paylog-production.up.railway.app',
        'paylog-production-5265.up.railway.app',
        'paylog.servesys.co', // Custom domain
        '*.railway.app' // Allow all Railway preview deployments
      ]
    }
  },
  // Ensure environment variables are available at runtime
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
  // Force cache invalidation by generating unique build IDs
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
};

export default nextConfig;
