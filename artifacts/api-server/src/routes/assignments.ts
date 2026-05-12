import { Router } from "express";
import { db } from "@workspace/db";
import { assignmentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const createSchema = z.object({
  userId: z.number().int(),
  subject: z.string().min(1),
  topic: z.string().min(1),
  date: z.string().min(1),
  questionsAttempted: z.number().int().min(0),
  questionsCorrect: z.number().int().min(0),
  approach: z.enum(["confused", "partial", "clear", "strong"]),
  speed: z.enum(["slow", "moderate", "fast", "exam_ready"]),
});

router.get("/assignments", async (req, res) => {
  const { userId, limit } = req.query as { userId?: string; limit?: string };
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }

  let query = db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.userId, parseInt(userId)))
    .orderBy(desc(assignmentsTable.createdAt));

  const rows = limit ? await query.limit(parseInt(limit)) : await query;
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/assignments", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  const [row] = await db.insert(assignmentsTable).values(parsed.data).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/assignments/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(assignmentsTable).where(eq(assignmentsTable.id, id));
  res.json({ success: true });
});

export default router;
