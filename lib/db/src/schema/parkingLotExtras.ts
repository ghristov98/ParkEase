import { pgTable, text, primaryKey } from "drizzle-orm/pg-core";
import { parkingLotsTable } from "./parkingLots";
import { parkingExtrasTable } from "./parkingExtras";

export const parkingLotExtrasTable = pgTable(
  "parking_lot_extras",
  {
    parkingLotId: text("parking_lot_id").notNull().references(() => parkingLotsTable.id, { onDelete: "cascade" }),
    extraId: text("extra_id").notNull().references(() => parkingExtrasTable.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.parkingLotId, t.extraId] })],
);

export type ParkingLotExtra = typeof parkingLotExtrasTable.$inferSelect;
