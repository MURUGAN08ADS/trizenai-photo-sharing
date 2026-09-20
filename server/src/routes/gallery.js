const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");

const router = express.Router();

router.post("/:token/verify", async (req, res) => {
  try {
    const { token } = req.params;
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({
        success: false,
        message: "PIN is required",
      });
    }

    const gallery = await prisma.gallery.findUnique({
      where: { token },
      include: {
        event: true,
        photos: {
          include: {
            photo: true,
          },
        },
      },
    });

    if (!gallery || !gallery.published) {
      return res.status(404).json({
        success: false,
        message: "Gallery not found",
      });
    }

    const validPin = await bcrypt.compare(
      String(pin),
      gallery.pinHash
    );

    if (!validPin) {
      return res.status(401).json({
        success: false,
        message: "Invalid PIN",
      });
    }

    res.json({
      success: true,
      message: "Gallery access granted",
      gallery: {
        id: gallery.id,
        eventId: gallery.eventId,
        eventName: gallery.event.name,
        photos: gallery.photos.map((item) => ({
          id: item.photo.id,
          filename: item.photo.filename,
          storageUrl: item.photo.storageUrl,
        })),
      },
    });
  } catch (error) {
    console.error("GALLERY VERIFY ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to access gallery",
    });
  }
});

module.exports = router;