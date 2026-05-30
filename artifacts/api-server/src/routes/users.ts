import { Router } from "express";
import path from "path";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, ilike, or, count, sql } from "drizzle-orm";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";
import { upload, getFileUrl } from "../lib/upload";

const router = Router();

function safeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash, verificationCode, verificationExpiresAt, resetToken, resetTokenExpiresAt, ...safe } = user;
  return safe;
}

router.get("/users", requireSuperAdmin, async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query["page"]) || 1);
  const limit = Math.min(100, Number(req.query["limit"]) || 20);
  const search = req.query["search"] as string | undefined;
  const offset = (page - 1) * limit;

  let query = db.select().from(usersTable);
  let countQuery = db.select({ count: count() }).from(usersTable);

  if (search) {
    const pattern = `%${search}%`;
    const where = or(ilike(usersTable.firstName, pattern), ilike(usersTable.lastName, pattern), ilike(usersTable.email, pattern));
    query = query.where(where) as typeof query;
    countQuery = countQuery.where(where) as typeof countQuery;
  }

  const [users, [{ count: total }]] = await Promise.all([
    query.limit(limit).offset(offset).orderBy(usersTable.createdAt),
    countQuery,
  ]);

  res.json({ users: users.map(safeUser), total: Number(total), page, totalPages: Math.ceil(Number(total) / limit) });
});

router.get("/users/stats", requireSuperAdmin, async (req, res): Promise<void> => {
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
  const [all, active, verified, newThisMonth] = await Promise.all([
    db.select({ count: count() }).from(usersTable),
    db.select({ count: count() }).from(usersTable).where(eq(usersTable.isActive, true)),
    db.select({ count: count() }).from(usersTable).where(eq(usersTable.isVerified, true)),
    db.select({ count: count() }).from(usersTable).where(sql`${usersTable.createdAt} >= ${startOfMonth}`),
  ]);
  res.json({ total: Number(all[0]!.count), active: Number(active[0]!.count), verified: Number(verified[0]!.count), newThisMonth: Number(newThisMonth[0]!.count) });
});

router.get("/users/profile", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) { res.status(404).json({ error: "not_found", message: "User not found" }); return; }
  res.json(safeUser(user));
});

router.put("/users/profile", requireAuth, async (req, res): Promise<void> => {
  const { firstName, lastName, phone } = req.body;
  const [user] = await db.update(usersTable).set({ firstName, lastName, phone }).where(eq(usersTable.id, req.user!.userId)).returning();
  if (!user) { res.status(404).json({ error: "not_found", message: "User not found" }); return; }
  res.json(safeUser(user));
});

router.post("/users/profile/photo", requireAuth, upload.single("photo"), async (req, res): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "no_file", message: "No photo uploaded" }); return; }
  const url = getFileUrl(req, req.file.filename);
  await db.update(usersTable).set({ photoUrl: url }).where(eq(usersTable.id, req.user!.userId));
  res.json({ url });
});

router.get("/users/:id", requireSuperAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id!)).limit(1);
  if (!user) { res.status(404).json({ error: "not_found", message: "User not found" }); return; }
  res.json(safeUser(user));
});

router.put("/users/:id", requireSuperAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { firstName, lastName, phone, isActive, role } = req.body;
  const [user] = await db.update(usersTable).set({ firstName, lastName, phone, isActive, role }).where(eq(usersTable.id, id!)).returning();
  if (!user) { res.status(404).json({ error: "not_found", message: "User not found" }); return; }
  res.json(safeUser(user));
});

router.delete("/users/:id", requireSuperAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [user] = await db.delete(usersTable).where(eq(usersTable.id, id!)).returning();
  if (!user) { res.status(404).json({ error: "not_found", message: "User not found" }); return; }
  res.json({ message: "User deleted successfully" });
});

export default router;
