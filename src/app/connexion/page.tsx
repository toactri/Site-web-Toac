"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { useAuth } from "@/components/AuthProvider";

function ConnexionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/espace-adherents/dossier";
  const { auth } = useAuth();

  if (auth.loggedIn) {
    router.replace(next);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
        Espace Adhérents
      </h1>
      <p className="mt-4 text-sm text-toac-blue-900/80">
        Cette page est réservée aux adhérents du TOAC Triathlon. Pas de compte à créer : connectez-vous
        avec l&apos;adresse email utilisée pour votre adhésion au club.
      </p>
      <div className="mt-8 rounded-lg border border-toac-gray-200 bg-white p-6 shadow-sm">
        <LoginForm
          next={next}
          onSuccess={(info) => {
            router.push(info.next ?? next);
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense>
      <ConnexionContent />
    </Suspense>
  );
}
