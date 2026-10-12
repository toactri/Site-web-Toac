import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import Link from "next/link";
import EnsureCmsBlocks, { type EnsureBlockSpec } from "@/components/EnsureCmsBlocks";
import { CmsEditableText, CmsEditPencil, CmsAddTile } from "@/components/cms-edit";
import AccordionBlock from "@/components/AccordionBlock";
import { renderRichText } from "@/lib/rich-text";
import { getCmsPageBlocks, getCmsHiddenBlocks, getCmsTrainingSessions, type CmsPageBlock } from "@/lib/cms";
import { sportSlotsTableWithLocation } from "@/lib/training";
import { slugify } from "@/lib/slug";
import { openrunnerEmbedUrl } from "@/lib/openrunner";

export const metadata: Metadata = pageMetadata({
  title: "Vélo : créneaux, matériel et consignes",
  description:
    "Sorties vélo du TOAC Triathlon : créneaux d'entraînement, matériel obligatoire et recommandé, consignes de sécurité et test chronométrique.",
  path: "/velo",
});

const OBLIGATOIRE_SLOT = "velo-materiel-obligatoire";
const RECOMMANDE_SLOT = "velo-materiel-recommande";
const CONSIGNES_SLOT = "velo-consignes";
const TEST_CHRONO_SLOT = "velo-test-chrono";
// Le texte de ce bloc est l'adresse du parcours Openrunner à intégrer (le
// lien "embed" ou le code <iframe> complet copié depuis Openrunner).
const PARCOURS_SLOT = "velo-parcours-chrono";

const DEFAULT_PARCOURS_URL =
  "https://www.openrunner.com/embed.html?code=2f762f6d3433333638694d4e2f6f336e5043514f2b4a354c3332742b64504a795755624533336d373955513d3a3ac3060dd4e8223e6ec617b4ac5428486c&lng=auto&unit=metric";

const DEFAULT_SECTIONS: Record<string, { heading: string; body: string }> = {
  [OBLIGATOIRE_SLOT]: {
    heading: "Matériel obligatoire",
    body: [
      "- Casque",
      "- Matériel de réparation / crevaison",
      "- Bidon rempli",
      "- Papiers d'identité",
      "- Téléphone",
      "- Tenue adaptée aux conditions climatiques",
      "",
      "**En cas de brouillard : lumières avant et arrière obligatoires.**",
    ].join("\n"),
  },
  [RECOMMANDE_SLOT]: {
    heading: "Matériel recommandé",
    body: [
      "- Lunettes",
      "- Gants",
      "- Navigateur avec le parcours chargé",
      "- Lumière rouge arrière",
      "- Nourriture",
      "- Carte bancaire",
      "- Espèces",
    ].join("\n"),
  },
  [CONSIGNES_SLOT]: {
    heading: "Consignes",
    body: [
      "- Être à l'heure, vélo prêt, cycliste en tenue pour le briefing.",
      "- Écouter et respecter les consignes des GBV (Gentils Bénévoles Vélo) qui encadrent la sortie.",
      "- Respecter le code de la route pour votre sécurité.",
      "- S'arrêter aux feux rouges pour passer le feu tous ensemble.",
      "- Rester avec le groupe ou prévenir qu'on abandonne la sortie en groupe.",
      "- Prévenir les camarades roulant derrière des dangers qui arrivent (les GBV vont vous expliquer les signes à faire).",
      "- Ne pas mettre de grands coups de freins (sauf danger imminent).",
      "- Suivre le GBV même s'il se trompe d'itinéraire et s'arrêter tranquillement plus loin pour revenir sur l'itinéraire.",
      "- Avoir enregistré le numéro de téléphone de votre GBV.",
    ].join("\n"),
  },
  [TEST_CHRONO_SLOT]: {
    heading: "Test chronométrique",
    body: [
      "On propose aux adhérents un test chrono le **samedi 07/11/2026**.",
      "",
      "- Départ par groupes de niveaux du TOAC à 9h, le trajet jusqu'à Lacroix-Falgarde servira d'échauffement.",
      "- Pas de drafting : il faut rester à 12 m minimum du cycliste devant soi, ou le doubler.",
      "- Chaque cycliste est responsable de prendre son chrono avec son compteur ou avec une montre, et de renseigner son chrono ensuite.",
      "",
      "**L'objectif :**",
      "- Permettre à chacun de se tester à un instant T et définir des zones de travail pour progresser.",
      "- C'est un test individuel, pas une compétition entre adhérents.",
      "- Permettre de constituer des groupes de niveaux, notamment pour les sorties du samedi et/ou pour les stages.",
      "",
      "Chacun est libre de réaliser le test ou non, et peut tout à fait le réaliser le jour de son choix, indépendamment du 7/11.",
    ].join("\n"),
  },
  [PARCOURS_SLOT]: {
    heading: "Parcours chronométré",
    body: DEFAULT_PARCOURS_URL,
  },
};

