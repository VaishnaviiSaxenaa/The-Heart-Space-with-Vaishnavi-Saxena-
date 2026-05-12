import { pgTable, serial, integer, real, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const dailyTrackerTable = pgTable("daily_tracker", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  date: text("date").notNull(),               /* ISO date "2025-01-15" */
  sleepHours: real("sleep_hours"),
  sleepQuality: integer("sleep_quality"),     /* 1-5 */
  physicalActivity: boolean("physical_activity").default(false),
  studyHours: real("study_hours"),
  meTimeMinutes: integer("me_time_minutes"),
  stressLevel: integer("stress_level"),       /* 1-5 */
  emotionalState: text("emotional_state"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DailyTracker = typeof dailyTrackerTable.$inferSelect;
