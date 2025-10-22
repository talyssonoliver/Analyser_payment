import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { useId } from "react";
import { ErrorHandler } from "@/components/error-boundary";
import { ThemeProvider } from "@/components/providers";
import { PWAInstallPrompt, PWARegistration } from "@/components/pwa";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/lib/providers/auth-provider";
import { geistMono, geistSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Payment Analyzer Professional",
  description: "Modern payment analysis system for accurate settlement tracking",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pay Analyzer",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0ea5e9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const storageInterceptorId = useId();
  const errorSuppressorId = useId();
  const consoleFilterId = useId();
  const pdfjsConfigId = useId();
  return (
    <html lang="en">
      <head>
        {/* CRITICAL: Initialize storage interceptor BEFORE anything else to prevent extension conflicts */}
        <Script
          id={storageInterceptorId}
          strategy="beforeInteractive"
          src="/scripts/storage-interceptor.js"
        />

        {/* Suppress browser extension errors */}
        <Script
          id={errorSuppressorId}
          strategy="beforeInteractive"
          src="/scripts/error-suppressor.js"
        />

        {/* Filter out development preload warnings */}
        {process.env.NODE_ENV === "development" && (
          <Script
            id={consoleFilterId}
            strategy="beforeInteractive"
            src="/scripts/console-filter.js"
          />
        )}

        {/* PWA Meta Tags */}
        <meta name="application-name" content="Payment Analyzer" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Pay Analyzer" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0ea5e9" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Load PDF.js before page interactive - matching legacy code behavior */}
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
          strategy="beforeInteractive"
        />
        <Script id={pdfjsConfigId} strategy="beforeInteractive" src="/scripts/pdfjs-config.js" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Skip to content link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 bg-white text-slate-900 px-3 py-2 rounded shadow z-[10000]"
        >
          Skip to content
        </a>
        <ErrorHandler />
        <ThemeProvider>
          <AuthProvider>
            <PWARegistration />
            <ToastProvider>
              {children}
              <PWAInstallPrompt />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
