import { Router } from "express";
import { db } from "@workspace/db";
import { parkingEventsTable } from "@workspace/db";
import { eq, lte, gte, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/events/active", async (_req, res): Promise<void> => {
  const now = new Date();
  const rows = await db
    .select()
    .from(parkingEventsTable)
    .where(and(lte(parkingEventsTable.startTime, now), gte(parkingEventsTable.endTime, now)));
  res.json(rows);
});

router.get("/events", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "superadmin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const rows = await db.select().from(parkingEventsTable).orderBy(parkingEventsTable.startTime);
  res.json(rows);
});

router.post("/events", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "superadmin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const { title, message, zone, startTime, endTime } = req.body;
  if (!title || !message || !startTime || !endTime) {
    res.status(400).json({ error: "validation_error", message: "title, message, startTime, endTime required" });
    return;
  }
  const [row] = await db
    .insert(parkingEventsTable)
    .values({ title, message, zone: zone ?? null, startTime: new Date(startTime), endTime: new Date(endTime), createdBy: req.user!.userId })
    .returning();
  res.status(201).json(row);
});

router.delete("/events/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "superadmin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
  await db.delete(parkingEventsTable).where(eq(parkingEventsTable.id, id));
  res.json({ message: "Deleted" });
});

export default router;
