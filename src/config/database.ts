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

    try {
        cachedPromise = mongoose.connect(Config.MONGODB_URI, {
            bufferCommands: false, // Disable Mongoose buffering to fail fast if not connected
        });
        await cachedPromise;
        console.log("✅ MongoDB Connected");
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
