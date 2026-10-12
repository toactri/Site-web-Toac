import type { MetadataRoute } from "next";
import { getCmsCatalog, getCmsPages } from "@/lib/cms";
import { slugify } from "@/lib/slug";
import { SITE_URL } from "@/lib/seo";

/** Pages publiques indexables. Les pages noindex (/connexion,
 *  /espace-adherents, confirmations de paiement) sont volontairement exclues. */
const ROUTES = [
  "",
  "/le-club",
  "/le-club/bureau",
  "/le-club/vie-du-club",
  "/partenaires",
  "/entrainements",
  "/entrainements/points-de-rdv",
  "/natation",
  "/velo",
  "/course-a-pied",
  "/musculation",
  "/triathlons-du-lauragais",
  "/faq",
  "/adhesion",
  "/contact",
  "/arbitrage",
  "/mentions-legales",
  "/confidentialite",
  "/reglement-interieur",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  // Fiches partenaires : même règle que les liens "En savoir plus" de
  // /partenaires — un partenaire du catalogue n'a une page dédiée que si un
  // slug de page CMS correspond à son nom. On ne peut pas lister toutes les
  // pages CMS, la table contient aussi les pages éditoriales (footer,
  // arbitrage…). Si le CMS est injoignable, on publie quand même le sitemap
  // statique plutôt que d'échouer le build.
  const [cmsPages, cmsCatalog] = await Promise.all([
    getCmsPages().catch(() => null),
    getCmsCatalog().catch(() => null),
  ]);
  const pageSlugs = new Set(cmsPages?.map((page) => page.slug) ?? []);
  const partnerRoutes = (cmsCatalog ?? [])
    .filter((section) => section.name.startsWith("Partenaires"))
    .flatMap((section) => section.products)
    .map((product) => slugify(product.name))
    .filter((slug) => pageSlugs.has(slug))
    .filter((slug, index, all) => all.indexOf(slug) === index)
    .map((slug) => `/partenaires/${slug}`);

  return [...ROUTES, ...partnerRoutes].map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified,
  }));
}
