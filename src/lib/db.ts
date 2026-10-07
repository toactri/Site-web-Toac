import { Pool } from "pg";
import type { Member, MemberDossier, MemberStatus } from "./types";

/**
 * Base de données Postgres (Neon, Vercel Postgres, Supabase… n'importe quel
 * Postgres standard convient) utilisée pour stocker automatiquement :
 *  - les tables `commandes` et `inscriptions` de l'ancien parcours
 *    d'adhésion + paiement Monetico, retiré du site en octobre 2026 : elles
 *    sont conservées en base pour l'historique (code récupérable dans git,
 *    commit c2b5880).
 *
 * Configuration : renseignez DATABASE_URL (chaîne de connexion Postgres,
 * ex. fournie par Vercel/Neon, Supabase…) dans les variables d'environnement.
 * Tant que DATABASE_URL n'est pas définie, les fonctions ci-dessous lèvent
 * une erreur explicite, interceptée par les pages/API qui les appellent
 * pour afficher un message d'installation plutôt que de planter le site.
 *
 * Pas de garde `import "server-only"` ici (contrairement aux autres modules
 * de src/lib) : ce module est aussi importé directement par les scripts CLI
 * (scripts/import-members-csv.ts, scripts/manage-accounts.ts) exécutés avec
 * `tsx`, hors du bundler Next — `server-only` y lève toujours une erreur. La
 * dépendance `pg` (Node uniquement) empêche de toute façon tout bundling
 * accidentel côté client.
 */

let pool: Pool | null = null;

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "DATABASE_URL n'est pas configurée. Renseignez cette variable d'environnement " +
        "(voir .env.example et le README, section base de données) pour activer le suivi " +
        "automatique des commandes et inscriptions."
    );
    this.name = "DatabaseNotConfiguredError";
  }
}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new DatabaseNotConfiguredError();
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("sslmode=") ? undefined : { rejectUnauthorized: false },
      // Une seule connexion à la fois et des délais courts : chaque appel de
      // fonction serverless (Vercel) est une exécution isolée et de courte
      // durée, ce qui ne se marie pas bien avec un pool multi-connexions
      // classique. Cela évite aussi de rester bloqué trop longtemps si la
      // base vient de sortir de veille (Neon "scale to zero").
      max: 1,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 10000,
    });
    // Une connexion qui échoue en arrière-plan (socket coupé entre deux
    // invocations serverless) ne doit pas faire planter le process : on
    // la journalise et on repartira sur une nouvelle connexion au prochain
    // appel.
    pool.on("error", (error) => {
      console.error("Erreur de connexion PostgreSQL (pool) :", error);
    });
  }
  return pool;
}

let schemaReady: Promise<void> | null = null;

