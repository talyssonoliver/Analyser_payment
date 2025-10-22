"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/utils/pwa-registration";

/**
 * PWA Registration Component
 *
 * Handles service worker registration on mount.
 * Only registers in production to avoid development cache issues.
 */
export function PWARegistration() {
  useEffect(() => {
    // Register service worker
    registerServiceWorker()
      .then((result) => {
        if (result.success) {
          console.log("[PWA] Service worker registration successful");
        } else if (result.error) {
          console.error("[PWA] Service worker registration failed:", result.error);
        }
      })
      .catch((error) => {
        console.error("[PWA] Service worker registration error:", error);
      });
  }, []);

  // This component doesn't render anything
  return null;
}
