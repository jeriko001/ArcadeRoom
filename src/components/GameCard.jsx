import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function GameCard({ title, emoji, path, tag }) {
  const nav = useNavigate()
  return (
    <div onClick={() => nav(path)} style={{
      background: 'var(--card)',
      border: '1.5px solid var(--border)',
      borderRadius: '16px',
      padding: '20px 16px',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      boxShadow: '0 2px 8px var(--shadow)',
      transition: 'transform 0.15s, box-shadow 0.15s'
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 16px var(--shadow)' }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px var(--shadow)' }}
    >
      <span style={{ fontSize: '2.2rem' }}>{emoji}</span>
      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{title}</span>
      <span style={{
        fontSize: '0.72rem',
        background: tag === '1vs1' ? 'var(--accent)' : 'var(--accent2)',
        color: tag === '1vs1' ? (document.documentElement.getAttribute('data-theme') === 'dark' ? '#0f0f0f' : '#fff') : '#fff',
        borderRadius: '999px',
        padding: '2px 10px',
        fontWeight: 600,
        letterSpacing: '0.04em'
      }}>{tag}</span>
    </div>
  )
}
