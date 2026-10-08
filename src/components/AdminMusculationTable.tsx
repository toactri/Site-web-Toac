"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MusculationDechargeRow, MusculationImportRow } from "@/lib/db";
import { documentHref, buildDechargeFileName } from "@/lib/documentUrl";

/** Extension du certificat, qui peut être un PDF comme une image. */
function certificatExtension(blobPath: string): string {
  const name = blobPath.split("/").pop() ?? "";
  return name.includes(".") ? name.slice(name.lastIndexOf(".")) : ".pdf";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

/** « 2024-09-15 » → « 15/09/2024 ». */
function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/** Décharge et certificat médical sont valables 3 ans. */
function finValidite(iso: string): string {
  const [year, month, day] = iso.split("-");
  return formatIsoDate(`${Number(year) + 3}-${month}-${day}`);
}

function compareNoms(a: { nom: string; prenom: string }, b: { nom: string; prenom: string }): number {
  return (
    a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }) ||
    a.prenom.localeCompare(b.prenom, "fr", { sensitivity: "base" })
  );
}

type Entree =
  | { kind: "decharge"; key: string; nom: string; prenom: string; date: string; d: MusculationDechargeRow }
  | { kind: "import"; key: string; nom: string; prenom: string; date: string; i: MusculationImportRow };

type Tri = "nom" | "recent";

const STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente de validation par l'adhérent",
  valide: "Validée",
};

const STATUT_CLASSES: Record<string, string> = {
  en_attente: "bg-amber-100 text-amber-800",
  valide: "bg-green-100 text-green-800",
};

/**
 * État de la transmission au bureau : sans cette information, un envoi refusé
 * par le service d'emails resterait invisible — la validation du dossier
 * aboutit dans tous les cas, volontairement.
 */
function NotificationEtat({ decharge: d }: { decharge: MusculationDechargeRow }) {
  const destinataires = d.notification_destinataires ?? [];

  if (d.notification_statut === "envoyee") {
    return (
      <>
        <span className="font-medium text-emerald-700">✓ Transmise au bureau</span>
        <span className="text-toac-blue-900/60"> le {formatDate(d.notification_le)}</span>
        {destinataires.length > 0 && (
          <div className="mt-1 text-toac-blue-900/70">À : {destinataires.join(", ")}</div>
        )}
      </>
    );
  }

  if (d.notification_statut === "echec" || d.notification_statut === "ignoree") {
    return (
      <>
        <span className="font-medium text-red-700">
          {d.notification_statut === "echec" ? "✕ Envoi en échec" : "✕ Aucun email envoyé"}
        </span>
        <span className="text-toac-blue-900/60"> le {formatDate(d.notification_le)}</span>
        {d.notification_erreur && (
          <div className="mt-1 break-words text-toac-blue-900/70">{d.notification_erreur}</div>
        )}
      </>
    );
  }

  // Dossiers validés avant la mise en place de ce suivi : aucune trace en base.
  return <span className="text-toac-blue-900/60">Transmission au bureau non tracée.</span>;
}

