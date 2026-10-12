/**
 * Adresse Openrunner à afficher dans une iframe, extraite du texte d'un bloc
 * CMS : accepte le lien seul ou le code <iframe ... src="..."> complet. Seuls
 * les liens https://www.openrunner.com sont intégrés (pas d'iframe arbitraire).
 */
export function openrunnerEmbedUrl(text: string): string | null {
  const src = /src=["']([^"']+)["']/.exec(text)?.[1] ?? text.trim();
  try {
    const url = new URL(src.replace(/&amp;/g, "&"));
    if (url.protocol !== "https:" || !/(^|\.)openrunner\.com$/.test(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}