/** Crée les tables si elles n'existent pas encore (idempotent, appelé avant chaque requête). */
function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = getPool()
      .query(
        `
        CREATE TABLE IF NOT EXISTS commandes (
          id SERIAL PRIMARY KEY,
          reference TEXT UNIQUE NOT NULL,
          recu_le TIMESTAMPTZ NOT NULL DEFAULT now(),
          date_paiement TEXT,
          email TEXT,
          montant_centimes INTEGER,
          devise TEXT,
          statut TEXT NOT NULL,
          code_retour TEXT,
          marque_carte TEXT,
          numero_autorisation TEXT,
          texte_libre TEXT,
          brut JSONB NOT NULL
        );

        CREATE TABLE IF NOT EXISTS inscriptions (
          id SERIAL PRIMARY KEY,
          recue_le TIMESTAMPTZ NOT NULL DEFAULT now(),
          statut TEXT NOT NULL DEFAULT 'nouveau',
          prenom TEXT NOT NULL,
          nom TEXT NOT NULL,
          date_naissance TEXT,
          email TEXT NOT NULL,
          telephone TEXT,
          adresse TEXT,
          formule TEXT,
          licence_existante TEXT,
          contact_urgence_nom TEXT,
          contact_urgence_telephone TEXT,
          certificat_medical TEXT,
          droit_image BOOLEAN NOT NULL DEFAULT false,
          message TEXT,
          member_id INTEGER,
          justificatif_url TEXT,
          assurance TEXT
        );

        CREATE TABLE IF NOT EXISTS preinscriptions (
          id SERIAL PRIMARY KEY,
          recue_le TIMESTAMPTZ NOT NULL DEFAULT now(),
          email TEXT NOT NULL,
          nom TEXT NOT NULL,
          prenom TEXT NOT NULL,
          telephone TEXT NOT NULL,
          date_naissance TEXT NOT NULL,
          permis_conduire BOOLEAN NOT NULL DEFAULT false,
          numero_permis TEXT,
          benevolat TEXT[] NOT NULL DEFAULT '{}',
          reglement_accepte BOOLEAN NOT NULL DEFAULT false,
          trifonction TEXT[] NOT NULL DEFAULT '{}',
          brevets_federaux TEXT,
          arbitrage TEXT,
          soutien_partenaire TEXT,
          stage_argeles TEXT,
          stage_montagne TEXT,
          questions_suggestions TEXT,
          statut TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS partner_signups (
          id SERIAL PRIMARY KEY,
          recue_le TIMESTAMPTZ NOT NULL DEFAULT now(),
          partenaire TEXT NOT NULL,
          nom TEXT NOT NULL,
          prenom TEXT NOT NULL,
          email TEXT NOT NULL,
          consentement BOOLEAN NOT NULL DEFAULT false,
          statut TEXT NOT NULL DEFAULT 'a_traiter'
        );

        -- Jeton pour le lien "Confirmer l'ajout" envoyé par email au
        -- responsable partenariat (clic direct, sans connexion au bureau) et
        -- suivi de la notification qui lui est envoyée à chaque demande —
        -- même logique que pour musculation_decharges plus bas. Ajoutés
        -- après coup : sans effet sur une base déjà à jour.
        ALTER TABLE partner_signups
          ADD COLUMN IF NOT EXISTS token TEXT UNIQUE,
          ADD COLUMN IF NOT EXISTS ajoute_le TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS notification_statut TEXT,
          ADD COLUMN IF NOT EXISTS notification_le TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS notification_destinataires TEXT[] NOT NULL DEFAULT '{}',
          ADD COLUMN IF NOT EXISTS notification_erreur TEXT;

        -- Anciens intitulés de statut (avant l'ajout du suivi ci-dessus) :
        -- remplacés par 'a_traiter' / 'ajoute', utilisés partout ailleurs.
        UPDATE partner_signups SET statut = 'a_traiter' WHERE statut = 'nouveau';
        UPDATE partner_signups SET statut = 'ajoute' WHERE statut = 'traite';

        CREATE TABLE IF NOT EXISTS musculation_decharges (
          id SERIAL PRIMARY KEY,
          recue_le TIMESTAMPTZ NOT NULL DEFAULT now(),
          token TEXT UNIQUE NOT NULL,
          statut TEXT NOT NULL DEFAULT 'en_attente',
          valide_le TIMESTAMPTZ,
          nom TEXT NOT NULL,
          prenom TEXT NOT NULL,
          nationalite TEXT NOT NULL,
          date_naissance TEXT NOT NULL,
          adresse TEXT NOT NULL,
          code_postal TEXT NOT NULL,
          ville TEXT NOT NULL,
          date_signature TEXT NOT NULL,
          est_mineur BOOLEAN NOT NULL DEFAULT false,
          representant_nom TEXT,
          date_signature_representant TEXT,
          decharge_url TEXT NOT NULL,
          certificat_url TEXT NOT NULL
        );

        -- Suivi de la notification envoyée au bureau à la validation d'un
        -- dossier. Ajouté après coup : sans effet sur une base déjà à jour.
        ALTER TABLE musculation_decharges
          ADD COLUMN IF NOT EXISTS notification_statut TEXT,
          ADD COLUMN IF NOT EXISTS notification_le TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS notification_destinataires TEXT[] NOT NULL DEFAULT '{}',
          ADD COLUMN IF NOT EXISTS notification_erreur TEXT;

        -- Adhérents d'une saison, importés depuis l'onglet « Dossiers
        -- adhésion » du Google Sheets (Bureau → Attestations). Sert à vérifier
        -- l'adhésion et à reprendre les montants payés sur l'attestation. Un
        -- import remplace toutes les lignes de sa saison.
        CREATE TABLE IF NOT EXISTS adherents_saison (
          id SERIAL PRIMARY KEY,
          saison TEXT NOT NULL,
          nom TEXT NOT NULL,
          prenom TEXT NOT NULL,
          name_key TEXT NOT NULL,
          date_naissance TEXT NOT NULL,
          sexe TEXT,
          email TEXT,
          cotisation_centimes INTEGER NOT NULL DEFAULT 0,
          licence_centimes INTEGER NOT NULL DEFAULT 0,
          statut_dossier TEXT,
          importe_le TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS adherents_saison_lookup
          ON adherents_saison (saison, name_key, date_naissance);

        -- Attestations de paiement générées à la demande des adhérents. Les
        -- montants et l'identité sont recopiés au moment de la génération :
        -- c'est un instantané du document envoyé, indépendant des imports
        -- ultérieurs. Une seule ligne par adhérent et par saison, mise à jour
        -- à chaque nouvelle demande.
        CREATE TABLE IF NOT EXISTS attestations (
          id SERIAL PRIMARY KEY,
          cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
          genere_le TIMESTAMPTZ NOT NULL DEFAULT now(),
          saison TEXT NOT NULL,
          name_key TEXT NOT NULL,
          date_naissance TEXT NOT NULL,
          nom TEXT NOT NULL,
          prenom TEXT NOT NULL,
          email TEXT NOT NULL,
          cotisation_centimes INTEGER NOT NULL,
          licence_centimes INTEGER NOT NULL,
          document_path TEXT NOT NULL,
          demandes INTEGER NOT NULL DEFAULT 1,
          envoi_statut TEXT,
          envoi_le TIMESTAMPTZ,
          envoi_erreur TEXT,
          UNIQUE (saison, name_key, date_naissance)
        );

        -- Réglages modifiables depuis la vue bureau (nom du trésorier, image de
        -- signature de l'attestation…), sous forme clé/valeur.
        CREATE TABLE IF NOT EXISTS parametres (
          cle TEXT PRIMARY KEY,
          valeur TEXT,
          modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS members (
          id SERIAL PRIMARY KEY,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          name_key TEXT,
          email TEXT,
          status TEXT NOT NULL DEFAULT 'new',
          paiement BOOLEAN NOT NULL DEFAULT false,
          formulaire_adhesion BOOLEAN NOT NULL DEFAULT false,
          caution BOOLEAN NOT NULL DEFAULT false,
          groupe_google BOOLEAN NOT NULL DEFAULT false,
          whatsapp BOOLEAN NOT NULL DEFAULT false,
          licence_demandee BOOLEAN NOT NULL DEFAULT false,
          licence_payee BOOLEAN NOT NULL DEFAULT false,
          justificatif BOOLEAN NOT NULL DEFAULT false,
          justificatif_url TEXT,
          cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        -- Migration idempotente pour les bases créées avant l'ajout de
        -- name_key/caution/justificatif (voir historique du dépôt) : sans
        -- effet si la table members a déjà le schéma ci-dessus.
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'members' AND column_name = 'cheque'
          ) THEN
            ALTER TABLE members RENAME COLUMN cheque TO caution;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'members' AND column_name = 'justificatif'
          ) THEN
            ALTER TABLE members ADD COLUMN justificatif BOOLEAN NOT NULL DEFAULT false;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'members' AND column_name = 'justificatif_url'
          ) THEN
            ALTER TABLE members ADD COLUMN justificatif_url TEXT;
          END IF;

          IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_name = 'members' AND constraint_name = 'members_email_key'
          ) THEN
            ALTER TABLE members DROP CONSTRAINT members_email_key;
          END IF;

          ALTER TABLE members ALTER COLUMN email DROP NOT NULL;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'members' AND column_name = 'name_key'
          ) THEN
            ALTER TABLE members ADD COLUMN name_key TEXT;
          END IF;

          UPDATE members
          SET name_key = lower(regexp_replace(last_name, '[^a-zA-Z0-9]', '', 'g'))
            || '|' || lower(regexp_replace(first_name, '[^a-zA-Z0-9]', '', 'g'))
          WHERE name_key IS NULL;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_name = 'members' AND constraint_name = 'members_name_key_key'
          ) THEN
            ALTER TABLE members ADD CONSTRAINT members_name_key_key UNIQUE (name_key);
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'inscriptions' AND column_name = 'member_id'
          ) THEN
            ALTER TABLE inscriptions ADD COLUMN member_id INTEGER;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'inscriptions' AND column_name = 'justificatif_url'
          ) THEN
            ALTER TABLE inscriptions ADD COLUMN justificatif_url TEXT;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'inscriptions' AND column_name = 'assurance'
          ) THEN
            ALTER TABLE inscriptions ADD COLUMN assurance TEXT;
          END IF;
        END $$;
        `
      )
      .then(() => undefined);
  }
  return schemaReady;
}

