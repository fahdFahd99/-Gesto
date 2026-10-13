# Intégration future : LFARMACIEN STORE → Pharmacie Ijjai

## Situation
Le magasin LFARMACIEN STORE dispose, selon les informations du projet, d'un catalogue parapharmacie d'environ 13 000+ références dans **Firebase Firestore**. Ce ZIP ne contient **ni export des données, ni accès Firebase, ni identifiants**; aucune synchronisation n'est active.

## Stratégie fiable
1. Obtenir/exporter le catalogue par Firestore Admin SDK sur un serveur protégé (ou via un export administrateur).
2. Renseigner un contrat **stable et versionné** (`integrations/lfarmacien/catalog-contract.ts`) : `sourceId`, code-barres, nom, marque, catégories, image, éventuels prix, DCI si connu.
3. Garder **catalogue global** séparé de **fiche de stock en officine** : importer une fiche ne signifie pas entrée en stock.
4. Utiliser `sourceId` pour conserver la provenance et le code-barres pour proposer des correspondances. Interdire l'écrasement silencieux des prix PPV/PPH de l'officine.
5. Préparer import en lots (ex. 100 références), reprise/idempotence, rapport de conflits et journal d'audit. Prévoir sauvegarde et rollback.
6. Paramétrer Firebase Admin secrets **uniquement sur le serveur**. Ne jamais exposer ces secrets dans `NEXT_PUBLIC_*`, GitHub ni un ZIP.
7. Étudier une synchronisation en lecture seule du catalogue central, validée par le titulaire pour toute fiche destinée à la vente réelle.

## Questions en suspens
- Un projet Firebase partagé ou séparé pour la pharmacie ?
- Export Firestore complet, structure exacte des 13k documents, catégories et champs prix.
- Stratégie du moteur de recherche (SQLite/libSQL pour stock/ventes, Firestore pour catalogue maître; éventuellement un index séparé).
- Contrôles métier, réglementaires et DCI pour les médicaments (ne pas confondre parapharmacie et médicaments).
