const request = require("supertest");
const app = require("../src/app");

describe("Authentication API", () => {
  test("GET /api/auth/me should reject unauthenticated requests", async () => {
    const response = await request(app)
      .get("/api/auth/me");

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("TEAM_MEMBER should be rejected from admin-only route", async () => {
  const loginResponse = await request(app)
    .post("/api/auth/login")
    .send({
      email: "team1@example.com",
      password: "Team@123456",
    });

  expect(loginResponse.statusCode).toBe(200);

  const token = loginResponse.body.token;

  const response = await request(app)
    .get("/api/auth/admin-only")
    .set("Authorization", `Bearer ${token}`);

  expect(response.statusCode).toBe(403);
  expect(response.body.success).toBe(false);
});

  test("GET /api/auth/admin-only should reject unauthenticated requests", async () => {
    const response = await request(app)
      .get("/api/auth/admin-only");

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

afterAll(async () => {
  const prisma = require("../src/lib/prisma");
  await prisma.$disconnect();
});