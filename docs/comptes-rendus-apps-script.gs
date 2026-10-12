/**
 * Dépôt des comptes rendus de course dans le Drive du club.
 *
 * Appelé par le site (route /api/comptes-rendus) : reçoit un PDF en base64 et
 * le crée dans le sous-dossier demandé de « Comptes rendus de course ».
 *
 * Installation (une fois, avec un compte qui peut écrire dans le dossier) :
 *  1. script.google.com → Nouveau projet → coller ce fichier.
 *  2. Remplacer SECRET par la valeur de CR_DRIVE_UPLOAD_SECRET (Vercel).
 *  3. Déployer → Nouveau déploiement → type « Application Web »,
 *     Exécuter en tant que : Moi, Qui a accès : Tout le monde.
 *     Autoriser l'accès au Drive quand Google le demande.
 *  4. Copier l'URL du déploiement (…/exec) dans CR_DRIVE_UPLOAD_URL (Vercel).
 */

const SECRET = "A_REMPLACER";
const DOSSIER_RACINE = "1dOpD_dMQ8Th-eDHKImZizeLdHg2_UyV9";

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (req.secret !== SECRET) return reponse({ ok: false, error: "secret invalide" });

    // On n'écrit que dans un sous-dossier direct du dossier des comptes rendus.
    const dossier = DriveApp.getFolderById(req.folderId);
    const parents = dossier.getParents();
    let autorise = false;
    while (parents.hasNext()) if (parents.next().getId() === DOSSIER_RACINE) autorise = true;
    if (!autorise) return reponse({ ok: false, error: "dossier non autorisé" });

    const octets = Utilities.base64Decode(req.data);
    const blob = Utilities.newBlob(octets, "application/pdf", String(req.name).slice(0, 200));
    const fichier = dossier.createFile(blob);
    if (req.description) fichier.setDescription(String(req.description).slice(0, 500));
    return reponse({ ok: true, url: fichier.getUrl() });
  } catch (err) {
    return reponse({ ok: false, error: String(err) });
  }
}

function reponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
