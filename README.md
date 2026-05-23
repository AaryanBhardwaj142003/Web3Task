# YouTube Watch Party (SyncStream)

SyncStream is a real-time YouTube Watch Party application that allows multiple users to synchronize YouTube videos, watch together, chat, and manage rooms with role-based permissions.

## Features

1. **Real-Time Video Synchronization**: Controls (play/pause, seek, changing videos) are synchronized instantly across all clients in the room using WebSockets (Socket.IO).
2. **State Persistence**: Active room details, video playback positions, and participant lists are saved in **Upstash Redis** so they survive server restarts and spin-downs (e.g., on Render's free tier).
3. **Display Names**: Users select a custom name on the dashboard before joining or creating rooms.
4. **Role-Based Access Control (RBAC)**:
   - **Host** (Room Creator): Full playback controls, role promotion/demotion for other users, host transfer capability, and kick/remove participant control.
   - **Moderator**: Access to playback controls (play/pause, seek, change video).
   - **Participant**: Watch-only role (playback controls are locked).
   - **Viewer**: Watch-only role (playback controls are locked).
5. **Real-Time Chat & Activity Logs**: Floating toast alerts appear when a user joins/leaves, when roles change, or when someone gets removed. Live room chat allows real-time text discussion.
6. **Kick Participant Handling**: Kicked users are automatically disconnected and redirected back to the dashboard with an alert.

---

## Tech Stack

- **Frontend**: React (v19), TypeScript, Vite, React Router
- **Backend**: Node.js, Express, Socket.IO, ioredis
- **Database**: Upstash Redis (Serverless TLS-enabled Redis)
- **Styling**: Premium Modern Vanilla CSS (Aesthetics tailored with custom dark mode, glassmorphism, gradient glows, and sliding toast animations).

---

## Architecture Overview

```mermaid
graph TD
    Client1["Host Client"] <-->|Socket.IO Events| Server["Node.js + Socket.IO Server"]
    Client2["Moderator Client"] <-->|Socket.IO Events| Server
    Client3["Participant Client"] <-->|Socket.IO Events| Server
    Server <-->|Local Cache| RoomState["In-Memory Room State"]
    Server <-->|TLS Connection| Redis[("Upstash Redis Store (24h TTL)")]
```

---

## Setup & Running Locally

### 1. Run the Backend

```bash
cd backend
npm install
npm run dev
```
The server will start listening on port `3000` (or `PORT` environment variable).

### 2. Run the Frontend

```bash
cd fronetnd
npm install
npm run dev
```
Open `http://localhost:5173` in multiple browser tabs to test the real-time sync, role assignments, and kicking!

---

## Production Deployment Guide (Step-by-Step)

Follow these step-by-step instructions to deploy SyncStream for free.

### Step 1: Set Up Upstash Redis
Since Render's free tier spun-down servers lose standard in-memory states, we use Upstash Redis as a persistent state store.

1. Go to the [Upstash Console](https://console.upstash.com/) and log in (or sign up for a free account).
2. Click **Create Database**.
3. Fill in the database details:
   - **Name**: `syncstream-redis`
   - **Type**: `Global` or select your preferred region.
4. Click **Create**.
5. Once created, scroll down to the **Connection Details** section.
6. Copy the **Redis Connect URL** (make sure to select the `ioredis` tab or look for the URL starting with `rediss://`).
   > [!IMPORTANT]
   > Ensure the connection URL starts with `rediss://` (double `s`) for SSL/TLS support, which Upstash requires.
   >
   > **Format example:** `rediss://default:YOUR_PASSWORD@your-db-endpoint.upstash.io:6379`

---

### Step 2: Deploy Backend to Render
1. Sign in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your Git repository containing the SyncStream code.
4. Configure the Web Service settings:
   - **Name**: `syncstream-backend`
   - **Language**: `Node`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Scroll down and click **Advanced** -> **Add Environment Variable**.
6. Add the following key-value pair:
   - **Key**: `REDIS_URL`
   - **Value**: `rediss://default:YOUR_PASSWORD@your-db-endpoint.upstash.io:6379` *(The URL you copied from Upstash in Step 1)*
7. Click **Create Web Service**. 
8. Render will build and deploy your backend. Copy your deployed service URL (e.g., `https://syncstream-backend.onrender.com`).

---

### Step 3: Deploy Frontend to Vercel or Netlify
You can deploy the frontend static files to any hosting provider. Vercel and Netlify are recommended.

#### Option A: Deploy to Vercel
1. Go to the [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New** -> **Project**.
3. Select and import your Git repository.
4. Configure the Project settings:
   - **Framework Preset**: `Vite` (Vercel automatically detects this)
   - **Root Directory**: `fronetnd`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add the backend address:
   - **Key**: `VITE_BACKEND_URL`
   - **Value**: `https://syncstream-backend.onrender.com` *(The URL of your deployed Render backend)*
6. Click **Deploy**. Vercel will build your React application and generate a public live link!

#### Option B: Deploy to Netlify
1. Go to the [Netlify Dashboard](https://app.netlify.com/).
2. Click **Add new site** -> **Import an existing project**.
3. Select and import your Git repository.
4. Configure the Build settings:
   - **Base directory**: `fronetnd`
   - **Build command**: `npm run build`
   - **Publish directory**: `fronetnd/dist`
5. Click **Add environment variables**:
   - **Key**: `VITE_BACKEND_URL`
   - **Value**: `https://syncstream-backend.onrender.com` *(The URL of your deployed Render backend)*
6. Click **Deploy site**.
