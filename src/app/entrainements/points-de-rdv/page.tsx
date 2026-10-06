import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import LieuxMap from "@/components/LieuxMap";
import SiteImage from "@/components/SiteImage";
import { LIEUX } from "@/content/lieux";
import { getCmsPageBlocks, getCmsCatalog, getCmsTrainingSessions } from "@/lib/cms";
import { renderRichText } from "@/lib/rich-text";
import { locationSlotsList } from "@/lib/training";
import { CmsEditableText, CmsEditableImage, CmsAddTile } from "@/components/cms-edit";

export const metadata: Metadata = pageMetadata({
  title: "Lieux et points de rendez-vous",
  description:
    "Carte et fiches détaillées des lieux d'entraînement du TOAC Triathlon : piscines, points de départ vélo et course à pied à Toulouse et alentours.",
  path: "/entrainements/points-de-rdv",
});

// Accepte "lat, lng" ou "lat; lng", avec un point OU une virgule comme
// séparateur décimal (le point-virgule permet de lever l'ambiguïté quand la
// virgule sert de séparateur décimal à la française, ex. "43,6115; 1,4225").
function parseLatLng(text: string): { lat: number; lng: number } | null {
  const raw = text.trim();
  const separator = raw.includes(";") ? ";" : ",";
  const parts = raw.split(separator).map((p) => Number(p.trim().replace(",", ".")));
  if (parts.length !== 2 || !parts.every((n) => Number.isFinite(n))) return null;
  return { lat: parts[0], lng: parts[1] };
}

// Ignore casse, espaces superflus, et variantes d'apostrophes/tirets pour
// rapprocher le nom d'un produit du Catalogue de celui d'un lieu.
function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ");
}

export default async function PointsDeRdvPage() {
  const [cmsBlocks, cmsCatalog, trainingSessions] = await Promise.all([
    getCmsPageBlocks("ou-et-quand"),
    getCmsCatalog(),
    getCmsTrainingSessions(),
  ]);
  // Le visuel de la liste par défaut (LIEUX) est géré comme ses coordonnées
  // GPS : via un produit du même nom dans le Catalogue (Dashboard →
  // Catalogue), quelle que soit la rubrique dans laquelle il se trouve — le
  // rapprochement se fait uniquement par nom, pas par rubrique, pour ne pas
  // casser si la rubrique est renommée. Cette liste par défaut ne sert que
  // de repli quand la page n'a pas encore de blocs CMS ; une fois des blocs
  // créés (Dashboard → Pages → Lieux - Points de rdv), ce sont eux la
  // source de vérité, chacun avec son propre texte et sa propre image.
  const catalogProducts = cmsCatalog?.flatMap((section) => section.products) ?? [];
  const lieuxForMap = LIEUX.map((lieu) => {
    const override = catalogProducts.find((p) => normalizeName(p.name) === normalizeName(lieu.nom));
    const coords = override ? parseLatLng(override.description) : null;
    return coords ? { ...lieu, lat: coords.lat, lng: coords.lng } : lieu;
  });

  return (
    <Suspense fallback={null}>
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">Lieux - Points de rdv</h1>

      <div className="mt-8">
        <LieuxMap lieux={lieuxForMap} />
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {cmsBlocks
          ? cmsBlocks.map((block) => (
              <div
                key={block.id}
                id={block.anchor ?? undefined}
                className="relative scroll-mt-24 rounded-lg border border-toac-gray-200 bg-white p-5 shadow-sm"
              >
                <CmsEditableImage
                  src={block.image_url}
                  alt={block.heading}
                  target={{ kind: "block", id: block.id }}
                  className="mb-4 aspect-video w-full overflow-hidden rounded-md bg-toac-gray-100"
                  imgClassName="aspect-video w-full rounded-md object-cover"
                  zoomable
                />
                <CmsEditableText
                  as="h2"
                  value={block.heading}
                  target={{ kind: "block", id: block.id, field: "heading" }}
                  className="font-display text-base uppercase text-toac-blue-950"
                />
                <CmsEditableText
                  as="p"
                  value={block.body}
                  target={{ kind: "block", id: block.id, field: "body" }}
                  multiline
                  className="mt-2 block whitespace-pre-line text-sm text-toac-blue-900/80"
                />
                {/* Créneaux tirés du Planning (créneaux liés à cette fiche par
                    son ancre) : jamais recopiés dans le texte de la fiche. */}
                {(() => {
                  const slots = locationSlotsList(trainingSessions, block.anchor);
                  return slots ? (
                    <div className="mt-3 text-sm text-toac-blue-900/80">
                      <p className="font-bold">Créneaux :</p>
                      <div className="space-y-1">{renderRichText(slots)}</div>
                    </div>
                  ) : null;
                })()}
              </div>
            ))
          : LIEUX.map((lieu) => (
              <div key={lieu.id} className="rounded-lg border border-toac-gray-200 bg-white p-5 shadow-sm">
                <SiteImage
                  name={`lieu-${lieu.id}`}
                  label={lieu.nom}
                  className="mb-4 aspect-video w-full rounded-md"
                  zoomable
                />
                <h2 className="font-display text-base uppercase text-toac-blue-950">{lieu.nom}</h2>
                <p className="mt-1 text-sm text-toac-blue-900/70">{lieu.adresse}</p>
                <p className="mt-2 text-sm">
                  <span className="font-medium">Discipline(s) :</span> {lieu.disciplines.join(", ")}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Créneaux :</span> {lieu.creneaux}
                </p>
                {lieu.consignes && (
                  <p className="mt-2 rounded-md bg-toac-pink-300/10 p-2 text-xs text-toac-blue-900">
                    ⚠️ {lieu.consignes}
                  </p>
                )}
              </div>
            ))}
        <CmsAddTile payload={{ type: "add-block" }} label="+ Ajouter un lieu" />
      </div>
    </div>
    </Suspense>
  );
}
