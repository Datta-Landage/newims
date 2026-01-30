import { getRequestListener } from "@hono/node-server";
import dns from "dns";
import app from "../src/app";
import { connectDB } from "../src/config/database";

// Set DNS servers to Google's to resolve SRV records if default DNS fails
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (err) {
  // Ignore if not allowed in child process or environment
}

// Global DB Connection for Serverless
connectDB()
  .then(() => console.log("✅ DB Connection Initiated from Entry Point"))
  .catch((err) =>
    console.error("❌ DB Connection Failed at Entry Point:", err),
  );

export default getRequestListener(app.fetch);
