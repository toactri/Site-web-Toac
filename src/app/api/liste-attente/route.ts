import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { upsertListeAttente, DatabaseNotConfiguredError } from "@/lib/db";
import { buildErrorHtml } from "@/lib/errorHtml";
import { checkFormSubmission } from "@/lib/formGuard";
import { ageAt } from "@/lib/age";
import { GENRES, STATUTS, LISTE_ATTENTE_SAISON } from "@/lib/listeAttente";

const BACK_HREF = "/adhesion#liste-attente";

/**
 * Inscription sur la liste d'attente de la saison suivante, depuis la page
 * Adhésion (formulaire public, sans connexion). Consultée par le bureau dans
 * Espace adhérents → Bureau → Liste d'attente.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const champ = (nom: string) => String(form.get(nom) ?? "").trim();

  const nom = champ("nom");
  const prenom = champ("prenom");
  const genre = champ("genre");
  const email = champ("email").toLowerCase();
  const telephone = champ("telephone");
  const dateNaissance = champ("date_naissance");
  const statut = champ("statut");
  const benevole = champ("benevole_tdl");
  const consentement = form.get("consentement") === "on";

  function htmlError(message: string) {
    return new NextResponse(buildErrorHtml(message, BACK_HREF), {
      status: 400,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (!nom || !prenom || !email || !telephone || !dateNaissance) {
    return htmlError("Merci de renseigner tous les champs du formulaire.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return htmlError("Merci de renseigner une adresse email valide.");
  }
  if ((telephone.match(/\d/g) ?? []).length < 9) {
    return htmlError("Merci de renseigner un numéro de téléphone valide.");
  }
  const age = ageAt(dateNaissance);
  if (age === null || age > 100) {
    return htmlError("Merci de renseigner une date de naissance valide.");
  }
  if (!(GENRES as readonly string[]).includes(genre) || !(STATUTS as readonly string[]).includes(statut)) {
    return htmlError("Merci de choisir ton genre et ton statut dans les listes proposées.");
  }
  if (benevole !== "oui" && benevole !== "non") {
    return htmlError("Merci d'indiquer ta disponibilité pour le bénévolat TDL.");
  }
  if (!consentement) {
    return htmlError("Merci d'accepter que le club conserve tes coordonnées pour pouvoir t'inscrire.");
  }

  // Robot probable : même redirection qu'un envoi réussi, rien n'est enregistré.
  const guard = checkFormSubmission(form, { nom, prenom });
  if (guard.kind === "spam") {
    console.info("[liste-attente] Inscription bloquée (anti-spam) :", guard.reason, { email });
    return NextResponse.redirect(new URL("/adhesion?attente=1#liste-attente", request.url), 303);
  }
  if (guard.kind === "reload") {
    return htmlError("Le formulaire a expiré. Recharge la page puis renvoie ton inscription.");
  }

  try {
    await upsertListeAttente({
      saison: LISTE_ATTENTE_SAISON,
      nom,
      prenom,
      genre,
      email,
      telephone,
      date_naissance: dateNaissance,
      statut,
      benevole_tdl: benevole === "oui",
    });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      console.error(error.message);
      return htmlError("L'inscription est momentanément indisponible. Contacte le bureau directement en attendant.");
    }
    console.error("Échec de l'inscription sur la liste d'attente :", error);
    return htmlError("Une erreur est survenue. Réessaie plus tard.");
  }

  return NextResponse.redirect(new URL("/adhesion?attente=1#liste-attente", request.url), 303);
}
