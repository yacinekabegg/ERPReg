/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @react-pdf/renderer doit rester hors du bundle serveur de Next.
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },
};

export default nextConfig;
