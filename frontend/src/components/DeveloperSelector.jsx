import { X } from 'lucide-react'

export default function DeveloperSelector({
  allDevelopers,
  selectedDev,
  setSelectedDev,
  onRemoveDev,
  onAddClick,
}) {
  return (
    <div className="dev-selector" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
      {allDevelopers.map((dev) => {
        const color = dev.avatar_color || 'var(--accent-primary)'
        const isActive = selectedDev === dev.id
        return (
          <div
            key={dev.id}
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
          >
            <button
              id={`dev-chip-${dev.id}`}
              className={`dev-chip${isActive ? ' active' : ''}`}
              onClick={() => setSelectedDev(dev.id)}
            >
              <div
                className="dev-avatar"
                style={{
                  background: isActive ? 'rgba(255, 255, 255, 0.25)' : color,
                }}
              >
                {dev.is_session
                  ? dev.initials
                  : dev.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
              </div>
              {dev.name}
              {dev.role && (
                <span
                  style={{
                    fontSize: 10,
                    color: isActive ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-muted)',
                    marginLeft: 4,
                  }}
                >
                  · {dev.role.split(' ')[0]}
                </span>
              )}
            </button>
            {!dev.is_seed && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveDev(dev)
                }}
                title="Remove developer"
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'var(--accent-rose)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.7,
                  transition: 'opacity 0.15s, transform 0.15s',
                  zIndex: 10,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
              >
                <X size={9} color="white" />
              </button>
            )}
          </div>
        )
      })}
      {/* Add Developer Button */}
      <button
        id="dev-selector-add-btn"
        className="dev-chip"
        onClick={onAddClick}
        style={{
          border: '1px dashed var(--accent-primary)',
          color: 'var(--text-accent)',
          background: 'transparent',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            fontWeight: 'bold',
            fontSize: '15px',
            marginRight: '2px',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          +
        </span>
        Add
      </button>
    </div>
  )
}
