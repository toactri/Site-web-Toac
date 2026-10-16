import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getListeAttente, DatabaseNotConfiguredError, type ListeAttenteRow } from "@/lib/db";
import { LISTE_ATTENTE_SAISON, statsListeAttente } from "@/lib/listeAttente";
import ListeAttenteTable from "@/components/ListeAttenteTable";
import DbSetupNotice from "@/components/DbSetupNotice";

export const metadata: Metadata = {
  title: "Vue bureau — Liste d'attente",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const cardClass = "rounded-lg border border-toac-gray-200 bg-white p-4 shadow-sm";
const thClass = "px-3 py-2 text-left font-semibold text-toac-blue-950";
const tdClass = "px-3 py-1.5 text-toac-blue-900";

/**
 * Liste d'attente de la saison suivante : inscriptions du formulaire de la
 * page Adhésion, plus les demandes non abouties reprises du Google Form
 * 2026/2027. La disponibilité pour le bénévolat TDL sert de critère de
 * priorité à l'ouverture des adhésions.
 */
export default async function BureauListeAttentePage() {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/bureau/liste-attente");
  if (session.role !== "admin") redirect("/espace-adherents");

  let inscrits: ListeAttenteRow[] = [];
  let dbError = false;
  try {
    inscrits = await getListeAttente(LISTE_ATTENTE_SAISON);
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    dbError = true;
  }
  // Envois suspects (anti-spam) : listés pour vérification, hors indicateurs.
  const valides = inscrits.filter((i) => !i.suspect);
  const suspects = inscrits.length - valides.length;
  const colonnes = statsListeAttente(valides);
  const global = colonnes[0].lignes;
  const valeur = (libelle: string) => global.find((l) => l.libelle === libelle);
  const tdl = valeur("Dispo bénévolat TDL");

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
        Vue bureau — Liste d&apos;attente {LISTE_ATTENTE_SAISON}
      </h1>
      <p className="mt-4 text-toac-blue-900/80">
        Personnes inscrites via le formulaire de la page{" "}
        <a href="/adhesion#liste-attente" className="underline">Adhésion</a>, et demandes 2026/2027 non abouties
        reprises du Google Form. Une personne qui se réinscrit avec le même email garde sa place. Les envois
        bloqués par l&apos;anti-spam sont marqués « Suspect » : à retirer si ce sont des robots, sinon la
        personne est déjà dans la liste.
      </p>

      {dbError ? (
        <div className="mt-8"><DbSetupNotice /></div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                valeur: valides.length,
                libelle: `inscrits sur la liste d'attente${suspects ? ` (+ ${suspects} envoi${suspects > 1 ? "s" : ""} suspect${suspects > 1 ? "s" : ""} à vérifier)` : ""}`,
              },
              {
                valeur: tdl?.valeur ?? 0,
                libelle: `disponibles pour le bénévolat TDL${tdl?.pourcentage !== null && tdl?.pourcentage !== undefined ? ` (${tdl.pourcentage} %)` : ""}`,
              },
              { valeur: valeur("Âge moyen")?.valeur ?? "—", libelle: "ans d'âge moyen" },
            ].map((t) => (
              <div key={t.libelle} className={cardClass}>
                <span className="block font-display text-4xl text-toac-blue-950">{t.valeur}</span>
                <span className="block text-sm text-toac-blue-900/80">{t.libelle}</span>
              </div>
            ))}
          </div>

          <section className={`${cardClass} mt-6`}>
            <h2 className="mb-3 font-display text-lg uppercase text-toac-blue-950">Indicateurs</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead className="border-b border-toac-gray-200">
                  <tr>
                    <th className={thClass} />
                    {colonnes.map((c) => (
                      <th key={c.titre} colSpan={2} className={`${thClass} text-center`}>{c.titre}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {global.map((l, index) => (
                    <tr key={l.libelle} className="border-b border-toac-gray-100 last:border-0">
                      <th className={`${tdClass} text-left font-medium`}>{l.libelle}</th>
                      {colonnes.map((c) => {
                        const cellule = c.lignes[index];
                        return [
                          <td key={`${c.titre}-v`} className={`${tdClass} whitespace-nowrap pr-1 text-right font-semibold`}>
                            {cellule.valeur ?? "—"}
                          </td>,
                          <td key={`${c.titre}-p`} className={`${tdClass} w-14 whitespace-nowrap pl-1 text-right text-toac-blue-900/60`}>
                            {cellule.pourcentage !== null ? `${cellule.pourcentage} %` : ""}
                          </td>,
                        ];
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <h2 className="mt-10 mb-4 font-display text-lg uppercase text-toac-blue-950">Inscrits</h2>
          <ListeAttenteTable inscrits={inscrits} />
        </>
      )}
    </div>
  );
}
