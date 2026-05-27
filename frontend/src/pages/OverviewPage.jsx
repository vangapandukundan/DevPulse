import { useState, useEffect, useCallback, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell
} from 'recharts'
import {
  Flame, TrendingUp, Eye, Clock, RefreshCw, Play, Activity,
  AlertTriangle, CheckCircle, Zap, Brain, ArrowUpRight, Users, UserPlus, Trash2, X
} from 'lucide-react'
import {
  getDevelopers, getLatestInsight, getInsightsSummary,
  getActivity, runAgent, removeDeveloper
} from '../api.js'
import DeveloperSelector from '../components/DeveloperSelector.jsx'
import { format, subDays } from 'date-fns'

// ─── Constants ───────────────────────────────────────────────────────────
const BURNOUT_COLORS = {
  low:      '#10b981',
  medium:   '#f59e0b',
  high:     '#f97316',
  critical: '#f43f5e',
}

const BURNOUT_LABELS = {
  low: 'Healthy',
  medium: 'Moderate',
  high: 'High Risk',
  critical: 'Critical',
}

const DEV_COLORS = {
  dev_001: '#6366f1',
  dev_002: '#f59e0b',
}

// ─── Toast ────────────────────────────────────────────────────────────────
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

// ─── Semicircle Gauge ─────────────────────────────────────────────────────
function SemiGauge({ value, color, label, max = 100 }) {
  const pct = Math.min(value / max, 1)
  const r = 50
  const cx = 70, cy = 70
  const startAngle = Math.PI
  const endAngle = 0

  // Background arc
  const bgX1 = cx + r * Math.cos(startAngle)
  const bgY1 = cy + r * Math.sin(startAngle)
  const bgX2 = cx + r * Math.cos(endAngle)
  const bgY2 = cy + r * Math.sin(endAngle)

  // Value arc
  const valAngle = startAngle + (endAngle - startAngle) * pct
  const valX2 = cx + r * Math.cos(valAngle)
  const valY2 = cy + r * Math.sin(valAngle)
  const largeArc = pct > 0.5 ? 1 : 0

  return (
    <div style={{ textAlign: 'center', width: 140 }}>
      <svg width={140} height={85} viewBox="0 0 140 85">
        {/* BG track */}
        <path
          d={`M ${bgX1},${bgY1} A ${r},${r} 0 1 1 ${bgX2},${bgY2}`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
          strokeLinecap="round"
        />

        {/* Value arc */}
        {pct > 0.01 && (
          <path
            d={`M ${bgX1},${bgY1} A ${r},${r} 0 ${largeArc} 1 ${valX2},${valY2}`}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            style={{ transition: 'd 1s ease' }}
          />
        )}

        {/* Center value */}
        <text x={cx} y={cy + 4} textAnchor="middle" fill={color}
          style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 22, letterSpacing: '-1px' }}>
          {Math.round(value)}
        </text>
      </svg>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: -4, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  )
}

// ─── Commit Heatmap ──────────────────────────────────────────────────────
const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '8px 12px', fontSize: 12
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
        {payload[0].value} commits
      </div>
    </div>
  )
}

