"use client";

import type { ReactNode } from "react";
import Accordion from "@/components/Accordion";
import { CmsEditableText, CmsEditableImage, CmsEditPencil } from "@/components/cms-edit";
import type { CmsPageBlock } from "@/lib/cms";

/**
 * Rendu générique d'un bloc dont le type (dashboard → "Type de bloc") est
 * "accordion" : replié par défaut, sur n'importe quelle page. Avant ce
 * composant, seul le bloc Tarifs de /adhesion (TarifsAccordion) donnait un
 * sens visuel à ce type — choisi ailleurs dans le dashboard, il ne changeait
 * rien à l'affichage puisqu'aucun autre code ne le lisait.
 */
export default function AccordionBlock({
  block,
  className = "",
  defaultOpen = false,
  children,
}: {
  block: CmsPageBlock;
  className?: string;
  /** Déplié au chargement de la page. */
  defaultOpen?: boolean;
  /** Contenu affiché sous le texte du bloc, dans le panneau dépliable. */
  children?: ReactNode;
}) {
  return (
    <Accordion
      anchor={block.anchor}
      defaultOpen={defaultOpen}
      className={className}
      topRight={<CmsEditPencil payload={{ type: "edit-block", blockId: block.id }} className="absolute right-3 top-3" />}
      title={
        <CmsEditableText
          as="span"
          value={block.heading}
          target={{ kind: "block", id: block.id, field: "heading" }}
          className="font-display text-lg uppercase text-toac-blue-950"
        />
      }
    >
      {block.image_url && (
        <CmsEditableImage
          src={block.image_url}
          alt={block.heading}
          target={{ kind: "block", id: block.id }}
          className="mb-4 aspect-video w-full overflow-hidden rounded-md"
          imgClassName="aspect-video w-full rounded-md object-cover"
        />
      )}
      <CmsEditableText
        as="div"
        value={block.body}
        target={{ kind: "block", id: block.id, field: "body" }}
        multiline
        className="block whitespace-pre-line"
      />
      {children}
    </Accordion>
  );
}
