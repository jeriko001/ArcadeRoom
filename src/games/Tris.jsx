import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { ref, set, onValue, remove } from 'firebase/database'

function checkWinner(board) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ]
  for (const [a,b,c] of lines)
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
  if (board.every(Boolean)) return 'draw'
  return null
}

function generateCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase()
}

export default function Tris() {
  const nav = useNavigate()
  const [screen, setScreen] = useState('menu') // menu, waiting, playing
  const [roomCode, setRoomCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [mySymbol, setMySymbol] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [error, setError] = useState('')

  const roomRef = roomCode ? ref(db, `tris/${roomCode}`) : null

  useEffect(() => {
    if (!roomCode || screen === 'menu') return
    const unsub = onValue(ref(db, `tris/${roomCode}`), snap => {
      const data = snap.val()
      if (!data) return
      setGameState(data)
      if (data.players === 2) setScreen('playing')
    })
    return () => unsub()
  }, [roomCode, screen])

  const createRoom = async () => {
    const code = generateCode()
    setRoomCode(code)
    setMySymbol('X')
    await set(ref(db, `tris/${code}`), {
      board: Array(9).fill(''),
      turn: 'X',
      players: 1,
      winner: null
    })
    setScreen('waiting')
  }

  const joinRoom = async () => {
    const code = inputCode.toUpperCase().trim()
    if (!code) return
    const snap = await new Promise(res => onValue(ref(db, `tris/${code}`), res, { onlyOnce: true }))
    const data = snap.val()
    if (!data) { setError('Stanza non trovata'); return }
    if (data.players >= 2) { setError('Stanza piena'); return }
    setRoomCode(code)
    setMySymbol('O')
    await set(ref(db, `tris/${code}/players`), 2)
    setScreen('playing')
  }

  const handleMove = async (i) => {
    if (!gameState || gameState.turn !== mySymbol) return
    if (gameState.board[i] || gameState.winner) return
    const newBoard = [...gameState.board]
    newBoard[i] = mySymbol
    const winner = checkWinner(newBoard)
    await set(roomRef, {
      ...gameState,
      board: newBoard,
      turn: mySymbol === 'X' ? 'O' : 'X',
      winner: winner || null
    })
  }

  const resetGame = async () => {
    await set(roomRef, { board: Array(9).fill(''), turn: 'X', players: 2, winner: null })
  }

  const leaveRoom = async () => {
    if (roomRef) await remove(roomRef)
    setScreen('menu')
    setRoomCode('')
    setInputCode('')
    setMySymbol(null)
    setGameState(null)
  }

  const isMyTurn = gameState?.turn === mySymbol
  const winner = gameState ? checkWinner(gameState.board) : null

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => { leaveRoom(); nav('/') }} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)' }}>← Home</button>
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>Tris</span>
        <div />
      </div>

      {screen === 'menu' && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 20, color: 'var(--accent2)', fontWeight: 600 }}>Gioca con un amico online</p>
          <button onClick={createRoom} style={{ display: 'block', width: '100%', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontWeight: 700, fontSize: '1rem', marginBottom: 12 }}>
            Crea Stanza
          </button>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              value={inputCode}
              onChange={e => { setInputCode(e.target.value); setError('') }}
              placeholder="Codice stanza..."
              maxLength={5}
              style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: '1rem', textTransform: 'uppercase' }}
            />
            <button onClick={joinRoom} style={{ background: 'var(--accent2)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', fontWeight: 700 }}>Entra</button>
          </div>
          {error && <p style={{ color: '#f44336', marginTop: 8, fontWeight: 600 }}>{error}</p>}
        </div>
      )}

      {screen === 'waiting' && (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <p style={{ fontSize: '1rem', color: 'var(--accent2)', marginBottom: 12 }}>In attesa dell'avversario...</p>
          <div style={{ background: 'var(--card)', border: '2px solid var(--border)', borderRadius: 16, padding: '24px', display: 'inline-block' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--accent2)', marginBottom: 4 }}>Codice stanza</p>
            <p style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '0.15em', color: 'var(--accent)' }}>{roomCode}</p>
          </div>
          <p style={{ marginTop: 12, fontSize: '0.82rem', color: 'var(--accent2)' }}>Condividi questo codice con l'amico</p>
          <button onClick={leaveRoom} style={{ marginTop: 20, background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 20px', color: 'var(--text)', fontWeight: 600 }}>Annulla</button>
        </div>
      )}

      {screen === 'playing' && gameState && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: 'var(--accent2)', fontSize: '0.85rem' }}>Tu: <b style={{ color: 'var(--accent)' }}>{mySymbol}</b></span>
            <span style={{ fontWeight: 700, color: winner ? (winner === mySymbol ? 'var(--accent)' : '#f44336') : isMyTurn ? 'var(--accent)' : 'var(--accent2)' }}>
              {winner ? (winner === 'draw' ? 'Pareggio!' : winner === mySymbol ? '🎉 Hai vinto!' : '😢 Hai perso') : isMyTurn ? '🟢 Tocca a te' : '⏳ Attendi...'}
            </span>
            <span style={{ fontWeight: 600, color: 'var(--accent2)', fontSize: '0.85rem' }}>Codice: {roomCode}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 280, margin: '0 auto' }}>
            {gameState.board.map((cell, i) => (
              <div key={i} onClick={() => handleMove(i)} style={{
                aspectRatio: '1',
                background: 'var(--card)',
                border: '2px solid var(--border)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.5rem', fontWeight: 800,
                color: cell === 'X' ? 'var(--accent)' : '#f44336',
                cursor: (!cell && isMyTurn && !winner) ? 'pointer' : 'default',
                opacity: (!cell && isMyTurn && !winner) ? 1 : 0.8
              }}>{cell}</div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
            {winner && <button onClick={resetGame} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700 }}>Rivincita</button>}
            <button onClick={leaveRoom} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 24px', fontWeight: 600, color: 'var(--text)' }}>Esci</button>
          </div>
        </>
      )}
    </div>
  )
}
