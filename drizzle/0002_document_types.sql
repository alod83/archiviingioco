ALTER TABLE `archive_records` ADD `document_year` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `archive_records` ADD `registry_entries` text NOT NULL DEFAULT '[]';
