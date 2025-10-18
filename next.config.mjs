/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Railway build should not fail on lint-only issues; linting runs in CI separately
    ignoreDuringBuilds: true
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000']
    }
  }
};

export default nextConfig;
