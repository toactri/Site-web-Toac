# Site web du TOAC Triathlon

Refonte complète du site du TOAC Triathlon (Toulouse), avec Next.js (App Router) + Tailwind CSS,
et un espace adhérents protégé côté serveur.

## 1. Lancer le projet en local

```bash
npm install
cp .env.example .env.local   # puis renseignez au moins SESSION_SECRET (voir plus bas)
npm run dev
```

Le site est disponible sur http://localhost:3000.

Générer un `SESSION_SECRET` aléatoire :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Compte de démonstration (espace adhérents)

Tant que vous n'avez pas importé vos propres comptes (voir § 4), deux comptes de démo sont disponibles
(définis dans `src/data/accounts.sample.json`, données factices) :

| Identifiant | Mot de passe      | Rôle   |
| ----------- | ----------------- | ------ |
| `demo`      | `toac-demo-2026`  | membre |
| `bureau`    | `toac-admin-2026` | admin (vue bureau, tous les dossiers) |

⚠️ Changez ces mots de passe / remplacez ces comptes avant la mise en production.

## 2. Déployer sur Vercel

1. Poussez ce dépôt sur GitHub.
2. Sur [vercel.com](https://vercel.com), importez le dépôt (le framework Next.js est détecté automatiquement).
3. Dans **Settings → Environment Variables**, renseignez toutes les variables listées dans `.env.example`
   (`SESSION_SECRET`, et éventuellement `BREVO_API_KEY` / `BREVO_FROM_EMAIL`).
4. Déployez. Le plan gratuit ("Hobby") de Vercel suffit pour ce site.

Important : `src/data/members.json` et `src/data/accounts.json` (les vraies données adhérents) sont
ignorés par git — ils ne seront donc **pas** présents sur Vercel après un déploiement via git. Deux options :

- **Solution simple (club de cette taille)** : importez le CSV et générez les comptes en local (§ 4), puis
  committez ces fichiers dans un **dépôt privé** uniquement si vous acceptez ce compromis, en connaissance du
  risque RGPD si le dépôt venait à être rendu public un jour.
- **Solution recommandée** : gardez le dépôt public/sans données réelles, et à la place, uploadez
  `members.json` / `accounts.json` directement depuis l'onglet **Deployments → Source** de Vercel, ou migrez
  ces deux fichiers vers un stockage clé-valeur (Vercel KV) le jour où le club voudra automatiser les mises à
  jour sans repasser par un déploiement.

## 3. Remplacer les placeholders

| Placeholder | Emplacement | Action |
| --- | --- | --- |
| ~~`LOGO_TOAC`~~ | `public/logo-toac.png` | ✅ Fait — logo officiel intégré dans la Navbar et le Footer. |
| Photos (📷) | `src/components/ImagePlaceholder.tsx`, utilisé sur toutes les pages | Remplacer chaque `<ImagePlaceholder>` par un `<Image>` `next/image` pointant vers les vraies photos du club. |
| `URL_INSCRIPTION_TDL` | `src/app/triathlons-du-lauragais/page.tsx` (lien "S'inscrire à la course") | Remplacer le `href="#"` par l'URL d'inscription officielle. |
| `LIEN_COMMANDE_TENUES` | `src/app/le-club/vie-du-club/page.tsx` | Remplacer par le lien réel de commande des tenues. |
| Documents PDF | `src/app/espace-adherents/documents/page.tsx` | Remplacer les `href="#"` par les vrais fichiers (à héberger dans `public/documents/` par ex.). |
| Coordonnées des lieux | `src/content/lieux.ts` | Les latitudes/longitudes sont des approximations ; à vérifier/ajuster précisément si besoin. |
| `DATABASE_URL` | `.env` (Vercel ou local) | Voir § 5bis. |
| `BREVO_API_KEY` | `.env` | Voir § 6. |

## 4. Importer les adhérents (CSV) et gérer les comptes

Les dossiers adhérents vivent dans la base de données du site (table `members`, voir § 5bis) — jamais
dans le dépôt git. `src/data/accounts.sample.json` ne contient que des données factices (comptes de
démo), utilisées tant que `src/data/accounts.json` n'existe pas.

### Importer le Google Sheets "Dossiers-2025-2026" (en local, jamais via git)

Cette commande écrit directement dans la base de données de production : les données personnelles
réelles ne transitent jamais par le dépôt.

1. Sur votre ordinateur, clonez le dépôt, `npm install`, puis copiez dans `.env.local` la **même**
   valeur de `DATABASE_URL` que celle configurée sur Vercel (Settings → Environment Variables).
2. Dans Google Sheets : `Fichier → Télécharger → Valeurs séparées par des virgules (.csv)`.
3. Lancez :
   ```bash
   npm run import-csv -- chemin/vers/export.csv
   ```
   Chaque ligne est identifiée par le nom + prénom (l'export du club n'a pas de colonne email) :
   relancer la commande après une mise à jour du Sheets met à jour les dossiers existants au lieu de
   les dupliquer. Les lignes de total/pourcentage en haut de l'export sont ignorées automatiquement.

Colonnes attendues (l'ordre n'importe pas, en-têtes insensibles à la casse/accents) : `Nom`, `Prénom`,
`statut`, `Pay asso` (paiement cotisation), `Formulaire adhésion`, `justif` (justificatif tarif réduit),
`Chèque` (→ caution), `GG Group`, `Whatsapp`, `Licence demandée`, `Licence payée` (valeurs `Oui`/`Non`).
`Email` est optionnel.

Une fois importés, les dossiers apparaissent dans **Espace Adhérents → Bureau → Dossiers adhérents**, où
chaque case (paiement, caution, groupe Google, WhatsApp, licence, justificatif…) peut être cochée/décochée
directement sur le site — les nouvelles demandes d'adhésion en ligne (page **Nous rejoindre**) y
apparaissent aussi automatiquement, sans réimport, et sont rapprochées du bon dossier par le nom.

### Gérer les comptes de connexion

```bash
npm run accounts -- list
npm run accounts -- add jean.dupont motdepasse "Jean Dupont" member 1
npm run accounts -- passwd jean.dupont nouveaumotdepasse
npm run accounts -- remove jean.dupont

# Génère automatiquement un compte (identifiant + mot de passe aléatoire)
# pour chaque adhérent de la base qui n'en a pas encore :
npm run accounts -- bulk-from-members
```

Le `[memberId]` passé à `add`/généré par `bulk-from-members` est l'identifiant numérique du dossier dans
la base (visible dans **Bureau → Dossiers adhérents**). `bulk-from-members` a aussi besoin de
`DATABASE_URL` dans `.env.local` (voir ci-dessus). Il affiche en clair, une seule fois dans le terminal,
les identifiants générés à transmettre aux adhérents (rien n'est jamais stocké en clair : seul le hash
bcrypt est écrit dans `accounts.json`).

## 5. Paiement en ligne (retiré)

Le parcours d'adhésion + paiement Monetico a été retiré du site en octobre 2026 : l'inscription passe par
un Google Form et le paiement par l'espace FFTRI. Le code complet reste récupérable dans l'historique git
(commit `c2b5880`, dernier état avant suppression) ; voir aussi le document d'archive « Paiement en ligne —
archive 2026 et réflexion 2027 ».

### Justificatif tarif réduit (Vercel Blob)

Le fichier uploadé (carte étudiant, attestation Pôle emploi, badge Airbus…) est stocké sur Vercel Blob et
lié au dossier adhérent.

1. Dans votre projet Vercel → onglet **Storage** → **Create Database** → **Blob** (offre gratuite).
2. Vercel ajoute automatiquement `BLOB_READ_WRITE_TOKEN` à votre projet.

Sans cette variable, le formulaire fonctionne quand même : le justificatif n'est simplement pas conservé
(seule la case "tarif réduit demandé" est enregistrée).

## 5bis. Base de données — commandes, adhésions & dossiers

Le site enregistre automatiquement, dans une vraie base de données, ce qui demandait auparavant une
manipulation manuelle :

- **Les commandes Monetico** : à chaque paiement, Monetico notifie le site en arrière-plan
  (`/api/monetico/retour`) ; cette notification est désormais enregistrée dans une table `commandes`
  au lieu de simplement être journalisée. Fini le fichier Excel à ouvrir/copier-coller depuis l'email
  Monetico : tout est consultable dans **Espace Adhérents → Bureau → Commandes Monetico**.
- **Les demandes d'adhésion** : la page **Nous rejoindre** propose désormais un formulaire d'adhésion
  directement sur le site (à la place du Google Form externe). Chaque envoi est enregistré dans une
  table `inscriptions`, consultable dans **Espace Adhérents → Bureau → Demandes d'adhésion**.
- **Les dossiers adhérents** : table `members`, alimentée par l'import CSV (§ 4) et automatiquement
  complétée par chaque nouvelle demande d'adhésion en ligne. Consultable et **modifiable** (cases à
  cocher) dans **Espace Adhérents → Bureau → Dossiers adhérents**.

