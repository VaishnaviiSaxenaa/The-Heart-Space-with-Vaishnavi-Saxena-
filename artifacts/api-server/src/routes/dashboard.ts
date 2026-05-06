import { Router } from "express";
import { db } from "@workspace/db";
import { sessionsTable, usersTable, moodsTable } from "@workspace/db";
import { eq, desc, count, avg } from "drizzle-orm";

const router = Router();

function userToResponse(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

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

      let upcomingSession = null;
      if (upcoming[0]) {
        upcomingSession = await sessionWithUsers(upcoming[0]);
      }

      return {
        student: userToResponse(student),
        totalSessions: sessions.length,
        lastSession: lastCompleted?.scheduledAt.toISOString() ?? null,
        latestMood: latestMoodRow?.mood ?? null,
        upcomingSession,
      };
    }),
  );

  res.json(overviews);
});

export default router;
