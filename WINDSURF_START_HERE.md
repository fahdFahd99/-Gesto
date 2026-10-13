# Reprendre Pharmacie Ijjai dans Windsurf

Ouvrir ce dossier racine, puis lire README.md et docs/DELIVERY_STATUS.md.

## Architecture actuelle

- `app/` : Next.js App Router natif; API Node.js dans `app/api/[action]/route.ts`.
- `components/management/` : interface française de gestion, connexion et création de compte.
- `lib/service.ts`, `lib/v9-service.ts` : règles métier conservées et enrichies, sans simulation.
- `lib/auth.ts`, `lib/registration.ts`, `lib/http-security.ts` : sessions, droits, invitations, limites et origine.
- `runtime/database.mjs` : adaptateur transactionnel SQLite/libSQL, compatible avec les instructions SQL historiques.
- `runtime/migrate.mjs`, `drizzle/*.sql` : migrations versionnées et vérifiées par empreinte.
- `lib/accounting.ts` : agrégats séparés par famille; les familles historiques sont stockées dans les lignes.
- `scripts/` : installation, backup, restauration, récupération et tests isolés.
- `integrations/lfarmacien/` : contrat d’import futur; aucun import actif.

## Démarrage

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Lire SETUP_TOKEN dans votre .env.local, puis créer le premier compte dans l’interface. Ne jamais commiter ce fichier, le dossier data/ ou une sauvegarde de l’officine. Une seule installation = une seule pharmacie.

## Règles à conserver

1. Seulement `medicament` et `parapharmacie`; aucun autre type dans les nouvelles opérations.
2. Ne pas remplacer les calculs de coût des lots par un taux de marge fixe. Les remises, unités gratuites et centimes résiduels doivent rester exacts.
3. Aucun changement de fiche ne doit réécrire la famille ou les prix d’une vente déjà validée.
4. Stock et ventes côté serveur; transactions et versions obligatoires. Un retry ne doit pas créer un deuxième mouvement.
5. Toute écriture possède un contrôle d’autorisation; aucun coût ne doit être transmis à un compte sans droit « Coûts & marges ».
6. Ne pas créer de faux compte, stock ou données pour masquer une erreur de configuration.
7. Un futur import Firebase enrichit les fiches; il ne crée pas de stock et n’écrase pas silencieusement les prix de l’officine.
8. Conserver le schéma et ajouter une migration; sauvegarder avant modification d’une base existante.

## Avant publication

Exécuter `pnpm check`, `pnpm build`, `pnpm test:http` et `pnpm audit --prod`. Tester ensuite visuellement sur ordinateur et téléphone, y compris les tickets, le scanner clavier et la reprise de brouillon après fermeture.

Pour Netlify, suivre docs/NETLIFY.md : dépôt GitHub privé, base libSQL distante, variables serveur, migration puis déploiement. Aucun token réel n’est dans ce ZIP. Ne pas réutiliser le backend privé de l’ancienne version sans une migration explicitement validée.

## Prochaines évolutions possibles

Pagination serveur du catalogue et des historiques avant un import de 13k références; import Firebase avec rapport de conflits; sauvegardes automatiques du fournisseur; messagerie transactionnelle pour invitations/récupération par e-mail si un service est configuré; tests navigateur automatisés. Ces fonctions futures ne sont pas présentées comme déjà actives.
