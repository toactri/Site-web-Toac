// Variables utilisables dans tous les textes CMS : écrire {{adresse}},
// {{email}} ou {{Adhésion club (plein tarif)}} dans un bloc affiche la valeur
// enregistrée en base, au lieu d'une valeur recopiée à la main dans le texte.
//
// Sources, par ordre de priorité :
//  1. Dashboard → Informations : {{nom}}, {{adresse}}, {{téléphone}}, {{email}}
//  2. Dashboard → Catalogue : toute fiche, par son nom exact (casse et
//     espaces ignorés) — son prix s'il en a un ("145 €"), sinon sa
//     description. Une rubrique "Variables" permet d'y ranger des valeurs
//     libres (ex. fiche "Téléphone gardien", description "06 47 83 77 20").
//
// Une variable inconnue reste affichée telle quelle ({{...}}) pour que
// l'erreur de frappe se voie immédiatement sur le site.

import type { CmsCatalogSection, CmsSiteSettings } from "@/lib/cms";

export type CmsVariables = Record<string, string>;

const TOKEN_REGEX = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function variableKey(name: string): string {
  return name.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
  }).format(price);
}

export function buildCmsVariables(
  settings: CmsSiteSettings | null,
  catalog: CmsCatalogSection[] | null
): CmsVariables {
  const vars: CmsVariables = {};
  for (const section of catalog ?? []) {
    for (const p of section.products) {
      const key = variableKey(p.name);
      if (!key || key in vars) continue;
      const value = p.price != null ? formatPrice(p.price) : p.description.trim();
      if (value) vars[key] = value;
    }
  }
  const fromSettings: [string[], string | undefined][] = [
    [["nom"], settings?.business_name],
    [["adresse"], settings?.address],
    [["téléphone", "telephone"], settings?.phone],
    [["email", "e-mail"], settings?.email],
  ];
  for (const [keys, value] of fromSettings) {
    if (value?.trim()) for (const k of keys) vars[k] = value.trim();
  }
  return vars;
}

/** Remplace les {{variables}} connues ; laisse les autres intactes. */
export function applyCmsVariables(text: string, vars: CmsVariables): string {
  if (!text.includes("{{")) return text;
  return text.replace(TOKEN_REGEX, (match, name: string) => vars[variableKey(name)] ?? match);
}