export interface PreinscriptionRow {
  id: number;
  recue_le: string;
  email: string;
  nom: string;
  prenom: string;
  telephone: string;
  date_naissance: string;
  permis_conduire: boolean;
  numero_permis: string | null;
  benevolat: string[];
  reglement_accepte: boolean;
  trifonction: string[];
  brevets_federaux: string | null;
  arbitrage: string | null;
  soutien_partenaire: string | null;
  stage_argeles: string | null;
  stage_montagne: string | null;
  questions_suggestions: string | null;
  statut: string;
}

export interface NouvellePreinscription {
  email: string;
  nom: string;
  prenom: string;
  telephone: string;
  dateNaissance: string;
  permisConduire: boolean;
  numeroPermis: string | null;
  benevolat: string[];
  reglementAccepte: boolean;
  trifonction: string[];
  brevetsFederaux: string;
  arbitrage: string;
  soutienPartenaire: string;
  stageArgeles: string;
  stageMontagne: string;
  questionsSuggestions: string;
  statut: string;
}

/** Enregistre une pré-inscription (formulaire "Nous rejoindre", étape 1 du parcours). */
export async function insertPreinscription(p: NouvellePreinscription): Promise<number> {
  await ensureSchema();
  const { rows } = await getPool().query<{ id: number }>(
    `
    INSERT INTO preinscriptions (
      email, nom, prenom, telephone, date_naissance, permis_conduire, numero_permis,
      benevolat, reglement_accepte, trifonction, brevets_federaux, arbitrage,
      soutien_partenaire, stage_argeles, stage_montagne, questions_suggestions, statut
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    RETURNING id
    `,
    [
      p.email,
      p.nom,
      p.prenom,
      p.telephone,
      p.dateNaissance,
      p.permisConduire,
      p.numeroPermis,
      p.benevolat,
      p.reglementAccepte,
      p.trifonction,
      p.brevetsFederaux,
      p.arbitrage,
      p.soutienPartenaire,
      p.stageArgeles,
      p.stageMontagne,
      p.questionsSuggestions,
      p.statut,
    ]
  );
  return rows[0].id;
}

export async function getPreinscriptions(): Promise<PreinscriptionRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query<PreinscriptionRow>(
    "SELECT * FROM preinscriptions ORDER BY recue_le DESC"
  );
  return rows;
}

export interface PartnerSignupRow {
  id: number;
  recue_le: string;
  partenaire: string;
  nom: string;
  prenom: string;
  email: string;
  consentement: boolean;
  statut: "a_traiter" | "ajoute";
  token: string | null;
  ajoute_le: string | null;
  /**
   * Suivi de la notification envoyée au responsable partenariat à chaque
   * demande (et à chaque renvoi manuel) : `null` tant qu'aucun envoi n'a
   * été tenté, puis « envoyee », « ignoree » (aucun destinataire ou envoi
   * d'emails non configuré) ou « echec ».
   */
  notification_statut: NotificationStatut | null;
  notification_le: string | null;
  notification_destinataires: string[];
  notification_erreur: string | null;
}

