import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { ref, set, onValue, remove } from 'firebase/database'

const ROWS = 6, COLS = 7

function emptyBoard() {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
}

function checkWinner(board) {
  // Orizzontale
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      if (board[r][c] && [1,2,3].every(i => board[r][c+i] === board[r][c])) return board[r][c]
  // Verticale
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] && [1,2,3].every(i => board[r+i][c] === board[r][c])) return board[r][c]
  // Diagonale ↘
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c <= COLS - 4; c++)
      if (board[r][c] && [1,2,3].every(i => board[r+i][c+i] === board[r][c])) return board[r][c]
  // Diagonale ↙
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 3; c < COLS; c++)
      if (board[r][c] && [1,2,3].every(i => board[r+i][c-i] === board[r][c])) return board[r][c]
  // Pareggio
  if (board[0].every(c => c !== null)) return 'draw'
  return null
}

function dropPiece(board, col, symbol) {
  const next = board.map(r => [...r])
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!next[r][col]) { next[r][col] = symbol; return next }
  }
  return null // colonna piena
}

function generateCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase()
}

export default function Forza4() {
  const nav = useNavigate()
  const [screen, setScreen] = useState('menu')
  const [roomCode, setRoomCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [mySymbol, setMySymbol] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [error, setError] = useState('')
  const [hoverCol, setHoverCol] = useState(null)

  useEffect(() => {
    if (!roomCode || screen === 'menu') return
    const unsub = onValue(ref(db, `forza4/${roomCode}`), snap => {
      const data = snap.val()
      if (!data) return
      setGameState(data)
      if (data.players >= 2 && screen === 'waiting') setScreen('playing')
    })
    return () => unsub()
  }, [roomCode, screen])

  const createRoom = async () => {
    const code = generateCode()
    setRoomCode(code)
    setMySymbol('R')
    await set(ref(db, `forza4/${code}`), {
      board: emptyBoard(),
      turn: 'R',
      players: 1,
      winner: null
    })
    setScreen('waiting')
  }

  const joinRoom = async () => {
    const code = inputCode.toUpperCase().trim()
    if (!code) return
    const snap = await new Promise(res => onValue(ref(db, `forza4/${code}`), res, { onlyOnce: true }))
    const data = snap.val()
    if (!data) { setError('Stanza non trovata'); return }
    if (data.players >= 2) { setError('Stanza piena'); return }
    setRoomCode(code)
    setMySymbol('Y')
    await set(ref(db, `forza4/${code}/players`), 2)
    setScreen('playing')
  }

  const handleMove = async (col) => {
    if (!gameState || gameState.turn !== mySymbol || gameState.winner) return
    const next = dropPiece(gameState.board, col, mySymbol)
    if (!next) return
    const winner = checkWinner(next)
    await set(ref(db, `forza4/${roomCode}`), {
      ...gameState,
      board: next,
      turn: mySymbol === 'R' ? 'Y' : 'R',
      winner: winner || null
    })
  }

  const resetGame = async () => {
    await set(ref(db, `forza4/${roomCode}`), {
      board: emptyBoard(),
      turn: 'R',
      players: 2,
      winner: null
    })
  }

  const leaveRoom = async () => {
    if (roomCode) await remove(ref(db, `forza4/${roomCode}`))
    setScreen('menu'); setRoomCode(''); setInputCode('')
    setMySymbol(null); setGameState(null); setError('')
  }

  const isMyTurn = gameState?.turn === mySymbol
  const winner = gameState?.winner

  const cellSize = Math.min(Math.floor((window.innerWidth - 32) / COLS), 52)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px', userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => { leaveRoom(); nav('/') }} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)' }}>← Home</button>
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>Forza 4</span>
        <div />
      </div>

      {screen === 'menu' && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 20, color: 'var(--accent2)', fontWeight: 600 }}>Sfida un amico online</p>
          <button onClick={createRoom} style={{ display: 'block', width: '100%', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontWeight: 700, fontSize: '1rem', marginBottom: 12 }}>
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

      {screen === 'playing' && gameState && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
              Tu: <span style={{ color: mySymbol === 'R' ? '#e74c3c' : '#f1c40f', fontWeight: 800 }}>●</span>
            </span>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: winner ? 'var(--accent)' : isMyTurn ? 'var(--accent)' : 'var(--accent2)' }}>
              {winner
                ? winner === 'draw' ? 'Pareggio!'
                : winner === mySymbol ? '🎉 Hai vinto!' : '😢 Hai perso'
                : isMyTurn ? '🟢 Tocca a te' : '⏳ Attendi...'}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--accent2)' }}>{roomCode}</span>
          </div>

          {/* Indicatore colonna hover */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, ${cellSize}px)`,
            gap: 4,
            margin: '0 auto',
            width: 'fit-content',
            marginBottom: 4
          }}>
            {Array.from({ length: COLS }, (_, c) => (
              <div key={c} style={{
                width: cellSize, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {hoverCol === c && isMyTurn && !winner && (
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: mySymbol === 'R' ? '#e74c3c' : '#f1c40f' }} />
                )}
              </div>
            ))}
          </div>

          {/* Board */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, ${cellSize}px)`,
            gap: 4,
            background: 'var(--accent)',
            padding: 6,
            borderRadius: 12,
            margin: '0 auto',
            width: 'fit-content'
          }}>
            {gameState.board.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleMove(c)}
                  onMouseEnter={() => setHoverCol(c)}
                  onMouseLeave={() => setHoverCol(null)}
                  style={{
                    width: cellSize, height: cellSize,
                    borderRadius: '50%',
                    background: cell === 'R' ? '#e74c3c' : cell === 'Y' ? '#f1c40f' : 'var(--bg)',
                    cursor: (isMyTurn && !winner && !cell) ? 'pointer' : 'default',
                    transition: 'background 0.1s'
                  }}
                />
              ))
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center' }}>
            {winner && <button onClick={resetGame} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700 }}>Rivincita</button>}
            <button onClick={leaveRoom} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 24px', fontWeight: 600, color: 'var(--text)' }}>Esci</button>
          </div>
        </>
      )}
    </div>
  )
}
