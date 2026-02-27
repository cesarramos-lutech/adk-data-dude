import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@looker/components', '@looker/components-providers'],
};

export default nextConfig;
