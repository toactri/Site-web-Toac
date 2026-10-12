"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

/**
 * Encart affiché aux visiteurs non connectés à la place d'un contenu réservé
 * aux adhérents (ce contenu n'est pas envoyé à leur navigateur). Après
 * connexion, la page `returnTo` se réaffiche avec le contenu.
 */
export default function MemberOnlyTeaser({ text, returnTo }: { text: string; returnTo: string }) {
  const { requireAuth } = useAuth();

  return (
    <div className="rounded-lg border border-toac-pink-500/30 border-l-4 border-l-toac-pink-500 bg-toac-pink-300/20 p-5">
      <h2 className="font-display text-lg uppercase text-toac-blue-950">
        <span aria-hidden="true">🔒 </span>Réservé aux adhérents TOAC
      </h2>
      <p className="mt-2 text-sm text-toac-blue-900/80">{text}</p>
      <Link
        href={`/connexion?next=${returnTo}`}
        onClick={(e) => {
          if (!requireAuth(returnTo)) e.preventDefault();
        }}
        className="mt-4 inline-block rounded-md bg-toac-pink-500 px-4 py-2 text-sm font-medium text-white hover:bg-toac-pink-600"
      >
        Se connecter →
      </Link>
    </div>
  );
}
