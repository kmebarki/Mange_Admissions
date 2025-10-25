/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { allowedOrigins: ['*'] } },
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api',
    NEXT_PUBLIC_DEFAULT_ORG: process.env.NEXT_PUBLIC_DEFAULT_ORG || 'ifh',
  }
};
export default nextConfig;
