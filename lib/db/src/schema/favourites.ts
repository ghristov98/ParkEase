import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { parkingLotsTable } from "./parkingLots";

export const favouritesTable = pgTable("favourites", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  parkingLotId: text("parking_lot_id").notNull().references(() => parkingLotsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.userId, t.parkingLotId)]);
