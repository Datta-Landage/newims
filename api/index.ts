import { handle } from "hono/vercel";
import app from "../src/app";
import { connectDB } from "../src/config/database";

export const config = {
  runtime: "nodejs",
};

// Global DB Connection (Best practice for Serverless cold starts)
connectDB()
  .then(() => console.log("✅ DB Connection Initiated from API Entry Point"))
  .catch((err) =>
    console.error("❌ DB Connection Failed at API Entry Point:", err),
  );

export default handle(app);
