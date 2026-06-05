# Linux Setup & Run Guide

This guide describes how to install, set up, and run the **Least Count** card game on any Linux distribution (Ubuntu, Debian, Fedora, Arch, etc.).

---

## 📋 Prerequisites

To run this project, you need **Node.js** and **npm** installed on your Linux machine.

### **1. Installing Node.js & npm on Linux**

Choose the command corresponding to your Linux package manager:

#### **Ubuntu / Debian / Linux Mint:**
```bash
sudo apt update
sudo apt install -y nodejs npm
```

#### **Fedora / RedHat / CentOS:**
```bash
sudo dnf install -y nodejs npm
```

#### **Arch Linux / Manjaro:**
```bash
sudo pacman -S nodejs npm
```

#### **Verification**
Ensure they are correctly installed by checking their versions:
```bash
node -v
npm -v
```

---

## 🛠️ Step 1: Clone and Install Dependencies

1. **Clone the Repository** (if running on a separate Linux machine):
   ```bash
   git clone https://github.com/hrushithreddy07/least-count.git
   cd least-count
   ```

2. **Install all Dependencies**:
   We have configured a root helper script that installs dependencies for the root monorepo, backend server, and frontend client in one go. Run:
   ```bash
   npm run install-all
   ```

---

## 🚀 Step 2: Start the Game

To launch both the server and client concurrently in development mode, run:
```bash
npm start
```

This starts:
- **Frontend client** on `http://localhost:5173/`
- **Backend websocket server** on `http://localhost:3000/`

---

## 👥 Step 3: Test Multiplayer Locally

To test the remote multiplayer flow using separate browser windows on Linux:

1. Open your browser (e.g. Firefox) and navigate to `http://localhost:5173/`.
2. Type **"Alice"** under *Create Room* and click **Create New Room** to enter the lobby and get your Room Code (e.g., `ABCD`).
3. Open a **New Private/Incognito Window** and navigate to the same URL: `http://localhost:5173/`.
4. Click **Join Room**, type **"Bob"**, enter the **Room Code**, and click **Join Existing Room**.
5. Back in Alice's tab (the host), click **Start Match** to begin the game!
