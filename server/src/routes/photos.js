const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const prisma = require("../lib/prisma");
const cloudinary = require("../lib/cloudinary");

const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/auth");

const router = express.Router();

const { pinLimiter } = require("../middleware/rateLimit");

/* =========================================================
   MULTER CONFIGURATION
========================================================= */

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
    }
  },
});

function handlePhotoUpload(req, res, next) {
  upload.array("photos", 10)(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Each photo must be 10 MB or smaller",
        });
      }

      if (error.code === "LIMIT_UNEXPECTED_FILE" && error.field === "photos") {
        return res.status(400).json({
          success: false,
          message: "You can upload a maximum of 10 photos",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid photo upload",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Invalid photo upload",
    });
  });
}

/* =========================================================
   TEAM MEMBER - UPLOAD PHOTOS
   POST /api/photos/upload
========================================================= */

router.post(
  "/upload",
  authenticateToken,
  authorizeRole("TEAM_MEMBER"),
  handlePhotoUpload,
  async (req, res) => {
    try {
      const { eventId } = req.body;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: "eventId is required",
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one photo is required",
        });
      }

      const numericEventId = Number(eventId);

      if (!Number.isInteger(numericEventId) || numericEventId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid event ID",
        });
      }

      // Check whether team member is assigned to this event
      const membership = await prisma.eventMember.findUnique({
        where: {
          eventId_userId: {
            eventId: numericEventId,
            userId: req.user.userId,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to this event",
        });
      }

      const uploadedPhotos = [];

      for (const file of req.files) {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: `trizenai/events/${numericEventId}`,
              resource_type: "image",
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );

          stream.end(file.buffer);
        });

        const photo = await prisma.photo.create({
          data: {
            eventId: numericEventId,
            uploaderId: req.user.userId,
            filename: file.originalname,
            storageUrl: result.secure_url,
            fileSize: file.size,
          },
        });

        uploadedPhotos.push(photo);
      }

      res.status(201).json({
        success: true,
        message: "Photos uploaded successfully",
        photos: uploadedPhotos,
      });
    } catch (error) {
      console.error("PHOTO UPLOAD ERROR:", error);

      res.status(502).json({
        success: false,
        message: "Image storage upload failed",
      });
    }
  }
);

/* =========================================================
   TEAM MEMBER - GET OWN EVENT PHOTOS
   GET /api/photos/my-events/:eventId
========================================================= */

router.get(
  "/my-events/:eventId",
  authenticateToken,
  authorizeRole("TEAM_MEMBER"),
  async (req, res) => {
    try {
      const eventId = Number(req.params.eventId);

      if (!Number.isInteger(eventId) || eventId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid event ID",
        });
      }

      const membership = await prisma.eventMember.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId: req.user.userId,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to this event",
        });
      }

      const photos = await prisma.photo.findMany({
        where: {
          eventId,
          uploaderId: req.user.userId,
        },
        select: {
          id: true,
          filename: true,
          storageUrl: true,
          fileSize: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.json({
        success: true,
        photos,
      });
    } catch (error) {
      console.error("GET TEAM MEMBER PHOTOS ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch your event photos",
      });
    }
  }
);

/* =========================================================
   ADMIN - GET EVENT PHOTOS
   GET /api/photos/event/:eventId
========================================================= */

router.get(
  "/event/:eventId",
  authenticateToken,
  authorizeRole("ADMIN"),
  async (req, res) => {
    try {
      const eventId = Number(req.params.eventId);

      if (!Number.isInteger(eventId) || eventId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid event ID",
        });
      }

      const event = await prisma.event.findUnique({
        where: {
          id: eventId,
        },
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      const photos = await prisma.photo.findMany({
        where: {
          eventId,
        },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json({
        success: true,
        event: {
          id: event.id,
          name: event.name,
        },
        photos,
      });
    } catch (error) {
      console.error("GET EVENT PHOTOS ERROR:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch event photos",
      });
    }
  }
);

/* =========================================================
   ADMIN - SELECT PHOTOS
   POST /api/photos/select

   This can be used independently if needed.
========================================================= */

router.post(
  "/select",
  authenticateToken,
  authorizeRole("ADMIN"),
  async (req, res) => {
    try {
      const { photoIds } = req.body;

      if (!Array.isArray(photoIds) || photoIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "photoIds must be a non-empty array",
        });
      }

      const numericPhotoIds = photoIds.map(Number);

      const photos = await prisma.photo.findMany({
        where: {
          id: {
            in: numericPhotoIds,
          },
        },
      });

      if (photos.length !== numericPhotoIds.length) {
        return res.status(404).json({
          success: false,
          message: "One or more photos not found",
        });
      }

      const eventIds = [...new Set(photos.map((photo) => photo.eventId))];

      if (eventIds.length !== 1) {
        return res.status(400).json({
          success: false,
          message: "Photos must belong to the same event",
        });
      }

      const eventId = eventIds[0];

      let gallery = await prisma.gallery.findUnique({
        where: {
          eventId,
        },
      });

      if (!gallery) {
        gallery = await prisma.gallery.create({
          data: {
            eventId,
            token: crypto.randomUUID(),
            pinHash: "",
          },
        });
      }

      await prisma.galleryPhoto.deleteMany({
        where: {
          galleryId: gallery.id,
        },
      });

      await prisma.galleryPhoto.createMany({
        data: photos.map((photo) => ({
          galleryId: gallery.id,
          photoId: photo.id,
        })),
      });

      res.json({
        success: true,
        message: "Photos selected successfully",
        galleryId: gallery.id,
        selectedPhotoIds: photos.map((photo) => photo.id),
      });
    } catch (error) {
      console.error("SELECT PHOTOS ERROR:", error);

      res.status(500).json({
        success: false,
        message: "Failed to select photos",
      });
    }
  }
);

