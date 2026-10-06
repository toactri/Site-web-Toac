function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Page HTML minimale d'erreur renvoyée par les routes de formulaire (POST classique, sans JS). */
export function buildErrorHtml(message: string, backHref: string): string {
  return `<!doctype html>
<html lang="fr">
  <head><meta charset="utf-8" /><title>Erreur</title></head>
  <body>
    <p>${escapeHtml(message)}</p>
    <p><a href="${escapeHtml(backHref)}">← Retour</a></p>
  </body>
</html>`;
}
