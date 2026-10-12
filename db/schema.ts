import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
export const characterSlots = sqliteTable("character_slots", {
  id: text("id").notNull(),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  data: text("data").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
}, table => [primaryKey({ columns: [table.owner, table.id] }), index("character_slots_owner_updated").on(table.owner, table.updatedAt)]);
