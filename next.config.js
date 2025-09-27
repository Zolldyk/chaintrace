/** @type {import('next').NextConfig} */
const nextConfig = {
  // experimental: appDir is no longer needed in Next.js 14

  // Webpack configuration for Hedera SDK compatibility
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
        util: require.resolve('util'),
      };

      // Provide global polyfills
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );
    }

    // Handle ESM modules and externalize crypto for all builds
    if (isServer) {
      // For server builds, externalize crypto to avoid bundling issues during static generation
      if (config.externals) {
        config.externals.push('crypto');
      } else {
        config.externals = ['crypto'];
      }
    }

    config.externals = [...(config.externals || []), 'canvas'];

    // Simplified optimization to prevent chunking issues
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Single vendor chunk for all node_modules
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
          default: {
            minChunks: 2,
            priority: -10,
            reuseExistingChunk: true,
          },
        },
      },
      // Use deterministic IDs to prevent conflicts
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
    };

    // Add resolve alias for better module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      // Ensure consistent crypto resolution
      crypto: require.resolve('crypto-browserify'),
      // Add fallbacks for problematic modules
      '@hashgraph/sdk': '@hashgraph/sdk',
      hashconnect: 'hashconnect',
    };

    // Add error handling for chunk loading
    config.output = {
      ...config.output,
      chunkLoadingGlobal: 'webpackChunkLoadingGlobal',
      publicPath: '/_next/',
    };

    return config;
  },

  // Environment variables are handled automatically in Next.js 14

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // Image optimization
  images: {
    remotePatterns: [],
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
