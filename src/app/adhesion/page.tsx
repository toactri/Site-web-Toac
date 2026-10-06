import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { getCmsPageBlocks, getCmsHiddenBlocks } from "@/lib/cms";
import { CmsEditableText, CmsAddTile } from "@/components/cms-edit";
import EtapeAccordionItem from "@/components/EtapeAccordionItem";
import TarifsAccordion, { TARIFS_SLOT, DEFAULT_HEADING as TARIFS_HEADING, DEFAULT_BODY as TARIFS_BODY } from "@/components/TarifsAccordion";
import EnsureCmsBlocks, { type EnsureBlockSpec } from "@/components/EnsureCmsBlocks";

export const metadata: Metadata = pageMetadata({
  title: "Nous rejoindre : adhésion et licence",
  description:
    "Rejoindre le TOAC Triathlon : étapes d'adhésion, tarifs de la licence, pièces à fournir et pré-inscription en ligne pour la saison.",
  path: "/adhesion",
});

const ETAPES = [
  "Remplir le formulaire de pré-adhésion",
  "Demande de licence FFTRI",
  "Rejoindre les listes Google et la communauté WhatsApp du club",
  "Commander sa trifonction TOAC",
];

export default async function AdhesionPage() {
  const [cmsBlocks, hiddenBlocks] = await Promise.all([
    getCmsPageBlocks("adhesion"),
    getCmsHiddenBlocks("adhesion"),
  ]);

  // Le bloc Tarifs est identifié par son type explicite "accordion" (réglable
  // dans le dashboard) — critère PRIORITAIRE — avec repli sur son slot fixe
  // pour les blocs créés avant l'existence de block_type. Un bloc qui matche
  // l'un OU l'autre critère est exclu des étapes, pour qu'aucun des deux
  // mécanismes ne puisse le laisser réapparaître en double.
  // .trim() : un slot saisi à la main dans le dashboard (via le champ
  // "Identifiant technique") peut contenir un espace superflu invisible à
  // l'écran (ex. collé depuis un message) — sans ça, la comparaison stricte
  // échoue silencieusement et le bloc n'est jamais reconnu.
  const isTarifsBlock = (b: { block_type: string; slot: string | null }) =>
    b.block_type === "accordion" || b.slot?.trim() === TARIFS_SLOT;
  const tarifsBlock = cmsBlocks?.find(isTarifsBlock);
  const tarifsHidden = hiddenBlocks.some(isTarifsBlock);
  const nonTarifsBlocks = cmsBlocks?.filter((b) => !isTarifsBlock(b)) ?? [];

  // Rôle explicite (block_type, réglable dans le dashboard) plutôt que
  // déduit de la position dans la liste : un bloc mal classé ou en double
  // se glissait auparavant en silence à la mauvaise place (ex. un bloc
  // Tarifs orphelin, sans slot, rendu comme étape). Repli sur le 1er bloc
  // par position si aucun n'a encore le type "intro" (blocs créés avant
  // l'existence de block_type), pour ne rien casser rétroactivement.
  const introBlock = nonTarifsBlocks.find((b) => b.block_type === "intro") ?? nonTarifsBlocks[0];
  const etapeBlocks = nonTarifsBlocks.filter((b) => b.id !== introBlock?.id);

  // Emplacement fixe pas encore créé dans le CMS : créé automatiquement (sans
  // clic) dès l'ouverture de l'aperçu dans le dashboard.
  const missingSlotCandidates: (EnsureBlockSpec | null)[] = [
    !tarifsBlock && !tarifsHidden
      ? {
          slot: TARIFS_SLOT,
          heading: TARIFS_HEADING,
          body: TARIFS_BODY,
          block_type: "accordion",
        }
      : null,
  ];
  const missingSlots = missingSlotCandidates.filter((spec): spec is EnsureBlockSpec => spec !== null);

  return (
    <Suspense fallback={null}>
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <EnsureCmsBlocks slug="adhesion" blocks={missingSlots} />
      {introBlock ? (
        <>
          <CmsEditableText
            as="h1"
            value={introBlock.heading || "Nous rejoindre"}
            target={{ kind: "block", id: introBlock.id, field: "heading" }}
            className="section-title font-display text-3xl uppercase text-toac-blue-950"
          />
          <CmsEditableText
            as="p"
            value={
              introBlock.body ||
              "Nouvelles adhésions : merci de prendre contact avec le bureau avant de finaliser votre inscription."
            }
            target={{ kind: "block", id: introBlock.id, field: "body" }}
            multiline
            className="mt-4 block text-toac-blue-900/80"
          />
        </>
      ) : (
        <>
          <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
            Nous rejoindre
          </h1>
          <p className="mt-4 text-toac-blue-900/80">
            Nouvelles adhésions : merci de prendre contact avec le bureau avant de finaliser votre inscription.
          </p>
        </>
      )}

      {!tarifsHidden && (
        <div className="mt-10">
          <TarifsAccordion block={tarifsBlock} />
        </div>
      )}

      <ol className="mt-4 space-y-4">
        {etapeBlocks.length
          ? etapeBlocks.map((block, i) => (
              <EtapeAccordionItem key={block.id} index={i} block={block} />
            ))
          : ETAPES.map((etape, i) => (
              <li key={etape} className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-toac-blue-950 font-display text-sm text-toac-pink-400">
                  {i + 1}
                </span>
                <span className="pt-1 text-toac-blue-900/90">{etape}</span>
              </li>
            ))}
        <li>
          <CmsAddTile payload={{ type: "add-block" }} label="+ Ajouter une étape" />
        </li>
      </ol>
    </div>
    </Suspense>
  );
}
