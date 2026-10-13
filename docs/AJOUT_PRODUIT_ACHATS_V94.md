> Note historique : fonctionnalité conservée dans V11. L’exécution utilise désormais SQLite/libSQL et Next.js natif. Pour les résultats actuels, lire DELIVERY_STATUS.md.

# V9.4 — Création de produit sans quitter Achats

## Parcours

1. Ouvrir **Achats** (`#receipts`). Cliquer sur **Ajouter nouveau produit** dans le panneau de recherche (ou scanner un code-barres inconnu et presser Entrée).
2. Une seule fiche catalogue est utilisée (`ProductForm`, également accessible depuis Catalogue) : code-barres, nom, famille, PPH, remise, PPV, profil TVA, et, pour les médicaments, jusqu'à quatre DCI avec leur dose et unité.
3. Valider. L'action `products` est enregistrée dans D1 avec l'opérateur et le contrôle des droits. Après succès, la première ligne de l'achat est créée automatiquement (série 1, quantité 1). Le bon de livraison et le fournisseur en cours sont conservés.
4. Renseigner la péremption, le lot du fabricant, les quantités et valider l'achat. **La création de la fiche catalogue n'augmente jamais le stock**. Seule l'approbation de la réception crée les mouvements d'entrée.
5. Si le code-barres existe déjà, réutiliser la fiche. S'il est archivé, réactiver la fiche plutôt que créer un doublon.

## Contrôles

- Droits serveur : `stock` **et** `margins` pour créer une fiche ; les achats continuent d'exiger `purchases`. L'interface affiche une erreur explicite en cas de droits insuffisants.
- `products.barcode` est déjà indexé de manière unique ; le serveur renvoie un message lisible (409) pour un code déjà enregistré.
- `max 60` lignes de réception par bon ; aucune nouvelle ligne n'est ajoutée en dépassement.
- Le scanner reconnu ajoute l'article existant ; une saisie numérique longue inconnue ne sélectionne pas silencieusement une suggestion approchante.
- Aucune modification de schéma pour V9.4. Les migrations existantes sont conservées.
- Les prix sont en centimes, et l'ancienne DCI multiple + recherche équivalent V9.3 est préservée.

## Tests locaux réellement exécutés pendant la préparation

- `node --experimental-strip-types --test scripts/test-ingredients.mjs scripts/test-purchase-product.mjs` : **12/12** (10 DCI + 2 création depuis Achats).
- Analyse syntaxique TypeScript/TSX : **29 fichiers, zéro erreur de parsing** (via TypeScript compilateur global).
- `node scripts/check-source.mjs` : **17/17 fichiers requis**.

Ce ne sont **pas** des tests end-to-end, ni un `pnpm typecheck`, ni un build final : installer les dépendances et tester le backend D1, les droits, la persistance et les vrais écrans dans Windsurf avant tout usage de production.

## Cas de réception à tester dans Windsurf avec une base de test

- [ ] Créer une fiche depuis Achats avec un code-barres inconnu, deux DCI et des doses différentes ; relancer le navigateur et retrouver la fiche dans Catalogue.
- [ ] S'assurer que stock initial = 0 puis réception de 5 boîtes = 5 ; sortie d'une boîte = 4, historique et audit présents.
- [ ] Créer un code-barres déjà existant (y compris archivé) : aucune seconde fiche ; erreur/action de réactivation claire.
- [ ] Employé ayant seulement `purchases` : création de fiche refusée par le serveur, mais réception d'une fiche existante permise.
- [ ] Vérifier que le brouillon (fournisseur, BL, lignes existantes) n'est pas réinitialisé à la création.
- [ ] Vérifier la recherche équivalent V9.3 sur une composition multi-DCI sans faux positifs.
- [ ] Vérifier que les profils TVA et les prix reflètent les valeurs validées, sans présumer des taux réglementaires.
