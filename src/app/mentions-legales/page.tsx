import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { CmsPageBlocks } from "@/components/CmsPageBlocks";

export const metadata: Metadata = pageMetadata({
  title: "Mentions légales",
  description:
    "Mentions légales du site du TOAC Triathlon : éditeur, hébergement, directeur de la publication et propriété intellectuelle.",
  path: "/mentions-legales",
});

export default function MentionsLegalesPage() {
  return (
    <Suspense fallback={null}>
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">Mentions légales</h1>

      <CmsPageBlocks
        slug="mentions-legales"
        fallback={
          <div className="mt-8 space-y-6 text-sm text-toac-blue-900/90">
            <section>
              <h2 className="font-display text-base uppercase text-toac-blue-950">Éditeur du site</h2>
              <p className="mt-2">
                TOAC Triathlon — Association loi 1901, soutenue par le Toulouse Olympique Aérospatiale Club.
                <br />
                Siège social : 20 chemin de Garric, 31200 Toulouse.
                <br />
                Contact :{" "}
                <Link href="/contact" className="underline">
                  formulaire de contact
                </Link>
              </p>
            </section>
            <section>
              <h2 className="font-display text-base uppercase text-toac-blue-950">Hébergement</h2>
              <p className="mt-2">
                Site hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.
              </p>
            </section>
            <section>
              <h2 className="font-display text-base uppercase text-toac-blue-950">Directeur de la publication</h2>
              <p className="mt-2">Le Président du TOAC Triathlon en exercice.</p>
            </section>
            <section>
              <h2 className="font-display text-base uppercase text-toac-blue-950">Propriété intellectuelle</h2>
              <p className="mt-2">
                L'ensemble des contenus (textes, photographies, logo) présents sur ce site sont la propriété du
                TOAC Triathlon, sauf mention contraire, et ne peuvent être reproduits sans autorisation.
              </p>
            </section>
          </div>
        }
      />
    </div>
    </Suspense>
  );
}