/* =========================================================
   ADMIN - PUBLISH GALLERY
   POST /api/photos/publish
========================================================= */

router.post(
  "/publish",
  authenticateToken,
  authorizeRole("ADMIN"),
  async (req, res) => {
    try {
      const { eventId, photoIds, pin } = req.body;

      // -----------------------------
      // Validation
      // -----------------------------

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: "eventId is required",
        });
      }

      if (!Array.isArray(photoIds) || photoIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Select at least one photo",
        });
      }

      if (!pin || !/^\d{4,6}$/.test(String(pin))) {
        return res.status(400).json({
          success: false,
          message: "PIN must contain 4 to 6 digits",
        });
      }

      const numericEventId = Number(eventId);
      const numericPhotoIds = photoIds.map(Number);

      // -----------------------------
      // Check event
      // -----------------------------

      const event = await prisma.event.findUnique({
        where: {
          id: numericEventId,
        },
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      // -----------------------------
      // Get selected photos
      // -----------------------------

      const photos = await prisma.photo.findMany({
        where: {
          id: {
            in: numericPhotoIds,
          },
        },
      });

      if (photos.length !== numericPhotoIds.length) {
        return res.status(404).json({
          success: false,
          message: "One or more selected photos were not found",
        });
      }

      // -----------------------------
      // Security:
      // Make sure every photo belongs
      // to the requested event.
      // -----------------------------

      const invalidPhoto = photos.some(
        (photo) => photo.eventId !== numericEventId
      );

      if (invalidPhoto) {
        return res.status(403).json({
          success: false,
          message: "Photos must belong to the selected event",
        });
      }

      // -----------------------------
      // Hash gallery PIN
      // -----------------------------

      const pinHash = await bcrypt.hash(String(pin), 12);

      // -----------------------------
      // Create or update gallery
      // -----------------------------

      let gallery = await prisma.gallery.findUnique({
        where: {
          eventId: numericEventId,
        },
      });

      if (!gallery) {
        gallery = await prisma.gallery.create({
          data: {
            eventId: numericEventId,
            token: crypto.randomUUID(),
            pinHash,
            published: true,
            publishedAt: new Date(),
          },
        });
      } else {
        gallery = await prisma.gallery.update({
          where: {
            id: gallery.id,
          },
          data: {
            pinHash,
            published: true,
            publishedAt: new Date(),
          },
        });
      }

      // -----------------------------
      // Replace gallery photos
      // -----------------------------

      await prisma.galleryPhoto.deleteMany({
        where: {
          galleryId: gallery.id,
        },
      });

      await prisma.galleryPhoto.createMany({
        data: photos.map((photo) => ({
          galleryId: gallery.id,
          photoId: photo.id,
        })),
      });

      // -----------------------------
      // Response
      // -----------------------------

      res.status(201).json({
        success: true,
        message: "Gallery published successfully",
        gallery: {
          id: gallery.id,
          eventId: gallery.eventId,
          token: gallery.token,
          published: gallery.published,
          publishedAt: gallery.publishedAt,
        },
      });
    } catch (error) {
      console.error("PUBLISH GALLERY ERROR:", error);

      res.status(500).json({
        success: false,
        message: "Failed to publish gallery",
      });
    }
  }
);

/* =========================================================
   CUSTOMER - VERIFY GALLERY PIN
   POST /api/photos/gallery/:token/verify
========================================================= */

router.post("/:token/verify", pinLimiter, async (req, res) => {
    try {
      const { token } = req.params;
      const { pin } = req.body || {};

      if (!pin) {
        return res.status(400).json({
          success: false,
          message: "PIN is required",
        });
      }

      if (!/^\d{4,6}$/.test(String(pin))) {
        return res.status(400).json({
          success: false,
          message: "PIN must contain 4 to 6 digits",
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

      if (!gallery) {
        return res.status(404).json({
          success: false,
          message: "Gallery not found",
        });
      }

      if (!gallery.published) {
        return res.status(403).json({
          success: false,
          message: "Gallery is not published",
        });
      }

      const validPin = await bcrypt.compare(
        String(pin),
        gallery.pinHash
      );

      if (!validPin) {
        return res.status(401).json({
          success: false,
          message: "Incorrect PIN",
        });
      }

      const photos = gallery.photos.map(
        (item) => item.photo
      );

      res.json({
        success: true,
        message: "Gallery access granted",
        event: {
          id: gallery.event.id,
          name: gallery.event.name,
        },
        photos,
      });

    } catch (error) {
      console.error("VERIFY GALLERY ERROR:", error);

      res.status(500).json({
        success: false,
        message: "Failed to verify gallery",
      });
    }
  }
);

module.exports = router;