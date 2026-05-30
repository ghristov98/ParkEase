import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, parkingExtrasTable, parkingLotsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export async function seedDatabase(): Promise<void> {
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, "superadmin@parkease.com")).limit(1);
  if (existing.length > 0) return;

  logger.info("Seeding database with initial data...");

  const passwordHash = await bcrypt.hash("G7#Pq9!Xr2@Lm8$Vz5", 12);
  await db.insert(usersTable).values({
    firstName: "Super",
    lastName: "Admin",
    email: "superadmin@parkease.com",
    phone: "+10000000000",
    passwordHash,
    role: "superadmin",
    isVerified: true,
    isActive: true,
  });

  const extras = await db.insert(parkingExtrasTable).values([
    { name: "Security Guard", icon: "shield-checkmark", description: "24/7 security personnel on site" },
    { name: "CCTV Cameras", icon: "videocam", description: "Surveillance cameras throughout" },
    { name: "Barrier Gate", icon: "enter", description: "Automated barrier gate system" },
    { name: "Covered Parking", icon: "umbrella", description: "Protected from weather" },
    { name: "Lighting", icon: "flashlight", description: "Well-lit parking area" },
    { name: "EV Charging", icon: "flash", description: "Electric vehicle charging stations" },
    { name: "Handicap Access", icon: "accessibility", description: "Wheelchair accessible spaces" },
  ]).returning();

  await db.insert(parkingLotsTable).values([
    {
      name: "Central Plaza Parking",
      address: "123 Main Street, Downtown",
      latitude: 40.7128,
      longitude: -74.006,
      type: "paid",
      description: "Premium underground parking in the heart of downtown with 24/7 access.",
      photos: [],
    },
    {
      name: "Riverside Free Lot",
      address: "45 River Road, Waterfront",
      latitude: 40.7148,
      longitude: -74.009,
      type: "free",
      description: "Free open-air parking lot near the waterfront. No time limit.",
      photos: [],
    },
    {
      name: "Northside Community Parking",
      address: "78 North Ave, Northside",
      latitude: 40.718,
      longitude: -74.003,
      type: "free",
      description: "Community-managed free parking area with great amenities.",
      photos: [],
    },
    {
      name: "Tech Hub Garage",
      address: "250 Innovation Blvd, Tech District",
      latitude: 40.711,
      longitude: -74.012,
      type: "paid",
      description: "Modern multi-story parking garage with app-based payment.",
      photos: [],
    },
  ]);

  logger.info("Database seeded successfully");
}
