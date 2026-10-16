import { Pool } from "pg";

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
 * (scripts/manage-accounts.ts) exécutés avec
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

        -- Adhérents cochés « validé musculation » depuis la vue bureau : leur
        -- décharge et leur certificat médical ont été transmis au club sur une
        -- saison précédente (valables 3 ans), hors formulaire en ligne. Une
        -- ligne par adhérent (nom, prénom, date de naissance), recopiée depuis
        -- adherents_saison au moment où la case est cochée. annee_decharge :
        -- année où la décharge a été signée, la validité court 3 ans.
        CREATE TABLE IF NOT EXISTS musculation_validations_bureau (
          id SERIAL PRIMARY KEY,
          valide_le TIMESTAMPTZ NOT NULL DEFAULT now(),
          valide_par TEXT,
          saison TEXT NOT NULL,
          nom TEXT NOT NULL,
          prenom TEXT NOT NULL,
          name_key TEXT NOT NULL,
          date_naissance TEXT NOT NULL,
          annee_decharge INTEGER,
          UNIQUE (name_key, date_naissance)
        );

        -- Adhérents d'une saison, importés depuis l'onglet « Dossiers
        -- adhésion » du Google Sheets (Bureau → Imports). Sert à vérifier
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

        -- Colonnes du Sheets reprises pour la liste et les indicateurs de la
        -- vue bureau (mêmes calculs que l'onglet « Tableau de bord »). Ajoutées
        -- après coup : vides tant que la saison n'a pas été réimportée.
        ALTER TABLE adherents_saison
          ADD COLUMN IF NOT EXISTS code_postal TEXT,
          ADD COLUMN IF NOT EXISTS telephone TEXT,
          ADD COLUMN IF NOT EXISTS bureau TEXT,
          ADD COLUMN IF NOT EXISTS statut_tarif TEXT,
          ADD COLUMN IF NOT EXISTS reduc_demandee TEXT,
          ADD COLUMN IF NOT EXISTS justif_ok TEXT,
          ADD COLUMN IF NOT EXISTS profil TEXT,
          ADD COLUMN IF NOT EXISTS benevole_tdl TEXT,
          ADD COLUMN IF NOT EXISTS licence_demandee TEXT,
          ADD COLUMN IF NOT EXISTS cotiz_brute_centimes INTEGER,
          ADD COLUMN IF NOT EXISTS reduc_centimes INTEGER,
          ADD COLUMN IF NOT EXISTS trifonction_centimes INTEGER,
          ADD COLUMN IF NOT EXISTS depot_centimes INTEGER,
          ADD COLUMN IF NOT EXISTS part_club_centimes INTEGER;

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

        -- Demandes de connexion à l'espace adhérents par email (lien + code
        -- à 6 chiffres, sans mot de passe). Seules des empreintes du lien et
        -- du code sont stockées : une fuite de la table ne permet pas de se
        -- connecter. Une ligne sert une seule fois et expire au bout de
        -- quelques minutes ; les lignes périmées sont purgées au fil de l'eau.
        CREATE TABLE IF NOT EXISTS connexion_jetons (
          id SERIAL PRIMARY KEY,
          cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
          demande TEXT NOT NULL UNIQUE,
          lien_hash TEXT NOT NULL UNIQUE,
          code_hash TEXT NOT NULL,
          email TEXT NOT NULL,
          nom_affiche TEXT NOT NULL,
          role TEXT NOT NULL,
          suivant TEXT,
          tentatives INTEGER NOT NULL DEFAULT 0,
          expire_le TIMESTAMPTZ NOT NULL,
          utilise_le TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS connexion_jetons_email
          ON connexion_jetons (email, cree_le);

        -- Coups de main proposés par les adhérents (question « Je souhaite
        -- donner un coup de main sur : » du formulaire d'adhésion, onglet
        -- « Réponses » du Google Sheets). Seules les réponses rattachées à un
        -- adhérent de la saison sont gardées, avec les actions cochées (hors
        -- « Je préfère profiter des entraînements ») : un tableau vide = pas
        -- de coup de main. Un import remplace toute la saison.
        CREATE TABLE IF NOT EXISTS coups_de_main (
          saison TEXT NOT NULL,
          name_key TEXT NOT NULL,
          date_naissance TEXT NOT NULL,
          actions TEXT[] NOT NULL DEFAULT '{}',
          importe_le TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (saison, name_key, date_naissance)
        );

        -- Rôles attribués sur le site par le super-administrateur (Bureau →
        -- Rôles et accès) : « bureau » (vue bureau) et « coach ». Une personne
        -- peut cumuler les deux. nom : nom affiché pour une personne qui n'est
        -- pas adhérente (coach extérieur…), sinon celui de son adhésion.
        CREATE TABLE IF NOT EXISTS roles_membres (
          email TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('bureau', 'coach')),
          nom TEXT,
          ajoute_par TEXT NOT NULL,
          ajoute_le TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (email, role)
        );
        -- Fiche publique liée (produit du CMS, section « Bureau … » ou
        -- « Encadrement sportif ») : supprimée avec le rôle.
        ALTER TABLE roles_membres ADD COLUMN IF NOT EXISTS cms_fiche_id TEXT;

        -- Fréquentation de l'espace adhérents, pour la vue bureau : une ligne
        -- par email connecté. Mise à jour à chaque connexion (lien ou code)
        -- et au plus une fois par heure lors d'une visite de l'espace.
        CREATE TABLE IF NOT EXISTS acces_espace (
          email TEXT PRIMARY KEY,
          premier_acces TIMESTAMPTZ NOT NULL DEFAULT now(),
          dernier_acces TIMESTAMPTZ NOT NULL DEFAULT now(),
          connexions INTEGER NOT NULL DEFAULT 0
        );

        -- Liste d'attente de la saison suivante (formulaire de la page
        -- Adhésion, une fois le club complet). Une ligne par email et par
        -- saison : une nouvelle inscription avec le même email met à jour
        -- la ligne existante sans lui faire perdre sa place (cree_le).
        CREATE TABLE IF NOT EXISTS liste_attente (
          id SERIAL PRIMARY KEY,
          cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
          modifie_le TIMESTAMPTZ NOT NULL DEFAULT now(),
          saison TEXT NOT NULL,
          nom TEXT NOT NULL,
          prenom TEXT NOT NULL,
          genre TEXT NOT NULL,
          email TEXT NOT NULL,
          telephone TEXT NOT NULL,
          date_naissance TEXT NOT NULL,
          statut TEXT NOT NULL,
          benevole_tdl BOOLEAN NOT NULL,
          origine TEXT NOT NULL DEFAULT 'site',
          statut_dossier_precedent TEXT
        );
        CREATE UNIQUE INDEX IF NOT EXISTS liste_attente_email
          ON liste_attente (saison, lower(email));
        -- suspect : raison du blocage anti-spam (envoi gardé pour vérification
        -- par le bureau au lieu d'être jeté) ; null = inscription normale.
        -- confirmation_* : email de confirmation envoyé à la personne inscrite.
        ALTER TABLE liste_attente
          ADD COLUMN IF NOT EXISTS suspect TEXT,
          ADD COLUMN IF NOT EXISTS confirmation_statut TEXT,
          ADD COLUMN IF NOT EXISTS confirmation_le TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS confirmation_erreur TEXT;

        -- Migration idempotente des colonnes ajoutées après coup à la table
        -- historique inscriptions (ancien parcours Monetico).
        DO $$
        BEGIN
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

/** Adhérent coché « validé musculation » depuis la vue bureau. */
export interface MusculationValidationRow {
  id: number;
  valide_le: string;
  valide_par: string | null;
  saison: string;
  nom: string;
  prenom: string;
  name_key: string;
  date_naissance: string;
  /** Année de signature de la décharge (validité 3 ans), si renseignée. */
  annee_decharge: number | null;
}

export async function getMusculationValidations(): Promise<MusculationValidationRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query<MusculationValidationRow>(
    "SELECT * FROM musculation_validations_bureau ORDER BY lower(nom), lower(prenom)"
  );
  return rows;
}

