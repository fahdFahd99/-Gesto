CREATE TABLE `lots` (
	`id` text PRIMARY KEY NOT NULL,
	`productId` text NOT NULL,
	`code` text NOT NULL,
	`expiry` text,
	`quantity` integer NOT NULL,
	`unitCostCents` integer NOT NULL,
	`supplierId` text,
	`receivedAt` text NOT NULL,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "lot_quantity_nonnegative" CHECK("lots"."quantity" >= 0),
	CONSTRAINT "lot_cost_nonnegative" CHECK("lots"."unitCostCents" >= 0)
);
--> statement-breakpoint
CREATE INDEX `lots_product_expiry` ON `lots` (`productId`,`expiry`);--> statement-breakpoint
CREATE TABLE `movements` (
	`id` text PRIMARY KEY NOT NULL,
	`productId` text NOT NULL,
	`lotId` text NOT NULL,
	`kind` text NOT NULL,
	`delta` integer NOT NULL,
	`reference` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lotId`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "movement_nonzero" CHECK("movements"."delta" != 0)
);
--> statement-breakpoint
CREATE INDEX `movements_date` ON `movements` (`createdAt`);--> statement-breakpoint
CREATE INDEX `movements_product` ON `movements` (`productId`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`barcode` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`subcategory` text DEFAULT '' NOT NULL,
	`brand` text DEFAULT '' NOT NULL,
	`dci` text DEFAULT '' NOT NULL,
	`dosage` text DEFAULT '' NOT NULL,
	`dosageUnit` text DEFAULT '' NOT NULL,
	`form` text DEFAULT '' NOT NULL,
	`packaging` text DEFAULT '' NOT NULL,
	`unitsPerBox` integer DEFAULT 1 NOT NULL,
	`blisters` integer DEFAULT 0 NOT NULL,
	`unitsPerBlister` integer DEFAULT 0 NOT NULL,
	`volume` text DEFAULT '' NOT NULL,
	`volumeUnit` text DEFAULT 'ml' NOT NULL,
	`weight` text DEFAULT '' NOT NULL,
	`weightUnit` text DEFAULT 'g' NOT NULL,
	`age` text DEFAULT '' NOT NULL,
	`stage` text DEFAULT '' NOT NULL,
	`gluten` text DEFAULT 'non_renseigne' NOT NULL,
	`purchaseCents` integer NOT NULL,
	`discountBp` integer DEFAULT 0 NOT NULL,
	`saleCents` integer NOT NULL,
	`taxId` text NOT NULL,
	`minStock` integer DEFAULT 5 NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`taxId`) REFERENCES `taxes`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "product_prices" CHECK("products"."purchaseCents" >= 0 AND "products"."saleCents" >= 0 AND "products"."discountBp" BETWEEN 0 AND 10000 AND "products"."minStock" >= 0),
	CONSTRAINT "product_version" CHECK("products"."version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_barcode_unique` ON `products` (`barcode`);--> statement-breakpoint
CREATE INDEX `products_kind_name` ON `products` (`kind`,`name`);--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`supplierId` text,
	`document` text NOT NULL,
	`totalCents` integer NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `saleLines` (
	`id` text PRIMARY KEY NOT NULL,
	`saleId` text NOT NULL,
	`productId` text NOT NULL,
	`lotId` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer NOT NULL,
	`priceCents` integer NOT NULL,
	`unitCostCents` integer NOT NULL,
	`taxRateBp` integer NOT NULL,
	FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lotId`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sale_lines_sale` ON `saleLines` (`saleId`);--> statement-breakpoint
CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`totalCents` integer NOT NULL,
	`costCents` integer NOT NULL,
	`taxCents` integer NOT NULL,
	`payment` text NOT NULL,
	`receivedCents` integer NOT NULL,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sales_date` ON `sales` (`createdAt`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `taxes` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`rateBp` integer NOT NULL,
	CONSTRAINT "tax_rate" CHECK("taxes"."rateBp" BETWEEN 0 AND 10000)
);
