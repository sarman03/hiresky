import { Router } from "express";
import { prisma } from "../index";
import { randomBytes } from "crypto";
import { requireSelf } from "../middleware/auth.middleware";

const router = Router();

// Get referral code + stats for user
router.get("/:userId", requireSelf(), async (req, res) => {
  try {
    const { userId } = req.params;

    let referralCode = await prisma.referralCode.findUnique({
      where: { userId }
    });

    // Auto-generate a referral code if none exists
    if (!referralCode) {
      const code = "HS-" + randomBytes(4).toString("hex").toUpperCase();
      referralCode = await prisma.referralCode.create({
        data: { userId, code }
      });
    }

    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referredUser: {
          include: { profile: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({
      code: referralCode.code,
      usedCount: referralCode.usedCount,
      referrals
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