### Mise en place (5 minutes, gratuit)

1. Sur [vercel.com](https://vercel.com), dans votre projet → onglet **Storage** → **Create Database** →
   choisissez un Postgres (Neon, offre gratuite). Vercel y ajoute automatiquement une variable
   `DATABASE_URL` (ou `POSTGRES_URL`) à votre projet.
   - Alternative sans Vercel : créez un projet gratuit sur [neon.tech](https://neon.tech) ou
     [supabase.com](https://supabase.com) et copiez la chaîne de connexion Postgres fournie.
2. Renseignez `DATABASE_URL` dans vos variables d'environnement (Vercel : **Settings → Environment
   Variables** ; en local : `.env.local`).
3. C'est tout : les tables (`commandes`, `inscriptions`, `members`) sont créées automatiquement au
   premier appel, aucune migration à lancer à la main.

Tant que `DATABASE_URL` n'est pas configurée, le site continue de fonctionner normalement (paiement,
formulaire d'adhésion), mais les pages **Bureau → Commandes** / **Bureau → Demandes d'adhésion** /
**Bureau → Dossiers adhérents** affichent un message d'installation au lieu du tableau, et rien n'est
conservé.

## 6. Formulaire de contact (emails)

Sans configuration, les messages du formulaire de contact sont simplement journalisés côté serveur (mode
démo, visible dans les logs Vercel). Pour un envoi réel par email :

1. Dans votre compte [Brevo](https://www.brevo.com), créez une clé API (**SMTP & API → API Keys**).
2. Vérifiez un expéditeur (**Senders, Domains & Dedicated IPs → Senders**) — l'adresse utilisée dans
   `BREVO_FROM_EMAIL` doit être un expéditeur validé, sinon Brevo refuse l'envoi.
3. Renseignez `BREVO_API_KEY` et `BREVO_FROM_EMAIL` dans les variables d'environnement Vercel.

## 6bis. Décharge musculation

La page **Entraînements → Musculation** (`/musculation`) propose un formulaire qui reprend
les champs de la décharge papier du TOAC Omnisports (nom, prénom, adresse, autorisation parentale si
mineur…), avec upload du certificat médical et d'une image de signature.

Parcours :

1. À l'envoi, le serveur génère **un seul PDF** : la décharge papier reconstituée (en-tête logos, champs
   du formulaire, signature uploadée incrustée) en page 1, puis le certificat médical transmis en pages
   suivantes — un certificat en image devient une page, un certificat déjà en PDF voit ses pages
   reprises. Le bloc « autorisation parentale » n'apparaît, dans le formulaire comme dans le PDF, que si
   la date de naissance saisie correspond à une personne de moins de 18 ans (calcul refait côté serveur,
   `src/lib/age.ts`). Ce PDF et le certificat brut sont déposés sur **Vercel Blob** (§ 5 ci-dessus —
   nommage `nom-prenom-decharge.pdf` / `nom-prenom-certif.<ext>`), et un dossier est enregistré en base
   (table `musculation_decharges`, statut `en_attente`).
   L'en-tête vient de `public/images/decharge-entete.png` (voir `public/images/README.txt`) ; si ce
   fichier manque, le PDF sort sans logos plutôt que d'échouer.
2. L'adhérent est redirigé vers une page de relecture (`/musculation/valider/<token>`) qui affiche le PDF
   dans une iframe, puis « Valider ce document ». À la validation le dossier passe au statut `valide`, la
   page confirme l'envoi, et **un email part automatiquement** vers les adresses de
   `MUSCULATION_NOTIFICATION_EMAILS` (séparées par des virgules, via Brevo) avec deux boutons — voir et
   télécharger le document. Un échec d'envoi est journalisé sans faire échouer la validation. Rien n'est
   considéré comme officiellement transmis avant cette confirmation.
3. Le bureau retrouve tous les dossiers (validés ou non) dans **Espace Adhérents → Bureau → Décharges
   musculation** (`/espace-adherents/bureau/musculation`, réservé aux comptes `admin`) : liens pour
   voir/télécharger chaque document, et un bouton pour copier le lien de relecture (utile pour le
   renvoyer à un adhérent, ou le partager avec le responsable du pôle sport).

Variables utilisées : `DATABASE_URL` (§ 5bis) et `BLOB_READ_WRITE_TOKEN` (§ 5), déjà configurées pour le
reste du site, plus `MUSCULATION_NOTIFICATION_EMAILS` et `BREVO_API_KEY` pour la notification par email.
Sans destinataire ou sans clé Brevo, la validation fonctionne et l'envoi est simplement journalisé.

### Accès aux documents : le store Blob est privé

Le store Blob du club est en **accès privé**. Les fichiers y sont déposés avec `access: "private"` et
n'ont **aucune URL publique** : c'est voulu, un certificat médical est une donnée de santé et une URL
publique Vercel Blob reste lisible par quiconque met la main dessus, sans possibilité de révocation.

Conséquences pour le code :

- Les colonnes `decharge_url`, `certificat_url` et `justificatif_url` contiennent désormais un **chemin
  dans le store** (ex. `musculation/dupont-jean-decharge-1234.pdf`), pas une URL. Les noms de colonnes
  datent d'avant et n'ont pas été renommés.
- Les fichiers ne sortent que par **`GET /api/documents?path=<chemin>`**, qui relit le blob côté serveur
  et le renvoie en streaming après contrôle d'accès : compte `admin` connecté, ou `&token=<jeton du
  dossier>` — le jeton de la page de relecture, qui n'ouvre que les deux fichiers de son propre dossier.
- L'accès public/privé est fixé **à la création du store** côté Vercel et n'est pas modifiable ensuite.
  Un `put(..., { access: "public" })` sur ce store échoue avec « Cannot use public access on a private
  store » — c'était la cause de l'échec des premières décharges musculation.

### Si l'upload échoue

Le message « stockage des documents pas encore configuré » ne s'affiche plus que lorsqu'**aucun jeton
Blob n'atteint la fonction** ; toute autre erreur Blob (store privé, jeton invalide, store suspendu…)
est journalisée telle quelle dans les logs Vercel et renvoie « Échec de l'envoi des documents ». Deux
façons de voir l'état réel du serveur, identiques dans leur contenu : les variables réellement
injectées, la plateforme détectée, la branche et le commit servis, et un test d'écriture qui renvoie
l'erreur brute de Vercel Blob.

- **Page** : Espace Adhérents → Bureau → Diagnostic serveur
  (`/espace-adherents/bureau/diagnostic`, comptes `admin` uniquement).
- **JSON, sans compte** : `GET /api/diagnostic?key=<valeur de DIAGNOSTIC_KEY>` (ajoutez `&test=blob`
  pour lancer le test d'écriture). Définissez au préalable `DIAGNOSTIC_KEY` (chaîne aléatoire) dans les
  variables d'environnement du projet, puis redéployez — aucune clé n'est inscrite dans le code, le
  dépôt étant public. **Ce réglage est déjà le premier test** : sans clé valide la route répond `403`
  avec `diagnosticKeyPresent`, qui dit si la variable est arrivée jusqu'à la fonction. Route de
  dépannage temporaire, à supprimer une fois le problème réglé ; elle ne renvoie jamais aucune valeur
  de variable.

Lecture des résultats :

- **Plateforme détectée ≠ Vercel** → le domaine ne pointe pas vers le projet Vercel : les variables
  Vercel ne seront jamais injectées.
- **Toutes les variables absentes** (`DATABASE_URL`, `MONETICO_*`… autant que `BLOB_READ_WRITE_TOKEN`)
  → le problème n'est pas propre au stockage : c'est l'injection des variables du projet qui ne se fait
  pas du tout.
- **Branche / commit inattendus** → le déploiement servi n'est pas celui que vous croyez ; redéployez et
  re-vérifiez.
- **`BLOB_READ_WRITE_TOKEN` absente alors qu'elle existe dans le dashboard** → la variable n'est pas
  attachée à cet environnement, ou elle est masquée par l'intégration Storage de Vercel qui « possède »
  ce nom. Contournement : créez une variable **`TOAC_BLOB_TOKEN`** (nom que Vercel ne gère pas) avec la
  même valeur, redéployez — le code l'utilise automatiquement en repli.
- **Jeton présent mais test en échec** → l'erreur affichée est la vraie cause. « Cannot use public
  access on a private store » signifie qu'un `put()` demande `access: "public"` sur le store privé du
  club : c'est le code qu'il faut corriger, pas la configuration Vercel.

## 7. Sécurité de l'espace adhérents

- Authentification par identifiant/mot de passe (bcrypt), session signée (HMAC) dans un cookie **httpOnly**
  (jamais lisible en JavaScript côté client).
- Protection au niveau du **proxy** Next.js (`src/proxy.ts`, anciennement "middleware") : toute tentative
  d'accès direct par URL à `/espace-adherents/*` sans session valide redirige vers `/connexion`.
- Double vérification côté serveur dans chaque page protégée (défense en profondeur).
- Les données adhérents (`src/data/members.json`, `src/data/accounts.json`) ne sont jamais servies au
  client : elles sont lues côté serveur (Server Components / Route Handlers) et seul le rendu HTML final
  (ou les champs strictement nécessaires) atteint le navigateur.

### Se connecter au bureau en production

`src/data/accounts.json` porte les comptes locaux mais n'est **pas versionné** (données sensibles) : il
n'existe donc pas sur le serveur déployé. En production, le compte bureau vient des variables
d'environnement :

```
ADMIN_USERNAME=bureau
ADMIN_PASSWORD=<mot de passe long>
ADMIN_NAME=Bureau TOAC        # facultatif
```

Sans elles, personne ne peut ouvrir `/espace-adherents/*` en ligne. Le mot de passe est comparé en temps
constant et doit faire au moins 8 caractères. En développement, à défaut de `accounts.json`, les comptes
de démonstration de `accounts.sample.json` restent utilisables ; ce repli est **refusé en production**,
car les hachages de ce fichier sont dans le dépôt et l'un d'eux ouvre un compte `admin`.

### Rendre tout le site privé (avant mise en ligne publique)

Sans passer par un plan payant Vercel : renseignez `SITE_PASSWORD` dans les variables d'environnement.
Une fois définie, le navigateur demande un identifiant (n'importe lequel) et ce mot de passe avant
d'afficher quoi que ce soit sur le site. Laissez la variable vide (ou supprimez-la) pour repasser le site
en public. La notification de paiement Monetico (`/api/monetico/retour`) reste volontairement accessible
sans mot de passe, sinon les paiements en cours échoueraient.

### Fermer l'URL Vercel (*.vercel.app) une fois le vrai domaine en ligne

Une fois `toac-triathlon.com` branché (voir domaine personnalisé ci-dessus), l'URL générée par Vercel
(`site-web-toac.vercel.app`) reste accessible en parallèle — pratique pour les devs, mais pas destinée au
public. Pour la fermer sans toucher au domaine de production :

- Renseignez `PREVIEW_SITE_PASSWORD` dans les variables d'environnement Vercel : seule cette URL demandera
  un identifiant/mot de passe (même mécanisme que `SITE_PASSWORD` ci-dessus), `toac-triathlon.com` reste
  public. Laissez vide pour ne pas la verrouiller.
- Elle est aussi exclue des moteurs de recherche par défaut (en-tête `X-Robots-Tag: noindex`, voir
  `next.config.ts`), qu'un mot de passe soit renseigné ou non.

## 8. Placeholders restants — récapitulatif

- Toutes les photos (`ImagePlaceholder`)
- `TARIFS_A_CONFIRMER` (montants de cotisation)
- `URL_INSCRIPTION_TDL` (lien d'inscription aux Triathlons du Lauragais)
- `LIEN_COMMANDE_TENUES`
- Documents PDF de l'espace adhérents
- Variables d'environnement Monetico et Brevo
- Coordonnées GPS précises des lieux d'entraînement (approximations à vérifier)
- `favicon.ico` (retiré du dépôt initial — vous pouvez en générer un à partir de `public/logo-toac.png`)
- `package-lock.json` (non inclus dans ce commit — régénérez-le avec `npm install`)
