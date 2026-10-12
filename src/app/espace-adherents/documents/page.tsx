import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCmsPageBlocks } from "@/lib/cms";
import { CmsEditableText, CmsEditableImage, CmsAddTile } from "@/components/cms-edit";

export const metadata: Metadata = {
  title: "Documents & infos internes",
  robots: { index: false, follow: false },
};

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/documents");

  // « Documents à télécharger » et « Canaux de communication » affichent « À venir »
  // le temps de revoir leur contenu (toujours présent dans le catalogue CMS et
  // dans l'historique git).
  const pageBlocks = await getCmsPageBlocks("espace-documents");

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
      <p className="mt-4 text-sm text-toac-blue-900/70">À venir.</p>

      <h2 className="mt-10 font-display text-lg uppercase text-toac-blue-950">Canaux de communication</h2>
      <p className="mt-4 text-sm text-toac-blue-900/70">À venir.</p>
    </div>
  );
}
