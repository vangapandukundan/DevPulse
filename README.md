# ⚡ DevPulse — Developer Intelligence Agent

*Your personal AI that tracks your code, detects burnout, finds your invisible work, and writes your performance review.*

---

## 🛑 The Problem: Invisible Work & Burnout

You spend 3 hours today fixing a critical bug that your junior teammate caused. Then you spend 2 hours carefully reviewing code for another team. Then you attend 3 hours of meetings. At the end of the day, you have written **zero new lines of code** yourself. 

When Performance Review time comes, your manager looks at your GitHub and says: *"You didn't write any code this month. You are underperforming."* 

This is called **"Invisible Work,"** and it causes developers to get angry, underpaid, and burned out. Furthermore, when developers are pushed too hard, they code late at night—a direct precursor to burnout that goes completely unnoticed by standard metrics.

## 🌟 The Solution: An Autonomous Agent

**DevPulse** is a personal AI agent that sits in the background and watches everything you do. It connects your raw developer activity to the **Google Gemini AI** and **MCP (Model Context Protocol)** to provide real, actionable interventions.

### Key Features
- 👁️ **Invisible Work Detector:** DevPulse detects unrecorded effort (like mentoring, heavy PR reviews, and architectural planning) and logs it so you get credit.
- 📈 **Skill Velocity Tracker:** Analyzes your commits over time to generate a personal growth score based on new languages and patterns you touch.
- 📝 **Auto Performance Review Writer:** DevPulse pulls months of MongoDB data and writes your entire self-review with specific examples, metrics, and impact statements. Goes from 4 hours of work to 30 seconds.
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
- **AI / Machine Learning:** Google Vertex AI (Gemini 1.5)
- **Database:** MongoDB
- **Agent Framework:** Model Context Protocol (MCP) tool integration

---

## 🚀 How to Run Locally

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```
Make sure your `.env` file is configured with your `GEMINI_API_KEY`, `MONGODB_URL`, and `DEMO_MODE=true`. Then start the server:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173` to see the dashboard.

---

## 🎤  Demo Flow

DevPulse — Developer Intelligence Agent Your personal AI that tracks your code, detects burnout, finds your invisible work, and writes your performance review.

The Problem: You spend 3 hours today fixing a critical bug that your junior teammate caused. Then you spend 2 hours carefully reviewing code for another team. Then you attend 3 hours of meetings. At the end of the day, you have written zero new lines of code yourself.

When Performance Review time comes, your manager looks at your GitHub and says: "You didn't write any code this month. You are underperforming."

This is called "Invisible Work," and it causes developers to get angry, underpaid, and burned out. Furthermore, when developers are pushed too hard, they code late at night—a direct precursor to burnout that goes completely unnoticed by standard metrics.

The Solution:

An Autonomous Agent DevPulse is a personal AI agent that sits in the background and watches everything you do. It connects your raw developer activity to the Google Gemini AI and MCP (Model Context Protocol) to provide real, actionable interventions. DevPulse detects unrecorded effort and logs it so you get credit. Analyzes your commits over time to generate a personal growth score based on new languages and patterns you touch. DevPulse pulls months of MongoDB data and writes your entire self-review with specific examples, metrics, and impact statements. Goes from 4 hours of work to 30 seconds. By analyzing 30 days of commit timestamps, DevPulse learns your personal peak productivity windows. It then acts autonomously, connecting to the Google Calendar API via MCP to automatically block your calendar for "Deep Work" to protect your time and mental health.

Technologies Used: DevPulse goes beyond a standard dashboard by implementing a true Agent Loop powered by Google Cloud.

Frontend: React, HTML5, CSS3 (Google Material Design UI) Backend: FastAPI (Python) AI / Machine Learning: Google Vertex AI (Gemini 1.5) Database: MongoDB Agent Framework: MCP (Model Context Protocol) for Calendar Tool integration
