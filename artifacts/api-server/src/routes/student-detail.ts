import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, moodsTable, dailyTrackerTable, sessionsTable,
  sessionNotesTable, syllabusTopicsTable, assignmentsTable,
} from "@workspace/db";
import { eq, desc, gte, and } from "drizzle-orm";
import { userToResponse } from "./auth";

const router = Router();

router.get("/student-detail/:id", async (req, res) => {
  const studentId = parseInt(req.params.id);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId)).limit(1);
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const now = new Date();

  /* Moods - last 30 entries */
  const moods = await db
    .select()
    .from(moodsTable)
    .where(eq(moodsTable.studentId, studentId))
    .orderBy(desc(moodsTable.createdAt))
    .limit(30);

  /* Daily tracker - last 14 days */
  const dailyTracker = await db
    .select()
    .from(dailyTrackerTable)
    .where(and(eq(dailyTrackerTable.userId, studentId), gte(dailyTrackerTable.createdAt, fourteenDaysAgo)))
    .orderBy(desc(dailyTrackerTable.date));

  /* Sessions */
  const sessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.studentId, studentId))
    .orderBy(desc(sessionsTable.scheduledAt));

  /* Notes */
  const notes = await db
    .select()
    .from(sessionNotesTable)
    .where(eq(sessionNotesTable.studentId, studentId))
    .orderBy(desc(sessionNotesTable.createdAt));

  /* Syllabus (if prep space) */
  const syllabusTopics = student.space === "prep"
    ? await db.select().from(syllabusTopicsTable).where(eq(syllabusTopicsTable.userId, studentId))
    : [];

  /* Assignments (if prep space) */
  const assignments = student.space === "prep"
    ? await db.select().from(assignmentsTable)
        .where(eq(assignmentsTable.userId, studentId))
        .orderBy(desc(assignmentsTable.date))
        .limit(20)
    : [];

  /* Risk flag */
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const recentMoods = moods.filter((m) => m.createdAt >= threeDaysAgo);
  const riskFlag = recentMoods.length >= 3 && recentMoods.slice(0, 3).every((m) => m.mood <= 2);

  res.json({
    student: userToResponse(student),
    moods: moods.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    dailyTracker: dailyTracker.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })),
    sessions: sessions.map((s) => ({
      ...s,
      scheduledAt: s.scheduledAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    })),
    notes: notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
    syllabusTopics: syllabusTopics.map((t) => ({
      ...t,
      updatedAt: t.updatedAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
    })),
    assignments: assignments.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
    riskFlag,
  });
});

export default router;
