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
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const app = express();
const port = process.env.PORT || 4000;

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
export const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/context", contextRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/referrals", referralsRoutes);
app.use("/api/admin", adminRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Cloud backend listening at http://localhost:${port}`);
});
