import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const CONFIGS = {
  Facile: { rows: 8, cols: 8, mines: 10 },
  Medio: { rows: 10, cols: 10, mines: 20 },
  Difficile: { rows: 12, cols: 12, mines: 35 },
}

function buildBoard(rows, cols, mines, safeR, safeC) {
  const cells = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      cells.push([r, c])
  const safe = new Set()
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++)
      safe.add(`${safeR + dr},${safeC + dc}`)
  const candidates = cells.filter(([r, c]) => !safe.has(`${r},${c}`))
  const mineSet = new Set()
  while (mineSet.size < mines) {
    const idx = Math.floor(Math.random() * candidates.length)
    mineSet.add(candidates[idx].join(','))
  }
  const board = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      mine: mineSet.has(`${r},${c}`),
      revealed: false,
      flagged: false,
      adjacent: 0
    }))
  )
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue
      let count = 0
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) count++
        }
      board[r][c].adjacent = count
    }
  return board
}

function reveal(board, r, c) {
  const rows = board.length, cols = board[0].length
  const next = board.map(row => row.map(cell => ({ ...cell })))
  const stack = [[r, c]]
  while (stack.length) {
    const [cr, cc] = stack.pop()
    if (cr < 0 || cr >= rows || cc < 0 || cc >= cols) continue
    if (next[cr][cc].revealed || next[cr][cc].flagged) continue
    next[cr][cc].revealed = true
    if (next[cr][cc].adjacent === 0 && !next[cr][cc].mine)
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          stack.push([cr + dr, cc + dc])
  }
  return next
}

const COLORS = ['', '#2196f3', '#4caf50', '#f44336', '#9c27b0', '#ff5722', '#00bcd4', '#000', '#666']

export default function CampoMinato() {
  const nav = useNavigate()
  const [diff, setDiff] = useState('Facile')
  const [board, setBoard] = useState(null)
  const [status, setStatus] = useState('idle') // idle, playing, won, lost
  const [started, setStarted] = useState(false)
  const [flagMode, setFlagMode] = useState(false)

  const cfg = CONFIGS[diff]

  const startGame = () => {
    setBoard(null)
    setStatus('playing')
    setStarted(false)
  }

  const handleClick = useCallback((r, c) => {
    if (status !== 'playing') return
    let b = board
    if (!started) {
      b = buildBoard(cfg.rows, cfg.cols, cfg.mines, r, c)
      setStarted(true)
    }
    if (b[r][c].revealed || b[r][c].flagged) return
    if (flagMode) {
      const next = b.map(row => row.map(cell => ({ ...cell })))
      next[r][c].flagged = !next[r][c].flagged
      setBoard(next)
      return
    }
    if (b[r][c].mine) {
      const next = b.map(row => row.map(cell => ({ ...cell, revealed: cell.mine ? true : cell.revealed })))
      setBoard(next)
      setStatus('lost')
      return
    }
    const next = reveal(b, r, c)
    setBoard(next)
    const unrevealed = next.flat().filter(cell => !cell.revealed && !cell.mine)
    if (unrevealed.length === 0) setStatus('won')
  }, [board, status, started, flagMode, cfg])

  const handleRightClick = (e, r, c) => {
    e.preventDefault()
    if (!board || status !== 'playing') return
    const next = board.map(row => row.map(cell => ({ ...cell })))
    next[r][c].flagged = !next[r][c].flagged
    setBoard(next)
  }

  const cellSize = Math.min(Math.floor((window.innerWidth - 48) / cfg.cols), 38)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px', userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => nav('/')} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)' }}>← Home</button>
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>Campo Minato</span>
        <div />
      </div>

      {status === 'idle' && (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <p style={{ marginBottom: 16, fontWeight: 600 }}>Scegli difficoltà</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
            {Object.keys(CONFIGS).map(d => (
              <button key={d} onClick={() => setDiff(d)} style={{
                background: diff === d ? 'var(--accent)' : 'var(--card)',
                color: diff === d ? '#fff' : 'var(--text)',
                border: '1.5px solid var(--border)', borderRadius: 8,
                padding: '8px 16px', fontWeight: 600
              }}>{d}</button>
            ))}
          </div>
          <button onClick={startGame} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 32px', fontWeight: 700, fontSize: '1rem' }}>Inizia</button>
        </div>
      )}

      {(status === 'playing' || status === 'won' || status === 'lost') && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <button onClick={() => setStatus('idle')} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)', fontWeight: 600 }}>↩ Menu</button>
            <button onClick={() => setFlagMode(f => !f)} style={{
              background: flagMode ? '#f44336' : 'var(--card)',
              color: flagMode ? '#fff' : 'var(--text)',
              border: '1.5px solid var(--border)', borderRadius: 8,
              padding: '6px 14px', fontWeight: 700
            }}>🚩 {flagMode ? 'ON' : 'OFF'}</button>
          </div>

          {(status === 'won' || status === 'lost') && (
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: status === 'won' ? 'var(--accent)' : '#f44336' }}>
                {status === 'won' ? '🎉 Hai vinto!' : '💥 Boom! Hai perso.'}
              </p>
              <button onClick={startGame} style={{ marginTop: 8, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 24px', fontWeight: 700 }}>Rigioca</button>
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cfg.cols}, ${cellSize}px)`,
            gap: 2,
            margin: '0 auto',
            width: 'fit-content'
          }}>
            {(board || Array.from({ length: cfg.rows }, () => Array(cfg.cols).fill(null))).map((row, r) =>
              row.map((cell, c) => {
                const revealed = cell?.revealed
                const flagged = cell?.flagged
                const mine = cell?.mine
                const adj = cell?.adjacent
                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleClick(r, c)}
                    onContextMenu={(e) => handleRightClick(e, r, c)}
                    style={{
                      width: cellSize, height: cellSize,
                      background: revealed ? (mine ? '#f44336' : 'var(--bg2)') : 'var(--card)',
                      border: revealed ? '1px solid var(--border)' : '2px solid var(--border)',
                      borderRadius: 4,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: cellSize * 0.45,
                      fontWeight: 700,
                      color: COLORS[adj] || 'var(--text)',
                      cursor: 'pointer'
                    }}
                  >
                    {flagged && !revealed ? '🚩' : revealed && mine ? '💣' : revealed && adj > 0 ? adj : ''}
                  </div>
                )
              })
            )}
          </div>
          <p style={{ textAlign: 'center', marginTop: 10, fontSize: '0.78rem', color: 'var(--accent2)' }}>
            📱 Tieni premuto o usa 🚩 per le bandiere
          </p>
        </>
      )}
    </div>
  )
}
