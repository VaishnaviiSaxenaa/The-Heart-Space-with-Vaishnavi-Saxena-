import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const syllabusTopicsTable = pgTable("syllabus_topics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  subject: text("subject").notNull(),
  topic: text("topic").notNull(),
  /* not_started | theory_in_progress | theory_done | practicing | mastered */
  status: text("status").notNull().default("not_started"),
  confidence: integer("confidence").default(0),  /* 0-5 */
  dailyRevision: boolean("daily_revision").default(false),
  weeklyRevision: boolean("weekly_revision").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SyllabusTopic = typeof syllabusTopicsTable.$inferSelect;
