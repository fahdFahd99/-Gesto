# Comptes et accès

Une installation représente **une pharmacie**; ce n'est pas un service multi-pharmacies. Une autre pharmacie utilise sa propre base et son propre déploiement.

- Le titulaire ouvre le premier compte avec le code privé `SETUP_TOKEN` (64 caractères hexadécimaux aléatoires). Son identifiant est `titulaire`; son e-mail fonctionne aussi pour se connecter.
- Le titulaire peut créer un employé, ou générer une invitation liée à un e-mail dans **Employés**. L'employé choisit ensuite son mot de passe via **Créer un compte**. L'invitation expire après 48 heures et s'utilise une seule fois. Une nouvelle invitation pour le même e-mail remplace la précédente non utilisée.
- Aucun e-mail n'est envoyé automatiquement; le code se transmet en privé. Une adresse saisie n'est pas présentée comme vérifiée par e-mail.
- Chaque compte peut changer son mot de passe via **Mon compte**, en confirmant son mot de passe actuel. Le changement révoque toutes ses sessions.
- Le titulaire peut suspendre un employé ou modifier ses droits; les sessions de cet employé sont alors révoquées.
- Pour récupérer un compte employé, le titulaire définit un nouveau mot de passe dans **Employés**.
- Pour récupérer le titulaire, utiliser un terminal autorisé avec les variables de connexion à sa base, puis `pnpm account:recover`. La saisie du nouveau mot de passe est masquée. Cette commande demande une confirmation, journalise la récupération et révoque les sessions. Ne jamais envoyer le mot de passe dans une conversation ni le mettre dans Git.

Les mots de passe ont au moins 15 caractères, sont dérivés par scrypt et ne sont pas récupérables en clair. Les sessions expirent après 12 heures; seule leur empreinte est stockée. Les cookies de production sont Secure, HttpOnly et SameSite=Lax. Pour un serveur local HTTP explicitement configuré sur localhost/127.0.0.1, un cookie local distinct est utilisé.

Les sauvegardes de gestion ne contiennent ni mots de passe ni sessions ni invitations. Après une restauration isolée, recréer le titulaire et les comptes nécessaires avant toute bascule. Les noms des opérateurs historiques restent dans le journal.
