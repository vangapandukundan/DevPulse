import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Brain, Zap, FileText, Settings,
  Activity, Bot, Calendar
} from 'lucide-react'
import OverviewPage from './pages/OverviewPage.jsx'
import InsightsPage from './pages/InsightsPage.jsx'
import ActionsPage from './pages/ActionsPage.jsx'
import ReviewPage from './pages/ReviewPage.jsx'
import AgentPage from './pages/AgentPage.jsx'

const NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Overview' },
  { to: '/insights', icon: Brain,           label: 'Insights' },
  { to: '/actions',  icon: Zap,             label: 'Actions' },
  { to: '/review',   icon: FileText,        label: 'Review Generator' },
  { to: '/agent',    icon: Bot,             label: 'Agent Logs' },
]

export default function App() {
  const location = useLocation()
  const [agentRunning, setAgentRunning] = useState(false)

  return (
    <div className="app-layout">
      {/* ─── Sidebar ───────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">⚡ DevPulse</div>
          <div className="sidebar-logo-sub">Developer Intelligence</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon className="nav-icon" size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="agent-status-badge">
            <div className="agent-pulse" />
            Agent Active
          </div>
        </div>
      </aside>

      {/* ─── Main Content ───────────────────────────────────────────── */}
      <main className="main-content">
        <Routes>
          <Route path="/"         element={<OverviewPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/actions"  element={<ActionsPage />} />
          <Route path="/review"   element={<ReviewPage />} />
          <Route path="/agent"    element={<AgentPage />} />
        </Routes>
      </main>
    </div>
  )
}
