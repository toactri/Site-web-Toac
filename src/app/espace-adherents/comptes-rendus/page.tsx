import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Comptes rendus de course",
  robots: { index: false, follow: false },
};

// Les comptes rendus restent dans le Drive du club : la page ne fait que
// renvoyer vers chaque sous-dossier, un CR ajouté au Drive est donc visible
// sans toucher au site. Réservé aux adhérents : ce sont des récits personnels.

const DOSSIER_DRIVE = "https://drive.google.com/drive/folders/1dOpD_dMQ8Th-eDHKImZizeLdHg2_UyV9";

const RUBRIQUES = [
  { titre: "Ironman", detail: "Hawaï, Tours…", id: "1FTOuEh7bGVUxyMTCvj8XJLnTmqBAUzJB" },
  { titre: "Embrunman", detail: "Le mythe haut-alpin.", id: "1B96bKMK0Z_ozSryVelFjOCemnNXWmm9v" },
  { titre: "Altriman", detail: "Half et Olympic.", id: "1W_XnJqoCv7ibJOuGw7qauDjyGNiKvyhf" },
  { titre: "Saison triathlon", detail: "Bilans de toute une saison.", id: "1cNo-onJ19tPKIdzLHQKlXTTuRaeg63fB" },
  { titre: "Duathlons", detail: "", id: "1MqEt2dnKQ6ZwJnztfhkH-xD-EXrJqxVY" },
  { titre: "Marathons", detail: "Paris, Séville…", id: "1bnt9uZ7W8h6bcBS087AAp-DI4Zqu7Q8B" },
  { titre: "Trails", detail: "", id: "1KliKRNCH3jAOmKxjeXePxP3OKg7g2Mx7" },
  { titre: "Autres", detail: "XTri, paratriathlon, gazettes…", id: "1UxNcSsO9Kk3qic5lZ6-lCdr-rXMJDqMc" },
];

export default async function ComptesRendusPage() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/comptes-rendus");

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

      <div className="mt-10 rounded-md border border-toac-gray-200 bg-white p-4 text-sm text-toac-blue-900/80 shadow-sm">
        <p className="font-medium text-toac-blue-950">Vous avez écrit le récit de votre course ?</p>
        <p className="mt-1">
          Envoyez-le en PDF au bureau,{" "}
          <a href="mailto:contact@toac-triathlon.com" className="underline">
            contact@toac-triathlon.com
          </a>
          , nommé « année-course-prénom » (ex. : 26-IM-Tours-Rémi.pdf).
        </p>
      </div>
    </div>
  );
}
