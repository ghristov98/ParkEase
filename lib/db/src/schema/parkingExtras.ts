import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const parkingExtrasTable = pgTable("parking_extras", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  icon: text("icon"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertParkingExtraSchema = createInsertSchema(parkingExtrasTable).omit({ id: true, createdAt: true });
export type InsertParkingExtra = z.infer<typeof insertParkingExtraSchema>;
export type ParkingExtra = typeof parkingExtrasTable.$inferSelect;
