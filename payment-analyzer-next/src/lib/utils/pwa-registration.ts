/**
 * PWA Service Worker Registration
 *
 * Handles service worker registration and lifecycle management.
 * Only registers in production to avoid development cache issues.
 */

export interface ServiceWorkerRegistrationResult {
  success: boolean;
  registration?: ServiceWorkerRegistration;
  error?: Error;
}

/**
 * Registers the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistrationResult> {
  // Only register in production and if service workers are supported
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    process.env.NODE_ENV !== "production"
  ) {
    console.log("[PWA] Service worker registration skipped:", {
      isServer: typeof window === "undefined",
      supported: typeof window !== "undefined" && "serviceWorker" in navigator,
      env: process.env.NODE_ENV,
    });
    return { success: false };
  }

  try {
    console.log("[PWA] Registering service worker...");

    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });

    console.log("[PWA] Service worker registered successfully:", registration.scope);

    // Check for updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      console.log("[PWA] New service worker found, installing...");

      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("[PWA] New service worker installed, update available");
            // Optionally notify user about update
            notifyUpdate(registration);
          }
        });
      }
    });

    // Check for waiting service worker
    if (registration.waiting) {
      console.log("[PWA] Service worker waiting to activate");
      notifyUpdate(registration);
    }

    // Check for updates periodically (every hour)
    setInterval(
      () => {
        registration.update().catch((error) => {
          console.error("[PWA] Service worker update check failed:", error);
        });
      },
      60 * 60 * 1000
    );

    return { success: true, registration };
  } catch (error) {
    console.error("[PWA] Service worker registration failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}

/**
 * Unregisters the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      console.log("[PWA] Service worker unregistered:", success);
      return success;
    }
    return false;
  } catch (error) {
    console.error("[PWA] Service worker unregistration failed:", error);
    return false;
  }
}

/**
 * Gets the current service worker registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration || null;
  } catch (error) {
    console.error("[PWA] Failed to get service worker registration:", error);
    return null;
  }
}

/**
 * Notifies user about service worker update
 */
function notifyUpdate(registration: ServiceWorkerRegistration) {
  // You can implement a custom toast notification here
  console.log("[PWA] Update available, prompting user...");

  // Optional: Show a notification to user
  const shouldUpdate = window.confirm("A new version is available! Click OK to update.");

  if (shouldUpdate && registration.waiting) {
    // Tell waiting service worker to activate
    registration.waiting.postMessage({ type: "SKIP_WAITING" });

    // Reload page when new service worker is activated
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }
}

/**
 * Checks if the app can be installed as PWA
 */
export function canInstallPWA(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  // Check if already installed
  if (window.matchMedia("(display-mode: standalone)").matches) {
    console.log("[PWA] App is already installed");
    return false;
  }

  // Check if installation is supported
  return "BeforeInstallPromptEvent" in window;
}

/**
 * Checks if app is running as installed PWA
 */
export function isInstalledPWA(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true // iOS Safari
  );
}

/**
 * Gets PWA installation prompt
 * Should be called in response to beforeinstallprompt event
 */
export function setupPWAInstallPrompt(onInstallReady: (promptFn: () => Promise<void>) => void) {
  if (typeof window === "undefined") {
    return;
  }

  // BeforeInstallPromptEvent is not yet standardized
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let deferredPrompt: any = null;

  window.addEventListener("beforeinstallprompt", (e) => {
    // Prevent default mini-infobar
    e.preventDefault();
    deferredPrompt = e;

    console.log("[PWA] Install prompt ready");

    // Provide a callback to trigger the prompt
    onInstallReady(async () => {
      if (!deferredPrompt) {
        console.warn("[PWA] No deferred prompt available");
        return;
      }

      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;
      console.log("[PWA] User choice:", outcome);

      // Clear the prompt
      deferredPrompt = null;
    });
  });

  window.addEventListener("appinstalled", () => {
    console.log("[PWA] App installed successfully");
    deferredPrompt = null;
  });
}

/**
 * Clears all service worker caches
 */
export async function clearServiceWorkerCache(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.active) {
      registration.active.postMessage({ type: "CLEAR_CACHE" });
      console.log("[PWA] Cache clear requested");
      return true;
    }
    return false;
  } catch (error) {
    console.error("[PWA] Failed to clear cache:", error);
    return false;
  }
}
