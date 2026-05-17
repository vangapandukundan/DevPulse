import { useState, useEffect, useCallback } from 'react'
import { Calendar, CheckCircle, XCircle, Clock, Zap, RefreshCw } from 'lucide-react'
import { getActions, getCalendarEvents } from '../api.js'
import { format, parseISO } from 'date-fns'

const STATUS_CONFIG = {
  executed: { icon: <CheckCircle size={14} />, className: 'status-executed', dot: 'var(--accent-emerald)' },
  planned:  { icon: <Clock size={14} />,        className: 'status-planned',  dot: 'var(--accent-primary)' },
  failed:   { icon: <XCircle size={14} />,      className: 'status-failed',   dot: 'var(--accent-rose)' },
  skipped:  { icon: <Clock size={14} />,        className: 'status-planned',  dot: 'var(--text-muted)' },
}

function CalendarEventCard({ event }) {
  const start = event.start ? new Date(event.start) : null
  const isSimulated = event.mode === 'simulated'

  return (
    <div style={{
      padding: '16px 20px',
      background: 'rgba(99,102,241,0.07)',
      border: '1px solid rgba(99,102,241,0.2)',
      borderRadius: 12,
      display: 'flex',
      gap: 16,
      alignItems: 'flex-start',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: 'rgba(99,102,241,0.2)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <Calendar size={20} color="var(--accent-primary)" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>
          {event.title}
        </div>
        {start && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
            📅 {format(start, 'EEE, MMM d · h:mm a')}
          </div>
        )}
        {event.description && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {event.description.split('\n')[0]}
          </div>
        )}
      </div>
      <div>
        <span className={`status-badge ${isSimulated ? 'status-planned' : 'status-executed'}`}>
          {isSimulated ? '🎭 Simulated' : '✅ Live'}
        </span>
      </div>
    </div>
  )
}

export default function ActionsPage() {
  const [actions, setActions] = useState([])
  const [calEvents, setCalEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [statsFilter, setStatsFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [actData, calData] = await Promise.all([
        getActions(),
        getCalendarEvents(),
      ])
      setActions(actData.actions || [])
      setCalEvents(calData.events || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = statsFilter === 'all'
    ? actions
    : actions.filter(a => a.status === statsFilter)

  const stats = {
    total: actions.length,
    executed: actions.filter(a => a.status === 'executed').length,
    planned: actions.filter(a => a.status === 'planned').length,
    failed: actions.filter(a => a.status === 'failed').length,
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Agent Actions</h1>
          <p className="page-subtitle">Autonomous actions taken by the DevPulse agent via MCP tools</p>
        </div>
        <button className="btn btn-outline" onClick={load}>
          <RefreshCw size={14} />Refresh
        </button>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { label: 'Total Actions', value: stats.total, color: 'var(--accent-primary)', filter: 'all' },
            { label: 'Executed', value: stats.executed, color: 'var(--accent-emerald)', filter: 'executed' },
            { label: 'Planned', value: stats.planned, color: 'var(--accent-amber)', filter: 'planned' },
            { label: 'Failed', value: stats.failed, color: 'var(--accent-rose)', filter: 'failed' },
          ].map(({ label, value, color, filter }) => (
            <div
              key={filter}
              id={`action-stat-${filter}`}
              className="metric-card"
              onClick={() => setStatsFilter(filter)}
              style={{
                cursor: 'pointer',
                borderColor: statsFilter === filter ? color : 'var(--border)',
                background: statsFilter === filter ? `${color}10` : 'var(--bg-card)',
              }}
            >
              <div className="metric-value" style={{ color, fontSize: 32 }}>{value}</div>
              <div className="metric-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Calendar Events */}
        {calEvents.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="section-title">
              <Calendar size={16} color="var(--accent-primary)" />
              Calendar Events Created by Agent
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {calEvents.map((event, idx) => (
                <CalendarEventCard key={idx} event={event} />
              ))}
            </div>
          </div>
        )}

        {/* Action Timeline */}
        <div className="card">
          <div className="section-title">
            <Zap size={16} color="var(--accent-amber)" />
            Action Timeline
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[0,1,2].map(i => (
                <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">⚡</div>
              <div>No actions yet. Run the agent to generate actions.</div>
            </div>
          ) : (
            <div className="timeline">
              {filtered.map((action, idx) => {
                const cfg = STATUS_CONFIG[action.status] || STATUS_CONFIG.planned
                const time = action.planned_at ? new Date(action.planned_at) : null

                return (
                  <div key={idx} className="timeline-item">
                    <div className="timeline-line">
                      <div
                        className="timeline-dot"
                        style={{ borderColor: cfg.dot, background: `${cfg.dot}30` }}
                      />
                      {idx < filtered.length - 1 && <div className="timeline-connector" />}
                    </div>

                    <div className="timeline-content">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div className="timeline-action-type">
                          {action.action_type?.replace(/_/g, ' ')}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {time && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {format(time, 'MMM d, h:mm a')}
                            </span>
                          )}
                          <span className={`status-badge ${cfg.className}`}>
                            {cfg.icon}{action.status}
                          </span>
                        </div>
                      </div>

                      <div className="timeline-title">
                        {action.result?.title || action.action_type?.replace(/_/g, ' ')}
                      </div>

                      <div className="timeline-reason">{action.reason}</div>

                      {action.explainability && (
                        <div className="timeline-explainer">
                          🤖 {action.explainability}
                        </div>
                      )}

                      {action.result?.mode === 'simulated' && (
                        <div style={{
                          marginTop: 8, fontSize: 11, color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                          background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: 6
                        }}>
                          Event ID: {action.result?.event_id} · Mode: {action.result?.mode}
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