export async function deleteMusculationValidation(id: number): Promise<MusculationValidationRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<MusculationValidationRow>(
    "DELETE FROM musculation_validations_bureau WHERE id = $1 RETURNING *",
    [id]
  );
  return rows[0] ?? null;
}

/** Adhérent d'une saison, avec son état vis-à-vis de la salle de musculation. */
export interface AdherentMusculation {
  id: number;
  nom: string;
  prenom: string;
  date_naissance: string;
  /** Coché « validé musculation » par le bureau. */
  valide_bureau: boolean;
  annee_decharge: number | null;
  /** Décharge déposée et validée via le formulaire en ligne (même nom, prénom et date de naissance). */
  decharge_en_ligne: boolean;
}

export async function getAdherentsMusculation(saison: string): Promise<AdherentMusculation[]> {
  await ensureSchema();
  const { rows } = await getPool().query<AdherentMusculation>(
    `
    SELECT a.id, a.nom, a.prenom, a.date_naissance,
           (v.id IS NOT NULL) AS valide_bureau,
           v.annee_decharge,
           EXISTS (
             SELECT 1 FROM musculation_decharges d
             WHERE d.statut = 'valide'
               AND d.date_naissance = a.date_naissance
               AND lower(btrim(d.nom)) = lower(btrim(a.nom))
               AND lower(btrim(d.prenom)) = lower(btrim(a.prenom))
           ) AS decharge_en_ligne
    FROM adherents_saison a
    LEFT JOIN musculation_validations_bureau v
      ON v.name_key = a.name_key AND v.date_naissance = a.date_naissance
    WHERE a.saison = $1
    ORDER BY lower(a.nom), lower(a.prenom)
    `,
    [saison]
  );
  return rows;
}

