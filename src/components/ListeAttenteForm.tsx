import { inputClass, labelClass } from "@/components/formStyles";
import { createFormToken, FORM_TOKEN_FIELD, HONEYPOT_FIELD } from "@/lib/formGuard";
import { GENRES, STATUTS } from "@/lib/listeAttente";

/**
 * Inscription sur la liste d'attente de la saison suivante (page Adhésion).
 * Formulaire fixe, envoyé en POST HTML classique vers /api/liste-attente, qui
 * redirige vers /adhesion?attente=1 une fois l'inscription enregistrée.
 */
export default function ListeAttenteForm({ envoye }: { envoye: boolean }) {
  if (envoye) {
    return (
      <p role="status" className="rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-800">
        Merci, ton inscription sur la liste d&apos;attente est bien enregistrée ! Tu vas recevoir un email de
        confirmation (pense à vérifier tes spams). Nous reviendrons vers toi avant l&apos;ouverture des
        inscriptions pour t&apos;indiquer la marche à suivre.
      </p>
    );
  }

  return (
    <form action="/api/liste-attente" method="POST" className="space-y-4">
      {/* Anti-spam (voir src/lib/formGuard.ts) : jeton horodaté signé + champ piège invisible. */}
      <input type="hidden" name={FORM_TOKEN_FIELD} value={createFormToken()} />
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden">
        <label htmlFor="attente-hp">Ne pas remplir ce champ</label>
        <input id="attente-hp" name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="attente-nom" className={labelClass}>Nom</label>
          <input id="attente-nom" name="nom" required autoComplete="family-name" className={inputClass} />
        </div>
        <div>
          <label htmlFor="attente-prenom" className={labelClass}>Prénom</label>
          <input id="attente-prenom" name="prenom" required autoComplete="given-name" className={inputClass} />
        </div>
        <div>
          <label htmlFor="attente-genre" className={labelClass}>Genre</label>
          <select id="attente-genre" name="genre" required defaultValue="" className={inputClass}>
            <option value="" disabled>Choisir…</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="attente-naissance" className={labelClass}>Date de naissance</label>
          <input id="attente-naissance" name="date_naissance" type="date" required autoComplete="bday" className={inputClass} />
        </div>
        <div>
          <label htmlFor="attente-email" className={labelClass}>Email</label>
          <input id="attente-email" name="email" type="email" required autoComplete="email" className={inputClass} />
        </div>
        <div>
          <label htmlFor="attente-tel" className={labelClass}>Téléphone</label>
          <input id="attente-tel" name="telephone" type="tel" required autoComplete="tel" className={inputClass} />
        </div>
        <div>
          <label htmlFor="attente-statut" className={labelClass}>Statut</label>
          <select id="attente-statut" name="statut" required defaultValue="" className={inputClass}>
            <option value="" disabled>Choisir…</option>
            {STATUTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className={labelClass}>
          Es-tu disponible pour être bénévole lors du week-end des Triathlons du Lauragais 2027 (5 et 6 juin) ?
        </legend>
        <div className="flex gap-6 text-sm text-toac-blue-900">
          <label className="flex items-center gap-2">
            <input type="radio" name="benevole_tdl" value="oui" required /> Oui
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="benevole_tdl" value="non" /> Non
          </label>
        </div>
        <p className="mt-2 text-xs text-toac-blue-900/60">
          Les personnes venues nous aider lors de ce week-end seront prioritaires pour l&apos;adhésion 2027/2028,
          dans la limite des places disponibles.
        </p>
      </fieldset>

      <label className="flex items-start gap-2 text-sm text-toac-blue-900">
        <input type="checkbox" name="consentement" required className="mt-1" />
        J&apos;accepte que le TOAC Triathlon conserve ces informations pour me recontacter au sujet de mon
        adhésion.
      </label>

      <button
        type="submit"
        className="rounded-md bg-toac-pink-500 px-6 py-2.5 font-display text-sm uppercase tracking-wide text-white transition hover:bg-toac-pink-400"
      >
        Je m&apos;inscris sur la liste d&apos;attente
      </button>
    </form>
  );
}
