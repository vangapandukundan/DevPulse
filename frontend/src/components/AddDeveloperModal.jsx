import { useState } from 'react'
import { X, Loader } from 'lucide-react'
import { getDeveloperByUsername } from '../api.js'

const COLOR_OPTIONS = [
  { name: 'blue',   hex: '#388bfd' },
  { name: 'green',  hex: '#30a46c' },
  { name: 'orange', hex: '#f76808' },
  { name: 'purple', hex: '#8957e5' },
  { name: 'red',    hex: '#da3633' },
]

export default function AddDeveloperModal({ onClose, onAdded }) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [selectedColor, setSelectedColor] = useState('#388bfd')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim()) {
      setError('GitHub username is required.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Fetch the developer's data from `/api/developer/{username}`
      const githubData = await getDeveloperByUsername(username.trim())
      
      // Calculate initials (first 2 letters of username, uppercase)
      const initials = username.trim().substring(0, 2).toUpperCase()

      const newDeveloper = {
        username: username.trim(),
        displayName: displayName.trim() || username.trim(),
        avatarColor: selectedColor,
        initials,
        data: githubData,
      }

      onAdded?.(newDeveloper)
      onClose()
    } catch (err) {
      console.error(err)
      setError('GitHub user not found. Check the username and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      {/* Dark overlay background with blur */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Centered modal card */}
      <div
        style={{
          position: 'relative',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          width: '420px',
          maxWidth: '90%',
          boxShadow: 'var(--shadow-hover)',
          zIndex: 1001,
          boxSizing: 'border-box',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Close button (×) */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            borderRadius: 'var(--radius)',
            transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-card-hover)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          <X size={18} />
        </button>

        {/* Title & Subtitle */}
        <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Add GitHub Developer
        </h2>
        <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          Enter a GitHub username to load their real activity data
        </p>

        {/* Error message */}
        {error && (
          <div
            style={{
              background: 'var(--accent-rose-dim)',
              border: '1px solid var(--accent-rose)',
              borderRadius: 'var(--radius)',
              padding: '12px',
              marginBottom: '16px',
              fontSize: '12.5px',
              color: 'var(--accent-rose)',
              lineHeight: '1.4',
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* GitHub Username Field */}
          <div style={{ marginBottom: '18px' }}>
            <label
              htmlFor="username"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              GitHub Username <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-github">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                  <path d="M9 18c-4.51 2-5-2-7-2" />
                </svg>
              </span>
              <input
                id="username"
                type="text"
                placeholder="e.g. torvalds"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '10px 12px 10px 38px',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'var(--transition)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--accent-primary)'
                  e.target.style.boxShadow = 'var(--shadow-glow)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
          </div>

          {/* Display Name Field */}
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="displayName"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Display Name <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'none' }}>(optional)</span>
            </label>
            <input
              id="displayName"
              type="text"
              placeholder="e.g. Linus Torvalds"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                background: 'var(--bg-base)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '10px 12px',
                color: 'var(--text-primary)',
                fontSize: '13.5px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'var(--transition)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent-primary)'
                e.target.style.boxShadow = 'var(--shadow-glow)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border)'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Avatar Color Dot Picker */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Avatar Color
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {COLOR_OPTIONS.map((color) => {
                const isSelected = selectedColor === color.hex
                return (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setSelectedColor(color.hex)}
                    disabled={loading}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: color.hex,
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      position: 'relative',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                      boxShadow: isSelected
                        ? `0 0 0 2px var(--bg-card), 0 0 0 4px ${color.hex}`
                        : 'none',
                    }}
                    title={`Select ${color.name}`}
                  />
                )
              })}
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '8px 16px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = 'var(--bg-card-hover)'
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = 'var(--bg-elevated)'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'var(--accent-emerald)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: 'var(--radius)',
                padding: '8px 18px',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s',
                minWidth: '140px',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = 'var(--accent-emerald)' // handled by transition/opacity in dynamic designs
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = 'var(--accent-emerald)'
              }}
            >
              {loading ? (
                <>
                  <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Fetching GitHub...</span>
                </>
              ) : (
                <span>Add Developer</span>
              )}
            </button>
          </div>
        </form>

        {/* CSS Keyframes for animation */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.95) translate(0, 0);
            }
            to {
              opacity: 1;
              transform: scale(1) translate(0, 0);
            }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}} />
      </div>
    </div>
  )
}
