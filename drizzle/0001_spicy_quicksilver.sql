ALTER TABLE `movements` ADD `requestKey` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `receipts` ADD `requestKey` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `sales` ADD `requestKey` text DEFAULT '' NOT NULL;