export default function DbSetupNotice() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-900">
      <p className="font-medium">Base de données non configurée.</p>
      <p className="mt-2 text-sm">
        Renseignez la variable d&apos;environnement <code className="rounded bg-white/60 px-1">DATABASE_URL</code>{" "}
        (voir <code className="rounded bg-white/60 px-1">.env.example</code> et le README, section base de
        données) pour activer l&apos;enregistrement automatique des demandes
        d&apos;adhésion.
      </p>
    </div>
  );
}
