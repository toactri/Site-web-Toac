import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { insertPreinscription, DatabaseNotConfiguredError } from "@/lib/db";
import { buildErrorHtml } from "@/lib/errorHtml";

/**
 * Étape 1 du parcours d'adhésion : pré-inscription (reprend les questions du
 * formulaire Google Forms historique du club). Aucun paiement ici — juste un
 * enregistrement en base, consultable dans Bureau → Pré-inscriptions. Le
 * paiement de la cotisation (étape 4) intervient plus tard, une fois la
 * licence FFTRI validée par le club.
 *
 * Laisse le temps à une base Neon en veille de se réveiller (voir
 * /api/adhesion, même contrainte Vercel Hobby).
 */
export const maxDuration = 30;

function htmlError(message: string) {
  return new NextResponse(buildErrorHtml(message, "/adhesion"), {
    status: 400,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function POST(request: NextRequest) {
  const form = await request.formData();

  const email = String(form.get("email") ?? "").trim();
  const nom = String(form.get("nom") ?? "").trim();
  const prenom = String(form.get("prenom") ?? "").trim();
  const telephone = String(form.get("telephone") ?? "").trim();
  const dateNaissance = String(form.get("dateNaissance") ?? "");
  const permisConduire = form.get("permisConduire") === "oui";
  const numeroPermis = permisConduire ? String(form.get("numeroPermis") ?? "").trim() : null;
  const benevolat = form.getAll("benevolat").map(String);
  const reglementAccepte = form.get("reglementAccepte") === "on";
  const trifonction = form.getAll("trifonction").map(String);
  const brevetsFederaux = String(form.get("brevetsFederaux") ?? "");
  const arbitrage = String(form.get("arbitrage") ?? "");
  const soutienPartenaire = String(form.get("soutienPartenaire") ?? "");
  const stageArgeles = String(form.get("stageArgeles") ?? "");
  const stageMontagne = String(form.get("stageMontagne") ?? "");
  const questionsSuggestions = String(form.get("questionsSuggestions") ?? "").trim();
  const statut = String(form.get("statut") ?? "");

  if (!email || !nom || !prenom || !telephone || !dateNaissance) {
    return htmlError("Merci de renseigner votre email, nom, prénom, téléphone et date de naissance.");
  }
  if (permisConduire && !numeroPermis) {
    return htmlError("Merci de renseigner votre numéro de permis de conduire.");
  }
  if (!reglementAccepte) {
    return htmlError("Merci de confirmer avoir pris connaissance du règlement intérieur.");
  }
  if (!brevetsFederaux || !arbitrage || !soutienPartenaire || !stageArgeles || !stageMontagne || !statut) {
    return htmlError("Merci de répondre à toutes les questions obligatoires du formulaire.");
  }

  try {
    await insertPreinscription({
      email,
      nom,
      prenom,
      telephone,
      dateNaissance,
      permisConduire,
      numeroPermis,
      benevolat,
      reglementAccepte,
      trifonction,
      brevetsFederaux,
      arbitrage,
      soutienPartenaire,
      stageArgeles,
      stageMontagne,
      questionsSuggestions,
      statut,
    });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      console.error(error.message);
      return htmlError(
        "Le formulaire n'est pas encore relié à une base de données côté serveur. Contactez le bureau directement en attendant."
      );
    }
    console.error("Échec de l'enregistrement de la pré-inscription :", error);
    return htmlError("Une erreur est survenue. Réessayez plus tard.");
  }

  return NextResponse.redirect(new URL("/preinscription/confirmation", request.url), 303);
}
