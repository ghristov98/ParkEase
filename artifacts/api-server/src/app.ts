import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { seedDatabase } from "./lib/seed";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const uploadDir = path.join(process.cwd(), "uploads");
app.use("/api/uploads", express.static(uploadDir));

app.use("/api", router);

// Serve the web UI from public/
const publicDir = path.resolve(process.cwd(), "public");
app.use(express.static(publicDir));

// SPA fallback — send index.html for any non-API route
app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// Seed the database on startup
seedDatabase().catch((err) => logger.error({ err }, "Failed to seed database"));

export default app;