/**
 * Coche (ou décoche) « validé musculation » pour un adhérent de
 * adherents_saison. Son identité est recopiée : la validation survit aux
 * imports suivants, qui remplacent les lignes de la saison. Recocher (ou
 * changer l'année) met à jour l'année de décharge. Renvoie false si
 * l'adhérent n'existe pas.
 */
export async function setMusculationValidation(
  adherentId: number,
  valide: boolean,
  validePar: string,
  anneeDecharge: number | null = null
): Promise<boolean> {
  await ensureSchema();
  const { rows } = await getPool().query<{ saison: string; nom: string; prenom: string; name_key: string; date_naissance: string }>(
    "SELECT saison, nom, prenom, name_key, date_naissance FROM adherents_saison WHERE id = $1",
    [adherentId]
  );
  const a = rows[0];
  if (!a) return false;
  if (valide) {
    await getPool().query(
      `
      INSERT INTO musculation_validations_bureau (
        valide_par, saison, nom, prenom, name_key, date_naissance, annee_decharge
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (name_key, date_naissance) DO UPDATE SET annee_decharge = EXCLUDED.annee_decharge
      `,
      [validePar, a.saison, a.nom, a.prenom, a.name_key, a.date_naissance, anneeDecharge]
    );
  } else {
    await getPool().query(
      "DELETE FROM musculation_validations_bureau WHERE name_key = $1 AND date_naissance = $2",
      [a.name_key, a.date_naissance]
    );
  }
  return true;
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
  /** Colonnes reprises pour la vue bureau (null si absentes du fichier). */
  codePostal: string | null;
  telephone: string | null;
  bureau: string | null;
  statutTarif: string | null;
  reducDemandee: string | null;
  justifOk: string | null;
  profil: string | null;
  benevoleTdl: string | null;
  licenceDemandee: string | null;
  cotizBruteCentimes: number | null;
  reducCentimes: number | null;
  trifonctionCentimes: number | null;
  depotCentimes: number | null;
  partClubCentimes: number | null;
}

/**
 * Clé de rapprochement par nom (insensible à la casse, aux accents, aux
 * espaces et aux tirets), commune aux adhérents importés, aux décharges
 * musculation et aux validations du bureau.
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
  code_postal: string | null;
  telephone: string | null;
  bureau: string | null;
  statut_tarif: string | null;
  reduc_demandee: string | null;
  justif_ok: string | null;
  profil: string | null;
  benevole_tdl: string | null;
  licence_demandee: string | null;
  cotiz_brute_centimes: number | null;
  reduc_centimes: number | null;
  trifonction_centimes: number | null;
  depot_centimes: number | null;
  part_club_centimes: number | null;
  /** Validé musculation (décharge validée en ligne ou case cochée par le bureau) — calculé, pas stocké. */
  musculation?: boolean;
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
          cotisation_centimes, licence_centimes, statut_dossier,
          code_postal, telephone, bureau, statut_tarif, reduc_demandee, justif_ok,
          profil, benevole_tdl, licence_demandee, cotiz_brute_centimes,
          reduc_centimes, trifonction_centimes, depot_centimes, part_club_centimes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
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
          a.codePostal,
          a.telephone,
          a.bureau,
          a.statutTarif,
          a.reducDemandee,
          a.justifOk,
          a.profil,
          a.benevoleTdl,
          a.licenceDemandee,
          a.cotizBruteCentimes,
          a.reducCentimes,
          a.trifonctionCentimes,
          a.depotCentimes,
          a.partClubCentimes,
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

