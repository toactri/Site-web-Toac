import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCmsCatalog, getCmsPageBlocks } from "@/lib/cms";
import { CmsEditableText, CmsEditableImage, CmsEditPencil, CmsAddTile } from "@/components/cms-edit";

export const metadata: Metadata = {
  title: "Documents & infos internes",
  robots: { index: false, follow: false },
};

const DOCUMENTS = [
  { label: "Décharge musculation (PDF)", href: "#" },
  { label: "Formulaire d'adhésion (PDF)", href: "#" },
  { label: "Règlement intérieur", href: "/reglement-interieur" },
  { label: "Compte-rendu AG 2025 (PDF)", href: "#" },
  { label: "Bilan financier 2025 (PDF)", href: "#" },
];

const CANAUX = [
  {
    titre: "Questions au bureau",
    detail: "contact@toac-triathlon.com",
  },
  {
    titre: "Échanges entre membres",
    detail: "toac-triathlon---forum@googlegroups.com (mails « TOAC - Forum »)",
  },
  {
    titre: "Infos officielles du club",
    detail:
      "toac-triathlon---info-club@googlegroups.com (mails « TOAC - Info Club », sans réponse possible)",
  },
  { titre: "Communauté WhatsApp", detail: "« TOAC Tri »" },
  { titre: "Application d'entraînement", detail: "IDO" },
  { titre: "Piscine Castex", detail: "Code-barres envoyé par mail/WhatsApp pour badger" },
];

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/documents");

  const [cmsCatalog, pageBlocks] = await Promise.all([
    getCmsCatalog(),
    getCmsPageBlocks("espace-documents"),
  ]);
  const documentsSection = cmsCatalog?.find((s) => s.name === "Documents adhérents");
  const canauxSection = cmsCatalog?.find((s) => s.name === "Canaux de communication");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
        Documents & infos internes
      </h1>

      <Link
        href="/espace-adherents/tdl-2027"
        className="mt-8 block rounded-md border border-toac-gray-200 border-l-4 border-l-toac-pink-500 bg-white px-4 py-3 text-sm shadow-sm hover:bg-toac-gray-50"
      >
        <span className="font-medium text-toac-blue-950">Triathlons du Lauragais 2027 : réunion de lancement</span>
        <span className="block text-toac-blue-900/70">Bilan 2026, pôles, rôles, missions et comment s&apos;investir.</span>
      </Link>

      <Link
        href="/espace-adherents/comptes-rendus"
        className="mt-3 block rounded-md border border-toac-gray-200 border-l-4 border-l-toac-pink-500 bg-white px-4 py-3 text-sm shadow-sm hover:bg-toac-gray-50"
      >
        <span className="font-medium text-toac-blue-950">Comptes rendus de course</span>
        <span className="block text-toac-blue-900/70">Les récits des Toacistes, par type d&apos;épreuve.</span>
      </Link>

      <div className="mt-8 space-y-4">
        {pageBlocks?.map((block) => (
          <div key={block.id} id={block.anchor ?? undefined} className="relative scroll-mt-24 rounded-lg">
            {block.image_url && (
              <CmsEditableImage
                src={block.image_url}
                alt={block.heading}
                target={{ kind: "block", id: block.id }}
                className="mb-4 aspect-video w-full overflow-hidden rounded-lg"
                imgClassName="aspect-video w-full rounded-lg object-cover"
              />
            )}
            {block.heading && (
              <CmsEditableText
                as="h2"
                value={block.heading}
                target={{ kind: "block", id: block.id, field: "heading" }}
                className="font-display text-lg uppercase text-toac-blue-950"
              />
            )}
            {block.body && (
              <CmsEditableText
                as="div"
                value={block.body}
                target={{ kind: "block", id: block.id, field: "body" }}
                multiline
                className="mt-2 block text-sm text-toac-blue-900/90"
              />
            )}
          </div>
        ))}
        <CmsAddTile payload={{ type: "add-block" }} label="+ Ajouter un bloc de texte" />
      </div>

      <h2 className="mt-10 font-display text-lg uppercase text-toac-blue-950">Documents à télécharger</h2>
      <p className="mt-1 text-xs text-toac-blue-900/50">
        Le nom du document est modifiable directement ; le lien de téléchargement se modifie via le champ
        « description » du produit dans le dashboard.
      </p>
      <ul className="mt-4 space-y-2">
        {documentsSection
          ? documentsSection.products.map((doc) => (
              <li key={doc.id} className="relative pr-9">
                <CmsEditPencil
                  payload={{ type: "edit-product", productId: doc.id }}
                  className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 text-[10px]"
                />
                <a
                  href={doc.description || "#"}
                  className="flex items-center gap-2 rounded-md border border-toac-gray-200 bg-white px-4 py-3 text-sm text-toac-blue-950 shadow-sm hover:bg-toac-gray-50"
                >
                  📄{" "}
                  <CmsEditableText
                    as="span"
                    value={doc.name}
                    target={{ kind: "product", id: doc.id, field: "name" }}
                  />
                </a>
              </li>
            ))
          : DOCUMENTS.map((doc) => (
              <li key={doc.label}>
                <a href={doc.href} className="flex items-center gap-2 rounded-md border border-toac-gray-200 bg-white px-4 py-3 text-sm text-toac-blue-950 shadow-sm hover:bg-toac-gray-50">
                  📄 {doc.label}
                </a>
              </li>
            ))}
        <li>
          <CmsAddTile
            payload={{ type: "add-product", sectionId: documentsSection?.id }}
            label="+ Ajouter un document"
          />
        </li>
      </ul>

      <h2 className="mt-10 font-display text-lg uppercase text-toac-blue-950">Canaux de communication</h2>
      <ul className="mt-4 space-y-3">
        {canauxSection
          ? canauxSection.products.map((c) => (
              <li key={c.id} className="relative rounded-md border border-toac-gray-200 bg-white p-4 pr-9 text-sm shadow-sm">
                <CmsEditPencil
                  payload={{ type: "edit-product", productId: c.id }}
                  className="absolute right-2 top-2 h-6 w-6 text-[10px]"
                />
                <CmsEditableText
                  as="div"
                  value={c.name}
                  target={{ kind: "product", id: c.id, field: "name" }}
                  className="font-medium text-toac-blue-950"
                />
                <CmsEditableText
                  as="div"
                  value={c.description}
                  target={{ kind: "product", id: c.id, field: "description" }}
                  className="text-toac-blue-900/70"
                />
              </li>
            ))
          : CANAUX.map((c) => (
              <li key={c.titre} className="rounded-md border border-toac-gray-200 bg-white p-4 text-sm shadow-sm">
                <div className="font-medium text-toac-blue-950">{c.titre}</div>
                <div className="text-toac-blue-900/70">{c.detail}</div>
              </li>
            ))}
        <li>
          <CmsAddTile
            payload={{ type: "add-product", sectionId: canauxSection?.id }}
            label="+ Ajouter un canal"
          />
        </li>
      </ul>
    </div>
  );
}
