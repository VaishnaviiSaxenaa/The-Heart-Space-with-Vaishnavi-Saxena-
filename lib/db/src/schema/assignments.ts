import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  subject: text("subject").notNull(),
  topic: text("topic").notNull(),
  date: text("date").notNull(),               /* ISO date "2025-01-15" */
  questionsAttempted: integer("questions_attempted").notNull(),
  questionsCorrect: integer("questions_correct").notNull(),
  /* confused | partial | clear | strong */
  approach: text("approach").notNull(),
  /* slow | moderate | fast | exam_ready */
  speed: text("speed").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Assignment = typeof assignmentsTable.$inferSelect;
