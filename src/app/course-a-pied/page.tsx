import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import Link from "next/link";
import EnsureCmsBlocks, { type EnsureBlockSpec } from "@/components/EnsureCmsBlocks";
import { CmsEditableText, CmsAddTile } from "@/components/cms-edit";
import AccordionBlock from "@/components/AccordionBlock";
import PageTabs, { type PageTab } from "@/components/PageTabs";
import { renderRichText } from "@/lib/rich-text";
import { getCmsPageBlocks, getCmsHiddenBlocks, getCmsTrainingSessions, type CmsPageBlock } from "@/lib/cms";
import { sportSlotsTableWithLocation } from "@/lib/training";
import { slugify } from "@/lib/slug";

export const metadata: Metadata = pageMetadata({
  title: "Course à pied : créneaux et tests VMA",
  description:
    "Course à pied au TOAC Triathlon : créneaux d'entraînement et tests chrono (VMA) proposés aux adhérents.",
  path: "/course-a-pied",
});

const TESTS_CHRONO_SLOT = "course-tests-chrono";

const DEFAULT_SECTIONS: Record<string, { heading: string; body: string }> = {
  [TESTS_CHRONO_SLOT]: {
    heading: "Tests chrono",
    body: [
      "Les adhérents ont le choix entre 3 tests chrono :",
      "",
      "**Test 1 : test VMA à Capitany avec Moulay**",
      "Organisé dans le cadre de la séance du **jeudi 15/10**, rendez-vous à **12h20**.",
      "",
      "**Test 2 : test VMA sur la piste d'athlé de Balma avec Alain**",
      "Le CA Balma vous propose un test VMA le **samedi 31 octobre**, encadré par Alain Mialon. Ce test est l'occasion de mesurer votre vitesse maximale aérobie et de repartir avec une meilleure connaissance de vos capacités pour adapter vos entraînements et vos allures de course ! 💪",
      "Pour faciliter l'organisation de la séance, plusieurs créneaux sont proposés. Pensez à vous inscrire à l'avance en choisissant votre créneau !",
      "[[S'inscrire au test VMA du 31 octobre]](https://doodle.com/sign-up-sheet/participate/ed802bcc-4eb6-44d4-b974-8157de612710/select)",
      "⚠️ Un imprévu ? En cas de retard ou d'annulation, merci de prévenir directement Alain afin de permettre une bonne organisation des groupes : 📧 alainmialon@orange.fr / 📱 06 85 52 67 06",
      "",
      "**Test 3 : nouveau test VMA en mars 2027**",
      "Alain organisera un autre test VMA en mars 2027.",
      "",
      "**En autonomie**",
      "Vous avez aussi la possibilité de réaliser votre test en autonomie : contactez l'un des coachs pour connaître les méthodes possibles.",
    ].join("\n"),
  },
};

function TextSection({ slot, block }: { slot: string; block?: CmsPageBlock }) {
  const fallback = DEFAULT_SECTIONS[slot];

  if (block?.block_type === "accordion") {
    return <AccordionBlock block={block} className="scroll-mt-24" />;
  }

  return (
    <section id={slot} className="scroll-mt-24 border-t border-toac-gray-200 pt-8 first:border-0 first:pt-0">
      {block ? (
        <CmsEditableText
          as="h2"
          value={block.heading}
          target={{ kind: "block", id: block.id, field: "heading" }}
          className="font-display text-lg uppercase text-toac-blue-950"
        />
      ) : (
        <h2 className="font-display text-lg uppercase text-toac-blue-950">{fallback.heading}</h2>
      )}
      {block ? (
        <CmsEditableText
          as="div"
          value={block.body}
          target={{ kind: "block", id: block.id, field: "body" }}
          multiline
          className="mt-3 block space-y-3 whitespace-pre-line text-sm text-toac-blue-900/90"
        />
      ) : (
        <div className="mt-3 space-y-3 text-sm text-toac-blue-900/90">{renderRichText(fallback.body)}</div>
      )}
    </section>
  );
}

export default async function CourseAPiedPage() {
  const [cmsBlocks, hiddenBlocks, trainingSessions] = await Promise.all([
    getCmsPageBlocks("course-a-pied"),
    getCmsHiddenBlocks("course-a-pied"),
    getCmsTrainingSessions(),
  ]);
  // Jours, horaires et lieux viennent du Planning (dashboard → Planning).
  const creneauxTable = sportSlotsTableWithLocation(trainingSessions, "course");
  const hiddenSlots = new Set(hiddenBlocks.map((b) => b.slot).filter(Boolean));
  const blockBySlot = new Map((cmsBlocks ?? []).filter((b) => b.slot).map((b) => [b.slot as string, b]));

  const missingSlots: EnsureBlockSpec[] = Object.entries(DEFAULT_SECTIONS)
    .filter(([slot]) => !blockBySlot.has(slot) && !hiddenSlots.has(slot))
    .map(([slot, s]) => ({ slot, heading: s.heading, body: s.body }));

  // Blocs ajoutés depuis le dashboard ("+ Ajouter un bloc"), affichés sous les onglets.
  const knownSlots = new Set(Object.keys(DEFAULT_SECTIONS));
  const extraBlocks = (cmsBlocks ?? []).filter((b) => !b.slot || !knownSlots.has(b.slot));

  const tabs: PageTab[] = [
    {
      id: "creneaux",
      label: "Créneaux",
      content: (
        <section id="course-creneaux" className="scroll-mt-24">
          <h2 className="font-display text-lg uppercase text-toac-blue-950">Créneaux d&apos;entraînement</h2>
          <div className="mt-3 space-y-3 text-sm text-toac-blue-900/90">
            {creneauxTable ? renderRichText(creneauxTable) : <p>Les créneaux sont affichés dans le planning de la semaine.</p>}
          </div>
          <p className="mt-2 text-xs text-toac-blue-900/70">
            Détails et lieux de rendez-vous : <Link href="/entrainements" className="underline hover:text-toac-pink-500">planning de la semaine</Link>.
          </p>
        </section>
      ),
    },
  ];
  if (!hiddenSlots.has(TESTS_CHRONO_SLOT)) {
    tabs.push({
      id: "tests-chrono",
      label: "Tests chrono",
      content: <TextSection slot={TESTS_CHRONO_SLOT} block={blockBySlot.get(TESTS_CHRONO_SLOT)} />,
    });
  }

  return (
    <Suspense fallback={null}>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <EnsureCmsBlocks slug="course-a-pied" blocks={missingSlots} />
        <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">Course à pied</h1>

        <div className="mt-10">
          <PageTabs tabs={tabs} />
        </div>

        <div className="mt-8 space-y-8">
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
