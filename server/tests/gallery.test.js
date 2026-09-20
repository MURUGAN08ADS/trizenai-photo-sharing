const request = require("supertest");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");

describe("Customer gallery API", () => {
  let eventId;
  let publishedToken;
  let unpublishedToken;
  const correctPin = "2512";

  beforeAll(async () => {
    const admin = await prisma.user.findUnique({
      where: { email: "admin@trizenai.com" },
    });

    const pinHash = await bcrypt.hash(correctPin, 12);
    const event = await prisma.event.create({
      data: {
        name: `Gallery Task Event ${Date.now()}`,
        description: "Customer gallery test",
        createdById: admin.id,
      },
    });

    eventId = event.id;

    const photo = await prisma.photo.create({
      data: {
        eventId,
        uploaderId: admin.id,
        filename: "customer-gallery.jpg",
        storageUrl: "https://example.com/customer-gallery.jpg",
        fileSize: 321,
      },
    });

    publishedToken = crypto.randomUUID();
    unpublishedToken = crypto.randomUUID();

    const publishedGallery = await prisma.gallery.create({
      data: {
        eventId,
        token: publishedToken,
        pinHash,
        published: true,
        publishedAt: new Date(),
      },
    });

    await prisma.galleryPhoto.create({
      data: {
        galleryId: publishedGallery.id,
        photoId: photo.id,
      },
    });

    const unpublishedEvent = await prisma.event.create({
      data: {
        name: `Unpublished Gallery Event ${Date.now()}`,
        description: "Unpublished customer gallery test",
        createdById: admin.id,
      },
    });

    const unpublishedPhoto = await prisma.photo.create({
      data: {
        eventId: unpublishedEvent.id,
        uploaderId: admin.id,
        filename: "unpublished-gallery.jpg",
        storageUrl: "https://example.com/unpublished-gallery.jpg",
        fileSize: 654,
      },
    });

    const unpublishedGallery = await prisma.gallery.create({
      data: {
        eventId: unpublishedEvent.id,
        token: unpublishedToken,
        pinHash,
        published: false,
      },
    });

    await prisma.galleryPhoto.create({
      data: {
        galleryId: unpublishedGallery.id,
        photoId: unpublishedPhoto.id,
      },
    });
  });

  test("unpublished gallery is rejected even with the correct PIN", async () => {
    const response = await request(app)
      .post(`/api/photos/${unpublishedToken}/verify`)
      .send({ pin: correctPin });

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
  });

  test("wrong PIN returns 401", async () => {
    const response = await request(app)
      .post(`/api/photos/${publishedToken}/verify`)
      .send({ pin: "9999" });

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("correct PIN returns published photos without requiring an account", async () => {
    const response = await request(app)
      .post(`/api/photos/${publishedToken}/verify`)
      .send({ pin: correctPin });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.photos).toHaveLength(1);
    expect(response.body.photos[0].filename).toBe("customer-gallery.jpg");
    expect(response.body.photos[0].pinHash).toBeUndefined();
  });

  test("unknown gallery token is rejected", async () => {
    const response = await request(app)
      .post(`/api/photos/${crypto.randomUUID()}/verify`)
      .send({ pin: correctPin });

    expect(response.statusCode).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test("PIN attempts remain rate limited", async () => {
    const responses = [];

    for (let attempt = 0; attempt < 12; attempt += 1) {
      responses.push(
        await request(app)
          .post(`/api/photos/${publishedToken}/verify`)
          .send({ pin: "0000" })
      );
    }

    expect(responses.some((response) => response.statusCode === 429)).toBe(true);
  });

  afterAll(async () => {
    await prisma.event.deleteMany({
      where: {
        id: {
          in: [eventId],
        },
      },
    });

    const unpublishedGallery = await prisma.gallery.findUnique({
      where: { token: unpublishedToken },
    });

    if (unpublishedGallery) {
      await prisma.event.delete({ where: { id: unpublishedGallery.eventId } });
    }

    await prisma.$disconnect();
  });
});
