import type { Metadata } from "next";
import Script from "next/script";

import { Providers } from "@/app/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Haus of Wellness",
  description: "Multi-tenant SaaS for grooming, beauty, wellness, and retail",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const enableSw = process.env.NODE_ENV === "production";

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        {enableSw ? (
          <Script id="sw-register" strategy="afterInteractive">
            {`if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(function () {});
}`}
          </Script>
        ) : null}
      </body>
    </html>
  );
}
