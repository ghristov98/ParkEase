import { Router } from "express";
import { requireSuperAdmin } from "../middlewares/auth";

const router = Router();

router.post("/ai/chat", requireSuperAdmin, async (_req, res): Promise<void> => {
  res.json({ reply: "AI Assistant is not configured yet. Add your OpenAI API key to enable this feature.", conversationId: "stub" });
});

router.get("/ai/history", requireSuperAdmin, async (_req, res): Promise<void> => {
  res.json([]);
});

router.get("/ai/stats", requireSuperAdmin, async (_req, res): Promise<void> => {
  res.json({ message: "Stats endpoint available. Connect AI to use." });
});

export default router;
