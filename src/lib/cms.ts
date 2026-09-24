// Connexion en direct au CMS Devanture (Supabase) pour le site du TOAC Triathlon.
// Ne concerne QUE les pages publiques/vitrine — l'espace adhérents (comptes,
// dossiers, paiements) reste géré séparément par sa propre base de données.
// Si CMS_CONFIG.siteId n'est pas renseigné, toutes les fonctions ci-dessous
// renvoient null et les pages gardent leur contenu actuel (src/content/*).
//
// Les trois valeurs ci-dessous sont surchargeables par variables
// d'environnement (CMS_SUPABASE_URL, CMS_SUPABASE_ANON_KEY, CMS_SITE_ID) :
// c'est ce qui permet de rebrancher le site sur un autre projet Supabase — par
// exemple celui du club — sans toucher au code. Tant que ces variables ne sont
// pas définies, les valeurs de repli ci-dessous s'appliquent et le
// comportement est strictement inchangé.
//
// Aucune de ces trois valeurs n'est secrète : la clé « anon » est publique par
// conception (c'est celle que le navigateur enverrait), et l'accès aux données
// est borné par les règles RLS définies côté Supabase.

import type { NavItem, NavLink } from "@/lib/nav";
import { slugify } from "@/lib/slug";

/** Valeur d'environnement si elle est renseignée, sinon le repli fourni. */
function fromEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

const CMS_CONFIG = {
  supabaseUrl: fromEnv(
    "CMS_SUPABASE_URL",
    "https://kekjsyqakhpuzxxeralm.supabase.co"
  ),
  supabaseAnonKey: fromEnv(
    "CMS_SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtla2pzeXFha2hwdXp4eGVyYWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNDgwNDAsImV4cCI6MjA5OTYyNDA0MH0.vZdboaaVCYThBNH4zXGrb8gEYXwzmk5uHCoPiLFXhUI"
  ),
  siteId: fromEnv("CMS_SITE_ID", "f75cad77-b956-4822-83ff-bee764af2b4d"),
};

const isConfigured =
  CMS_CONFIG.supabaseUrl.startsWith("https://") &&
  CMS_CONFIG.supabaseAnonKey.length > 20 &&
  CMS_CONFIG.siteId.length > 10;

export type CmsPageBlock = {
  id: string;
  heading: string;
  body: string;
  image_url: string | null;
  position: number;
  slot: string | null;
  // Rôle explicite du bloc, réglable dans le dashboard : 'content' (défaut,
  // ex. une étape numérotée), 'intro', 'accordion'.
  block_type: string;
  // Ancre choisie par le client dans le dashboard (ex. "tarifs"), utilisée
  // comme id HTML pour permettre un lien "#tarifs" pointant sur ce bloc.
  anchor: string | null;
};

export type CmsSiteSettings = {
  business_name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  opening_hours: { jour: string; horaires: string }[];
  social_links: {
    facebook?: string;
    instagram?: string;
    site_web?: string;
    reservation_url?: string;
    facebook_label?: string;
    instagram_label?: string;
  };
  theme?: { pink?: string; blue?: string };
};

export type CmsProduct = {
  id: string;
  section_id: string | null;
  name: string;
  description: string;
  price: number | null;
  image_url: string | null;
  url: string | null;
  position: number;
};

export type CmsCatalogSection = {
  id: string;
  name: string;
  position: number;
  products: CmsProduct[];
};

type CmsNavRow = {
  id: string;
  parent_id: string | null;
  label: string;
  href: string;
  protected: boolean;
  nav_position: number | null;
  footer_position: number | null;
};

