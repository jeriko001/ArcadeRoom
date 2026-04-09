import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const W = Math.min(window.innerWidth - 32, 400)
const H = W * 1.4

const PADDLE_W = W * 0.22
const PADDLE_H = H * 0.025
const BALL_R = W * 0.022
const PADDLE_Y = H - H * 0.08
const SPEED_BASE = W * 0.006

const LEVELS = [
  { rows: 3, cols: 8, speedMult: 1 },
  { rows: 4, cols: 8, speedMult: 1.15 },
  { rows: 5, cols: 9, speedMult: 1.3 },
  { rows: 5, cols: 9, speedMult: 1.45, hasArmored: true },
  { rows: 6, cols: 9, speedMult: 1.6, hasArmored: true },
]

const BRICK_COLORS = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db','#9b59b6']
const ARMORED_COLOR = '#7f8c8d'

function makeBricks(level) {
  const cfg = LEVELS[level]
  const brickW = (W - 24) / cfg.cols
  const brickH = H * 0.045
  const bricks = []
  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols; c++) {
      const armored = cfg.hasArmored && r === 0 && c % 2 === 0
      bricks.push({
        x: 12 + c * brickW,
        y: H * 0.12 + r * (brickH + 4),
        w: brickW - 4,
        h: brickH,
        alive: true,
        armored,
        hits: armored ? 2 : 1,
        color: armored ? ARMORED_COLOR : BRICK_COLORS[r % BRICK_COLORS.length]
      })
    }
  }
  return bricks
}

