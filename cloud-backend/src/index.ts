import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import interviewRoutes from "./routes/interviews.routes";
import contextRoutes from "./routes/context.routes";
import calendarRoutes from "./routes/calendar.routes";
import analyticsRoutes from "./routes/analytics.routes";
import leaderboardRoutes from "./routes/leaderboard.routes";
import notificationsRoutes from "./routes/notifications.routes";
import referralsRoutes from "./routes/referrals.routes";
import adminRoutes from "./routes/admin.routes";
import billingRoutes from "./routes/billing.routes";
import billingWebhookRoutes from "./routes/billing.webhook";
import { authenticate, requireAdmin } from "./middleware/auth.middleware";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const app = express();
const port = process.env.PORT || 4000;

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
export const prisma = new PrismaClient({ adapter });

app.use(cors());

// Stripe's webhook signature check needs the exact raw request bytes, so this
// must be mounted with a raw body parser *before* the global express.json()
// below consumes the body as parsed JSON.
app.use("/api/billing/webhook", express.raw({ type: "application/json" }), billingWebhookRoutes);

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
// billing.routes applies `authenticate` itself only on the checkout endpoint,
// since /plans must stay publicly readable from the pricing page.
app.use("/api/billing", billingRoutes);
app.use("/api/interviews", authenticate, interviewRoutes);
app.use("/api/context", authenticate, contextRoutes);
app.use("/api/calendar", authenticate, calendarRoutes);
app.use("/api/analytics", authenticate, analyticsRoutes);
app.use("/api/leaderboard", authenticate, leaderboardRoutes);
app.use("/api/notifications", authenticate, notificationsRoutes);
app.use("/api/referrals", authenticate, referralsRoutes);
app.use("/api/admin", authenticate, requireAdmin, adminRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Cloud backend listening at http://localhost:${port}`);
});