const TEXT_SLOTS = [OBLIGATOIRE_SLOT, RECOMMANDE_SLOT, CONSIGNES_SLOT, TEST_CHRONO_SLOT];

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

export default async function VeloPage() {
  const [cmsBlocks, hiddenBlocks, trainingSessions] = await Promise.all([
    getCmsPageBlocks("velo"),
    getCmsHiddenBlocks("velo"),
    getCmsTrainingSessions(),
  ]);
  // Jours, horaires et lieux viennent du Planning (dashboard → Planning).
  const creneauxTable = sportSlotsTableWithLocation(trainingSessions, "velo");

  const hiddenSlots = new Set(hiddenBlocks.map((b) => b.slot).filter(Boolean));
  const blockBySlot = new Map((cmsBlocks ?? []).filter((b) => b.slot).map((b) => [b.slot as string, b]));

  const missingSlots: EnsureBlockSpec[] = Object.entries(DEFAULT_SECTIONS)
    .filter(([slot]) => !blockBySlot.has(slot) && !hiddenSlots.has(slot))
    .map(([slot, s]) => ({ slot, heading: s.heading, body: s.body }));

  const parcoursBlock = blockBySlot.get(PARCOURS_SLOT);
  const parcoursUrl = hiddenSlots.has(PARCOURS_SLOT)
    ? null
    : openrunnerEmbedUrl(parcoursBlock ? parcoursBlock.body : DEFAULT_PARCOURS_URL);
  const parcoursHeading = parcoursBlock?.heading ?? DEFAULT_SECTIONS[PARCOURS_SLOT].heading;

  // Blocs ajoutés depuis le dashboard ("+ Ajouter un bloc"), affichés à la suite.
  const knownSlots = new Set(Object.keys(DEFAULT_SECTIONS));
  const extraBlocks = (cmsBlocks ?? []).filter((b) => !b.slot || !knownSlots.has(b.slot));

  const textSection = (slot: string) =>
    hiddenSlots.has(slot) ? null : <TextSection key={slot} slot={slot} block={blockBySlot.get(slot)} />;

  return (
    <Suspense fallback={null}>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <EnsureCmsBlocks slug="velo" blocks={missingSlots} />
        <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">Vélo</h1>

        <div className="mt-10 space-y-8">
          {creneauxTable && (
            <section id="velo-creneaux" className="scroll-mt-24">
              <h2 className="font-display text-lg uppercase text-toac-blue-950">Créneaux d&apos;entraînement</h2>
              <div className="mt-3 space-y-3 text-sm text-toac-blue-900/90">{renderRichText(creneauxTable)}</div>
              <p className="mt-2 text-xs text-toac-blue-900/70">
                Détails et lieux de rendez-vous : <Link href="/entrainements" className="underline hover:text-toac-pink-500">planning de la semaine</Link>.
              </p>
            </section>
          )}

          {TEXT_SLOTS.map(textSection)}

          {parcoursUrl && (
            <section id={PARCOURS_SLOT} className="relative scroll-mt-24 border-t border-toac-gray-200 pt-8">
              {parcoursBlock ? (
                <>
                  <CmsEditPencil
                    payload={{ type: "edit-block", blockId: parcoursBlock.id }}
                    className="absolute -right-2 top-6 h-6 w-6 text-[10px]"
                  />
                  <CmsEditableText
                    as="h2"
                    value={parcoursHeading}
                    target={{ kind: "block", id: parcoursBlock.id, field: "heading" }}
                    className="font-display text-lg uppercase text-toac-blue-950"
                  />
                </>
              ) : (
                <h2 className="font-display text-lg uppercase text-toac-blue-950">{parcoursHeading}</h2>
              )}
              <iframe
                title={parcoursHeading}
                src={parcoursUrl}
                width="100%"
                height="650"
                loading="lazy"
                className="mt-3 w-full rounded-lg border-0"
              />
            </section>
          )}

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
