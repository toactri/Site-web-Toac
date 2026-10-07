import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import SiteImage from "@/components/SiteImage";
import { slugify } from "@/lib/slug";
import { BUREAU_2026, PRESIDENT_HONNEUR, COACHS } from "@/content/bureau";
import { DISCIPLINE_LABELS, type Discipline } from "@/content/planning";
import { getCmsCatalog, getCmsPageBlocks } from "@/lib/cms";
import { CmsEditableText, CmsEditableImage, CmsEditPencil, CmsAddTile } from "@/components/cms-edit";
import EnsureCmsProduct from "@/components/EnsureCmsProduct";

export const metadata: Metadata = pageMetadata({
  title: "Le bureau & les coachs",
  description:
    "Les membres du bureau 2026 du TOAC Triathlon et l'équipe d'encadrement sportif qui anime les entraînements du club à Toulouse.",
  path: "/le-club/bureau",
});

export default async function BureauPage() {
  const [cmsCatalog, pageBlocks] = await Promise.all([
    getCmsCatalog(),
    getCmsPageBlocks("bureau"),
  ]);

  const bureauSection = cmsCatalog?.find((s) => s.name === "Bureau 2026");
  const coachsSection = cmsCatalog?.find((s) => s.name === "Encadrement sportif");
  const honneurSection = cmsCatalog?.find((s) => s.name === "Président d'honneur");
  // Les encadrants uniquement "Musculation" ne sont pas des coachs : ils sont
  // habilités à récupérer la clé de la salle et en sont responsables, rien de
  // plus. Ils restent listés sur la page Musculation, pas ici. Un coach d'un
  // autre sport qui encadre aussi la muscu reste affiché.
  const coachs = coachsSection?.products.filter(
    (c) => !(c.sports?.length && c.sports.every((sp) => sp === "muscu"))
  );

  return (
    <Suspense fallback={null}>
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <EnsureCmsProduct
        product={
          !honneurSection && {
            sectionName: "Président d'honneur",
            name: PRESIDENT_HONNEUR.name,
            description: PRESIDENT_HONNEUR.description,
          }
        }
      />
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
        Le bureau & les coachs
      </h1>

      {/* Blocs de texte libres : intro modifiable, affichée au-dessus des
          membres. D'autres blocs peuvent être ajoutés ici depuis l'aperçu. */}
      <div className="mt-8 space-y-4">
        {pageBlocks?.map((block) => (
          <div key={block.id} id={block.anchor ?? undefined} className="relative scroll-mt-24 rounded-lg">
            {block.image_url && (
              <CmsEditableImage
                src={block.image_url}
                alt={block.heading}
                target={{ kind: "block", id: block.id }}
                className="mb-4 aspect-video w-full overflow-hidden rounded-lg"
                imgClassName="aspect-video w-full rounded-lg object-cover"
              />
            )}
            {block.heading && (
              <CmsEditableText
                as="h2"
                value={block.heading}
                target={{ kind: "block", id: block.id, field: "heading" }}
                className="font-display text-xl uppercase text-toac-blue-950"
              />
            )}
            {block.body && (
              <CmsEditableText
                as="div"
                value={block.body}
                target={{ kind: "block", id: block.id, field: "body" }}
                multiline
                className="mt-2 block text-toac-blue-900/90"
              />
            )}
          </div>
        ))}
        <CmsAddTile payload={{ type: "add-block" }} label="+ Ajouter un bloc de texte" />
      </div>

      <h2 className="mt-10 font-display text-xl uppercase text-toac-blue-950">Bureau 2026</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bureauSection
          ? bureauSection.products.map((m) => (
              <div
                key={m.id}
                className="relative flex items-center gap-4 rounded-lg border border-toac-gray-200 bg-white p-4 pr-9 shadow-sm"
              >
                <CmsEditPencil
                  payload={{ type: "edit-product", productId: m.id }}
                  className="absolute right-2 top-2 h-6 w-6 text-[10px]"
                />
                <CmsEditableImage
                  src={m.image_url}
                  alt={m.name}
                  target={{ kind: "product", id: m.id }}
                  className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-toac-gray-200"
                  imgClassName="h-14 w-14 rounded-full object-cover"
                  zoomable
                />
                <div>
                  <CmsEditableText
                    as="div"
                    value={m.name}
                    target={{ kind: "product", id: m.id, field: "name" }}
                    className="font-medium text-toac-blue-950"
                  />
                  <CmsEditableText
                    as="div"
                    value={m.description}
                    target={{ kind: "product", id: m.id, field: "description" }}
                    className="text-sm text-toac-blue-900/70"
                  />
                </div>
              </div>
            ))
          : BUREAU_2026.map((m, i) => (
              <div key={`${m.name}-${m.role}-${i}`} className="flex items-center gap-4 rounded-lg border border-toac-gray-200 bg-white p-4 shadow-sm">
                <SiteImage name={`bureau-${slugify(m.name)}`} label={m.name} className="h-14 w-14 shrink-0 rounded-full" zoomable />
                <div>
                  <div className="font-medium text-toac-blue-950">{m.name}</div>
                  <div className="text-sm text-toac-blue-900/70">{m.role}</div>
                </div>
              </div>
            ))}
        <CmsAddTile
          payload={{ type: "add-product", sectionId: bureauSection?.id }}
          label="+ Ajouter un membre du bureau"
        />
      </div>

      <div className="mt-8 space-y-4">
        {honneurSection
          ? honneurSection.products.map((m) => (
              <div
                key={m.id}
                className="relative flex items-center gap-4 rounded-lg border border-toac-pink-500/40 bg-toac-pink-300/10 p-5 pr-9"
              >
                <CmsEditPencil
                  payload={{ type: "edit-product", productId: m.id }}
                  className="absolute right-2 top-2 h-6 w-6 text-[10px]"
                />
                <CmsEditableImage
                  src={m.image_url}
                  alt={m.name}
                  target={{ kind: "product", id: m.id }}
                  className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-toac-gray-200"
                  imgClassName="h-14 w-14 rounded-full object-cover"
                  zoomable
                />
                <div>
                  <CmsEditableText
                    as="div"
                    value={m.name}
                    target={{ kind: "product", id: m.id, field: "name" }}
                    className="font-medium text-toac-blue-950"
                  />
                  <CmsEditableText
                    as="div"
                    value={m.description}
                    target={{ kind: "product", id: m.id, field: "description" }}
                    multiline
                    className="mt-1 block text-sm text-toac-blue-900/80"
                  />
                </div>
              </div>
            ))
          : (
              <div className="rounded-lg border border-toac-pink-500/40 bg-toac-pink-300/10 p-5">
                <div className="font-medium text-toac-blue-950">{PRESIDENT_HONNEUR.name}</div>
                <p className="mt-1 text-sm text-toac-blue-900/80">{PRESIDENT_HONNEUR.description}</p>
              </div>
            )}
        <CmsAddTile
          payload={{ type: "add-product", sectionId: honneurSection?.id }}
          label="+ Ajouter un président d'honneur"
        />
      </div>

      <h2 className="mt-14 font-display text-xl uppercase text-toac-blue-950">Encadrement sportif</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {coachs
          ? coachs.map((c) => (
              <div
                key={c.id}
                className="relative flex items-center gap-4 rounded-lg border border-toac-gray-200 bg-white p-4 pr-9 shadow-sm"
              >
                <CmsEditPencil
                  payload={{ type: "edit-product", productId: c.id }}
                  className="absolute right-2 top-2 h-6 w-6 text-[10px]"
                />
                <CmsEditableImage
                  src={c.image_url}
                  alt={c.name}
                  target={{ kind: "product", id: c.id }}
                  className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-toac-gray-200"
                  imgClassName="h-14 w-14 rounded-full object-cover"
                  zoomable
                />
                <div>
                  <CmsEditableText
                    as="div"
                    value={c.name}
                    target={{ kind: "product", id: c.id, field: "name" }}
                    className="font-medium text-toac-blue-950"
                  />
                  {/* Sports cochés sur la fiche (dashboard → Catalogue →
                      Encadrement sportif) : même donnée que la liste des
                      encadrants de chaque page de sport. */}
                  {c.sports && c.sports.length > 0 && (
                    <div className="text-sm text-toac-blue-900/70">
                      {c.sports.map((sp) => DISCIPLINE_LABELS[sp as Discipline] ?? sp).join(" + ")}
                    </div>
                  )}
                  <CmsEditableText
                    as="div"
                    value={c.description}
                    target={{ kind: "product", id: c.id, field: "description" }}
                    className="text-sm text-toac-blue-900/70"
                  />
                </div>
              </div>
            ))
          : COACHS.map((c) => (
              <div key={c.name} className="flex items-center gap-4 rounded-lg border border-toac-gray-200 bg-white p-4 shadow-sm">
                <SiteImage name={`coach-${slugify(c.name)}`} label={c.name} className="h-14 w-14 shrink-0 rounded-full" zoomable />
                <div>
                  <div className="font-medium text-toac-blue-950">{c.name}</div>
                  <div className="text-sm text-toac-blue-900/70">{c.discipline}</div>
                </div>
              </div>
            ))}
        <CmsAddTile
          payload={{ type: "add-product", sectionId: coachsSection?.id }}
          label="+ Ajouter un coach"
        />
      </div>
    </div>
    </Suspense>
  );
}
