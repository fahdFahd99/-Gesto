# Validation reproductible et recette

## Exécuté automatiquement

```sh
pnpm check
pnpm build
pnpm test:http
pnpm audit --prod
```

Les tests travaillent exclusivement dans `.test-runtime/` et suppriment leurs bases. Ils couvrent les compositions, les règles d’achat, l’isolation des comptes, la création du titulaire, les invitations, les sessions, les permissions, les transactions, les doubles validations, les ventes concurrentes, les retours, le stock, les deux familles, les totaux, le redémarrage et la restauration.

## À vérifier visuellement sur l’installation

1. Création de compte, clavier mobile, erreurs de formulaire et changement de mot de passe.
2. Recherche/scanner, produit inconnu dans Achats, conservation du fournisseur et du BL pendant la création de la fiche.
3. Réception avec séries/péremptions, vente, mise en attente et reprise après fermeture/reconnexion.
4. Ticket, facture avec client, imprimante réelle; F1–F12 selon les touches réservées du navigateur.
5. Rapport mixte médicament/parapharmacie et export CSV dans Excel ou LibreOffice.
6. Droits d’un employé sur deux appareils; suspension et expiration de session.
7. Connexion lente ou coupée pendant une validation, puis retry sans double opération.
8. Base distante Netlify de recette distincte, cookies HTTPS, origine définitive et sauvegardes du fournisseur.

Ne pas effectuer ces essais avec des ventes fictives dans la base de travail réelle. Préparer une base de recette, puis une base vide de production.
