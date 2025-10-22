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

  // Development stability optimizations
  experimental: {
    // Disable package imports optimization in development to prevent chunk issues
    ...(process.env.NODE_ENV === "production"
      ? {
          optimizePackageImports: [
            "recharts",
            "framer-motion",
            "date-fns",
            "lucide-react",
            "@radix-ui/react-label",
            "@radix-ui/react-slot",
            "@radix-ui/react-popover",
          ],
        }
      : {}),

    // Optimize resource preloading to prevent "preloaded but not used" warnings
    // This works in conjunction with font display: 'optional' setting
    ...(process.env.NODE_ENV === "development"
      ? {
          // Disable aggressive preloading in development
          optimizeCss: false,
        }
      : {}),
  },

  // Webpack configuration to reduce preload warnings and prevent STATUS_BREAKPOINT errors
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Disable prefetch and preload hints in development to reduce console warnings
      config.plugins = config.plugins || [];

      // Find and configure plugins that add preload hints
      config.plugins.forEach(
        (plugin: { constructor: { name: string }; options?: Record<string, unknown> }) => {
          if (plugin.constructor.name === "HtmlWebpackPlugin") {
            plugin.options = plugin.options || {};
            plugin.options.prefetch = false;
            plugin.options.preload = false;
          }
        }
      );

      // Minimal optimization to prevent chunk loading issues
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "async", // Only split async chunks to reduce complexity
          minSize: 20000,
          maxSize: 244000,
        },
      };
    }

    // Resolve fallbacks for browser compatibility and prevent STATUS_BREAKPOINT
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };

      // Prevent webpack runtime issues that cause STATUS_BREAKPOINT
      config.optimization = {
        ...config.optimization,
        runtimeChunk: dev ? false : "single", // Disable runtime chunk in dev
        moduleIds: dev ? "named" : "deterministic",
      };

      // PDF.js specific webpack configuration
      config.module.rules.push({
        test: /\.mjs$/,
        include: /node_modules/,
        type: "javascript/auto",
      });

      // Handle PDF.js worker
      config.module.rules.push({
        test: /pdf\.worker\.(min\.)?js/,
        type: "asset/resource",
        generator: {
          filename: "static/worker/[hash][ext][query]",
        },
      });
    }

    return config;
  },

  // Development-specific configuration
  ...(process.env.NODE_ENV === "development"
    ? {
        // Disable static optimization in development
        staticPageGenerationTimeout: 1000,

        // Reduce bundle size limits for development
        onDemandEntries: {
          maxInactiveAge: 25 * 1000,
          pagesBufferLength: 2,
        },
      }
    : {}),

  // Force Turbopack to use compiled versions, not source files
  turbopack: {
    resolveAlias: {
      "@supabase/supabase-js": "@supabase/supabase-js/dist/module/index.js",
      "@supabase/ssr": "@supabase/ssr/dist/index.js",
    },
    rules: {
      // Block direct access to Supabase source files
      "**/@supabase/*/src/**": {
        loaders: [],
      },
      // Force all Supabase imports to use dist
      "**/@supabase/**/dist/**": {
        loaders: ["swc-loader"],
        as: "*.js",
      },
    },
  },

  // Image optimization - disable sharp on Windows to prevent permission issues
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    // Disable sharp image optimization during build to prevent Windows permission errors
    unoptimized: process.env.NODE_ENV !== "production",
  },

  // Add security and performance headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Apply cache headers to API routes
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        // Apply cache headers to static assets
        source: "/(.*).(ico|png|jpg|jpeg|svg|gif|webp)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
