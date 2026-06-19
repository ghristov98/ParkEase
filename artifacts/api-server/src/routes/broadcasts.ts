import { Router } from "express";
import { db } from "@workspace/db";
import { broadcastsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/broadcasts", async (_req, res): Promise<void> => {
  const rows = await db.select().from(broadcastsTable).orderBy(desc(broadcastsTable.createdAt));
  res.json(rows);
});

router.post("/broadcasts", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "superadmin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const { title, body } = req.body;
  if (!title || !body) {
    res.status(400).json({ error: "validation_error", message: "title and body required" });
    return;
  }
  const [row] = await db
    .insert(broadcastsTable)
    .values({ title, body, createdBy: req.user!.userId })
    .returning();
  res.status(201).json(row);
});

router.delete("/broadcasts/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "superadmin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
  await db.delete(broadcastsTable).where(eq(broadcastsTable.id, id));
  res.json({ message: "Deleted" });
});

export default router;
