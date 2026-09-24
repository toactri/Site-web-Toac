"use client";

import { useState } from "react";
import {
  ADHESION_CLUB_TARIFS,
  LICENCE_FFTRI_TARIFS,
  ASSURANCE_TARIFS,
  CAUTION_CENTIMES,
  type Tarif,
  type ProfilAdherent,
  type LicenceType,
} from "@/content/tarifs";
import { CmsEditableText, CmsEditPencil } from "@/components/cms-edit";
import { inputClass, labelClass } from "@/components/formStyles";

function euros(centimes: number): string {
  return `${(centimes / 100).toFixed(2).replace(".", ",")} €`;
}

const DEFAULT_CAUTION: Tarif = {
  id: "caution-benevolat",
  label: "Caution bénévolat (Toac) — restituée en fin de saison sous réserve d'implication dans l'organisation des Triathlons du Lauragais (6-7 juin 2026)",
  montantCentimes: CAUTION_CENTIMES,
};

/**
 * Formulaire d'adhésion unique : informations + choix du tarif + paiement en
 * une seule étape. La soumission est une navigation classique (pas de fetch) :
 * /api/adhesion enregistre l'inscription puis renvoie la page qui redirige
 * automatiquement vers le paiement sécurisé Monetico (cotisation + caution).
 *
 * Les libellés des tarifs sont modifiables en ligne (texte) ; le prix se
 * modifie via le crayon, qui ouvre le champ prix validé du dashboard —
 * jamais en texte libre, pour éviter qu'une faute de frappe fausse le
 * montant réellement facturé.
 */
