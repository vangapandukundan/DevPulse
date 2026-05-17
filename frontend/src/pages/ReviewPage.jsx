import { useState, useEffect, useCallback } from 'react'
import { FileText, Star, TrendingUp, AlertTriangle, CheckCircle, Loader } from 'lucide-react'
import { getDevelopers, generateReview, getReviews } from '../api.js'
import { format } from 'date-fns'

const PERIOD_OPTIONS = [
  'Last 30 Days', 'Last 90 Days', 'Q1 2025', 'Q2 2025', 'H1 2025',
]

function RatingBadge({ rating }) {
  const cls = rating?.includes('Exceeds') ? 'rating-exceeds'
    : rating?.includes('Needs') ? 'rating-needs'
    : 'rating-meets'
  const icon = rating?.includes('Exceeds') ? <Star size={14} />
    : rating?.includes('Needs') ? <AlertTriangle size={14} />
    : <CheckCircle size={14} />

  return (
    <span className={`rating-badge ${cls}`}>
      {icon} {rating || 'Meets Expectations'}
    </span>
  )
}

function ReviewCard({ review }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 20, flexWrap: 'wrap', gap: 12
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', marginBottom: 4 }}>
            {review.developer_name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {review.period} · {review.generated_at ? format(new Date(review.generated_at), 'MMM d, yyyy h:mm a') : ''}
          </div>
        </div>
        <RatingBadge rating={review.overall_rating} />
      </div>

      <div className="divider" />

      {/* Summary */}
      {review.summary && (
        <div className="review-section">
          <div className="review-section-title">Executive Summary</div>
          <div className="review-text">{review.summary}</div>
        </div>
      )}

      {/* Achievements */}
      {review.achievements?.length > 0 && (
        <div className="review-section">
          <div className="review-section-title">🏆 Key Achievements</div>
          <ul className="review-list">
            {review.achievements.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {/* Invisible Work */}
      {review.invisible_work_summary && (
        <div className="review-section">
          <div className="review-section-title">👁️ Invisible Work</div>
          <div className="review-text">{review.invisible_work_summary}</div>
        </div>
      )}

      {/* Skill Growth */}
      {review.skill_growth?.length > 0 && (
        <div className="review-section">
          <div className="review-section-title">📈 Skill Growth</div>
          <div className="skill-grid">
            {review.skill_growth.map((s, i) => (
              <span key={i} className="skill-badge rising">
                <TrendingUp size={12} />{s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Areas for Growth */}
      {review.areas_for_growth?.length > 0 && (
        <div className="review-section">
          <div className="review-section-title">🌱 Areas for Growth</div>
          <ul className="review-list">
            {review.areas_for_growth.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {/* Burnout Assessment */}
      {review.burnout_assessment && (
        <div className="review-section">
          <div className="review-section-title">⚖️ Work-Life Balance</div>
          <div className="review-text">{review.burnout_assessment}</div>
        </div>
      )}

      {/* Recommendations */}
      {review.recommendations?.length > 0 && (
        <div className="review-section">
          <div className="review-section-title">💡 Recommendations</div>
          <ul className="review-list">
            {review.recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {/* Full Text */}
      {review.full_text && (
        <>
          <div className="divider" />
          <div className="review-section">
            <div className="review-section-title">Full Review</div>
            <div className="review-text" style={{ lineHeight: 1.8 }}>{review.full_text}</div>
          </div>
        </>
      )}
    </div>
  )
}

export default function ReviewPage() {
  const [developers, setDevelopers] = useState([])
  const [selectedDev, setSelectedDev] = useState('dev_001')
  const [period, setPeriod] = useState('Last 30 Days')
  const [reviews, setReviews] = useState([])
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [devData, reviewData] = await Promise.all([
        getDevelopers(),
        getReviews(selectedDev),
      ])
      setDevelopers(devData.developers || [])
      setReviews(reviewData.reviews || [])
    } catch {}
    setLoading(false)
  }, [selectedDev])

  useEffect(() => { load() }, [load])

  const handleGenerate = async () => {
    setGenerating(true)
    setStatus('Gemini is generating your performance review…')
    try {
      const review = await generateReview(selectedDev, period)
      setReviews(prev => [review, ...prev])
      setStatus('✅ Review generated successfully!')
    } catch (e) {
      setStatus(`❌ Error: ${e.message}`)
    }
    setGenerating(false)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Performance Review Generator</h1>
          <p className="page-subtitle">AI-powered professional reviews — powered by Gemini</p>
        </div>
      </div>

      <div className="page-content">
        {/* Generator Panel */}
        <div className="card" style={{ marginBottom: 28 }}>
          <div className="section-title">
            <FileText size={16} color="var(--accent-primary)" />
            Generate New Review
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {/* Dev selector */}
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>Developer</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {developers.map(dev => (
                  <button
                    key={dev.id}
                    id={`review-dev-${dev.id}`}
                    className={`dev-chip${selectedDev === dev.id ? ' active' : ''}`}
                    onClick={() => setSelectedDev(dev.id)}
                  >
                    {dev.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Period selector */}
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>Period</div>
              <select
                id="review-period-select"
                value={period}
                onChange={e => setPeriod(e.target.value)}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '8px 14px', color: 'var(--text-primary)',
                  fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                {PERIOD_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <button
              id="generate-review-btn"
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating
                ? <><Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} />Generating…</>
                : <><Star size={15} />Generate Review</>
              }
            </button>
          </div>

          {status && (
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
              fontSize: 13, color: 'var(--text-secondary)'
            }}>
              {status}
            </div>
          )}
        </div>

        {/* Existing Reviews */}
        {loading ? (
          <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
        ) : reviews.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📄</div>
              <div>No reviews yet. Generate your first one above!</div>
            </div>
          </div>
        ) : (
          reviews.map((review, idx) => <ReviewCard key={idx} review={review} />)
        )}
      </div>
    </>
  )
}
