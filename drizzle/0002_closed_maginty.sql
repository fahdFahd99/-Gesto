CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`operatorId` text NOT NULL,
	`operatorName` text NOT NULL,
	`action` text NOT NULL,
	`reference` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_created` ON `audit` (`createdAt`);--> statement-breakpoint
CREATE TABLE `authAttempts` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expiresAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`ownerId` text NOT NULL,
	`ownerName` text NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	CONSTRAINT "draft_version" CHECK("drafts"."version">0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `active_draft_per_operator` ON `drafts` (`ownerId`,`type`) WHERE "drafts"."status"='draft';--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`username` text NOT NULL,
	`role` text DEFAULT 'employee' NOT NULL,
	`rights` text DEFAULT '{}' NOT NULL,
	`passwordHash` text DEFAULT '' NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`createdAt` text NOT NULL,
	CONSTRAINT "employee_version" CHECK("employees"."version">0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employee_username` ON `employees` (`username`);--> statement-breakpoint
CREATE TABLE `quarantine` (
	`id` text PRIMARY KEY NOT NULL,
	`returnLineId` text NOT NULL,
	`productId` text NOT NULL,
	`lotId` text NOT NULL,
	`quantity` integer NOT NULL,
	`valueCents` integer NOT NULL,
	`status` text DEFAULT 'quarantine' NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`createdAt` text NOT NULL,
	`closedAt` text,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`returnLineId`) REFERENCES `returnLines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lotId`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "quarantine_version" CHECK("quarantine"."version">0)
);
--> statement-breakpoint
CREATE TABLE `receiptLines` (
	`id` text PRIMARY KEY NOT NULL,
	`receiptId` text NOT NULL,
	`productId` text NOT NULL,
	`lotId` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer NOT NULL,
	`freeQuantity` integer NOT NULL,
	`purchaseCents` integer NOT NULL,
	`discountBp` integer NOT NULL,
	`saleCents` integer NOT NULL,
	`totalCents` integer NOT NULL,
	FOREIGN KEY (`receiptId`) REFERENCES `receipts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lotId`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `returnLines` (
	`id` text PRIMARY KEY NOT NULL,
	`returnId` text NOT NULL,
	`saleLineId` text NOT NULL,
	`quantity` integer NOT NULL,
	`totalCents` integer NOT NULL,
	`costCents` integer NOT NULL,
	FOREIGN KEY (`returnId`) REFERENCES `returns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`saleLineId`) REFERENCES `saleLines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `returns` (
	`id` text PRIMARY KEY NOT NULL,
	`saleId` text NOT NULL,
	`number` text NOT NULL,
	`requestKey` text NOT NULL,
	`totalCents` integer NOT NULL,
	`costCents` integer NOT NULL,
	`taxCents` integer NOT NULL,
	`payment` text NOT NULL,
	`reason` text NOT NULL,
	`operatorId` text NOT NULL,
	`operatorName` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`tokenHash` text PRIMARY KEY NOT NULL,
	`employeeId` text NOT NULL,
	`expiresAt` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE lots ADD COLUMN series INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE lots ADD COLUMN manufacturerLot TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE lots ADD COLUMN valueCents INTEGER NOT NULL DEFAULT 0 CONSTRAINT lot_value_nonnegative CHECK(valueCents>=0);
--> statement-breakpoint
UPDATE lots SET series=(SELECT COUNT(*) FROM lots b WHERE b.productId=lots.productId AND (b.receivedAt<lots.receivedAt OR (b.receivedAt=lots.receivedAt AND b.id<=lots.id))),manufacturerLot=code,valueCents=quantity*unitCostCents;
--> statement-breakpoint
CREATE UNIQUE INDEX lots_product_series ON lots(productId,series);
--> statement-breakpoint
ALTER TABLE `movements` ADD `operatorId` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `movements` ADD `operatorName` text DEFAULT 'Historique V1' NOT NULL;--> statement-breakpoint
ALTER TABLE `receipts` ADD `receptionDate` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `receipts` ADD `operatorId` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `receipts` ADD `operatorName` text DEFAULT 'Historique V1' NOT NULL;--> statement-breakpoint
ALTER TABLE saleLines ADD COLUMN costTotalCents INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE saleLines ADD COLUMN returnedQty INTEGER NOT NULL DEFAULT 0 CONSTRAINT return_quantity CHECK(returnedQty>=0 AND returnedQty<=quantity);
--> statement-breakpoint
UPDATE saleLines SET costTotalCents=quantity*unitCostCents;
--> statement-breakpoint
ALTER TABLE `sales` ADD `itemCount` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sales` ADD `operatorId` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `sales` ADD `operatorName` text DEFAULT 'Historique V1' NOT NULL;
--> statement-breakpoint
UPDATE sales SET itemCount=(SELECT COALESCE(SUM(quantity),0) FROM saleLines WHERE saleId=sales.id);
--> statement-breakpoint
UPDATE receipts SET receptionDate=substr(createdAt,1,10);
--> statement-breakpoint
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'audit_immutable'); END;
--> statement-breakpoint
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'audit_immutable'); END;
