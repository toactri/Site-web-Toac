import { redirect } from "next/navigation";

/** Ancienne page « Suivi de mon dossier » : les liens déjà envoyés mènent à l'accueil de l'espace. */
export default function AncienDossier() {
  redirect("/espace-adherents");
}
