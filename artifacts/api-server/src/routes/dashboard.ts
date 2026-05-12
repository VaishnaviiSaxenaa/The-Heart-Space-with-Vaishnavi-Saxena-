import { Router } from "express";
import { db } from "@workspace/db";
import { sessionsTable, usersTable, moodsTable, dailyTrackerTable } from "@workspace/db";
import { eq, desc, count, avg, and, gte } from "drizzle-orm";
import { userToResponse } from "./auth";

const router = Router();

async function sessionWithUsers(session: typeof sessionsTable.$inferSelect) {
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, session.studentId)).limit(1);
  const [counsellor] = await db.select().from(usersTable).where(eq(usersTable.id, session.counsellorId)).limit(1);
  return {
    ...session,
    scheduledAt: session.scheduledAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    notes: session.notes ?? null,
    topic: session.topic ?? null,
    student: student ? userToResponse(student) : null,
    counsellor: counsellor ? userToResponse(counsellor) : null,
  };
}

router.get("/dashboard/summary", async (req, res) => {
  const { studentId } = req.query as { studentId?: string };

  const allSessions = studentId
    ? await db.select().from(sessionsTable).where(eq(sessionsTable.studentId, parseInt(studentId)))
    : await db.select().from(sessionsTable);

  const now = new Date();
  const upcoming = allSessions.filter((s) => s.status === "scheduled" && s.scheduledAt > now);
  const completed = allSessions.filter((s) => s.status === "completed");

  const recentRaw = allSessions
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);
  const recentSessions = await Promise.all(recentRaw.map(sessionWithUsers));

  let averageMood: number | null = null;
  if (studentId) {
    const [moodAvg] = await db
      .select({ avg: avg(moodsTable.mood) })
      .from(moodsTable)
      .where(eq(moodsTable.studentId, parseInt(studentId)));
    averageMood = moodAvg?.avg ? parseFloat(String(moodAvg.avg)) : null;
  }

  const [countResult] = await db.select({ c: count() }).from(usersTable).where(eq(usersTable.role, "student"));

  res.json({
    totalSessions: allSessions.length,
    upcomingSessions: upcoming.length,
    completedSessions: completed.length,
    averageMood,
    recentSessions,
    totalStudents: countResult?.c ?? 0,
  });
});

router.get("/dashboard/students-overview", async (_req, res) => {
  const students = await db.select().from(usersTable).where(eq(usersTable.role, "student"));
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const overviews = await Promise.all(
    students.map(async (student) => {
      const sessions = await db.select().from(sessionsTable).where(eq(sessionsTable.studentId, student.id));
      const upcoming = sessions
        .filter((s) => s.status === "scheduled" && s.scheduledAt > now)
        .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
      const completed = sessions.filter((s) => s.status === "completed");
      const lastCompleted = completed.sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())[0];

      const [latestMoodRow] = await db
        .select()
        .from(moodsTable)
        .where(eq(moodsTable.studentId, student.id))
        .orderBy(desc(moodsTable.createdAt))
        .limit(1);

      /* 7-day mood average */
      const [moodAvgRow] = await db
        .select({ avg: avg(moodsTable.mood) })
        .from(moodsTable)
        .where(and(eq(moodsTable.studentId, student.id), gte(moodsTable.createdAt, sevenDaysAgo)));
      const moodAvg = moodAvgRow?.avg ? parseFloat(String(moodAvgRow.avg)) : null;

      /* Risk flag: mood ≤ 2 for last 3 days (need ≥ 1 entry each day) */
      const recentMoods = await db
        .select()
        .from(moodsTable)
        .where(and(eq(moodsTable.studentId, student.id), gte(moodsTable.createdAt, threeDaysAgo)))
        .orderBy(desc(moodsTable.createdAt));
      const riskFlag = recentMoods.length >= 3 && recentMoods.slice(0, 3).every((m) => m.mood <= 2);

      /* 7-day sleep average from daily tracker */
      const [sleepAvgRow] = await db
        .select({ avg: avg(dailyTrackerTable.sleepHours) })
        .from(dailyTrackerTable)
        .where(and(eq(dailyTrackerTable.userId, student.id), gte(dailyTrackerTable.createdAt, sevenDaysAgo)));
      const sleepAvg = sleepAvgRow?.avg ? parseFloat(String(sleepAvgRow.avg)) : null;

      let upcomingSession = null;
      if (upcoming[0]) {
        upcomingSession = await sessionWithUsers(upcoming[0]);
      }

      return {
        student: userToResponse(student),
        totalSessions: sessions.length,
        lastSession: lastCompleted?.scheduledAt.toISOString() ?? null,
        latestMood: latestMoodRow?.mood ?? null,
        moodAvg,
        sleepAvg,
        riskFlag,
        upcomingSession,
      };
    }),
  );

  res.json(overviews);
});

export default router;
