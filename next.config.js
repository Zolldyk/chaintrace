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

    // Fix bundling conflicts and variable naming issues
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        chunks: 'all',
        maxSize: 244000, // Prevent chunks from getting too large
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // Separate chunk for blockchain dependencies - lazy loaded
          blockchain: {
            test: /[\\/]node_modules[\\/](@hashgraph|hashconnect)[\\/]/,
            name: 'blockchain',
            chunks: 'async', // Only split async chunks to prevent loading issues
            priority: 30,
            reuseExistingChunk: true,
            enforce: true,
          },
          // Separate chunk for crypto polyfills
          crypto: {
            test: /[\\/]node_modules[\\/](crypto-browserify|stream-browserify|buffer)[\\/]/,
            name: 'crypto-polyfills',
            chunks: 'all',
            priority: 25,
            reuseExistingChunk: true,
            minSize: 0,
          },
          // Keep React and core libraries together
          vendor: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'vendor',
            chunks: 'all',
            priority: 20,
            reuseExistingChunk: true,
          },
          // Default group for other dependencies
          default: {
            minChunks: 2,
            priority: -10,
            reuseExistingChunk: true,
          },
        },
      },
      // Prevent variable name conflicts with deterministic IDs
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
      // Ensure proper module concatenation
      concatenateModules: true,
    };

    // Add resolve alias for better module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      // Ensure consistent crypto resolution
      crypto: require.resolve('crypto-browserify'),
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
