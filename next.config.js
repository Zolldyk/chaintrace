/** @type {import('next').NextConfig} */
const nextConfig = {
  // experimental: appDir is no longer needed in Next.js 14

  // Webpack configuration for Hedera SDK compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    // Handle ESM modules
    config.externals = [...config.externals, 'canvas'];

    return config;
  },

  // Environment variables are handled automatically in Next.js 14

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // Image optimization
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Build optimization for Netlify
  trailingSlash: false,

  // ESLint configuration during build
  eslint: {
    dirs: ['src'],
  },

  // TypeScript configuration during build
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
