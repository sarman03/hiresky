import { Router } from "express";
import { prisma } from "../index";

const router = Router();

// GET /api/admin/stats — Global platform stats
router.get("/stats", async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalSessions = await prisma.interviewSession.count();
    const activeSubs = await prisma.subscription.count({ where: { status: "active" } });

    // Sessions created today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const sessionsToday = await prisma.interviewSession.count({
      where: { createdAt: { gte: todayStart } }
    });

    res.json({
      totalUsers,
      totalSessions,
      sessionsToday,
      activeSubscriptions: activeSubs,
      // Mock MRR for prototype
      mrr: activeSubs * 29
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/users — List all users
router.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        profile: true,
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { sessions: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/users/:id/ban — Toggle ban status
router.patch("/users/:id/ban", async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId, reason } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const newStatus = user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { status: newStatus } }),
      prisma.adminLog.create({
        data: {
          adminId: adminId || id,
          action: newStatus === "SUSPENDED" ? "BAN_USER" : "UNBAN_USER",
          targetId: id,
          details: reason || "No reason provided"
        }
      })
    ]);

    res.json({ user: updatedUser, newStatus });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/logs — Recent admin activity log
router.get("/logs", async (req, res) => {
  try {
    const logs = await prisma.adminLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        admin: { select: { email: true } }
      }
    });
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
