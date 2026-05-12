import { Router } from "express";
import { db } from "@workspace/db";
import { sessionsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
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

const createSessionSchema = z.object({
  studentId: z.number().int(),
  counsellorId: z.number().int(),
  scheduledAt: z.string(),
  durationMinutes: z.number().int().default(50),
  topic: z.string().optional(),
});

const updateSessionSchema = z.object({
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
  scheduledAt: z.string().optional(),
});

router.get("/sessions", async (req, res) => {
  const { studentId, status } = req.query as { studentId?: string; status?: string };
  const conditions = [];

  if (studentId) conditions.push(eq(sessionsTable.studentId, parseInt(studentId)));
  if (status === "scheduled" || status === "completed" || status === "cancelled") {
    conditions.push(eq(sessionsTable.status, status));
  }

  let rows;
  if (conditions.length === 0) {
    rows = await db.select().from(sessionsTable);
  } else if (conditions.length === 1) {
    rows = await db.select().from(sessionsTable).where(conditions[0]);
  } else {
    rows = await db.select().from(sessionsTable).where(and(...conditions));
  }

  const results = await Promise.all(rows.map(sessionWithUsers));
  res.json(results);
});

router.post("/sessions", async (req, res) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { scheduledAt, ...rest } = parsed.data;
  const [session] = await db
    .insert(sessionsTable)
    .values({ ...rest, scheduledAt: new Date(scheduledAt) })
    .returning();
  res.status(201).json(await sessionWithUsers(session));
});

router.get("/sessions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id)).limit(1);
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(await sessionWithUsers(session));
});

router.patch("/sessions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = updateSessionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }

  const { scheduledAt, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);

  const [updated] = await db.update(sessionsTable).set(updateData).where(eq(sessionsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(await sessionWithUsers(updated));
});

export default router;
