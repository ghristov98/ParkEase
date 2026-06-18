import { Router } from "express";
import { db } from "@workspace/db";
import { favouritesTable, parkingLotsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/favourites", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select({ favourite: favouritesTable, lot: parkingLotsTable })
    .from(favouritesTable)
    .innerJoin(parkingLotsTable, eq(favouritesTable.parkingLotId, parkingLotsTable.id))
    .where(eq(favouritesTable.userId, req.user!.userId))
    .orderBy(favouritesTable.createdAt);
  res.json(rows.map((r) => ({ ...r.lot, favouriteId: r.favourite.id, favouritedAt: r.favourite.createdAt })));
});

router.get("/favourites/:lotId/check", requireAuth, async (req, res): Promise<void> => {
  const lotId = Array.isArray(req.params.lotId) ? req.params.lotId[0]! : req.params.lotId!;
  const [row] = await db
    .select()
    .from(favouritesTable)
    .where(and(eq(favouritesTable.userId, req.user!.userId), eq(favouritesTable.parkingLotId, lotId)))
    .limit(1);
  res.json({ isFavourite: !!row });
});

router.post("/favourites/:lotId", requireAuth, async (req, res): Promise<void> => {
  const lotId = Array.isArray(req.params.lotId) ? req.params.lotId[0]! : req.params.lotId!;
  try {
    const [row] = await db
      .insert(favouritesTable)
      .values({ userId: req.user!.userId, parkingLotId: lotId })
      .returning();
    res.status(201).json(row);
  } catch {
    res.status(409).json({ error: "conflict", message: "Already in favourites" });
  }
});

router.delete("/favourites/:lotId", requireAuth, async (req, res): Promise<void> => {
  const lotId = Array.isArray(req.params.lotId) ? req.params.lotId[0]! : req.params.lotId!;
  await db
    .delete(favouritesTable)
    .where(and(eq(favouritesTable.userId, req.user!.userId), eq(favouritesTable.parkingLotId, lotId)));
  res.json({ message: "Removed from favourites" });
});

export default router;
