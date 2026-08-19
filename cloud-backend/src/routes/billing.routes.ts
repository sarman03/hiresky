import { Router } from "express";
import { prisma } from "../index";

const router = Router();

// Get available plans
router.get("/plans", async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true }
    });
    res.json(plans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mock checkout success endpoint (Phase 1)
router.post("/checkout/success", async (req, res) => {
  try {
    const { userId, planId } = req.body;
    
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    // Calculate expiry
    const startsAt = new Date();
    const expiresAt = plan.durationHours 
      ? new Date(startsAt.getTime() + plan.durationHours * 60 * 60 * 1000)
      : new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000); // Default to 30 days if no durationHours

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId,
        status: "active",
        startedAt: startsAt,
        expiresAt: expiresAt,
        provider: "mock"
      }
    });

    // Create entitlement based on plan domain
    await prisma.userEntitlement.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        featureKey: plan.domain,
        enabled: true,
        startsAt,
        expiresAt
      }
    });

    res.json({ success: true, subscription });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
