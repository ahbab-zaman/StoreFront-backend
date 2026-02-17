import { prisma } from "./src/database/prisma";

const BASE_URL = "http://localhost:8000/api/v1/auth";
const EMAIL = `test_${Date.now()}@example.com`;
const PASSWORD = "Password123!";

async function run() {
  console.log("🚀 Starting Auth Flow Verification...");
  console.log(`Target Email: ${EMAIL}`);

  try {
    // 1. Register
    console.log("\n1️⃣  Registering...");
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: EMAIL,
        password: PASSWORD,
        role: "CUSTOMER",
      }),
    });

    const regData = await regRes.json();
    console.log(`Status: ${regRes.status}`, regData);
    if (regRes.status !== 201) throw new Error("Registration failed");

    // 2. Fetch OTP from DB
    console.log("\n2️⃣  Fetching OTP from DB...");

    const otpRecord = await prisma.oTP.findFirst({
      where: { email: EMAIL, type: "VERIFY_EMAIL", isUsed: false },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) throw new Error("OTP not found in DB");

    // Manually verify user to test Login
    console.log("   OTP found (hashed).");
    console.log("   Manually marking user as verified in DB...");
    await prisma.user.update({
      where: { email: EMAIL },
      data: { isEmailVerified: true },
    });
    console.log("   User manually verified.");

    // 3. Login
    console.log("\n3️⃣  Logging in...");
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
      }),
    });

    const loginData = await loginRes.json();
    console.log(
      `Status: ${loginRes.status}`,
      loginData.user ? "Success" : loginData,
    );
    if (loginRes.status !== 200) throw new Error("Login failed");

    const accessToken = loginData.accessToken;
    // Extract cookies
    const cookieHeader = loginRes.headers.get("set-cookie");
    // console.log("   Cookies received:", cookieHeader ? "Yes" : "No");

    const refreshTokenCookie = cookieHeader
      ?.split(";")
      .find((c) => c.trim().startsWith("refreshToken="));
    if (!refreshTokenCookie) throw new Error("Refresh token cookie missing");

    // 5. Refresh Token
    console.log("\n5️⃣  Refreshing Token...");
    const refreshRes = await fetch(`${BASE_URL}/refresh`, {
      method: "POST",
      headers: {
        Cookie: refreshTokenCookie,
      },
    });

    const refreshData = await refreshRes.json();
    console.log(
      `Status: ${refreshRes.status}`,
      refreshData.accessToken ? "Success" : refreshData,
    );
    if (refreshRes.status !== 200) throw new Error("Refresh failed");

    // 6. Logout
    console.log("\n6️⃣  Logging out...");
    const logoutRes = await fetch(`${BASE_URL}/logout`, {
      method: "POST",
      headers: {
        Cookie: refreshTokenCookie,
      },
    });

    const logoutData = await logoutRes.json();
    console.log(`Status: ${logoutRes.status}`, logoutData);
    if (logoutRes.status !== 200) throw new Error("Logout failed");

    console.log("\n✅ Auth Flow Verified Successfully!");
  } catch (err: any) {
    console.error("\n❌ Verification Failed:", err.message);
    if (err.cause) console.error(err.cause);
  } finally {
    // Cleanup
    try {
      await prisma.user.deleteMany({ where: { email: EMAIL } });
      await prisma.oTP.deleteMany({ where: { email: EMAIL } });
    } catch (e) {
      console.error("Cleanup failed", e);
    }
    await prisma.$disconnect();
  }
}

run();
