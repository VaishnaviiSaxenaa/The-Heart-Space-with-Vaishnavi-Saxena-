import { Router } from "express";
import { db } from "@workspace/db";
import { moodsTable, dailyTrackerTable, sessionsTable, usersTable } from "@workspace/db";
import { eq, desc, gte, and } from "drizzle-orm";
import { userToResponse } from "./auth";

const router = Router();

function buildStructuredSummary(data: {
  studentName: string;
  moods: { mood: number; createdAt: string }[];
  dailyTracker: {
    date: string; sleepHours: number | null; sleepQuality: number | null;
    stressLevel: number | null; emotionalState: string | null; studyHours: number | null;
    physicalActivity: boolean | null;
  }[];
  upcomingSessions: number;
  completedSessions: number;
}): string {
  const { studentName, moods, dailyTracker } = data;

  const avgMood = moods.length
    ? (moods.reduce((s, m) => s + m.mood, 0) / moods.length).toFixed(1)
    : "N/A";

  const sleepEntries = dailyTracker.filter((d) => d.sleepHours != null);
  const avgSleep = sleepEntries.length
    ? (sleepEntries.reduce((s, d) => s + (d.sleepHours ?? 0), 0) / sleepEntries.length).toFixed(1)
    : "N/A";

  const stressEntries = dailyTracker.filter((d) => d.stressLevel != null);
  const avgStress = stressEntries.length
    ? (stressEntries.reduce((s, d) => s + (d.stressLevel ?? 0), 0) / stressEntries.length).toFixed(1)
    : "N/A";

  const moodLow = moods.filter((m) => m.mood <= 2).length;
  const activedays = dailyTracker.filter((d) => d.physicalActivity).length;

  const emotionalStates = dailyTracker
    .filter((d) => d.emotionalState)
    .map((d) => d.emotionalState)
    .slice(0, 5)
    .join(", ");

  return `Pre-Session Summary for ${studentName} (Last 14 Days)

MOOD & WELLBEING
• Average mood score: ${avgMood}/5 (${moods.length} check-ins)
• Low mood days (≤2): ${moodLow} of ${moods.length} logged
• Recent emotional states: ${emotionalStates || "Not logged"}

SLEEP & RECOVERY
• Average sleep: ${avgSleep} hours/night
• Average sleep quality: ${avgSleep !== "N/A" ? "See tracker" : "Not logged"}

STRESS & ACTIVITY
• Average stress level: ${avgStress}/5
• Days with physical activity: ${activedays} of ${dailyTracker.length} logged

SESSIONS
• Upcoming sessions: ${data.upcomingSessions}
• Completed sessions: ${data.completedSessions}

SUGGESTED FOCUS AREAS
${moodLow >= 3 ? "⚠ Persistent low mood — explore triggers and coping strategies\n" : ""}${avgSleep !== "N/A" && parseFloat(avgSleep) < 6 ? "⚠ Sleep below 6 hrs average — address sleep hygiene\n" : ""}${avgStress !== "N/A" && parseFloat(avgStress) >= 4 ? "⚠ High stress — explore stressors and regulation techniques\n" : ""}${moodLow < 2 && parseFloat(avgMood) >= 3.5 ? "✓ Mood is relatively stable — build on positive momentum\n" : ""}

Note: This summary is generated from logged data. Clinical judgement takes precedence.`;
}

router.get("/ai-summary/:studentId", async (req, res) => {
  const studentId = parseInt(req.params.studentId);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid student id" }); return; }

  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, studentId)).limit(1);
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const moods = await db
    .select()
    .from(moodsTable)
    .where(and(eq(moodsTable.studentId, studentId), gte(moodsTable.createdAt, fourteenDaysAgo)))
    .orderBy(desc(moodsTable.createdAt));

  const dailyTracker = await db
    .select()
    .from(dailyTrackerTable)
    .where(and(eq(dailyTrackerTable.userId, studentId), gte(dailyTrackerTable.createdAt, fourteenDaysAgo)))
    .orderBy(desc(dailyTrackerTable.date));

  const allSessions = await db.select().from(sessionsTable).where(eq(sessionsTable.studentId, studentId));
  const upcomingSessions = allSessions.filter((s) => s.status === "scheduled" && s.scheduledAt > now).length;
  const completedSessions = allSessions.filter((s) => s.status === "completed").length;

  const moodsData = moods.map((m) => ({ mood: m.mood, createdAt: m.createdAt.toISOString() }));
  const trackerData = dailyTracker.map((d) => ({
    date: d.date,
    sleepHours: d.sleepHours ?? null,
    sleepQuality: d.sleepQuality ?? null,
    stressLevel: d.stressLevel ?? null,
    emotionalState: d.emotionalState ?? null,
    studyHours: d.studyHours ?? null,
    physicalActivity: d.physicalActivity ?? null,
  }));

  /* Try OpenAI if key is available */
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const prompt = `You are a compassionate counsellor preparing for a session with student ${student.name}.
Here is their data from the last 14 days:

MOOD CHECK-INS (1=very low, 5=excellent):
${moodsData.map((m) => `• ${m.createdAt.split("T")[0]}: ${m.mood}/5`).join("\n") || "None logged"}

DAILY TRACKER:
${trackerData.map((d) => `• ${d.date}: sleep ${d.sleepHours ?? "?"}h (quality ${d.sleepQuality ?? "?"}), stress ${d.stressLevel ?? "?"}/5, activity ${d.physicalActivity ? "yes" : "no"}, feeling: ${d.emotionalState ?? "not noted"}`).join("\n") || "None logged"}

SESSIONS: ${completedSessions} completed, ${upcomingSessions} upcoming

Write a concise, warm pre-session summary (250 words max) for the counsellor covering:
1. Overall wellbeing trends
2. Key concerns or risk indicators
3. Positive developments
4. Suggested focus areas for today's session
Use empathetic, professional language. Do not use markdown headers.`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 400,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const json = (await response.json()) as any;
        const summary = json.choices?.[0]?.message?.content ?? "";
        if (summary) {
          res.json({ summary, aiGenerated: true });
          return;
        }
      }
    } catch {
      /* fall through to structured summary */
    }
  }

  const summary = buildStructuredSummary({
    studentName: student.name,
    moods: moodsData,
    dailyTracker: trackerData,
    upcomingSessions,
    completedSessions,
  });

  res.json({ summary, aiGenerated: false });
});

export default router;