export interface NouveauPartnerSignup {
  partenaire: string;
  nom: string;
  prenom: string;
  email: string;
  consentement: boolean;
  token: string;
}

/** Enregistre une demande d'activation des avantages d'un partenaire (ex. Alltricks). */
export async function insertPartnerSignup(p: NouveauPartnerSignup): Promise<PartnerSignupRow> {
  await ensureSchema();
  const { rows } = await getPool().query<PartnerSignupRow>(
    `
    INSERT INTO partner_signups (partenaire, nom, prenom, email, consentement, statut, token)
    VALUES ($1,$2,$3,$4,$5,'a_traiter',$6)
    RETURNING *
    `,
    [p.partenaire, p.nom, p.prenom, p.email, p.consentement, p.token]
  );
  return rows[0];
}

export async function getPartnerSignups(): Promise<PartnerSignupRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query<PartnerSignupRow>(
    "SELECT * FROM partner_signups ORDER BY recue_le DESC"
  );
  return rows;
}

export async function getPartnerSignupById(id: number): Promise<PartnerSignupRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<PartnerSignupRow>(
    "SELECT * FROM partner_signups WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

export async function getPartnerSignupByToken(token: string): Promise<PartnerSignupRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<PartnerSignupRow>(
    "SELECT * FROM partner_signups WHERE token = $1",
    [token]
  );
  return rows[0] ?? null;
}

/**
 * Marque la demande « ajoutée » (email renseigné côté partenaire) et
 * renvoie la ligne mise à jour — ou `null` si l'id est inconnu ou si la
 * demande était déjà marquée ajoutée (pas de double envoi de l'email de
 * confirmation à l'adhérent dans ce cas : à l'appelant de vérifier l'état
 * actuel via getPartnerSignupById/ByToken s'il veut distinguer les deux).
 */
export async function markPartnerSignupAdded(id: number): Promise<PartnerSignupRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<PartnerSignupRow>(
    `
    UPDATE partner_signups SET statut = 'ajoute', ajoute_le = now()
    WHERE id = $1 AND statut != 'ajoute'
    RETURNING *
    `,
    [id]
  );
  return rows[0] ?? null;
}

/** Consigne le résultat de la notification au responsable partenariat. */
export async function recordPartnerSignupNotification(
  id: number,
  result: { statut: NotificationStatut; destinataires: string[]; erreur?: string | null }
): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `
    UPDATE partner_signups
    SET notification_statut = $2,
        notification_le = now(),
        notification_destinataires = $3,
        notification_erreur = $4
    WHERE id = $1
    `,
    [id, result.statut, result.destinataires, result.erreur ?? null]
  );
}

export async function deletePartnerSignup(id: number): Promise<void> {
  await ensureSchema();
  await getPool().query("DELETE FROM partner_signups WHERE id = $1", [id]);
}



export interface MusculationDechargeRow {
  id: number;
  recue_le: string;
  token: string;
  statut: "en_attente" | "valide";
  valide_le: string | null;
  nom: string;
  prenom: string;
  nationalite: string;
  date_naissance: string;
  adresse: string;
  code_postal: string;
  ville: string;
  date_signature: string;
  est_mineur: boolean;
  representant_nom: string | null;
  date_signature_representant: string | null;
  decharge_url: string;
  certificat_url: string;
  /**
   * Suivi de la notification au bureau : `null` tant que le dossier n'est pas
   * validé, puis « envoyee », « ignoree » (aucun destinataire ou envoi d'emails
   * non configuré) ou « echec ».
   */
  notification_statut: NotificationStatut | null;
  notification_le: string | null;
  notification_destinataires: string[];
  notification_erreur: string | null;
}

export type NotificationStatut = "envoyee" | "ignoree" | "echec";

export interface NouvelleMusculationDecharge {
  token: string;
  nom: string;
  prenom: string;
  nationalite: string;
  dateNaissance: string;
  adresse: string;
  codePostal: string;
  ville: string;
  dateSignature: string;
  estMineur: boolean;
  representantNom: string | null;
  dateSignatureRepresentant: string | null;
  dechargeUrl: string;
  certificatUrl: string;
}

/**
 * Enregistre un brouillon de décharge musculation (statut 'en_attente') :
 * le document et le certificat sont déjà générés/uploadés à ce stade, mais
 * l'adhérent doit encore les valider via le lien /musculation/valider/[token]
 * avant qu'ils ne soient considérés comme officiellement transmis au club.
 */
export async function insertMusculationDecharge(d: NouvelleMusculationDecharge): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `
    INSERT INTO musculation_decharges (
      token, nom, prenom, nationalite, date_naissance, adresse, code_postal, ville,
      date_signature, est_mineur, representant_nom, date_signature_representant,
      decharge_url, certificat_url
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    `,
    [
      d.token,
      d.nom,
      d.prenom,
      d.nationalite,
      d.dateNaissance,
      d.adresse,
      d.codePostal,
      d.ville,
      d.dateSignature,
      d.estMineur,
      d.representantNom,
      d.dateSignatureRepresentant,
      d.dechargeUrl,
      d.certificatUrl,
    ]
  );
}

