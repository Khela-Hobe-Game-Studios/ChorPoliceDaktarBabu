import { useEffect, useMemo, useState } from 'react'
import './App.css'
import './styles/components.scss'
import { getOrCreatePlayerId } from './utils'
import { createGame, joinGame, startGame, nextPhase, checkWinCondition } from './api/game'
import { db } from './firebase'
import { onValue, ref } from 'firebase/database'
import { 
  CreateGameBar, 
  GameHeader, 
  PlayerList, 
  Announcements, 
  Voting, 
  NightActions, 
  ConfigureRoles,
  RoleDisplay,
  ThemeSelector
} from './components'

function App() {
  const [name, setName] = useState("")
  const [gameCode, setGameCode] = useState("")
  const [hasExplicitlyJoined, setHasExplicitlyJoined] = useState(false)
  const [players, setPlayers] = useState<Record<string, { name: string; alive?: boolean }>>({})
  const [myRole, setMyRole] = useState<string>("")
  const [myAlive, setMyAlive] = useState<boolean>(true)
  const [hostId, setHostId] = useState<string | null>(null)
  const [roles, setRoles] = useState({ chor: 1, daktar: 1, police: 0, babu: 2 })
  const [phase, setPhase] = useState<string | null>(null)
  const [round, setRound] = useState<number>(0)
  const [showRole, setShowRole] = useState<boolean>(false)
  const [lastDeath, setLastDeath] = useState<string | null>(null)
  const [lastElimination, setLastElimination] = useState<string | null>(null)
  const [lastInvestigation, setLastInvestigation] = useState<{ policeId: string; targetId: string; isChor: boolean } | null>(null)
  const [gameEnded, setGameEnded] = useState<boolean>(false)
  const [winner, setWinner] = useState<string | null>(null)
  const [currentTheme, setCurrentTheme] = useState<string>('chor')

  // Theme definitions
  const themes = {
    default: {
      primary: '#6b73ff',
      secondary: '#ff9a9e',
      tertiary: '#ff6b6b',
      background: '#f0f4ff',
      text: '#4a5568',
      border: '#6b73ff'
    },
    chor: {
      primary: '#8B0000',
      secondary: '#FF6B6B',
      tertiary: '#FFD700',
      background: '#FFF5F5',
      text: '#2C1810',
      border: '#8B0000'
    },
    daktar: {
      primary: '#006400',
      secondary: '#00FF7F',
      tertiary: '#FF1493',
      background: '#F0FFF0',
      text: '#2F4F4F',
      border: '#006400'
    },
    police: {
      primary: '#000080',
      secondary: '#87CEEB',
      tertiary: '#FF4500',
      background: '#F0F8FF',
      text: '#191970',
      border: '#000080'
    },
    babu: {
      primary: '#8B4513',
      secondary: '#DDA0DD',
      tertiary: '#FF69B4',
      background: '#FFF8DC',
      text: '#654321',
      border: '#8B4513'
    }
  }

  // Apply theme to CSS custom properties
  useEffect(() => {
    const theme = themes[currentTheme as keyof typeof themes] || themes.default
    const root = document.documentElement
    root.style.setProperty('--primary-color', theme.primary)
    root.style.setProperty('--secondary-color', theme.secondary)
    root.style.setProperty('--tertiary-color', theme.tertiary)
    root.style.setProperty('--background-color', theme.background)
    root.style.setProperty('--text-color', theme.text)
    root.style.setProperty('--border-color', theme.border)
  }, [currentTheme])
  const playerId = useMemo(() => getOrCreatePlayerId(), [])

  useEffect(() => {
    if (!gameCode) return
    const unsubs: Array<() => void> = []
    unsubs.push(onValue(ref(db, `games/${gameCode}/players`), (snap) => {
      type PlayerLeaf = { name: string; role?: string; alive?: boolean }
      const all = (snap.val() as Record<string, PlayerLeaf> | null) ?? {}
      console.log('Firebase listener received players:', Object.keys(all));
      setPlayers(Object.fromEntries(Object.entries(all).map(([id, p]) => [id, { name: p.name, alive: p.alive !== false }])))
      const mine = all[playerId]
      setMyRole(mine?.role ?? "")
      setMyAlive(mine?.alive !== false)
      
      // Check for game end condition
      const gamePlayersForWinCheck = Object.fromEntries(
        Object.entries(all).map(([id, p]) => [id, { 
          name: p.name, 
          role: p.role || '', 
          alive: p.alive !== false 
        }])
      )
      const winCondition = checkWinCondition(gamePlayersForWinCheck)
      if (winCondition) {
        setGameEnded(true)
        setWinner(winCondition)
      } else {
        setGameEnded(false)
        setWinner(null)
      }
    }))
    unsubs.push(onValue(ref(db, `games/${gameCode}/hostId`), (snap) => {
      setHostId((snap.val() as string) ?? null)
    }))
    unsubs.push(onValue(ref(db, `games/${gameCode}/settings/roleConfig`), (snap) => {
      const v = snap.val() as typeof roles | null
      if (v) setRoles(v)
    }))
    unsubs.push(onValue(ref(db, `games/${gameCode}/phase`), (snap) => setPhase((snap.val() as string) ?? null)))
    unsubs.push(onValue(ref(db, `games/${gameCode}/round`), (snap) => setRound((snap.val() as number) ?? 0)))
    unsubs.push(onValue(ref(db, `games/${gameCode}/results`), (snap) => {
      type ResultsLeaf = { lastDeath?: string | null; lastElimination?: string | null; lastInvestigation?: { policeId: string; targetId: string; isChor: boolean } | null }
      const v = (snap.val() as ResultsLeaf | null) ?? {}
      setLastDeath(v.lastDeath ?? null)
      setLastElimination(v.lastElimination ?? null)
      setLastInvestigation(v.lastInvestigation ?? null)
    }))
    return () => { unsubs.forEach(u => u()) }
  }, [gameCode, playerId])

  useEffect(() => {
    const key = 'cp_show_role'
    const val = localStorage.getItem(key)
    setShowRole(val === '1')
  }, [])

  useEffect(() => {
    const key = 'cp_show_role'
    localStorage.setItem(key, showRole ? '1' : '0')
  }, [showRole])

  const handleCreate = async () => {
    const code = await createGame(playerId)
    setGameCode(code)
    // Don't auto-join, let user click Join button
  }

  const handleJoin = async () => {
    if (!name || !gameCode) return
    await joinGame(gameCode, playerId, name)
    setHasExplicitlyJoined(true)
  }

  const isHost = hostId === playerId
  // Check if player has explicitly joined or is host viewing the game
  const hasJoinedGame = gameCode && hasExplicitlyJoined && players[playerId]
  // Show game interface if host (even if not joined as player)
  const showGameInterface = hasJoinedGame || (gameCode && isHost)
  // Exclude host from player count for game logic
  const gamePlayers = Object.fromEntries(Object.entries(players).filter(([id]) => id !== hostId))
  const totalPlayers = Object.keys(gamePlayers).length

  const handleStartGame = async () => {
    await startGame(gameCode)
  }

  const handleResolveNight = async () => {
    const { resolveNight } = await import('./api/game')
    await resolveNight(gameCode)
  }

  const handleRestartGame = async () => {
    const { restartGame } = await import('./api/game')
    await restartGame(gameCode)
  }

  return (
    <div className="app-container">
      <h2>Chor Police Daktar Babu</h2>
      {showGameInterface && (
        <div className="game-code-display">
          <div className="player-name-main">{name}</div>
          {players[playerId]?.alive === false && <span className="eliminated-status"> (Eliminated)</span>}
          <div className="game-code-subheader">Game Code: {gameCode}</div>
        </div>
      )}
      {!showGameInterface && (
        <CreateGameBar
          name={name}
          gameCode={gameCode}
          onNameChange={setName}
          onGameCodeChange={setGameCode}
          onCreate={handleCreate}
          onJoin={handleJoin}
        />
      )}
      {showGameInterface && (
        <>
          <GameHeader
            gameCode={gameCode}
            phase={phase}
            round={round}
            isHost={isHost}
            gameEnded={gameEnded}
            onNextPhase={() => nextPhase(gameCode)}
            onResolveNight={handleResolveNight}
          />
          <RoleDisplay
            myRole={myRole}
            showRole={showRole}
            onToggleShowRole={() => setShowRole((v) => !v)}
          />
          <PlayerList 
            players={gamePlayers} 
            lastInvestigation={lastInvestigation}
            playerId={playerId}
            myRole={myRole}
          />
          {gameEnded && phase && (
            <div className="game-end-container">
              <h3 className="game-end-title">
                🎉 Game Ended! 🎉
              </h3>
              <div className="game-end-winner">
                {winner === 'chor' ? 'Chor Wins! 🦹‍♂️' : 'Village Wins! 🏘️'}
              </div>
              {isHost && (
                <button className="btn restart-game-btn" onClick={handleRestartGame}>
                  Restart Game
                </button>
              )}
            </div>
          )}
          <Announcements
            lastDeath={lastDeath}
            lastElimination={lastElimination}
            lastInvestigation={lastInvestigation}
            players={players}
            playerId={playerId}
          />
          {phase === 'voting' && (
            <Voting
              gameCode={gameCode}
              playerId={playerId}
              livingPlayers={gamePlayers}
              isHost={isHost}
              canVote={myAlive}
            />
          )}
          {phase === 'night' && myRole && (
            <NightActions
              myRole={myRole}
              gameCode={gameCode}
              playerId={playerId}
              livingPlayers={gamePlayers}
              canAct={myAlive}
            />
          )}
          {isHost && !phase && (
            <ConfigureRoles
              roles={roles}
              totalPlayers={totalPlayers}
              onRolesChange={setRoles}
              onStartGame={handleStartGame}
            />
          )}
        </>
      )}
      <ThemeSelector
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
      />
    </div>
  )
}

export default App