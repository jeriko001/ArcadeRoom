import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

function generateSudoku(difficulty) {
  const base = [
    [5,3,0,0,7,0,0,0,0],
    [6,0,0,1,9,5,0,0,0],
    [0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3],
    [4,0,0,8,0,3,0,0,1],
    [7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0],
    [0,0,0,4,1,9,0,0,5],
    [0,0,0,0,8,0,0,7,9]
  ]
  const solution = [
    [5,3,4,6,7,8,9,1,2],
    [6,7,2,1,9,5,3,4,8],
    [1,9,8,3,4,2,5,6,7],
    [8,5,9,7,6,1,4,2,3],
    [4,2,6,8,5,3,7,9,1],
    [7,1,3,9,2,4,8,5,6],
    [9,6,1,5,3,7,2,8,4],
    [2,8,7,4,1,9,6,3,5],
    [3,4,5,2,8,6,1,7,9]
  ]
  const removes = difficulty === 'Facile' ? 30 : difficulty === 'Medio' ? 45 : 55
  const puzzle = base.map(r => [...r])
  let removed = 0
  while (removed < removes) {
    const r = Math.floor(Math.random() * 9)
    const c = Math.floor(Math.random() * 9)
    if (puzzle[r][c] !== 0) { puzzle[r][c] = 0; removed++ }
  }
  return { puzzle, solution }
}

export default function Sudoku() {
  const nav = useNavigate()
  const [diff, setDiff] = useState('Facile')
  const [game, setGame] = useState(null)
  const [board, setBoard] = useState(null)
  const [selected, setSelected] = useState(null)
  const [errors, setErrors] = useState(new Set())
  const [won, setWon] = useState(false)

  const startGame = () => {
    const { puzzle, solution } = generateSudoku(diff)
    setGame({ puzzle, solution })
    setBoard(puzzle.map(r => [...r]))
    setSelected(null)
    setErrors(new Set())
    setWon(false)
  }

  const handleInput = useCallback((val) => {
    if (!selected || !game) return
    const [r, c] = selected
    if (game.puzzle[r][c] !== 0) return
    const next = board.map(row => [...row])
    next[r][c] = val
    setBoard(next)
    const newErrors = new Set()
    for (let i = 0; i < 9; i++)
      for (let j = 0; j < 9; j++)
        if (next[i][j] !== 0 && next[i][j] !== game.solution[i][j])
          newErrors.add(`${i},${j}`)
    setErrors(newErrors)
    if (next.every((row, ri) => row.every((cell, ci) => cell === game.solution[ri][ci]))) setWon(true)
  }, [selected, board, game])

  const cellSize = Math.min(Math.floor((window.innerWidth - 48) / 9), 42)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px', userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => nav('/')} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)' }}>← Home</button>
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>Sudoku</span>
        <div />
      </div>

      {!game && (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <p style={{ marginBottom: 16, fontWeight: 600 }}>Scegli difficoltà</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
            {['Facile', 'Medio', 'Difficile'].map(d => (
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

      {game && (
        <>
          {won && <p style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent)', fontSize: '1.1rem', marginBottom: 10 }}>🎉 Completato!</p>}
          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(9, ${cellSize}px)`,
            gap: 0, margin: '0 auto', width: 'fit-content',
            border: '2px solid var(--text)'
          }}>
            {board.map((row, r) =>
              row.map((val, c) => {
                const isFixed = game.puzzle[r][c] !== 0
                const isSel = selected && selected[0] === r && selected[1] === c
                const isErr = errors.has(`${r},${c}`)
                const borderR = (c + 1) % 3 === 0 && c !== 8 ? '2px solid var(--text)' : '1px solid var(--border)'
                const borderB = (r + 1) % 3 === 0 && r !== 8 ? '2px solid var(--text)' : '1px solid var(--border)'
                return (
                  <div key={`${r}-${c}`}
                    onClick={() => !isFixed && setSelected([r, c])}
                    style={{
                      width: cellSize, height: cellSize,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: cellSize * 0.5,
                      fontWeight: isFixed ? 700 : 500,
                      background: isSel ? 'var(--accent)' : isErr ? '#fdd' : 'var(--bg)',
                      color: isSel ? '#fff' : isErr ? '#c00' : isFixed ? 'var(--text)' : 'var(--accent)',
                      borderRight: borderR,
                      borderBottom: borderB,
                      cursor: isFixed ? 'default' : 'pointer'
                    }}
                  >{val !== 0 ? val : ''}</div>
                )
              })
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 16 }}>
            {[1,2,3,4,5,6,7,8,9,0].map(n => (
              <button key={n} onClick={() => handleInput(n)} style={{
                background: 'var(--card)', border: '1.5px solid var(--border)',
                borderRadius: 8, padding: '10px 0',
                fontWeight: 700, fontSize: '1rem', color: 'var(--text)'
              }}>{n === 0 ? '✕' : n}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'center' }}>
            <button onClick={startGame} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 20px', fontWeight: 600, color: 'var(--text)' }}>↩ Nuova</button>
            <button onClick={() => setGame(null)} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 20px', fontWeight: 600, color: 'var(--text)' }}>Menu</button>
          </div>
        </>
      )}
    </div>
  )
}