/**
 * Consigne le résultat de la notification au bureau sur le dossier. Appelée
 * juste après la tentative d'envoi, et à chaque renvoi depuis la vue bureau,
 * pour que celle-ci puisse montrer si l'information est bien partie et à qui.
 */
export async function recordMusculationNotification(
  token: string,
  result: { statut: NotificationStatut; destinataires: string[]; erreur?: string | null }
): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `
    UPDATE musculation_decharges
    SET notification_statut = $2,
        notification_le = now(),
        notification_destinataires = $3,
        notification_erreur = $4
    WHERE token = $1
    `,
    [token, result.statut, result.destinataires, result.erreur ?? null]
  );
}

/**
 * Supprime les dossiers encore `en_attente` du même adhérent, hors celui qu'on
 * vient de créer. Un adhérent qui reprend le formulaire — parce qu'il s'est
 * trompé, ou qu'il a quitté la page de relecture sans valider — laissait
 * jusqu'ici un dossier orphelin de plus à chaque essai, et c'est bien le
 * remplacement que lui promet la page de relecture.
 *
 * Les dossiers `valide` ne sont jamais touchés : ce sont des documents transmis
 * au club. La comparaison ignore la casse et les espaces de bord.
 *
 * Renvoie les lignes supprimées, pour que l'appelant efface aussi leurs fichiers.
 */
export async function deleteSupersededMusculationDecharges(
  currentToken: string,
  adherent: { nom: string; prenom: string; dateNaissance: string }
): Promise<MusculationDechargeRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query<MusculationDechargeRow>(
    `
    DELETE FROM musculation_decharges
    WHERE statut = 'en_attente'
      AND token <> $1
      AND lower(btrim(nom)) = lower(btrim($2))
      AND lower(btrim(prenom)) = lower(btrim($3))
      AND date_naissance = $4
    RETURNING *
    `,
    [currentToken, adherent.nom, adherent.prenom, adherent.dateNaissance]
  );
  return rows;
}

export async function getMusculationDechargeByToken(token: string): Promise<MusculationDechargeRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<MusculationDechargeRow>(
    "SELECT * FROM musculation_decharges WHERE token = $1",
    [token]
  );
  return rows[0] ?? null;
}

/** Marque la décharge comme validée par l'adhérent (relecture du document généré). */
export async function validateMusculationDecharge(token: string): Promise<MusculationDechargeRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<MusculationDechargeRow>(
    `
    UPDATE musculation_decharges
    SET statut = 'valide', valide_le = now()
    WHERE token = $1
    RETURNING *
    `,
    [token]
  );
  return rows[0] ?? null;
}

/**
 * Supprime définitivement un dossier de décharge. Renvoie la ligne supprimée
 * pour que l'appelant puisse effacer aussi les fichiers correspondants dans le
 * store Blob, ou null si l'identifiant n'existe pas.
 */
export async function deleteMusculationDecharge(id: number): Promise<MusculationDechargeRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<MusculationDechargeRow>(
    "DELETE FROM musculation_decharges WHERE id = $1 RETURNING *",
    [id]
  );
  return rows[0] ?? null;
}

export async function getMusculationDechargeById(id: number): Promise<MusculationDechargeRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<MusculationDechargeRow>(
    "SELECT * FROM musculation_decharges WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

export async function getMusculationDecharges(): Promise<MusculationDechargeRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query<MusculationDechargeRow>(
    "SELECT * FROM musculation_decharges ORDER BY recue_le DESC"
  );
  return rows;
}

export interface AdherentSaisonInput {
  nom: string;
  prenom: string;
  /** Date ISO « AAAA-MM-JJ ». */
  dateNaissance: string;
  sexe: string | null;
  email: string | null;
  cotisationCentimes: number;
  licenceCentimes: number;
  statutDossier: string | null;
}

export interface AdherentSaisonRow {
  id: number;
  saison: string;
  nom: string;
  prenom: string;
  name_key: string;
  date_naissance: string;
  sexe: string | null;
  email: string | null;
  cotisation_centimes: number;
  licence_centimes: number;
  statut_dossier: string | null;
  importe_le: string;
}

/**
 * Remplace tous les adhérents d'une saison par ceux de l'import, dans une seule
 * transaction : en cas d'erreur, la liste précédente reste intacte. Les
 * attestations déjà envoyées ne sont pas touchées (elles portent leur propre
 * copie des données).
 */
