import React, { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const SIZE = 4

function emptyBoard() {
  return Array(SIZE).fill(null).map(() => Array(SIZE).fill(0))
}

function addRandom(board) {
  const empty = []
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (!board[r][c]) empty.push([r, c])
  if (!empty.length) return board
  const [r, c] = empty[Math.floor(Math.random() * empty.length)]
  const next = board.map(row => [...row])
  next[r][c] = Math.random() < 0.9 ? 2 : 4
  return next
}

function slideRow(row) {
  const nums = row.filter(Boolean)
  const merged = []
  let i = 0, score = 0
  while (i < nums.length) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      merged.push(nums[i] * 2)
      score += nums[i] * 2
      i += 2
    } else {
      merged.push(nums[i])
      i++
    }
  }
  while (merged.length < SIZE) merged.push(0)
  return { row: merged, score }
}

function move(board, dir) {
  let totalScore = 0
  let next = board.map(r => [...r])
  const transpose = b => b[0].map((_, c) => b.map(r => r[c]))
  const reverseRows = b => b.map(r => [...r].reverse())
  if (dir === 'left') {
    next = next.map(row => { const { row: r, score } = slideRow(row); totalScore += score; return r })
  } else if (dir === 'right') {
    next = reverseRows(next).map(row => { const { row: r, score } = slideRow(row); totalScore += score; return r })
    next = reverseRows(next)
  } else if (dir === 'up') {
    next = transpose(next)
    next = next.map(row => { const { row: r, score } = slideRow(row); totalScore += score; return r })
    next = transpose(next)
  } else if (dir === 'down') {
    next = transpose(next)
    next = reverseRows(next).map(row => { const { row: r, score } = slideRow(row); totalScore += score; return r })
    next = reverseRows(next)
    next = transpose(next)
  }
  const changed = JSON.stringify(next) !== JSON.stringify(board)
  return { board: next, score: totalScore, changed }
}

function isGameOver(board) {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (!board[r][c]) return false
      if (c + 1 < SIZE && board[r][c] === board[r][c + 1]) return false
      if (r + 1 < SIZE && board[r][c] === board[r + 1][c]) return false
    }
  return true
}

const COLORS = {
  0: ['var(--bg2)', 'transparent'],
  2: ['#eee4da', '#776e65'],
  4: ['#ede0c8', '#776e65'],
  8: ['#f2b179', '#f9f6f2'],
  16: ['#f59563', '#f9f6f2'],
  32: ['#f67c5f', '#f9f6f2'],
  64: ['#f65e3b', '#f9f6f2'],
  128: ['#edcf72', '#f9f6f2'],
  256: ['#edcc61', '#f9f6f2'],
  512: ['#edc850', '#f9f6f2'],
  1024: ['#edc53f', '#f9f6f2'],
  2048: ['#edc22e', '#f9f6f2'],
}

export default function Duemilaquarantotto() {
  const nav = useNavigate()
  const [board, setBoard] = useState(null)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => parseInt(localStorage.getItem('2048-best') || '0'))
  const [gameOver, setGameOver] = useState(false)
  const stateRef = useRef()
  stateRef.current = { board, score, gameOver }

  const startGame = () => {
    let b = emptyBoard()
    b = addRandom(b)
    b = addRandom(b)
    setBoard(b)
    setScore(0)
    setGameOver(false)
  }

  const doMove = useCallback((dir) => {
    const { board, score, gameOver } = stateRef.current
    if (!board || gameOver) return
    const { board: next, score: gained, changed } = move(board, dir)
    if (!changed) return
    const final = addRandom(next)
    const newScore = score + gained
    setBoard(final)
    setScore(newScore)
    if (newScore > parseInt(localStorage.getItem('2048-best') || '0')) {
      localStorage.setItem('2048-best', newScore)
      setBest(newScore)
    }
    if (isGameOver(final)) setGameOver(true)
  }, [])

  React.useEffect(() => {
    const onKey = (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault()
      if (e.key === 'ArrowLeft') doMove('left')
      else if (e.key === 'ArrowRight') doMove('right')
      else if (e.key === 'ArrowUp') doMove('up')
      else if (e.key === 'ArrowDown') doMove('down')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doMove])

  const touchStart = useRef(null)
  const onTouchStart = (e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
  const onTouchEnd = (e) => {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 20 ? 'right' : 'left')
    else doMove(dy > 20 ? 'down' : 'up')
    touchStart.current = null
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px', userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => nav('/')} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)' }}>← Home</button>
        <span style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--accent)' }}>2048</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '4px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--accent2)', fontWeight: 700 }}>SCORE</div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{score}</div>
          </div>
          <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '4px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--accent2)', fontWeight: 700 }}>BEST</div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{best}</div>
          </div>
        </div>
      </div>

      {!board && (
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <p style={{ color: 'var(--accent2)', marginBottom: 20, fontWeight: 600 }}>Unisci i numeri e raggiungi il 2048!</p>
          <button onClick={startGame} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 32px', fontWeight: 700, fontSize: '1rem' }}>Inizia</button>
        </div>
      )}

      {board && (
        <>
          {gameOver && (
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f44336' }}>Game Over!</p>
              <button onClick={startGame} style={{ marginTop: 8, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 24px', fontWeight: 700 }}>Rigioca</button>
            </div>
          )}
          <div
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
              background: 'var(--border)',
              padding: 8,
              borderRadius: 12,
              margin: '0 auto',
              width: '100%',
              maxWidth: 400,
              boxSizing: 'border-box'
            }}
          >
            {board.map((row, r) =>
              row.map((val, c) => {
                const [bg, color] = COLORS[val] || ['#3c3a32', '#f9f6f2']
                return (
                  <div key={`${r}-${c}`} style={{
                    aspectRatio: '1',
                    background: bg,
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: val >= 1024 ? '1rem' : val >= 128 ? '1.2rem' : '1.5rem',
                    color
                  }}>{val || ''}</div>
                )
              })
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
            <button onClick={startGame} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 20px', fontWeight: 600, color: 'var(--text)' }}>↩ Nuova partita</button>
          </div>
          <p style={{ textAlign: 'center', marginTop: 10, fontSize: '0.78rem', color: 'var(--accent2)' }}>📱 Swipe per muovere i numeri</p>
        </>
      )}
    </div>
  )
}
