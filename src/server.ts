async function startServer() {
  try {
    // Validate environment variables before loading the app (fail fast)
    const { env } = await import("./config/env");

    const [{ setupAuth }, { checkDatabaseConnection }, { default: app }] =
      await Promise.all([
        import("./modules/auth/auth"),
        import("./database/checkConnection"),
        import("./app"),
      ]);

    await setupAuth();
    await checkDatabaseConnection();

    app.listen(env.port, () => {
      console.log(`Server is running on http://localhost:${env.port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
