import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { sessionsTable } from "./sessions";

export const sessionNotesTable = pgTable("session_notes", {
  id: serial("id").primaryKey(),
  counsellorId: integer("counsellor_id").notNull().references(() => usersTable.id),
  studentId: integer("student_id").notNull().references(() => usersTable.id),
  sessionId: integer("session_id").references(() => sessionsTable.id),
  /* session_note | intervention */
  type: text("type").notNull().default("session_note"),
  content: text("content").notNull(),
  visibleToStudent: boolean("visible_to_student").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SessionNote = typeof sessionNotesTable.$inferSelect;
