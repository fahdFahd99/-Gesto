# Pharmacie Ijjai · Gestion — V11.0.1

Application de gestion d’une pharmacie, **Next.js 16.3.8 / React / TypeScript**, avec serveur Node.js et base SQLite/libSQL. Source autonome prête à ouvrir dans **Windsurf**. Configuration **Netlify** incluse.

La version de départ est `Pharmacie_Ijjai_GESTION_FINAL_NEXTJS_WINDSURF.zip`. Cette édition conserve les ajouts de la dernière version : création de produit depuis Achats, compositions DCI multiples et recherche par composition. Elle corrige la configuration de déploiement, ajoute les comptes et sépare les deux familles demandées.

## Démarrer dans Windsurf ou Windows

Prérequis : **Node.js 22.14 ou ultérieur**, avec Corepack activé. Ouvrir le dossier contenant ce fichier et `package.json`.

```powershell
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Ouvrir **http://localhost:3000**. Cliquer sur **Créer un compte**, saisir votre nom, e-mail, mot de passe et le code privé `SETUP_TOKEN` créé dans `.env.local`. Aucun compte, mot de passe, produit, vente ni stock de démonstration n’est livré. Le titulaire peut ensuite inviter ou créer les employés et choisir leurs autorisations.

`pnpm dev` et `pnpm start` préparent automatiquement une nouvelle installation locale; `pnpm setup` reste disponible. Les configurations existantes sont conservées. Le dossier `data/` contient la vraie base locale : ne pas le supprimer. Pour changer de port ou utiliser HTTPS, adapter aussi `APP_ORIGIN` dans `.env.local`.

## Inclus

- Création du premier titulaire, connexion par e-mail ou identifiant, déconnexion, changement du mot de passe, récupération administrateur.
- Invitations employé à usage unique, droits vérifiés côté serveur, révocation des sessions lors d’une suspension.
- **Deux familles uniquement : Médicament et Parapharmacie**; catégories et présentation restent des détails.
- Fiches, codes-barres avec zéros initiaux, DCI multiples, recherche de composition et création directe depuis Achats.
- Réceptions, remises, unités gratuites, séries, lots fabricant, péremptions et stock réel.
- Ventes, tickets/factures à imprimer, paiements, brouillons, attentes et reprise.
- Retours liés à la vente, avoirs, quarantaine et remise en stock après contrôle.
- Rapports et exports CSV séparant achats, ventes, avoirs, TVA des ventes, stocks et écarts de marge par famille.
- Sauvegarde JSON et restauration dans une nouvelle base isolée.
- Journal d’audit, transactions atomiques, protection contre les doubles validations et conflits de stock.

## Netlify

Suivre **[docs/NETLIFY.md](docs/NETLIFY.md)**. La base distante libSQL et ses accès doivent être configurés; une base locale ne convient pas aux fonctions Netlify. Le build ne crée ni compte distant ni base. Les routes serveur ne peuvent pas être publiées par simple glisser-déposer d’un HTML.

Les anciens fichiers Worker/Vinext et la référence à un script Netlify inexistant ont été retirés. L’ancien site hébergé et ses données n’ont pas été modifiés par la préparation de cette archive.

## Vérifications reproductibles

```powershell
corepack pnpm check
corepack pnpm build
corepack pnpm test:http
corepack pnpm test:startup
corepack pnpm audit --prod
```

`test:http` lance le vrai build de production sur un port local, teste une base isolée puis la supprime. Il ne touche pas votre base de travail. Le fichier **docs/DELIVERY_STATUS.md** précise les résultats obtenus et les vérifications qui nécessitent votre hébergement.

## Documentation

- **WINDSURF_START_HERE.md** : prise en main et poursuite du développement.
- **docs/COMPTES.md** : comptes, invitations et récupération.
- **docs/COMPTABILITE_FAMILLES.md** : calculs et exemple de rapprochement.
- **docs/MIGRATIONS.md** : base existante, sauvegarde et restauration.
- **docs/LFARMACIEN_FIREBASE.md** : contrat pour une intégration future du catalogue LFARMACIEN.

Le catalogue LFARMACIEN de 13 000+ produits n’est pas inclus ni synchronisé. Les intégrations Firebase restent à développer à partir d’un export réel autorisé. Les calculs fournis sont des indicateurs de gestion, pas une comptabilité générale complète.
