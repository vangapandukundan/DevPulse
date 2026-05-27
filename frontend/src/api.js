import axios from 'axios'

// Use VITE_API_URL for cloud deployment, fallback to /api for local dev proxy
const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

// ─── Developers (Dynamic Registry) ──────────────────────────────────────

export const getDevelopers = () =>
  api.get('/developers').then(r => r.data)

export const registerDeveloper = (data) =>
  api.post('/developers', data).then(r => r.data)

export const removeDeveloper = (developerId) =>
  api.delete(`/developers/${developerId}`).then(r => r.data)

// ─── Agent ──────────────────────────────────────────────────────────────

export const runAgent = (username, days = 30) =>
  api.post(`/agent/run/${username}`, null, { params: { days } }).then(r => r.data)

export const runAllAgents = () =>
  api.post('/agent/run-all').then(r => r.data)

export const getAgentRuns = (developerId) =>
  api.get('/agent/runs', { params: developerId ? { developer_id: developerId } : {} }).then(r => r.data)

export const getDeveloperMe = () =>
  api.get('/developer/me').then(r => r.data)

export const getDeveloperByUsername = (username) =>
  api.get(`/developer/${username}`).then(r => r.data)

export const getMCPTools = () =>
  api.get('/agent/tools').then(r => r.data)

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
