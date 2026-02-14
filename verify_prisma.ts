import { prisma } from "./src/database/prisma";

async function verify() {
  console.log("Verifying Prisma Client...");
  try {
    // Check if fields exist on the model def

    const user = await prisma.user.findFirst();
    console.log("User found (or null):", user);

    if (user) {
      console.log("Checking fields...");
      // Cast to any to avoid TS errors if types are stale
      console.log("isEmailVerified:", (user as any).isEmailVerified);
      console.log("failedLoginAttempts:", (user as any).failedLoginAttempts);
    }

    console.log("Prisma Client seems to be working (runtime).");
  } catch (err: any) {
    console.error("Verification failed:", err.message);
    console.error(JSON.stringify(err, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

verify();
