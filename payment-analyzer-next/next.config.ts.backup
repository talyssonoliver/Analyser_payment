import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Essential optimizations only
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  
  // Disable type checking during build for faster development
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Critical experimental features
  experimental: {
    // Only the most impactful optimizations
    optimizePackageImports: [
      'recharts',
      'framer-motion', 
      'date-fns',
      'lucide-react',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
      '@radix-ui/react-popover',
    ],
  },
  
  // Force Turbopack to use compiled versions, not source files
  turbopack: {
    resolveAlias: {
      '@supabase/supabase-js': '@supabase/supabase-js/dist/module/index.js',
      '@supabase/ssr': '@supabase/ssr/dist/index.js',
    },
    rules: {
      // Block direct access to Supabase source files
      '**/@supabase/*/src/**': {
        loaders: [],
      },
      // Force all Supabase imports to use dist
      '**/@supabase/**/dist/**': {
        loaders: ['swc-loader'],
        as: '*.js',
      },
    },
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Don't externalize PDF.js - we need it on client side
  // serverExternalPackages: [],
  
  // Webpack optimizations for better development performance
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Development optimizations
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Split vendor libraries into separate chunks
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Separate chunk for heavy libraries except PDF.js
            heavyLibs: {
              test: /[\\/]node_modules[\\/](framer-motion|recharts)[\\/]/,
              name: 'heavy-libs',
              priority: 20,
              reuseExistingChunk: true,
            },
            // PDF.js gets its own chunk for better loading
            pdfjs: {
              test: /[\\/]node_modules[\\/]pdfjs-dist[\\/]/,
              name: 'pdfjs',
              priority: 25,
              reuseExistingChunk: true,
            },
            // Separate chunk for Supabase to isolate its complexity
            supabase: {
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              name: 'supabase',
              priority: 15,
              reuseExistingChunk: true,
            }
          }
        }
      };
    }
    
    // Resolve fallbacks for browser compatibility
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
      
      // PDF.js specific webpack configuration
      config.module.rules.push({
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      });
      
      // Handle PDF.js worker
      config.module.rules.push({
        test: /pdf\.worker\.(min\.)?js/,
        type: 'asset/resource',
        generator: {
          filename: 'static/worker/[hash][ext][query]',
        },
      });
    }
    
    return config;
  }
};

export default nextConfig;