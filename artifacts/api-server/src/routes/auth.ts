import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "heartspace_salt").digest("hex");
}

function makeToken(userId: number): string {
  return Buffer.from(`${userId}:${Date.now()}:heartspace`).toString("base64");
}

export function userToResponse(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    space: user.space ?? null,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["student", "counsellor"]),
});

router.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { email, password, role } = parsed.data;
  const hash = hashPassword(password);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

  if (!user || user.passwordHash !== hash || user.role !== role) {
    res.status(401).json({ error: "Invalid email, password, or user type" });
    return;
  }

  res.json({ user: userToResponse(user), token: makeToken(user.id) });
});

router.post("/auth/logout", async (_req, res) => {
  res.json({ success: true });
});

router.get("/auth/me", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const token = auth.slice(7);
  let userId: number;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    userId = parseInt(decoded.split(":")[0]);
    if (isNaN(userId)) throw new Error("invalid");
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json(userToResponse(user));
});

export default router;
