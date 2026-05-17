import { useState, useEffect, useCallback } from 'react'
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar
} from 'recharts'
import { Flame, TrendingUp, Eye, Clock, RefreshCw, Play, Activity } from 'lucide-react'
import {
  getDevelopers, getLatestInsight, getInsightsSummary,
  getActivity, runAgent
} from '../api.js'
import { format, subDays } from 'date-fns'

// ─── Developer color map ─────────────────────────────────────────────────
const DEV_COLORS = {
  dev_001: '#6366f1',
  dev_002: '#22d3ee',
  dev_003: '#10b981',
  dev_004: '#f59e0b',
}

const BURNOUT_COLORS = { low: '#10b981', medium: '#f59e0b', high: '#f97316', critical: '#f43f5e' }

function ScoreGauge({ value, color, label }) {
  const data = [{ value, fill: color }]
  return (
    <div style={{ textAlign: 'center', width: 120 }}>
      <ResponsiveContainer width={120} height={120}>
        <RadialBarChart
          cx="50%" cy="50%"
          innerRadius={40} outerRadius={55}
          startAngle={180} endAngle={0}
          data={[{ value: 100, fill: 'rgba(255,255,255,0.1)' }, { value, fill: color }]}
        >
          <RadialBar dataKey="value" />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{ marginTop: -16, fontWeight: 800, fontSize: 26, color }}>{Math.round(value)}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function CommitHeatmap({ commits }) {
  // Build last-30-days heatmap
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i)
    const key = format(date, 'yyyy-MM-dd')
    const count = commits.filter(c => c.timestamp?.startsWith(key)).length
    return { date: format(date, 'MMM d'), count }
  })

  return (
    <ResponsiveContainer width="100%" height={80}>
      <BarChart data={days} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <Bar dataKey="count" fill="#6366f1" radius={[3,3,0,0]} opacity={0.85} />
        <XAxis dataKey="date" hide />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          itemStyle={{ color: 'var(--text-primary)' }}
          labelStyle={{ color: 'var(--text-muted)' }}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function OverviewPage() {
  const [developers, setDevelopers] = useState([])
  const [selectedDev, setSelectedDev] = useState('dev_001')
  const [insight, setInsight] = useState(null)
  const [activity, setActivity] = useState(null)
  const [summary, setSummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runStatus, setRunStatus] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [devData, summaryData] = await Promise.all([
        getDevelopers(),
        getInsightsSummary(),
      ])
      setDevelopers(devData.developers || [])
      setSummary(summaryData.summary || [])
    } catch {}
    setLoading(false)
  }, [])

  const loadDev = useCallback(async () => {
    try {
      const [ins, act] = await Promise.all([
        getLatestInsight(selectedDev),
        getActivity(selectedDev, 30),
      ])
      console.log("Loaded insight:", ins)
      console.log("Loaded activity:", act)
      setInsight(ins?.insight || null)
      setActivity(act || null)
    } catch (err) {
      console.error("loadDev error:", err)
      setRunStatus(`❌ Error loading data: ${err.message}`)
    }
  }, [selectedDev])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadDev() }, [loadDev])

  const handleRunAgent = async () => {
    setRunning(true)
    setRunStatus('Running agent loop…')
    try {
      const result = await runAgent(selectedDev)
      setRunStatus('Loading new insights...')
      await loadDev()
      await load()
      setRunStatus(`✅ Done — ${result.status} (run ${result.run_id})`)
      setTimeout(() => setRunStatus(''), 4000) // Clear status after 4s
    } catch (e) {
      setRunStatus(`❌ Error: ${e.message}`)
    }
    setRunning(false)
  }

  const devName = developers.find(d => d.id === selectedDev)?.name || selectedDev
  const burnoutLevel = insight?.burnout_level || 'low'
  const burnoutColor = BURNOUT_COLORS[burnoutLevel]

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview Dashboard</h1>
          <p className="page-subtitle">Real-time developer intelligence · Agent-powered analytics</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            id="run-agent-btn"
            className={`btn btn-primary`}
            onClick={handleRunAgent}
            disabled={running}
          >
            {running
              ? <><div className="loading-spinner" style={{ width: 16, height: 16 }} />Running…</>
              : <><Play size={15} />Run Agent</>
            }
          </button>
          <button className="btn btn-outline" onClick={() => { load(); loadDev() }}>
            <RefreshCw size={14} />Refresh
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Status Message */}
        {runStatus && (
          <div style={{
            padding: '10px 16px', marginBottom: 16,
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 10, fontSize: 13, color: 'var(--text-secondary)'
          }}>
            {runStatus}
          </div>
        )}

        {/* Developer Selector */}
        <div className="dev-selector">
          {developers.map(dev => (
            <button
              key={dev.id}
              id={`dev-chip-${dev.id}`}
              className={`dev-chip${selectedDev === dev.id ? ' active' : ''}`}
              onClick={() => setSelectedDev(dev.id)}
            >
              {dev.name}
            </button>
          ))}
        </div>

        {/* Hero Banner */}
        <div className="hero-banner">
          <div>
            <div className="hero-title">👋 {devName}</div>
            <div className="hero-desc">
              {insight
                ? `${insight.insights?.[0] || 'Agent analysis complete.'}`
                : 'Run the agent to generate insights for this developer.'
              }
            </div>
          </div>
          {insight && (
            <div className="score-ring-wrap">
              <ScoreGauge value={insight.productivity_score} color="#6366f1" label="Productivity" />
              <ScoreGauge value={insight.burnout_score} color={burnoutColor} label="Burnout Risk" />
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        {insight ? (
          <div className="metrics-grid">
            {/* Invisible Work */}
            <div className="metric-card">
              <div className="metric-icon-wrap" style={{ background: 'rgba(99,102,241,0.15)' }}>
                <Eye size={20} color="var(--accent-primary)" />
              </div>
              <div className="metric-value text-gradient-primary">
                {insight.invisible_work?.length || 0}
              </div>
              <div className="metric-label">Invisible Work Items</div>
              <div className="metric-trend trend-up">
                {insight.invisible_work?.reduce((s, i) => s + (i.estimated_hours || 0), 0).toFixed(1)}h unrecognized effort
              </div>
            </div>

            {/* Burnout */}
            <div className="metric-card">
              <div className="metric-icon-wrap" style={{ background: `${burnoutColor}20` }}>
                <Flame size={20} color={burnoutColor} />
              </div>
              <div className="metric-value" style={{ color: burnoutColor }}>
                {Math.round(insight.burnout_score)}
              </div>
              <div className="metric-label">Burnout Score</div>
              <div className="metric-trend" style={{ color: burnoutColor }}>
                {burnoutLevel.toUpperCase()} RISK
              </div>
              <div className="burnout-meter" style={{ marginTop: 12 }}>
                <div
                  className={`burnout-fill burnout-${burnoutLevel}`}
                  style={{ width: `${insight.burnout_score}%` }}
                />
              </div>
            </div>

            {/* Skills */}
            <div className="metric-card">
              <div className="metric-icon-wrap" style={{ background: 'rgba(34,211,238,0.15)' }}>
                <TrendingUp size={20} color="var(--accent-cyan)" />
              </div>
              <div className="metric-value" style={{ color: 'var(--accent-cyan)' }}>
                {insight.skills_detected?.length || 0}
              </div>
              <div className="metric-label">Skills Detected</div>
              <div className="metric-trend trend-up">
                {insight.skills_detected?.filter(s => s.trajectory === 'rising').length || 0} rising
              </div>
            </div>

            {/* Peak Hours */}
            <div className="metric-card">
              <div className="metric-icon-wrap" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <Clock size={20} color="var(--accent-emerald)" />
              </div>
              <div className="metric-value" style={{ color: 'var(--accent-emerald)', fontSize: 22 }}>
                {insight.peak_hours?.map(h => `${h}:00`).join(', ') || '—'}
              </div>
              <div className="metric-label">Peak Productivity</div>
              <div className="metric-trend trend-up">Calendar blocks scheduled</div>
            </div>
          </div>
        ) : (
          <div className="metrics-grid">
            {[0,1,2,3].map(i => (
              <div key={i} className="metric-card">
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 16 }} />
                <div className="skeleton" style={{ width: 60, height: 36, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: 120, height: 14 }} />
              </div>
            ))}
          </div>
        )}

        {/* Commit Activity & Insights */}
        <div className="charts-grid">
          {/* Commit Heatmap */}
          <div className="card">
            <div className="chart-title">
              <Activity size={16} color="var(--accent-primary)" />
              Commit Activity (30 days)
            </div>
            {activity?.commits ? (
              <CommitHeatmap commits={activity.commits} />
            ) : (
              <div className="skeleton" style={{ height: 80 }} />
            )}
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
              {activity?.commits_count || 0} commits · {activity?.pr_reviews_count || 0} PR reviews · {activity?.issue_comments_count || 0} issue comments
            </div>
          </div>

          {/* Team Summary */}
          <div className="card">
            <div className="chart-title">
              Team Burnout Overview
            </div>
            {summary.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {summary.map(dev => (
                  <div key={dev.developer_id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{dev.developer_name}</span>
                      <span style={{ color: BURNOUT_COLORS[dev.burnout_level] || 'var(--text-muted)', fontWeight: 700 }}>
                        {Math.round(dev.burnout_score)}
                      </span>
                    </div>
                    <div className="burnout-meter">
                      <div
                        className={`burnout-fill burnout-${dev.burnout_level}`}
                        style={{ width: `${dev.burnout_score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div>Run the agent for all developers first</div>
              </div>
            )}
          </div>
        </div>

        {/* Invisible Work & Insights */}
        {insight && (
          <div className="charts-grid">
            <div className="card">
              <div className="chart-title">
                <Eye size={16} color="var(--accent-primary)" />
                Invisible Work Detected
              </div>
              {insight.invisible_work?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {insight.invisible_work.map((iw, idx) => (
                    <div key={idx} style={{
                      padding: '14px', background: 'rgba(99,102,241,0.06)',
                      borderRadius: 10, border: '1px solid rgba(99,102,241,0.12)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: 1 }}>
                          {iw.category?.replace('_', ' ')}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--accent-emerald)', fontWeight: 700 }}>
                          {iw.estimated_hours}h · Impact {iw.impact_score}/10
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{iw.description}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No invisible work detected yet</div>
              )}
            </div>

            <div className="card">
              <div className="chart-title">Agent Insights</div>
              <div className="insight-list">
                {insight.insights?.map((ins, idx) => (
                  <div key={idx} className="insight-item">
                    <div className="insight-dot" style={{ background: 'var(--accent-cyan)' }} />
                    {ins}
                  </div>
                )) || <div className="empty-state">No insights yet</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
