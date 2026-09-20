const request = require("supertest");
const app = require("../src/app");

let adminToken;

beforeAll(async () => {
  const response = await request(app)
    .post("/api/auth/login")
    .send({
      email: "admin@trizenai.com",
      password: "Admin@12345",
    });

  adminToken = response.body.token;
});

afterAll(async () => {
  const prisma = require("../src/lib/prisma");
  await prisma.$disconnect();
});

test("ADMIN should reject an empty event name", async () => {
  const response = await request(app)
    .post("/api/events")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: "   ",
      description: "Invalid event",
    });

  expect(response.statusCode).toBe(400);
  expect(response.body.success).toBe(false);
});