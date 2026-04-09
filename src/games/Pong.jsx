import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { ref, set, onValue, remove, get } from 'firebase/database'

const W = Math.min(window.innerWidth - 32, 400)
const H = W * 1.6
const PADDLE_W = W * 0.04
const PADDLE_H = H * 0.12
const BALL_R = W * 0.025
const SPEED = W * 0.007
const WIN_SCORE = 10

function generateCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase()
}

function initGameState() {
  return {
    ballX: W / 2, ballY: H / 2,
    ballDX: SPEED * (Math.random() > 0.5 ? 1 : -1),
    ballDY: SPEED * (Math.random() > 0.5 ? 1 : -1),
    p1Y: H / 2 - PADDLE_H / 2,
    p2Y: H / 2 - PADDLE_H / 2,
    score1: 0, score2: 0,
    running: true, winner: null
  }
}

export default function Pong() {
  const nav = useNavigate()
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  const animRef = useRef(null)
  const [screen, setScreen] = useState('menu')
  const [roomCode, setRoomCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [mySymbol, setMySymbol] = useState(null)
  const [error, setError] = useState('')
  const [gameData, setGameData] = useState(null)

  const roomRef = roomCode ? ref(db, `pong/${roomCode}`) : null

  useEffect(() => {
    if (!roomCode || screen === 'menu') return
    const unsub = onValue(ref(db, `pong/${roomCode}`), snap => {
      const data = snap.val()
      if (!data) return
      setGameData(data)
      if (data.players >= 2 && screen === 'waiting') setScreen('playing')
    })
    return () => unsub()
  }, [roomCode, screen])

  const createRoom = async () => {
    const code = generateCode()
    setRoomCode(code)
    setMySymbol('p1')
    await set(ref(db, `pong/${code}`), { players: 1, ...initGameState() })
    setScreen('waiting')
  }

  const joinRoom = async () => {
    const code = inputCode.toUpperCase().trim()
    if (!code) return
    const snap = await new Promise(res => onValue(ref(db, `pong/${code}`), res, { onlyOnce: true }))
    const data = snap.val()
    if (!data) { setError('Stanza non trovata'); return }
    if (data.players >= 2) { setError('Stanza piena'); return }
    setRoomCode(code)
    setMySymbol('p2')
    await set(ref(db, `pong/${code}/players`), 2)
    setScreen('playing')
  }

  const leaveRoom = async () => {
    if (roomCode) await remove(ref(db, `pong/${roomCode}`))
    setScreen('menu'); setRoomCode(''); setInputCode('')
    setMySymbol(null); setGameData(null); setError('')
    cancelAnimationFrame(animRef.current)
  }

  // Game loop — solo p1 gestisce la fisica e scrive su Firebase
  useEffect(() => {
    if (screen !== 'playing' || mySymbol !== 'p1') return
    const loop = async () => {
      const snap = await get(ref(db, `pong/${roomCode}`))
      const s = snap.val()
      if (!s || !s.running) return

      let { ballX, ballY, ballDX, ballDY, p1Y, p2Y, score1, score2 } = s
      ballX += ballDX
      ballY += ballDY

      // Top/bottom wall
      if (ballY - BALL_R <= 0) { ballY = BALL_R; ballDY = Math.abs(ballDY) }
      if (ballY + BALL_R >= H) { ballY = H - BALL_R; ballDY = -Math.abs(ballDY) }

      // P1 paddle (left)
      if (ballX - BALL_R <= PADDLE_W + 8 &&
        ballY >= p1Y && ballY <= p1Y + PADDLE_H) {
        ballX = PADDLE_W + 8 + BALL_R
        ballDX = Math.abs(ballDX)
        const hit = (ballY - (p1Y + PADDLE_H / 2)) / (PADDLE_H / 2)
        ballDY = hit * SPEED * 1.5
      }

      // P2 paddle (right)
      if (ballX + BALL_R >= W - PADDLE_W - 8 &&
        ballY >= p2Y && ballY <= p2Y + PADDLE_H) {
        ballX = W - PADDLE_W - 8 - BALL_R
        ballDX = -Math.abs(ballDX)
        const hit = (ballY - (p2Y + PADDLE_H / 2)) / (PADDLE_H / 2)
        ballDY = hit * SPEED * 1.5
      }

      // Score
      let winner = null
      if (ballX - BALL_R <= 0) {
        score2 += 1; ballX = W / 2; ballY = H / 2
        ballDX = SPEED * (Math.random() > 0.5 ? 1 : -1)
        ballDY = SPEED * (Math.random() > 0.5 ? 1 : -1)
        if (score2 >= WIN_SCORE) winner = 'p2'
      }
      if (ballX + BALL_R >= W) {
        score1 += 1; ballX = W / 2; ballY = H / 2
        ballDX = SPEED * (Math.random() > 0.5 ? 1 : -1)
        ballDY = SPEED * (Math.random() > 0.5 ? 1 : -1)
        if (score1 >= WIN_SCORE) winner = 'p1'
      }

      await set(ref(db, `pong/${roomCode}`), {
        ...s, ballX, ballY, ballDX, ballDY, score1, score2,
        winner, running: !winner
      })
    }
    const id = setInterval(loop, 16)
    return () => clearInterval(id)
  }, [screen, mySymbol, roomCode])

  // Draw
  useEffect(() => {
    if (screen !== 'playing' || !gameData) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const s = gameData
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg2').trim()
    ctx.fillRect(0, 0, W, H)

    // Center line
    ctx.setLineDash([8, 8])
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border').trim()
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke()
    ctx.setLineDash([])

    // Score
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim()
    ctx.font = `bold ${W * 0.1}px system-ui`
    ctx.textAlign = 'center'
    ctx.fillText(s.score1, W * 0.25, H * 0.1)
    ctx.fillText(s.score2, W * 0.75, H * 0.1)

    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    const accent2 = getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim()

    // Paddles
    ctx.fillStyle = mySymbol === 'p1' ? accent : accent2
    ctx.beginPath(); ctx.roundRect(8, s.p1Y, PADDLE_W, PADDLE_H, 4); ctx.fill()
    ctx.fillStyle = mySymbol === 'p2' ? accent : accent2
    ctx.beginPath(); ctx.roundRect(W - PADDLE_W - 8, s.p2Y, PADDLE_W, PADDLE_H, 4); ctx.fill()

    // Ball
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim()
    ctx.beginPath(); ctx.arc(s.ballX, s.ballY, BALL_R, 0, Math.PI * 2); ctx.fill()
  }, [gameData, mySymbol])

  // Paddle control
  useEffect(() => {
    if (screen !== 'playing') return
    const canvas = canvasRef.current
    if (!canvas) return
    const paddleKey = mySymbol === 'p1' ? 'p1Y' : 'p2Y'

    const updatePaddle = async (newY) => {
      newY = Math.max(0, Math.min(H - PADDLE_H, newY))
      await set(ref(db, `pong/${roomCode}/${paddleKey}`), newY)
    }

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      updatePaddle(e.clientY - rect.top - PADDLE_H / 2)
    }
    const onTouchMove = (e) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      updatePaddle(e.touches[0].clientY - rect.top - PADDLE_H / 2)
    }
    const onKey = (e) => {
      if (!gameData) return
      const paddleY = mySymbol === 'p1' ? gameData.p1Y : gameData.p2Y
      if (e.key === 'ArrowUp') updatePaddle(paddleY - H * 0.05)
      if (e.key === 'ArrowDown') updatePaddle(paddleY + H * 0.05)
    }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKey)
    }
  }, [screen, mySymbol, roomCode, gameData])

  const resetGame = async () => {
    await set(ref(db, `pong/${roomCode}`), { players: 2, ...initGameState() })
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px', userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={() => { leaveRoom(); nav('/') }} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)' }}>← Home</button>
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>Pong</span>
        <div />
      </div>

      {screen === 'menu' && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 20, color: 'var(--accent2)', fontWeight: 600 }}>Primo a 10 punti vince!</p>
          <button onClick={createRoom} style={{ display: 'block', width: '100%', background: 'var(--btn-primary, var(--accent))', color: 'var(--btn-primary-text, #fff)', border: 'none', borderRadius: 12, padding: '14px', fontWeight: 700, fontSize: '1rem', marginBottom: 12 }}>
            Crea Stanza
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={inputCode} onChange={e => { setInputCode(e.target.value); setError('') }}
              placeholder="Codice stanza..." maxLength={5}
              style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: '1rem', textTransform: 'uppercase' }}
            />
            <button onClick={joinRoom} style={{ background: 'var(--accent2)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', fontWeight: 700 }}>Entra</button>
          </div>
          {error && <p style={{ color: '#f44336', marginTop: 8, fontWeight: 600 }}>{error}</p>}
        </div>
      )}

      {screen === 'waiting' && (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <p style={{ color: 'var(--accent2)', marginBottom: 12 }}>In attesa dell'avversario...</p>
          <div style={{ background: 'var(--card)', border: '2px solid var(--border)', borderRadius: 16, padding: '24px', display: 'inline-block' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--accent2)', marginBottom: 4 }}>Codice stanza</p>
            <p style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '0.15em', color: 'var(--accent)' }}>{roomCode}</p>
          </div>
          <button onClick={leaveRoom} style={{ display: 'block', margin: '20px auto 0', background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 20px', color: 'var(--text)', fontWeight: 600 }}>Annulla</button>
        </div>
      )}

      {screen === 'playing' && (
        <>
          {gameData?.winner && (
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <p style={{ fontWeight: 700, fontSize: '1.1rem', color: gameData.winner === mySymbol ? 'var(--accent)' : '#e74c3c' }}>
                {gameData.winner === mySymbol ? '🎉 Hai vinto!' : '😢 Hai perso'}
              </p>
              <button onClick={resetGame} style={{ marginTop: 8, background: 'var(--btn-primary, var(--accent))', color: 'var(--btn-primary-text, #fff)', border: 'none', borderRadius: 10, padding: '8px 24px', fontWeight: 700 }}>Rivincita</button>
            </div>
          )}
          <canvas ref={canvasRef} width={W} height={H} style={{ display: 'block', borderRadius: 12, border: '2px solid var(--border)', margin: '0 auto' }} />
          <p style={{ textAlign: 'center', marginTop: 8, fontSize: '0.78rem', color: 'var(--accent2)' }}>
            {mySymbol === 'p1' ? '⬅️ Sei a sinistra' : '➡️ Sei a destra'} · Muovi con mouse/touch/↑↓
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
            <button onClick={leaveRoom} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '8px 20px', fontWeight: 600, color: 'var(--text)' }}>Esci</button>
          </div>
        </>
      )}
    </div>
  )
}
