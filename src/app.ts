import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { cors } from 'hono/cors';
import { connectDB } from './config/database'; // Import connectDB

// import checkRoutes from './routes/check.routes'; // Does not exist? Removed.
import api from './routes';
import { auditLogMiddleware } from './middlewares';

const app = new Hono();

// Global Middlewares
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
    origin: (origin) => {
        const allowedOrigins = [
            'http://localhost:5173',
            'https://hipalz-ims.vercel.app',
            // https://hipalz-ims.vercel.app,
            //https://hipalz-ims.vercel.app/login
            //https://hipalz-ims-backend.vercel.app
            process.env.FRONTEND_URL
        ].filter(Boolean);

        return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Branch-Id'],
    exposeHeaders: ['Set-Cookie'],
    maxAge: 86400, // 24 hours
}));

// Ensure DB is connected before processing any request
// app.use('*', async (c, next) => {
//     await connectDB();
//     await next();
// });

// app.use('*', auditLogMiddleware);

app.route('/api/v1', api);

app.get('/health', (c) => c.json({ status: 'ok', uptime: process.uptime() }));

export default app;
