import type { NextConfig } from "next";

// Production-optimized Next.js configuration
const nextConfig: NextConfig = {
  // Production compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production",
    // Remove React DevTools in production
    reactRemoveProperties: process.env.NODE_ENV === "production",
  },
  
  // Production performance optimizations
  poweredByHeader: false,
  compress: true,
  generateEtags: false,
  
  // Set workspace root to silence warning
  outputFileTracingRoot: process.cwd(),
  
  // Production linting and type checking (enable in production)
  eslint: {
    ignoreDuringBuilds: false, // Enable in production
  },
  
  // Production TypeScript checking
  typescript: {
    ignoreBuildErrors: false, // Enable in production
  },
  
  // Optimize images and other assets
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Production image optimizations
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
  },
  
  // Move server externals to top level (Next.js 15)
  serverExternalPackages: ['pdfjs-dist'],
  
  // Turbopack for development (faster compilation)
  ...(process.env.NODE_ENV === 'development' && {
    experimental: {
      turbo: {
        // Enable Turbopack optimizations
        rules: {
          // Optimize SVG handling
          '*.svg': {
            loaders: ['@svgr/webpack'],
            as: '*.js',
          },
        },
      },
    },
  }),
  
  // Enable stable experimental features for better performance
  experimental: {
    // Package import optimization - expanded for all major packages
    optimizePackageImports: [
      'lucide-react', 
      'date-fns', 
      'recharts', 
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
      'framer-motion',
      '@tanstack/react-query',
      'clsx',
      'tailwind-merge',
      'zod',
      'react-hook-form',
      '@hookform/resolvers',
      'zustand',
      'react-day-picker',
      '@supabase/supabase-js',
      '@supabase/ssr'
    ],
    // Optimize package imports and bundling
    esmExternals: true,
    // Enable faster CSS compilation
    cssChunking: true,
    // Enable static generation optimizations
    staticGenerationRetryCount: 1,
    staticGenerationMaxConcurrency: 8,
    staticGenerationMinPagesPerWorker: 25,
    // Enable partial prerendering for better performance
    ppr: 'incremental',
  },
  
  // Simplified webpack configuration for PDF.js support
  webpack: (config, { isServer, dev }) => {
    // PDF.js configuration - client-side only
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    // Worker file handling
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/worker/[hash][ext][query]',
      },
    });
    
    // Production optimizations
    if (!dev) {
      // Enable tree shaking for lodash and similar libraries
      config.resolve.alias = {
        ...config.resolve.alias,
        'lodash': 'lodash-es',
      };
      
      // Optimize chunks
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            // Separate vendor chunks for better caching
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              chunks: 'all',
            },
            // Separate common chunks
            common: {
              name: 'common',
              minChunks: 2,
              priority: 5,
              chunks: 'all',
              enforce: true,
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // Development optimizations to prevent HMR loops
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 60 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 5,
  },
  
  // Configure allowed dev origins for development
  ...(process.env.NODE_ENV === 'development' && {
    allowedDevOrigins: [
      'localhost',
      '127.0.0.1', 
      '172.30.0.1',
    ],
  }),
};

export default nextConfig;