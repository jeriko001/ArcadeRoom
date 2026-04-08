import React from 'react'
import ThemeToggle from './ThemeToggle'
import GameCard from './GameCard'
import { Blocks, Bomb, Grid3x3, Dices, Brain, Zap, Hash, CircleDot } from 'lucide-react'

const singleGames = [
  { title: 'Tetris', icon: Blocks, path: '/tetris', tag: 'Single' },
  { title: 'Campo Minato', icon: Bomb, path: '/campominato', tag: 'Single' },
  { title: 'Sudoku', icon: Grid3x3, path: '/sudoku', tag: 'Single' },
  { title: 'Snake', icon: Zap, path: '/snake', tag: 'Single' },
  { title: '2048', icon: Hash, path: '/2048', tag: 'Single' },
]

const multiGames = [
  { title: 'Tris', icon: Dices, path: '/tris', tag: '1vs1' },
  { title: 'Supertris', icon: Brain, path: '/supertris', tag: '1vs1' },
  { title: 'Forza 4', icon: CircleDot, path: '/forza4', tag: '1vs1' },
]

export default function Home({ theme, toggleTheme }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
            🕹️ ArcadeRoom
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--accent2)', marginTop: 2 }}>Gioca da solo o sfida un amico</p>
        </div>
        <ThemeToggle theme={theme} toggle={toggleTheme} />
      </div>

      <section>
        <h2 style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent2)', marginBottom: 12 }}>
          Singleplayer
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          {singleGames.map(g => <GameCard key={g.path} {...g} />)}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent2)', marginBottom: 12 }}>
          1 vs 1 Online
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {multiGames.map(g => <GameCard key={g.path} {...g} />)}
        </div>
      </section>
    </div>
  )
}
