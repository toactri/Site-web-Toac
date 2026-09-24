import type { Metadata } from "next";
import { Suspense } from "react";
import { Anton, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthProvider from "@/components/AuthProvider";
import {
  getCmsPageBlocks,
  getCmsCatalog,
  getCmsSiteSettings,
  getCmsNavigation,
  getCmsPages,
  partnerPageHrefResolver,
} from "@/lib/cms";
import { buildThemeCss } from "@/lib/theme";
import { SITE_URL, SITE_NAME, DEFAULT_TITLE, DEFAULT_DESCRIPTION } from "@/lib/seo";

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s — TOAC Triathlon",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  // Volontairement pas d'openGraph/twitter ici : Next.js hérite ces objets
  // en bloc dans les segments enfants, ce qui donnerait les mêmes og:title et
  // og:description sur tout le site. Chaque page les déclare via
  // `pageMetadata()` (src/lib/seo.ts).
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [cmsNavigation, footerBlocks, cmsCatalog, cmsSettings, cmsPages] = await Promise.all([
    getCmsNavigation(),
    getCmsPageBlocks("footer"),
    getCmsCatalog(),
    getCmsSiteSettings(),
    getCmsPages(),
  ]);
  const partnerHrefFor = partnerPageHrefResolver(cmsPages);
  const partenairesSection = cmsCatalog?.find((s) => s.name === "Partenaires");
  const themeCss = buildThemeCss(cmsSettings?.theme);

  return (
    <html lang="fr" className={`${anton.variable} ${inter.variable} h-full antialiased`}>
      {themeCss && (
        <head>
          <style id="cms-theme" dangerouslySetInnerHTML={{ __html: themeCss }} />
        </head>
      )}
      <body className="flex min-h-full flex-col bg-white text-toac-blue-950">
        <AuthProvider>
          <Suspense fallback={null}>
            <Navbar items={cmsNavigation.nav} />
          </Suspense>
          <main className="flex-1">{children}</main>
          <Suspense fallback={null}>
            <Footer
              footerBlocks={footerBlocks}
              footerItems={cmsNavigation.footer}
              partenairesSection={partenairesSection}
              partnerHrefFor={partnerHrefFor}
              socialLinks={cmsSettings?.social_links}
              email={cmsSettings?.email}
            />
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
