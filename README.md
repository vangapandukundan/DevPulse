# ⚡ DevPulse — Developer Intelligence Agent

> **Live Demo URL**: [https://dev-pulse-sigma-taupe.vercel.app/](https://dev-pulse-sigma-taupe.vercel.app/)  
> **Backend Service**: [https://devpulse-uis1.onrender.com/health](https://devpulse-uis1.onrender.com/health)

DevPulse is an AI-driven developer advocacy agent and analytics dashboard. It is designed to act as a developer advocate: tracking code metrics, detecting "Invisible Work" (like heavy code reviews, mentoring, and discussions), assessing burnout risk, and taking autonomous action (like calendar blocking via Google Calendar MCP) to protect developer wellbeing.

---

## 🎯 What DevPulse Does

*   **👁️ Detects "Invisible Work"**: Automatically captures unrecorded developer contributions—like peer pull request reviews, issue discussions, and mentoring—ensuring hidden contributions are visible.
*   **📈 Tracks Skill Velocity**: Evaluates commit patterns, framework usage, and documentation changes to chart real-time trajectory and skill-acquisition confidence.
*   **🔋 Burnout & Focus Analysis**: Analyzes commit timestamps to assess workload stress. It automatically highlights anomalous late-night or weekend work patterns.
*   **🔒 Focus-Block Autopiloting**: Uses an autonomous agent scheduler to detect if a developer's peak productivity hours fall between **2 PM and 5 PM**. It interfaces with the Google Calendar API to block recurring "Deep Work" times and automatically decline conflicting meetings.
*   **📝 Automated Performance Appraisals**: Gathers historical developer metrics and instantly generates a highly detailed, HR-grade self-appraisal with actionable growth recommendations.

---

## 💻 How to View the Dashboard (Live Demo Walkthrough)

To explore DevPulse's capabilities using the live link, follow these steps:

1.  **Open the Live URL**: Click [https://dev-pulse-sigma-taupe.vercel.app/](https://dev-pulse-sigma-taupe.vercel.app/) to launch the dark-mode dashboard.
2.  **View Seed Profiles**: Toggle between **Anika Sharma** (Backend lead) and **Jordan Williams** (DevOps specialist) to see their stress meters, peak times, and commit activity.
3.  **Add a Developer Dynamically**: Click the **`+ Add`** tab in the selection bar. Input a public GitHub username (e.g., `torvalds` or your own username), select a custom theme color, and hit submit. The new developer will load real-time statistics immediately.
4.  **Explore AI Insights**: Click **Insights** in the left menu. View the developer's custom **Skills Strength Map** (spider web radar chart) and **Skill Velocity Tracker** showing rising and stable skill trajectories.
5.  **Check Autopiloted Actions**: Click **Actions** in the left menu. Under **Schedule Adjustment Timeline**, notice the automated `"⚡ Autopilot: Daily Deep Work Focus Block"` schedule protection added during the developer's peak productivity hours.
6.  **Create an Appraisal**: Go to the **Review Generator** page, select your developer, choose the review period, and click **Generate AI Review**. The agent will draft a professional review summary, list achievements, identify growth areas, and assess burnout.
7.  **Single-Click Delete**: Return to the dashboard and click the small red **`x`** next to any dynamically added developer tab to remove them instantly from the local session and database.

---

## 🏗️ Architecture & MCP Partner Integration

DevPulse integrates key developer platforms with the **Model Context Protocol (MCP)**:

```
GitHub APIs ──> Agent Loop ──> Gemini 2.0 Flash ──> MongoDB Atlas ──> Google Calendar (MCP Calendar Block)
```

### Partner Integrations:
1.  **GitHub (Partner MCP)**: Queries commit history, repository data, and PR reviews to extract raw metrics.
2.  **MongoDB Atlas (Partner MCP / Cloud Storage)**: Persists developer profiles, historical analysis runs, and generated reviews.
3.  **Google Workspace (Calendar MCP)**: Leverages a custom MCP Calendar Tool to autonomously manage out-of-office blocks and protect developer deep-work hours.

---

## 🚀 How to Run Locally

If you wish to clone the repository and run it on your localhost, follow these setup instructions:

### 1. Backend Setup (FastAPI)
```bash
# Navigate to the backend directory
cd backend

# Activate virtual environment
# On Windows:
..\venv\Scripts\activate
# On Unix/macOS:
source ../venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start local server
uvicorn main:app --reload --port 8000
```
Make sure your `backend/.env` file is populated with your `GEMINI_API_KEY`, `MONGODB_URL`, and `DEMO_MODE=true`.

### 2. Frontend Setup (Vite / React)
```bash
# Navigate to the frontend directory
cd ../frontend

# Install dependencies
npm install

# Start Vite hot-reload server
npm run dev
```