export async function getAdherentsSaison(saison: string): Promise<AdherentSaisonRow[]> {
  await ensureSchema();
  const [{ rows }, { rows: decharges }, { rows: validationsBureau }] = await Promise.all([
    getPool().query<AdherentSaisonRow>(
      "SELECT * FROM adherents_saison WHERE saison = $1 ORDER BY lower(nom), lower(prenom)",
      [saison]
    ),
    getPool().query<{ nom: string; prenom: string; date_naissance: string }>(
      "SELECT nom, prenom, date_naissance FROM musculation_decharges WHERE statut = 'valide'"
    ),
    getPool().query<{ name_key: string; date_naissance: string }>(
      "SELECT name_key, date_naissance FROM musculation_validations_bureau"
    ),
  ]);
  // Validés musculation = décharge validée en ligne (même rapprochement que
  // findAdherentSaison : nom et prénom dans les deux ordres) ou adhérent coché
  // par le bureau.
  const muscu = new Set([
    ...decharges.flatMap((d) => [
      `${nameKey(d.prenom, d.nom)}|${d.date_naissance}`,
      `${nameKey(d.nom, d.prenom)}|${d.date_naissance}`,
    ]),
    ...validationsBureau.map((v) => `${v.name_key}|${v.date_naissance}`),
  ]);
  return rows.map((a) => ({ ...a, musculation: muscu.has(`${a.name_key}|${a.date_naissance}`) }));
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

export interface BureauCompteurs {
  partenaires: { valides: number; aTraiter: number };
  musculation: { valides: number; aTraiter: number };
  attestations: { valides: number; aTraiter: number };
  acces: { valides: number; aTraiter: number };
  coupsDeMain: { valides: number; aTraiter: number };
  listeAttente: { valides: number; aTraiter: number };
}

/**
 * Compteurs de la page « Vue bureau » : dossiers validés et restant à
 * traiter pour chacune des fonctions autonomes. Pour les attestations,
 * « validé » = attestation envoyée par email, « à traiter » = envoi en
 * échec ou non effectué.
 */
export async function getBureauCompteurs(): Promise<BureauCompteurs> {
  await ensureSchema();
  const { rows } = await getPool().query<{ fonction: keyof BureauCompteurs; valides: number; a_traiter: number }>(
    `
    SELECT 'partenaires' AS fonction,
           count(*) FILTER (WHERE statut = 'ajoute')::int AS valides,
           count(*) FILTER (WHERE statut <> 'ajoute')::int AS a_traiter
    FROM partner_signups
    UNION ALL
    -- Validés musculation = décharges validées en ligne + adhérents cochés
    -- par le bureau (dossiers des saisons précédentes).
    SELECT 'musculation',
           (count(*) FILTER (WHERE statut = 'valide')
             + (SELECT count(*) FROM musculation_validations_bureau))::int,
           count(*) FILTER (WHERE statut <> 'valide')::int
    FROM musculation_decharges
    UNION ALL
    SELECT 'attestations',
           count(*) FILTER (WHERE envoi_statut = 'envoyee')::int,
           count(*) FILTER (WHERE envoi_statut IS DISTINCT FROM 'envoyee')::int
    FROM attestations
    UNION ALL
    SELECT 'acces', count(*)::int, 0 FROM acces_espace
    UNION ALL
    -- Adhérents prêts à donner un coup de main, saison la plus récente.
    SELECT 'coupsDeMain', count(*) FILTER (WHERE cardinality(c.actions) > 0)::int, 0
    FROM coups_de_main c
    WHERE c.saison = (SELECT max(saison) FROM adherents_saison)
      AND EXISTS (
        SELECT 1 FROM adherents_saison a
        WHERE a.saison = c.saison AND a.name_key = c.name_key AND a.date_naissance = c.date_naissance
          AND lower(btrim(a.statut_dossier)) IN ('payé', 'paye')
      )
    UNION ALL
    -- Inscrits sur la liste d'attente de la saison la plus lointaine
    -- (« à traiter » = envois suspects à vérifier).
    SELECT 'listeAttente', count(*) FILTER (WHERE suspect IS NULL)::int, count(*) FILTER (WHERE suspect IS NOT NULL)::int
    FROM liste_attente
    WHERE saison = (SELECT max(saison) FROM liste_attente)
    `
  );
  const compteurs: BureauCompteurs = {
    partenaires: { valides: 0, aTraiter: 0 },
    musculation: { valides: 0, aTraiter: 0 },
    attestations: { valides: 0, aTraiter: 0 },
    acces: { valides: 0, aTraiter: 0 },
    coupsDeMain: { valides: 0, aTraiter: 0 },
    listeAttente: { valides: 0, aTraiter: 0 },
  };
  for (const r of rows) compteurs[r.fonction] = { valides: r.valides, aTraiter: r.a_traiter };
  return compteurs;
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

/** Adhérent de la saison dont l'email du dossier correspond (casse et espaces ignorés). */
export async function findAdherentSaisonByEmail(saison: string, email: string): Promise<AdherentSaisonRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<AdherentSaisonRow>(
    `
    SELECT * FROM adherents_saison
    WHERE saison = $1 AND lower(btrim(email)) = lower(btrim($2))
    ORDER BY id
    LIMIT 1
    `,
    [saison, email]
  );
  return rows[0] ?? null;
}

/**
 * Adhésion de la saison la plus récente rattachée à cet email (celui de la
 * session), avec le statut « validé musculation » calculé comme dans la vue
 * bureau. Null si l'email ne correspond à aucun adhérent de la saison.
 */
export async function getAdhesionByEmail(email: string): Promise<AdherentSaisonRow | null> {
  const saison = await getLatestSaison();
  if (!saison) return null;
  const adherent = await findAdherentSaisonByEmail(saison, email);
  if (!adherent) return null;
  const [{ rows: bureau }, { rows: decharges }] = await Promise.all([
    getPool().query(
      "SELECT 1 FROM musculation_validations_bureau WHERE name_key = $1 AND date_naissance = $2",
      [adherent.name_key, adherent.date_naissance]
    ),
    getPool().query<{ nom: string; prenom: string }>(
      "SELECT nom, prenom FROM musculation_decharges WHERE statut = 'valide' AND date_naissance = $1",
      [adherent.date_naissance]
    ),
  ]);
  // Même rapprochement que getAdherentsSaison : nom et prénom dans les deux ordres.
  const musculation =
    bureau.length > 0 ||
    decharges.some((d) => [nameKey(d.prenom, d.nom), nameKey(d.nom, d.prenom)].includes(adherent.name_key));
  return { ...adherent, musculation };
}

/** Connexion réussie à l'espace adhérents (lien ou code). */
export async function recordConnexionEspace(email: string): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `
    INSERT INTO acces_espace (email, connexions) VALUES ($1, 1)
    ON CONFLICT (email) DO UPDATE
      SET dernier_acces = now(), connexions = acces_espace.connexions + 1
    `,
    [email]
  );
}

