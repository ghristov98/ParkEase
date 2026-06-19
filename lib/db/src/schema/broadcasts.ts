import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const broadcastsTable = pgTable("broadcasts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdBy: text("created_by").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  isPinned: boolean("is_pinned").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
