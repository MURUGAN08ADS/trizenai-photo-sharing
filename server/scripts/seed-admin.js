require("dotenv").config();

const bcrypt = require("bcryptjs");
const prisma = require("../src/lib/prisma");

const requiredVariables = ["ADMIN_NAME", "ADMIN_EMAIL", "ADMIN_PASSWORD"];

async function main() {
  const missingVariables = requiredVariables.filter(
    (name) => !process.env[name]
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(", ")}`
    );
  }

  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);

  await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL },
    update: {
      name: process.env.ADMIN_NAME,
      passwordHash,
      role: "ADMIN",
    },
    create: {
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Admin account ready");
}

main()
  .catch((error) => {
    console.error("Admin seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
