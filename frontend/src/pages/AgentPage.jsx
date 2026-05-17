import { useState, useEffect, useCallback } from 'react'
import { Bot, Play, RefreshCw, Cpu, Wrench } from 'lucide-react'
import { getAgentRuns, runAllAgents, getMCPTools, getDevelopers } from '../api.js'
import { format } from 'date-fns'

const STEP_COLORS = {
  collect_activity: 'var(--accent-cyan)',
  gemini_analysis:  'var(--accent-violet)',
  action_planning:  'var(--accent-amber)',
  action_execution: 'var(--accent-emerald)',
  persist:          'var(--accent-primary)',
  error:            'var(--accent-rose)',
}

function AgentRunCard({ run }) {
  const [expanded, setExpanded] = useState(false)
  const duration = run.completed_at
    ? ((new Date(run.completed_at) - new Date(run.started_at)) / 1000).toFixed(1)
    : null

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 12,
      marginBottom: 12, overflow: 'hidden',
      background: run.status === 'failed' ? 'rgba(244,63,94,0.03)' : 'var(--bg-card)',
      transition: 'all 0.2s ease'
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', cursor: 'pointer', userSelect: 'none',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: run.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Bot size={16} color={run.status === 'completed' ? 'var(--accent-emerald)' : 'var(--accent-rose)'} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
              Run #{run.run_id} · {run.developer_id}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {run.started_at ? format(new Date(run.started_at), 'MMM d, h:mm:ss a') : ''}
              {duration ? ` · ${duration}s` : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {run.actions_taken} actions · {run.insights_generated} insights
          </span>
          <span className={`status-badge ${run.status === 'completed' ? 'status-executed' : run.status === 'running' ? 'status-planned' : 'status-failed'}`}>
            {run.status}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Steps Log */}
      {expanded && run.steps?.length > 0 && (
        <div className="agent-log" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}>
          {run.steps.map((step, idx) => (
            <div key={idx} className="log-line">
              <span className="log-time">
                {step.timestamp ? format(new Date(step.timestamp), 'HH:mm:ss') : ''}
              </span>
              <span className="log-step" style={{ color: STEP_COLORS[step.step] || 'var(--accent-cyan)', minWidth: 140 }}>
                {step.step}
              </span>
              <span className={step.status === 'completed' ? 'log-status-ok' : step.status === 'failed' ? 'log-status-err' : 'log-data'}>
                [{step.status}]
              </span>
              <span className="log-data">
                {typeof step.data === 'string'
                  ? step.data
                  : JSON.stringify(step.data, null, 0).slice(0, 120)
                }
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AgentPage() {
  const [runs, setRuns] = useState([])
  const [tools, setTools] = useState([])
  const [developers, setDevelopers] = useState([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [filterDev, setFilterDev] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [runData, toolData, devData] = await Promise.all([
        getAgentRuns(filterDev),
        getMCPTools(),
        getDevelopers(),
      ])
      setRuns(runData.runs || [])
      setTools(toolData.tools || [])
      setDevelopers(devData.developers || [])
    } catch {}
    setLoading(false)
  }, [filterDev])

  useEffect(() => { load() }, [load])

  const handleRunAll = async () => {
    setTriggering(true)
    try {
      await runAllAgents()
      setTimeout(load, 1000)
    } catch {}
    setTriggering(false)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Agent Control Center</h1>
          <p className="page-subtitle">Autonomous agent run logs, MCP tools, and decision transparency</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            id="run-all-agents-btn"
            className="btn btn-primary"
            onClick={handleRunAll}
            disabled={triggering}
          >
            {triggering
              ? <><div className="loading-spinner" style={{ width: 15, height: 15 }} />Running…</>
              : <><Play size={14} />Run All Agents</>
            }
          </button>
          <button className="btn btn-outline" onClick={load}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* MCP Tools */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-title">
            <Wrench size={16} color="var(--accent-cyan)" />
            MCP Tool Registry
          </div>
          {tools.length === 0 ? (
            <div className="empty-state">No tools registered yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tools.map((tool, idx) => (
                <div key={idx} style={{
                  padding: '14px 18px',
                  background: 'rgba(34,211,238,0.05)',
                  border: '1px solid rgba(34,211,238,0.15)',
                  borderRadius: 10
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                      {tool.name}()
                    </div>
                    <span className="status-badge status-executed">Registered</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{tool.description}</div>
                  {tool.parameters?.properties && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {Object.keys(tool.parameters.properties).map(param => (
                        <span key={param} style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 4,
                          background: 'rgba(34,211,238,0.1)', color: 'var(--accent-cyan)',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {param}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter by developer */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Filter:</span>
          <button
            className={`dev-chip${filterDev === null ? ' active' : ''}`}
            onClick={() => setFilterDev(null)}
          >All</button>
          {developers.map(dev => (
            <button
              key={dev.id}
              id={`agent-filter-${dev.id}`}
              className={`dev-chip${filterDev === dev.id ? ' active' : ''}`}
              onClick={() => setFilterDev(dev.id)}
            >
              {dev.name}
            </button>
          ))}
        </div>

        {/* Agent Run Logs */}
        <div>
          <div className="section-title">
            <Cpu size={16} color="var(--accent-primary)" />
            Agent Run History ({runs.length})
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[0,1,2].map(i => (
                <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }} />
              ))}
            </div>
          ) : runs.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">🤖</div>
                <div>No agent runs yet. Click "Run All Agents" to start!</div>
              </div>
            </div>
          ) : (
            runs.map((run, idx) => <AgentRunCard key={idx} run={run} />)
          )}
        </div>
      </div>
    </>
  )
}
