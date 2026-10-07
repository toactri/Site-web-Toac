import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";

/**
 * Attestation de paiement d'adhésion (licence FFTri + cotisation club), à
 * l'usage des CSE. Volontairement intitulée « attestation » et non « facture » :
 * la licence est encaissée par la FFTri, le club ne peut qu'attester du
 * paiement, pas facturer à sa place.
 *
 * Mise en page reprise du modèle Word utilisé jusqu'en 2025/2026.
 */

export interface AttestationData {
  saison: string;
  nom: string;
  prenom: string;
  /** « Homme » / « Femme » tel qu'importé du Sheets ; sert à « M. »/« Mme » et « né »/« née ». */
  sexe: string | null;
  /** Date ISO « AAAA-MM-JJ ». */
  dateNaissance: string;
  cotisationCentimes: number;
  licenceCentimes: number;
  tresorierNom: string;
  /** Date d'émission, déjà formatée « JJ/MM/AAAA ». */
  dateEmission: string;
}

export interface SignatureImage {
  bytes: Buffer;
  mimeType: string;
}

const CLUB_NAME = "TOAC Toulouse Olympique Aerospatiale Club Triathlon";
const CLUB_ADRESSE = "Adresse : 20 ch. de Garric, 31200 Toulouse";
const CLUB_SIRET = "SIRET : 900 566 704 00012";

const MARGIN = 64;
const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const BLUE = rgb(0.05, 0.1, 0.25);
const GREY = rgb(0.35, 0.38, 0.45);

/** Fichier embarqué dans la fonction via `outputFileTracingIncludes` (next.config.ts). */
const LOGO_PATH = path.join(process.cwd(), "public", "images", "logo-toac.png");

/** Recopie sans décalage mémoire : voir ownBytes() dans musculationDecharge.ts. */
function ownBytes(input: Buffer | Uint8Array): Uint8Array {
  return new Uint8Array(input);
}

/** « 10070 » → « 100,70 € » ; « 9500 » → « 95 € ». */
export function formatEuros(centimes: number): string {
  const euros = centimes / 100;
  return (
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: centimes % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })
      .format(euros)
      // Intl sépare les milliers par une espace fine insécable, absente des
      // polices standard du PDF.
      .replace(/[  ]/g, " ") + " €"
  );
}

