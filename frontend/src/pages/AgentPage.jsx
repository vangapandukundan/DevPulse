import { useState, useEffect, useCallback } from 'react'
import {
  Bot, Play, RefreshCw, Cpu, Wrench, Terminal,
  ChevronDown, ChevronUp, Activity, Clock, CheckCircle
} from 'lucide-react'
import { getAgentRuns, runAllAgents, getMCPTools } from '../api.js'
import DeveloperSelector from '../components/DeveloperSelector.jsx'
import { format } from 'date-fns'

// ─── Step colors ─────────────────────────────────────────────────────────
const STEP_COLORS = {
  collect_activity: 'var(--accent-cyan)',
  gemini_analysis:  'var(--accent-violet)',
  action_planning:  'var(--accent-amber)',
  action_execution: 'var(--accent-emerald)',
  persist:          'var(--accent-primary)',
  error:            'var(--accent-rose)',
}

// ─── Agent Run Card ──────────────────────────────────────────────────────
function AgentRunCard({ run, allDevelopers }) {
  const [expanded, setExpanded] = useState(false)

  const duration = run.completed_at
    ? ((new Date(run.completed_at) - new Date(run.started_at)) / 1000).toFixed(1)
    : null

  const isCompleted = run.status === 'completed'
  const isFailed    = run.status === 'failed'
  const isRunning   = run.status === 'running'

  const statusClass = isCompleted ? 'status-executed' : isFailed ? 'status-failed' : 'status-planned'
  
  const devInfo = allDevelopers.find(d => d.id === run.developer_id)
  const devColor = devInfo?.avatar_color || 'var(--accent-primary)'
  const devInitials = devInfo?.initials || devInfo?.name?.split(' ').map(n => n[0]).join('') || run.developer_id?.slice(0, 2).toUpperCase()

  return (
    <div className={`agent-run-card ${isFailed ? 'status-failed' : ''}`} style={{ marginBottom: 10 }}>
      {/* Header */}
      <div
        className="agent-run-header"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: isCompleted ? 'var(--accent-emerald-dim)' : isFailed ? 'var(--accent-rose-dim)' : 'var(--accent-primary-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Bot size={16} color={isCompleted ? 'var(--accent-emerald)' : isFailed ? 'var(--accent-rose)' : 'var(--accent-primary)'} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>
                Run #{run.run_id}
              </div>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: devColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, color: 'white',
                flexShrink: 0,
              }}>
                {devInitials}
              </div>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{devInfo?.name || run.developer_id}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {run.started_at ? format(new Date(run.started_at), 'MMM d, yyyy · h:mm:ss a') : ''}
              {duration ? ` · ${duration}s` : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
            <div>{run.actions_taken} actions</div>
            <div>{run.insights_generated} insights</div>
          </div>
          <span className={`status-badge ${statusClass}`}>
            {run.status}
          </span>
          {expanded
            ? <ChevronUp size={15} color="var(--text-muted)" />
            : <ChevronDown size={15} color="var(--text-muted)" />
          }
        </div>
      </div>

      {/* Steps Log */}
      {expanded && run.steps?.length > 0 && (
        <div className="agent-log" style={{
          margin: '0 16px 16px',
          borderRadius: 8,
          border: '1px solid rgba(6,182,212,0.1)',
        }}>
          {run.steps.map((step, idx) => (
            <div key={idx} className="log-line">
              <span className="log-time">
                {step.timestamp ? format(new Date(step.timestamp), 'HH:mm:ss') : ''}
              </span>
              <span className="log-step" style={{
                color: STEP_COLORS[step.step] || 'var(--accent-cyan)',
                minWidth: 150,
              }}>
                {step.step}
              </span>
              <span className={step.status === 'completed' ? 'log-status-ok' : step.status === 'failed' ? 'log-status-err' : 'log-data'}>
                [{step.status}]
              </span>
              <span className="log-data">
                {typeof step.data === 'string'
                  ? step.data
                  : JSON.stringify(step.data, null, 0).slice(0, 140)}
              </span>
            </div>
          ))}
        </div>
      )}

      {expanded && (!run.steps || run.steps.length === 0) && (
        <div style={{ padding: '12px 16px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
          No step details available
        </div>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────
export default function AgentPage({
  allDevelopers,
  selectedDev,
  setSelectedDev,
  onRemoveDev,
  onAddClick,
}) {
  const [runs, setRuns]           = useState([])
  const [tools, setTools]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [runStatus, setRunStatus] = useState('')

  const load = useCallback(async () => {
    setRuns([])
    setLoading(true)
    try {
      const [runData, toolData] = await Promise.all([
        getAgentRuns(selectedDev),
        getMCPTools(),
      ])
      setRuns(runData.runs || [])
      setTools(toolData.tools || [])
    } catch {}
    setLoading(false)
  }, [selectedDev])

  useEffect(() => { load() }, [load])

  const handleRunAll = async () => {
    setTriggering(true)
    setRunStatus('🤖 Running agent loop for all developers…')
    try {
      await runAllAgents()
      setTimeout(() => {
        load()
        setRunStatus('✅ All agents completed!')
        setTimeout(() => setRunStatus(''), 5000)
      }, 1500)
    } catch (e) {
      setRunStatus(`❌ Error: ${e.message}`)
    }
    setTriggering(false)
  }

  const completedRuns = runs.filter(r => r.status === 'completed').length
  const failedRuns    = runs.filter(r => r.status === 'failed').length
  const totalActions  = runs.reduce((s, r) => s + (r.actions_taken || 0), 0)

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">DevPulse</div>
          <h1 className="page-title">Agent Control Center</h1>
          <p className="page-subtitle">
            Autonomous agent run logs, MCP tool registry & decision transparency
          </p>
        </div>
        <div className="page-header-actions">
          <button
            id="run-all-agents-btn"
            className="btn btn-primary"
            onClick={handleRunAll}
            disabled={triggering}
          >
            {triggering
              ? <><div className="loading-spinner" />Running…</>
              : <><Play size={14} />Run All Agents</>
            }
          </button>
          <button className="btn btn-outline" onClick={load}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div className="page-content animate-in">
        {runStatus && (
          <div className={`status-alert ${runStatus.startsWith('✅') ? 'status-alert-success' : runStatus.startsWith('❌') ? 'status-alert-error' : 'status-alert-info'}`} style={{ marginBottom: 16 }}>
            {runStatus}
          </div>
        )}

        {/* Unified Developer Selector */}
        <DeveloperSelector
          allDevelopers={allDevelopers}
          selectedDev={selectedDev}
          setSelectedDev={setSelectedDev}
          onRemoveDev={onRemoveDev}
          onAddClick={onAddClick}
        />

        {/* Stats */}
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
          <div className="metric-card">
            <div className="metric-icon-wrap" style={{ background: 'rgba(59,130,246,0.12)' }}>
              <Activity size={18} color="var(--accent-primary)" />
            </div>
            <div className="metric-value" style={{ color: 'var(--accent-primary)' }}>{runs.length}</div>
            <div className="metric-label">Total Runs</div>
          </div>
          <div className="metric-card">
            <div className="metric-icon-wrap" style={{ background: 'rgba(16,185,129,0.12)' }}>
              <CheckCircle size={18} color="var(--accent-emerald)" />
            </div>
            <div className="metric-value" style={{ color: 'var(--accent-emerald)' }}>{completedRuns}</div>
            <div className="metric-label">Completed</div>
          </div>
          <div className="metric-card">
            <div className="metric-icon-wrap" style={{ background: 'rgba(59,130,246,0.12)' }}>
              <Cpu size={18} color="var(--accent-primary)" />
            </div>
            <div className="metric-value" style={{ color: 'var(--accent-primary)' }}>{totalActions}</div>
            <div className="metric-label">Actions Taken</div>
          </div>
          <div className="metric-card">
            <div className="metric-icon-wrap" style={{ background: 'rgba(244,63,94,0.12)' }}>
              <Bot size={18} color="var(--accent-rose)" />
            </div>
            <div className="metric-value" style={{ color: 'var(--accent-rose)' }}>{failedRuns}</div>
            <div className="metric-label">Failed Runs</div>
          </div>
        </div>

        {/* MCP Tool Registry */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-title">
            <Wrench size={15} color="var(--accent-cyan)" />
            MCP Tool Registry
            <span className="status-badge status-executed" style={{ marginLeft: 'auto' }}>
              {tools.length} Registered
            </span>
          </div>

          {tools.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>No tools registered</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tools.map((tool, idx) => (
                <div key={idx} className="mcp-tool-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'flex-start' }}>
                    <div>
                      <span className="mcp-tool-name">{tool.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 13 }}>() </span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', fontSize: 13 }}>→ dict</span>
                    </div>
                    <span className="status-badge status-executed">Registered</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>
                    {tool.description}
                  </div>
                  {tool.parameters?.properties && (
                    <div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Parameters:
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {Object.entries(tool.parameters.properties).map(([param, schema]) => (
                          <span key={param} className="mcp-param-tag">
                            {param}: {schema.type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Run History */}
        <div>
          <div className="section-title" style={{ marginBottom: 12 }}>
            <Terminal size={15} color="var(--accent-primary)" />
            Agent Run History
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              {runs.length} total runs
            </span>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0,1,2].map(i => (
                <div key={i} className="skeleton" style={{ height: 68, borderRadius: 12 }} />
              ))}
            </div>
          ) : runs.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="empty-state-icon">🤖</span>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No agent runs yet</div>
                <div>Click "Run All Agents" to trigger the autonomous agent loop for all developers.</div>
              </div>
            </div>
          ) : (
            runs.map((run, idx) => <AgentRunCard key={`${run.run_id}-${idx}`} run={run} allDevelopers={allDevelopers} />)
          )}
        </div>
      </div>
    </>
  )
}
