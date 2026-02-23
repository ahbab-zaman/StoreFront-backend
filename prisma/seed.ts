import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcrypt";

// ─── Prisma Initialization ────────────────────────────────────────────────────

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Config ──────────────────────────────────────────────────────────────────

const SALT_ROUNDS = 10;

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: Role;
}

function loadSeedUsers(): SeedUser[] {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPass = process.env.SEED_ADMIN_PASSWORD;
  const sellerEmail = process.env.SEED_SELLER_EMAIL;
  const sellerPass = process.env.SEED_SELLER_PASSWORD;

  if (!adminEmail || !adminPass || !sellerEmail || !sellerPass) {
    throw new Error(
      "[Seed] Missing required seed credentials in environment variables.",
    );
  }

  return [
    {
      name: "Admin",
      email: adminEmail,
      password: adminPass,
      role: Role.ADMIN,
    },
    {
      name: "Seller",
      email: sellerEmail,
      password: sellerPass,
      role: Role.SELLER,
    },
  ];
}

// ─── Logger ───────────────────────────────────────────────────────────────────

const log = {
  info: (msg: string) => console.log(`  ℹ  ${msg}`),
  success: (msg: string) => console.log(`  ✅ ${msg}`),
  skip: (msg: string) => console.log(`  ⏭  ${msg}`),
  error: (msg: string) => console.error(`  ❌ ${msg}`),
  banner: (msg: string) =>
    console.log(`\n${"─".repeat(50)}\n${msg}\n${"─".repeat(50)}`),
};

// ─── Seeder Logic ────────────────────────────────────────────────────────────

export async function runSeeder(): Promise<void> {
  log.banner("StoreFront Backend — Database Seeder");

  try {
    const users = loadSeedUsers();
    await prisma.$connect();
    log.info("Connected to database");

    for (const user of users) {
      const existing = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, email: true, role: true },
      });

      if (existing) {
        log.skip(`${user.role} already exists  →  ${user.email}`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

      const created = await prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          password: hashedPassword,
          role: user.role,
          provider: "LOCAL",
          isEmailVerified: true, // Seed users bypass OTP flow
        },
        select: { id: true, email: true, role: true },
      });

      log.success(`Created ${created.role}  →  ${created.email}`);
    }

    log.banner("Seeding complete ✅");
  } catch (err) {
    log.error(
      `Seeding failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    throw err;
  } finally {
    await prisma.$disconnect();
    log.info("Disconnected from database");
  }
}

// ─── Exec ────────────────────────────────────────────────────────────────────

if (import.meta.url.endsWith("seed.ts")) {
  runSeeder().catch(() => process.exit(1));
}