/**
 * Visite de l'espace par un adhérent déjà connecté. Au plus une écriture par
 * heure et par adhérent : la date de dernier accès n'a pas besoin d'être plus
 * précise, et la plupart des pages vues ne touchent ainsi pas la base.
 */
export async function recordVisiteEspace(email: string): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `
    INSERT INTO acces_espace (email) VALUES ($1)
    ON CONFLICT (email) DO UPDATE SET dernier_acces = now()
      WHERE acces_espace.dernier_acces < now() - interval '1 hour'
    `,
    [email]
  );
}

export interface AccesEspaceRow {
  email: string;
  nom: string | null;
  prenom: string | null;
  premier_acces: string;
  dernier_acces: string;
  connexions: number;
}

/** Fréquentation de l'espace, avec nom et prénom de l'adhésion la plus récente quand l'email y figure. */
export async function getAccesEspace(): Promise<AccesEspaceRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query<AccesEspaceRow>(
    `
    SELECT e.email, a.nom, a.prenom, e.premier_acces, e.dernier_acces, e.connexions
    FROM acces_espace e
    LEFT JOIN LATERAL (
      SELECT nom, prenom FROM adherents_saison
      WHERE lower(btrim(email)) = e.email
      ORDER BY saison DESC, id
      LIMIT 1
    ) a ON true
    ORDER BY e.dernier_acces DESC
    `
  );
  return rows;
}

export interface CoupDeMainReponse {
  nom: string;
  prenom: string;
  dateNaissance: string;
  actions: string[];
}

/**
 * Remplace les coups de main de la saison par les réponses importées. Chaque
 * réponse est rattachée à un adhérent de la saison dont le dossier est payé,
 * par nom, prénom (dans les deux ordres) et date de naissance ; les autres
 * (non-adhérents, dossier non réglé, orthographe différente…) sont écartées
 * et renvoyées pour le compte rendu.
 */
