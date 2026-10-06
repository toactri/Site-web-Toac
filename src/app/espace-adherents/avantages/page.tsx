import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AVANTAGES_PARTENAIRES } from "@/content/partenaires";
import { getCmsPageBlocks, getCmsCatalog, PARTNERS_SECTION_NAME } from "@/lib/cms";
import { CmsEditableText } from "@/components/cms-edit";

export const metadata: Metadata = {
  title: "Avantages partenaires",
  robots: { index: false, follow: false },
};

export default async function AvantagesPage() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/avantages");

  const [introBlocks, cmsCatalog] = await Promise.all([
    getCmsPageBlocks("espace-avantages"),
    getCmsCatalog(),
  ]);
  const introBlock = introBlocks?.[0];
  // L'avantage est un champ de la fiche partenaire (dashboard → Partenaires) :
  // plus de liste « Avantages partenaires » à tenir à jour en parallèle.
  const partnersWithBenefits = cmsCatalog
    ? (cmsCatalog.find((s) => s.name === PARTNERS_SECTION_NAME)?.products ?? []).filter((p) =>
        p.member_benefits?.trim()
      )
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      {introBlock ? (
        <>
          <CmsEditableText
            as="h1"
            value={introBlock.heading || "Avantages partenaires"}
            target={{ kind: "block", id: introBlock.id, field: "heading" }}
            className="section-title block font-display text-3xl uppercase text-toac-blue-950"
          />
          <CmsEditableText
            as="p"
            value={
              introBlock.body ||
              "Réductions réservées aux adhérents du TOAC Triathlon. Présentez votre licence FFTRI mentionnant le club lorsque demandé."
            }
            target={{ kind: "block", id: introBlock.id, field: "body" }}
            multiline
            className="mt-4 block text-toac-blue-900/80"
          />
        </>
      ) : (
        <>
          <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
            Avantages partenaires
          </h1>
          <p className="mt-4 text-toac-blue-900/80">
            Réductions réservées aux adhérents du TOAC Triathlon. Présentez votre licence FFTRI mentionnant le
            club lorsque demandé.
          </p>
        </>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {partnersWithBenefits
          ? partnersWithBenefits.map((p) => (
              <div key={p.id} className="rounded-lg border border-toac-gray-200 bg-white p-5 shadow-sm">
                <h2 className="font-display text-base uppercase text-toac-blue-950">{p.name}</h2>
                <CmsEditableText
                  as="p"
                  value={p.member_benefits ?? ""}
                  target={{ kind: "product", id: p.id, field: "member_benefits" }}
                  multiline
                  className="mt-2 block whitespace-pre-line text-sm text-toac-blue-900/90"
                />
              </div>
            ))
          : AVANTAGES_PARTENAIRES.map((p) => (
              <div key={p.name} className="rounded-lg border border-toac-gray-200 bg-white p-5 shadow-sm">
                <h2 className="font-display text-base uppercase text-toac-blue-950">{p.name}</h2>
                <p className="text-sm text-toac-blue-900/60">{p.ville}</p>
                <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-toac-blue-900/90">
                  {p.avantages.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
                {p.conditions && (
                  <p className="mt-3 text-xs text-toac-blue-900/60">⚠️ {p.conditions}</p>
                )}
              </div>
            ))}
      </div>
    </div>
  );
}
