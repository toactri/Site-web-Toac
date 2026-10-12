"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

/**
 * Accordéon visuel (même rendu que les blocs CMS de type "accordion", voir
 * AccordionBlock) pour un contenu quelconque : titre + panneau dépliable.
 * `anchor` sert d'id HTML ; l'accordéon s'ouvre tout seul quand l'URL pointe
 * dessus (ex. /velo#velo-test-chrono).
 */
export default function Accordion({
  title,
  children,
  anchor,
  defaultOpen = false,
  topRight,
  className = "",
}: {
  title: ReactNode;
  children: ReactNode;
  anchor?: string | null;
  defaultOpen?: boolean;
  /** Élément positionné en haut à droite (ex. crayon d'édition CMS). */
  topRight?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `accordion-panel-${useId()}`;

  // Sans ça, un lien vers une ancre repliée fait juste défiler jusqu'à un
  // titre fermé, sans montrer le contenu visé.
  useEffect(() => {
    if (!anchor) return;
    const checkHash = () => {
      if (window.location.hash === `#${anchor}`) setOpen(true);
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, [anchor]);

  return (
    <div
      id={anchor ?? undefined}
      className={`relative scroll-mt-24 rounded-lg border border-toac-gray-200 bg-white p-5 pr-10 shadow-sm ${className}`}
    >
      {topRight}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Masquer" : "Afficher"}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="flex cursor-pointer items-center justify-between gap-2"
      >
        {title}
        <span aria-hidden="true" className="shrink-0 text-toac-blue-700">
          <svg
            className={`h-5 w-5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M5.25 7.5L10 12.25L14.75 7.5H5.25Z" />
          </svg>
        </span>
      </div>
      <div id={panelId} className="faq-panel" data-open={open}>
        <div>
          <div className="faq-panel-inner pt-4 text-sm text-toac-blue-900/80">{children}</div>
        </div>
      </div>
    </div>
  );
}
