import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const archives = sqliteTable("archives", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const archiveRecords = sqliteTable("archive_records", {
  id: text("id").primaryKey(),
  archiveId: text("archive_id").references(() => archives.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  author: text("author").notNull(),
  recipient: text("recipient").notNull().default(""),
  documentDate: text("document_date").notNull(),
  documentYear: text("document_year").notNull().default(""),
  place: text("place").notNull().default(""),
  description: text("description").notNull(),
  documentType: text("document_type").notNull().default("Lettera"),
  language: text("language").notNull().default("Italiano"),
  condition: text("condition").notNull().default("Buono"),
  shelfmark: text("shelfmark").notNull().default(""),
  keywords: text("keywords").notNull().default(""),
  registryEntries: text("registry_entries").notNull().default("[]"),
  fileKey: text("file_key").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
