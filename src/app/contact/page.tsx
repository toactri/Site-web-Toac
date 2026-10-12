import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import ContactForm from "@/components/ContactForm";
import LieuxMap from "@/components/LieuxMap";
import { CmsPageBlocks } from "@/components/CmsPageBlocks";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Contacter le TOAC Triathlon : formulaire de contact, adresse du club à Toulouse, e-mail du bureau et réseaux sociaux.",
  path: "/contact",
});

const TOAC_LIEU = {
  id: "toac-siege",
  nom: "TOAC Triathlon",
  adresse: "20 chemin de Garric, 31200 Toulouse",
  lat: 43.621621,
  lng: 1.409115,
  disciplines: [],
  creneaux: "",
};

export default function ContactPage() {
  return (
    <Suspense fallback={null}>
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">Contact</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <ContactForm />
        </div>
        <div className="space-y-6">
          <div className="relative rounded-lg border border-toac-gray-200 bg-white p-5 shadow-sm text-sm">
            <CmsPageBlocks
              slug="contact"
              fallback={
                <>
                  <p className="font-medium text-toac-blue-950">Adresse du club</p>
                  <p className="text-toac-blue-900/80">20 chemin de Garric, 31200 Toulouse</p>
                  <p className="mt-3 font-medium text-toac-blue-950">Réseaux sociaux</p>
                  <ul className="space-y-1">
                    <li>
                      <a href="https://www.instagram.com/triathlonsdulauragais" target="_blank" rel="noopener noreferrer" className="text-toac-blue-600 underline">
                        Instagram — Club & @triathlonsdulauragais
                      </a>
                    </li>
                    <li>
                      <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-toac-blue-600 underline">
                        Facebook — Triathlons du Lauragais
                      </a>
                    </li>
                  </ul>
                </>
              }
            />
          </div>
          <LieuxMap lieux={[TOAC_LIEU]} />
        </div>
      </div>
    </div>
    </Suspense>
  );
}
