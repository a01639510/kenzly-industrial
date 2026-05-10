import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Permite que el build de Vercel encuentre los packages del monorepo
  transpilePackages: ['@backly/ui', '@backly/config', '@backly/types', '@backly/utils'],
};

export default nextConfig;
