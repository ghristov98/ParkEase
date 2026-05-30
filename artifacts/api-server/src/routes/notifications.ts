import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";

const router = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query["page"]) || 1);
  const limit = Math.min(100, Number(req.query["limit"]) || 50);
  const offset = (page - 1) * limit;

  const [notifications, [{ count: total }]] = await Promise.all([
    db.select().from(notificationsTable).where(eq(notificationsTable.userId, req.user!.userId)).orderBy(notificationsTable.createdAt).limit(limit).offset(offset),
    db.select({ count: count() }).from(notificationsTable).where(eq(notificationsTable.userId, req.user!.userId)),
  ]);

  res.json({ notifications, total: Number(total), page, totalPages: Math.ceil(Number(total) / limit) });
});

router.get("/notifications/unread-count", requireAuth, async (req, res): Promise<void> => {
  const [{ count: unread }] = await db.select({ count: count() }).from(notificationsTable)
    .where(and(eq(notificationsTable.userId, req.user!.userId), eq(notificationsTable.isRead, false)));
  res.json({ count: Number(unread) });
});

router.post("/notifications", requireSuperAdmin, async (req, res): Promise<void> => {
  const { title, body, type, userIds, linkType, linkId } = req.body;
  if (!title || !body) { res.status(400).json({ error: "validation_error", message: "Title and body required" }); return; }

  let targetIds: string[] = userIds ?? [];
  if (targetIds.length === 0) {
    const users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.isActive, true));
    targetIds = users.map(u => u.id);
  }

  if (targetIds.length > 0) {
    await db.insert(notificationsTable).values(targetIds.map(userId => ({ userId, title, body, type: type || "general", linkType, linkId })));
  }

  res.status(201).json({ message: `Notification sent to ${targetIds.length} user(s)` });
});

router.put("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, req.user!.userId));
  res.json({ message: "All notifications marked as read" });
});

router.put("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
  const [notification] = await db.update(notificationsTable).set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.user!.userId)))
    .returning();
  if (!notification) { res.status(404).json({ error: "not_found", message: "Notification not found" }); return; }
  res.json(notification);
});

export default router;
