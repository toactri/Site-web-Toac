"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

const AVANTAGES_HREF = "/espace-adherents/avantages";

/**
 * Accroche des fiches partenaires pour les visiteurs non connectés : signale
 * qu'un avantage existe sans en dévoiler le détail (le texte de l'avantage
 * n'est jamais envoyé à leur navigateur). Après connexion, retour sur la
 * fiche, qui affiche alors l'avantage.
 */
export default function MemberBenefitTeaser({
  partnerName,
  returnTo,
}: {
  partnerName: string;
  /** Page où revenir après connexion : la fiche partenaire, qui affiche alors l'avantage. */
  returnTo: string;
}) {
  const { auth, requireAuth } = useAuth();

  return (
    <section className="mx-auto max-w-4xl px-4 pt-12 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-toac-pink-500/30 border-l-4 border-l-toac-pink-500 bg-toac-pink-300/20 p-5">
        <h2 className="font-display text-xl uppercase text-toac-blue-950">
          <span aria-hidden="true">🔒 </span>Avantage réservé aux adhérents TOAC
        </h2>
        <p className="mt-2 text-sm text-toac-blue-900/80">
          {partnerName} propose un avantage aux adhérents du club.{" "}
          {auth.loggedIn
            ? "Retrouvez-en le détail dans votre espace."
            : "Connectez-vous à l'espace adhérents pour en voir le détail."}
        </p>
        <Link
          href={auth.loggedIn ? AVANTAGES_HREF : `/connexion?next=${returnTo}`}
          onClick={(e) => {
            if (!auth.loggedIn) {
              e.preventDefault();
              requireAuth(returnTo);
            }
          }}
          className="mt-4 inline-block rounded-md bg-toac-pink-500 px-4 py-2 text-sm font-medium text-white hover:bg-toac-pink-600"
        >
          {auth.loggedIn ? "Voir l'avantage →" : "Se connecter →"}
        </Link>
      </div>
    </section>
  );
}
