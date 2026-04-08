import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { ref, set, onValue, remove } from 'firebase/database'

const COLS = 10, ROWS = 10
const SHIPS = [
  { size: 5, name: 'Portaerei' },
  { size: 4, name: 'Corazzata' },
  { size: 3, name: 'Incrociatore' },
  { size: 3, name: 'Sottomarino' },
  { size: 2, name: 'Caccia' },
]

function generateCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase()
}

function emptyGrid() {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
}

function canPlace(grid, r, c, size, horiz) {
  for (let i = 0; i < size; i++) {
    const nr = horiz ? r : r + i
    const nc = horiz ? c + i : c
    if (nr >= ROWS || nc >= COLS) return false
    if (grid[nr][nc]) return false
  }
  return true
}

function placeShip(grid, r, c, size, horiz, shipIdx) {
  const next = grid.map(row => [...row])
  for (let i = 0; i < size; i++) {
    const nr = horiz ? r : r + i
    const nc = horiz ? c + i : c
    next[nr][nc] = shipIdx + 1
  }
  return next
}

function checkAllSunk(shots, ships) {
  const total = ships.reduce((a, s) => a + s.size, 0)
  const hits = shots.flat().filter(c => c === 'hit').length
  return hits >= total
}

function initRoom(symbol) {
  return {
    players: 1,
    ready: { X: false, O: false },
    grids: { X: emptyGrid(), O: emptyGrid() },
    shots: { X: emptyGrid(), O: emptyGrid() },
    turn: 'X',
    winner: null,
    phase: 'placement'
  }
}

