import { Router } from "express";
import { db } from "@workspace/db";
import {
  parkingSessionsTable,
  parkingLotsTable,
  usersTable,
  loyaltyRedemptionsTable,
} from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// Burgas city center reference point
const CITY_CENTER_LAT = 42.5048;
const CITY_CENTER_LNG = 27.4626;
const RATE_BGN_PER_HOUR = 1.5;
const CO2_G_PER_KM = 120;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.get("/dashboard", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  // All completed + active sessions for this user
  const sessions = await db
    .select()
    .from(parkingSessionsTable)
    .where(eq(parkingSessionsTable.userId, userId));

  const now = new Date();

  // ── Spending: monthly totals (last 6 months) ───────────────────────────────
  const spendingMap: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    spendingMap[key] = 0;
  }
  for (const s of sessions) {
    if ((s.paidMinutes ?? 0) > 0 && s.startTime) {
      const d = new Date(s.startTime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in spendingMap) {
        spendingMap[key]! += ((s.paidMinutes ?? 0) / 60) * RATE_BGN_PER_HOUR;
      }
    }
  }
  const spending = Object.entries(spendingMap).map(([month, amount]) => ({
    month,
    amount: Math.round(amount * 100) / 100,
  }));

  // ── Most visited spots ─────────────────────────────────────────────────────
  const visitMap: Record<string, { lotId: string; name: string; address: string; type: string; visits: number }> = {};
  for (const s of sessions) {
    if (s.parkingLotId) {
      if (!visitMap[s.parkingLotId]) {
        visitMap[s.parkingLotId] = {
          lotId: s.parkingLotId,
          name: s.locationName,
          address: s.locationAddress ?? "",
          type: "paid",
          visits: 0,
        };
      }
      visitMap[s.parkingLotId]!.visits++;
    }
  }
  // Enrich with lot type from DB
  const lotIds = Object.keys(visitMap);
  if (lotIds.length > 0) {
    const lots = await db
      .select({ id: parkingLotsTable.id, type: parkingLotsTable.type, name: parkingLotsTable.name })
      .from(parkingLotsTable)
      .where(sql`${parkingLotsTable.id} = ANY(${sql.raw(`ARRAY[${lotIds.map((id) => `'${id}'`).join(",")}]`)})`)
    for (const lot of lots) {
      if (visitMap[lot.id]) {
        visitMap[lot.id]!.type = lot.type;
        visitMap[lot.id]!.name = lot.name;
      }
    }
  }
  const mostVisited = Object.values(visitMap)
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 3);

  // ── CO₂ stats (current month) ──────────────────────────────────────────────
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let totalKmWalked = 0;
  for (const s of sessions) {
    if (!s.startTime) continue;
    const key = `${new Date(s.startTime).getFullYear()}-${String(new Date(s.startTime).getMonth() + 1).padStart(2, "0")}`;
    if (key !== thisMonthKey) continue;
    const lat = s.latitude ?? CITY_CENTER_LAT;
    const lng = s.longitude ?? CITY_CENTER_LNG;
    totalKmWalked += haversineKm(lat, lng, CITY_CENTER_LAT, CITY_CENTER_LNG);
  }
  const co2SavedGrams = Math.round(totalKmWalked * CO2_G_PER_KM);

  // ── Loyalty points ─────────────────────────────────────────────────────────
  const [user] = await db.select({ loyaltyPoints: usersTable.loyaltyPoints }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const points = user?.loyaltyPoints ?? 0;

  const TIERS = [
    { name: "Bronze", min: 0, max: 99, next: "Silver", nextAt: 100 },
    { name: "Silver", min: 100, max: 299, next: "Gold", nextAt: 300 },
    { name: "Gold", min: 300, max: Infinity, next: null, nextAt: null },
  ];
  const tier = TIERS.find((t) => points >= t.min && points <= t.max) ?? TIERS[0]!;

  const redemptions = await db
    .select()
    .from(loyaltyRedemptionsTable)
    .where(eq(loyaltyRedemptionsTable.userId, userId))
    .orderBy(desc(loyaltyRedemptionsTable.createdAt))
    .limit(10);

  res.json({
    spending,
    mostVisited,
    co2: {
      kmWalked: Math.round(totalKmWalked * 10) / 10,
      co2SavedGrams,
      sessionsThisMonth: sessions.filter((s) => {
        if (!s.startTime) return false;
        const key = `${new Date(s.startTime).getFullYear()}-${String(new Date(s.startTime).getMonth() + 1).padStart(2, "0")}`;
        return key === thisMonthKey;
      }).length,
    },
    loyalty: {
      points,
      tier: tier.name,
      nextTier: tier.next,
      nextTierAt: tier.nextAt,
      progressPct: tier.nextAt
        ? Math.min(100, Math.round(((points - tier.min) / (tier.nextAt - tier.min)) * 100))
        : 100,
      redemptions: redemptions.map((r) => ({
        id: r.id,
        pointsSpent: r.pointsSpent,
        minutesGranted: r.minutesGranted,
        createdAt: r.createdAt,
      })),
    },
  });
});

router.post("/loyalty/redeem", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const COST_POINTS = 100;
  const REWARD_MINUTES = 30;

  const [user] = await db.select({ loyaltyPoints: usersTable.loyaltyPoints }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (user.loyaltyPoints < COST_POINTS) {
    res.status(400).json({ error: "insufficient_points", message: `You need ${COST_POINTS} points to redeem. You have ${user.loyaltyPoints}.` });
    return;
  }

  await db.update(usersTable).set({ loyaltyPoints: user.loyaltyPoints - COST_POINTS }).where(eq(usersTable.id, userId));
  const [redemption] = await db
    .insert(loyaltyRedemptionsTable)
    .values({ userId, pointsSpent: COST_POINTS, minutesGranted: REWARD_MINUTES })
    .returning();

  res.json({ message: `Redeemed ${COST_POINTS} points for ${REWARD_MINUTES} free parking minutes!`, redemption, newBalance: user.loyaltyPoints - COST_POINTS });
});

export default router;
