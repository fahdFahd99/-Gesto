# Migrations et restauration

`runtime/migrate.mjs` applique les fichiers `drizzle/0000_…sql` à `0005_…sql` dans l'ordre. Chaque fichier et son enregistrement dans `app_migrations` sont validés dans une seule transaction. Les empreintes empêchent de modifier silencieusement une migration déjà exécutée. Ne pas lancer les migrations à chaque requête ni à chaque build Netlify.

## Nouvelle installation

`pnpm setup` crée seulement la configuration locale privée et une base vide. Les métadonnées minimales sont initialisées à l'ouverture; aucun stock, produit, fournisseur ou vente fictifs n'est ajouté.

## Base V11 existante

1. `pnpm db:backup` ou téléchargement depuis **Sauvegardes**.
2. Tester `pnpm db:migrate` sur une copie isolée.
3. Appliquer sur la bonne base et vérifier les totaux. Ne jamais effacer `app_migrations` pour contourner un problème.

## Sauvegarde V11

```sh
pnpm db:backup
node scripts/restore-backup.mjs sauvegarde.json nouvelle-base.db
```

La cible doit être un fichier inexistant. Le script applique le schéma, restaure les tables en transaction, vérifie les clés étrangères, l'intégrité SQLite et chaque nombre de lignes. Il refuse d'écraser une base. Les comptes ne sont pas dans la sauvegarde de gestion. Pour un secours complet, activer aussi les sauvegardes du fournisseur de base.

## Ancienne base Cloudflare D1 / V9 / V10

Ne pas exécuter aveuglément les migrations initiales sur une base déjà remplie. Cet export est autonome et **n'a modifié aucune base hébergée précédente**.

Le développeur doit exporter la base dans une copie isolée, confirmer les migrations 0000 à 0004 déjà appliquées, comparer leur schéma réel, puis enregistrer les empreintes correspondantes dans `app_migrations` avant d'appliquer 0005. Les comptes V9 utilisant le même format scrypt peuvent être conservés s'ils sont exportés par une procédure administrateur privée; les sauvegardes de gestion seules n'en contiennent pas.

La migration 0005 conserve les produits et convertit les anciens types non médicament en `parapharmacie`; l'ancien type lait/nutrition/dispositif est conservé dans la catégorie. Elle renseigne les familles historiques à partir des fiches disponibles au moment de cette migration. Les changements de classification antérieurs ne peuvent pas être reconstitués s'ils n'étaient pas historisés.

Les anciennes sauvegardes JSON sans `schemaVersion: 11` sont refusées par le nouveau restaurateur pour empêcher une conversion silencieuse des familles et des taxes. Préparer une migration explicite sur copie avant leur utilisation.

`db/schema.ts` décrit les tables. Les snapshots Drizzle historiques sont des archives; le runner fait foi. Toute nouvelle migration SQL doit être testée sur une base vide et une copie représentative remplie.
