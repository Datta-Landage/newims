import dns from 'dns';
import { getRequestListener } from "@hono/node-server";
import app from "../src/app";
import { connectDB } from "../src/config/database";

// Set DNS servers to Google's to resolve SRV records if default DNS fails
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (err) {
    // Ignore if not allowed in child process or environment
}

// Global DB Connection for Serverless
try {
    connectDB()
    console.log("hua connect")
} catch (error) {
    console.log("nahi hua na connect")
}
// connectDB();


export default getRequestListener(app.fetch);
