export interface NavLink {
  label: string;
  href: string;
  protected?: boolean;
}

export interface NavItem {
  label: string;
  href?: string;
  children?: NavLink[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Accueil", href: "/" },
  {
    label: "Le Club",
    href: "/le-club",
    children: [
      { label: "À propos / Notre histoire", href: "/le-club" },
      { label: "Le bureau & les coachs", href: "/le-club/bureau" },
      { label: "La vie du club", href: "/le-club/vie-du-club" },
      { label: "Nos partenaires", href: "/partenaires" },
    ],
  },
  {
    label: "Entraînements",
    href: "/entrainements",
    children: [
      { label: "Planning de la semaine", href: "/entrainements" },
      { label: "Lieux - Points de rdv", href: "/entrainements/points-de-rdv" },
      { label: "Natation", href: "/natation" },
      { label: "Vélo", href: "/velo" },
      { label: "Tests chrono", href: "/tests-chrono" },
    ],
  },
  {
    label: "Triathlons du Lauragais",
    href: "/triathlons-du-lauragais",
    children: [
      { label: "Édition 2027", href: "/triathlons-du-lauragais" },
      { label: "Infos Bénévoles TOAC 2027", href: "/espace-adherents/tdl-2027", protected: true },
    ],
  },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export const FOOTER_SITEMAP: NavLink[] = [
  { label: "Accueil", href: "/" },
  { label: "Le Club", href: "/le-club" },
  { label: "Entraînements", href: "/entrainements" },
  { label: "Triathlons du Lauragais", href: "/triathlons-du-lauragais" },
  { label: "FAQ", href: "/faq" },
  { label: "Nous rejoindre", href: "/adhesion" },
  { label: "Contact", href: "/contact" },
  { label: "Règlement intérieur", href: "/reglement-interieur" },
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "Politique de confidentialité", href: "/confidentialite" },
];
