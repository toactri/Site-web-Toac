# Direct-to-main deployment policy

The repository owner has pre-authorized skipping pull request review for Claude Code sessions on this repo. Once your changes build and lint cleanly:

- Push the finished work directly to `main` (in addition to any session/task branch you were assigned) instead of waiting for a pull request to be opened or merged.
- Do not create a pull request for routine changes — `main` deploys straight to production via Vercel.
- Still run `npm run lint` and `npm run build` before pushing, and never force-push over `main`.
- If a change is large, architecturally significant, or risky (schema/auth/payment changes), pause and confirm with the user before pushing to `main` even though PR review is otherwise skipped.

# Bases de données de production (Neon / Supabase)

Les requêtes SQL sur Neon (`toac-adherents`, données adhérents du site) et Supabase (`toac-cms`) sont autorisées sans confirmation. En contrepartie :

- Avant toute grosse opération en écriture sur des données existantes (UPDATE/DELETE de masse, import qui remplace des lignes, modification de schéma d'une table existante), créer un snapshot Neon (`mcp__Neon__create_snapshot`, projet `crimson-glitter-46032367`, branche `main`). Le quota est d'un seul snapshot : le nouveau remplace le précédent, qui peut être supprimé sans demander (`mcp__Neon__delete_snapshot`), après vérification qu'il s'agit bien d'un snapshot manuel créé par une session Claude. Côté Supabase, copier d'abord les tables concernées dans une table de sauvegarde datée (`CREATE TABLE <table>_backup_AAAAMMJJ AS SELECT * FROM <table>`, puis `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
- Pas de snapshot ni de sauvegarde nécessaires pour une opération purement additive : création d'une table neuve, ajout de colonnes, insertion de lignes dans une table neuve.
- Ne jamais supprimer de projet, branche, base ou rôle sans accord explicite de l'utilisateur (le remplacement du snapshot ci-dessus est la seule exception).
