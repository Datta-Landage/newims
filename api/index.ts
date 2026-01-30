import { handle } from "hono/vercel";
import app from "../src/app";

export const config = {
  runtime: "nodejs",
};

// Global DB Connection moved to app middleware to prevent cold start hangs

export default handle(app);
