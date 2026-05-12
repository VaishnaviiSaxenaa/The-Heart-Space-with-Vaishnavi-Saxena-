import { Router } from "express";
import { db } from "@workspace/db";
import { sessionNotesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const createSchema = z.object({
  counsellorId: z.number().int(),
  studentId: z.number().int(),
  sessionId: z.number().int().optional(),
  type: z.enum(["session_note", "intervention"]).default("session_note"),
  content: z.string().min(1),
  visibleToStudent: z.boolean().default(false),
});

const updateSchema = z.object({
  content: z.string().min(1).optional(),
  visibleToStudent: z.boolean().optional(),
});

router.get("/notes", async (req, res) => {
  const { studentId, counsellorId, type } = req.query as {
    studentId?: string; counsellorId?: string; type?: string;
  };

  const conditions = [];
  if (studentId) conditions.push(eq(sessionNotesTable.studentId, parseInt(studentId)));
  if (counsellorId) conditions.push(eq(sessionNotesTable.counsellorId, parseInt(counsellorId)));
  if (type === "session_note" || type === "intervention") {
    conditions.push(eq(sessionNotesTable.type, type));
  }

  let rows;
  if (conditions.length === 0) {
    rows = await db.select().from(sessionNotesTable).orderBy(desc(sessionNotesTable.createdAt));
  } else if (conditions.length === 1) {
    rows = await db.select().from(sessionNotesTable).where(conditions[0]).orderBy(desc(sessionNotesTable.createdAt));
  } else {
    rows = await db.select().from(sessionNotesTable).where(and(...conditions)).orderBy(desc(sessionNotesTable.createdAt));
  }

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/notes", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  const [row] = await db.insert(sessionNotesTable).values(parsed.data).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.patch("/notes/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  const [updated] = await db
    .update(sessionNotesTable)
    .set(parsed.data)
    .where(eq(sessionNotesTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Note not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.delete("/notes/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(sessionNotesTable).where(eq(sessionNotesTable.id, id));
  res.json({ success: true });
});

export default router;
