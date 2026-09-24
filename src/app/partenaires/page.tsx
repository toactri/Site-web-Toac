import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import SiteImage from "@/components/SiteImage";
import { slugify } from "@/lib/slug";
import { PARTENAIRES, PARTENAIRES_INSTITUTIONNELS } from "@/content/partenaires";
import { getCmsCatalog, getCmsPageBlocks, getCmsPages, partnerPageHrefResolver } from "@/lib/cms";
import { CmsEditableText, CmsEditableImage, CmsPartnerName, CmsAddTile } from "@/components/cms-edit";

export const metadata: Metadata = pageMetadata({
  title: "Nos partenaires",
  description:
    "Les partenaires commerciaux et institutionnels qui soutiennent le TOAC Triathlon, et les avantages négociés pour les licenciés du club.",
  path: "/partenaires",
});

// Carte commune aux partenaires commerciaux et institutionnels : même
// structure (logo, nom, description facultative, lien vers sa page dédiée
// si elle existe dans le CMS) pour les deux blocs.
function PartnerCard({
  logo,
  name,
  description,
  detailHref,
}: {
  logo: ReactNode;
  name: ReactNode;
  description?: ReactNode;
  detailHref?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-toac-gray-200 shadow-sm">
      {logo}
      <div className="p-4">
        {name}
        {description}
        {detailHref && (
          <Link
            href={detailHref}
            className="mt-2 inline-block text-sm font-medium text-toac-blue-700 hover:underline"
          >
            En savoir plus →
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function PartenairesPage() {
  const [cmsCatalog, pageBlocks, cmsPages] = await Promise.all([
    getCmsCatalog(),
    getCmsPageBlocks("partenaires"),
    getCmsPages(),
  ]);
  const partenairesSection = cmsCatalog?.find((s) => s.name === "Partenaires");
  const institutionnelsSection = cmsCatalog?.find((s) => s.name === "Partenaires institutionnels");
  const detailHrefFor = partnerPageHrefResolver(cmsPages);

  return (
    <Suspense fallback={null}>
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
        Nos partenaires
      </h1>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {partenairesSection?.products.length
          ? partenairesSection.products.map((p) => (
              <PartnerCard
                key={p.id}
                logo={
                  <CmsEditableImage
                    src={p.image_url}
                    alt={`Logo ${p.name}`}
                    target={{ kind: "product", id: p.id }}
                    className="flex h-32 w-full items-center justify-center bg-toac-gray-100 p-3"
                    imgClassName="max-h-full max-w-full object-contain"
                    zoomable
                  />
                }
                name={
                  <CmsPartnerName
                    as="div"
                    value={p.name}
                    url={p.url}
                    target={{ kind: "product", id: p.id, field: "name" }}
                    className="font-display uppercase text-toac-blue-950 hover:text-toac-blue-700"
                  />
                }
                description={
                  <CmsEditableText
                    as="div"
                    value={p.description}
                    target={{ kind: "product", id: p.id, field: "description" }}
                    className="text-sm text-toac-blue-900/70"
                  />
                }
                detailHref={detailHrefFor(p.name)}
              />
            ))
          : PARTENAIRES.map((p) => (
              <PartnerCard
                key={p.name}
                logo={
                  <SiteImage name={`partenaire-${slugify(p.name)}`} label={`Logo ${p.name}`} className="h-32 w-full" zoomable />
                }
                name={<div className="font-display uppercase text-toac-blue-950">{p.name}</div>}
                description={
                  <div className="text-sm text-toac-blue-900/70">
                    {p.specialite} — {p.ville}
                  </div>
                }
              />
            ))}
        <CmsAddTile
          payload={{ type: "add-product", sectionId: partenairesSection?.id }}
          label="+ Ajouter un partenaire"
        />
      </div>

      <h2 className="mt-14 font-display text-xl uppercase text-toac-blue-950">Partenaires institutionnels</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {institutionnelsSection?.products.length
          ? institutionnelsSection.products.map((p) => (
              <PartnerCard
                key={p.id}
                logo={
                  <CmsEditableImage
                    src={p.image_url}
                    alt={`Logo ${p.name}`}
                    target={{ kind: "product", id: p.id }}
                    className="flex h-32 w-full items-center justify-center bg-toac-gray-100 p-3"
                    imgClassName="max-h-full max-w-full object-contain"
                    zoomable
                  />
                }
                name={
                  <CmsPartnerName
                    as="div"
                    value={p.name}
                    url={p.url}
                    target={{ kind: "product", id: p.id, field: "name" }}
                    className="font-display uppercase text-toac-blue-950 hover:text-toac-blue-700"
                  />
                }
                description={
                  <CmsEditableText
                    as="div"
                    value={p.description}
                    target={{ kind: "product", id: p.id, field: "description" }}
                    className="text-sm text-toac-blue-900/70"
                  />
                }
                detailHref={detailHrefFor(p.name)}
              />
            ))
          : PARTENAIRES_INSTITUTIONNELS.map((name) => (
              <PartnerCard
                key={name}
                logo={<SiteImage name={`partenaire-${slugify(name)}`} label={`Logo ${name}`} className="h-32 w-full" zoomable />}
                name={<div className="font-display uppercase text-toac-blue-950">{name}</div>}
              />
            ))}
        <CmsAddTile
          payload={{ type: "add-product", sectionId: institutionnelsSection?.id }}
          label="+ Ajouter un partenaire institutionnel"
        />
      </div>

      <div className="mt-14 space-y-4">
        {pageBlocks
          ? pageBlocks.map((block) => (
              <div
                key={block.id}
                id={block.anchor ?? undefined}
                className="scroll-mt-24 rounded-md border border-toac-pink-500/30 bg-toac-pink-300/20 p-5 text-sm text-toac-blue-900"
              >
                {block.heading && (
                  <CmsEditableText
                    as="div"
                    value={block.heading}
                    target={{ kind: "block", id: block.id, field: "heading" }}
                    className="mb-1 block font-medium"
                  />
                )}
                <CmsEditableText
                  as="div"
                  value={block.body}
                  target={{ kind: "block", id: block.id, field: "body" }}
                  multiline
                  className="block"
                />
              </div>
            ))
          : (
              <div className="rounded-md border border-toac-pink-500/30 bg-toac-pink-300/20 p-5 text-sm text-toac-blue-900">
                Adhérents : retrouvez le détail de vos avantages exclusifs dans l&apos;
                <Link href="/espace-adherents/avantages" className="font-medium text-toac-blue-700 underline">
                  espace adhérents
                </Link>
                .
              </div>
            )}
        <CmsAddTile payload={{ type: "add-block" }} label="+ Ajouter un bloc de texte" />
      </div>
    </div>
    </Suspense>
  );
}
