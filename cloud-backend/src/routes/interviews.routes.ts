import { Router } from "express";
import { prisma } from "../index";

const router = Router();

// Get interview history for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await prisma.interviewSession.findMany({
      where: { userId },
      include: { summary: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new session (called from macOS app when starting interview)
router.post("/start", async (req, res) => {
  try {
    const { userId, domain, title, companyName, jobTitle } = req.body;
    
    // Check entitlement before starting
    const entitlement = await prisma.userEntitlement.findFirst({
      where: {
        userId,
        featureKey: domain,
        enabled: true,
        expiresAt: { gt: new Date() }
      }
    });

    if (!entitlement) {
      return res.status(403).json({ error: "No active entitlement for this domain" });
    }

    const session = await prisma.interviewSession.create({
      data: {
        userId,
        domain,
        title,
        companyName,
        jobTitle,
        status: "active",
        startedAt: new Date()
      }
    });

    // Phase 2: Capture Context Snapshot
    const userContext = await prisma.userContext.findUnique({ where: { userId } });
    const snapshotPayload = {
      userContext: userContext || {},
      jobContext: { companyName, jobTitle },
      domain
    };

    await prisma.sessionContextSnapshot.create({
      data: {
        sessionId: session.id,
        contextJson: JSON.stringify(snapshotPayload)
      }
    });

    res.json({ session, snapshot: snapshotPayload });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Complete a session (save summary and transcripts)
router.post("/:sessionId/complete", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { summaryData, transcripts } = req.body; // Sent from macOS local python daemon

    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { status: "completed", endedAt: new Date() }
    });

    if (summaryData) {
      await prisma.interviewSummary.create({
        data: {
          sessionId,
          ...summaryData
        }
      });
    }

    if (transcripts && transcripts.length > 0) {
      await prisma.transcriptSegment.createMany({
        data: transcripts.map((t: any) => ({
          sessionId,
          ...t
        }))
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get session deep dive stats (Phase 3)
router.get("/:sessionId/stats", async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        summary: true,
        transcriptSegments: {
          orderBy: { sequence: 'asc' }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
