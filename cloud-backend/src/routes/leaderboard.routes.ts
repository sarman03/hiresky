import { Router } from "express";
import { prisma } from "../index";

const router = Router();

// Get the global leaderboard (e.g. ALL_TIME)
router.get("/:epochName", async (req, res) => {
  try {
    const { epochName } = req.params;
    let leaderboard = await prisma.globalLeaderboard.findFirst({
      where: { epochName },
      include: {
        entries: {
          orderBy: { rank: 'asc' },
          include: {
            user: {
              include: { profile: true }
            }
          }
        }
      }
    });

    // Mock data for Phase 3 if leaderboard doesn't exist
    if (!leaderboard) {
      leaderboard = await prisma.globalLeaderboard.create({
        data: { epochName }
      });

      // We won't bother creating mock users in DB, we'll just send mock JSON 
      // if it's newly created, to satisfy the UI requirement for Phase 3 prototype
      return res.json({
        id: leaderboard.id,
        epochName,
        entries: [
          {
            id: "mock-1",
            rank: 1,
            score: 98.5,
            totalInterviews: 42,
            user: { profile: { firstName: "Sarah", lastName: "Chen", avatarUrl: null } }
          },
          {
            id: "mock-2",
            rank: 2,
            score: 96.2,
            totalInterviews: 28,
            user: { profile: { firstName: "Akash", lastName: "Sharma", avatarUrl: null } }
          },
          {
            id: "mock-3",
            rank: 3,
            score: 94.1,
            totalInterviews: 15,
            user: { profile: { firstName: "David", lastName: "Kim", avatarUrl: null } }
          }
        ]
      });
    }

    res.json(leaderboard);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
