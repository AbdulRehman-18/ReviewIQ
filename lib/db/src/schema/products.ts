import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  totalReviews: integer("total_reviews").notNull().default(0),
  validReviews: integer("valid_reviews").notNull().default(0),
  positivePct: doublePrecision("positive_pct").notNull().default(0),
  negativePct: doublePrecision("negative_pct").notNull().default(0),
  neutralPct: doublePrecision("neutral_pct").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
