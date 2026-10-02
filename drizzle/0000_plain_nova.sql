CREATE TABLE `archive_records` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`author` text NOT NULL,
	`recipient` text DEFAULT '' NOT NULL,
	`document_date` text NOT NULL,
	`place` text DEFAULT '' NOT NULL,
	`description` text NOT NULL,
	`document_type` text DEFAULT 'Lettera' NOT NULL,
	`language` text DEFAULT 'Italiano' NOT NULL,
	`condition` text DEFAULT 'Buono' NOT NULL,
	`shelfmark` text DEFAULT '' NOT NULL,
	`keywords` text DEFAULT '' NOT NULL,
	`file_key` text NOT NULL,
	`file_name` text NOT NULL,
	`file_type` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
