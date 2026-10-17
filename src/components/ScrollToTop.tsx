"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Next ne remonte pas toujours en haut de page après un clic sur un lien
// (constaté depuis le pied de page, surtout sur mobile : la nouvelle page
// s'affiche mais on reste en bas, sans voir qu'elle a changé). On force donc
// le retour en haut à chaque changement de page, sauf :
// - lien vers une ancre (#section) : Next se charge d'y défiler ;
// - bouton Précédent/Suivant : le navigateur restaure la position d'avant.
export default function ScrollToTop() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);
  const isHistoryNavigation = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      isHistoryNavigation.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (isHistoryNavigation.current) {
      isHistoryNavigation.current = false;
      return;
    }
    if (window.location.hash) return;
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