function CommitHeatmap({ commits }) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i)
    const key = format(date, 'yyyy-MM-dd')
    const count = commits.filter(c => {
      if (!c.timestamp) return false
      try {
        const commitDate = new Date(c.timestamp)
        return format(commitDate, 'yyyy-MM-dd') === key
      } catch {
        return false
      }
    }).length
    return { date: format(date, 'MMM d'), count, dayOfWeek: date.getDay() }
  })

  const maxCommits = Math.max(...days.map(d => d.count), 1)

  // Classic GitHub contribution green colors
  const getBarColor = (count) => {
    if (count === 0) return 'rgba(255, 255, 255, 0.04)'
    if (count <= 2) return '#0e4429'
    if (count <= 4) return '#006d32'
    if (count <= 6) return '#26a641'
    return '#39d353'
  }

  return (
    <ResponsiveContainer width="100%" height={90}>
      <BarChart data={days} margin={{ top: 4, right: 0, left: -20, bottom: 0 }} barSize={6}>
        <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval={6}
        />
        <YAxis hide domain={[0, maxCommits + 1]} />
        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {days.map((entry, idx) => (
            <Cell
              key={idx}
              fill={getBarColor(entry.count)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Stat Card ──────────────────────────────────────────────────────────
function StatCard({ icon: Icon, iconBg, iconColor, value, label, trend, trendUp, glowColor }) {
  return (
    <div className="metric-card" style={{ borderColor: glowColor ? `${glowColor}20` : undefined }}>
      <div
        className="metric-card-glow"
        style={{ background: glowColor || 'transparent' }}
      />
      <div className="metric-card-inner">
        <div className="metric-icon-wrap" style={{ background: iconBg }}>
          <Icon size={19} color={iconColor} />
        </div>
        <div className="metric-value" style={{ color: iconColor }}>{value}</div>
        <div className="metric-label">{label}</div>
        {trend && (
          <div className={`metric-trend ${trendUp ? 'trend-up' : 'trend-neutral'}`}>
            {trend}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────
export default function OverviewPage({
  allDevelopers,
  selectedDev,
  setSelectedDev,
  onRemoveDev,
  onAddClick,
  addToast,
  developers,
  sessionDevelopers
}) {
  const [insight, setInsight] = useState(null)
  const [activity, setActivity] = useState(null)
  const [summary, setSummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const summaryData = await getInsightsSummary()
      setSummary(summaryData.summary || [])
    } catch {}
    setLoading(false)
  }, [])

  const loadDev = useCallback(async () => {
    setInsight(null)
    setActivity(null)
    const sessionDev = sessionDevelopers.find(d => d.username === selectedDev)
    if (sessionDev) {
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

      const mappedActivity = {
        commits: devData.commits || [],
        commits_count: devData.total_commits || 0,
        pr_reviews_count: devData.invisible_work_items?.length || 0,
        issue_comments_count: devData.invisible_work_items?.reduce((s, i) => s + (i.comments_count || 0), 0) || 0,
      }

      setInsight(mappedInsight)
      setActivity(mappedActivity)
      return
    }

    try {
      const [ins, act] = await Promise.all([
        getLatestInsight(selectedDev),
        getActivity(selectedDev, 30),
      ])
      setInsight(ins?.insight || null)
      setActivity(act || null)
    } catch (err) {
      addToast(`Error loading data: ${err.message}`, 'error')
    }
  }, [selectedDev, sessionDevelopers, addToast])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadDev() }, [loadDev])

  const handleRunAgent = async () => {
    setRunning(true)
    addToast('🤖 Agent is analyzing developer activity...', 'info')
    try {
      const dev = allDevelopers.find(d => d.id === selectedDev)
      const username = dev?.github || selectedDev
      const result = await runAgent(username)
      await loadDev()
      await load()
      addToast(`Agent analysis complete! Run #${result.run_id}`, 'success')
    } catch (e) {
      addToast(`Agent error: ${e.message}`, 'error')
    }
    setRunning(false)
  }

  const devInfo = allDevelopers.find(d => d.id === selectedDev)
  const devName = devInfo?.name || selectedDev
  const burnoutLevel = insight?.burnout_level || 'low'
  const burnoutColor = BURNOUT_COLORS[burnoutLevel]
  const burnoutLabel = BURNOUT_LABELS[burnoutLevel]
  const lateNightCommits = activity?.commits?.filter(c => {
    const h = new Date(c.timestamp).getHours()
    return h >= 22 || h <= 5
  }).length || 0
  const weekendCommits = activity?.commits?.filter(c => {
    const d = new Date(c.timestamp).getDay()
    return d === 0 || d === 6
  }).length || 0

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-breadcrumb">DevPulse</div>
          <h1 className="page-title">
            Overview Dashboard
          </h1>
        </div>
        <div className="page-header-actions">
          <button
            id="add-developer-btn"
            className="btn btn-outline"
            onClick={onAddClick}
          >
            <UserPlus size={14} />Add Developer
          </button>
          <button
            id="run-agent-btn"
            className="btn btn-primary"
            onClick={handleRunAgent}
            disabled={running}
          >
            {running
              ? <><div className="loading-spinner" />Running Agent…</>
              : <><Play size={14} />Run Agent</>
            }
          </button>
          <button className="btn btn-outline" onClick={() => { load(); loadDev() }}>
            <RefreshCw size={13} />Refresh
          </button>
        </div>
      </div>

      <div className="page-content animate-in">
        {/* Developer Selector */}
        <DeveloperSelector
          allDevelopers={allDevelopers}
          selectedDev={selectedDev}
          setSelectedDev={setSelectedDev}
          onRemoveDev={onRemoveDev}
          onAddClick={onAddClick}
        />

        {/* Developer Profile Card */}
        <div className="hero-banner" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: devInfo?.avatar_color || 'var(--accent-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, color: 'white',
              }}>
                {devInfo?.initials || devName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{devName}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {devInfo?.role || 'Developer'} · {devInfo?.team || 'Engineering'}
                </div>
              </div>
            </div>
            
            {/* Real Stats Row */}
            {activity && (
              <div style={{ display: 'flex', gap: '24px', marginTop: '20px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Commits</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{activity.commits_count}</div>
                </div>
                <div style={{ width: '1px', background: 'var(--border)' }}></div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PR Reviews</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{activity.pr_reviews_count}</div>
                </div>
                <div style={{ width: '1px', background: 'var(--border)' }}></div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comments</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{activity.issue_comments_count}</div>
                </div>
              </div>
            )}
          </div>

          {insight ? (
            <div className="score-ring-wrap">
              <SemiGauge
                value={insight.productivity_score}
                color="var(--accent-primary)"
                label="Focus & Output"
              />
              <SemiGauge
                value={insight.burnout_score}
                color={burnoutColor}
                label="Work Stress Level"
              />
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 20, opacity: 0.4 }}>
              <div style={{ textAlign: 'center', width: 140 }}>
                <div className="skeleton" style={{ width: 140, height: 80, borderRadius: 8, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: 80, height: 12, margin: '0 auto' }} />
              </div>
              <div style={{ textAlign: 'center', width: 140 }}>
                <div className="skeleton" style={{ width: 140, height: 80, borderRadius: 8, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: 80, height: 12, margin: '0 auto' }} />
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        {insight ? (
          <div className="metrics-grid">
            <StatCard
              icon={Eye}
              iconBg="rgba(59,130,246,0.12)"
              iconColor="var(--accent-primary)"
              value={insight.invisible_work?.length || 0}
              label="Supporting Effort (Invisible Work)"
              trend={`${insight.invisible_work?.reduce((s, i) => s + (i.estimated_hours || 0), 0).toFixed(1)}h helping reviews`}
              trendUp
              glowColor="rgba(59,130,246,1)"
            />
            <StatCard
              icon={Flame}
              iconBg={`${burnoutColor}18`}
              iconColor={burnoutColor}
              value={Math.round(insight.burnout_score)}
              label="Work Stress level (Burnout Risk)"
              trend={`${burnoutLabel} stress`}
              glowColor={burnoutColor}
            />
            <StatCard
              icon={TrendingUp}
              iconBg="rgba(6,182,212,0.12)"
              iconColor="var(--accent-cyan)"
              value={insight.skills_detected?.length || 0}
              label="Mastered Skills (Detected)"
              trend={`${insight.skills_detected?.filter(s => s.trajectory === 'rising').length || 0} rising skills`}
              trendUp
              glowColor="rgba(6,182,212,1)"
            />
            <StatCard
              icon={Clock}
              iconBg="rgba(16,185,129,0.12)"
              iconColor="var(--accent-emerald)"
              value={insight.peak_hours?.map(h => `${h}:00`).join(', ') || '—'}
              label="Best Focus Times (Peak Hours)"
              trend="Peak hours focus block"
              trendUp
              glowColor="rgba(16,185,129,1)"
            />
          </div>
        ) : (
          <div className="metrics-grid">
            {[0,1,2,3].map(i => (
              <div key={i} className="metric-card">
                <div className="skeleton" style={{ width: 42, height: 42, borderRadius: 10, marginBottom: 14 }} />
                <div className="skeleton" style={{ width: 60, height: 32, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: 120, height: 13 }} />
              </div>
            ))}
          </div>
        )}

        {/* Charts Row */}
        <div className="charts-grid">
          {/* Commit Activity */}
          <div className="card">
            <div className="chart-title">
              <Activity size={15} color="var(--accent-primary)" />
              Commit Activity (Last 30 Days)
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>
                {activity?.commits_count || 0} commits total
              </span>
            </div>
            {activity?.commits ? (
              <CommitHeatmap commits={activity.commits} />
            ) : (
              <div className="skeleton" style={{ height: 90 }} />
            )}
            <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 11.5, color: 'var(--text-muted)' }}>
              <span>{activity?.pr_reviews_count || 0} PR reviews</span>
              <span>{activity?.issue_comments_count || 0} comments</span>
              <span>{lateNightCommits} late-night commits</span>
            </div>
          </div>

          {/* Team Burnout */}
          <div className="card">
            <div className="chart-title">
              <Users size={15} color="var(--accent-amber)" />
              Team Burnout Overview
            </div>
            {(() => {
              const mergedSummary = [
                ...summary,
                ...sessionDevelopers.map(dev => ({
                  developer_id: dev.username,
                  developer_name: dev.displayName || dev.username,
                  burnout_level: dev.data.burnout_score < 30 ? 'low' : dev.data.burnout_score < 60 ? 'medium' : dev.data.burnout_score < 85 ? 'high' : 'critical',
                  burnout_score: dev.data.burnout_score,
                  avatar_color: dev.avatarColor,
                  initials: dev.initials,
                  is_session: true
                }))
              ];

              return mergedSummary.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {mergedSummary.map(dev => {
                    const bc = BURNOUT_COLORS[dev.burnout_level] || 'var(--text-muted)'
                    return (
                      <div key={dev.developer_id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%',
                              background: dev.avatar_color || DEV_COLORS[dev.developer_id] || 'var(--accent-primary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 9, fontWeight: 700, color: 'white',
                              flexShrink: 0,
                            }}>
                              {dev.is_session ? dev.initials : dev.developer_name?.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                              {dev.developer_name}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: bc, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                              {Math.round(dev.burnout_score)}
                            </span>
                            <span className="status-badge" style={{
                              background: `${bc}15`,
                              color: bc,
                              border: `1px solid ${bc}25`,
                            }}>
                              {BURNOUT_LABELS[dev.burnout_level]}
                            </span>
                          </div>
                        </div>
                        <div className="burnout-meter">
                          <div
                            className={`burnout-fill burnout-${dev.burnout_level}`}
                            style={{ width: `${dev.burnout_score}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <span className="empty-state-icon">👥</span>
                  <div>Run the agent for all developers to see team overview</div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Invisible Work & Skills Row */}
        {insight && (
          <div className="charts-grid">
            <div className="card">
              <div className="chart-title">
                <Eye size={15} color="var(--accent-primary)" />
                Invisible Work Detected
                <span className="status-badge status-planned" style={{ marginLeft: 'auto' }}>
                  {insight.invisible_work?.length || 0} items
                </span>
              </div>
              {insight.invisible_work?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {insight.invisible_work.map((iw, idx) => (
                    <div key={idx} className="invisible-work-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'flex-start' }}>
                        <div className="invisible-work-cat">
                          {iw.category?.replace(/_/g, ' ')}
                        </div>
                        <div className="invisible-work-hours">
                          {iw.estimated_hours}h · Impact {iw.impact_score}/10
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {iw.description}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <span className="empty-state-icon">👁️</span>
                  <div>No invisible work detected</div>
                </div>
              )}
            </div>

            <div className="card">
              <div className="chart-title">
                <TrendingUp size={15} color="var(--accent-emerald)" />
                Detected Skills
                <span className="status-badge status-planned" style={{ marginLeft: 'auto' }}>
                  {insight.skills_detected?.length || 0} skills
                </span>
              </div>
              {insight.skills_detected?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {insight.skills_detected.map((skill, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{skill.skill}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{skill.evidence}</div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 60 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--accent-emerald)' }}>
                          {Math.round(skill.confidence * 100)}%
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>confidence</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '24px 0' }}>No skills detected</div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