export async function replaceCoupsDeMain(
  saison: string,
  reponses: CoupDeMainReponse[]
): Promise<{ importees: number; nonRetrouvees: string[] }> {
  await ensureSchema();
  const { rows: adherents } = await getPool().query<{ name_key: string; date_naissance: string }>(
    `SELECT name_key, date_naissance FROM adherents_saison
     WHERE saison = $1 AND lower(btrim(statut_dossier)) IN ('payé', 'paye')`,
    [saison]
  );
  const connus = new Set(adherents.map((a) => `${a.name_key}|${a.date_naissance}`));
  const retenues = new Map<string, { nameKey: string; dateNaissance: string; actions: string[] }>();
  const nonRetrouvees: string[] = [];
  for (const r of reponses) {
    const nameKeyTrouvee = [nameKey(r.prenom, r.nom), nameKey(r.nom, r.prenom)].find((k) =>
      connus.has(`${k}|${r.dateNaissance}`)
    );
    if (!nameKeyTrouvee) {
      nonRetrouvees.push(`${r.prenom} ${r.nom}`.trim());
      continue;
    }
    // Plusieurs réponses pour un même adhérent : la dernière du fichier l'emporte.
    retenues.set(`${nameKeyTrouvee}|${r.dateNaissance}`, {
      nameKey: nameKeyTrouvee,
      dateNaissance: r.dateNaissance,
      actions: r.actions,
    });
  }
  // Rien de rattaché (mauvais fichier, liste des adhérents pas encore
  // importée) : on garde les données en place plutôt que de vider la saison.
  if (retenues.size === 0) return { importees: 0, nonRetrouvees };

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM coups_de_main WHERE saison = $1", [saison]);
    for (const r of retenues.values()) {
      await client.query(
        "INSERT INTO coups_de_main (saison, name_key, date_naissance, actions) VALUES ($1, $2, $3, $4)",
        [saison, r.nameKey, r.dateNaissance, r.actions]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  return { importees: retenues.size, nonRetrouvees };
}

/** Réponses « coups de main » importées, par saison (page Bureau → Imports). */
export async function getCoupsDeMainStats(): Promise<
  { saison: string; total: number; motives: number; importe_le: string }[]
> {
  await ensureSchema();
  const { rows } = await getPool().query(
    `
    SELECT saison,
           count(*)::int AS total,
           count(*) FILTER (WHERE cardinality(actions) > 0)::int AS motives,
           max(importe_le) AS importe_le
    FROM coups_de_main
    GROUP BY saison
    ORDER BY saison DESC
    `
  );
  return rows;
}

export interface CoupDeMainAdherentRow {
  id: number;
  nom: string;
  prenom: string;
  sexe: string | null;
  date_naissance: string;
  statut_tarif: string | null;
  profil: string | null;
  /** null : aucune réponse importée pour cet adhérent. */
  actions: string[] | null;
  importe_le: string | null;
}

/** Adhérents de la saison au dossier payé, avec leurs coups de main (null si aucune réponse rattachée). */
export async function getCoupsDeMainSaison(saison: string): Promise<CoupDeMainAdherentRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query<CoupDeMainAdherentRow>(
    `
    SELECT a.id, a.nom, a.prenom, a.sexe, a.date_naissance, a.statut_tarif, a.profil,
           c.actions, c.importe_le
    FROM adherents_saison a
    LEFT JOIN coups_de_main c
      ON c.saison = a.saison AND c.name_key = a.name_key AND c.date_naissance = a.date_naissance
    WHERE a.saison = $1 AND lower(btrim(a.statut_dossier)) IN ('payé', 'paye')
    ORDER BY lower(a.nom), lower(a.prenom)
    `,
    [saison]
  );
  return rows;
}

export type MembreRole = "bureau" | "coach";

/** Rôles attribués sur le site à cet email, et le nom saisi pour lui s'il y en a un. */
export async function getRolesMembre(email: string): Promise<{ roles: MembreRole[]; nom: string | null }> {
  await ensureSchema();
  const { rows } = await getPool().query<{ role: MembreRole; nom: string | null }>(
    "SELECT role, nom FROM roles_membres WHERE email = $1 ORDER BY role",
    [email]
  );
  return { roles: rows.map((r) => r.role), nom: rows.find((r) => r.nom)?.nom ?? null };
}

/** L'email figure-t-il parmi les adhérents de la saison la plus récente ? */
export async function isAdherentSaisonCourante(email: string): Promise<boolean> {
  await ensureSchema();
  const { rows } = await getPool().query(
    `
    SELECT 1 FROM adherents_saison
    WHERE lower(btrim(email)) = lower(btrim($1))
      AND saison = (SELECT max(saison) FROM adherents_saison)
    LIMIT 1
    `,
    [email]
  );
  return rows.length > 0;
}

export interface RoleMembreRow {
  email: string;
  role: MembreRole;
  cms_fiche_id: string | null;
  /** Nom de l'adhésion la plus récente si l'email y figure, sinon le nom saisi. */
  nom: string | null;
  adherent: boolean;
  ajoute_par: string;
  ajoute_le: string;
}

export async function listRolesMembres(): Promise<RoleMembreRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query<RoleMembreRow>(
    `
    SELECT r.email, r.role, r.cms_fiche_id, COALESCE(a.prenom || ' ' || a.nom, r.nom) AS nom,
           (a.nom IS NOT NULL) AS adherent, r.ajoute_par, r.ajoute_le
    FROM roles_membres r
    LEFT JOIN LATERAL (
      SELECT nom, prenom FROM adherents_saison
      WHERE lower(btrim(email)) = r.email
        AND saison = (SELECT max(saison) FROM adherents_saison)
      LIMIT 1
    ) a ON true
    ORDER BY r.role, lower(COALESCE(a.nom, r.nom, r.email))
    `
  );
  return rows;
}

