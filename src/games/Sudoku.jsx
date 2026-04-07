import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function isValid(board, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) return false
    if (board[i][col] === num) return false
  }
  const br = Math.floor(row / 3) * 3
  const bc = Math.floor(col / 3) * 3
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      if (board[r][c] === num) return false
  return true
}

function solve(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = shuffle([1,2,3,4,5,6,7,8,9])
        for (const n of nums) {
          if (isValid(board, r, c, n)) {
            board[r][c] = n
            if (solve(board)) return true
            board[r][c] = 0
          }
        }
        return false
      }
    }
  }
  return true
}

function generateSudoku(difficulty) {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0))
  solve(board)
  const solution = board.map(r => [...r])
  const removes = difficulty === 'Facile' ? 30 : difficulty === 'Medio' ? 40 : 50
  const puzzle = solution.map(r => [...r])
  const cells = shuffle([...Array(81).keys()])
  let removed = 0
  for (const idx of cells) {
    if (removed >= removes) break
    const r = Math.floor(idx / 9)
    const c = idx % 9
    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0
      removed++
    }
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