async function fetchFromCms<T>(table: string, query: string): Promise<T[] | null> {
  if (!isConfigured) return null;

  const url =
    CMS_CONFIG.supabaseUrl + "/rest/v1/" + table + "?site_id=eq." + CMS_CONFIG.siteId + query;

  try {
    const res = await fetch(url, {
      headers: {
        apikey: CMS_CONFIG.supabaseAnonKey,
        Authorization: "Bearer " + CMS_CONFIG.supabaseAnonKey,
      },
      // no-store plutôt qu'un revalidate temporisé : ce cache de fetch,
      // indépendant du cache de route que revalidatePath invalide, pouvait
      // renvoyer une réponse Supabase périmée même juste après une
      // revalidation à la demande réussie (revalidatePath ne force pas la
      // réexécution d'un fetch encore dans sa propre fenêtre de fraîcheur).
      // Lecture temps réel à chaque requête : coût négligeable pour ce
      // volume de contenu CMS, et supprime toute ambiguïté de timing.
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

export async function getCmsSiteSettings(): Promise<CmsSiteSettings | null> {
  const rows = await fetchFromCms<CmsSiteSettings>("site_settings", "&select=*");
  return rows && rows[0] ? rows[0] : null;
}

export async function getCmsCatalog(): Promise<CmsCatalogSection[] | null> {
  const [sections, products] = await Promise.all([
    fetchFromCms<{ id: string; name: string; position: number }>(
      "catalog_sections",
      "&select=*&order=position.asc"
    ),
    fetchFromCms<CmsProduct>("products", "&select=*&order=position.asc"),
  ]);

  const hasSections = Boolean(sections && sections.length);
  const hasProducts = Boolean(products && products.length);
  if (!hasSections && !hasProducts) return null;

  const result: CmsCatalogSection[] = (sections ?? []).map((section) => ({
    ...section,
    products: (products ?? []).filter((p) => p.section_id === section.id),
  }));

  const unassigned = (products ?? []).filter((p) => !p.section_id);
  if (unassigned.length) {
    result.push({ id: "unassigned", name: "Autres", position: result.length, products: unassigned });
  }

  return result;
}

/**
 * Renvoie null seulement si aucune page CMS de ce slug n'existe (le contenu
 * par défaut du code s'applique alors). Dès que la page existe, son tableau
 * de blocs est renvoyé tel quel — y compris vide — pour qu'un admin puisse
 * volontairement vider une page (tout supprimer) sans faire réapparaître le
 * contenu par défaut : un tableau vide affiche "rien", pas le texte du code.
 */
export async function getCmsPageBlocks(slug: string): Promise<CmsPageBlock[] | null> {
  if (!isConfigured) return null;

  const pages = await fetchFromCms<{ id: string }>(
    "pages",
    "&slug=eq." + encodeURIComponent(slug) + "&select=id"
  );
  const page = pages && pages[0];
  if (!page) return null;

  const blocksUrl =
    CMS_CONFIG.supabaseUrl +
    "/rest/v1/page_blocks?page_id=eq." +
    page.id +
    "&hidden=eq.false&select=*&order=position.asc";

  try {
    const res = await fetch(blocksUrl, {
      headers: {
        apikey: CMS_CONFIG.supabaseAnonKey,
        Authorization: "Bearer " + CMS_CONFIG.supabaseAnonKey,
      },
      cache: "no-store", // voir fetchFromCms plus haut pour le pourquoi
    });
    if (!res.ok) return null;
    return (await res.json()) as CmsPageBlock[];
  } catch {
    return null;
  }
}

export type CmsPage = {
  slug: string;
  title: string;
};

/** Liste des pages CMS (slug + titre) — sert à savoir quelles pages existent, sans leurs blocs. */
export async function getCmsPages(): Promise<CmsPage[] | null> {
  const rows = await fetchFromCms<CmsPage>("pages", "&select=slug,title");
  return rows && rows.length ? rows : null;
}

/**
 * Lien interne vers la page d'un partenaire (/partenaires/<slug>), seulement
 * si une page CMS porte ce slug — sinon undefined, et l'appelant garde le
 * lien externe. Les partenaires institutionnels (FFTRI, Mairie…) n'ont pas
 * de page : les lier en interne mènerait à un 404.
 */
export function partnerPageHrefResolver(pages: CmsPage[] | null): (name: string) => string | undefined {
  const slugs = new Set(pages?.map((p) => p.slug) ?? []);
  return (name) => {
    const slug = slugify(name);
    return slug && slugs.has(slug) ? `/partenaires/${slug}` : undefined;
  };
}

export type CmsHiddenBlock = { slot: string | null; heading: string; block_type: string };

/**
 * Blocs masqués (page_blocks.hidden = true) pour une page — utilisé par les
 * blocs "à emplacement fixe" qui ont un texte par défaut codé en dur : sans
 * ça, masquer un tel bloc dans le CMS le fait juste disparaître de
 * getCmsPageBlocks, et la page réaffiche le texte par défaut à la place (qui
 * a souvent le même contenu), donnant l'impression que "masquer" ne marche
 * pas. Ne concerne pas les blocs libres, qui n'ont pas de texte par défaut :
 * ils disparaissent déjà correctement quand ils sont masqués.
 * Renvoie slot ET heading (pas que le slot) car un bloc masqué créé avant
 * l'existence des slots n'en a pas encore — il ne serait alors identifiable
 * que par son ancien titre exact, comme pour findSlot côté page.
 */
export async function getCmsHiddenBlocks(slug: string): Promise<CmsHiddenBlock[]> {
  if (!isConfigured) return [];

  const pages = await fetchFromCms<{ id: string }>(
    "pages",
    "&slug=eq." + encodeURIComponent(slug) + "&select=id"
  );
  const page = pages && pages[0];
  if (!page) return [];

  const url =
    CMS_CONFIG.supabaseUrl +
    "/rest/v1/page_blocks?page_id=eq." +
    page.id +
    "&hidden=eq.true&select=slot,heading,block_type";

  try {
    const res = await fetch(url, {
      headers: {
        apikey: CMS_CONFIG.supabaseAnonKey,
        Authorization: "Bearer " + CMS_CONFIG.supabaseAnonKey,
      },
      cache: "no-store", // voir fetchFromCms plus haut pour le pourquoi
    });
    if (!res.ok) return [];
    return (await res.json()) as CmsHiddenBlock[];
  } catch {
    return [];
  }
}

export type CmsTrainingSession = {
  id: string;
  day: string;
  start_time: string;
  end_time: string | null;
  rdv_time: string | null;
  sport: string;
  location: string;
  location_anchor: string | null;
  coach: string;
  notes: string;
  position: number;
};

/**
 * Planning d'entraînement structuré (dashboard → Planning). Renvoie null
 * quand le CMS n'a aucun créneau enregistré, pour que la page garde son
 * contenu par défaut codé en dur (src/content/planning.ts).
 */
export async function getCmsTrainingSessions(): Promise<CmsTrainingSession[] | null> {
  const rows = await fetchFromCms<CmsTrainingSession>(
    "training_sessions",
    "&select=*&order=start_time.asc"
  );
  return rows && rows.length ? rows : null;
}

export type CmsSportRequirement = {
  sport: string;
  requirements: string;
  image_url: string | null;
};

/**
 * Prérequis par défaut de chaque sport (dashboard → Planning → « Prérequis
 * par sport »), affichés sur /entrainements en plus des prérequis propres
 * à chaque créneau.
 */
export async function getCmsSportRequirements(): Promise<CmsSportRequirement[]> {
  const rows = await fetchFromCms<CmsSportRequirement>("training_sport_requirements", "&select=*");
  return rows ?? [];
}

// Menu de navigation et pied de page gérés depuis le CMS (dashboard →
// Navigation). Renvoie null pour chaque liste quand le CMS n'a aucun lien
// configuré, pour que l'appelant garde le menu par défaut codé en dur.
export async function getCmsNavigation(): Promise<{
  nav: NavItem[] | null;
  footer: NavLink[] | null;
}> {
  const rows = await fetchFromCms<CmsNavRow>("nav_items", "&select=*");
  if (!rows || rows.length === 0) return { nav: null, footer: null };

  const byParent = new Map<string, CmsNavRow[]>();
  for (const row of rows) {
    if (!row.parent_id) continue;
    if (!byParent.has(row.parent_id)) byParent.set(row.parent_id, []);
    byParent.get(row.parent_id)!.push(row);
  }

  const nav: NavItem[] = rows
    .filter((row) => !row.parent_id && row.nav_position !== null)
    .sort((a, b) => (a.nav_position ?? 0) - (b.nav_position ?? 0))
    .map((row) => {
      const children = (byParent.get(row.id) ?? [])
        .filter((child) => child.nav_position !== null)
        .sort((a, b) => (a.nav_position ?? 0) - (b.nav_position ?? 0))
        .map((child) => ({ label: child.label, href: child.href, protected: child.protected }));
      return {
        label: row.label,
        href: row.href,
        children: children.length ? children : undefined,
      };
    });

  const footer: NavLink[] = rows
    .filter((row) => row.footer_position !== null)
    .sort((a, b) => (a.footer_position ?? 0) - (b.footer_position ?? 0))
    .map((row) => ({ label: row.label, href: row.href, protected: row.protected }));

  return {
    nav: nav.length ? nav : null,
    footer: footer.length ? footer : null,
  };
}
