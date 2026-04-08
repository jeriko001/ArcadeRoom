import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const COLS = 10, ROWS = 20
const EMPTY = 0

const PIECES = [
  { shape: [[1,1,1,1]], color: '#00bcd4' },
  { shape: [[1,1],[1,1]], color: '#ffeb3b' },
  { shape: [[0,1,0],[1,1,1]], color: '#9c27b0' },
  { shape: [[1,0,0],[1,1,1]], color: '#ff9800' },
  { shape: [[0,0,1],[1,1,1]], color: '#2196f3' },
  { shape: [[0,1,1],[1,1,0]], color: '#4caf50' },
  { shape: [[1,1,0],[0,1,1]], color: '#f44336' },
]

const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY))

function rotate(matrix) {
  return matrix[0].map((_, i) => matrix.map(row => row[i]).reverse())
}

function isValid(board, shape, pos) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue
      const nr = pos.r + r, nc = pos.c + c
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false
      if (board[nr][nc]) return false
    }
  }
  return true
}

function place(board, shape, pos, color) {
  const next = board.map(r => [...r])
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) next[pos.r + r][pos.c + c] = color
  return next
}

function clearLines(board) {
  const kept = board.filter(row => row.some(c => !c))
  const cleared = ROWS - kept.length
  const newRows = Array.from({ length: cleared }, () => Array(COLS).fill(EMPTY))
  return { board: [...newRows, ...kept], cleared }
}

function randomPiece() {
  const p = PIECES[Math.floor(Math.random() * PIECES.length)]
  return { shape: p.shape, color: p.color }
}

export default function Tetris() {
  const nav = useNavigate()
  const [board, setBoard] = useState(emptyBoard())
  const [current, setCurrent] = useState(randomPiece())
  const [pos, setPos] = useState({ r: 0, c: 3 })
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [running, setRunning] = useState(true)
  const stateRef = useRef()
  stateRef.current = { board, current, pos, score, running, gameOver }

  const lock = useCallback(() => {
    const { board, current, pos, score } = stateRef.current
    const placed = place(board, current.shape, pos, current.color)
    const { board: cleared, cleared: lines } = clearLines(placed)
    const points = [0, 100, 300, 500, 800][lines] || 0
    setScore(score + points)
    const next = randomPiece()
    const nextPos = { r: 0, c: 3 }
    if (!isValid(cleared, next.shape, nextPos)) {
      setBoard(cleared)
      setGameOver(true)
      setRunning(false)
    } else {
      setBoard(cleared)
      setCurrent(next)
      setPos(nextPos)
    }
  }, [])

  const moveDown = useCallback(() => {
    const { board, current, pos } = stateRef.current
    const next = { r: pos.r + 1, c: pos.c }
    if (isValid(board, current.shape, next)) setPos(next)
    else lock()
  }, [lock])

  useEffect(() => {
    if (!running) return
    const id = setInterval(moveDown, 500)
    return () => clearInterval(id)
  }, [running, moveDown])

  useEffect(() => {
    const onKey = (e) => {
      if (!stateRef.current.running) return
      if (['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault()
      const { board, current, pos } = stateRef.current
      if (e.key === 'ArrowLeft') {
        const n = { r: pos.r, c: pos.c - 1 }
        if (isValid(board, current.shape, n)) setPos(n)
      } else if (e.key === 'ArrowRight') {
        const n = { r: pos.r, c: pos.c + 1 }
        if (isValid(board, current.shape, n)) setPos(n)
      } else if (e.key === 'ArrowDown') {
        moveDown()
      } else if (e.key === 'ArrowUp') {
        const rot = rotate(current.shape)
        if (isValid(board, rot, pos)) setCurrent({ ...current, shape: rot })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moveDown])

  const display = gameOver ? board : place(board, current.shape, pos, current.color)

  const reset = () => {
    setBoard(emptyBoard())
    setCurrent(randomPiece())
    setPos({ r: 0, c: 3 })
    setScore(0)
    setGameOver(false)
    setRunning(true)
  }

  // Touch controls
  const touchStart = useRef(null)
  const onTouchStart = (e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
  const onTouchEnd = (e) => {
    if (!touchStart.current || !stateRef.current.running) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    const { board, current, pos } = stateRef.current
    if (Math.abs(dx) > Math.abs(dy)) {
      const n = { r: pos.r, c: pos.c + (dx > 0 ? 1 : -1) }
      if (isValid(board, current.shape, n)) setPos(n)
    } else if (dy > 30) {
      moveDown()
    } else if (dy < -30) {
      const rot = rotate(current.shape)
      if (isValid(board, rot, pos)) setCurrent({ ...current, shape: rot })
    }
    touchStart.current = null
  }

  const cellSize = Math.min(Math.floor((window.innerWidth - 32) / COLS), 32)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px', userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => nav('/')} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)' }}>← Home</button>
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>Tetris</span>
        <span style={{ fontWeight: 700 }}>Score: {score}</span>
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, ${cellSize}px)`,
          gap: 1,
          background: 'var(--border)',
          border: '2px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
          margin: '0 auto',
          width: 'fit-content'
        }}
      >
        {display.map((row, r) =>
          row.map((cell, c) => (
            <div key={`${r}-${c}`} style={{
              width: cellSize,
              height: cellSize,
              background: cell || 'var(--bg2)',
            }} />
          ))
        )}
      </div>

      {gameOver && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent2)', marginBottom: 12 }}>Game Over! Score: {score}</p>
          <button onClick={reset} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 28px', fontWeight: 700, fontSize: '1rem' }}>Rigioca</button>
        </div>
      )}

      {!gameOver && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
          <button onClick={() => setRunning(r => !r)} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 20px', color: 'var(--text)', fontWeight: 600 }}>
            {running ? '⏸ Pausa' : '▶ Riprendi'}
          </button>
        </div>
      )}

      <p style={{ textAlign: 'center', marginTop: 12, fontSize: '0.78rem', color: 'var(--accent2)' }}>
        📱 Swipe ← → per muovere · ↑ per ruotare · ↓ per scendere
      </p>
    </div>
  )
}
