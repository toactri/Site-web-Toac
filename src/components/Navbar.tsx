"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { NAV_ITEMS, type NavItem, type NavLink } from "@/lib/nav";
import { useAuth } from "./AuthProvider";
import SiteLogo from "./SiteLogo";

const BUREAU_ITEM: NavItem = {
  label: "Bureau",
  children: [
    { label: "Dossiers adhérents", href: "/espace-adherents/bureau" },
    { label: "Demandes d'adhésion", href: "/espace-adherents/bureau/inscriptions" },
    { label: "Pré-inscriptions", href: "/espace-adherents/bureau/preinscriptions" },
    { label: "Avantages partenaires", href: "/espace-adherents/bureau/partenaires" },
    { label: "Décharges musculation", href: "/espace-adherents/bureau/musculation" },
    { label: "Diagnostic serveur", href: "/espace-adherents/bureau/diagnostic" },
  ],
};

export default function Navbar({ items }: { items?: NavItem[] | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { auth, requireAuth, logout } = useAuth();

  const navItems = useMemo(() => {
    const base = items && items.length ? items : NAV_ITEMS;
    // Menu "Bureau" : uniquement une fois connecté avec un compte admin — sans
    // ça il fallait deviner l'URL de chaque page bureau pour y accéder.
    return auth.role === "admin" ? [...base, BUREAU_ITEM] : base;
  }, [items, auth.role]);

  function handleLinkClick(
    event: React.MouseEvent<HTMLAnchorElement>,
    link: NavLink
  ) {
    if (link.protected && !auth.loggedIn) {
      event.preventDefault();
      requireAuth(link.href);
    }
    setMobileOpen(false);
    setOpenDropdown(null);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-toac-gray-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Navigation principale">
        <Link href="/" className="flex shrink-0 items-center">
          <SiteLogo className="h-10 w-auto" />
        </Link>

        <div className="hidden items-center gap-0.5 xl:flex">
          {navItems.map((item) => (
            <div
              key={item.label}
              className="relative shrink-0"
              onMouseEnter={() => item.children && setOpenDropdown(item.label)}
              onMouseLeave={() => item.children && setOpenDropdown(null)}
              onFocus={() => item.children && setOpenDropdown(item.label)}
              onBlur={(e) => {
                if (item.children && !e.currentTarget.contains(e.relatedTarget as Node)) {
                  setOpenDropdown(null);
                }
              }}
            >
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1 whitespace-nowrap px-2.5 py-2 text-sm font-medium text-toac-blue-950 hover:text-toac-blue-600"
                >
                  {item.label}
                  {item.children && (
                    <svg
                      aria-hidden="true"
                      className={`h-3 w-3 shrink-0 transition-transform ${openDropdown === item.label ? "rotate-180" : ""}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M5.25 7.5L10 12.25L14.75 7.5H5.25Z" />
                    </svg>
                  )}
                </Link>
              ) : (
                <button
                  type="button"
                  aria-expanded={openDropdown === item.label}
                  aria-haspopup="true"
                  onClick={() =>
                    setOpenDropdown(openDropdown === item.label ? null : item.label)
                  }
                  className="flex items-center gap-1 whitespace-nowrap px-2.5 py-2 text-sm font-medium text-toac-blue-950 hover:text-toac-blue-600"
                >
                  {item.label}
                  <svg
                    aria-hidden="true"
                    className={`h-3 w-3 shrink-0 transition-transform ${openDropdown === item.label ? "rotate-180" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M5.25 7.5L10 12.25L14.75 7.5H5.25Z" />
                  </svg>
                </button>
              )}

              {item.children && openDropdown === item.label && (
                <div className="absolute left-0 top-full w-64 rounded-md border border-toac-gray-200 bg-white py-2 shadow-lg">
                  {item.children.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={(e) => handleLinkClick(e, link)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-toac-blue-950 hover:bg-toac-pink-300/30"
                    >
                      {link.protected && <span aria-hidden="true">🔒</span>}
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {auth.loggedIn && (
          <div className="hidden shrink-0 items-center gap-3 whitespace-nowrap text-sm xl:flex">
            <span className="text-toac-blue-950">Bonjour {auth.name}</span>
            <button
              type="button"
              onClick={() => logout()}
              className="font-medium text-toac-blue-700 hover:text-toac-blue-950"
            >
              Se déconnecter
            </button>
          </div>
        )}

        <button
          type="button"
          className="xl:hidden"
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <div className="flex h-6 w-7 flex-col justify-between">
            <span className={`h-0.5 w-full bg-toac-blue-950 transition ${mobileOpen ? "translate-y-2.5 rotate-45" : ""}`} />
            <span className={`h-0.5 w-full bg-toac-blue-950 transition ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`h-0.5 w-full bg-toac-blue-950 transition ${mobileOpen ? "-translate-y-2.5 -rotate-45" : ""}`} />
          </div>
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-toac-gray-200 bg-white xl:hidden">
          <div className="space-y-1 px-4 py-4">
            {navItems.map((item) => (
              <div key={item.label}>
                <Link
                  href={item.href ?? item.children![0].href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 font-medium text-toac-blue-950"
                >
                  {item.label}
                </Link>
                {item.children && (
                  <div className="ml-4 space-y-1 border-l border-toac-gray-200 pl-4">
                    {item.children.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={(e) => handleLinkClick(e, link)}
                        className="flex items-center gap-2 py-1.5 text-sm text-toac-blue-900"
                      >
                        {link.protected && <span aria-hidden="true">🔒</span>}
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {auth.loggedIn && (
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => logout()}
                  className="w-full rounded-md border border-toac-blue-800 px-4 py-2 text-sm font-medium text-toac-blue-950"
                >
                  Se déconnecter ({auth.name})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
