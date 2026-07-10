# Render Deployment Guide — MarketPilot AI Backend

This guide outlines step-by-step instructions to deploy the MarketPilot AI backend REST API server to **Render** and connect your React frontend.

---

## 1. Create a New Web Service on Render

1. Log in to the [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository containing the `MarketPilotAI` codebase.

---

## 2. Configure Web Service Settings

Configure the following settings in the Render creation wizard:

*   **Name:** `marketpilot-api` (or your preferred name)
*   **Region:** Select the region closest to you or your target users (e.g., *Oregon (US West)* or *Singapore (Asia)*).
*   **Branch:** `main`
*   **Root Directory:** `server`
    > [!IMPORTANT]
    > You must set the **Root Directory** to `server`. This tells Render to run commands inside the `/server` folder where `package.json` and `index.js` reside.
*   **Runtime:** `Node`
*   **Build Command:** `npm install` (or `npm ci`)
*   **Start Command:** `npm start` (which executes `node index.js`)
*   **Plan:** Select the **Free** tier (or paid tiers if you expect higher volume).

---

## 3. Configure Environment Variables

Navigate to the **Environment** tab of your Render Web Service and add the following environment variables:

| Key | Value Source / Example | Required | Purpose |
| :--- | :--- | :--- | :--- |
| **`NODE_ENV`** | `production` | Yes | Runs the Express API in production mode. |
| **`GEMINI_API_KEY`** | *Your Gemini key* | Yes | Fallback LLM and structured scraper model. |
| **`TAVILY_API_KEY`** | *Your Tavily key* | Yes | Search API for news feeds and fallback scrapes. |
| **`GROQ_API_KEY_1`** | *Your Groq Key 1* | Yes | Primary high-reasoning prompt synthesizer. |
| **`GROQ_API_KEY_2`** | *Your Groq Key 2* | No | Rotated key pool element. |
| **`GROQ_API_KEY_3`** | *Your Groq Key 3* | No | Rotated key pool element. |
| **`GROQ_API_KEY_4`** | *Your Groq Key 4* | No | Rotated key pool element. |

---

## 4. Connecting Your Frontend Client

Once your backend service is deployed, Render will provide a public URL (e.g., `https://marketpilot-api.onrender.com`).

To connect your React frontend:

1. When building/hosting your React application (on Vercel, Netlify, or Render Static Site), add the build environment variable:
   *   **Key:** `VITE_API_URL`
   *   **Value:** `https://marketpilot-api.onrender.com` (replace with your actual Render backend URL)
2. If `VITE_API_URL` is omitted, the frontend defaults to `http://localhost:5000` (for local development).

---

## 5. Deployment Verification & Diagnostics

To verify the backend is active, query the following URLs in your browser or via curl:

*   **Server Health Check:**
    ```bash
    curl https://your-backend-url.onrender.com/health
    ```
    *Response:* `{"status":"ok","timestamp":"..."}`
*   **Fuzzy Ticker Autocomplete Check:**
    ```bash
    curl https://your-backend-url.onrender.com/api/resolve?company=Apple
    ```
    *Response:* `{ "success": true, "ticker": "AAPL", "name": "Apple Inc." }`
