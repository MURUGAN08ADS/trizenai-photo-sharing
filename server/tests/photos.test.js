const request = require("supertest");
const app = require("../src/app");
const bcrypt = require("bcryptjs");
const prisma = require("../src/lib/prisma");
const cloudinary = require("../src/lib/cloudinary");
const { PassThrough } = require("stream");

describe("Photo Authorization API", () => {
  let token;
  let adminToken;
  let ownPhotoId;
  let otherPhotoId;
  let temporaryUserId;
  let assignedEventId;
  const temporaryFilename = `task1-${Date.now()}.jpg`;
  const validImage = Buffer.from("test image data");

  beforeAll(async () => {
    const teamResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: "team1@example.com",
        password: "Team@123456",
      });

    expect(teamResponse.statusCode).toBe(200);
    token = teamResponse.body.token;

    const adminResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: "admin@trizenai.com",
        password: "Admin@12345",
      });

    expect(adminResponse.statusCode).toBe(200);
    adminToken = adminResponse.body.token;

    const teamUser = await prisma.user.findUnique({
      where: { email: "team1@example.com" },
    });

    const membership = await prisma.eventMember.findFirst({
      where: { userId: teamUser.id },
    });

    assignedEventId = membership.eventId;

    const temporaryUser = await prisma.user.create({
      data: {
        name: "Task 1 Other Member",
        email: `task1-other-${Date.now()}@example.com`,
        passwordHash: await bcrypt.hash("Task@123456", 12),
        role: "TEAM_MEMBER",
      },
    });

    temporaryUserId = temporaryUser.id;

    await prisma.eventMember.create({
      data: {
        eventId: membership.eventId,
        userId: temporaryUser.id,
      },
    });

    const ownPhoto = await prisma.photo.create({
      data: {
        eventId: membership.eventId,
        uploaderId: teamUser.id,
        filename: temporaryFilename,
        storageUrl: "https://example.com/task1-own.jpg",
        fileSize: 123,
      },
    });

    const otherPhoto = await prisma.photo.create({
      data: {
        eventId: membership.eventId,
        uploaderId: temporaryUser.id,
        filename: `${temporaryFilename}-other`,
        storageUrl: "https://example.com/task1-other.jpg",
        fileSize: 456,
      },
    });

    ownPhotoId = ownPhoto.id;
    otherPhotoId = otherPhoto.id;
  });

  test("assigned TEAM_MEMBER should receive only their own event photos", async () => {
    const membership = await prisma.eventMember.findFirst({
      where: { user: { email: "team1@example.com" } },
    });

    const response = await request(app)
      .get(`/api/photos/my-events/${membership.eventId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.photos.map((photo) => photo.id)).toContain(ownPhotoId);
    expect(response.body.photos.map((photo) => photo.id)).not.toContain(otherPhotoId);
  });

  test("TEAM_MEMBER should be rejected from an unassigned event photo list", async () => {
    const response = await request(app)
      .get("/api/photos/my-events/999999")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(403);
  });

  test("ADMIN should be rejected from the team member photo list", async () => {
    const response = await request(app)
      .get("/api/photos/my-events/1")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(403);
  });

  test("photo list should reject unauthenticated requests", async () => {
    const response = await request(app)
      .get("/api/photos/my-events/1");

    expect(response.statusCode).toBe(401);
  });

  test("upload should reject a request without files", async () => {
    const response = await request(app)
      .post("/api/photos/upload")
      .set("Authorization", `Bearer ${token}`)
      .field("eventId", String(assignedEventId));

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("At least one photo is required");
  });

  test("upload should reject an invalid file type", async () => {
    const response = await request(app)
      .post("/api/photos/upload")
      .set("Authorization", `Bearer ${token}`)
      .field("eventId", String(assignedEventId))
      .attach("photos", Buffer.from("not an image"), {
        filename: "notes.txt",
        contentType: "text/plain",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe(
      "Only JPEG, PNG, and WebP images are allowed"
    );
  });

  test("upload should reject files larger than 10 MB", async () => {
    const response = await request(app)
      .post("/api/photos/upload")
      .set("Authorization", `Bearer ${token}`)
      .field("eventId", String(assignedEventId))
      .attach("photos", Buffer.alloc(10 * 1024 * 1024 + 1), {
        filename: "large.jpg",
        contentType: "image/jpeg",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Each photo must be 10 MB or smaller");
  });

  test("upload should reject more than 10 files", async () => {
    const uploadRequest = request(app)
      .post("/api/photos/upload")
      .set("Authorization", `Bearer ${token}`)
      .field("eventId", String(assignedEventId));

    for (let index = 0; index < 11; index += 1) {
      uploadRequest.attach("photos", validImage, {
        filename: `photo-${index}.jpg`,
        contentType: "image/jpeg",
      });
    }

    const response = await uploadRequest;

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("You can upload a maximum of 10 photos");
  });

  test("upload should reject unauthenticated requests", async () => {
    const response = await request(app)
      .post("/api/photos/upload")
      .field("eventId", String(assignedEventId))
      .attach("photos", validImage, {
        filename: "photo.jpg",
        contentType: "image/jpeg",
      });

    expect(response.statusCode).toBe(401);
  });

  test("upload should return 403 for an unassigned event", async () => {
    const response = await request(app)
      .post("/api/photos/upload")
      .set("Authorization", `Bearer ${token}`)
      .field("eventId", "999999")
      .attach("photos", validImage, {
        filename: "photo.jpg",
        contentType: "image/jpeg",
      });

    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("You are not assigned to this event");
  });

  test("upload should return 502 when image storage fails", async () => {
    const uploadStreamSpy = jest
      .spyOn(cloudinary.uploader, "upload_stream")
      .mockImplementation((options, callback) => {
        const stream = new PassThrough();
        process.nextTick(() => callback(new Error("Cloudinary unavailable")));
        return stream;
      });

    try {
      const response = await request(app)
        .post("/api/photos/upload")
        .set("Authorization", `Bearer ${token}`)
        .field("eventId", String(assignedEventId))
        .attach("photos", validImage, {
          filename: "photo.jpg",
          contentType: "image/jpeg",
        });

      expect(response.statusCode).toBe(502);
      expect(response.body.message).toBe("Image storage upload failed");
    } finally {
      uploadStreamSpy.mockRestore();
    }
  });

  test("TEAM_MEMBER should be rejected when uploading to an unassigned event", async () => {
    const response = await request(app)
      .post("/api/photos/upload")
      .set("Authorization", `Bearer ${token}`)
      .field("eventId", "999999");

    expect(response.statusCode).toBe(400);
  });

  test("TEAM_MEMBER should be rejected from publishing a gallery", async () => {
  const response = await request(app)
    .post("/api/photos/publish")
    .set("Authorization", `Bearer ${token}`)
    .send({
      eventId: 1,
      photoIds: [1],
      pin: "1234",
    });

  expect(response.statusCode).toBe(403);
  expect(response.body.success).toBe(false);
});

test("ADMIN should reject publishing an Event 2 photo into Event 1", async () => {
  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@trizenai.com" },
  });

  const teamUser = await prisma.user.findUnique({
    where: { email: "team1@example.com" },
  });

  const event1 = await prisma.event.findFirst({
    where: { createdById: adminUser.id },
    orderBy: { id: "asc" },
  });

  const event2 = await prisma.event.create({
    data: {
      name: `Task 2 Event 2 ${Date.now()}`,
      description: "Cross-event security test",
      createdById: adminUser.id,
    },
  });

  try {
    await prisma.eventMember.create({
      data: {
        eventId: event2.id,
        userId: teamUser.id,
      },
    });

    const event2Photo = await prisma.photo.create({
      data: {
        eventId: event2.id,
        uploaderId: teamUser.id,
        filename: `task2-event2-${Date.now()}.jpg`,
        storageUrl: "https://example.com/task2-event2.jpg",
        fileSize: 789,
      },
    });

    const response = await request(app)
      .post("/api/photos/publish")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        eventId: event1.id,
        photoIds: [event2Photo.id],
        pin: "1234",
      });

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Photos must belong to the selected event"
    );
  } finally {
    await prisma.event.delete({
      where: { id: event2.id },
    });
  }
});

  afterAll(async () => {
    await prisma.photo.deleteMany({
      where: {
        id: {
          in: [ownPhotoId, otherPhotoId],
        },
      },
    });

    if (temporaryUserId) {
      await prisma.eventMember.deleteMany({
        where: { userId: temporaryUserId },
      });
      await prisma.user.delete({ where: { id: temporaryUserId } });
    }

    await prisma.$disconnect();
  });
});