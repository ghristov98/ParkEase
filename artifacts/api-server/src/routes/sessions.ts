import { Router } from "express";
import { db } from "@workspace/db";
import { parkingSessionsTable, notificationsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/sessions/active", requireAuth, async (req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(parkingSessionsTable)
    .where(and(eq(parkingSessionsTable.userId, req.user!.userId), eq(parkingSessionsTable.status, "active")));
  res.json(sessions);
});

router.get("/sessions", requireAuth, async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query["page"]) || 1);
  const limit = Math.min(100, Number(req.query["limit"]) || 20);
  const offset = (page - 1) * limit;

  const sessions = await db
    .select()
    .from(parkingSessionsTable)
    .where(eq(parkingSessionsTable.userId, req.user!.userId))
    .orderBy(parkingSessionsTable.createdAt)
    .limit(limit)
    .offset(offset);

  res.json({ sessions, page });
});

router.post("/sessions", requireAuth, async (req, res): Promise<void> => {
  const { vehicleId, parkingLotId, locationName, locationAddress, latitude, longitude, paidMinutes } = req.body;

  if (!vehicleId || !locationName) {
    res.status(400).json({ error: "validation_error", message: "vehicleId and locationName are required" });
    return;
  }

  const existing = await db
    .select()
    .from(parkingSessionsTable)
    .where(and(eq(parkingSessionsTable.vehicleId, vehicleId), eq(parkingSessionsTable.status, "active")))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "conflict", message: "This vehicle already has an active session" });
    return;
  }

  const endTime = paidMinutes ? new Date(Date.now() + paidMinutes * 60 * 1000) : null;

  const [session] = await db
    .insert(parkingSessionsTable)
    .values({
      userId: req.user!.userId,
      vehicleId,
      parkingLotId: parkingLotId ?? null,
      locationName,
      locationAddress: locationAddress ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      paidMinutes: paidMinutes ?? null,
      endTime: endTime ?? undefined,
      status: "active",
      extensions: [],
    })
    .returning();

  res.status(201).json(session);
});

router.put("/sessions/:id/extend", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;
  const { addMinutes } = req.body;

  if (!addMinutes || addMinutes <= 0) {
    res.status(400).json({ error: "validation_error", message: "addMinutes must be a positive number" });
    return;
  }

  const [existing] = await db
    .select()
    .from(parkingSessionsTable)
    .where(and(eq(parkingSessionsTable.id, id), eq(parkingSessionsTable.userId, req.user!.userId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "not_found", message: "Session not found" });
    return;
  }
  if (existing.status !== "active") {
    res.status(400).json({ error: "invalid_state", message: "Session is not active" });
    return;
  }

  const currentEnd = existing.endTime ? new Date(existing.endTime) : new Date();
  const newEnd = new Date(currentEnd.getTime() + addMinutes * 60 * 1000);
  const newPaidMinutes = (existing.paidMinutes ?? 0) + addMinutes;
  const newExtensions = [
    ...(existing.extensions as { addedMinutes: number; timestamp: string }[]),
    { addedMinutes: addMinutes, timestamp: new Date().toISOString() },
  ];

  const [updated] = await db
    .update(parkingSessionsTable)
    .set({ endTime: newEnd, paidMinutes: newPaidMinutes, extensions: newExtensions })
    .where(eq(parkingSessionsTable.id, id))
    .returning();

  res.json(updated);
});

router.put("/sessions/:id/end", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id!;

  const [existing] = await db
    .select()
    .from(parkingSessionsTable)
    .where(and(eq(parkingSessionsTable.id, id), eq(parkingSessionsTable.userId, req.user!.userId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "not_found", message: "Session not found" });
    return;
  }

  const actualEnd = new Date();
  const [ended] = await db
    .update(parkingSessionsTable)
    .set({ status: "ended", endTime: actualEnd })
    .where(eq(parkingSessionsTable.id, id))
    .returning();

  // Award loyalty points: 1 pt per 10 minutes parked
  const startMs = existing.startTime ? new Date(existing.startTime).getTime() : Date.now();
  const durationMinutes = Math.floor((actualEnd.getTime() - startMs) / 60000);
  const pointsEarned = Math.floor(durationMinutes / 10);
  if (pointsEarned > 0) {
    await db
      .update(usersTable)
      .set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${pointsEarned}` })
      .where(eq(usersTable.id, req.user!.userId));
  }

  res.json(ended);
});

export default router;
