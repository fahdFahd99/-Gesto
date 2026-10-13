# Correctif V11.0.1 — en attente de publication réelle

**Le domaine lfarm.netlify.app n’est pas réparé par la seule création de cette archive.** Dernier contrôle public : 12 octobre 2026, 22:31 UTC; /api/session et /api/snapshot sont encore à 503. GitHub est connecté, mais aucun dépôt n’est accessible. Aucun changement n’a été publié sur Netlify pendant ce correctif.

## Correctifs et vérifications du 12 octobre

- Configuration SQL explicite, détection Netlify au runtime, aucun repli silencieux vers SQLite.
- Démarrage local neuf préparé automatiquement; conservation du fichier privé, du compte, de la session et des données au redémarrage.
- Refus d’une base ancienne non reconnue avant toute modification de schéma.
- Contrôle sans écriture avant build Netlify; erreurs identifiables sans afficher des secrets.
- Démarrage de l’interface par /api/session avant toute demande de données protégées.
- TypeScript et build Next.js réussis; 12 tests unitaires, 25 scénarios métier, 8 scénarios comptes, 11 scénarios HTTP et 6 scénarios de premier démarrage/configuration réussis (62 au total).
- Les 6 scénarios de démarrage utilisent le vrai serveur de production sur une copie source neuve, sans .env ni base préexistante. Ils comprennent une panne de configuration runtime et un schéma absent.

Aucune création de compte distant, migration distante ni recette de fonctionnement public n’a été confirmée. DEPANNAGE_503.md distingue le défaut de code vérifié des causes d’hébergement restant à confirmer. Les essais locaux utilisent uniquement des bases temporaires.

---

## Historique V11 (avant signalement du 503)

# Livraison V11 — 12 octobre 2026

## Ce qui a été fait

Archive finale de la conversation précédente récupérée et inspectée. Conservation de ses fonctionnalités V9.4 : DCI multiples, recherche par composition et création de produit depuis Achats.

- Remplacement du runtime Vinext/Cloudflare par Next.js natif; suppression de la configuration Netlify pointant vers un script inexistant.
- Adaptateur SQL local/distant, migrations atomiques, initialisation vide et configuration reproductible.
- Premier compte titulaire protégé, login par e-mail/identifiant, invitations, droits, déconnexion, changement et récupération du mot de passe.
- Uniquement Médicament / Parapharmacie; familles historisées dans les ventes et achats, rapports séparés et remboursements exacts.
- Mise à jour de Next.js vers 16.3.8 et correctifs épinglés pour les dépendances signalées par l’audit.

## Vérifications réalisées

Environnement Linux, Node.js 24.19.0, pnpm 11.25.0, bases temporaires isolées.

| Vérification | Résultat |
| --- | --- |
| Installation des dépendances et lockfile | Réussie |
| TypeScript | Réussi |
| DCI/compositions | 10 tests réussis |
| Création depuis Achats / code-barres | 2 tests réussis |
| Intégration métier SQL, concurrence et catégories | 25 scénarios réussis |
| Comptes, invitations, sessions, CSRF et configuration | 8 scénarios réussis |
| Construction Next.js 16.3.8 en production | Réussie |
| Serveur réel Next.js : pages/assets, API, comptes, vente mixte, retours, droits, backup/restore, redémarrage | 11 scénarios réussis |
| `pnpm audit --prod` | 0 vulnérabilité connue signalée au contrôle |

Le test HTTP a réellement démarré le build Next.js et effectué les opérations dans sa base : il ne simule pas les réponses de l’API. La restauration a recréé une base distincte et vérifié ventes, comptes exclus et intégrité. Aucun compte, token ou fichier de cette base d’essai n’est livré.

## Limites de la préparation V11

- Le site n’a pas été déployé dans vos comptes GitHub/Netlify lors de cette préparation. La base libSQL distante doit être créée, configurée et migrée; aucune clé d’accès n’est inventée ni livrée.
- Le build et les parcours HTTP locaux ont été vérifiés; l’adaptateur Netlify et la connexion distante n’ont pas été exécutés dans votre compte.
- Pas de contrôle visuel automatisé du navigateur disponible dans cet environnement; les parcours écran, impression, scanner physique et téléphone restent à vérifier sur vos appareils.
- La compatibilité d’installation sur Windows est préparée, mais les commandes ont été exécutées sous Linux.
- Firebase et le catalogue LFARMACIEN de 13 000+ produits ne sont pas connectés; le contrat de future intégration est inclus.
- Une pharmacie par installation. Les rapports sont des indicateurs de gestion, pas une comptabilité générale/fiscale complète.

Les tests réussis ne garantissent pas l’absence de tout bug. Les étapes restantes de publication et recette sont décrites dans NETLIFY.md et TEST_PLAN.md.