export async function replaceAdherentsSaison(saison: string, adherents: AdherentSaisonInput[]): Promise<void> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM adherents_saison WHERE saison = $1", [saison]);
    for (const a of adherents) {
      await client.query(
        `
        INSERT INTO adherents_saison (
          saison, nom, prenom, name_key, date_naissance, sexe, email,
          cotisation_centimes, licence_centimes, statut_dossier
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        `,
        [
          saison,
          a.nom,
          a.prenom,
          nameKey(a.prenom, a.nom),
          a.dateNaissance,
          a.sexe,
          a.email,
          a.cotisationCentimes,
          a.licenceCentimes,
          a.statutDossier,
        ]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Saison la plus récente importée, ex. « 2026/2027 », ou null si aucun import. */
export async function getLatestSaison(): Promise<string | null> {
  await ensureSchema();
  const { rows } = await getPool().query<{ saison: string | null }>(
    "SELECT max(saison) AS saison FROM adherents_saison"
  );
  return rows[0]?.saison ?? null;
}

export async function getAdherentsSaisonStats(): Promise<
  { saison: string; total: number; payes: number; importe_le: string }[]
> {
  await ensureSchema();
  const { rows } = await getPool().query(
    `
    SELECT saison,
           count(*)::int AS total,
           count(*) FILTER (WHERE lower(btrim(statut_dossier)) IN ('payé', 'paye'))::int AS payes,
           max(importe_le) AS importe_le
    FROM adherents_saison
    GROUP BY saison
    ORDER BY saison DESC
    `
  );
  return rows;
}

/**
 * Retrouve un adhérent de la saison par nom, prénom et date de naissance. Le
 * nom et le prénom sont comparés sans accents, casse, espaces ni tirets, et
 * dans les deux ordres (un nom saisi dans le champ prénom arrive souvent).
 */
export async function findAdherentSaison(
  saison: string,
  identite: { nom: string; prenom: string; dateNaissance: string }
): Promise<AdherentSaisonRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<AdherentSaisonRow>(
    `
    SELECT * FROM adherents_saison
    WHERE saison = $1 AND date_naissance = $2 AND name_key IN ($3, $4)
    ORDER BY (name_key = $3) DESC, id
    LIMIT 1
    `,
    [
      saison,
      identite.dateNaissance,
      nameKey(identite.prenom, identite.nom),
      nameKey(identite.nom, identite.prenom),
    ]
  );
  return rows[0] ?? null;
}

export interface AttestationRow {
  id: number;
  cree_le: string;
  genere_le: string;
  saison: string;
  name_key: string;
  date_naissance: string;
  nom: string;
  prenom: string;
  email: string;
  cotisation_centimes: number;
  licence_centimes: number;
  document_path: string;
  demandes: number;
  envoi_statut: NotificationStatut | null;
  envoi_le: string | null;
  envoi_erreur: string | null;
}

export async function getAttestationFor(
  saison: string,
  adherent: Pick<AdherentSaisonRow, "name_key" | "date_naissance">
): Promise<AttestationRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<AttestationRow>(
    "SELECT * FROM attestations WHERE saison = $1 AND name_key = $2 AND date_naissance = $3",
    [saison, adherent.name_key, adherent.date_naissance]
  );
  return rows[0] ?? null;
}

/**
 * Enregistre l'attestation qui vient d'être générée. Si l'adhérent en avait
 * déjà une pour cette saison, la ligne est mise à jour (nouveau document,
 * compteur de demandes incrémenté) : l'appelant efface l'ancien fichier.
 */
export async function upsertAttestation(a: {
  saison: string;
  adherent: AdherentSaisonRow;
  documentPath: string;
}): Promise<AttestationRow> {
  await ensureSchema();
  const { rows } = await getPool().query<AttestationRow>(
    `
    INSERT INTO attestations (
      saison, name_key, date_naissance, nom, prenom, email,
      cotisation_centimes, licence_centimes, document_path
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (saison, name_key, date_naissance) DO UPDATE SET
      genere_le = now(),
      nom = EXCLUDED.nom,
      prenom = EXCLUDED.prenom,
      email = EXCLUDED.email,
      cotisation_centimes = EXCLUDED.cotisation_centimes,
      licence_centimes = EXCLUDED.licence_centimes,
      document_path = EXCLUDED.document_path,
      demandes = attestations.demandes + 1,
      envoi_statut = NULL,
      envoi_le = NULL,
      envoi_erreur = NULL
    RETURNING *
    `,
    [
      a.saison,
      a.adherent.name_key,
      a.adherent.date_naissance,
      a.adherent.nom,
      a.adherent.prenom,
      a.adherent.email ?? "",
      a.adherent.cotisation_centimes,
      a.adherent.licence_centimes,
      a.documentPath,
    ]
  );
  return rows[0];
}

export async function recordAttestationEnvoi(
  id: number,
  result: { statut: NotificationStatut; erreur?: string | null }
): Promise<void> {
  await ensureSchema();
  await getPool().query(
    "UPDATE attestations SET envoi_statut = $2, envoi_le = now(), envoi_erreur = $3 WHERE id = $1",
    [id, result.statut, result.erreur ?? null]
  );
}

export async function getAttestations(): Promise<AttestationRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query<AttestationRow>(
    "SELECT * FROM attestations ORDER BY genere_le DESC"
  );
  return rows;
}

export async function getAttestationById(id: number): Promise<AttestationRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<AttestationRow>("SELECT * FROM attestations WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function deleteAttestation(id: number): Promise<AttestationRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<AttestationRow>(
    "DELETE FROM attestations WHERE id = $1 RETURNING *",
    [id]
  );
  return rows[0] ?? null;
}

export async function getParametres(cles: string[]): Promise<Record<string, string | null>> {
  await ensureSchema();
  const { rows } = await getPool().query<{ cle: string; valeur: string | null }>(
    "SELECT cle, valeur FROM parametres WHERE cle = ANY($1)",
    [cles]
  );
  return Object.fromEntries(rows.map((r) => [r.cle, r.valeur]));
}

export async function setParametre(cle: string, valeur: string | null): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `
    INSERT INTO parametres (cle, valeur) VALUES ($1, $2)
    ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur, modifie_le = now()
    `,
    [cle, valeur]
  );
}

