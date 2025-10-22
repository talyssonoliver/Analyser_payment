"use client";

import { useEffect, useState } from "react";
import { isInstalledPWA, setupPWAInstallPrompt } from "@/lib/utils/pwa-registration";

/**
 * PWA Install Prompt Component
 *
 * Shows an install button when the app can be installed as a PWA.
 * Automatically hidden when already installed.
 */
export function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<(() => Promise<void>) | null>(null);
  const [isInstalled, setIsInstalled] = useState(true); // Default to true to avoid flash

  useEffect(() => {
    // Check if already installed
    setIsInstalled(isInstalledPWA());

    if (isInstalledPWA()) {
      return;
    }

    // Setup install prompt listener
    setupPWAInstallPrompt((promptFn) => {
      setInstallPrompt(() => promptFn);
    });
  }, []);

  if (isInstalled || !installPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40 animate-in slide-in-from-bottom-5">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center">
            <svg
              aria-hidden="true"
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Install App</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Install Payment Analyzer for quick access and offline support
            </p>

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={async () => {
                  await installPrompt();
                  setInstallPrompt(null);
                }}
                className="flex-1 px-3 py-1.5 bg-sky-500 text-white text-xs font-medium rounded-md hover:bg-sky-600 transition-colors"
              >
                Install
              </button>
              <button
                type="button"
                onClick={() => setInstallPrompt(null)}
                className="px-3 py-1.5 text-slate-600 dark:text-slate-400 text-xs font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Later
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setInstallPrompt(null)}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label="Dismiss"
          >
            <svg
              aria-hidden="true"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
