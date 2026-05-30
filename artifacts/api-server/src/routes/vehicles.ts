import { Router } from "express";
import { db } from "@workspace/db";
import { vehiclesTable, vehicleHistoryTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";
import { upload, getFileUrl } from "../lib/upload";

const router = Router();

async function logHistory(vehicleId: string, eventType: string, description: string, metadata?: object) {
  await db.insert(vehicleHistoryTable).values({ vehicleId, eventType, description, metadata: metadata ?? null });
}

router.get("/vehicles", requireAuth, async (req, res): Promise<void> => {
  const vehicles = await db.select().from(vehiclesTable).where(eq(vehiclesTable.userId, req.user!.userId)).orderBy(vehiclesTable.createdAt);
  res.json(vehicles);
});

router.get("/vehicles/all", requireSuperAdmin, async (_req, res): Promise<void> => {
  const vehicles = await db.select().from(vehiclesTable).orderBy(vehiclesTable.createdAt);
  res.json(vehicles);
});

router.post("/vehicles", requireAuth, async (req, res): Promise<void> => {
  const { name, licensePlate, brand, model, year, color } = req.body;
  if (!name || !licensePlate || !brand || !model || !year || !color) {
    res.status(400).json({ error: "validation_error", message: "All fields are required" });
    return;
  }
  const [vehicle] = await db.insert(vehiclesTable).values({ userId: req.user!.userId, name, licensePlate, brand, model, year: Number(year), color }).returning();
  await logHistory(vehicle!.id, "created", `Vehicle ${name} added`);
  res.status(201).json(vehicle);
});

router.get("/vehicles/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, id)).limit(1);
  if (!vehicle) { res.status(404).json({ error: "not_found", message: "Vehicle not found" }); return; }
  if (vehicle.userId !== req.user!.userId && req.user!.role !== "superadmin") {
    res.status(403).json({ error: "forbidden", message: "Access denied" }); return;
  }
  res.json(vehicle);
});

router.put("/vehicles/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
  const [existing] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "not_found", message: "Vehicle not found" }); return; }
  if (existing.userId !== req.user!.userId) { res.status(403).json({ error: "forbidden", message: "Access denied" }); return; }

  const { name, licensePlate, brand, model, year, color } = req.body;
  const [vehicle] = await db.update(vehiclesTable).set({ name, licensePlate, brand, model, year: year ? Number(year) : undefined, color }).where(eq(vehiclesTable.id, id)).returning();
  await logHistory(id, "updated", `Vehicle details updated`);
  res.json(vehicle);
});

router.delete("/vehicles/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
  const [existing] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "not_found", message: "Vehicle not found" }); return; }
  if (existing.userId !== req.user!.userId && req.user!.role !== "superadmin") {
    res.status(403).json({ error: "forbidden", message: "Access denied" }); return;
  }
  await db.delete(vehiclesTable).where(eq(vehiclesTable.id, id));
  res.json({ message: "Vehicle deleted" });
});

router.put("/vehicles/:id/location", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
  const [existing] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "not_found", message: "Vehicle not found" }); return; }
  if (existing.userId !== req.user!.userId) { res.status(403).json({ error: "forbidden", message: "Only the owner can update vehicle location" }); return; }

  const { latitude, longitude, address } = req.body;
  if (latitude == null || longitude == null) {
    res.status(400).json({ error: "validation_error", message: "Latitude and longitude required" }); return;
  }

  const [vehicle] = await db.update(vehiclesTable).set({ latitude, longitude, locationAddress: address }).where(eq(vehiclesTable.id, id)).returning();
  await logHistory(id, "location_updated", `Location updated to ${address || `${latitude}, ${longitude}`}`, { latitude, longitude, address });
  res.json(vehicle);
});

router.get("/vehicles/:id/history", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
  const [existing] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "not_found", message: "Vehicle not found" }); return; }
  if (existing.userId !== req.user!.userId && req.user!.role !== "superadmin") {
    res.status(403).json({ error: "forbidden", message: "Access denied" }); return;
  }

  const page = Math.max(1, Number(req.query["page"]) || 1);
  const limit = Math.min(100, Number(req.query["limit"]) || 20);
  const offset = (page - 1) * limit;

  const [events, [{ count: total }]] = await Promise.all([
    db.select().from(vehicleHistoryTable).where(eq(vehicleHistoryTable.vehicleId, id)).orderBy(vehicleHistoryTable.createdAt).limit(limit).offset(offset),
    db.select({ count: count() }).from(vehicleHistoryTable).where(eq(vehicleHistoryTable.vehicleId, id)),
  ]);

  res.json({ events, total: Number(total), page, totalPages: Math.ceil(Number(total) / limit) });
});

router.post("/vehicles/:id/photo", requireAuth, upload.single("photo"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
  if (!req.file) { res.status(400).json({ error: "no_file", message: "No photo uploaded" }); return; }
  const [existing] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "not_found", message: "Vehicle not found" }); return; }
  if (existing.userId !== req.user!.userId) { res.status(403).json({ error: "forbidden", message: "Access denied" }); return; }

  const url = getFileUrl(req, req.file.filename);
  await db.update(vehiclesTable).set({ photoUrl: url }).where(eq(vehiclesTable.id, id));
  await logHistory(id, "photo_updated", "Vehicle photo updated");
  res.json({ url });
});

export default router;
