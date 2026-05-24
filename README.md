




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

Frontend: React, HTML5, CSS3 (Google Material Design UI) Backend: FastAPI (Python) AI / Machine Learning: Google Vertex AI (Gemini 1.5) Database: MongoDB Agent Framework: MCP (Model Context Protocol) for Calendar Tool integration
