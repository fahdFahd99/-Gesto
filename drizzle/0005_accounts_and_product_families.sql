ALTER TABLE employees ADD COLUMN email TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE UNIQUE INDEX employee_email ON employees(email) WHERE email <> '';
--> statement-breakpoint
CREATE UNIQUE INDEX one_owner ON employees(role) WHERE role='owner';
--> statement-breakpoint
CREATE TABLE invitations (
 tokenHash TEXT PRIMARY KEY NOT NULL,
 email TEXT NOT NULL,
 rights TEXT NOT NULL,
 expiresAt TEXT NOT NULL,
 usedAt TEXT,
 createdBy TEXT NOT NULL REFERENCES employees(id),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0)
);
--> statement-breakpoint
UPDATE products SET category=CASE WHEN kind IN ('lait','nutrition','dispositif') THEN
 CASE WHEN category='' THEN kind ELSE category || ' · ' || kind END ELSE category END,
 kind=CASE WHEN kind='medicament' THEN 'medicament' ELSE 'parapharmacie' END;
--> statement-breakpoint
ALTER TABLE saleLines ADD COLUMN kind TEXT NOT NULL DEFAULT 'medicament' CHECK(kind IN ('medicament','parapharmacie'));
--> statement-breakpoint
UPDATE saleLines SET kind=COALESCE((SELECT kind FROM products WHERE id=saleLines.productId),'medicament');
--> statement-breakpoint
ALTER TABLE receiptLines ADD COLUMN kind TEXT NOT NULL DEFAULT 'medicament' CHECK(kind IN ('medicament','parapharmacie'));
--> statement-breakpoint
UPDATE receiptLines SET kind=COALESCE((SELECT kind FROM products WHERE id=receiptLines.productId),'medicament');
--> statement-breakpoint
CREATE TRIGGER product_kind_insert BEFORE INSERT ON products WHEN NEW.kind NOT IN ('medicament','parapharmacie') BEGIN SELECT RAISE(ABORT,'product_kind_invalid'); END;
--> statement-breakpoint
CREATE TRIGGER product_kind_update BEFORE UPDATE OF kind ON products WHEN NEW.kind NOT IN ('medicament','parapharmacie') BEGIN SELECT RAISE(ABORT,'product_kind_invalid'); END;

--> statement-breakpoint
ALTER TABLE returnLines ADD COLUMN taxCents INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
UPDATE returnLines SET taxCents=CAST(ROUND((SELECT SUM(b.totalCents) FROM returnLines b WHERE b.returnId=returnLines.returnId AND b.id<=returnLines.id)*1.0*(SELECT taxCents FROM returns WHERE id=returnLines.returnId)/NULLIF((SELECT totalCents FROM returns WHERE id=returnLines.returnId),0))-ROUND(COALESCE((SELECT SUM(b.totalCents) FROM returnLines b WHERE b.returnId=returnLines.returnId AND b.id<returnLines.id),0)*1.0*(SELECT taxCents FROM returns WHERE id=returnLines.returnId)/NULLIF((SELECT totalCents FROM returns WHERE id=returnLines.returnId),0)) AS INTEGER) WHERE (SELECT totalCents FROM returns WHERE id=returnLines.returnId)>0;