/** Attribue un rôle (sans effet s'il l'est déjà, sauf mise à jour du nom saisi). */
export async function addRoleMembre(email: string, role: MembreRole, nom: string | null, ajoutePar: string): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `
    INSERT INTO roles_membres (email, role, nom, ajoute_par) VALUES ($1, $2, $3, $4)
    ON CONFLICT (email, role) DO UPDATE SET nom = COALESCE(EXCLUDED.nom, roles_membres.nom)
    `,
    [email, role, nom, ajoutePar]
  );
}

/** Retire le rôle et renvoie l'identifiant de la fiche CMS qui lui était liée. */
export async function removeRoleMembre(email: string, role: MembreRole): Promise<{ cmsFicheId: string | null } | null> {
  await ensureSchema();
  const { rows } = await getPool().query<{ cms_fiche_id: string | null }>(
    "DELETE FROM roles_membres WHERE email = $1 AND role = $2 RETURNING cms_fiche_id",
    [email, role]
  );
  return rows[0] ? { cmsFicheId: rows[0].cms_fiche_id } : null;
}

export async function setRoleFiche(email: string, role: MembreRole, cmsFicheId: string | null): Promise<void> {
  await ensureSchema();
  await getPool().query("UPDATE roles_membres SET cms_fiche_id = $3 WHERE email = $1 AND role = $2", [
    email,
    role,
    cmsFicheId,
  ]);
}

export interface ConnexionJetonRow {
  id: number;
  demande: string;
  code_hash: string;
  email: string;
  nom_affiche: string;
  role: "member" | "admin";
  suivant: string | null;
}

/** Demandes de connexion récentes pour cet email (limite d'envoi), et la plus récente. */
export async function getRecentConnexionJetons(
  email: string,
  minutes: number
): Promise<{ count: number; derniereDemande: string | null }> {
  await ensureSchema();
  const { rows } = await getPool().query<{ demande: string }>(
    `
    SELECT demande FROM connexion_jetons
    WHERE email = $1 AND cree_le > now() - make_interval(mins => $2)
    ORDER BY cree_le DESC
    `,
    [email, minutes]
  );
  return { count: rows.length, derniereDemande: rows[0]?.demande ?? null };
}

export async function insertConnexionJeton(j: {
  demande: string;
  lienHash: string;
  codeHash: string;
  email: string;
  nomAffiche: string;
  role: "member" | "admin";
  suivant: string | null;
  minutes: number;
}): Promise<void> {
  await ensureSchema();
  const pool = getPool();
  // Purge des demandes périmées depuis plus d'un jour : la table reste minuscule.
  await pool.query("DELETE FROM connexion_jetons WHERE expire_le < now() - interval '1 day'");
  await pool.query(
    `
    INSERT INTO connexion_jetons (demande, lien_hash, code_hash, email, nom_affiche, role, suivant, expire_le)
    VALUES ($1, $2, $3, $4, $5, $6, $7, now() + make_interval(mins => $8))
    `,
    [j.demande, j.lienHash, j.codeHash, j.email, j.nomAffiche, j.role, j.suivant, j.minutes]
  );
}

/** Consomme une demande par son lien : une seule fois, et seulement avant expiration. */
export async function consumeConnexionLien(lienHash: string): Promise<ConnexionJetonRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query<ConnexionJetonRow>(
    `
    UPDATE connexion_jetons SET utilise_le = now()
    WHERE lien_hash = $1 AND utilise_le IS NULL AND expire_le > now()
    RETURNING id, demande, code_hash, email, nom_affiche, role, suivant
    `,
    [lienHash]
  );
  return rows[0] ?? null;
}

/**
 * Compte une tentative de code sur toutes les demandes encore utilisables
 * (non consommées, non expirées, sous le nombre maximal d'essais) de l'email
 * auquel appartient `demande`, et les renvoie. Le code reçu dans un email
 * précédent reste ainsi valable si l'adhérent en a redemandé un entre-temps.
 */
export async function recordConnexionCodeAttempt(
  demande: string,
  maxTentatives: number
): Promise<ConnexionJetonRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query<ConnexionJetonRow>(
    `
    UPDATE connexion_jetons SET tentatives = tentatives + 1
    WHERE email = (SELECT email FROM connexion_jetons WHERE demande = $1)
      AND utilise_le IS NULL AND expire_le > now() AND tentatives < $2
    RETURNING id, demande, code_hash, email, nom_affiche, role, suivant
    `,
    [demande, maxTentatives]
  );
  return rows;
}

