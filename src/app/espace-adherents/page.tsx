import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAdhesionByEmail, DatabaseNotConfiguredError, type AdherentSaisonRow } from "@/lib/db";

export const metadata: Metadata = {
  title: "Mon espace adhérent",
  robots: { index: false, follow: false },
};

interface Raccourci {
  href: string;
  titre: string;
  texte: string;
}

/**
 * Accueil de l'espace adhérent, où arrive l'adhérent après connexion : un mot
 * de bienvenue et les raccourcis vers ce que l'espace propose. Les adhésions
 * se font sur le site de la FFTri : il n'y a pas de dossier à suivre ici.
 */
export default async function EspaceAdherentsAccueil() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents");

  let adhesion: AdherentSaisonRow | null = null;
  try {
    adhesion = await getAdhesionByEmail(session.username);
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
  }

  const prenom = adhesion?.prenom ?? session.name;
  const raccourcis: Raccourci[] = [
    {
      href: "/espace-adherents/avantages",
      titre: "Avantages partenaires",
      texte: "Les réductions et offres réservées aux adhérents du club.",
    },
    {
      href: "/espace-adherents/documents",
      titre: "Documents & infos internes",
      texte: "Documents du club, canaux de communication et informations internes.",
    },
    {
      href: "/attestation-adhesion",
      titre: "Attestation de paiement",
      texte: "Recevez par email l'attestation de votre adhésion, pour votre CSE.",
    },
    {
      href: "/musculation",
      titre: "Salle de musculation",
      texte: adhesion?.musculation
        ? "Votre accès à la salle est validé."
        : "Remplissez la décharge pour obtenir l'accès à la salle.",
    },
  ];
  if (session.role === "admin") {
    raccourcis.unshift({
      href: "/espace-adherents/bureau",
      titre: "Vue bureau",
      texte: "Adhérents, attestations, décharges musculation, partenaires…",
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">Mon espace adhérent</h1>
      <p className="mt-4 text-lg text-toac-blue-900/80">
        Bonjour {prenom}, bienvenue dans votre espace
        {adhesion ? ` — saison ${adhesion.saison}` : ""}.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {raccourcis.map((r) => (
          <li key={r.href}>
            <Link
              href={r.href}
              className="block h-full rounded-lg border border-toac-gray-200 border-l-4 border-l-toac-pink-500 bg-white p-5 shadow-sm transition hover:bg-toac-gray-50"
            >
              <span className="font-display text-lg uppercase text-toac-blue-950">{r.titre} →</span>
              <span className="mt-1 block text-sm text-toac-blue-900/70">{r.texte}</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm text-toac-blue-900/60">
        Une question ? Écrivez au bureau :{" "}
        <a href="mailto:contact@toac-triathlon.com" className="underline">
          contact@toac-triathlon.com
        </a>
        .
      </p>
    </div>
  );
}
