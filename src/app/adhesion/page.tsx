import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { getCmsPageBlocks, getCmsHiddenBlocks } from "@/lib/cms";
import { CmsEditableText, CmsAddTile } from "@/components/cms-edit";
import EtapeAccordionItem from "@/components/EtapeAccordionItem";
import TarifsAccordion, { TARIFS_SLOT, DEFAULT_HEADING as TARIFS_HEADING, DEFAULT_BODY as TARIFS_BODY } from "@/components/TarifsAccordion";
import EnsureCmsBlocks, { type EnsureBlockSpec } from "@/components/EnsureCmsBlocks";
import ListeAttenteForm from "@/components/ListeAttenteForm";
import type { CmsPageBlock } from "@/lib/cms";

export const metadata: Metadata = pageMetadata({
  title: "Nous rejoindre : adhésion et licence",
  description:
    "Rejoindre le TOAC Triathlon : liste d'attente pour la saison prochaine, tarifs de la licence et étapes d'adhésion.",
  path: "/adhesion",
});

const ETAPES = [
  "Remplir le formulaire de pré-adhésion",
  "Demande de licence FFTRI",
  "Rejoindre les listes Google et la communauté WhatsApp du club",
  "Commander sa trifonction TOAC",
];

// Blocs « saison » à emplacement fixe : texte d'en-tête de chaque saison,
// éditable dans le CMS, au-dessus du formulaire de liste d'attente (saison
// à venir) et des tarifs (saison en cours).
const SAISON_SUIVANTE_SLOT = "adhesion-saison-suivante";
const SAISON_EN_COURS_SLOT = "adhesion-saison-en-cours";
const SAISONS: Record<string, { heading: string; body: string }> = {
  [SAISON_SUIVANTE_SLOT]: {
    heading: "Saison 2027/2028",
    body:
      "**Liste d'attente**\nInscris-toi ci-dessous pour être recontacté(e) avant l'ouverture des adhésions 2027/2028.",
  },
  [SAISON_EN_COURS_SLOT]: {
    heading: "Saison 2026/2027",
    body: "**Inscriptions clôturées**, le club est complet pour la saison 2026/2027.",
  },
};

function SaisonHeader({ slot, block }: { slot: string; block: CmsPageBlock | undefined }) {
  const defaut = SAISONS[slot];
  if (!block) {
    return (
      <>
        <h2 className="font-display text-2xl uppercase text-toac-blue-950">{defaut.heading}</h2>
        {/* CMS injoignable : texte par défaut, **gras** seulement. */}
        <div className="mt-3 text-toac-blue-900/80">
          {defaut.body.split("\n").map((ligne) => (
            <p key={ligne}>
              {ligne.split("**").map((morceau, i) => (i % 2 ? <strong key={i}>{morceau}</strong> : morceau))}
            </p>
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      <CmsEditableText
        as="h2"
        value={block.heading || defaut.heading}
        target={{ kind: "block", id: block.id, field: "heading" }}
        className="block font-display text-2xl uppercase text-toac-blue-950"
      />
      <CmsEditableText
        as="p"
        value={block.body}
        target={{ kind: "block", id: block.id, field: "body" }}
        multiline
        className="mt-3 block text-toac-blue-900/80"
      />
    </>
  );
}

export default async function AdhesionPage({ searchParams }: { searchParams: Promise<{ attente?: string }> }) {
  const [cmsBlocks, hiddenBlocks, { attente }] = await Promise.all([
    getCmsPageBlocks("adhesion"),
    getCmsHiddenBlocks("adhesion"),
    searchParams,
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
  const saisonBlock = (slot: string) => cmsBlocks?.find((b) => b.slot?.trim() === slot);
  const saisonHidden = (slot: string) => hiddenBlocks.some((b) => b.slot?.trim() === slot);
  const isSaisonBlock = (b: { slot: string | null }) => !!b.slot && b.slot.trim() in SAISONS;
  const nonTarifsBlocks = cmsBlocks?.filter((b) => !isTarifsBlock(b) && !isSaisonBlock(b)) ?? [];

  // Rôle explicite (block_type, réglable dans le dashboard) plutôt que
  // déduit de la position dans la liste : un bloc mal classé ou en double
  // se glissait auparavant en silence à la mauvaise place (ex. un bloc
  // Tarifs orphelin, sans slot, rendu comme étape). Repli sur le 1er bloc
  // par position si aucun n'a encore le type "intro" (blocs créés avant
  // l'existence de block_type), pour ne rien casser rétroactivement.
  const introBlock = nonTarifsBlocks.find((b) => b.block_type === "intro") ?? nonTarifsBlocks[0];
  // Les étapes d'adhésion 2026/2027 sont masquées dans le CMS (hidden) tant
  // que les inscriptions sont closes : conservées pour préparer la saison
  // suivante, réaffichables depuis le dashboard. Le texte de secours ETAPES
  // ne sert que si le CMS est injoignable.
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
    ...Object.entries(SAISONS).map(([slot, d]) =>
      !saisonBlock(slot) && !saisonHidden(slot) ? { slot, heading: d.heading, body: d.body } : null
    ),
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
          {introBlock.body ? (
            <CmsEditableText
              as="p"
              value={introBlock.body}
              target={{ kind: "block", id: introBlock.id, field: "body" }}
              multiline
              className="mt-4 block text-toac-blue-900/80"
            />
          ) : null}
        </>
      ) : (
        <>
          <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
            Nous rejoindre
          </h1>
        </>
      )}

      {!saisonHidden(SAISON_SUIVANTE_SLOT) && (
        <section id="liste-attente" className="mt-10 scroll-mt-24 rounded-lg border border-toac-gray-200 bg-toac-gray-50 p-6">
          <SaisonHeader slot={SAISON_SUIVANTE_SLOT} block={saisonBlock(SAISON_SUIVANTE_SLOT)} />
          <div className="mt-6">
            <ListeAttenteForm envoye={attente === "1"} />
          </div>
        </section>
      )}

      <section className="mt-12">
        {!saisonHidden(SAISON_EN_COURS_SLOT) && (
          <SaisonHeader slot={SAISON_EN_COURS_SLOT} block={saisonBlock(SAISON_EN_COURS_SLOT)} />
        )}

        {!tarifsHidden && (
          <div className="mt-6">
            <TarifsAccordion block={tarifsBlock} />
          </div>
        )}

      <ol className="mt-4 space-y-4">
        {etapeBlocks.length
          ? etapeBlocks.map((block, i) => (
              <EtapeAccordionItem key={block.id} index={i} block={block} />
            ))
          : cmsBlocks
          ? null
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
      </section>
    </div>
    </Suspense>
  );
}
