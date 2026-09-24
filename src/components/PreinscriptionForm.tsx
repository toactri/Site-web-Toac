"use client";

import { useState } from "react";
import { inputClass, labelClass } from "@/components/formStyles";

const fieldsetClass = "rounded-md border border-toac-gray-200 p-4";
const legendClass = "px-1 text-sm font-medium text-toac-blue-900";
const radioRowClass = "flex items-start gap-2 text-sm text-toac-blue-900";

const INTERESSE_OPTIONS = [
  { value: "interesse", label: "Je suis intéressé(e)" },
  { value: "pas_interesse", label: "Je ne suis pas intéressé(e)" },
];

const STAGE_OPTIONS = [
  { value: "participe", label: "Je participe" },
  { value: "non", label: "Je n'y participerai pas." },
  { value: "ne_sait_pas", label: "Je ne sais pas encore." },
];

/**
 * Étape 1 du parcours d'adhésion — reprend à l'identique les questions du
 * formulaire Google Forms historique du club ("Adhésion Toac Triathlon
 * 2026/2027"). Pas de paiement ici : juste la pré-inscription, enregistrée
 * en base (voir /api/preinscription). Le paiement de la cotisation vient
 * plus tard (étape 4), une fois la licence FFTRI validée par le club.
 */
export default function PreinscriptionForm() {
  const [permisConduire, setPermisConduire] = useState<"" | "oui" | "non">("");
  const [statut, setStatut] = useState<"" | "exterieur" | "airbus" | "chomeur_etudiant">("");
  const [sending, setSending] = useState(false);

  return (
    <form
      action="/api/preinscription"
      method="POST"
      onSubmit={() => setSending(true)}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className={labelClass}>Adresse e-mail</label>
          <input id="email" name="email" type="email" required className={inputClass} />
          <p className="mt-1 text-xs text-toac-blue-900/60">
            Si tu as déjà un compte FFTri, merci d&apos;utiliser la même adresse email.
          </p>
        </div>
        <div>
          <label htmlFor="telephone" className={labelClass}>Téléphone</label>
          <input id="telephone" name="telephone" type="tel" required className={inputClass} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nom" className={labelClass}>Nom</label>
          <input id="nom" name="nom" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="prenom" className={labelClass}>Prénom</label>
          <input id="prenom" name="prenom" required className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="dateNaissance" className={labelClass}>Date de naissance</label>
        <input id="dateNaissance" name="dateNaissance" type="date" required className={inputClass} />
      </div>

      <div>
        <label htmlFor="permisConduire" className={labelClass}>As-tu le permis de conduire ?</label>
        <select
          id="permisConduire"
          name="permisConduire"
          required
          value={permisConduire}
          onChange={(e) => setPermisConduire(e.target.value as "" | "oui" | "non")}
          className={inputClass}
        >
          <option value="" disabled>Choisir…</option>
          <option value="oui">Oui</option>
          <option value="non">Non</option>
        </select>
      </div>

      {permisConduire === "oui" && (
        <div>
          <label htmlFor="numeroPermis" className={labelClass}>Numéro du permis de conduire</label>
          <input id="numeroPermis" name="numeroPermis" required className={inputClass} />
          <p className="mt-1 text-xs text-toac-blue-900/60">
            Nécessaire pour la déclaration en préfecture des signaleurs du Triathlon du Lauragais.
          </p>
        </div>
      )}

      <h3 className="pt-2 font-display text-sm uppercase tracking-wide text-toac-blue-950">Engagements</h3>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>
          J&apos;accepte d&apos;être bénévole pour l&apos;organisation des Triathlons du Lauragais au minimum
          1 journée
        </legend>
        <p className="mb-2 text-xs text-toac-blue-900/60">
          Logistique : vendredi 5 juin 2026 · Épreuves courtes distances : samedi 6 juin 2026 · Épreuves
          longues distances : dimanche 7 juin 2026 · Logistique : lundi 8 juin 2026
          <br />
          <a
            href="https://drive.google.com/file/d/1xBHY7xm8kkfHkMQonYpL7XUcJkpvc3wZ/view?usp=drive_link"
            target="_blank"
            rel="noopener noreferrer"
            className="text-toac-blue-700 underline"
          >
            + d&apos;infos
          </a>
        </p>
        <div className="space-y-2">
          <label className={radioRowClass}>
            <input type="checkbox" name="benevolat" value="oui" className="mt-1" />
            Oui
          </label>
          <label className={radioRowClass}>
            <input type="checkbox" name="benevolat" value="indisponible" className="mt-1" />
            Je ne suis pas disponible à cette date et je m&apos;engage à apporter une aide concrète au club
            en amont de l&apos;évènement
          </label>
        </div>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>
          J&apos;ai pris connaissance du règlement intérieur et je l&apos;accepte
        </legend>
        <p className="mb-2 text-xs">
          <a
            href="https://drive.google.com/file/d/16DrDVEWcMUqFdzFhO0hIYJy4gp9Hc1h2/view?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-toac-blue-700 underline"
          >
            Règlement 2025-2026
          </a>
        </p>
        <label className={radioRowClass}>
          <input type="checkbox" name="reglementAccepte" required className="mt-1" />
          J&apos;accepte le règlement intérieur du club
        </label>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>
          Je m&apos;engage à porter la trifonction TOAC lors des épreuves auxquelles je participe
        </legend>
        <div className="space-y-2">
          <label className={radioRowClass}>
            <input type="checkbox" name="trifonction" value="nouvelle" className="mt-1" />
            Oui - je souhaite acheter une nouvelle trifonction TOAC
          </label>
          <label className={radioRowClass}>
            <input type="checkbox" name="trifonction" value="conserve" className="mt-1" />
            Oui - je conserve ma trifonction TOAC
          </label>
        </div>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>
          Êtes-vous intéressé(e) par les brevets fédéraux (encadrement / formation FFTri) ?
        </legend>
        <div className="space-y-2">
          {INTERESSE_OPTIONS.map((o) => (
            <label key={o.value} className={radioRowClass}>
              <input type="radio" name="brevetsFederaux" value={o.value} required className="mt-1" />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>
          Êtes-vous intéressé(e) par l&apos;arbitrage auprès de la ligue de triathlon ?
        </legend>
        <div className="space-y-2">
          {INTERESSE_OPTIONS.map((o) => (
            <label key={o.value} className={radioRowClass}>
              <input type="radio" name="arbitrage" value={o.value} required className="mt-1" />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>
          Souhaitez-vous soutenir le club ou recommander un partenaire potentiel ?
        </legend>
        <p className="mb-2 text-xs text-toac-blue-900/60">
          Partenaires recherchés : soutien financier, humain, matériel...
        </p>
        <div className="space-y-2">
          <label className={radioRowClass}>
            <input type="radio" name="soutienPartenaire" value="interesse" required className="mt-1" />
            Je suis intéressé(e) et/ou je connais quelqu&apos;un qui pourrait l&apos;être
          </label>
          <label className={radioRowClass}>
            <input type="radio" name="soutienPartenaire" value="pas_interesse" required className="mt-1" />
            Je ne suis pas intéressé(e)
          </label>
        </div>
      </fieldset>

      <h3 className="pt-2 font-display text-sm uppercase tracking-wide text-toac-blue-950">
        Participation aux stages
      </h3>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Stage Argelès : 03/04/26 - 07/04/26</legend>
        <p className="mb-2 text-xs text-toac-blue-900/60">
          <a
            href="https://www.campingledauphin.com/evenements/club-de-triathlon/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-toac-blue-700 underline"
          >
            + d&apos;infos via ce lien
          </a>
          <br />
          Infos complémentaires P15 dans la{" "}
          <a
            href="https://drive.google.com/drive/u/0/folders/18xwJoGyyVTNsBDfNF025PJbJ2TfSuwpq"
            target="_blank"
            rel="noopener noreferrer"
            className="text-toac-blue-700 underline"
          >
            présentation de la réunion de rentrée
          </a>
        </p>
        <div className="space-y-2">
          {STAGE_OPTIONS.map((o) => (
            <label key={o.value} className={radioRowClass}>
              <input type="radio" name="stageArgeles" value={o.value} required className="mt-1" />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={fieldsetClass}>
        <legend className={legendClass}>Stage Montagne : 7j</legend>
        <p className="mb-2 text-xs text-toac-blue-900/60">
          Date probable : 23 → 30 mai 2026 · lieu en cours de recherche
        </p>
        <div className="space-y-2">
          {STAGE_OPTIONS.map((o) => (
            <label key={o.value} className={radioRowClass}>
              <input type="radio" name="stageMontagne" value={o.value} required className="mt-1" />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <h3 className="pt-2 font-display text-sm uppercase tracking-wide text-toac-blue-950">
        Questions ou suggestions
      </h3>
      <div>
        <label htmlFor="questionsSuggestions" className={labelClass}>
          Si vous avez des questions ou suggestions, c&apos;est le moment. Exprimez-vous !
        </label>
        <textarea id="questionsSuggestions" name="questionsSuggestions" rows={3} className={inputClass} />
      </div>

      <h3 className="pt-2 font-display text-sm uppercase tracking-wide text-toac-blue-950">
        Tarifs / statut
      </h3>

      <div className="overflow-x-auto rounded-md border border-toac-gray-200">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="bg-toac-blue-950 text-white">
              <th className="px-3 py-2 text-left font-medium">Profil adhérent</th>
              <th className="px-3 py-2 text-left font-medium">Extérieurs (dont Airbus Central)</th>
              <th className="px-3 py-2 text-left font-medium">
                Airbus Opérations & ayant droit / Chômeurs & étudiants
              </th>
            </tr>
          </thead>
          <tbody className="text-toac-blue-900/90">
            <tr className="border-b border-toac-gray-100">
              <td className="px-3 py-2 font-medium">Part club (compétition / loisir)</td>
              <td className="px-3 py-2">145 € / 145 €</td>
              <td className="px-3 py-2">95 € / 95 €</td>
            </tr>
            <tr className="border-b border-toac-gray-100">
              <td className="px-3 py-2 font-medium">Part FFTri (compétition / loisir)</td>
              <td className="px-3 py-2">105 € / 40 €</td>
              <td className="px-3 py-2">105 € / 40 €</td>
            </tr>
            <tr className="border-b border-toac-gray-100 font-medium">
              <td className="px-3 py-2">Total (compétition / loisir)</td>
              <td className="px-3 py-2">250 € / 185 €</td>
              <td className="px-3 py-2">200 € / 135 €</td>
            </tr>
            <tr>
              <td className="px-3 py-2 font-medium">Caution Triathlons du Lauragais</td>
              <td className="px-3 py-2" colSpan={2}>
                100 € — chèque collecté à l&apos;inscription, déchiré en fin de saison sous réserve
                d&apos;implication dans l&apos;organisation des Triathlons du Lauragais (6-7 juin 2026)
              </td>
            </tr>
          </tbody>
        </table>
        <p className="px-3 py-2 text-xs text-toac-blue-900/60">
          Part FFTri à payer sur votre espace FFTri — le montant est susceptible de varier de 5 %, la grille
          définitive n&apos;est pas encore connue.
        </p>
      </div>

      <div>
        <label htmlFor="statut" className={labelClass}>Votre statut</label>
        <select
          id="statut"
          name="statut"
          required
          value={statut}
          onChange={(e) => setStatut(e.target.value as typeof statut)}
          className={inputClass}
        >
          <option value="" disabled>Choisir…</option>
          <option value="exterieur">Extérieur (dont Airbus Central)</option>
          <option value="airbus">Airbus Opérations & Ayant droit Airbus Opérations</option>
          <option value="chomeur_etudiant">Chômeurs & Étudiants</option>
        </select>
      </div>

      {(statut === "airbus" || statut === "chomeur_etudiant") && (
        <div className="rounded-md border border-toac-pink-500/40 bg-toac-pink-300/10 p-4 text-sm text-toac-blue-900">
          <strong>Justificatif :</strong> merci d&apos;envoyer un justificatif de votre statut (badge Airbus,
          attestation chômage, carte étudiante…) par email à{" "}
          <a href="mailto:nicolas.verdeyme@airbus.com" className="text-toac-blue-700 underline">
            nicolas.verdeyme@airbus.com
          </a>{" "}
          pour bénéficier de votre tarif remisé.
        </div>
      )}

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-md bg-toac-pink-500 px-6 py-3 font-display text-sm uppercase tracking-wide text-white transition hover:bg-toac-pink-400 disabled:opacity-60 sm:w-auto"
      >
        {sending ? "Envoi en cours…" : "Envoyer ma pré-inscription"}
      </button>
    </form>
  );
}