export interface InscriptionRow {
  id: number;
  recue_le: string;
  statut: string;
  prenom: string;
  nom: string;
  date_naissance: string | null;
  email: string;
  telephone: string | null;
  adresse: string | null;
  formule: string | null;
  licence_existante: string | null;
  contact_urgence_nom: string | null;
  contact_urgence_telephone: string | null;
  certificat_medical: string | null;
  droit_image: boolean;
  message: string | null;
  member_id: number | null;
  justificatif_url: string | null;
  assurance: string | null;
}

export interface NouvelleInscription {
  prenom: string;
  nom: string;
  dateNaissance: string;
  email: string;
  telephone: string;
  adresse: string;
  formule: string;
  licenceExistante: string;
  contactUrgenceNom: string;
  contactUrgenceTelephone: string;
  certificatMedical: string;
  droitImage: boolean;
  message: string;
  justificatifUrl: string | null;
  assurance: string;
}

/**
 * Enregistre la demande d'adhésion. Ne crée volontairement PAS de dossier
 * adhérent (table `members`) : tant que le paiement n'est pas confirmé par
 * Monetico, la personne n'est qu'une demande en attente, pas un adhérent
 * (voir markInscriptionPaid, appelé depuis /api/monetico/retour). Renvoie
 * l'identifiant de l'inscription, encodé dans la référence Monetico pour
 * pouvoir la retrouver au retour du paiement.
 */
export async function insertInscription(inscription: NouvelleInscription): Promise<number> {
  await ensureSchema();
  const { rows } = await getPool().query<{ id: number }>(
    `
    INSERT INTO inscriptions (
      prenom, nom, date_naissance, email, telephone, adresse, formule,
      licence_existante, contact_urgence_nom, contact_urgence_telephone,
      certificat_medical, droit_image, message, justificatif_url, assurance
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    RETURNING id
    `,
    [
      inscription.prenom,
      inscription.nom,
      inscription.dateNaissance,
      inscription.email,
      inscription.telephone,
      inscription.adresse,
      inscription.formule,
      inscription.licenceExistante,
      inscription.contactUrgenceNom,
      inscription.contactUrgenceTelephone,
      inscription.certificatMedical,
      inscription.droitImage,
      inscription.message,
      inscription.justificatifUrl,
      inscription.assurance,
    ]
  );
  return rows[0].id;
}

export async function getInscriptions(): Promise<InscriptionRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query<InscriptionRow>(
    "SELECT * FROM inscriptions ORDER BY recue_le DESC"
  );
  return rows;
}

export async function getInscriptionById(id: number): Promise<InscriptionRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<InscriptionRow>(
    "SELECT * FROM inscriptions WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

/**
 * Paiement Monetico confirmé pour cette demande : crée (ou retrouve, par
 * nom) le dossier adhérent maintenant — pas avant — et le marque payé.
 * C'est ce moment précis qui fait passer un simple candidat au statut
 * d'adhérent.
 */
export async function markInscriptionPaid(inscriptionId: number): Promise<void> {
  await ensureSchema();
  const inscription = await getInscriptionById(inscriptionId);
  if (!inscription) return;

  const memberId = await upsertMemberFromInscription({
    prenom: inscription.prenom,
    nom: inscription.nom,
    email: inscription.email,
    justificatif: inscription.formule?.startsWith("reduit") ?? false,
    justificatifUrl: inscription.justificatif_url,
  });
  await markMemberPaid(memberId);
  await getPool().query(
    "UPDATE inscriptions SET statut = 'validée', member_id = $2 WHERE id = $1",
    [inscriptionId, memberId]
  );
}

interface MemberRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  status: string;
  paiement: boolean;
  formulaire_adhesion: boolean;
  caution: boolean;
  groupe_google: boolean;
  whatsapp: boolean;
  licence_demandee: boolean;
  licence_payee: boolean;
  justificatif: boolean;
  justificatif_url: string | null;
}

/**
 * Clé de rapprochement par nom (insensible à la casse et aux accents) :
 * l'export du club n'a pas de colonne email, et un même adhérent peut
 * remplir le formulaire en ligne avec une adresse différente d'une année
 * sur l'autre — le nom reste le repère stable entre l'import CSV et les
 * inscriptions en ligne.
 */
function nameKey(firstName: string, lastName: string): string {
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "");
  return `${normalize(lastName)}|${normalize(firstName)}`;
}

function toMember(row: MemberRow): Member {
  return {
    id: String(row.id),
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email ?? "",
    status: row.status as MemberStatus,
    dossier: {
      paiement: row.paiement,
      formulaireAdhesion: row.formulaire_adhesion,
      caution: row.caution,
      groupeGoogle: row.groupe_google,
      whatsapp: row.whatsapp,
      licenceDemandee: row.licence_demandee,
      licencePayee: row.licence_payee,
      justificatif: row.justificatif,
    },
    justificatifUrl: row.justificatif_url,
  };
}

/** Tous les dossiers adhérents (import CSV + inscriptions en ligne), pour la vue bureau. */
export async function getMembers(): Promise<Member[]> {
  await ensureSchema();
  const { rows } = await getPool().query<MemberRow>(
    "SELECT * FROM members ORDER BY last_name, first_name"
  );
  return rows.map(toMember);
}

