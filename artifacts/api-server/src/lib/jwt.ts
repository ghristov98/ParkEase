import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["JWT_SECRET"];
if (!JWT_SECRET) throw new Error("JWT_SECRET env var is required");

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export interface TokenPayload {
  userId: string;
  role: string;
}

export function generateAccessToken(userId: string, role: string): string {
  return jwt.sign({ userId, role } as TokenPayload, JWT_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function generateRefreshToken(userId: string, role: string): string {
  return jwt.sign({ userId, role } as TokenPayload, JWT_SECRET!, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET!) as TokenPayload;
}
