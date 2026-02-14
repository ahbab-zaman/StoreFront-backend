import app from "./app";
import { env } from "./config/env";
import { setupAuth } from "./modules/auth/auth";

async function startServer() {
  
await setupAuth();
const port = env.port;
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
