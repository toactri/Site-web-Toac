"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * Atterrissage du lien de connexion envoyé par email. La connexion ne se fait
 * qu'au clic sur le bouton (requête POST) : certains antivirus de messagerie
 * ouvrent les liens pour les analyser, ce qui grillerait un lien à usage unique
 * s'il connectait dès l'ouverture de la page.
 */
function LienContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t") ?? "";
  const [error, setError] = useState<string | null>(token ? null : "Ce lien est incomplet.");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/email/lien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Connexion impossible.");
        return;
      }
      // Rechargement complet : la barre de navigation relit l'état de connexion.
      window.location.assign(typeof data.next === "string" ? data.next : "/espace-adherents");
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">Espace Adhérents</h1>
      <div className="mt-8 space-y-5 rounded-lg border border-toac-gray-200 bg-white p-6 shadow-sm">
        {error ? (
          <>
            <p role="alert" className="text-sm font-medium text-red-600">
              {error}
            </p>
            <Link
              href="/connexion"
              className="block w-full rounded-md bg-toac-pink-500 px-4 py-2.5 text-center font-display text-sm uppercase tracking-wide text-white transition hover:bg-toac-pink-400"
            >
              Recevoir un nouveau lien
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-toac-blue-900/80">Cliquez ci-dessous pour ouvrir votre espace adhérent.</p>
            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="w-full rounded-md bg-toac-pink-500 px-4 py-2.5 font-display text-sm uppercase tracking-wide text-white transition hover:bg-toac-pink-400 disabled:opacity-60"
            >
              {loading ? "Connexion…" : "Me connecter"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConnexionLienPage() {
  return (
    <Suspense>
      <LienContent />
    </Suspense>
  );
}