export async function getMemberById(id: string): Promise<Member | null> {
  await ensureSchema();
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return null;
  const { rows } = await getPool().query<MemberRow>(
    "SELECT * FROM members WHERE id = $1",
    [numericId]
  );
  return rows[0] ? toMember(rows[0]) : null;
}

export interface CsvMemberInput {
  firstName: string;
  lastName: string;
  email: string;
  status: MemberStatus;
  dossier: MemberDossier;
}

/** Insère ou met à jour (par nom) un adhérent importé depuis le CSV du club. */
export async function upsertMemberFromCsv(m: CsvMemberInput): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `
    INSERT INTO members (
      first_name, last_name, name_key, email, status, paiement, formulaire_adhesion,
      caution, groupe_google, whatsapp, licence_demandee, licence_payee, justificatif
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (name_key) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = COALESCE(NULLIF(EXCLUDED.email, ''), members.email),
      status = EXCLUDED.status,
      paiement = EXCLUDED.paiement,
      formulaire_adhesion = EXCLUDED.formulaire_adhesion,
      caution = EXCLUDED.caution,
      groupe_google = EXCLUDED.groupe_google,
      whatsapp = EXCLUDED.whatsapp,
      licence_demandee = EXCLUDED.licence_demandee,
      licence_payee = EXCLUDED.licence_payee,
      justificatif = EXCLUDED.justificatif
    `,
    [
      m.firstName,
      m.lastName,
      nameKey(m.firstName, m.lastName),
      m.email || null,
      m.status,
      m.dossier.paiement,
      m.dossier.formulaireAdhesion,
      m.dossier.caution,
      m.dossier.groupeGoogle,
      m.dossier.whatsapp,
      m.dossier.licenceDemandee,
      m.dossier.licencePayee,
      m.dossier.justificatif,
    ]
  );
}

/**
 * Crée (ou retrouve, par nom) le dossier adhérent. N'est appelée qu'une
 * fois le paiement confirmé (voir markInscriptionPaid) : un simple envoi du
 * formulaire d'adhésion, sans paiement, ne crée pas de dossier — la
 * personne n'apparaît que dans Bureau → Demandes d'adhésion tant qu'elle
 * n'a pas payé. Renvoie l'identifiant du dossier.
 */
export async function upsertMemberFromInscription(inscription: {
  prenom: string;
  nom: string;
  email: string;
  justificatif: boolean;
  justificatifUrl: string | null;
}): Promise<number> {
  await ensureSchema();
  const { rows } = await getPool().query<{ id: number }>(
    `
    INSERT INTO members (first_name, last_name, name_key, email, status, formulaire_adhesion, justificatif, justificatif_url)
    VALUES ($1, $2, $3, $4, 'new', true, $5, $6)
    ON CONFLICT (name_key) DO UPDATE SET
      email = COALESCE(NULLIF(EXCLUDED.email, ''), members.email),
      formulaire_adhesion = true,
      justificatif = EXCLUDED.justificatif OR members.justificatif,
      justificatif_url = COALESCE(EXCLUDED.justificatif_url, members.justificatif_url)
    RETURNING id
    `,
    [
      inscription.prenom,
      inscription.nom,
      nameKey(inscription.prenom, inscription.nom),
      inscription.email || null,
      inscription.justificatif,
      inscription.justificatifUrl,
    ]
  );
  return rows[0].id;
}

/** Marque le dossier payé + caution réglée suite à une notification Monetico acceptée. */
export async function markMemberPaid(memberId: number): Promise<void> {
  await ensureSchema();
  await getPool().query(
    "UPDATE members SET paiement = true, caution = true WHERE id = $1",
    [memberId]
  );
}

export interface MemberPatch {
  status?: MemberStatus;
  paiement?: boolean;
  formulaireAdhesion?: boolean;
  caution?: boolean;
  groupeGoogle?: boolean;
  whatsapp?: boolean;
  licenceDemandee?: boolean;
  licencePayee?: boolean;
  justificatif?: boolean;
}

const PATCH_COLUMN: Record<keyof MemberPatch, string> = {
  status: "status",
  paiement: "paiement",
  formulaireAdhesion: "formulaire_adhesion",
  caution: "caution",
  groupeGoogle: "groupe_google",
  whatsapp: "whatsapp",
  licenceDemandee: "licence_demandee",
  licencePayee: "licence_payee",
  justificatif: "justificatif",
};

/** Met à jour un ou plusieurs champs du dossier (coché depuis la vue bureau). */
export async function updateMember(id: string, patch: MemberPatch): Promise<void> {
  await ensureSchema();
  const entries = (Object.entries(patch) as [keyof MemberPatch, MemberPatch[keyof MemberPatch]][]).filter(
    ([, value]) => value !== undefined
  );
  if (entries.length === 0) return;

  const setClauses = entries.map(([key], i) => `${PATCH_COLUMN[key]} = $${i + 2}`);
  const values = entries.map(([, value]) => value);
  await getPool().query(
    `UPDATE members SET ${setClauses.join(", ")} WHERE id = $1`,
    [Number(id), ...values]
  );
}

/** Supprime un dossier adhérent (depuis la vue bureau). */
export async function deleteMember(id: string): Promise<void> {
  await ensureSchema();
  await getPool().query("DELETE FROM members WHERE id = $1", [Number(id)]);
}

/** Ferme la connexion — à appeler en fin d'exécution des scripts CLI (import CSV…). */
export async function closeDb(): Promise<void> {
  if (pool) await pool.end();
}
