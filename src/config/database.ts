import mongoose from "mongoose";
import { Config } from "./index";

// Global cached connection promise
let cachedPromise: Promise<typeof mongoose> | null = null;

export const connectDB = async () => {
  if (cachedPromise) {
    return cachedPromise;
  }

  if (!Config.MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable");
  }

  const isLocalhost =
    Config.MONGODB_URI.includes("localhost") ||
    Config.MONGODB_URI.includes("127.0.0.1");
  // Mask the password for logging
  const maskedURI = Config.MONGODB_URI.replace(/:([^:@]+)@/, ":****@");

  console.log(`📡 Attempting to connect to MongoDB...`);
  console.log(`🔗 URI: ${maskedURI} (Localhost: ${isLocalhost})`);

  try {
    cachedPromise = mongoose.connect(Config.MONGODB_URI, {
      bufferCommands: false, // Disable Mongoose buffering to fail fast if not connected
      serverSelectionTimeoutMS: 5000, // Fail after 5 seconds instead of 30s default
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });
    await cachedPromise;
    console.log("✅ MongoDB Connected Successfully");
    return cachedPromise;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    // Do NOT process.exit(1) in serverless; let the request fail but keep the lambda alive if possible,
    // or let the error bubble up so Vercel captures it in logs.
    throw error;
  }
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  console.log("✅ MongoDB Disconnected");
};
