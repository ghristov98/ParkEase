import { Router } from "express";
import { db } from "@workspace/db";
import { parkingExtrasTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";

const router = Router();

router.get("/extras", requireAuth, async (_req, res): Promise<void> => {
  const extras = await db.select().from(parkingExtrasTable).orderBy(parkingExtrasTable.name);
  res.json(extras);
});

router.post("/extras", requireSuperAdmin, async (req, res): Promise<void> => {
  const { name, icon, description } = req.body;
  if (!name) { res.status(400).json({ error: "validation_error", message: "Name is required" }); return; }
  const [extra] = await db.insert(parkingExtrasTable).values({ name, icon, description }).returning();
  res.status(201).json(extra);
});

router.put("/extras/:id", requireSuperAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
  const { name, icon, description } = req.body;
  const [extra] = await db.update(parkingExtrasTable).set({ name, icon, description }).where(eq(parkingExtrasTable.id, id)).returning();
  if (!extra) { res.status(404).json({ error: "not_found", message: "Extra not found" }); return; }
  res.json(extra);
});

router.delete("/extras/:id", requireSuperAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
  const [extra] = await db.delete(parkingExtrasTable).where(eq(parkingExtrasTable.id, id)).returning();
  if (!extra) { res.status(404).json({ error: "not_found", message: "Extra not found" }); return; }
  res.json({ message: "Extra deleted" });
});

export default router;
