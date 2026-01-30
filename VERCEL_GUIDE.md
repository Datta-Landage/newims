# Vercel Deployment Guide for IMS Backend

This guide ensures your Hono/Node.js backend is correctly configured for Vercel Serverless Functions.

## 1. Project Configuration Checklist

Ensure your files are set up as follows (we have already done this):

*   **`vercel.json`**:
    ```json
    {
      "version": 2,
      "outputDirectory": "dist",
      "buildCommand": "npm run build",
      "rewrites": [
        { "source": "/(.*)", "destination": "/api/index.ts" }
      ]
    }
    ```

## 2. Vercel Dashboard Settings

Go to your Project Settings on Vercel and ensure these match exactly:

| Setting | Value | Override? |
| :--- | :--- | :--- |
| **Framework Preset** | `Other` | - |
| **Build Command** | `npm run build` | ✅ Yes |
| **Output Directory** | `dist` | ✅ Yes |
| **Install Command** | `npm install` | ✅ Yes |

> **Note**: If you still get 404s, double check that you are accessing the correct routes (see below).

## 3. Environment Variables

You **MUST** add these variables in Vercel under **Settings > Environment Variables**:

*   `MONGODB_URI`: Your full MongoDB connection string.
*   `JWT_SECRET`: Secret key for tokens.
*   `JWT_REFRESH_SECRET`: Secret key for refresh tokens.
*   `FRONTEND_URL`: `https://hipalz-ims.vercel.app` (or your frontend domain).

**Important**: If `MONGODB_URI` is missing or invalid (e.g., waiting for IP allowlist), the app might crash or time out, resulting in "routes not loading".

## 4. Troubleshooting "Routes Not Loading"

If you see a 404 or 500 error:

1.  **Check Function Logs**:
    *   Go to **Deployments** > Select the latest deployment > **Functions** tab.
    *   Select `api/index.ts`.
    *   Look for the logs we added: `✅ MongoDB Connected Successfully` or `❌ MongoDB Connection Error`.

2.  **Verify URLs**:
    *   **Health Check**: `https://your-project.vercel.app/health`
        *   If this returns 503, the DB is not connected.
        *   If this returns 404, Vercel isn't routing correctly.
    *   **API Routes**: `https://your-project.vercel.app/api/v1/users` (Note the `/api/v1` prefix).
    *   **Root URL**: `https://your-project.vercel.app/` will return **404** because we have no route for `/`. **This is normal.**
