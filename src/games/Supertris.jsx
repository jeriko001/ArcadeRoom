import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { ref, set, onValue, remove } from 'firebase/database'

function checkWinner(board) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
  for (const [a,b,c] of lines)
    if (board[a] && board[a] !== 'draw' && board[a] === board[b] && board[a] === board[c]) return board[a]
  if (board.every(v => v !== null)) return 'draw'
  return null
}

function generateCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase()
}

const initState = () => ({
  macroBoard: Array(9).fill(null),
  boards: Array(9).fill(null).map(() => Array(9).fill('')),
  turn: 'X',
  nextMacro: null,
  winner: null,
  players: 1
})

export default function Supertris() {
  const nav = useNavigate()
  const [screen, setScreen] = useState('menu')
  const [roomCode, setRoomCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [mySymbol, setMySymbol] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!roomCode || screen === 'menu') return
    const unsub = onValue(ref(db, `supertris/${roomCode}`), snap => {
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
    setMySymbol('X')
    await set(ref(db, `supertris/${code}`), initState())
    setScreen('waiting')
  }

  const joinRoom = async () => {
    const code = inputCode.toUpperCase().trim()
    if (!code) return
    const snap = await new Promise(res => onValue(ref(db, `supertris/${code}`), res, { onlyOnce: true }))
    const data = snap.val()
    if (!data) { setError('Stanza non trovata'); return }
    if (data.players >= 2) { setError('Stanza piena'); return }
    setRoomCode(code)
    setMySymbol('O')
    await set(ref(db, `supertris/${code}/players`), 2)
    setScreen('playing')
  }

  const handleMove = async (macroIdx, cellIdx) => {
    if (!gameState || gameState.turn !== mySymbol) return
    if (gameState.winner) return
    if (gameState.nextMacro !== null && gameState.nextMacro !== macroIdx) return
    if (gameState.macroBoard[macroIdx] !== null) return
    if (gameState.boards[macroIdx][cellIdx]) return

    const newBoards = gameState.boards.map(b => [...b])
    newBoards[macroIdx][cellIdx] = mySymbol

    const newMacroBoard = [...gameState.macroBoard]
    const miniWinner = checkWinner(newBoards[macroIdx])
    if (miniWinner) newMacroBoard[macroIdx] = miniWinner

    const macroWinner = checkWinner(newMacroBoard)

    let nextMacro = cellIdx
    if (newMacroBoard[cellIdx] !== null) nextMacro = null

    await set(ref(db, `supertris/${roomCode}`), {
      ...gameState,
      boards: newBoards,
      macroBoard: newMacroBoard,
      turn: mySymbol === 'X' ? 'O' : 'X',
      nextMacro,
      winner: macroWinner || null
    })
  }

  const leaveRoom = async () => {
    if (roomCode) await remove(ref(db, `supertris/${roomCode}`))
    setScreen('menu'); setRoomCode(''); setInputCode(''); setMySymbol(null); setGameState(null)
  }

  const resetGame = async () => {
    const s = initState(); s.players = 2
    await set(ref(db, `supertris/${roomCode}`), s)
  }

  const isMyTurn = gameState?.turn === mySymbol

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={() => { leaveRoom(); nav('/') }} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)' }}>← Home</button>
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>Supertris</span>
        <div />
      </div>

      {screen === 'menu' && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 8, color: 'var(--accent2)', fontWeight: 600 }}>Tris 3×3 dentro un Tris 3×3</p>
          <p style={{ marginBottom: 20, color: 'var(--accent2)', fontSize: '0.82rem' }}>Vinci 3 celle in fila nella griglia grande</p>
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

      {screen === 'playing' && gameState && (() => {
        const winner = gameState.winner
        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--accent2)', fontSize: '0.82rem' }}>Tu: <b style={{ color: 'var(--accent)' }}>{mySymbol}</b></span>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: winner ? 'var(--accent)' : isMyTurn ? 'var(--accent)' : 'var(--accent2)' }}>
                {winner ? (winner === 'draw' ? 'Pareggio!' : winner === mySymbol ? '🎉 Hai vinto!' : '😢 Hai perso') : isMyTurn ? '🟢 Tocca a te' : '⏳ Attendi...'}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--accent2)' }}>{roomCode}</span>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4,
              background: 'var(--text)', padding: 4, borderRadius: 12,
              maxWidth: 360, margin: '0 auto'
            }}>
              {gameState.macroBoard.map((macroCell, mi) => {
                const isActive = !winner && (gameState.nextMacro === null || gameState.nextMacro === mi) && macroCell === null
                return (
                  <div key={mi} style={{
                    background: isActive ? 'var(--bg)' : 'var(--bg2)',
                    borderRadius: 8, padding: 3,
                    border: isActive && isMyTurn ? '2px solid var(--accent)' : '2px solid transparent',
                    opacity: macroCell ? 0.7 : 1
                  }}>
                    {macroCell ? (
                      <div style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, color: macroCell === 'X' ? 'var(--accent)' : '#f44336' }}>
                        {macroCell === 'draw' ? '—' : macroCell}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                        {gameState.boards[mi].map((cell, ci) => (
                          <div key={ci} onClick={() => handleMove(mi, ci)} style={{
                            aspectRatio: '1', background: 'var(--card)',
                            borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.9rem', fontWeight: 800,
                            color: cell === 'X' ? 'var(--accent)' : '#f44336',
                            cursor: (isActive && isMyTurn && !cell) ? 'pointer' : 'default'
                          }}>{cell}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center' }}>
              {winner && <button onClick={resetGame} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700 }}>Rivincita</button>}
              <button onClick={leaveRoom} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 24px', fontWeight: 600, color: 'var(--text)' }}>Esci</button>
            </div>
          </>
        )
      })()}
    </div>
  )
}
