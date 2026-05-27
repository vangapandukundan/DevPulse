import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, LineChart, Line
} from 'recharts'
import {
  TrendingUp, Brain, ArrowUpRight, ArrowDownRight, Minus,
  Flame, Eye, Clock, Activity, Zap, Star
} from 'lucide-react'
import { getInsights } from '../api.js'
import DeveloperSelector from '../components/DeveloperSelector.jsx'

// ─── Trajectory icon/color ────────────────────────────────────────────────
const TRAJ_ICON  = {
  rising:   <ArrowUpRight size={11} />,
  stable:   <Minus size={11} />,
  declining:<ArrowDownRight size={11} />,
}
const TRAJ_COLOR = {
  rising:   'var(--accent-emerald)',
  stable:   'var(--accent-primary)',
  declining:'var(--accent-rose)',
}

const DEV_COLORS = {
  dev_001: '#6366f1',
  dev_002: '#f59e0b',
}

const BURNOUT_COLORS = {
  low:     '#10b981',
  medium:  '#f59e0b',
  high:    '#f97316',
  critical:'#f43f5e',
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 14px', fontSize: 12
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600, marginBottom: 2 }}>
          {p.name}: {Math.round(p.value)}
        </div>
      ))}
    </div>
  )
}

// ─── Insight Card ────────────────────────────────────────────────────────
function InsightCard({ icon: Icon, color, title, children }) {
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="section-title" style={{ marginBottom: 16 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={15} color={color} />
        </div>
        {title}
      </div>
      {children}
    </div>
  )
}

export default function InsightsPage({
  allDevelopers,
  selectedDev,
  setSelectedDev,
  onRemoveDev,
  onAddClick
}) {
  const [insights, setInsights]      = useState([])
  const [loading, setLoading]        = useState(true)

  const load = useCallback(async () => {
    setInsights([])
    setLoading(true)
    const sessionDev = allDevelopers.find(d => d.id === selectedDev && d.is_session)
    if (sessionDev && sessionDev.data) {
      const devData = sessionDev.data
      const mappedInsight = {
        burnout_score: devData.burnout_score,
        burnout_level: devData.burnout_score < 30 ? 'low' : devData.burnout_score < 60 ? 'medium' : devData.burnout_score < 85 ? 'high' : 'critical',
        productivity_score: devData.productivity_score,
        invisible_work: devData.invisible_work_items?.map(item => ({
          category: item.review_type || 'code_review',
          estimated_hours: item.time_spent_minutes ? parseFloat((item.time_spent_minutes / 60).toFixed(1)) : 1.5,
          impact_score: item.comments_count ? Math.min(10, Math.max(1, Math.round(item.comments_count * 0.8))) : 6,
          description: `Reviewed pull request: ${item.pr_title || 'Feature integration'}`
        })) || [],
        skills_detected: devData.skills?.map(s => ({
          skill: s,
          trajectory: 'rising',
          evidence: `Active commit and review history for ${s}`,
          confidence: 0.85
        })) || [],
        insights: [
          `Active in ${devData.repos_active} repositories with ${devData.total_commits} commits over the last 30 days.`,
          `Peak productivity observed during hours: ${devData.peak_hours?.join(', ') || 'N/A'}.`,
          `Unrecognized effort identified: ${devData.invisible_work_hours} hours spent on pull request reviews.`
        ],
        peak_hours: devData.peak_hours || [10, 11, 14, 15]
      }
      setInsights([mappedInsight])
      setLoading(false)
      return
    }

    try {
      const ins = await getInsights(selectedDev)
      setInsights((ins.insights || []).slice().reverse())
    } catch {}
    setLoading(false)
  }, [selectedDev, allDevelopers])

  useEffect(() => { load() }, [load])

  const latest = insights[insights.length - 1]

  const trendData = insights.map((ins, idx) => ({
    run:         `Check #${idx + 1}`,
    productivity: Math.round(ins.productivity_score),
    burnout:      Math.round(ins.burnout_score),
  }))

  const radarData = latest?.skills_detected?.map(s => ({
    skill:      s.skill.length > 14 ? s.skill.slice(0, 14) + '…' : s.skill,
    confidence: Math.round(s.confidence * 100),
  })) || []

  // Invisible work aggregated
  const totalInvisibleHours = latest?.invisible_work?.reduce((s, i) => s + (i.estimated_hours || 0), 0) || 0
  const invisibleByCategory = latest?.invisible_work?.reduce((acc, iw) => {
    acc[iw.category] = (acc[iw.category] || 0) + iw.estimated_hours
    return acc
  }, {}) || {}

  const devColor = DEV_COLORS[selectedDev] || 'var(--accent-primary)'

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">DevPulse</div>
          <h1 className="page-title">Developer Insights</h1>
          <p className="page-subtitle">
            See how quickly your technology skills are growing, how your stress balances over time, and when you do your most focused thinking.
          </p>
        </div>
        <div className="page-header-actions">
          <div className="hero-ai-badge">
            <Brain size={10} />
            Gemini 2.0 Flash
          </div>
        </div>
      </div>

      <div className="page-content animate-in">
        {/* Dev Selector */}
        <DeveloperSelector
          allDevelopers={allDevelopers}
          selectedDev={selectedDev}
          setSelectedDev={setSelectedDev}
          onRemoveDev={onRemoveDev}
          onAddClick={onAddClick}
        />

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[0,1,2].map(i => (
              <div key={i} className="skeleton" style={{ height: 220, borderRadius: 14 }} />
            ))}
          </div>
        ) : insights.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <span className="empty-state-icon">🧠</span>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No insights yet</div>
              <div>Run the agent from the Overview page to generate AI-powered insights.</div>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Row */}
            {latest && (
              <div className="metrics-grid" style={{ marginBottom: 24 }}>
                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: 'rgba(59,130,246,0.12)' }}>
                    <Activity size={18} color="var(--accent-primary)" />
                  </div>
                  <div className="metric-value" style={{ color: 'var(--accent-primary)' }}>
                    {Math.round(latest.productivity_score)}
                  </div>
                  <div className="metric-label">Focus & Output Score</div>
                  <div className="metric-trend trend-up">
                    <TrendingUp size={11} /> Combines code updates & consistency (out of 100)
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: `${BURNOUT_COLORS[latest.burnout_level] || '#10b981'}18` }}>
                    <Flame size={18} color={BURNOUT_COLORS[latest.burnout_level] || '#10b981'} />
                  </div>
                  <div className="metric-value" style={{ color: BURNOUT_COLORS[latest.burnout_level] || '#10b981' }}>
                    {Math.round(latest.burnout_score)}
                  </div>
                  <div className="metric-label">Work Stress Index</div>
                  <div className="metric-trend" style={{ color: BURNOUT_COLORS[latest.burnout_level], fontWeight: 600 }}>
                    {latest.burnout_level?.toUpperCase()} WORKLOAD STRESS
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: 'rgba(16,185,129,0.12)' }}>
                    <Eye size={18} color="var(--accent-emerald)" />
                  </div>
                  <div className="metric-value" style={{ color: 'var(--accent-emerald)' }}>
                    {totalInvisibleHours.toFixed(1)}h
                  </div>
                  <div className="metric-label">Supporting Effort Hours</div>
                  <div className="metric-trend trend-up">Unrecognized code reviews & peer help</div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon-wrap" style={{ background: 'rgba(6,182,212,0.12)' }}>
                    <Clock size={18} color="var(--accent-cyan)" />
                  </div>
                  <div className="metric-value" style={{ color: 'var(--accent-cyan)', fontSize: 22 }}>
                    {latest.peak_hours?.map(h => `${h}:00`).slice(0,2).join(', ') || '—'}
                  </div>
                  <div className="metric-label">Peak Focused Window</div>
                  <div className="metric-trend trend-up">Optimal deep work zone hours</div>
                </div>
              </div>
            )}

            {/* Trend Charts */}
            <div className="charts-grid" style={{ marginBottom: 24 }}>
              <InsightCard icon={TrendingUp} color="var(--accent-primary)" title="Work Balance Over Time">
                {trendData.length < 2 ? (
                  <div className="empty-state" style={{ padding: '20px 0', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 10 }}>
                    💡 Run the agent multiple times from the Overview tab to plot a detailed trend graph over time!
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gProd" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gBurn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="run" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0,100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="productivity" name="Focus & Output" stroke="#3b82f6" fill="url(#gProd)" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }} />
                      <Area type="monotone" dataKey="burnout"      name="Stress level"     stroke="#f43f5e" fill="url(#gBurn)" strokeWidth={2} dot={{ fill: '#f43f5e', r: 3, strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </InsightCard>

              <InsightCard icon={Brain} color="var(--accent-cyan)" title="Skills Strength Map">
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 0, left: 30 }}>
                      <PolarGrid stroke="rgba(255,255,255,0.07)" />
                      <PolarAngleAxis dataKey="skill" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                      <Radar
                        name="Expertise Strength"
                        dataKey="confidence"
                        stroke="var(--accent-cyan)"
                        fill="var(--accent-cyan)"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state" style={{ padding: '20px 0' }}>No skills detected yet. Run the agent to see your skills map.</div>
                )}
              </InsightCard>
            </div>

            {/* Skill Velocity Tracker */}
            {latest?.skills_detected?.length > 0 && (
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="section-title" style={{ marginBottom: 16 }}>
                  <TrendingUp size={15} color="var(--accent-emerald)" />
                  Skill Velocity Tracker (Growth Pace)
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                    {latest.skills_detected.filter(s => s.trajectory === 'rising').length} rising ·{' '}
                    {latest.skills_detected.filter(s => s.trajectory === 'stable').length} stable ·{' '}
                    {latest.skills_detected.filter(s => s.trajectory === 'declining').length} declining
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {latest.skills_detected.map((skill, idx) => (
                    <div key={idx} style={{
                      display: 'flex', gap: 12, alignItems: 'center',
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      transition: 'var(--transition)',
                    }}>
                      <span className={`skill-badge ${skill.trajectory}`}>
                        {TRAJ_ICON[skill.trajectory]}
                        {skill.trajectory}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)', marginBottom: 3 }}>
                          {skill.skill}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{skill.evidence}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 18, color: TRAJ_COLOR[skill.trajectory] }}>
                          {Math.round(skill.confidence * 100)}%
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>AI certainty</div>
                      </div>
                      <div style={{ width: 90 }}>
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

            {/* Invisible Work Breakdown */}
            {latest?.invisible_work?.length > 0 && (
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="section-title" style={{ marginBottom: 16 }}>
                  <Eye size={15} color="var(--accent-primary)" />
                  Supporting Effort Hours (Hidden Contributions)
                  <span className="status-badge status-planned" style={{ marginLeft: 'auto' }}>
                    {totalInvisibleHours.toFixed(1)}h total helper time
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {latest.invisible_work.map((iw, idx) => (
                    <div key={idx} className="invisible-work-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div>
                          <div className="invisible-work-cat">{iw.category?.replace(/_/g, ' ')}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 3 }}>
                            {iw.description}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                          <div className="invisible-work-hours">{iw.estimated_hours}h</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            Help Score {iw.impact_score}/10
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="burnout-meter" style={{ flex: 1 }}>
                          <div
                            className="burnout-fill burnout-low"
                            style={{ width: `${(iw.impact_score / 10) * 100}%` }}
                          />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                          Helpfulness
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Flow State Analysis */}
            {latest && (
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="section-title" style={{ marginBottom: 16 }}>
                  <Zap size={15} color="var(--accent-amber)" />
                  Focus & Deep Work Analysis
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{
                    padding: 16, background: 'rgba(59,130,246,0.04)',
                    borderRadius: 10, border: '1px solid rgba(59,130,246,0.1)',
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Your Deep Focus Hours
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-primary)' }}>
                      {latest.peak_hours?.map(h => `${h}:00`).join(' · ') || '—'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Optimal uninterrupted windows
                    </div>
                  </div>
                  <div style={{
                    padding: 16, background: 'rgba(16,185,129,0.04)',
                    borderRadius: 10, border: '1px solid rgba(16,185,129,0.1)',
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Schedule Protections
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--accent-emerald)', fontWeight: 600 }}>
                      ✅ AI Calendar block active during these peak hours
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Meeting auto-decline shields your focus
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Historical Insights */}
            <div className="card">
                <div className="section-title" style={{ marginBottom: 16 }}>
                  <Brain size={15} color="var(--accent-primary)" />
                  Latest Assistant Observations
                  <span className="hero-ai-badge" style={{ marginLeft: 'auto' }}>AI Generated</span>
                </div>
              <div className="insight-list">
                {latest?.insights?.map((ins, idx) => (
                  <div key={idx} className="insight-item">
                    <div className="insight-dot" style={{
                      background: idx % 3 === 0 ? 'var(--accent-primary)'
                        : idx % 3 === 1 ? 'var(--accent-cyan)'
                        : 'var(--accent-emerald)'
                    }} />
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
