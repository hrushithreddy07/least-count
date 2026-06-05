# Setup & Run Guide

Follow these steps to set up, run, and play the **Least Count** card game on your local network or computer.

---

## 📋 Prerequisites

Make sure you have the following installed on your machine:
- **Node.js** (v18.x or higher recommended)
- **npm** (comes bundled with Node.js)

---

## 🛠️ Step 1: Install Dependencies

We have configured a helper script at the root directory to install all root, client, and server dependencies in one step.

Open your terminal in the project root directory and run:
```bash
npm run install-all
```

*This command automatically installs:*
1. Root dev dependencies (like `concurrently`)
2. Server dependencies (like `express` and `socket.io`)
3. Client dependencies (like `react`, `socket.io-client`, and `lucide-react`) using peer-dependency resolution.

---

## 🚀 Step 2: Start the Game

To launch both the server and client concurrently, run the following command in the project root:
```bash
npm start
```

Once running:
- **Client (Frontend)**: Running at **[http://localhost:5173/](http://localhost:5173/)**
- **Server (Backend/WebSockets)**: Running at **[http://localhost:3000/](http://localhost:3000/)**

---

## 👥 Step 3: Test Multiplayer Locally

To test the remote multiplayer flow using a single computer:

1. Open your browser and go to `http://localhost:5173/`.
2. Type **"Alice"** under *Create Room* and click **Create New Room**.
3. You will enter the lobby and see a **Room Code** (e.g. `WXYZ`).
4. Open a **Private/Incognito Window** (or a different browser like Chrome/Firefox/Edge) and go to the same URL: `http://localhost:5173/`.
5. Click **Join Room**, type **"Bob"**, enter the **Room Code** from step 3, and click **Join Existing Room**.
6. Repeat for more players (supports up to 6 players).
7. Go back to Alice's window (the host) and click **Start Match**.

---

## 📶 Step 4: Play with Friends on the Same Wi-Fi Network

If you want to play with other people remotely on the same local network:

1. Locate your local IP address (e.g., `192.168.1.50`).
   - On Windows: run `ipconfig` in Command Prompt.
   - On macOS/Linux: run `ifconfig` in Terminal.
2. In `client/vite.config.ts`, expose the server by adding `host: true` under `server` config:
   ```typescript
   export default defineConfig({
     plugins: [react()],
     server: {
       host: true, // Exposes Vite dev server to the local network
       port: 5173
     }
   })
   ```
3. Restart the application: `npm start`
4. Share the client link with your friends (e.g. `http://192.168.1.50:5173/`).
5. Since the Socket connection in the client automatically connects to the server IP on port 3000, they will connect to your room instantly!