export default function AdhesionForm({
  adhesionClubTarifs = ADHESION_CLUB_TARIFS,
  adhesionClubIsCms = false,
  licenceTarifs = LICENCE_FFTRI_TARIFS,
  licenceIsCms = false,
  assuranceTarifs = ASSURANCE_TARIFS,
  assuranceIsCms = false,
  caution = DEFAULT_CAUTION,
  cautionIsCms = false,
}: {
  adhesionClubTarifs?: Record<ProfilAdherent, Tarif>;
  adhesionClubIsCms?: boolean;
  licenceTarifs?: Record<LicenceType, Tarif>;
  licenceIsCms?: boolean;
  assuranceTarifs?: Tarif[];
  assuranceIsCms?: boolean;
  caution?: Tarif;
  cautionIsCms?: boolean;
}) {
  const [tarifReduit, setTarifReduit] = useState<"non" | "oui">("non");
  const [licenceType, setLicenceType] = useState<LicenceType>("loisir");
  const [assuranceId, setAssuranceId] = useState(assuranceTarifs[2]?.id ?? assuranceTarifs[0].id);
  const [sending, setSending] = useState(false);

  const adhesionClub = adhesionClubTarifs[tarifReduit === "oui" ? "reduit" : "plein"];
  const licenceFFTri = licenceTarifs[licenceType];
  const assurance = assuranceTarifs.find((a) => a.id === assuranceId) ?? assuranceTarifs[0];
  const total = adhesionClub.montantCentimes + licenceFFTri.montantCentimes + assurance.montantCentimes + caution.montantCentimes;

  return (
    <form
      action="/api/adhesion"
      method="POST"
      encType="multipart/form-data"
      onSubmit={() => setSending(true)}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="prenom" className={labelClass}>Prénom</label>
          <input id="prenom" name="prenom" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="nom" className={labelClass}>Nom</label>
          <input id="nom" name="nom" required className={inputClass} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="dateNaissance" className={labelClass}>Date de naissance</label>
          <input id="dateNaissance" name="dateNaissance" type="date" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>Email</label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="telephone" className={labelClass}>Téléphone</label>
          <input id="telephone" name="telephone" type="tel" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="adresse" className={labelClass}>Adresse postale</label>
          <input id="adresse" name="adresse" required className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="licenceExistante" className={labelClass}>
          Numéro de licence FFTRI (si renouvellement — laissez vide sinon)
        </label>
        <input id="licenceExistante" name="licenceExistante" className={inputClass} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contactUrgenceNom" className={labelClass}>Contact d&apos;urgence — nom</label>
          <input id="contactUrgenceNom" name="contactUrgenceNom" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="contactUrgenceTelephone" className={labelClass}>
            Contact d&apos;urgence — téléphone
          </label>
          <input
            id="contactUrgenceTelephone"
            name="contactUrgenceTelephone"
            type="tel"
            required
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="certificatMedical" className={labelClass}>
          Certificat médical / attestation de santé (PPS)
        </label>
        <select id="certificatMedical" name="certificatMedical" required className={inputClass}>
          <option value="Certificat médical fourni">Certificat médical fourni</option>
          <option value="Attestation PPS (questionnaire de santé) fournie">
            Attestation PPS (questionnaire de santé) fournie
          </option>
          <option value="À fournir prochainement">À fournir prochainement</option>
        </select>
      </div>

      <fieldset className="rounded-md border border-toac-gray-200 p-4">
        <legend className="px-1 text-sm font-medium text-toac-blue-900">Licence FFTRI souhaitée</legend>
        <div className="mt-1 flex gap-6">
          <label className="flex items-center gap-2 text-sm text-toac-blue-900">
            <input
              type="radio"
              name="licenceType"
              value="loisir"
              checked={licenceType === "loisir"}
              onChange={() => setLicenceType("loisir")}
            />
            Loisir
          </label>
          <label className="flex items-center gap-2 text-sm text-toac-blue-900">
            <input
              type="radio"
              name="licenceType"
              value="competition"
              checked={licenceType === "competition"}
              onChange={() => setLicenceType("competition")}
            />
            Compétition
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-md border border-toac-gray-200 p-4">
        <legend className="px-1 text-sm font-medium text-toac-blue-900">
          Appartenez-vous à l&apos;une de ces catégories : Airbus Opérations, ayant droit Airbus
          Opérations, chômeur ou étudiant ?
        </legend>
        <div className="mt-1 flex gap-6">
          <label className="flex items-center gap-2 text-sm text-toac-blue-900">
            <input
              type="radio"
              name="tarifReduit"
              value="non"
              checked={tarifReduit === "non"}
              onChange={() => setTarifReduit("non")}
            />
            Non — adhésion plein tarif
          </label>
          <label className="flex items-center gap-2 text-sm text-toac-blue-900">
            <input
              type="radio"
              name="tarifReduit"
              value="oui"
              checked={tarifReduit === "oui"}
              onChange={() => setTarifReduit("oui")}
            />
            Oui — adhésion tarif réduit
          </label>
        </div>

        {tarifReduit === "oui" && (
          <div className="mt-4">
            <label htmlFor="justificatif" className={labelClass}>
              Justificatif (carte étudiante, attestation demandeur d&apos;emploi, badge Airbus…)
            </label>
            <input
              id="justificatif"
              name="justificatif"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              required
              className="w-full text-sm text-toac-blue-900 file:mr-3 file:rounded-md file:border-0 file:bg-toac-blue-950 file:px-4 file:py-2 file:text-sm file:text-white"
            />
            <p className="mt-1 text-xs text-toac-blue-900/60">
              PDF ou image, transmis au bureau avec votre dossier.
            </p>
          </div>
        )}
      </fieldset>

      <div>
        <label htmlFor="assurance" className={labelClass}>
          Assurance FFTRI 2026 (obligatoire — voir le détail des garanties sur{" "}
          <a
            href="https://www.fftri.com/pratiquer/se-licencier/assurance/assurance-2026/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            fftri.com
          </a>
          )
        </label>
        <select
          id="assurance"
          name="assurance"
          required
          value={assuranceId}
          onChange={(e) => setAssuranceId(e.target.value)}
          className={inputClass}
        >
          {assuranceTarifs.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label} ({euros(a.montantCentimes)})
            </option>
          ))}
        </select>
        {assuranceIsCms && (
          <p className="mt-1 text-xs text-toac-blue-900/50">
            Formules modifiables (nom, prix) depuis le dashboard → Catalogue → rubrique « Assurance FFTri ».
          </p>
        )}
      </div>

      <label className="flex items-start gap-2 text-sm text-toac-blue-900/90">
        <input type="checkbox" name="droitImage" className="mt-1" />
        J&apos;autorise le TOAC Triathlon à utiliser mon image sur ses supports de communication
        (site, réseaux sociaux).
      </label>

      <div>
        <label htmlFor="message" className={labelClass}>Message (optionnel)</label>
        <textarea id="message" name="message" rows={3} className={inputClass} />
      </div>

      <div className="rounded-md border border-toac-gray-200 bg-toac-gray-50 p-4 text-sm">
        <div className="flex justify-between gap-3 text-toac-blue-900">
          {adhesionClubIsCms ? (
            <CmsEditableText
              as="span"
              value={adhesionClub.label}
              target={{ kind: "product", id: adhesionClub.id, field: "name" }}
            />
          ) : (
            <span>{adhesionClub.label}</span>
          )}
          <span className="flex shrink-0 items-center gap-1">
            {euros(adhesionClub.montantCentimes)}
            {adhesionClubIsCms && (
              <CmsEditPencil payload={{ type: "edit-product", productId: adhesionClub.id }} />
            )}
          </span>
        </div>
        <div className="mt-1 flex justify-between gap-3 text-toac-blue-900">
          {licenceIsCms ? (
            <CmsEditableText
              as="span"
              value={licenceFFTri.label}
              target={{ kind: "product", id: licenceFFTri.id, field: "name" }}
            />
          ) : (
            <span>{licenceFFTri.label}</span>
          )}
          <span className="flex shrink-0 items-center gap-1">
            {euros(licenceFFTri.montantCentimes)}
            {licenceIsCms && (
              <CmsEditPencil payload={{ type: "edit-product", productId: licenceFFTri.id }} />
            )}
          </span>
        </div>
        <div className="mt-1 flex justify-between gap-3 text-toac-blue-900">
          {assuranceIsCms ? (
            <CmsEditableText
              as="span"
              value={assurance.label}
              target={{ kind: "product", id: assurance.id, field: "name" }}
            />
          ) : (
            <span>{assurance.label}</span>
          )}
          <span className="flex shrink-0 items-center gap-1">
            {euros(assurance.montantCentimes)}
            {assuranceIsCms && (
              <CmsEditPencil payload={{ type: "edit-product", productId: assurance.id }} />
            )}
          </span>
        </div>
        <div className="mt-1 flex justify-between gap-3 text-toac-blue-900">
          {cautionIsCms ? (
            <CmsEditableText
              as="span"
              value={caution.label}
              target={{ kind: "product", id: caution.id, field: "name" }}
              multiline
            />
          ) : (
            <span>{caution.label}</span>
          )}
          <span className="flex shrink-0 items-center gap-1">
            {euros(caution.montantCentimes)}
            {cautionIsCms && (
              <CmsEditPencil payload={{ type: "edit-product", productId: caution.id }} />
            )}
          </span>
        </div>
        <div className="mt-2 flex justify-between border-t border-toac-gray-200 pt-2 font-medium text-toac-blue-950">
          <span>Total à régler</span>
          <span>{euros(total)}</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-md bg-toac-pink-500 px-6 py-3 font-display text-sm uppercase tracking-wide text-white transition hover:bg-toac-pink-400 disabled:opacity-60 sm:w-auto"
      >
        {sending ? "Redirection vers le paiement…" : `Valider et payer ${euros(total)}`}
      </button>
      <p className="text-xs text-toac-blue-900/60">
        Paiement sécurisé Monetico (Crédit Mutuel / CIC). Votre inscription est validée automatiquement
        dès confirmation du paiement.
      </p>
    </form>
  );
}
