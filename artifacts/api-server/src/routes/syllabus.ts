import { Router } from "express";
import { db } from "@workspace/db";
import { syllabusTopicsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const createSchema = z.object({
  userId: z.number().int(),
  subject: z.string().min(1),
  topic: z.string().min(1),
  status: z.enum(["not_started", "theory_in_progress", "theory_done", "practicing", "mastered"]).optional(),
  confidence: z.number().int().min(0).max(5).optional(),
  dailyRevision: z.boolean().optional(),
  weeklyRevision: z.boolean().optional(),
});

const updateSchema = z.object({
  status: z.enum(["not_started", "theory_in_progress", "theory_done", "practicing", "mastered"]).optional(),
  confidence: z.number().int().min(0).max(5).optional(),
  dailyRevision: z.boolean().optional(),
  weeklyRevision: z.boolean().optional(),
});

router.get("/syllabus", async (req, res) => {
  const { userId, subject } = req.query as { userId?: string; subject?: string };
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }

  const conditions = [eq(syllabusTopicsTable.userId, parseInt(userId))];
  if (subject) conditions.push(eq(syllabusTopicsTable.subject, subject));

  const rows = await db
    .select()
    .from(syllabusTopicsTable)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions));

  res.json(rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString(), createdAt: r.createdAt.toISOString() })));
});

router.post("/syllabus", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  const [row] = await db.insert(syllabusTopicsTable).values(parsed.data).returning();
  res.status(201).json({ ...row, updatedAt: row.updatedAt.toISOString(), createdAt: row.createdAt.toISOString() });
});

router.patch("/syllabus/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  const [updated] = await db
    .update(syllabusTopicsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(syllabusTopicsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Topic not found" }); return; }
  res.json({ ...updated, updatedAt: updated.updatedAt.toISOString(), createdAt: updated.createdAt.toISOString() });
});

router.delete("/syllabus/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(syllabusTopicsTable).where(eq(syllabusTopicsTable.id, id));
  res.json({ success: true });
});

export default router;
