import { pgTable, text, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vehiclesTable } from "./vehicles";

export const vehicleHistoryTable = pgTable("vehicle_history", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  vehicleId: text("vehicle_id").notNull().references(() => vehiclesTable.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  description: text("description").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVehicleHistorySchema = createInsertSchema(vehicleHistoryTable).omit({ id: true, createdAt: true });
export type InsertVehicleHistory = z.infer<typeof insertVehicleHistorySchema>;
export type VehicleHistory = typeof vehicleHistoryTable.$inferSelect;
