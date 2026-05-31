import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, refreshTokensTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { generateAccessToken, generateRefreshToken, verifyToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const { firstName, lastName, email, phone, password } = req.body;
  if (!firstName || !lastName || !email || !phone || !password) {
    res.status(400).json({ error: "validation_error", message: "All fields are required" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "conflict", message: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.insert(usersTable).values({
    firstName, lastName, email, phone, passwordHash,
    isVerified: true,
  });

  res.status(201).json({ message: "Registration successful. You can now sign in." });
});

router.post("/auth/verify", async (req, res): Promise<void> => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400).json({ error: "validation_error", message: "Email and code required" });
    return;
  }

  const [user] = await db.select().from(usersTable)
    .where(and(eq(usersTable.email, email), eq(usersTable.verificationCode, code), gt(usersTable.verificationExpiresAt!, new Date())))
    .limit(1);

  if (!user) {
    res.status(400).json({ error: "invalid_code", message: "Invalid or expired verification code" });
    return;
  }

  await db.update(usersTable).set({ isVerified: true, verificationCode: null, verificationExpiresAt: null }).where(eq(usersTable.id, user.id));
  res.json({ message: "Email verified successfully" });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "validation_error", message: "Email and password required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password" });
    return;
  }
  if (!user.isActive) {
    res.status(401).json({ error: "inactive", message: "Account is inactive" });
    return;
  }

  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id, user.role);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokensTable).values({ userId: user.id, token: refreshToken, expiresAt });

  const { passwordHash, verificationCode, verificationExpiresAt, resetToken, resetTokenExpiresAt, ...safeUser } = user;
  res.json({ accessToken, refreshToken, user: safeUser });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await db.update(refreshTokensTable).set({ isRevoked: true }).where(eq(refreshTokensTable.token, refreshToken));
  }
  res.json({ message: "Logged out successfully" });
});

router.post("/auth/refresh", async (req, res): Promise<void> => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: "validation_error", message: "Refresh token required" });
    return;
  }

  try {
    const payload = verifyToken(refreshToken);
    const [stored] = await db.select().from(refreshTokensTable)
      .where(and(eq(refreshTokensTable.token, refreshToken), eq(refreshTokensTable.isRevoked, false), gt(refreshTokensTable.expiresAt, new Date())))
      .limit(1);

    if (!stored) {
      res.status(401).json({ error: "invalid_token", message: "Invalid or revoked refresh token" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (!user || !user.isActive) {
      res.status(401).json({ error: "unauthorized", message: "User not found or inactive" });
      return;
    }

    await db.update(refreshTokensTable).set({ isRevoked: true }).where(eq(refreshTokensTable.id, stored.id));

    const newAccessToken = generateAccessToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id, user.role);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokensTable).values({ userId: user.id, token: newRefreshToken, expiresAt });

    const { passwordHash, verificationCode, verificationExpiresAt, resetToken, resetTokenExpiresAt, ...safeUser } = user;
    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken, user: safeUser });
  } catch {
    res.status(401).json({ error: "invalid_token", message: "Invalid refresh token" });
  }
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "validation_error", message: "Email required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (user) {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.update(usersTable).set({ resetToken: token, resetTokenExpiresAt: expiresAt }).where(eq(usersTable.id, user.id));
    req.log.info({ email, token }, "Password reset token generated");
  }

  res.json({ message: "If your email is registered, you will receive reset instructions." });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, password } = req.body;
  if (!token || !password) {
    res.status(400).json({ error: "validation_error", message: "Token and new password required" });
    return;
  }

  const [user] = await db.select().from(usersTable)
    .where(and(eq(usersTable.resetToken, token), gt(usersTable.resetTokenExpiresAt!, new Date())))
    .limit(1);

  if (!user) {
    res.status(400).json({ error: "invalid_token", message: "Invalid or expired reset token" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.update(usersTable).set({ passwordHash, resetToken: null, resetTokenExpiresAt: null }).where(eq(usersTable.id, user.id));
  res.json({ message: "Password reset successfully" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }
  const { passwordHash, verificationCode, verificationExpiresAt, resetToken, resetTokenExpiresAt, ...safeUser } = user;
  res.json(safeUser);
});

export default router;
