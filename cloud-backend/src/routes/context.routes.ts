import { Router } from "express";
import { prisma } from "../index";

const router = Router();

// Get context for user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    let context = await prisma.userContext.findUnique({
      where: { userId }
    });

    if (!context) {
      context = await prisma.userContext.create({
        data: { userId }
      });
    }

    res.json(context);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update context
router.put("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { targetRole, targetCompanies, preferredAnswerStyle, technicalStack } = req.body;

    const context = await prisma.userContext.upsert({
      where: { userId },
      update: { targetRole, targetCompanies, preferredAnswerStyle, technicalStack },
      create: { userId, targetRole, targetCompanies, preferredAnswerStyle, technicalStack }
    });

    res.json(context);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
