import React from 'react'

export default function ThemeToggle({ theme, toggle }) {
  return (
    <button onClick={toggle} style={{
      background: 'var(--card)',
      border: '1.5px solid var(--border)',
      borderRadius: '999px',
      padding: '6px 14px',
      color: 'var(--text)',
      fontSize: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    }}>
      {theme === 'light' ? '🌙 Scuro' : '☀️ Chiaro'}
    </button>
  )
}
