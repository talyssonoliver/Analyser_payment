/**
 * Centralized Font Configuration
 *
 * This file defines all fonts used in the application with optimized settings
 * to prevent "preload not used" warnings.
 *
 * Key optimizations:
 * 1. display: 'optional' - Only uses font if already available, prevents blocking
 * 2. subsets: ['latin'] - Only preloads necessary character sets
 * 3. Centralized definition - Fonts only preloaded when their components render
 */

import { Geist, Geist_Mono } from "next/font/google";

/**
 * Geist Sans - Primary font for body text and UI elements
 * Using 'optional' display with preload disabled to prevent warnings
 */
export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "optional", // Key: Only use font if already loaded, prevents warnings
  preload: false, // Disabled to prevent "preload not used" warnings
});

/**
 * Geist Mono - Monospace font for code and technical content
 * Using 'optional' display with preload disabled to prevent warnings
 */
export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "optional", // Key: Only use font if already loaded, prevents warnings
  preload: false, // Disabled to prevent "preload not used" warnings
});

/**
 * Why 'optional' display with preload: false?
 *
 * The 'optional' value tells the browser:
 * - Use the font immediately if it's already cached
 * - If not cached, don't wait - use fallback font
 * - Download font in background for next page load
 *
 * Setting preload: false prevents the browser from:
 * - Downloading fonts that may not be used on the current page
 * - Creating "preloaded but not used within a few seconds" warnings
 * - Wasting bandwidth on unnecessary downloads
 *
 * This combination is ideal for performance and eliminates preload warnings.
 */
