> Note historique : fonctionnalité conservée dans V11. L’exécution utilise désormais SQLite/libSQL et Next.js natif. Pour les résultats actuels, lire DELIVERY_STATUS.md.

# V9.3 — Chercher équivalent par composition exacte

## Utilisation
Dans **Produits > Nouveau produit**, pour tout médicament renseigner de 1 à 4 matières actives. Toute nouvelle fiche médicamenteuse exige au moins une composition structurée. Chaque ligne possède son propre **nom DCI**, **dosage numérique** et **unité**. La désignation et les recherches affichent les matières automatiquement.

Dans **Ventes / Achats**, rechercher un produit : le bouton **Équivalent** apparaît à côté de tout médicament listé, même en rupture. Si le nom commercial n'existe pas dans le catalogue, ouvrir **Chercher équivalent par composition**, et renseigner la combinaison DCI + dosages manuellement. Dans **Produits**, chaque médicament possède également un bouton Équivalent.

Seuls les produits actifs dont la **liste entière** des matières actives et toutes leurs concentrations/doses correspondent sont affichés : une DCI seule ne correspond jamais à une association de deux DCI, et un 1000 mg ne correspond jamais à un 500 mg. Ordre de saisie sans importance. Les unités de masse convertibles (mg, g, µg) sont comparées après normalisation, de même que les concentrations dont les unités sont dimensionnellement compatibles (mg/ml, mg/5 ml, g/L, µg/ml). Les UI et pourcentages ne se convertissent jamais en mg.

**Même forme pharmaceutique** est cochée par défaut pour une référence de catalogue, mais peut être désactivée. Ce moteur établit une correspondance des *champs renseignés*, pas une autorisation clinique de substitution : vérifier également sel, forme, voie, libération (immédiate/prolongée), dosage par unité vs concentration, population cible et réglementation. La saisie d'une formulation combinée incomplète ne doit pas être interprétée comme un médicament simple.

## Base de données
- `db/schema.ts` : colonne `products.activeIngredients` (JSON en TEXT, défaut `[]`).
- `drizzle/0004_active_ingredients.sql` : migration additive **à appliquer avant le nouveau code**. Sauvegarder la base avant migration. Les lignes V9 existantes ne sont pas supprimées.
- `lib/service.ts` : données validées et sérialisées au serveur, puis désérialisées pour les clients ; DCI classique recalculée depuis le tableau pour compatibilité.
- `lib/ingredients.ts` : comparaison stricte et sécurisée ; les anciennes fiches à DCI unique et dosage numérique peuvent être lues provisoirement ; les associations historiques ambiguës nécessitent un contrôle manuel.
- `components/management/equivalent-search.tsx` : éditeur commun et recherche.

## Contrôles
```sh
node --experimental-strip-types --test scripts/test-ingredients.mjs
```
Lancez ensuite **pnpm install**, **pnpm typecheck**, **pnpm test**, puis tests navigateur avec une vraie base D1 de test. Tests globaux/build non exécutés lors de la création de cette archive (dépendances absentes dans cet environnement).

## Exemples
- Paracétamol 500 mg + Thiocolchicoside 2 mg → exactement ces 2 substances.
- Paracétamol 500 mg seul → aucune correspondance avec l'association.
- Paracétamol 500 mg + Thiocolchicoside 4 mg → non correspondant.
- Paracétamol 0,5 g + Thiocolchicoside 2 mg → correspondant après conversion massique.
