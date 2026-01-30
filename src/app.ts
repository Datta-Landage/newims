import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import mongoose from "mongoose";
import { connectDB } from "./config/database";
import { Role } from "./models";
import api from "./routes";

const app = new Hono();

app.use("*", cors());

// Global Middlewares
app.use("*", logger());
// Connect to DB lazily
app.use("*", async (c, next) => {
  try {
    await connectDB();
  } catch (err) {
    console.error("Lazy DB Connection Failed:", err);
  }
  await next();
});

app.use("*", async (c, next) => {
  console.log(`[REQUEST] ${c.req.method} ${c.req.url}`);
  await next();
});
app.use("*", prettyJSON());

app.get("/", (c) =>
  c.json({ message: "Backend is running!", timestamp: new Date() }),
);

// Ensure DB is connected before processing any request
// app.use('*', async (c, next) => {
//     await connectDB();
//     await next();
// });

// app.use('*', auditLogMiddleware);

app.route("/api/v1", api);

app.get("/health", async (c) => {
  let dbStatus = "unknown";
  let dbCheck = "pending";
  let isHealthy = false;

  try {
    const state = mongoose.connection.readyState;
    const states = [
      "disconnected",
      "connected",
      "connecting",
      "disconnecting",
      "uninitialized",
    ];
    dbStatus = states[state] || "unknown";

    if (state === 1) {
      // Perform a lightweight query to verify read access
      await Role.findOne().select("_id").lean();
      dbCheck = "success";
      isHealthy = true;
    } else {
      dbCheck = "failed: not connected";
    }
  } catch (error: any) {
    dbCheck = `failed: ${error.message}`;
    console.error("Health Check DB Error:", error);
  }

  const payload = {
    status: isHealthy ? "ok" : "error",
    uptime: process.uptime(),
    dbState: dbStatus,
    dbCheck: dbCheck,
    timestamp: new Date().toISOString(),
  };

  return c.json(payload, isHealthy ? 200 : 503);
});

export default app;
