"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

/**
 * Encart affiché aux visiteurs non connectés à la place d'un contenu réservé
 * aux adhérents (ex. onglet Tests chrono, qui contient des emails et
 * téléphones). Le contenu lui-même n'est jamais envoyé à leur navigateur :
 * la page serveur vérifie la session et n'affiche que cet encart. Après
 * connexion, retour sur `returnTo` (ancre comprise), qui affiche alors le
 * contenu.
 */
export default function MembersOnlyNotice({ title, returnTo }: { title: string; returnTo: string }) {
  const { requireAuth } = useAuth();

  return (
    <div className="rounded-lg border border-toac-pink-500/30 border-l-4 border-l-toac-pink-500 bg-toac-pink-300/20 p-5">
      <h2 className="font-display text-xl uppercase text-toac-blue-950">
        <span aria-hidden="true">🔒 </span>
        {title}
      </h2>
      <p className="mt-2 text-sm text-toac-blue-900/80">
        Ces informations sont réservées aux adhérents du club. Connectez-vous à l&apos;espace adhérents pour les consulter.
      </p>
      <Link
        href={`/connexion?next=${encodeURIComponent(returnTo)}`}
        onClick={(e) => {
          if (!requireAuth(returnTo)) e.preventDefault();
        }}
        className="mt-4 inline-block rounded-md bg-toac-pink-500 px-4 py-2 text-sm font-medium text-white hover:bg-toac-pink-600"
      >
        Se connecter
      </Link>
    </div>
  );
}
