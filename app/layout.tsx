import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ניהול דיווח שעות - 24H WORK DASHBOARD",
  description: "לוח בקרה לניהול דיווח שעות עבודה, חופשות והיעדרויות",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "24H Work",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        {/* Suppress third-party browser extension errors (e.g. MetaMask) from popping up in Next.js dev overlay */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function isExtensionError(msg, src) {
                  var str = (msg || '') + ' ' + (src || '');
                  return str.indexOf('chrome-extension://') !== -1 ||
                         str.indexOf('moz-extension://') !== -1 ||
                         str.toLowerCase().indexOf('metamask') !== -1;
                }
                window.addEventListener('error', function(e) {
                  if (isExtensionError(e.message, e.filename)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);
                window.addEventListener('unhandledrejection', function(e) {
                  var reason = e.reason ? (e.reason.message || String(e.reason)) : '';
                  if (isExtensionError(reason, '')) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-800 antialiased">
        {children}
        
        {/* Register PWA Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}