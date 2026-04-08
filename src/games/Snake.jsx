import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const COLS = 20, ROWS = 20
const CELL = Math.min(Math.floor((typeof window !== 'undefined' ? window.innerWidth - 32 : 360) / 20), 22)

const DIR = { UP: [0,-1], DOWN: [0,1], LEFT: [-1,0], RIGHT: [1,0] }

function randomFood(snake) {
  let pos
  do {
    pos = [Math.floor(Math.random() * COLS), Math.floor(Math.random() * ROWS)]
  } while (snake.some(s => s[0] === pos[0] && s[1] === pos[1]))
  return pos
}

export default function Snake() {
  const nav = useNavigate()
  const [snake, setSnake] = useState([[10,10],[9,10],[8,10]])
  const [food, setFood] = useState([15,10])
  const [dir, setDir] = useState(DIR.RIGHT)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [running, setRunning] = useState(false)
  const stateRef = useRef()
  stateRef.current = { snake, food, dir, score, running, gameOver }
  const nextDir = useRef(DIR.RIGHT)

  const reset = () => {
    const s = [[10,10],[9,10],[8,10]]
    setSnake(s)
    setFood(randomFood(s))
    setDir(DIR.RIGHT)
    nextDir.current = DIR.RIGHT
    setScore(0)
    setGameOver(false)
    setRunning(true)
  }

  const tick = useCallback(() => {
    const { snake, food, score } = stateRef.current
    const d = nextDir.current
    const head = [snake[0][0] + d[0], snake[0][1] + d[1]]
    if (head[0] < 0 || head[0] >= COLS || head[1] < 0 || head[1] >= ROWS || snake.some(s => s[0] === head[0] && s[1] === head[1])) {
      setGameOver(true); setRunning(false); return
    }
    const ate = head[0] === food[0] && head[1] === food[1]
    const newSnake = [head, ...snake.slice(0, ate ? undefined : -1)]
    if (ate) { setFood(randomFood(newSnake)); setScore(score + 10) }
    setSnake(newSnake)
    setDir(d)
  }, [])

  useEffect(() => {
    if (!running) return
    const id = setInterval(tick, 150)
    return () => clearInterval(id)
  }, [running, tick])

  useEffect(() => {
    const onKey = (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault()
      const { dir } = stateRef.current
      if (e.key === 'ArrowUp' && dir !== DIR.DOWN) nextDir.current = DIR.UP
      else if (e.key === 'ArrowDown' && dir !== DIR.UP) nextDir.current = DIR.DOWN
      else if (e.key === 'ArrowLeft' && dir !== DIR.RIGHT) nextDir.current = DIR.LEFT
      else if (e.key === 'ArrowRight' && dir !== DIR.LEFT) nextDir.current = DIR.RIGHT
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Touch swipe
  const touchStart = useRef(null)
  const onTouchStart = (e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
  const onTouchEnd = (e) => {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    const { dir } = stateRef.current
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20 && dir !== DIR.LEFT) nextDir.current = DIR.RIGHT
      else if (dx < -20 && dir !== DIR.RIGHT) nextDir.current = DIR.LEFT
    } else {
      if (dy > 20 && dir !== DIR.UP) nextDir.current = DIR.DOWN
      else if (dy < -20 && dir !== DIR.DOWN) nextDir.current = DIR.UP
    }
    touchStart.current = null
  }

  const snakeSet = new Set(snake.map(s => `${s[0]},${s[1]}`))

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px', userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => nav('/')} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)' }}>← Home</button>
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>Snake</span>
        <span style={{ fontWeight: 700 }}>Score: {score}</span>
      </div>

      {!running && !gameOver && (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <button onClick={reset} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 32px', fontWeight: 700, fontSize: '1rem' }}>Inizia</button>
        </div>
      )}

      {(running || gameOver) && (
        <>
          {gameOver && (
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f44336' }}>Game Over! Score: {score}</p>
              <button onClick={reset} style={{ marginTop: 8, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 24px', fontWeight: 700 }}>Rigioca</button>
            </div>
          )}
          <div
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`,
              gap: 1,
              background: 'var(--border)',
              border: '2px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden',
              margin: '0 auto',
              width: 'fit-content'
            }}
          >
            {Array.from({ length: ROWS }, (_, y) =>
              Array.from({ length: COLS }, (_, x) => {
                const isHead = snake[0][0] === x && snake[0][1] === y
                const isSnake = snakeSet.has(`${x},${y}`)
                const isFood = food[0] === x && food[1] === y
                return (
                  <div key={`${x},${y}`} style={{
                    width: CELL, height: CELL,
                    background: isHead ? 'var(--accent)' : isSnake ? 'var(--accent2)' : isFood ? '#f44336' : 'var(--bg2)',
                    borderRadius: isHead ? 3 : 0
                  }} />
                )
              })
            )}
          </div>
          {running && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
              <button onClick={() => setRunning(r => !r)} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 20px', color: 'var(--text)', fontWeight: 600 }}>⏸ Pausa</button>
            </div>
          )}
          {!running && !gameOver && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
              <button onClick={() => setRunning(true)} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 20px', color: 'var(--text)', fontWeight: 600 }}>▶ Riprendi</button>
            </div>
          )}
          <p style={{ textAlign: 'center', marginTop: 10, fontSize: '0.78rem', color: 'var(--accent2)' }}>📱 Swipe per cambiare direzione</p>
        </>
      )}
    </div>
  )
}