/** « 1980-01-24 » → « 24/01/1980 ». */
export function formatDateIso(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Les polices standard du PDF ne couvrent que le jeu WinAnsi : un nom avec un
 * caractère hors de ce jeu (ł, ă, ș…) ferait échouer la génération. On retombe
 * alors sur la lettre sans accent.
 */
/** Lettres sans forme décomposée (NFD) : il faut leur donner l'équivalent à la main. */
const LETTER_FALLBACKS: Record<string, string> = { ł: "l", Ł: "L", đ: "d", Đ: "D", ø: "o", Ø: "O", ı: "i" };

function sanitizer(font: PDFFont): (text: string) => string {
  const supported = new Set(font.getCharacterSet());
  return (text: string) =>
    Array.from(text)
      .map((char) => {
        if (supported.has(char.codePointAt(0)!)) return char;
        const base = LETTER_FALLBACKS[char] ?? char.normalize("NFD").replace(/[̀-ͯ]/g, "");
        return Array.from(base).every((c) => supported.has(c.codePointAt(0)!)) ? base : "?";
      })
      .join("");
}

async function embedLogo(pdfDoc: PDFDocument): Promise<PDFImage | null> {
  try {
    return await pdfDoc.embedPng(ownBytes(await readFile(LOGO_PATH)));
  } catch (error) {
    console.warn(`Logo introuvable (${LOGO_PATH}) — attestation générée sans logo.`, error);
    return null;
  }
}

export function buildAttestationFileName(nom: string, prenom: string, saison: string): string {
  const part = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return ["Attestation", "TOAC", part(saison), part(nom), part(prenom)].filter(Boolean).join("-") + ".pdf";
}

export async function generateAttestationPdf(
  data: AttestationData,
  signature: SignatureImage | null
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const safe = sanitizer(font);

  const bodySize = 11;
  const lineHeight = 17;
  const maxWidth = PAGE_WIDTH - MARGIN * 2;
  let y = PAGE_HEIGHT - MARGIN + 16;

  // En-tête : logo à gauche, coordonnées du club à droite.
  const logo = await embedLogo(pdfDoc);
  const headerHeight = 62;
  if (logo) {
    const scale = headerHeight / logo.height;
    page.drawImage(logo, { x: MARGIN, y: y - headerHeight, width: logo.width * scale, height: headerHeight });
  }
  for (const [i, line] of [CLUB_ADRESSE, CLUB_SIRET].entries()) {
    const size = 9;
    page.drawText(line, {
      x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(line, size),
      y: y - 22 - i * 13,
      size,
      font,
      color: GREY,
    });
  }
  y -= headerHeight + lineHeight * 3;

  function drawCentered(text: string, size: number, f: PDFFont) {
    const t = safe(text);
    page.drawText(t, { x: (PAGE_WIDTH - f.widthOfTextAtSize(t, size)) / 2, y, size, font: f, color: BLUE });
  }

  function drawParagraph(text: string, f: PDFFont = font, indent = 0) {
    const words = safe(text).split(" ");
    let line = "";
    const width = maxWidth - indent;
    const flush = () => {
      page.drawText(line, { x: MARGIN + indent, y, size: bodySize, font: f });
      y -= lineHeight;
    };
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(candidate, bodySize) > width && line) {
        flush();
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) flush();
  }

  /** Ligne « libellé ……… montant », montant aligné à droite. */
  function drawAmount(label: string, centimes: number, f: PDFFont = font) {
    const amount = formatEuros(centimes);
    page.drawText(safe(label), { x: MARGIN + 24, y, size: bodySize, font: f });
    page.drawText(amount, {
      x: PAGE_WIDTH - MARGIN - 24 - f.widthOfTextAtSize(amount, bodySize),
      y,
      size: bodySize,
      font: f,
    });
    y -= lineHeight;
  }

  drawCentered(`Attestation de paiement – Saison ${data.saison}`, 17, bold);
  y -= lineHeight * 3;

  const femme = (data.sexe ?? "").trim().toLowerCase().startsWith("f");
  const homme = (data.sexe ?? "").trim().toLowerCase().startsWith("h");
  const civilite = femme ? "Mme" : homme ? "M." : "";
  const ne = femme ? "née" : homme ? "né" : "né(e)";

  drawParagraph(`Je soussigné(e) ${data.tresorierNom}, trésorier du ${CLUB_NAME}, certifie que :`);
  y -= lineHeight * 0.6;
  drawParagraph(
    `${civilite ? `${civilite} ` : ""}${data.prenom} ${data.nom.toUpperCase()}, ${ne} le ${formatDateIso(data.dateNaissance)}, ` +
      `a bien réglé au titre de la saison sportive ${data.saison} :`,
    font
  );
  y -= lineHeight * 0.6;

  if (data.licenceCentimes > 0) drawAmount("Licence fédérale FFTri", data.licenceCentimes);
  if (data.cotisationCentimes > 0) drawAmount("Cotisation club TOAC Triathlon", data.cotisationCentimes);

  y -= 4;
  page.drawLine({
    start: { x: MARGIN + 24, y: y + lineHeight - 4 },
    end: { x: PAGE_WIDTH - MARGIN - 24, y: y + lineHeight - 4 },
    thickness: 0.6,
    color: GREY,
  });
  drawAmount("Soit un montant total de", data.licenceCentimes + data.cotisationCentimes, bold);
  y -= lineHeight;

  drawParagraph(
    "Cette attestation est délivrée à l'intéressé(e) pour faire valoir ce que de droit, notamment auprès de son CSE."
  );
  y -= lineHeight;
  drawParagraph(`Fait à Toulouse, le ${data.dateEmission}`);
  y -= lineHeight * 0.5;
  drawParagraph("Signature et cachet du club :");

  if (signature) {
    const image =
      signature.mimeType === "image/png"
        ? await pdfDoc.embedPng(ownBytes(signature.bytes))
        : await pdfDoc.embedJpg(ownBytes(signature.bytes));
    const scale = Math.min(200 / image.width, 100 / image.height, 1);
    page.drawImage(image, {
      x: MARGIN + 24,
      y: y - image.height * scale,
      width: image.width * scale,
      height: image.height * scale,
    });
    y -= image.height * scale + lineHeight;
  }
  page.drawText(safe(`${data.tresorierNom}, trésorier`), { x: MARGIN + 24, y, size: 10, font, color: GREY });

  pdfDoc.setTitle(`Attestation de paiement ${data.saison} – ${safe(data.prenom)} ${safe(data.nom)}`, {
    showInWindowTitleBar: true,
  });
  pdfDoc.setSubject("Attestation de paiement de l'adhésion (licence FFTri et cotisation club)");
  pdfDoc.setAuthor("TOAC Triathlon");
  pdfDoc.setCreator("TOAC Triathlon");
  pdfDoc.setProducer("TOAC Triathlon");

  return Buffer.from(await pdfDoc.save());
}
