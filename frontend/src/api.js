import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// ─── Agent ──────────────────────────────────────────────────────────────

export const runAgent = (developerId, days = 30) =>
  api.post(`/agent/run/${developerId}`, null, { params: { days } }).then(r => r.data)

export const runAllAgents = () =>
  api.post('/agent/run-all').then(r => r.data)

export const getAgentRuns = (developerId) =>
  api.get('/agent/runs', { params: developerId ? { developer_id: developerId } : {} }).then(r => r.data)

export const getMCPTools = () =>
  api.get('/agent/tools').then(r => r.data)

export const getDevelopers = () =>
  api.get('/agent/developers').then(r => r.data)

// ─── Activity ────────────────────────────────────────────────────────────

export const getActivity = (developerId, days = 30) =>
  api.get('/activity', { params: { developer_id: developerId, days } }).then(r => r.data)

// ─── Insights ────────────────────────────────────────────────────────────

export const getInsights = (developerId) =>
  api.get('/insights', { params: developerId ? { developer_id: developerId } : {} }).then(r => r.data)

export const getLatestInsight = (developerId) =>
  api.get(`/insights/latest/${developerId}`).then(r => r.data)

export const getInsightsSummary = () =>
  api.get('/insights/summary').then(r => r.data)

// ─── Actions ─────────────────────────────────────────────────────────────

export const getActions = (developerId) =>
  api.get('/actions', { params: developerId ? { developer_id: developerId } : {} }).then(r => r.data)

export const getCalendarEvents = () =>
  api.get('/actions/calendar-events').then(r => r.data)

// ─── Reviews ─────────────────────────────────────────────────────────────

export const generateReview = (developerId, period = 'Last 30 Days') =>
  api.post('/reviews/generate', { developer_id: developerId, period }).then(r => r.data)

export const getReviews = (developerId) =>
  api.get('/reviews', { params: developerId ? { developer_id: developerId } : {} }).then(r => r.data)

// ─── Auth ─────────────────────────────────────────────────────────────────

export const getAuthStatus = () =>
  api.get('/auth/status').then(r => r.data)