export default function BattagliaNavale() {
  const nav = useNavigate()
  const [screen, setScreen] = useState('menu')
  const [roomCode, setRoomCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [mySymbol, setMySymbol] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [error, setError] = useState('')

  // Placement state
  const [myGrid, setMyGrid] = useState(emptyGrid())
  const [shipIdx, setShipIdx] = useState(0)
  const [horiz, setHoriz] = useState(true)
  const [hover, setHover] = useState(null)
  const [showMine, setShowMine] = useState(false)

  const roomRef = roomCode ? ref(db, `battaglia/${roomCode}`) : null

  useEffect(() => {
    if (!roomCode || screen === 'menu') return
    const unsub = onValue(ref(db, `battaglia/${roomCode}`), snap => {
      const data = snap.val()
      if (!data) return
      setGameState(data)
      if (data.players >= 2 && screen === 'waiting') setScreen('placement')
    })
    return () => unsub()
  }, [roomCode, screen])

  const createRoom = async () => {
    const code = generateCode()
    setRoomCode(code)
    setMySymbol('X')
    setMyGrid(emptyGrid())
    setShipIdx(0)
    setHoriz(true)
    await set(ref(db, `battaglia/${code}`), initRoom('X'))
    setScreen('waiting')
  }

  const joinRoom = async () => {
    const code = inputCode.toUpperCase().trim()
    if (!code) return
    const snap = await new Promise(res => onValue(ref(db, `battaglia/${code}`), res, { onlyOnce: true }))
    const data = snap.val()
    if (!data) { setError('Stanza non trovata'); return }
    if (data.players >= 2) { setError('Stanza piena'); return }
    setRoomCode(code)
    setMySymbol('O')
    setMyGrid(emptyGrid())
    setShipIdx(0)
    setHoriz(true)
    await set(ref(db, `battaglia/${code}/players`), 2)
    setScreen('placement')
  }

  const handlePlacement = (r, c) => {
    if (shipIdx >= SHIPS.length) return
    const ship = SHIPS[shipIdx]
    if (!canPlace(myGrid, r, c, ship.size, horiz)) return
    const next = placeShip(myGrid, r, c, ship.size, horiz, shipIdx)
    setMyGrid(next)
    setShipIdx(shipIdx + 1)
  }

  const resetPlacement = () => {
    setMyGrid(emptyGrid())
    setShipIdx(0)
  }

  const confirmPlacement = async () => {
    if (shipIdx < SHIPS.length) return
    const snap = await new Promise(res => onValue(roomRef, res, { onlyOnce: true }))
    const data = snap.val()
    const newGrids = { ...data.grids, [mySymbol]: myGrid }
    const newReady = { ...data.ready, [mySymbol]: true }
    const bothReady = newReady.X && newReady.O
    await set(roomRef, {
      ...data,
      grids: newGrids,
      ready: newReady,
      phase: bothReady ? 'playing' : 'placement'
    })
    setScreen('playing')
  }

  const handleShot = async (r, c) => {
    if (!gameState || gameState.turn !== mySymbol) return
    if (gameState.phase !== 'playing') return
    if (gameState.winner) return
    const opponent = mySymbol === 'X' ? 'O' : 'X'
    if (gameState.shots[mySymbol][r][c]) return

    const newShots = {
      X: gameState.shots.X.map(row => [...row]),
      O: gameState.shots.O.map(row => [...row])
    }
    const hit = gameState.grids[opponent][r][c] !== null
    newShots[mySymbol][r][c] = hit ? 'hit' : 'miss'

    const won = hit && checkAllSunk(newShots[mySymbol], SHIPS)

    await set(roomRef, {
      ...gameState,
      shots: newShots,
      turn: hit ? mySymbol : opponent,
      winner: won ? mySymbol : null
    })
  }

  const leaveRoom = async () => {
    if (roomCode) await remove(ref(db, `battaglia/${roomCode}`))
    setScreen('menu'); setRoomCode(''); setInputCode('')
    setMySymbol(null); setGameState(null); setError('')
    setMyGrid(emptyGrid()); setShipIdx(0)
  }

  const resetGame = async () => {
    await set(roomRef, {
      players: 2,
      ready: { X: false, O: false },
      grids: { X: emptyGrid(), O: emptyGrid() },
      shots: { X: emptyGrid(), O: emptyGrid() },
      turn: 'X',
      winner: null,
      phase: 'placement'
    })
    setMyGrid(emptyGrid())
    setShipIdx(0)
    setHoriz(true)
    setScreen('placement')
  }

  const cellSize = Math.min(Math.floor((window.innerWidth - 48) / COLS), 34)

  const renderGrid = (grid, shots, isOpponent) => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${COLS}, ${cellSize}px)`,
      gap: 2,
      margin: '0 auto',
      width: 'fit-content'
    }}>
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const shot = shots?.[r]?.[c]
          const isHit = shot === 'hit'
          const isMiss = shot === 'miss'

          // Hover preview during placement
          let isPreview = false
          let previewValid = false
          if (!isOpponent && hover && shipIdx < SHIPS.length) {
            const ship = SHIPS[shipIdx]
            for (let i = 0; i < ship.size; i++) {
              const pr = horiz ? hover.r : hover.r + i
              const pc = horiz ? hover.c + i : hover.c
              if (pr === r && pc === c) {
                isPreview = true
                previewValid = canPlace(myGrid, hover.r, hover.c, ship.size, horiz)
              }
            }
          }

          let bg = 'var(--bg2)'
          if (!isOpponent && cell) bg = 'var(--accent2)'
          if (isHit) bg = '#e74c3c'
          if (isMiss) bg = '#bbb'
          if (isPreview) bg = previewValid ? 'rgba(45,90,39,0.4)' : 'rgba(231,76,60,0.4)'

          return (
            <div
              key={`${r}-${c}`}
              onClick={() => isOpponent ? handleShot(r, c) : handlePlacement(r, c)}
              onMouseEnter={() => !isOpponent && setHover({ r, c })}
              onMouseLeave={() => !isOpponent && setHover(null)}
              style={{
                width: cellSize, height: cellSize,
                background: bg,
                border: '1px solid var(--border)',
                borderRadius: 3,
                cursor: isOpponent && gameState?.turn === mySymbol && !shot && !gameState?.winner ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: cellSize * 0.5
              }}
            >
              {isHit ? '🔥' : isMiss ? '·' : ''}
            </div>
          )
        })
      )}
    </div>
  )

  const isMyTurn = gameState?.turn === mySymbol
  const opponent = mySymbol === 'X' ? 'O' : 'X'
  const opponentReady = gameState?.ready?.[opponent]

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px', userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={() => { leaveRoom(); nav('/') }} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)' }}>← Home</button>
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>Battaglia Navale</span>
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

      {screen === 'placement' && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            {shipIdx < SHIPS.length ? (
              <>
                <p style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>
                  Posiziona: <span style={{ color: 'var(--accent2)' }}>{SHIPS[shipIdx].name}</span> ({SHIPS[shipIdx].size} celle)
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
                  <button onClick={() => setHoriz(h => !h)} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 16px', fontWeight: 600, color: 'var(--text)' }}>
                    🔄 {horiz ? 'Orizzontale' : 'Verticale'}
                  </button>
                  <button onClick={resetPlacement} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 16px', fontWeight: 600, color: 'var(--text)' }}>
                    ↩ Reset
                  </button>
                </div>
              </>
            ) : (
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>
                  ✅ Tutte le navi posizionate!
                </p>
                {!opponentReady && <p style={{ fontSize: '0.82rem', color: 'var(--accent2)', marginBottom: 8 }}>L'avversario sta ancora posizionando...</p>}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button onClick={resetPlacement} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 16px', fontWeight: 600, color: 'var(--text)' }}>↩ Reset</button>
                  <button onClick={confirmPlacement} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 700 }}>Conferma ✓</button>
                </div>
              </div>
            )}
          </div>
          {renderGrid(myGrid, null, false)}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {SHIPS.map((s, i) => (
              <span key={i} style={{
                fontSize: '0.72rem', padding: '2px 8px',
                background: i < shipIdx ? 'var(--accent)' : i === shipIdx ? 'var(--accent2)' : 'var(--card)',
                color: i <= shipIdx ? '#fff' : 'var(--text)',
                borderRadius: 999, border: '1px solid var(--border)', fontWeight: 600
              }}>{s.name}</span>
            ))}
          </div>
        </div>
      )}

      {screen === 'playing' && gameState && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent2)' }}>Tu: <b style={{ color: 'var(--accent)' }}>{mySymbol}</b></span>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: gameState.winner ? 'var(--accent)' : isMyTurn ? 'var(--accent)' : 'var(--accent2)' }}>
              {gameState.winner
                ? gameState.winner === mySymbol ? '🎉 Hai vinto!' : '😢 Hai perso'
                : gameState.phase !== 'playing' ? '⏳ Attendi avversario...'
                : isMyTurn ? '🟢 Tocca a te — attacca!' : '⏳ Attendi...'}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--accent2)' }}>{roomCode}</span>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--accent2)', marginBottom: 6 }}>
            🎯 Griglia avversario
          </p>
          {renderGrid(
            emptyGrid(),
            gameState.shots[mySymbol],
            true
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 6px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--accent2)' }}>🛡️ Le tue navi</p>
            <button onClick={() => setShowMine(s => !s)} style={{ fontSize: '0.72rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', color: 'var(--text)' }}>
              {showMine ? 'Nascondi' : 'Mostra'}
            </button>
          </div>
          {showMine && renderGrid(myGrid, gameState.shots[opponent], false)}

          <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'center' }}>
            {gameState.winner && <button onClick={resetGame} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700 }}>Rivincita</button>}
            <button onClick={leaveRoom} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 24px', fontWeight: 600, color: 'var(--text)' }}>Esci</button>
          </div>
        </>
      )}
    </div>
  )
}
