import { prisma } from "./src/database/prisma";

async function check() {
  console.log("Prisma Client Keys:", Object.keys(prisma));
  // check if user delegate has expected methods
  // @ts-ignore
  if (prisma.user) {
    // @ts-ignore
    console.log("User Delegate Keys:", Object.keys(prisma.user));
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
