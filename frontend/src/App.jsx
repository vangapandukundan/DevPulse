import { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Brain, Zap, FileText, Bot, Activity
} from 'lucide-react'
import { getDevelopers, removeDeveloper, registerDeveloper } from './api.js'
import AddDeveloperModal from './components/AddDeveloperModal.jsx'
import OverviewPage  from './pages/OverviewPage.jsx'
import InsightsPage  from './pages/InsightsPage.jsx'
import ActionsPage   from './pages/ActionsPage.jsx'
import ReviewPage    from './pages/ReviewPage.jsx'
import AgentPage     from './pages/AgentPage.jsx'

const NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Overview',          desc: 'Dashboard & KPIs' },
  { to: '/insights', icon: Brain,           label: 'Insights',          desc: 'AI analysis' },
  { to: '/actions',  icon: Zap,             label: 'Actions',           desc: 'Agent outputs' },
  { to: '/review',   icon: FileText,        label: 'Review Generator',  desc: 'Perf reviews' },
  { to: '/agent',    icon: Bot,             label: 'Agent Logs',        desc: 'Control center' },
]

function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon-row">
          <div className="logo-icon">
            <Activity size={18} color="white" />
          </div>
          <div className="sidebar-logo-text">DevPulse</div>
        </div>
        <div className="sidebar-logo-sub">Developer Intelligence Agent</div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Menu</div>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon className="nav-icon" size={16} />
            {label}
          </NavLink>
        ))}


      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="agent-status-badge">
          <div className="agent-pulse" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 12 }}>Agent Active</div>
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 1 }}>Auto-runs every 30 min</div>
          </div>
        </div>
        <div className="sidebar-version">DevPulse v1.0.0 · Final Stage</div>
      </div>
    </aside>
  )
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`toast toast-${type}`} onClick={onClose} style={{ cursor: 'pointer' }}>
      <span style={{ fontSize: 16 }}>
        {type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
      </span>
      <span>{message}</span>
    </div>
  )
}

export default function App() {
  const [developers, setDevelopers] = useState([])
  const [sessionDevelopers, setSessionDevelopers] = useState(() => {
    try {
      const stored = localStorage.getItem('devpulse_session_developers')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [selectedDev, setSelectedDev] = useState(() => {
    return localStorage.getItem('devpulse_selected_dev') || 'dev_001'
  })
  const [showAddModal, setShowAddModal] = useState(false)
  const [toasts, setToasts] = useState([])
  const toastId = useRef(0)

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastId.current
    setToasts(p => [...p, { id, message, type }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(p => p.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    localStorage.setItem('devpulse_session_developers', JSON.stringify(sessionDevelopers))
  }, [sessionDevelopers])

  useEffect(() => {
    localStorage.setItem('devpulse_selected_dev', selectedDev)
  }, [selectedDev])

  const loadDevelopers = useCallback(async () => {
    try {
      const devData = await getDevelopers()
      const backendDevs = devData.developers || []
      setDevelopers(backendDevs)

      // Automatically sync any local session developers that are not in the backend list
      for (const sDev of sessionDevelopers) {
        const alreadyRegistered = backendDevs.some(
          d => d.github?.toLowerCase() === sDev.username.toLowerCase()
        )
        if (!alreadyRegistered) {
          try {
            await registerDeveloper({
              name: sDev.displayName || sDev.username,
              github: sDev.username,
              role: 'Contributor',
              team: 'Engineering'
            })
          } catch (e) {
            console.error("Failed to sync session developer to backend:", sDev.username, e)
          }
        }
      }
      
      // If we synced any new developers, re-fetch to get updated database records
      if (sessionDevelopers.length > 0) {
        const updated = await getDevelopers()
        setDevelopers(updated.developers || [])
      }
    } catch (err) {
      console.error("Failed to load developers from API", err)
    }
  }, [sessionDevelopers])

  useEffect(() => {
    loadDevelopers()
  }, [loadDevelopers])

  const allDevelopers = [
    ...developers,
    ...sessionDevelopers
      .filter(sDev => !developers.some(d => d.github?.toLowerCase() === sDev.username.toLowerCase()))
      .map(dev => ({
        id: dev.username,
        name: dev.displayName || dev.username,
        avatar_color: dev.avatarColor,
        github: dev.username,
        is_seed: false,
        is_session: true,
        initials: dev.initials,
        data: dev.data,
        role: 'Contributor'
      }))
  ]

  const handleDevAdded = useCallback(async (newDev) => {
    const totalCount = developers.length + sessionDevelopers.length
    if (totalCount >= 8) {
      addToast("Maximum 8 developers reached", "error")
      return
    }

    const exists = developers.some(d => d.github?.toLowerCase() === newDev.username.toLowerCase()) || 
                  sessionDevelopers.some(d => d.username.toLowerCase() === newDev.username.toLowerCase())
    if (exists) {
      addToast(`Developer ${newDev.username} is already in the list.`, 'error')
      return
    }

    // Register with backend immediately so backend knows about them instantly
    try {
      await registerDeveloper({
        name: newDev.displayName || newDev.username,
        github: newDev.username,
        role: 'Contributor',
        team: 'Engineering'
      })
    } catch (e) {
      console.error("Failed to register new developer on backend:", e)
    }

    setSessionDevelopers(prev => [...prev, newDev])
    setSelectedDev(newDev.username)
    addToast(`${newDev.displayName || newDev.username} added! Real data loaded.`, 'success')
  }, [developers, sessionDevelopers, addToast])

  const handleRemoveDev = useCallback(async (dev) => {
    if (dev.is_seed) {
      addToast('Seed developers cannot be removed.', 'error')
      return
    }

    // 1. Always remove from local session developers state
    setSessionDevelopers(prev => prev.filter(d => 
      d.username.toLowerCase() !== dev.id.toLowerCase() && 
      d.username.toLowerCase() !== dev.github?.toLowerCase()
    ))

    // 2. If it is a backend registered developer, call API to remove
    if (!dev.is_session) {
      try {
        await removeDeveloper(dev.id)
        setDevelopers(prev => prev.filter(d => d.id !== dev.id))
      } catch (err) {
        console.error("Failed to remove developer from backend:", err)
      }
    }

    // 3. Resolve active selection changes
    if (selectedDev === dev.id || selectedDev.toLowerCase() === dev.github?.toLowerCase()) {
      const remainingDevs = allDevelopers.filter(d => 
        d.id !== dev.id && 
        d.github?.toLowerCase() !== dev.github?.toLowerCase()
      )
      if (remainingDevs.length > 0) {
        setSelectedDev(remainingDevs[0].id)
      } else {
        setSelectedDev('dev_001')
      }
    }

    addToast(`${dev.name} removed.`, 'success')
  }, [developers, sessionDevelopers, selectedDev, allDevelopers, addToast])

  const selectorProps = {
    allDevelopers,
    selectedDev,
    setSelectedDev,
    onRemoveDev: handleRemoveDev,
    onAddClick: () => setShowAddModal(true),
    addToast,
    developers,
    sessionDevelopers
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/"         element={<OverviewPage {...selectorProps} />} />
          <Route path="/insights" element={<InsightsPage {...selectorProps} />} />
          <Route path="/actions"  element={<ActionsPage {...selectorProps} />} />
          <Route path="/review"   element={<ReviewPage {...selectorProps} />} />
          <Route path="/agent"    element={<AgentPage {...selectorProps} />} />
        </Routes>
      </main>

      {/* Global Add Developer Modal */}
      {showAddModal && (
        <AddDeveloperModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleDevAdded}
        />
      )}

      {/* Global Toast Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </div>
  )
}
