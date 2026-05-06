import { Router } from "express";
import { db } from "@workspace/db";
import { moodsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const createMoodSchema = z.object({
  studentId: z.number().int(),
  mood: z.number().int().min(1).max(5),
  note: z.string().optional(),
});

router.get("/moods", async (req, res) => {
  const { studentId, limit } = req.query as { studentId?: string; limit?: string };
  let query = db.select().from(moodsTable).orderBy(desc(moodsTable.createdAt));

  let rows;
  if (studentId) {
    const q = query.where(eq(moodsTable.studentId, parseInt(studentId)));
    rows = limit ? await q.limit(parseInt(limit)) : await q;
  } else {
    rows = limit ? await query.limit(parseInt(limit)) : await query;
  }

  res.json(
    rows.map((m) => ({
      ...m,
      note: m.note ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  );
});

router.post("/moods", async (req, res) => {
  const parsed = createMoodSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [mood] = await db.insert(moodsTable).values(parsed.data).returning();
  res.status(201).json({ ...mood, note: mood.note ?? null, createdAt: mood.createdAt.toISOString() });
});

export default router;