/** Marque la demande comme utilisée ; false si elle l'a déjà été entre-temps. */
export async function markConnexionJetonUsed(id: number): Promise<boolean> {
  await ensureSchema();
  const { rowCount } = await getPool().query(
    "UPDATE connexion_jetons SET utilise_le = now() WHERE id = $1 AND utilise_le IS NULL",
    [id]
  );
  return (rowCount ?? 0) > 0;
}

/** Ferme la connexion — à appeler en fin d'exécution des scripts CLI. */
export interface ListeAttenteRow {
  id: number;
  cree_le: string;
  saison: string;
  nom: string;
  prenom: string;
  genre: string;
  email: string;
  telephone: string;
  /** YYYY-MM-DD */
  date_naissance: string;
  statut: string;
  benevole_tdl: boolean;
  /** "site" (formulaire de la page Adhésion) ou "gform-2026-2027" (repris du Google Form). */
  origine: string;
  /** Pour les inscrits repris du Google Form : statut de leur dossier 2026/2027 (Refusé, Abandonné…). */
  statut_dossier_precedent: string | null;
  /** Raison du blocage anti-spam, null pour une inscription normale. */
  suspect: string | null;
  confirmation_statut: "envoyee" | "ignoree" | "echec" | null;
  confirmation_le: string | null;
  confirmation_erreur: string | null;
}

export type NouvelleListeAttente = Omit<
  ListeAttenteRow,
  | "id"
  | "cree_le"
  | "origine"
  | "statut_dossier_precedent"
  | "suspect"
  | "confirmation_statut"
  | "confirmation_le"
  | "confirmation_erreur"
>;

/**
 * Inscription (ou mise à jour, même email) sur la liste d'attente. Une
 * réinscription garde la date d'origine, donc le rang dans la liste, et
 * lève un éventuel marquage suspect. Renvoie l'identifiant de la ligne.
 */
export async function upsertListeAttente(p: NouvelleListeAttente): Promise<number> {
  await ensureSchema();
  const { rows } = await getPool().query<{ id: number }>(
    `
    INSERT INTO liste_attente
      (saison, nom, prenom, genre, email, telephone, date_naissance, statut, benevole_tdl)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (saison, lower(email)) DO UPDATE SET
      suspect = NULL,
      nom = EXCLUDED.nom,
      prenom = EXCLUDED.prenom,
      genre = EXCLUDED.genre,
      email = EXCLUDED.email,
      telephone = EXCLUDED.telephone,
      date_naissance = EXCLUDED.date_naissance,
      statut = EXCLUDED.statut,
      benevole_tdl = EXCLUDED.benevole_tdl,
      modifie_le = now()
    RETURNING id
    `,
    [p.saison, p.nom, p.prenom, p.genre, p.email, p.telephone, p.date_naissance, p.statut, p.benevole_tdl]
  );
  return rows[0].id;
}

/**
 * Envoi bloqué par l'anti-spam, gardé pour que le bureau puisse vérifier
 * (un humain peut s'y faire prendre). N'écrase jamais une inscription
 * existante avec le même email : un robot pourrait réutiliser l'adresse
 * d'une vraie personne.
 */
export async function insertListeAttenteSuspecte(p: NouvelleListeAttente, raison: string): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `
    INSERT INTO liste_attente
      (saison, nom, prenom, genre, email, telephone, date_naissance, statut, benevole_tdl, suspect)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (saison, lower(email)) DO NOTHING
    `,
    [p.saison, p.nom, p.prenom, p.genre, p.email, p.telephone, p.date_naissance, p.statut, p.benevole_tdl, raison]
  );
}

export async function recordListeAttenteConfirmation(
  id: number,
  statut: "envoyee" | "ignoree" | "echec",
  erreur: string | null
): Promise<void> {
  await ensureSchema();
  await getPool().query(
    "UPDATE liste_attente SET confirmation_statut = $2, confirmation_erreur = $3, confirmation_le = now() WHERE id = $1",
    [id, statut, erreur]
  );
}

/** Inscrits d'une saison, par ordre d'arrivée. */
export async function getListeAttente(saison: string): Promise<ListeAttenteRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query<ListeAttenteRow>(
    `SELECT id, cree_le, saison, nom, prenom, genre, email, telephone, date_naissance, statut,
            benevole_tdl, origine, statut_dossier_precedent, suspect,
            confirmation_statut, confirmation_le, confirmation_erreur
     FROM liste_attente WHERE saison = $1 ORDER BY cree_le, id`,
    [saison]
  );
  return rows;
}

export async function deleteListeAttente(id: number): Promise<boolean> {
  await ensureSchema();
  const { rowCount } = await getPool().query("DELETE FROM liste_attente WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}

export async function closeDb(): Promise<void> {
  if (pool) await pool.end();
}
