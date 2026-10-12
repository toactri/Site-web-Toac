import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAdhesionByEmail } from "@/lib/db";
import { DOSSIER_DRIVE_ID, RUBRIQUES } from "@/lib/comptesRendus";
import CompteRenduUploadForm from "@/components/CompteRenduUploadForm";

export const metadata: Metadata = {
  title: "Comptes rendus de course",
  robots: { index: false, follow: false },
};

// Les comptes rendus restent dans le Drive du club : la page ne fait que
// renvoyer vers chaque sous-dossier, un CR ajouté au Drive est donc visible
// sans toucher au site. Réservé aux adhérents : ce sont des récits personnels.

const DOSSIER_DRIVE = `https://drive.google.com/drive/folders/${DOSSIER_DRIVE_ID}`;

export default async function ComptesRendusPage() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/comptes-rendus");

  // Le prénom pré-rempli vient de la fiche adhérent ; à défaut, du nom de session.
  const adhesion = await getAdhesionByEmail(session.username).catch(() => null);
  const prenom = adhesion?.prenom ?? session.name.split(" ")[0] ?? "";
  const envoiConfigure = Boolean(process.env.CR_DRIVE_UPLOAD_URL && process.env.CR_DRIVE_UPLOAD_SECRET);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
        Comptes rendus de course
      </h1>
      <p className="mt-4 text-toac-blue-900/80">
        Les récits de course des Toacistes, rangés par type d&apos;épreuve. De quoi préparer votre prochain
        objectif avec les conseils de ceux qui l&apos;ont déjà bouclé.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {RUBRIQUES.map((r) => (
          <li key={r.id}>
            <a
              href={`https://drive.google.com/drive/folders/${r.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-full rounded-lg border border-toac-gray-200 border-l-4 border-l-toac-pink-500 bg-white p-5 shadow-sm transition hover:bg-toac-gray-50"
            >
              <span className="font-display text-lg uppercase text-toac-blue-950">{r.titre} →</span>
              {r.detail && <span className="mt-1 block text-sm text-toac-blue-900/70">{r.detail}</span>}
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm">
        <a href={DOSSIER_DRIVE} target="_blank" rel="noopener noreferrer" className="text-toac-blue-600 underline">
          Ouvrir le dossier complet sur Google Drive
        </a>
      </p>

      <section className="mt-10 rounded-md border border-toac-gray-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg uppercase text-toac-blue-950">Partager mon compte rendu</h2>
        {envoiConfigure ? (
          <CompteRenduUploadForm prenomParDefaut={prenom} />
        ) : (
          <p className="mt-2 text-sm text-toac-blue-900/80">
            Contactez le bureau via le{" "}
            <Link href="/contact" className="underline">
              formulaire de contact
            </Link>{" "}
            pour le partager (PDF nommé « année-course-prénom », ex. : 26-IM-Tours-Rémi.pdf).
          </p>
        )}
      </section>
    </div>
  );
}
