import { Router } from "express";
import { prisma } from "../index";

const router = Router();

// Get all notifications for user (most recent first)
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    let notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    // Seed mock notifications if none exist
    if (notifications.length === 0) {
      await prisma.notification.createMany({
        data: [
          {
            userId,
            type: "INTERVIEW_COMPLETE",
            title: "Interview Summary Ready",
            message: "Your Google Technical Interview summary has been generated. Score: 84%",
            actionUrl: "/history",
            isRead: false
          },
          {
            userId,
            type: "REFERRAL_REWARD",
            title: "Referral Reward Earned! 🎉",
            message: "Your friend Priya signed up using your referral code. You earned 3 bonus days!",
            actionUrl: "/referrals",
            isRead: false
          },
          {
            userId,
            type: "PLAN_EXPIRY",
            title: "Your Plan Expires Soon",
            message: "Your Technical Monthly plan expires in 3 days. Renew now to keep access.",
            actionUrl: "/pricing",
            isRead: true
          },
          {
            userId,
            type: "SYSTEM",
            title: "Welcome to HireSky v2! 🚀",
            message: "Phase 2 is live: Context profiles, Calendar sync, and AI personalisation are now available.",
            actionUrl: "/context",
            isRead: true
          }
        ]
      });
      notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" }
      });
    }

    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark a single notification as read
router.patch("/:notificationId/read", async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });
    res.json(notification);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark all as read for a user
router.patch("/:userId/read-all", async (req, res) => {
  try {
    const { userId } = req.params;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
