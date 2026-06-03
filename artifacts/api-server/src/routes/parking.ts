import { Router } from "express";
import { db } from "@workspace/db";
import { parkingLotsTable, parkingExtrasTable, parkingLotExtrasTable } from "@workspace/db";
import { eq, ilike, or, count, sql, inArray } from "drizzle-orm";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";
import { upload, getFileUrl } from "../lib/upload";

const router = Router();

async function getLotWithExtras(id: string) {
  const [lot] = await db.select().from(parkingLotsTable).where(eq(parkingLotsTable.id, id)).limit(1);
  if (!lot) return null;
  const junctions = await db.select().from(parkingLotExtrasTable).where(eq(parkingLotExtrasTable.parkingLotId, id));
  const extraIds = junctions.map(j => j.extraId);
  const extras = extraIds.length > 0 ? await db.select().from(parkingExtrasTable).where(inArray(parkingExtrasTable.id, extraIds)) : [];
  return { ...lot, extras };
}

router.get("/parking", requireAuth, async (req, res): Promise<void> => {
  const { search, type } = req.query as Record<string, string>;
  let query = db.select().from(parkingLotsTable);

  const conditions: ReturnType<typeof ilike>[] = [];
  if (search) conditions.push(or(ilike(parkingLotsTable.name, `%${search}%`), ilike(parkingLotsTable.address, `%${search}%`))!);
  if (type) conditions.push(eq(parkingLotsTable.type, type) as any);

  if (conditions.length > 0) query = query.where(conditions.length === 1 ? conditions[0]! : sql`${conditions[0]} AND ${conditions[1]}`) as any;

  const lots = await query.orderBy(parkingLotsTable.createdAt);
  const result = await Promise.all(lots.map(lot => getLotWithExtras(lot.id)));
  res.json(result.filter(Boolean));
});

router.get("/parking/stats", requireSuperAdmin, async (req, res): Promise<void> => {
  const [all, free, paid] = await Promise.all([
    db.select({ count: count() }).from(parkingLotsTable),
    db.select({ count: count() }).from(parkingLotsTable).where(eq(parkingLotsTable.type, "free")),
    db.select({ count: count() }).from(parkingLotsTable).where(eq(parkingLotsTable.type, "paid")),
  ]);
  res.json({ total: Number(all[0]!.count), free: Number(free[0]!.count), paid: Number(paid[0]!.count) });
});

router.get("/parking/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
  const lot = await getLotWithExtras(id);
  if (!lot) { res.status(404).json({ error: "not_found", message: "Parking lot not found" }); return; }
  res.json(lot);
});

router.post("/parking", requireSuperAdmin, async (req, res): Promise<void> => {
  const {
    name, address, latitude, longitude, type, description, extraIds,
    openingHours, hasSecurityGuard, hasCCTV, hasLighting, isCovered, hasEVCharging, hasDisabledAccess,
  } = req.body;
  if (!name || !address || latitude == null || longitude == null || !type) {
    res.status(400).json({ error: "validation_error", message: "Required fields missing" });
    return;
  }

  const [lot] = await db.insert(parkingLotsTable).values({
    name, address, latitude, longitude, type, description,
    openingHours: openingHours || null,
    hasSecurityGuard: !!hasSecurityGuard,
    hasCCTV: !!hasCCTV,
    hasLighting: !!hasLighting,
    isCovered: !!isCovered,
    hasEVCharging: !!hasEVCharging,
    hasDisabledAccess: !!hasDisabledAccess,
  }).returning();
  if (extraIds?.length > 0) {
    await db.insert(parkingLotExtrasTable).values(extraIds.map((eid: string) => ({ parkingLotId: lot!.id, extraId: eid })));
  }
  const result = await getLotWithExtras(lot!.id);
  res.status(201).json(result);
});

router.put("/parking/:id", requireSuperAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
  const {
    name, address, latitude, longitude, type, description, extraIds,
    openingHours, hasSecurityGuard, hasCCTV, hasLighting, isCovered, hasEVCharging, hasDisabledAccess,
    mainPhotoIndex,
  } = req.body;

  const [lot] = await db.update(parkingLotsTable).set({
    name, address, latitude, longitude, type, description,
    ...(openingHours !== undefined ? { openingHours: openingHours || null } : {}),
    ...(hasSecurityGuard !== undefined ? { hasSecurityGuard: !!hasSecurityGuard } : {}),
    ...(hasCCTV !== undefined ? { hasCCTV: !!hasCCTV } : {}),
    ...(hasLighting !== undefined ? { hasLighting: !!hasLighting } : {}),
    ...(isCovered !== undefined ? { isCovered: !!isCovered } : {}),
    ...(hasEVCharging !== undefined ? { hasEVCharging: !!hasEVCharging } : {}),
    ...(hasDisabledAccess !== undefined ? { hasDisabledAccess: !!hasDisabledAccess } : {}),
    ...(mainPhotoIndex !== undefined ? { mainPhotoIndex: Number(mainPhotoIndex) } : {}),
  }).where(eq(parkingLotsTable.id, id)).returning();
  if (!lot) { res.status(404).json({ error: "not_found", message: "Parking lot not found" }); return; }

  if (Array.isArray(extraIds)) {
    await db.delete(parkingLotExtrasTable).where(eq(parkingLotExtrasTable.parkingLotId, id));
    if (extraIds.length > 0) {
      await db.insert(parkingLotExtrasTable).values(extraIds.map((eid: string) => ({ parkingLotId: id, extraId: eid })));
    }
  }

  const result = await getLotWithExtras(id);
  res.json(result);
});

router.delete("/parking/:id", requireSuperAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
  const [lot] = await db.delete(parkingLotsTable).where(eq(parkingLotsTable.id, id)).returning();
  if (!lot) { res.status(404).json({ error: "not_found", message: "Parking lot not found" }); return; }
  res.json({ message: "Parking lot deleted" });
});

router.post("/parking/:id/photos", requireSuperAdmin, upload.single("photo"), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
  if (!req.file) { res.status(400).json({ error: "no_file", message: "No photo uploaded" }); return; }

  const [lot] = await db.select().from(parkingLotsTable).where(eq(parkingLotsTable.id, id)).limit(1);
  if (!lot) { res.status(404).json({ error: "not_found", message: "Parking lot not found" }); return; }

  const url = getFileUrl(req, req.file.filename);
  await db.update(parkingLotsTable).set({ photos: [...lot.photos, url] }).where(eq(parkingLotsTable.id, id));
  res.json({ url });
});

export default router;
