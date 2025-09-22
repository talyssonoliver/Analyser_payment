// Bundle analyzer configuration for Next.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: true, // Always enable for this config
  openAnalyzer: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // SWC is enabled by default in Next.js 15
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production",
  },
  
  // Set workspace root to silence warning
  outputFileTracingRoot: process.cwd(),
  
  // Disable ESLint during build for performance testing
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript errors during build for performance testing
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Optimize images and other assets
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Enable compression
  compress: true,
  
  // Move server externals to top level (Next.js 15)
  serverExternalPackages: ['pdfjs-dist'],
  
  // Enable stable experimental features for better performance
  experimental: {
    // Package import optimization (stable in Next.js 15) - Expanded list
    optimizePackageImports: [
      'lucide-react', 
      'date-fns', 
      'recharts', 
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-radio-group',
      '@tanstack/react-query',
      'framer-motion',
      'clsx',
      'tailwind-merge',
      'zod',
      'react-hook-form',
      '@hookform/resolvers',
      'zustand',
      'react-day-picker'
    ],
    // Optimize package imports and bundling (stable)
    esmExternals: true,
    // Enable faster CSS compilation (stable)
    cssChunking: true,
    // Enable static generation optimizations
    staticGenerationRetryCount: 1,
    staticGenerationMaxConcurrency: 8,
    staticGenerationMinPagesPerWorker: 25,
  },
  
  // Simplified webpack configuration for PDF.js support
  webpack: (config, { isServer }) => {
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
    
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);