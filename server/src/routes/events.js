const express = require("express");
const prisma = require("../lib/prisma");

const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/auth");

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  authorizeRole("ADMIN"),
  async (req, res) => {
    try {
      const { name, description } = req.body;

      if (!name || typeof name !== "string" || !name.trim()) {
  return res.status(400).json({
    success: false,
    message: "Valid event name is required",
  });
}

      const event = await prisma.event.create({
  data: {
    name: name.trim(),
    description: description?.trim() || null,
    createdById: req.user.userId,
  },
});

      res.status(201).json({
        success: true,
        message: "Event created successfully",
        event,
      });
    } catch (error) {
      console.error("CREATE EVENT ERROR:", error);

      res.status(500).json({
        success: false,
        message: "Failed to create event",
      });
    }
  }
);

router.post(
  "/:eventId/members",
  authenticateToken,
  authorizeRole("ADMIN"),
  async (req, res) => {
    try {
      const eventId = Number(req.params.eventId);
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId is required",
        });
      }

      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.role !== "TEAM_MEMBER") {
        return res.status(400).json({
          success: false,
          message: "Only team members can be assigned",
        });
      }

      const membership = await prisma.eventMember.create({
        data: {
          eventId,
          userId: Number(userId),
        },
      });

      res.status(201).json({
        success: true,
        message: "Team member added to event",
        membership,
      });
    } catch (error) {
      console.error("ADD MEMBER ERROR:", error);

      res.status(500).json({
        success: false,
        message: "Failed to add team member",
      });
    }
  }
);

router.get(
  "/my-events",
  authenticateToken,
  authorizeRole("TEAM_MEMBER"),
  async (req, res) => {
    try {
      const events = await prisma.event.findMany({
        where: {
          members: {
            some: {
              userId: req.user.userId,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json({
        success: true,
        events,
      });
    } catch (error) {
      console.error("MY EVENTS ERROR:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch assigned events",
      });
    }
  }
);

router.get(
  "/",
  authenticateToken,
  authorizeRole("ADMIN"),
  async (req, res) => {
    try {
      const events = await prisma.event.findMany({
        include: {
          _count: {
            select: {
              photos: true,
              members: true,
            },
          },
          gallery: {
            select: {
              id: true,
              published: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json({
        success: true,
        events,
      });
    } catch (error) {
      console.error("GET EVENTS ERROR:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch events",
      });
    }
  }
);

module.exports = router;