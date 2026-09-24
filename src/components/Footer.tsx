import Link from "next/link";
import { FOOTER_SITEMAP, type NavLink } from "@/lib/nav";
import SiteLogo from "./SiteLogo";
import { CmsEditableText, CmsPartnerName, CmsEditPencil, CmsAddTile } from "./cms-edit";
import type { CmsPageBlock, CmsCatalogSection, CmsSiteSettings } from "@/lib/cms";

const PARTNERS = [
  "Foulées Toulouse",
  "Vertical Bike",
  "Cryo Sud",
  "Alltricks",
  "Trek",
];

const TAGLINE = "Nager, rouler, courir à Toulouse depuis 1992.";
const ADDRESS = "20 chemin de Garric\n31200 Toulouse";

export default function Footer({
  footerBlocks,
  footerItems,
  partenairesSection,
  partnerHrefFor,
  socialLinks,
  email,
}: {
  footerBlocks?: CmsPageBlock[] | null;
  footerItems?: NavLink[] | null;
  partenairesSection?: CmsCatalogSection;
  /** Lien vers la page du partenaire sur le site, si elle existe (sinon lien externe). */
  partnerHrefFor?: (name: string) => string | undefined;
  socialLinks?: CmsSiteSettings["social_links"];
  email?: string;
}) {
  // email === undefined : CMS injoignable, on garde l'adresse par défaut.
  // email === "" : l'admin a volontairement vidé le champ dans Informations
  // pour ne plus afficher d'adresse dans le pied de page.
  const contactEmail = email === undefined ? "contact@toac-triathlon.com" : email;
  const sitemapLinks = footerItems && footerItems.length ? footerItems : FOOTER_SITEMAP;
  const infoBlock = footerBlocks?.[0];
  // Blocs supplémentaires ajoutés depuis le dashboard ("+ Ajouter un bloc") :
  // le 1er bloc sert au logo/tagline/adresse, les suivants s'affichent
  // librement sous les 4 colonnes (mentions, horaires, message ponctuel…).
  const extraBlocks = footerBlocks?.slice(1) ?? [];
  const partnerNames = partenairesSection?.products.length
    ? partenairesSection.products.map((p) => ({ id: p.id, name: p.name, url: p.url }))
    : null;

  return (
    <footer className="bg-toac-blue-950 text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="mb-3 inline-block rounded-md bg-white/95 p-2">
            <SiteLogo className="h-10 w-auto" />
          </div>
          {infoBlock ? (
            <>
              <CmsEditableText
                as="p"
                value={infoBlock.heading || TAGLINE}
                target={{ kind: "block", id: infoBlock.id, field: "heading" }}
                className="block text-sm text-white/70"
              />
              <CmsEditableText
                as="p"
                value={infoBlock.body || ADDRESS}
                target={{ kind: "block", id: infoBlock.id, field: "body" }}
                multiline
                className="mt-4 block whitespace-pre-line text-sm text-white/70"
              />
            </>
          ) : (
            <>
              <p className="text-sm text-white/70">{TAGLINE}</p>
              <p className="mt-4 whitespace-pre-line text-sm text-white/70">{ADDRESS}</p>
            </>
          )}
        </div>

        <div>
          <h3 className="mb-3 font-display text-sm uppercase tracking-wide text-toac-pink-400">
            <Link href="/" className="hover:text-toac-pink-300">
              Accueil
            </Link>
          </h3>
          <ul className="space-y-2 text-sm text-white/80">
            {sitemapLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 font-display text-sm uppercase tracking-wide text-toac-pink-400">
            <Link href="/contact" className="hover:text-toac-pink-300">
              Contact
            </Link>
          </h3>
          <ul className="space-y-2 text-sm text-white/80">
            {contactEmail && (
              <li className="flex items-center gap-2">
                <a href={`mailto:${contactEmail}`} className="hover:text-white">
                  {contactEmail}
                </a>
                <CmsEditPencil payload={{ type: "edit-info-field", field: "email" }} />
              </li>
            )}
            <li className="flex items-center gap-2">
              <a
                href={socialLinks?.instagram || "https://www.instagram.com/triathlonsdulauragais"}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                {socialLinks?.instagram_label || "Instagram @triathlonsdulauragais"}
              </a>
              <CmsEditPencil payload={{ type: "edit-info-field", field: "instagram" }} />
            </li>
            <li className="flex items-center gap-2">
              <a
                href={socialLinks?.facebook || "https://www.facebook.com/"}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                {socialLinks?.facebook_label || "Facebook Triathlons du Lauragais"}
              </a>
              <CmsEditPencil payload={{ type: "edit-info-field", field: "facebook" }} />
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 font-display text-sm uppercase tracking-wide text-toac-pink-400">
            <Link href="/partenaires" className="hover:text-toac-pink-300">
              Partenaires
            </Link>
          </h3>
          <ul className="space-y-2 text-sm text-white/80">
            {partnerNames
              ? partnerNames.map((p) => (
                  <li key={p.id}>
                    <CmsPartnerName
                      as="span"
                      value={p.name}
                      url={p.url}
                      href={partnerHrefFor?.(p.name)}
                      target={{ kind: "product", id: p.id, field: "name" }}
                      className="hover:text-white"
                    />
                  </li>
                ))
              : PARTNERS.map((partner) => <li key={partner}>{partner}</li>)}
          </ul>
        </div>
      </div>

      {(extraBlocks.length > 0 || infoBlock) && (
        <div className="mx-auto max-w-7xl space-y-4 px-4 pb-10 sm:px-6 lg:px-8">
          {extraBlocks.map((block) => (
            <div key={block.id} className="border-t border-white/10 pt-4 text-sm text-white/70">
              {block.heading && (
                <CmsEditableText
                  as="p"
                  value={block.heading}
                  target={{ kind: "block", id: block.id, field: "heading" }}
                  className="block font-medium text-white/90"
                />
              )}
              <CmsEditableText
                as="div"
                value={block.body}
                target={{ kind: "block", id: block.id, field: "body" }}
                multiline
                className="mt-1 block"
              />
            </div>
          ))}
          <CmsAddTile payload={{ type: "add-block" }} label="+ Ajouter un bloc au pied de page" />
        </div>
      )}

      <div className="border-t border-white/10 px-4 py-6 text-center text-xs text-white/50 sm:px-6 lg:px-8">
        © {new Date().getFullYear()} TOAC Triathlon — Association affiliée FFTRI, soutenue par le Toulouse Olympique
        Aérospatiale Club.
      </div>
    </footer>
  );
}
