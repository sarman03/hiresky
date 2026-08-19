import { Router } from "express";
import { prisma } from "../index";

const router = Router();

// Get analytics for user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // In a real app, this would dynamically aggregate from InterviewSummaries.
    // For Phase 2, we will attempt to find a pre-calculated InterviewMetrics
    // and if none exists, we return a mock aggregation.
    
    let metrics = await prisma.interviewMetrics.findUnique({
      where: { userId }
    });

    if (!metrics) {
      metrics = await prisma.interviewMetrics.create({
        data: {
          userId,
          totalInterviews: 5,
          averageScore: 78.5,
          strongestArea: "React",
          weakestArea: "System Design",
          trendValue: 12.0
        }
      });
    }

    res.json(metrics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
