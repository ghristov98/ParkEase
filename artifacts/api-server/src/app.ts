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

// Serve the Expo web export (mobile app compiled for web)
const webDistDir = path.resolve(process.cwd(), "../../artifacts/mobile/dist-web");
app.use(express.static(webDistDir, { dotfiles: "allow" }));

// SPA fallback — send index.html for any non-API route
app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(webDistDir, "index.html"));
});

// Seed the database on startup
seedDatabase().catch((err) => logger.error({ err }, "Failed to seed database"));

export default app;
