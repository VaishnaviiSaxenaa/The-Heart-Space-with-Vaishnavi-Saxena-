import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { userToResponse } from "./auth";

const router = Router();

router.get("/users", async (req, res) => {
  const { role, search } = req.query as { role?: string; search?: string };

  let query = db.select().from(usersTable);
  const conditions = [];

  if (role === "student" || role === "counsellor") {
    conditions.push(eq(usersTable.role, role));
  }

  if (search) {
    conditions.push(
      or(
        ilike(usersTable.name, `%${search}%`),
        ilike(usersTable.email, `%${search}%`),
      )!,
    );
  }

  let users;
  if (conditions.length > 0) {
    users = await (query as any).where(conditions.length === 1 ? conditions[0] : conditions[0]);
  } else {
    users = await query;
  }

  res.json(users.map(userToResponse));
});

router.get("/users/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(userToResponse(user));
});

export default router;
