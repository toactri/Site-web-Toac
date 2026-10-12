import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { CmsPageBlocks } from "@/components/CmsPageBlocks";

export const metadata: Metadata = pageMetadata({
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité du TOAC Triathlon : données collectées, partage avec les partenaires et exercice de vos droits RGPD.",
  path: "/confidentialite",
});

export default function ConfidentialitePage() {
  return (
    <Suspense fallback={null}>
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
        Politique de confidentialité
      </h1>

      <CmsPageBlocks
        slug="confidentialite"
        fallback={
          <div className="mt-8 space-y-6 text-sm text-toac-blue-900/90">
            <section>
              <h2 className="font-display text-base uppercase text-toac-blue-950">Données collectées</h2>
              <p className="mt-2">
                Le TOAC Triathlon collecte les données nécessaires à la gestion de l'adhésion (identité, contact,
                statut de licence FFTRI) et au suivi des dossiers adhérents (paiement, formulaire, caution, licence).
                Ces données sont saisies via le formulaire d'adhésion et gérées par le bureau du club.
              </p>
            </section>
            <section>
              <h2 className="font-display text-base uppercase text-toac-blue-950">Partage avec les partenaires</h2>
              <p className="mt-2">
                Certains avantages partenaires (ex. Alltricks) nécessitent la transmission de votre email au
                partenaire concerné ; cette transmission ne se fait qu'avec votre consentement explicite.
              </p>
            </section>
            <section>
              <h2 className="font-display text-base uppercase text-toac-blue-950">Vos droits</h2>
              <p className="mt-2">
                Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos
                données. Pour l'exercer, contactez le bureau via le{" "}
                <Link href="/contact" className="underline">
                  formulaire de contact
                </Link>
                .
              </p>
            </section>
          </div>
        }
      />
    </div>
    </Suspense>
  );
}