export default function Breakout() {
  const nav = useNavigate()
  const canvasRef = useRef(null)
  const state = useRef({})
  const animRef = useRef(null)
  const [screen, setScreen] = useState('menu') // menu, playing, paused, levelup, gameover, win
  const [level, setLevel] = useState(0)
  const [lives, setLives] = useState(3)
  const [score, setScore] = useState(0)
  const [displayLevel, setDisplayLevel] = useState(1)

  const initLevel = (lvl, currentLives, currentScore) => {
    const cfg = LEVELS[lvl]
    const speed = SPEED_BASE * cfg.speedMult
    state.current = {
      paddleX: W / 2 - PADDLE_W / 2,
      ballX: W / 2,
      ballY: PADDLE_Y - BALL_R - 2,
      ballDX: speed * (Math.random() > 0.5 ? 1 : -1),
      ballDY: -speed,
      bricks: makeBricks(lvl),
      lives: currentLives,
      score: currentScore,
      level: lvl,
      launched: false,
      running: true
    }
    setLives(currentLives)
    setScore(currentScore)
    setDisplayLevel(lvl + 1)
    setLevel(lvl)
    setScreen('playing')
  }

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const s = state.current
    ctx.clearRect(0, 0, W, H)

    // Background
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg2').trim() || '#1a1a1a'
    ctx.fillRect(0, 0, W, H)

    // Bricks
    s.bricks.forEach(b => {
      if (!b.alive) return
      ctx.fillStyle = b.hits === 2 ? ARMORED_COLOR : b.color
      ctx.beginPath()
      ctx.roundRect(b.x, b.y, b.w, b.h, 4)
      ctx.fill()
      if (b.hits === 2) {
        ctx.strokeStyle = '#bdc3c7'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })

    // Paddle
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#2d5a27'
    ctx.beginPath()
    ctx.roundRect(s.paddleX, PADDLE_Y, PADDLE_W, PADDLE_H, PADDLE_H / 2)
    ctx.fill()

    // Ball
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#f5f0e8'
    ctx.beginPath()
    ctx.arc(s.ballX, s.ballY, BALL_R, 0, Math.PI * 2)
    ctx.fill()
  }

  const gameLoop = () => {
    const s = state.current
    if (!s.running) return

    if (!s.launched) {
      s.ballX = s.paddleX + PADDLE_W / 2
      draw()
      animRef.current = requestAnimationFrame(gameLoop)
      return
    }

    // Move ball
    s.ballX += s.ballDX
    s.ballY += s.ballDY

    // Wall collisions
    if (s.ballX - BALL_R <= 0) { s.ballX = BALL_R; s.ballDX = Math.abs(s.ballDX) }
    if (s.ballX + BALL_R >= W) { s.ballX = W - BALL_R; s.ballDX = -Math.abs(s.ballDX) }
    if (s.ballY - BALL_R <= 0) { s.ballY = BALL_R; s.ballDY = Math.abs(s.ballDY) }

    // Paddle collision
    if (
      s.ballY + BALL_R >= PADDLE_Y &&
      s.ballY + BALL_R <= PADDLE_Y + PADDLE_H &&
      s.ballX >= s.paddleX - BALL_R &&
      s.ballX <= s.paddleX + PADDLE_W + BALL_R
    ) {
      s.ballDY = -Math.abs(s.ballDY)
      const hit = (s.ballX - (s.paddleX + PADDLE_W / 2)) / (PADDLE_W / 2)
      s.ballDX = hit * SPEED_BASE * LEVELS[s.level].speedMult * 1.5
    }

    // Ball out
    if (s.ballY - BALL_R > H) {
      s.lives -= 1
      setLives(s.lives)
      if (s.lives <= 0) {
        s.running = false
        setScreen('gameover')
        return
      }
      s.ballX = s.paddleX + PADDLE_W / 2
      s.ballY = PADDLE_Y - BALL_R - 2
      const speed = SPEED_BASE * LEVELS[s.level].speedMult
      s.ballDX = speed * (Math.random() > 0.5 ? 1 : -1)
      s.ballDY = -speed
      s.launched = false
    }

    // Brick collisions
    for (const b of s.bricks) {
      if (!b.alive) continue
      if (
        s.ballX + BALL_R > b.x && s.ballX - BALL_R < b.x + b.w &&
        s.ballY + BALL_R > b.y && s.ballY - BALL_R < b.y + b.h
      ) {
        b.hits -= 1
        if (b.hits <= 0) {
          b.alive = false
          s.score += b.armored ? 30 : 10
          setScore(s.score)
        }
        // Bounce direction
        const overlapL = s.ballX + BALL_R - b.x
        const overlapR = b.x + b.w - (s.ballX - BALL_R)
        const overlapT = s.ballY + BALL_R - b.y
        const overlapB = b.y + b.h - (s.ballY - BALL_R)
        const minH = Math.min(overlapL, overlapR)
        const minV = Math.min(overlapT, overlapB)
        if (minH < minV) s.ballDX *= -1
        else s.ballDY *= -1
        break
      }
    }

    // Level complete
    if (s.bricks.every(b => !b.alive)) {
      s.running = false
      if (s.level + 1 >= LEVELS.length) {
        setScreen('win')
      } else {
        setScreen('levelup')
      }
      return
    }

    draw()
    animRef.current = requestAnimationFrame(gameLoop)
  }

  useEffect(() => {
    if (screen === 'playing') {
      animRef.current = requestAnimationFrame(gameLoop)
    }
    return () => cancelAnimationFrame(animRef.current)
  }, [screen])

  // Mouse/touch paddle control
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onMove = (clientX) => {
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left - PADDLE_W / 2
      state.current.paddleX = Math.max(0, Math.min(W - PADDLE_W, x))
    }
    const onMouseMove = (e) => onMove(e.clientX)
    const onTouchMove = (e) => { e.preventDefault(); onMove(e.touches[0].clientX) }
    const onTap = () => { if (!state.current.launched) state.current.launched = true }
    const onKey = (e) => {
      const s = state.current
      if (e.key === ' ' || e.key === 'ArrowUp') { if (!s.launched) s.launched = true }
      if (e.key === 'ArrowLeft') s.paddleX = Math.max(0, s.paddleX - W * 0.05)
      if (e.key === 'ArrowRight') s.paddleX = Math.min(W - PADDLE_W, s.paddleX + W * 0.05)
    }
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('click', onTap)
    canvas.addEventListener('touchend', onTap)
    window.addEventListener('keydown', onKey)
    return () => {
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('click', onTap)
      canvas.removeEventListener('touchend', onTap)
      window.removeEventListener('keydown', onKey)
    }
  }, [screen])

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px', userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => { cancelAnimationFrame(animRef.current); nav('/') }} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)' }}>← Home</button>
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>Breakout</span>
        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>⭐ {score}</span>
      </div>

      {screen === 'menu' && (
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <p style={{ color: 'var(--accent2)', marginBottom: 8, fontWeight: 600 }}>5 livelli · 3 vite · mattoni corazzati</p>
          <p style={{ color: 'var(--accent2)', marginBottom: 24, fontSize: '0.82rem' }}>Muovi con mouse/touch · Tocca per lanciare</p>
          <button onClick={() => initLevel(0, 3, 0)} style={{ background: 'var(--btn-primary, var(--accent))', color: 'var(--btn-primary-text, #fff)', border: 'none', borderRadius: 10, padding: '12px 32px', fontWeight: 700, fontSize: '1rem' }}>Inizia</button>
        </div>
      )}

      {(screen === 'playing' || screen === 'paused') && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{'❤️'.repeat(lives)}</span>
            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent2)' }}>Livello {displayLevel}/{LEVELS.length}</span>
            <button onClick={() => {
              if (screen === 'playing') { state.current.running = false; cancelAnimationFrame(animRef.current); setScreen('paused') }
              else { state.current.running = true; setScreen('playing') }
            }} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '4px 12px', color: 'var(--text)', fontWeight: 600, fontSize: '0.85rem' }}>
              {screen === 'playing' ? '⏸' : '▶'}
            </button>
          </div>
          <canvas ref={canvasRef} width={W} height={H} style={{ display: 'block', borderRadius: 12, border: '2px solid var(--border)' }} />
          {!state.current.launched && screen === 'playing' && (
            <p style={{ textAlign: 'center', marginTop: 8, fontSize: '0.78rem', color: 'var(--accent2)' }}>📱 Tocca per lanciare la pallina</p>
          )}
        </>
      )}

      {screen === 'levelup' && (
        <div style={{ textAlign: 'center', marginTop: 60 }}>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', marginBottom: 8 }}>🎉 Livello completato!</p>
          <p style={{ color: 'var(--accent2)', marginBottom: 24 }}>Score: {score}</p>
          <button onClick={() => initLevel(level + 1, lives, score)} style={{ background: 'var(--btn-primary, var(--accent))', color: 'var(--btn-primary-text, #fff)', border: 'none', borderRadius: 10, padding: '12px 32px', fontWeight: 700, fontSize: '1rem' }}>
            Livello {level + 2} →
          </button>
        </div>
      )}

      {screen === 'gameover' && (
        <div style={{ textAlign: 'center', marginTop: 60 }}>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e74c3c', marginBottom: 8 }}>💔 Game Over</p>
          <p style={{ color: 'var(--accent2)', marginBottom: 24 }}>Score: {score}</p>
          <button onClick={() => initLevel(0, 3, 0)} style={{ background: 'var(--btn-primary, var(--accent))', color: 'var(--btn-primary-text, #fff)', border: 'none', borderRadius: 10, padding: '12px 32px', fontWeight: 700, fontSize: '1rem' }}>Rigioca</button>
        </div>
      )}

      {screen === 'win' && (
        <div style={{ textAlign: 'center', marginTop: 60 }}>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', marginBottom: 8 }}>🏆 Hai vinto!</p>
          <p style={{ color: 'var(--accent2)', marginBottom: 24 }}>Score finale: {score}</p>
          <button onClick={() => initLevel(0, 3, 0)} style={{ background: 'var(--btn-primary, var(--accent))', color: 'var(--btn-primary-text, #fff)', border: 'none', borderRadius: 10, padding: '12px 32px', fontWeight: 700, fontSize: '1rem' }}>Rigioca</button>
        </div>
      )}
    </div>
  )
}
