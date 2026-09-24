import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCmsPages, getCmsCatalog } from "@/lib/cms";
import { slugify } from "@/lib/slug";
import { pageMetadata, privatePageMetadata, toMetaDescription } from "@/lib/seo";
import { CmsPageBlocks } from "@/components/CmsPageBlocks";
import { CmsEditableImage } from "@/components/cms-edit";
import AlltricksSignupForm, { AlltricksSignupConfirmation } from "@/components/AlltricksSignupForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [pages, cmsCatalog] = await Promise.all([getCmsPages(), getCmsCatalog()]);
  const page = pages?.find((p) => p.slug === slug);

  if (!page) {
    // Slug inconnu : la page rendra un 404, on n'expose donc ni description
    // ni canonique.
    return privatePageMetadata("Partenaire");
  }

  // Même dédoublonnage que le rendu (voir plus bas), mais on préfère ensuite
  // la fiche qui porte réellement un descriptif pour la balise description.
  const matchingPartners =
    cmsCatalog?.flatMap((section) => section.products).filter((p) => slugify(p.name) === slug) ?? [];
  const described = matchingPartners.find((p) => p.description?.trim());

  return pageMetadata({
    title: page.title,
    description: toMetaDescription(
      described?.description,
      `${page.title}, partenaire du TOAC Triathlon : présentation et avantages réservés aux licenciés du club.`,
    ),
    path: `/partenaires/${slug}`,
  });
}

export default async function PartenairePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ merci?: string }>;
}) {
  const [{ slug }, { merci }, pages, cmsCatalog] = await Promise.all([
    params,
    searchParams,
    getCmsPages(),
    getCmsCatalog(),
  ]);
  const page = pages?.find((p) => p.slug === slug);

  if (!page) {
    notFound();
  }

  // Plusieurs produits peuvent correspondre au même nom (ex. une ancienne
  // fiche créée avant la section dédiée "Partenaires", sans logo) — on
  // privilégie toujours celle qui a un logo, peu importe l'ordre.
  const matchingPartners = cmsCatalog?.flatMap((section) => section.products).filter((p) => slugify(p.name) === slug) ?? [];
  const partner = matchingPartners.find((p) => p.image_url) ?? matchingPartners[0];
  const hasSignupForm = slug === "alltricks";
  const signupSent = hasSignupForm && merci === "1";

  return (
    <div className="pb-16">
      {signupSent && (
        <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 lg:px-8">
          <AlltricksSignupConfirmation />
        </div>
      )}
      <div className="border-b border-toac-gray-200 bg-toac-gray-50">
        <div className="mx-auto flex flex-col items-center gap-5 px-4 py-14 text-center sm:px-6 lg:px-8">
          {partner?.image_url && (
            <CmsEditableImage
              src={partner.image_url}
              alt={`Logo ${partner.name}`}
              target={{ kind: "product", id: partner.id }}
              className="flex h-56 w-56 shrink-0 items-center justify-center rounded-xl border border-toac-gray-200 bg-white p-5 shadow-sm sm:h-64 sm:w-64"
              imgClassName="max-h-full max-w-full object-contain"
            />
          )}
          <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950 sm:text-4xl">
            {page.title}
          </h1>
          {partner?.url && (
            <a
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-toac-blue-700 hover:underline"
            >
              Visiter le site →
            </a>
          )}
        </div>
      </div>

      <CmsPageBlocks
        slug={slug}
        fallback={
          <p className="mx-auto max-w-4xl px-4 pt-6 text-sm text-toac-blue-900/60 sm:px-6 lg:px-8">
            Contenu à venir.
          </p>
        }
      />

      {hasSignupForm && !signupSent && (
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <AlltricksSignupForm />
        </div>
      )}
    </div>
  );
}
