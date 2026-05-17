import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts'
import { TrendingUp, Brain, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { getDevelopers, getInsights } from '../api.js'

const TRAJ_ICON = { rising: <ArrowUpRight size={12} />, stable: <Minus size={12} />, declining: <ArrowDownRight size={12} /> }
const TRAJ_COLOR = { rising: 'var(--accent-emerald)', stable: 'var(--accent-primary)', declining: 'var(--accent-rose)' }

const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 14px', fontSize: 12
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {Math.round(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function InsightsPage() {
  const [developers, setDevelopers] = useState([])
  const [selectedDev, setSelectedDev] = useState('dev_001')
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [devs, ins] = await Promise.all([
        getDevelopers(),
        getInsights(selectedDev),
      ])
      setDevelopers(devs.developers || [])
      setInsights((ins.insights || []).reverse()) // chronological order
    } catch {}
    setLoading(false)
  }, [selectedDev])

  useEffect(() => { load() }, [load])

  // Latest insight
  const latest = insights[insights.length - 1]

  // Trend data for charts
  const trendData = insights.map((ins, idx) => ({
    run: `Run ${idx + 1}`,
    productivity: Math.round(ins.productivity_score),
    burnout: Math.round(ins.burnout_score),
  }))

  // Skill radar data
  const radarData = latest?.skills_detected?.map(s => ({
    skill: s.skill.length > 15 ? s.skill.slice(0, 15) + '…' : s.skill,
    confidence: Math.round(s.confidence * 100),
  })) || []

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Developer Insights</h1>
          <p className="page-subtitle">Skill velocity, productivity trends, and growth signals</p>
        </div>
      </div>

      <div className="page-content">
        {/* Developer Selector */}
        <div className="dev-selector">
          {developers.map(dev => (
            <button
              key={dev.id}
              id={`insights-dev-${dev.id}`}
              className={`dev-chip${selectedDev === dev.id ? ' active' : ''}`}
              onClick={() => setSelectedDev(dev.id)}
            >
              {dev.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', gap: 20, flexDirection: 'column' }}>
            {[0,1,2].map(i => (
              <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16 }} />
            ))}
          </div>
        ) : insights.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">🧠</div>
              <div>No insights yet. Run the agent from the Overview page first.</div>
            </div>
          </div>
        ) : (
          <>
            {/* Trend Charts */}
            <div className="charts-grid">
              <div className="card">
                <div className="chart-title">
                  <TrendingUp size={16} color="var(--accent-primary)" />
                  Productivity & Burnout Trends
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="gradProd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradBurn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="run" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <Tooltip content={<CUSTOM_TOOLTIP />} />
                    <Area type="monotone" dataKey="productivity" name="Productivity" stroke="#6366f1" fill="url(#gradProd)" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
                    <Area type="monotone" dataKey="burnout" name="Burnout" stroke="#f43f5e" fill="url(#gradBurn)" strokeWidth={2} dot={{ fill: '#f43f5e', r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Skill Radar */}
              <div className="card">
                <div className="chart-title">
                  <Brain size={16} color="var(--accent-cyan)" />
                  Skill Confidence Radar
                </div>
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis dataKey="skill" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                      <Radar name="Confidence" dataKey="confidence" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.2} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state">No skill data</div>
                )}
              </div>
            </div>

            {/* Skills Detail */}
            {latest?.skills_detected?.length > 0 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="section-title">
                  <TrendingUp size={16} color="var(--accent-emerald)" />
                  Skill Velocity Tracker
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {latest.skills_detected.map((skill, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <span className={`skill-badge ${skill.trajectory}`}>
                        {TRAJ_ICON[skill.trajectory]}
                        {skill.trajectory}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>
                          {skill.skill}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{skill.evidence}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: 18, color: TRAJ_COLOR[skill.trajectory] }}>
                          {Math.round(skill.confidence * 100)}%
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>confidence</div>
                      </div>
                      <div style={{ width: 80 }}>
                        <div className="burnout-meter">
                          <div
                            className="burnout-fill"
                            style={{
                              width: `${skill.confidence * 100}%`,
                              background: TRAJ_COLOR[skill.trajectory]
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historical Insights */}
            <div className="card">
              <div className="section-title">Agent Insight History</div>
              <div className="insight-list">
                {latest?.insights?.map((ins, idx) => (
                  <div key={idx} className="insight-item">
                    <div className="insight-dot" style={{ background: idx % 2 === 0 ? 'var(--accent-primary)' : 'var(--accent-cyan)' }} />
                    {ins}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
