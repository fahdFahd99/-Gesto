# Dépannage du 503 — V11.0.1

## Constat sur le domaine réel

Le 12 octobre 2026 à 22:31 UTC, https://lfarm.netlify.app/api/session et /api/snapshot renvoyaient encore HTTP 503 avec le message générique. La page HTML répondait 200 lors du premier contrôle, mais cela ne validait pas le fonctionnement de l’application.

Le correctif de cette archive n’a pas été déployé sur ce domaine. Le compte GitHub connecté ne donne actuellement accès à aucun dépôt; les logs serveur et variables de l’hébergement n’ont donc pas été inspectés. Le diagnostic exact du déploiement reste à confirmer dans Netlify.

## Défaut de code identifié et corrigé

La V11 utilisait NETLIFY pour détecter le cloud; en son absence, elle choisissait implicitement `file:./data/pharmacie.db`. NETLIFY est une variable de build qui n’est pas garantie dans les Functions. Sans base configurée, ce chemin provoquait une erreur de connexion masquée par un 503 générique.

La V11.0.1 exige DATABASE_URL, reconnaît les marqueurs runtime SITE_ID + URL et refuse une base locale dans Netlify. Elle prépare automatiquement le stockage d’une installation locale neuve, vérifie le déploiement avant build, permet une nouvelle tentative après un échec temporaire d’initialisation de connexion et retourne une référence d’erreur sans secret.

## Sur le poste local

`pnpm install --frozen-lockfile`, puis `pnpm dev`. Une installation complètement neuve crée `.env.local`, un code privé et la base vide. Lire SETUP_TOKEN dans ce fichier pour créer le titulaire. Aucune base de démonstration ni aucun compte précréé.

Une configuration existante, même incomplète, n’est pas remplacée. Une base ancienne sans historique app_migrations est refusée avant modification : suivre MIGRATIONS.md après sauvegarde. Ne pas supprimer les données pour faire disparaître l’erreur.

## Dans Netlify

1. Vérifier le domaine du projet et le dépôt réellement déployé.
2. Dans les variables du projet, fournir DATABASE_URL distante libSQL, DATABASE_AUTH_TOKEN et APP_ORIGIN (ici https://lfarm.netlify.app). Fournir SETUP_TOKEN seulement si aucun titulaire n’a encore été créé.
3. Les variables doivent être disponibles dans Builds pour le contrôle avant build et dans Functions pour l’exécution. Ne pas les placer dans des fichiers publics ni dans le code Git.
4. Exécuter explicitement `pnpm db:migrate` sur la base distante choisie après sauvegarde si elle existe. Ne pas remplacer une base existante par une base vide.
5. Exécuter `pnpm doctor`, puis publier avec `pnpm build:netlify` (défini dans netlify.toml). Relancer le déploiement après changement de variables.
6. Vérifier /api/session (200 avec JSON valide), la connexion et le chargement des données authentifiées. Sans connexion, /api/snapshot doit refuser l’accès avec 401. Tester les écritures et le redémarrage sur une base de recette séparée, puis le parcours du titulaire sur le domaine final.

## Références de diagnostic

| Code | Correction à vérifier côté serveur |
| --- | --- |
| DATABASE_URL_MISSING / DATABASE_TOKEN_MISSING | Variables absentes au runtime ou portée Functions manquante |
| DATABASE_LOCAL_ON_NETLIFY | Choisir une base libSQL distante persistante |
| DATABASE_SCHEMA_NOT_READY | Migrer explicitement la bonne base, sans réinitialisation |
| DATABASE_ACCESS_DENIED | Autorisations du jeton SQL ou expiration |
| DATABASE_STORAGE_UNAVAILABLE | Chemin ou permissions du stockage local |
| DATABASE_UNAVAILABLE | Connectivité ou indisponibilité du service SQL |
| APP_ORIGIN_MISSING / APP_ORIGIN_INVALID | Origine exacte du site, HTTPS en ligne |
| SETUP_TOKEN_INVALID | Code privé du premier titulaire absent ou invalide |
| SERVER_ERROR | Retrouver la référence dans les logs; ne pas supposer une panne de connexion |

Le contrôle `pnpm doctor` est en lecture seule; il n’affiche aucun secret. Une validation locale ne prouve pas qu’un autre hébergement est configuré correctement.
