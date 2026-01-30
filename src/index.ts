import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { handle } from "hono/vercel";
import app from "./app";
import { Config } from "./config";
import { connectDB } from "./config/database";

// DNS cache settings (Optional: Keep if necessary for your environment)
// try {
//   dns.setServers(['8.8.8.8', '8.8.4.4']);
// } catch (err) {
//   // Ignore DNS errors in environments where it's restricted
// }

// Global DB Connection (Best practice for Serverless cold starts)
// Global DB Connection (Best practice for Serverless cold starts)
connectDB()
  .then(() => console.log("✅ DB Connection Initiated from Source Entry Point"))
  .catch((err) =>
    console.error("❌ DB Connection Failed at Source Entry Point:", err),
  );

if (!(app instanceof Hono)) {
  throw new Error("Application must be an instance of Hono");
}

// 1. Export the handler for Vercel
export default handle(app);

// 2. Local Development Fallback
const port = Number(Config.PORT) || 3000;

// @ts-ignore
if (typeof Bun !== "undefined") {
  console.log(`🚀 Bun Server running on port ${port}`);
  // @ts-ignore
  Bun.serve({
    port: port,
    fetch: app.fetch,
  });
} else if (!process.env.VERCEL) {
  // Only start the Node server if we are NOT on Vercel
  console.log(`🚀 Node Server running on port ${port}`);
  serve({
    fetch: app.fetch,
    port: port,
  });
}
