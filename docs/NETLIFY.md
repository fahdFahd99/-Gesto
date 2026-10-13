# Publication sur Netlify

Cette édition est une application **Next.js native**, avec API Node.js et stockage SQL persistant. Elle n'utilise ni ChatGPT Sites ni un Worker Cloudflare. `netlify.toml` lance `pnpm build:netlify` et publie `.next`. Netlify détecte Next.js et prépare ses fonctions avec OpenNext.

## 1. Préparer la base distante

Créer une base **libSQL** chez Turso (moteur libSQL, compatible SQLite). Conserver l'URL `libsql://…` et un jeton d'accès en écriture. Les moteurs Postgres, Firestore et Turso Database natif ne sont pas interchangeables avec cet adaptateur sans migration validée.

Dans une copie privée de `.env.local`, définir :

```dotenv
DATABASE_URL=libsql://VOTRE-BASE.turso.io
DATABASE_AUTH_TOKEN=VOTRE-JETON-PRIVE
```

Exécuter `pnpm db:migrate`. La commande applique les migrations versionnées dans une transaction par fichier. Faire une sauvegarde avant de migrer une base existante. Une base D1 ou une version ancienne nécessite la procédure de `MIGRATIONS.md`.

## 2. GitHub et Netlify

1. Créer un dépôt GitHub **privé** et y pousser le contenu du dossier qui contient `package.json`, `.gitignore`, `pnpm-lock.yaml` et `netlify.toml`.
2. Dans Netlify : **Add new project → Import an existing project → GitHub**, sélectionner ce dépôt uniquement.
3. Dossier de base : racine du dépôt. Commande : `pnpm build:netlify`. Publication : `.next`. Node : 22. Ne pas ajouter de redirection `/* /index.html`.
4. Récupérer le domaine définitif du projet, puis configurer ces variables dans l’interface Netlify avec les portées **Builds et Functions** (ou toutes les portées). Une valeur dans `netlify.toml` ne suffit pas pour les fonctions :

| Variable | Valeur |
| --- | --- |
| `DATABASE_URL` | URL distante libSQL |
| `DATABASE_AUTH_TOKEN` | Jeton privé de la base |
| `APP_ORIGIN` | `https://votre-projet.netlify.app`, sans chemin |
| `SETUP_TOKEN` | Code aléatoire privé de 64 caractères hexadécimaux |

Un code peut être généré sur votre poste avec `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Le conserver en privé; ne jamais le commiter.

5. Relancer le déploiement après la configuration. Ces variables ne doivent jamais être préfixées `NEXT_PUBLIC_`.
6. Ouvrir le site, choisir **Créer un compte**, saisir vos informations et le code d'installation. Un seul titulaire peut être créé, même lors de deux requêtes simultanées. Retirer `SETUP_TOKEN` des variables après cette création et redéployer; les comptes suivants utilisent des invitations.

**Netlify Drop d'un ZIP ou d'un dossier HTML ne convient pas** : ce projet a des routes serveur et une vraie base. Un fichier SQLite local ne persiste pas correctement dans les fonctions Netlify; l'application refuse cette configuration.

## Vérification après publication

- Se connecter; créer ses propres deux premières fiches, une de chaque famille.
- Enregistrer un fournisseur, une réception, une vente mixte et un retour sur une base de recette distincte.
- Vérifier les totaux par famille, le stock, l'impression, une connexion sur téléphone et le compte d'un employé.
- Tester le téléchargement d'une sauvegarde et sa restauration dans une base isolée.
- Utiliser une base distincte pour les previews Netlify. Leur domaine doit correspondre à leur propre `APP_ORIGIN` et aucune preview publique ne doit utiliser les secrets de production.

Le code et le build peuvent être validés sans vos accès. Le déploiement réel et la connexion à votre base ne sont confirmés qu'après réussite dans vos comptes Netlify et libSQL.

Références officielles :
- https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- https://docs.netlify.com/snippets/frameworks/nextjs-config-values/
- https://tursodatabase.github.io/libsql-client-ts/interfaces/Client.html

## Correctif 503 — V11.0.1

La commande `pnpm build:netlify` contrôle la connexion, le schéma, APP_ORIGIN et le code du premier compte avant de construire. Elle ne migre pas et ne crée pas de base distante. Les portées Functions restent indispensables même si le contrôle de build passe. Après toute modification des variables, redéployer.

`NETLIFY` n’est pas un indicateur garanti dans les Functions. Le runtime reconnaît aussi SITE_ID + URL et ne choisit jamais une base locale par défaut. Voir DEPANNAGE_503.md.

Référence : https://docs.netlify.com/build/functions/environment-variables/
