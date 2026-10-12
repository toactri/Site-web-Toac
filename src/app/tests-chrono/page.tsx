import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import Link from "next/link";
import EnsureCmsBlocks, { type EnsureBlockSpec } from "@/components/EnsureCmsBlocks";
import { CmsEditableText, CmsAddTile } from "@/components/cms-edit";
import AccordionBlock from "@/components/AccordionBlock";
import { renderRichText } from "@/lib/rich-text";
import { getCmsPageBlocks, getCmsHiddenBlocks, type CmsPageBlock } from "@/lib/cms";
import { openrunnerEmbedUrl } from "@/lib/openrunner";
import { slugify } from "@/lib/slug";

export const metadata: Metadata = pageMetadata({
  title: "Tests chrono : dates, lieux et modalités",
  description:
    "Tests chronométriques du TOAC Triathlon en vélo, course à pied et natation : calendrier de la saison, lieux et modalités.",
  path: "/tests-chrono",
});

const RECAP_SLOT = "tests-chrono-recap";

const DEFAULT_RECAP = {
  heading: "Calendrier des tests",
  body: [
    "| Sport | Date | Lieu |",
    "| --- | --- | --- |",
    "| Natation | Septembre (tests passés) | JOB / Castex |",
    "| CAP | 15/10 | Piste Capitany (Colomiers) |",
    "| CAP | 31/10 | CA Balma |",
    "| Vélo | 07/11 | Lacroix-Falgarde |",
    "| CAP | Mars | CA Balma |",
  ].join("\n"),
};

/**
 * Pages sport dont on reprend le bloc « Test chrono ». Le contenu n'est PAS
 * recopié ici : il est relu à chaque affichage depuis la page du sport, donc
 * modifier le bloc sur /velo (ou /natation…) met cette page à jour aussitôt.
 * Bloc repéré par son emplacement fixe (`slot`) ou, à défaut, par un titre
 * contenant « test(s) chrono » (ex. bloc ajouté à la main sur /natation).
 */
const SPORTS: { label: string; slug: string; href: string | null; slot: string; parcoursSlot?: string }[] = [
  { label: "Vélo", slug: "velo", href: "/velo", slot: "velo-test-chrono", parcoursSlot: "velo-parcours-chrono" },
  { label: "Course à pied", slug: "course-a-pied", href: "/course-a-pied", slot: "course-tests-chrono" },
  { label: "Natation", slug: "natation", href: "/natation", slot: "natation-test-chrono" },
];

const TEST_CHRONO_HEADING = /tests?\s+chrono/i;

function findTestBlock(blocks: CmsPageBlock[] | null, slot: string): CmsPageBlock | undefined {
  return (
    blocks?.find((b) => b.slot === slot) ??
    blocks?.find((b) => (!b.slot || /tests?-chrono$/.test(b.slot)) && TEST_CHRONO_HEADING.test(b.heading))
  );
}

export default async function TestsChronoPage() {
  const [cmsBlocks, hiddenBlocks, ...sportBlocks] = await Promise.all([
    getCmsPageBlocks("tests-chrono"),
    getCmsHiddenBlocks("tests-chrono"),
    ...SPORTS.map((s) => getCmsPageBlocks(s.slug)),
  ]);

  const hiddenSlots = new Set(hiddenBlocks.map((b) => b.slot).filter(Boolean));
  const recapBlock = (cmsBlocks ?? []).find((b) => b.slot === RECAP_SLOT);
  const missingSlots: EnsureBlockSpec[] =
    recapBlock || hiddenSlots.has(RECAP_SLOT) ? [] : [{ slot: RECAP_SLOT, ...DEFAULT_RECAP }];
  const extraBlocks = (cmsBlocks ?? []).filter((b) => b.slot !== RECAP_SLOT);

  return (
    <Suspense fallback={null}>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <EnsureCmsBlocks slug="tests-chrono" blocks={missingSlots} />
        <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">Tests chrono</h1>

        <div className="mt-10 space-y-8">
          {!hiddenSlots.has(RECAP_SLOT) && (
            <section id={RECAP_SLOT} className="scroll-mt-24">
              {recapBlock ? (
                <>
                  <CmsEditableText
                    as="h2"
                    value={recapBlock.heading}
                    target={{ kind: "block", id: recapBlock.id, field: "heading" }}
                    className="font-display text-lg uppercase text-toac-blue-950"
                  />
                  <CmsEditableText
                    as="div"
                    value={recapBlock.body}
                    target={{ kind: "block", id: recapBlock.id, field: "body" }}
                    multiline
                    className="mt-3 block space-y-3 whitespace-pre-line text-sm text-toac-blue-900/90"
                  />
                </>
              ) : (
                <>
                  <h2 className="font-display text-lg uppercase text-toac-blue-950">{DEFAULT_RECAP.heading}</h2>
                  <div className="mt-3 space-y-3 text-sm text-toac-blue-900/90">{renderRichText(DEFAULT_RECAP.body)}</div>
                </>
              )}
            </section>
          )}

          {SPORTS.map((sport, i) => {
            const blocks = sportBlocks[i];
            const block = findTestBlock(blocks, sport.slot);
            const parcoursBlock = sport.parcoursSlot ? blocks?.find((b) => b.slot === sport.parcoursSlot) : undefined;
            const parcoursUrl = parcoursBlock ? openrunnerEmbedUrl(parcoursBlock.body) : null;

            return (
              <section
                key={sport.slug}
                id={`test-${sport.slug}`}
                className="scroll-mt-24 border-t border-toac-gray-200 pt-8"
              >
                <h2 className="font-display text-lg uppercase text-toac-blue-950">{sport.label}</h2>
                {block ? (
                  <>
                    {!TEST_CHRONO_HEADING.test(block.heading) && (
                      <h3 className="mt-2 font-semibold text-toac-blue-950">{block.heading}</h3>
                    )}
                    <div className="mt-3 space-y-3 text-sm text-toac-blue-900/90">{renderRichText(block.body)}</div>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-toac-blue-900/70">Modalités à venir.</p>
                )}
                {parcoursUrl && (
                  <iframe
                    title={parcoursBlock?.heading ?? "Parcours chronométré"}
                    src={parcoursUrl}
                    width="100%"
                    height="500"
                    loading="lazy"
                    className="mt-4 w-full rounded-lg border-0"
                  />
                )}
                {sport.href && (
                  <p className="mt-3 text-xs text-toac-blue-900/70">
                    Plus d&apos;infos sur la page{" "}
                    <Link href={sport.href} className="underline hover:text-toac-pink-500">
                      {sport.label}
                    </Link>
                    .
                  </p>
                )}
              </section>
            );
          })}

          {extraBlocks.map((block) =>
            block.block_type === "accordion" ? (
              <AccordionBlock key={block.id} block={block} />
            ) : (
              <section
                key={block.id}
                id={block.anchor || slugify(block.heading) || block.id}
                className="scroll-mt-24 border-t border-toac-gray-200 pt-8"
              >
                <CmsEditableText
                  as="h2"
                  value={block.heading}
                  target={{ kind: "block", id: block.id, field: "heading" }}
                  className="font-display text-lg uppercase text-toac-blue-950"
                />
                <CmsEditableText
                  as="div"
                  value={block.body}
                  target={{ kind: "block", id: block.id, field: "body" }}
                  multiline
                  className="mt-3 block space-y-3 whitespace-pre-line text-sm text-toac-blue-900/90"
                />
              </section>
            )
          )}
          <CmsAddTile payload={{ type: "add-block" }} label="+ Ajouter un bloc" />
        </div>
      </div>
    </Suspense>
  );
}