export default function AdminMusculationTable({
  decharges,
  imports,
}: {
  decharges: MusculationDechargeRow[];
  imports: MusculationImportRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tri, setTri] = useState<Tri>("nom");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notifyingId, setNotifyingId] = useState<number | null>(null);
  const [notifyMessage, setNotifyMessage] = useState<{ id: number; text: string; ok: boolean } | null>(
    null
  );
  // Un dossier est créé dès l'envoi du formulaire, avant que l'adhérent ait relu
  // et validé son document. Ces dossiers en attente ne sont pas des documents
  // transmis au club : ils encombrent la liste, mais restent affichables pour
  // pouvoir relancer l'adhérent ou supprimer un essai abandonné.
  const [showPending, setShowPending] = useState(false);

  const pendingCount = useMemo(
    () => decharges.filter((d) => d.statut !== "valide").length,
    [decharges]
  );

  const validesEnLigne = decharges.length - pendingCount;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const entrees: Entree[] = [
      ...decharges
        .filter((d) => showPending || d.statut === "valide")
        .map((d): Entree => ({ kind: "decharge", key: `d${d.id}`, nom: d.nom, prenom: d.prenom, date: d.recue_le, d })),
      ...imports.map(
        (i): Entree => ({ kind: "import", key: `i${i.id}`, nom: i.nom, prenom: i.prenom, date: i.importe_le, i })
      ),
    ].filter((e) => !query || `${e.prenom} ${e.nom}`.toLowerCase().includes(query));
    return entrees.sort((a, b) =>
      tri === "nom" ? compareNoms(a, b) : b.date.localeCompare(a.date) || compareNoms(a, b)
    );
  }, [decharges, imports, search, showPending, tri]);

  const [deletingImportId, setDeletingImportId] = useState<number | null>(null);

  async function handleDeleteImport(i: MusculationImportRow) {
    if (!window.confirm(`Retirer ${i.prenom} ${i.nom} de la liste des adhérents validés musculation ?`)) return;
    setDeletingImportId(i.id);
    setDeleteError(null);
    try {
      const response = await fetch("/api/admin/musculation/import/supprimer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: i.id }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setDeleteError(data?.error ?? "La suppression a échoué. Réessayez plus tard.");
        return;
      }
      router.refresh();
    } catch {
      setDeleteError("Erreur réseau. Réessayez plus tard.");
    } finally {
      setDeletingImportId(null);
    }
  }

  async function copyReviewLink(d: MusculationDechargeRow) {
    const url = `${window.location.origin}/musculation/valider/${d.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(d.id);
      setTimeout(() => setCopiedId((current) => (current === d.id ? null : current)), 2000);
    } catch {
      window.prompt("Copiez ce lien :", url);
    }
  }

  /** Relance l'envoi au bureau, après un échec ou une correction des destinataires. */
  async function handleNotify(d: MusculationDechargeRow) {
    setNotifyingId(d.id);
    setNotifyMessage(null);

    let response: Response;
    try {
      response = await fetch("/api/musculation/decharge/notifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: d.id }),
      });
    } catch {
      setNotifyMessage({ id: d.id, text: "Erreur réseau. Réessayez plus tard.", ok: false });
      setNotifyingId(null);
      return;
    }

    const data = await response.json().catch(() => null);
    setNotifyingId(null);
    if (!response.ok) {
      setNotifyMessage({ id: d.id, text: data?.error ?? "L'envoi a échoué.", ok: false });
      return;
    }
    setNotifyMessage({
      id: d.id,
      text: `Envoyé à ${(data?.destinataires ?? []).join(", ")}`,
      ok: true,
    });
    router.refresh();
  }

  /**
   * Suppression définitive : le dossier et ses deux fichiers disparaissent. Sert
   * au ménage des essais comme aux demandes d'effacement (RGPD), d'où la
   * confirmation explicite avant l'appel.
   */
  async function handleDelete(d: MusculationDechargeRow) {
    const confirmed = window.confirm(
      `Supprimer définitivement le dossier de ${d.prenom} ${d.nom} ?\n\n` +
        "La décharge et le certificat médical seront effacés. Cette action est irréversible."
    );
    if (!confirmed) return;

    setDeletingId(d.id);
    setDeleteError(null);

    let response: Response;
    try {
      response = await fetch("/api/musculation/decharge/supprimer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: d.id }),
      });
    } catch {
      setDeleteError("Erreur réseau. Réessayez plus tard.");
      setDeletingId(null);
      return;
    }

    const data = await response.json().catch(() => null);
    setDeletingId(null);
    if (!response.ok) {
      setDeleteError(data?.error ?? "La suppression a échoué. Réessayez plus tard.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-toac-gray-200 bg-white p-4 shadow-sm">
          <div className="font-display text-2xl text-toac-blue-950">{validesEnLigne + imports.length}</div>
          <div className="text-xs text-toac-blue-900/60">adhérents validés musculation</div>
        </div>
        <div className="rounded-lg border border-toac-gray-200 bg-white p-4 shadow-sm">
          <div className="font-display text-2xl text-toac-blue-950">{validesEnLigne}</div>
          <div className="text-xs text-toac-blue-900/60">
            décharges validées en ligne{pendingCount > 0 && ` (+ ${pendingCount} en attente)`}
          </div>
        </div>
        <div className="rounded-lg border border-toac-gray-200 bg-white p-4 shadow-sm">
          <div className="font-display text-2xl text-toac-blue-950">{imports.length}</div>
          <div className="text-xs text-toac-blue-900/60">importés (dossiers des saisons précédentes)</div>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un nom…"
          className="w-full rounded-md border border-toac-gray-200 px-3 py-2 outline-none focus:border-toac-blue-600 focus:ring-2 focus:ring-toac-blue-600/30"
        />
        <select
          value={tri}
          onChange={(e) => setTri(e.target.value as Tri)}
          aria-label="Trier la liste"
          className="rounded-md border border-toac-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-toac-blue-600 focus:ring-2 focus:ring-toac-blue-600/30"
        >
          <option value="nom">Nom (A → Z)</option>
          <option value="recent">Plus récents d&apos;abord</option>
        </select>
      </div>

      <label className="mb-4 flex items-center gap-2 text-sm text-toac-blue-900/80">
        <input
          type="checkbox"
          checked={showPending}
          onChange={(e) => setShowPending(e.target.checked)}
        />
        Afficher aussi les dossiers en attente de validation
        {pendingCount > 0 && ` (${pendingCount})`}
      </label>

      <div className="space-y-3">
        {filtered.map((e) => {
          if (e.kind === "import") {
            const i = e.i;
            return (
              <div key={e.key} className="rounded-lg border border-toac-gray-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === e.key ? null : e.key)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
                >
                  <div>
                    <div className="font-medium text-toac-blue-950">
                      {i.prenom} {i.nom}
                    </div>
                    <div className="mt-1 text-xs text-toac-blue-900/60">
                      Dossier transmis sur une saison précédente
                      {i.date_dossier &&
                        ` · du ${formatIsoDate(i.date_dossier)}, valable jusqu'au ${finValidite(i.date_dossier)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Validée (import)
                    </span>
                    <span aria-hidden="true" className="text-toac-blue-900/50">
                      {expanded === e.key ? "▲" : "▼"}
                    </span>
                  </div>
                </button>
                {expanded === e.key && (
                  <div className="border-t border-toac-gray-100 px-4 py-4 text-sm">
                    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                      <div>
                        <dt className="text-toac-blue-900/60">Date de naissance</dt>
                        <dd>{i.date_naissance ? formatIsoDate(i.date_naissance) : "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-toac-blue-900/60">Importé le</dt>
                        <dd>{formatDate(i.importe_le)}</dd>
                      </div>
                      {i.commentaire && (
                        <div className="sm:col-span-2">
                          <dt className="text-toac-blue-900/60">Commentaire</dt>
                          <dd>{i.commentaire}</dd>
                        </div>
                      )}
                    </dl>
                    <p className="mt-3 text-xs text-toac-blue-900/60">
                      Décharge et certificat médical conservés hors du site (transmis avant la mise en place
                      du formulaire en ligne).
                    </p>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => handleDeleteImport(i)}
                        disabled={deletingImportId === i.id}
                        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {deletingImportId === i.id ? "Suppression…" : "Retirer de la liste"}
                      </button>
                    </div>
                    {deleteError && deletingImportId === null && (
                      <p role="alert" className="mt-3 text-xs font-medium text-red-600">
                        {deleteError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          }
          const d = e.d;
          return (
          <div key={e.key} className="rounded-lg border border-toac-gray-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setExpanded(expanded === e.key ? null : e.key)}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
            >
              <div>
                <div className="font-medium text-toac-blue-950">
                  {d.prenom} {d.nom}
                </div>
                <div className="mt-1 text-xs text-toac-blue-900/60">
                  Reçue le {formatDate(d.recue_le)}
                  {d.statut === "valide" && ` · Validée le ${formatDate(d.valide_le)}`}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_CLASSES[d.statut] ?? "bg-toac-gray-100 text-toac-blue-900"}`}
                >
                  {STATUT_LABELS[d.statut] ?? d.statut}
                </span>
                <span aria-hidden="true" className="text-toac-blue-900/50">
                  {expanded === e.key ? "▲" : "▼"}
                </span>
              </div>
            </button>
            {expanded === e.key && (
              <div className="border-t border-toac-gray-100 px-4 py-4 text-sm">
                <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  <div><dt className="text-toac-blue-900/60">Nationalité</dt><dd>{d.nationalite}</dd></div>
                  <div><dt className="text-toac-blue-900/60">Date de naissance</dt><dd>{d.date_naissance}</dd></div>
                  <div className="sm:col-span-2">
                    <dt className="text-toac-blue-900/60">Adresse</dt>
                    <dd>{d.adresse}, {d.code_postal} {d.ville}</dd>
                  </div>
                  {d.est_mineur && (
                    <div className="sm:col-span-2">
                      <dt className="text-toac-blue-900/60">Autorisation parentale</dt>
                      <dd>{d.representant_nom} — signée le {d.date_signature_representant}</dd>
                    </div>
                  )}
                </dl>

                {d.statut === "valide" && (
                  <div className="mt-4 rounded-md border border-toac-gray-200 bg-toac-gray-50 px-3 py-2 text-xs">
                    <NotificationEtat decharge={d} />
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href={documentHref(d.decharge_url, undefined, {
                      filename: buildDechargeFileName(d.nom, d.prenom),
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-toac-blue-800 px-3 py-1.5 text-xs font-medium text-toac-blue-950 hover:bg-toac-blue-950 hover:text-white"
                  >
                    Voir/télécharger la décharge →
                  </a>
                  <a
                    href={documentHref(d.certificat_url, undefined, {
                      filename: buildDechargeFileName(d.nom, d.prenom, certificatExtension(d.certificat_url)),
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-toac-blue-800 px-3 py-1.5 text-xs font-medium text-toac-blue-950 hover:bg-toac-blue-950 hover:text-white"
                  >
                    Voir/télécharger le certificat →
                  </a>
                  <button
                    type="button"
                    onClick={() => copyReviewLink(d)}
                    className="rounded-md border border-toac-gray-200 px-3 py-1.5 text-xs font-medium text-toac-blue-900 hover:bg-toac-gray-100"
                  >
                    {copiedId === d.id ? "Lien copié ✓" : "Copier le lien de partage/relecture"}
                  </button>
                  {d.statut === "valide" && (
                    <button
                      type="button"
                      onClick={() => handleNotify(d)}
                      disabled={notifyingId === d.id}
                      className="rounded-md border border-toac-gray-200 px-3 py-1.5 text-xs font-medium text-toac-blue-900 hover:bg-toac-gray-100 disabled:opacity-60"
                    >
                      {notifyingId === d.id
                        ? "Envoi…"
                        : d.notification_statut === "envoyee"
                          ? "Renvoyer la notification"
                          : "Envoyer la notification"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(d)}
                    disabled={deletingId === d.id}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    {deletingId === d.id ? "Suppression…" : "Supprimer le dossier"}
                  </button>
                </div>
                {notifyMessage?.id === d.id && (
                  <p
                    role="status"
                    className={`mt-3 text-xs font-medium ${notifyMessage.ok ? "text-emerald-700" : "text-red-600"}`}
                  >
                    {notifyMessage.text}
                  </p>
                )}
                {deleteError && deletingId === null && (
                  <p role="alert" className="mt-3 text-xs font-medium text-red-600">
                    {deleteError}
                  </p>
                )}
              </div>
            )}
          </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="rounded-lg border border-toac-gray-200 bg-white p-6 text-center text-toac-blue-900/60 shadow-sm">
            {!showPending && pendingCount > 0
              ? "Aucune décharge validée pour le moment — cochez la case ci-dessus pour voir les dossiers en attente."
              : "Aucune décharge musculation pour le moment."}
          </p>
        )}
      </div>
    </div>
  );
}
