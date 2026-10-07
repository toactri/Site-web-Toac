import type { NextConfig } from "next";

// URL Vercel générée automatiquement pour ce projet : on la garde hors des
// index de recherche (le vrai domaine public est www.toac-triathlon.com).
const VERCEL_APP_HOST = "site-web-toac.vercel.app";

const nextConfig: NextConfig = {
  // Le bandeau logos de la décharge musculation est lu au runtime avec `fs`
  // (src/lib/musculationDecharge.ts). Sans cette déclaration, Next ne l'embarque
  // pas dans la fonction déployée et le PDF sortirait sans en-tête.
  outputFileTracingIncludes: {
    "/api/musculation/decharge": ["./public/images/decharge-entete.png"],
    // Logo de l'attestation de paiement (src/lib/attestationPdf.ts).
    "/api/attestation": ["./public/images/logo-toac.png"],
  },
  async redirects() {
    return [
      {
        source: "/entrainements/ou-et-quand",
        destination: "/entrainements/points-de-rdv",
        permanent: true,
      },
      {
        source: "/ou-et-quand",
        destination: "/entrainements/points-de-rdv",
        permanent: true,
      },
      // Redirections depuis l'ancien site (toac-triathlon.com, WordPress)
      { source: "/adhesions", destination: "/adhesion", permanent: true },
      { source: "/inscriptions", destination: "/adhesion", permanent: true },
      { source: "/register", destination: "/adhesion", permanent: true },
      // Ancienne page "Nous rejoindre", reconstruite sous "/adhesion".
      { source: "/nous-rejoindre", destination: "/adhesion", permanent: true },
      { source: "/le-club/partenaires/:path*", destination: "/partenaires/:path*", permanent: true },
      { source: "/bureau", destination: "/le-club/bureau", permanent: true },
      { source: "/le-bureau", destination: "/le-club/bureau", permanent: true },
      { source: "/presentation", destination: "/le-club", permanent: true },
      { source: "/entrainements-stages", destination: "/entrainements", permanent: true },
      { source: "/stage-prepa", destination: "/entrainements", permanent: true },
      { source: "/sessions-groupe", destination: "/entrainements/points-de-rdv", permanent: true },
      { source: "/sortie-club", destination: "/le-club/vie-du-club", permanent: true },
      { source: "/tenues", destination: "/le-club/vie-du-club", permanent: true },
      { source: "/d3", destination: "/triathlons-du-lauragais", permanent: true },
      { source: "/mon-compte", destination: "/espace-adherents/dossier", permanent: true },
      { source: "/documents", destination: "/espace-adherents/documents", permanent: true },
      { source: "/reinit-mdp", destination: "/connexion", permanent: true },
      { source: "/deconnexion", destination: "/connexion", permanent: true },
      {
        source: "/2021/09/24/tout-ce-quil-faut-savoir-pour-nous-rejoindre",
        destination: "/adhesion",
        permanent: true,
      },
      {
        source: "/connexion",
        has: [{ type: "query", key: "redirect_to", value: "(?<path>.*documents.*)" }],
        destination: "/espace-adherents/documents",
        permanent: true,
      },
      {
        source: "/connexion",
        has: [{ type: "query", key: "redirect_to", value: "(?<path>.*mon-compte.*)" }],
        destination: "/espace-adherents/dossier",
        permanent: true,
      },
      {
        source: "/connexion",
        has: [{ type: "query", key: "redirect_to", value: "(?<path>.*le-bureau.*)" }],
        destination: "/le-club/bureau",
        permanent: true,
      },
      {
        source: "/connexion",
        has: [{ type: "query", key: "redirect_to", value: "(?<path>.*programme-entrainement.*)" }],
        destination: "/entrainements",
        permanent: true,
      },
      {
        source: "/connexion",
        has: [{ type: "query", key: "redirect_to", value: "(?<path>.*sessions-groupe.*)" }],
        destination: "/entrainements/points-de-rdv",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: VERCEL_APP_HOST }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
