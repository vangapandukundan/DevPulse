1. What is DevPulse?
DevPulse is a full-stack, AI-driven developer intelligence dashboard and autonomous agent. It is designed to act as a developer advocate, tracking your real code metrics, finding "Invisible Work" (like heavy code reviews, mentoring, and issue discussions), assessing burnout risks, and taking autonomous actions to protect your health and career.

2. How it Works (Under the Hood)
GitHub Activity Tracking: The backend tracks raw commit histories, comment timestamps, and pull requests.
AI Agent Loop: The agent runs your developer activity logs through Google Gemini. Gemini analyzes patterns to determine burnout levels, technical trajectory, and peak productivity hours.
Autonomous Action (MCP): If Gemini detects that you work best in a specific window (e.g. 2 PM to 5 PM) or are at risk of burnout, it communicates with the Google Calendar API via the Model Context Protocol (MCP). It schedules recurring "Deep Work Blocks" that automatically decline overlapping meeting invites.
Global Syncing: The React frontend uses a unified context, immediately synchronising state across all tabs (Overview, Insights, Actions, Reviews, and Logs).

3. Real-Life Utility (Why it's useful for daily life)
Time Protection: It actively shields your flow state. If you code best in the afternoon, it blocks that time on your calendar and declines conflicting meetings.
Fair Evaluations: It automatically records your "invisible contributions" (like mentoring and PR reviews) and uses Gemini to instantly draft your Self-Performance Reviews in seconds, saving you hours of stress.
Burnout Prevention: By alerting you to sleep-disruptive coding habits, it prompts you to close your laptop and maintain a healthy work-life balance.

Technologies Used: DevPulse goes beyond a standard dashboard by implementing a true Agent Loop powered by Google Cloud.

**DevPulse** is a personal AI agent that sits in the background and watches everything you do. It connects your raw developer activity to the **Google Gemini AI** and **MCP (Model Context Protocol)** to provide real, actionable interventions.

### Key Features
- 👁️ **Invisible Work Detector:** DevPulse detects unrecorded effort (like mentoring, heavy PR reviews, and architectural planning) and logs it so you get credit.
- 📈 **Skill Velocity Tracker:** Analyzes your commits over time to generate a personal growth score based on new languages and patterns you touch.
- 📝 **Auto Performance Review Writer:** DevPulse pulls MongoDB data and writes your entire self-review with specific examples, metrics, and impact statements.
- 📤 **Markdown Exporter:** Instantly download formatted reviews as `.md` files or copy them to your clipboard with a single click.
- ⚖️ **Burnout & Flow State Optimizer:** By analyzing 30 days of commit timestamps, DevPulse learns your personal peak productivity windows. **It then acts autonomously**, connecting to the Google Calendar API via MCP to automatically block your calendar for "Deep Work" to protect your time and mental health.

---

## 🏗️ Architecture & MCP Partner Integration

DevPulse goes beyond a standard dashboard by implementing a true **Agent Loop** powered by Google Cloud Agent Builder and the Model Context Protocol (MCP).

### 🤝 Partner Power: MCP Server Integration (Hackathon Requirement)
To give our Gemini agent its superpowers, DevPulse integrates with participating partners using the **Model Context Protocol (MCP)**:
1. **GitHub (Partner MCP):** The agent fetches real-time repository data, PR reviews, and issue comments to detect invisible work.
2. **MongoDB (Partner MCP / Storage):** Stores historical insights and performance review metrics.
3. **Google Workspace (Calendar MCP):** Our custom MCP Tool allows Gemini to autonomously block off "Deep Work" recovery time on the developer's Google Calendar.

**The Autonomous Flow:**
`GitHub APIs → Agent Loop → Gemini Analysis → MongoDB Storage → MCP Execution (Auto-Calendar Blocking)`

### Tech Stack
- **Frontend:** React, HTML5, CSS3 (Data Analytics Dark Mode - Grafana/Vercel style)
- **Backend:** FastAPI (Python)
- **AI / Machine Learning:** Google Gemini 2.0 Flash AI
- **Database:** MongoDB / In-memory fallback
- **Agent Framework:** Model Context Protocol (MCP) tool integration

---

## 🚀 How to Run Locally

### 1. Backend Setup
```bash
cd C:\Users\kunda\OneDrive\Desktop\DevPulse\backend
..\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd C:\Users\kunda\OneDrive\Desktop\DevPulse\frontend
npm run dev
```
Navigate to `http://localhost:5173` to see the dashboard.

---

## 🎤 Hackathon Demo Flow

1. **The Messy Reality:** Open the Overview Dashboard. Point out the raw commit heatmaps and activity logs. 
2. **The AI Analysis:** Click **"Run Agent"**. Watch the dashboard transform instantly as Gemini detects hours of "Invisible Work" and calculates the Burnout Risk based on late-night commits.
3. **The Autonomous Action:** Show the "Agent Logs" where DevPulse autonomously decides to block off the developer's Google Calendar tomorrow at 10 AM to protect their focus time.
4. **The Mic Drop:** Go to the **Review Generator**. Click "Generate Review" and watch Gemini write a perfect, detailed performance review based on 6 months of historical data in 2 seconds.
