import { pgTable, text, real, integer, timestamp, json } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { vehiclesTable } from "./vehicles";
import { parkingLotsTable } from "./parkingLots";

export const parkingSessionsTable = pgTable("parking_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  vehicleId: text("vehicle_id").notNull().references(() => vehiclesTable.id, { onDelete: "cascade" }),
  parkingLotId: text("parking_lot_id").references(() => parkingLotsTable.id, { onDelete: "set null" }),
  locationName: text("location_name").notNull(),
  locationAddress: text("location_address"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull().defaultNow(),
  endTime: timestamp("end_time", { withTimezone: true }),
  paidMinutes: integer("paid_minutes"),
  status: text("status").notNull().default("active"),
  extensions: json("extensions").$type<{ addedMinutes: number; timestamp: string }[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
