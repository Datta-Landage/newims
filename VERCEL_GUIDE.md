# 🚀 How to Deploy on Vercel (Hono "Native" Setup)

Since we switched to the standard Hono setup (using `api/[...route].ts`), deployment is very simple. Vercel automatically detects the API as a Serverless Function.

## 1. Push Code to GitHub
Ensure your latest code (with `api/[...route].ts`) is pushed to your GitHub repository.

## 2. Import Project in Vercel
1.  Go to your **[Vercel Dashboard](https://vercel.com/dashboard)**.
2.  Click **"Add New..."** -> **"Project"**.
3.  **Import** your `newims` repository.

## 3. Configure Project Settings

In the "Configure Project" screen, set the following:

| Setting | Value | Notes |
| :--- | :--- | :--- |
| **Framework Preset** | **Hono** | If not available, select **Other**. |
| **Root Directory** | `./` | Default (leave empty). |
| **Build Command** | `npm run build` | Optional, but good for error checking. |
| **Output Directory** | `dist` | Default. |
| **Install Command** | `npm install` | Default. |

> **Note:** Because we are using `api/[...route].ts`, Vercel automatically handles the routing!

## 4. Environment Variables (Critical!) 🔑

Expand the **"Environment Variables"** section and add the following keys from your `.env` file:

*   `MONGODB_URI`: `mongodb+srv://...` (Your Request Connection String)
    *   *Make sure your MongoDB Atlas "Network Access" allows `0.0.0.0/0` (Anywhere).*
*   `JWT_SECRET`: `your_secret_key`
*   `JWT_REFRESH_SECRET`: `your_refresh_secret`
*   `FRONTEND_URL`: `https://your-frontend.vercel.app` (or `*` for testing)

## 5. Click "Deploy" 🚀

Vercel will build your project. Once done, you will get a URL like `https://newims.vercel.app`.

## 6. Verify Deployment

Since we are using the `/api` directory, your routes will be:

*   **API Root**: `https://newims.vercel.app/api`
*   **Health Check**: `https://newims.vercel.app/api/health`
    *   *Note: Using the Hono Vercel adapter, often the routes are mounted relative to the file path. Check `/api/health` first.*
*   **Users**: `https://newims.vercel.app/api/v1/users`

### Troubleshooting

*   **404 Not Found**:
    *   Remember, there is no "Homepage" (`/`).
    *   Try accessing `/api/health`.
*   **500 Server Error**:
    *   Check **Functions** logs in Vercel Dashboard.
    *   Usually means `MONGODB_URI` is missing or wrong.
