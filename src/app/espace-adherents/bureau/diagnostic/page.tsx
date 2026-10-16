import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/superAdmin";
import { BLOB_TOKEN_ENV_NAMES, collectDiagnostic, runBlobTest } from "@/lib/diagnostic";

export const metadata: Metadata = {
  title: "Vue bureau — Diagnostic serveur",
  robots: { index: false, follow: false },
};

// Les variables d'environnement doivent être lues à CHAQUE requête, jamais
// figées au build : sans cela la page afficherait l'état de la machine de
// build de Vercel et non celui de la fonction qui sert le site.
export const dynamic = "force-dynamic";

export default async function BureauDiagnosticPage({
  searchParams,
}: {
  searchParams: Promise<{ test?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/connexion?next=/espace-adherents/bureau/diagnostic");
  if (session.role !== "admin") redirect("/espace-adherents");
  // Réservé au super-administrateur (Bureau → Admin).
  if (!isSuperAdmin(session)) redirect("/espace-adherents/bureau");

  const { test } = await searchParams;
  const blobTest = test === "blob" ? await runBlobTest() : null;
  const { platform, hosting, vars, injectedNames, totalEnvVars, blobTokenSource, notificationRecipients } =
    collectDiagnostic();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="section-title font-display text-3xl uppercase text-toac-blue-950">
        Vue bureau — Diagnostic serveur
      </h1>
      <p className="mt-4 text-toac-blue-900/80">
        État réel des variables d&apos;environnement <strong>vues par la fonction qui sert le site</strong>
        {" "}(et non par le dashboard de l&apos;hébergeur). Aucune valeur secrète n&apos;est affichée, seulement
        sa présence, sa longueur et son préfixe.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-xl uppercase text-toac-blue-950">Hébergement</h2>
        <dl className="mt-4 divide-y divide-toac-blue-900/10 rounded-md border border-toac-blue-900/15">
          <div className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
            <dt className="text-toac-blue-900/70">Plateforme détectée</dt>
            <dd className="font-mono text-toac-blue-950">{platform}</dd>
          </div>
          {hosting.map((row) => (
            <div key={row.label} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
              <dt className="text-toac-blue-900/70">{row.label}</dt>
              <dd className="font-mono text-toac-blue-950">{row.value}</dd>
            </div>
          ))}
        </dl>
        {platform.startsWith("Inconnue") ? (
          <p className="mt-3 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Aucun marqueur d&apos;hébergeur détecté : le site ne tourne pas sur Vercel. Les variables
            configurées dans le dashboard Vercel ne seront jamais injectées ici.
          </p>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl uppercase text-toac-blue-950">Variables attendues</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-toac-blue-900/20 text-left text-toac-blue-900/70">
                <th className="py-2 pr-4 font-medium">Variable</th>
                <th className="py-2 pr-4 font-medium">État</th>
                <th className="py-2 pr-4 font-medium">Longueur</th>
                <th className="py-2 font-medium">Aperçu</th>
              </tr>
            </thead>
            <tbody>
              {vars.map((info) => (
                <tr key={info.name} className="border-b border-toac-blue-900/10 align-top">
                  <td className="py-2 pr-4">
                    <span className="font-mono text-toac-blue-950">{info.name}</span>
                    <span className="block text-xs text-toac-blue-900/60">{info.role}</span>
                  </td>
                  <td className="py-2 pr-4">
                    {info.present ? (
                      <span className="text-emerald-700">présente</span>
                    ) : (
                      <span className="text-red-700">absente</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 font-mono">{info.present ? info.length : "—"}</td>
                  <td className="py-2 font-mono break-all">{info.hint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl uppercase text-toac-blue-950">
          Notification des décharges musculation
        </h2>
        <p className="mt-3 text-sm text-toac-blue-900/80">
          {notificationRecipients > 0
            ? `${notificationRecipients} destinataire${notificationRecipients > 1 ? "s" : ""} reconnu${notificationRecipients > 1 ? "s" : ""} dans MUSCULATION_NOTIFICATION_EMAILS.`
            : "Aucun destinataire reconnu dans MUSCULATION_NOTIFICATION_EMAILS : aucun email ne partira à la validation d'une décharge. Vérifiez la variable dans les réglages du projet."}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl uppercase text-toac-blue-950">
          Test d&apos;écriture Vercel Blob
        </h2>
        <p className="mt-3 text-sm text-toac-blue-900/80">
          {blobTokenSource
            ? `Jeton trouvé via ${blobTokenSource}. Le test envoie un petit fichier texte dans le store.`
            : `Aucun jeton trouvé (ni ${BLOB_TOKEN_ENV_NAMES.join(", ni ")}). Le test échouera tant qu'une de ces variables n'est pas injectée au runtime.`}
        </p>
        <p className="mt-4">
          <Link
            href="/espace-adherents/bureau/diagnostic?test=blob"
            className="inline-block rounded-md border border-toac-blue-800 px-4 py-2 text-sm font-medium text-toac-blue-950 hover:bg-toac-blue-950 hover:text-white"
          >
            Lancer le test d&apos;écriture →
          </Link>
        </p>
        {blobTest ? (
          blobTest.ok ? (
            <div className="mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p>Écriture réussie via {blobTest.source}. Fichier créé :</p>
              <p className="mt-1 font-mono break-all">{blobTest.url}</p>
            </div>
          ) : (
            <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-900">
              <p className="font-medium">Échec — erreur brute renvoyée par le serveur :</p>
              <p className="mt-1 font-mono break-words">
                {blobTest.errorName}: {blobTest.errorMessage}
              </p>
            </div>
          )
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl uppercase text-toac-blue-950">
          Noms de variables injectées ({injectedNames.length} sur {totalEnvVars})
        </h2>
        <p className="mt-3 text-sm text-toac-blue-900/80">
          Noms uniquement (aucune valeur), filtrés sur stockage / base de données / hébergeur. Si
          <span className="font-mono"> BLOB_READ_WRITE_TOKEN </span>
          n&apos;apparaît pas ici alors qu&apos;il est visible dans le dashboard, c&apos;est que le déploiement
          servi ne vient pas de ce projet/environnement.
        </p>
        {injectedNames.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {injectedNames.map((name) => (
              <li
                key={name}
                className="rounded-md bg-toac-blue-950/5 px-2 py-1 font-mono text-xs text-toac-blue-950"
              >
                {name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-red-700">Aucune. Le runtime ne reçoit aucune de ces variables.</p>
        )}
      </section>

      <p className="mt-12">
        <Link href="/espace-adherents/bureau" className="text-sm text-toac-blue-800 underline">
          ← Retour à la vue bureau
        </Link>
      </p>
    </div>
  );
}
