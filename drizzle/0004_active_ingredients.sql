-- Add structured active ingredients; all pre-existing products are kept intact.
ALTER TABLE products ADD COLUMN activeIngredients TEXT NOT NULL DEFAULT '[]';
