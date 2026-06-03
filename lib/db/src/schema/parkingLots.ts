import { pgTable, text, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const parkingLotsTable = pgTable("parking_lots", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  type: text("type").notNull().default("free"),
  description: text("description"),
  photos: text("photos").array().notNull().default([]),
  mainPhotoIndex: real("main_photo_index").notNull().default(0),
  openingHours: text("opening_hours"),
  hasSecurityGuard: boolean("has_security_guard").notNull().default(false),
  hasCCTV: boolean("has_cctv").notNull().default(false),
  hasLighting: boolean("has_lighting").notNull().default(false),
  isCovered: boolean("is_covered").notNull().default(false),
  hasEVCharging: boolean("has_ev_charging").notNull().default(false),
  hasDisabledAccess: boolean("has_disabled_access").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertParkingLotSchema = createInsertSchema(parkingLotsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertParkingLot = z.infer<typeof insertParkingLotSchema>;
export type ParkingLot = typeof parkingLotsTable.$inferSelect;
