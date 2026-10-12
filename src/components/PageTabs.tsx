"use client";

import { useEffect, useState, type ReactNode } from "react";

export type PageTab = { id: string; label: string; content: ReactNode };

/**
 * Onglets en haut de page (ex. Créneaux / Tests chrono sur /course-a-pied).
 * Tous les panneaux sont rendus côté serveur et seulement masqués : leur
 * contenu reste lisible par Google et l'édition CMS y fonctionne comme
 * ailleurs. L'onglet actif suit l'ancre de l'URL (/course-a-pied#tests-chrono),
 * ce qui permet de partager un lien qui ouvre directement le bon onglet.
 */
export default function PageTabs({ tabs }: { tabs: PageTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);

  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.slice(1);
      if (tabs.some((t) => t.id === hash)) setActive(hash);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [tabs]);

  const select = (id: string) => {
    setActive(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-toac-gray-200">
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              onClick={() => select(tab.id)}
              className={`-mb-px border-b-2 px-4 py-2 font-display text-sm uppercase tracking-wide transition ${
                selected
                  ? "border-toac-pink-500 text-toac-pink-500"
                  : "border-transparent text-toac-blue-900/70 hover:text-toac-blue-950"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active}
          className="pt-8"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
