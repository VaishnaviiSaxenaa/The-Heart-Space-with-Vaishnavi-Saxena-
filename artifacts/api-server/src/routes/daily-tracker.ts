import { Router } from "express";
import { db } from "@workspace/db";
import { dailyTrackerTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const upsertSchema = z.object({
  userId: z.number().int(),
  date: z.string().min(1),
  sleepHours: z.number().min(0).max(24).optional(),
  sleepQuality: z.number().int().min(1).max(5).optional(),
  physicalActivity: z.boolean().optional(),
  studyHours: z.number().min(0).max(24).optional(),
  meTimeMinutes: z.number().int().min(0).optional(),
  stressLevel: z.number().int().min(1).max(5).optional(),
  emotionalState: z.string().optional(),
  note: z.string().optional(),
});

router.get("/daily-tracker", async (req, res) => {
  const { userId, limit } = req.query as { userId?: string; limit?: string };
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }

  let query = db
    .select()
    .from(dailyTrackerTable)
    .where(eq(dailyTrackerTable.userId, parseInt(userId)))
    .orderBy(desc(dailyTrackerTable.date));

  const rows = limit ? await query.limit(parseInt(limit)) : await query;
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.get("/daily-tracker/today", async (req, res) => {
  const { userId } = req.query as { userId?: string };
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }

  const today = new Date().toISOString().split("T")[0];
  const [row] = await db
    .select()
    .from(dailyTrackerTable)
    .where(and(eq(dailyTrackerTable.userId, parseInt(userId)), eq(dailyTrackerTable.date, today)))
    .limit(1);

  res.json(row ? { ...row, createdAt: row.createdAt.toISOString() } : null);
});

router.post("/daily-tracker", async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }

  /* Upsert: if entry for that date exists, update it */
  const existing = await db
    .select()
    .from(dailyTrackerTable)
    .where(and(eq(dailyTrackerTable.userId, parsed.data.userId), eq(dailyTrackerTable.date, parsed.data.date)))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(dailyTrackerTable)
      .set(parsed.data)
      .where(eq(dailyTrackerTable.id, existing[0].id))
      .returning();
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } else {
    const [row] = await db.insert(dailyTrackerTable).values(parsed.data).returning();
    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
  }
});

export default router;
