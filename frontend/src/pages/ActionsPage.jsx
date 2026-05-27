import { useState, useEffect, useCallback } from 'react'
import {
  Calendar, CheckCircle, XCircle, Clock, Zap, RefreshCw,
  ListChecks, Play, ExternalLink
} from 'lucide-react'
import { getActions, getCalendarEvents } from '../api.js'
import DeveloperSelector from '../components/DeveloperSelector.jsx'
import { format } from 'date-fns'

// ─── Config ───────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  executed: {
    icon: <CheckCircle size={12} />,
    className: 'status-executed',
    dot: 'var(--accent-emerald)',
    label: 'EXECUTED',
  },
  planned: {
    icon: <Clock size={12} />,
    className: 'status-planned',
    dot: 'var(--accent-primary)',
    label: 'PLANNED',
  },
  failed: {
    icon: <XCircle size={12} />,
    className: 'status-failed',
    dot: 'var(--accent-rose)',
    label: 'FAILED',
  },
  skipped: {
    icon: <Clock size={12} />,
    className: 'status-planned',
    dot: 'var(--text-muted)',
    label: 'SKIPPED',
  },
}

// ─── Calendar Event Card ──────────────────────────────────────────────────
function CalendarEventCard({ event }) {
  const start = event.start ? new Date(event.start) : null
  const isSimulated = event.mode === 'simulated'
  const isRecurring = event.is_recurring
  const autoDecline = event.auto_decline

  return (
    <div className="calendar-event-card">
      <div className="calendar-event-icon">
        <Calendar size={18} color="var(--accent-primary)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5, gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
            {event.title}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {isRecurring && (
              <span className="status-badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                ⚡ RECURRING
              </span>
            )}
            {autoDecline && (
              <span className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                🛡️ AUTO-DECLINE
              </span>
            )}
            <span className={`status-badge ${isSimulated ? 'status-simulated' : 'status-executed'}`} style={{ flexShrink: 0 }}>
              {isSimulated ? '🎭 SIMULATED' : '✅ LIVE'}
            </span>
          </div>
        </div>
        {start && (
          <div style={{ fontSize: 12, color: 'var(--accent-primary)', marginBottom: 5, fontWeight: 600 }}>
            📅 {format(start, 'EEEE, MMM d · h:mm a')}
          </div>
        )}
        {event.description && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {event.description.split('\n')[0]}
          </div>
        )}
        {event.event_id && (
          <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-muted)' }}>
            Event ID: {event.event_id}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Stat Card ──────────────────────────────────────────────────────────
function StatCard({ label, value, color, filter, activeFilter, onClick }) {
  const isActive = activeFilter === filter
  return (
    <div
      id={`action-stat-${filter}`}
      className="metric-card"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        borderColor: isActive ? color : 'var(--border)',
        background: isActive ? `${color}0d` : 'var(--bg-card)',
        transition: 'var(--transition)',
      }}
    >
      <div className="metric-value" style={{ color, fontSize: 32 }}>{value}</div>
      <div className="metric-label">{label}</div>
      {isActive && (
        <div style={{ fontSize: 11, color, marginTop: 4, fontWeight: 600 }}>● Filtered</div>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────
export default function ActionsPage({
  allDevelopers,
  selectedDev,
  setSelectedDev,
  onRemoveDev,
  onAddClick,
}) {
  const [actions, setActions]     = useState([])
  const [calEvents, setCalEvents] = useState([])
  const [loading, setLoading]     = useState(true)
  const [statsFilter, setStatsFilter] = useState('all')

  const load = useCallback(async () => {
    setActions([])
    setLoading(true)
    try {
      const [actData, calData] = await Promise.all([
        getActions(selectedDev),
        getCalendarEvents(),
      ])
      setActions(actData.actions || [])
      setCalEvents(calData.events || [])
    } catch {}
    setLoading(false)
  }, [selectedDev])

  useEffect(() => { load() }, [load])

  const currentDev = allDevelopers.find(d => d.id === selectedDev)
  const devEmail = currentDev?.email || (currentDev?.github ? `${currentDev.github}@devpulse.ai` : '')

  const filteredEvents = calEvents.filter(e => {
    if (!e.developer_email) return true // Keep legacy / general events
    return e.developer_email.toLowerCase() === devEmail.toLowerCase()
  })

  const filtered = statsFilter === 'all'
    ? actions
    : actions.filter(a => a.status === statsFilter)

  const stats = {
    total:    actions.length,
    executed: actions.filter(a => a.status === 'executed').length,
    planned:  actions.filter(a => a.status === 'planned').length,
    failed:   actions.filter(a => a.status === 'failed').length,
  }

  const toggleFilter = (f) => setStatsFilter(prev => prev === f ? 'all' : f)

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">DevPulse</div>
          <h1 className="page-title">Agent Actions</h1>
          <p className="page-subtitle">
            Autonomous schedule adjustments and calendar optimizations by your AI agent.
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={load}>
            <RefreshCw size={13} />Refresh
          </button>
        </div>
      </div>

      <div className="page-content animate-in">
        {/* Unified Developer Selector */}
        <DeveloperSelector
          allDevelopers={allDevelopers}
          selectedDev={selectedDev}
          setSelectedDev={setSelectedDev}
          onRemoveDev={onRemoveDev}
          onAddClick={onAddClick}
        />

        {/* Stat Cards */}
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
          <StatCard
            label="Total Actions"
            value={stats.total}
            color="var(--accent-primary)"
            filter="all"
            activeFilter={statsFilter}
            onClick={() => setStatsFilter('all')}
          />
          <StatCard
            label="Executed"
            value={stats.executed}
            color="var(--accent-emerald)"
            filter="executed"
            activeFilter={statsFilter}
            onClick={() => toggleFilter('executed')}
          />
          <StatCard
            label="Planned Breaks & Focus"
            value={stats.planned}
            color="var(--accent-amber)"
            filter="planned"
            activeFilter={statsFilter}
            onClick={() => toggleFilter('planned')}
          />
          <StatCard
            label="Skipped / Conflicts"
            value={stats.failed}
            color="var(--accent-rose)"
            filter="failed"
            activeFilter={statsFilter}
            onClick={() => toggleFilter('failed')}
          />
        </div>

        {/* Calendar Events Section */}
        {filteredEvents.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="section-title">
              <Calendar size={15} color="var(--accent-primary)" />
              Smart Calendar Events Added
              <span className="status-badge status-simulated" style={{ marginLeft: 'auto' }}>
                🎭 DEMO SIMULATION
              </span>
            </div>
            <div style={{
              fontSize: 12, color: 'var(--text-muted)', marginBottom: 14,
              padding: '8px 12px',
              background: 'rgba(245,158,11,0.05)',
              border: '1px solid rgba(245,158,11,0.1)',
              borderRadius: 8,
            }}>
              ℹ️ Calendar updates are simulated in demo mode to protect your privacy. Configure Google calendar connections to enable live synchronization.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredEvents.map((event, idx) => (
                <CalendarEventCard key={idx} event={event} />
              ))}
            </div>
          </div>
        )}

        {/* Action Timeline */}
        <div className="card">
          <div className="section-title">
            <Zap size={15} color="var(--accent-amber)" />
            Schedule Adjustment Timeline
            {statsFilter !== 'all' && (
              <span className="status-badge status-planned" style={{ marginLeft: 8 }}>
                Showing: {statsFilter}
              </span>
            )}
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => setStatsFilter('all')}
            >
              Clear filter
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[0,1,2].map(i => (
                <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">⚡</span>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No adjustments yet</div>
              <div>Run the agent from the Overview page to generate autonomous schedule improvements.</div>
            </div>
          ) : (
            <div className="timeline">
              {filtered.map((action, idx) => {
                const cfg  = STATUS_CONFIG[action.status] || STATUS_CONFIG.planned
                const time = action.planned_at ? new Date(action.planned_at) : null
                const isLast = idx === filtered.length - 1

                let cleanActionType = action.action_type?.replace(/_/g, ' ') || ''
                if (cleanActionType.toUpperCase().includes('FOCUS')) {
                  cleanActionType = '🔒 Focus Block / Calendar Shield'
                } else if (cleanActionType.toUpperCase().includes('BREAK') || cleanActionType.toUpperCase().includes('RECOVERY')) {
                  cleanActionType = '☕ Recharge Recovery Break'
                }

                return (
                  <div key={idx} className="timeline-item">
                    <div className="timeline-line">
                      <div
                        className="timeline-dot"
                        style={{
                          borderColor: cfg.dot,
                          background: `${cfg.dot}20`,
                          boxShadow: action.status === 'executed' ? `0 0 8px ${cfg.dot}50` : 'none',
                        }}
                      />
                      {!isLast && <div className="timeline-connector" />}
                    </div>

                    <div className="timeline-content">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8, flexWrap: 'wrap' }}>
                        <div className="timeline-action-type" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {cleanActionType}
                          {action.result?.is_recurring && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                              background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)',
                              border: '1px solid rgba(99, 102, 241, 0.3)'
                            }}>
                              RECURRING
                            </span>
                          )}
                          {action.result?.auto_decline && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                              background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)',
                              border: '1px solid rgba(16, 185, 129, 0.3)'
                            }}>
                              AUTO-DECLINE ACTIVE
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {time && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {format(time, 'MMM d, h:mm a')}
                            </span>
                          )}
                          <span className={`status-badge ${cfg.className}`}>
                            {cfg.icon}{cfg.label === 'EXECUTED' ? 'SCHEDULED' : cfg.label === 'FAILED' ? 'SKIPPED' : cfg.label}
                          </span>
                        </div>
                      </div>

                      <div className="timeline-title">
                        {action.result?.title || action.action_type?.replace(/_/g, ' ')}
                      </div>

                      <div className="timeline-reason">{action.reason}</div>

                      {action.explainability && (
                        <div className="timeline-explainer">
                          🤖 <strong>Why the AI made this change:</strong> {action.explainability}
                        </div>
                      )}

                      {(action.result?.mode === 'simulated' || action.result?.event_id) && (
                        <div style={{
                          marginTop: 8, fontSize: 11, color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                          background: 'rgba(0,0,0,0.3)',
                          padding: '5px 10px', borderRadius: 6,
                          display: 'flex', gap: 12,
                        }}>
                          {action.result?.event_id && (
                            <span>Event ID: <span style={{ color: 'var(--accent-cyan)' }}>{action.result.event_id}</span></span>
                          )}
                          {action.result?.mode && (
                            <span>Mode: <span style={{ color: 'var(--accent-amber)' }}>{action.result.mode}</span></span>
                          )}
                          {action.developer_id && (
                            <span>Developer: <span style={{ color: 'var(--text-secondary)' }}>{action.developer_id}</span></span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
