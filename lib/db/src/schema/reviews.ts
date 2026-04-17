import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => productsTable.id),
  text: text("text").notNull(),
  language: text("language").notNull().default("en"),
  overallSentiment: text("overall_sentiment").notNull().default("neutral"),
  isSpam: boolean("is_spam").notNull().default(false),
  isDuplicate: boolean("is_duplicate").notNull().default(false),
  isSarcastic: boolean("is_sarcastic").notNull().default(false),
  features: jsonb("features").notNull().default([]),
  reviewDate: text("review_date"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
