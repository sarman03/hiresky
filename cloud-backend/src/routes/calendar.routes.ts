import { Router } from "express";
import { prisma } from "../index";
import { requireSelf } from "../middleware/auth.middleware";

const router = Router();

// Get calendar events
router.get("/:userId", requireSelf(), async (req, res) => {
  try {
    const { userId } = req.params;
    const events = await prisma.calendarEvent.findMany({
      where: { userId },
      orderBy: { startTime: 'asc' }
    });
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create calendar event
router.post("/:userId", requireSelf(), async (req, res) => {
  try {
    const { userId } = req.params;
    const { title, company, role, domain, startTime, endTime, meetingUrl, notes } = req.body;

    const event = await prisma.calendarEvent.create({
      data: {
        userId,
        title,
        company,
        role,
        domain,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        meetingUrl,
        notes
      }
    });

    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
