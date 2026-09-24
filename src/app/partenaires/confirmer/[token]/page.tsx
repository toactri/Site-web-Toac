import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo";
import { getPartnerSignupByToken, DatabaseNotConfiguredError } from "@/lib/db";
import ConfirmerPartenaireAjout from "@/components/ConfirmerPartenaireAjout";
import DbSetupNotice from "@/components/DbSetupNotice";

export const metadata: Metadata = privatePageMetadata("Confirmer un ajout partenaire");

// Le statut change juste après le clic sur « Confirmer l'ajout » : la page
// est rejouée à chaque affichage plutôt que servie depuis un cache.
export const dynamic = "force-dynamic";

const titleClass = "section-title font-display text-3xl uppercase text-toac-blue-950";

const PARTNER_LABELS: Record<string, string> = {
  alltricks: "Alltricks",
};

export default async function ConfirmerPartenairePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let signup;
  try {
    signup = await getPartnerSignupByToken(token);
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <DbSetupNotice />
        </div>
      );
    }
    throw error;
  }

  if (!signup) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className={titleClass}>Lien introuvable</h1>
        <p className="mt-4 text-toac-blue-900/80">Ce lien de confirmation n&apos;est pas valide.</p>
      </div>
    );
  }

  const label = PARTNER_LABELS[signup.partenaire] ?? signup.partenaire;

  const recueLe = new Date(signup.recue_le).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });

  if (signup.statut === "ajoute") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className={titleClass}>Déjà confirmé</h1>
        <p className="mt-4 rounded-md border border-green-300 bg-green-50 p-4 text-green-800">
          {signup.prenom} {signup.nom} est déjà confirmé(e) sur le compte {label} et en a été informé(e) par
          email. Rien d&apos;autre à faire.
        </p>
      </div>
    );
  }

  // Seconde étape volontaire : le lien de l'email (GET) n'enregistre rien,
  // seul le bouton ci-dessous (POST) confirme. Les scanners de liens des
  // messageries (Safe Links, antivirus, aperçus) ne peuvent donc pas
  // valider une demande à la place du responsable. La page doit se lire
  // d'un coup d'œil : qui, sur quel compte, un bouton.
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="font-display text-sm uppercase tracking-wide text-toac-pink-500">Partenariat {label}</p>
      <h1 className={`${titleClass} mt-1`}>Vérifie l&apos;adhérent avant de confirmer</h1>

      <div className="mt-8 rounded-lg border-2 border-toac-blue-900/15 bg-white p-6 shadow-sm">
        <p className="font-display text-2xl uppercase text-toac-blue-950">
          {signup.prenom} {signup.nom}
        </p>
        <p className="mt-1 break-all text-lg font-medium text-toac-blue-700">{signup.email}</p>
        <p className="mt-3 text-sm text-toac-blue-900/60">Demande reçue le {recueLe}</p>
      </div>

      <p className="mt-6 text-toac-blue-900/80">
        C&apos;est bien lui ou elle, et cette adresse est ajoutée sur le compte {label} du club ?
      </p>

      <div className="mt-4">
        <ConfirmerPartenaireAjout token={signup.token ?? token} />
        <p className="mt-3 text-sm text-toac-blue-900/60">
          {signup.prenom} recevra automatiquement un email lui indiquant que son avantage est activé.
        </p>
      </div>
    </div>
  );
}
