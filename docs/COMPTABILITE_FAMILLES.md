# Deux familles, calculs séparés

Les seules valeurs acceptées par l'interface et l'API sont `medicament` et `parapharmacie`. Les champs catégorie, marque, présentation, âge et gluten sont des détails de fiche, pas de nouvelles familles comptables.

## Médicaments

Saisir le PPH, le PPV, la TVA applicable et la remise fournisseur. Aucun taux fixe de 33 % ou autre n'est appliqué automatiquement : chaque présentation conserve ses prix. La réception fixe le coût réel du lot : achat brut × quantité facturée × (1 − remise), réparti sur les unités payées et gratuites.

## Parapharmacie

Saisir le prix d'achat et le prix de vente libre. L'écart dépend de ces prix et des conditions réellement enregistrées à l'achat. Les laits, la nutrition et les dispositifs sont décrits dans les catégories de cette famille lorsque vous les classez comme parapharmacie.

## Exemple de contrôle

| Famille | Coût des unités vendues TTC | Ventes TTC | Écart TTC |
| --- | ---: | ---: | ---: |
| Médicament | 140 DH | 200 DH | 60 DH |
| Parapharmacie | 400 DH | 700 DH | 300 DH |
| Total | 540 DH | 900 DH | 360 DH |

Retour d'une unité de parapharmacie vendue 350 DH et coûtant 200 DH : ventes nettes 550 DH, coût net vendu 340 DH, écart net TTC 210 DH. Le produit reste en quarantaine jusqu'à une décision explicite; le retour ne crée pas automatiquement de stock vendable.

Les tickets conservent leur famille, prix, TVA et coût historiques. Un changement ultérieur de la fiche ne reclasse pas les ventes. Une ligne de retour utilise la famille de la ligne vendue et son coût d'origine; le dernier retour récupère les centimes résiduels. La TVA historique des retours anciens est répartie proportionnellement lors de la migration.

Les rapports présentent par famille : ventes brutes, avoirs, ventes nettes TTC/HT, TVA sur les ventes nette, unités nettes, coût réel vendu, écart TTC, taux sur ventes et achats réceptionnés. La valeur actuelle du stock est également séparée. Les fichiers CSV utilisent le séparateur français « ; », des nombres en unités monétaires et des colonnes explicites.

L'écart entre TTC de vente et coût TTC est un indicateur de gestion. Il n'est pas un bénéfice après charges, une marge comptable HT ni une déclaration fiscale. Les achats présentés ne comportent pas encore de calcul complet de TVA déductible; les factures fournisseurs et le régime fiscal doivent être traités par la comptabilité.
