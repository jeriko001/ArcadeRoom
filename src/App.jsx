import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import Tetris from './games/Tetris'
import CampoMinato from './games/CampoMinato'
import Sudoku from './games/Sudoku'
import Tris from './games/Tris'
import Supertris from './games/Supertris'
import Snake from './games/Snake'
import Duemilaquarantotto from './games/Duemilaquarantotto'
import Forza4 from './games/Forza4'
import BattagliaNavale from './games/BattagliaNavale'


export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('arcaderoom-theme') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('arcaderoom-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  return (
    <BrowserRouter basename="/ArcadeRoom">
      <Routes>
        <Route path="/" element={<Home theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/tetris" element={<Tetris />} />
        <Route path="/campominato" element={<CampoMinato />} />
        <Route path="/sudoku" element={<Sudoku />} />
        <Route path="/tris" element={<Tris />} />
        <Route path="/supertris" element={<Supertris />} />
        <Route path="/snake" element={<Snake />} />
<Route path="/2048" element={<Duemilaquarantotto />} />
        <Route path="/forza4" element={<Forza4 />} />
        <Route path="/battaglia" element={<BattagliaNavale />} />


      </Routes>
    </BrowserRouter>
  )
}
