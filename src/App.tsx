import { useEffect, useMemo, useRef, useState } from 'react'
import { KuiProvider } from '@khelahobe/kui'
import type { KuiTheme, KuiColorMode } from '@khelahobe/kui'
import { PhaseTransition } from '@khelahobe/kui/cpdb'
import type { CpdbPhase } from '@khelahobe/kui/cpdb'
import { getOrCreatePlayerId } from './utils'
import { createGame, joinGame, startGame, nextPhase } from './api/game'
import { useGameState } from './hooks/useGameState'
import { CreateGameBar, ThemeSelector } from './components'
import { HostGameScreen } from './screens/HostGameScreen'
import { PlayerGameScreen } from './screens/PlayerGameScreen'

function App() {
  const [name, setName] = useState("")
  const [gameCode, setGameCode] = useState("")
  const [hasExplicitlyJoined, setHasExplicitlyJoined] = useState(false)
  const [showRole, setShowRole] = useState<boolean>(false)
  const [currentTheme, setCurrentTheme] = useState<KuiTheme>(
    () => {
      const saved = localStorage.getItem('cp_theme')
      const valid: KuiTheme[] = ['default', 'chor', 'police', 'daktar']
      return valid.includes(saved as KuiTheme) ? (saved as KuiTheme) : 'chor'
    }
  )
  const [colorMode, setColorMode] = useState<KuiColorMode>(
    () => (localStorage.getItem('cp_color_mode') as KuiColorMode) ?? 'dark'
  )
  const [phaseOverlayVisible, setPhaseOverlayVisible] = useState(false)
  const prevPhaseRef = useRef<string | null>(null)

  const playerId = useMemo(() => getOrCreatePlayerId(), [])
  const gameState = useGameState(gameCode, playerId)

  useEffect(() => {
    if (gameState.phase && gameState.phase !== prevPhaseRef.current) {
      prevPhaseRef.current = gameState.phase
      setPhaseOverlayVisible(true)
      setTimeout(() => setPhaseOverlayVisible(false), 1800)
    }
  }, [gameState.phase])

  useEffect(() => {
    const val = localStorage.getItem('cp_show_role')
    setShowRole(val === '1')
  }, [])

  useEffect(() => {
    localStorage.setItem('cp_show_role', showRole ? '1' : '0')
  }, [showRole])

  useEffect(() => { localStorage.setItem('cp_theme', currentTheme) }, [currentTheme])
  useEffect(() => { localStorage.setItem('cp_color_mode', colorMode) }, [colorMode])

  useEffect(() => {
    document.documentElement.setAttribute('data-kui-theme', currentTheme)
    document.documentElement.setAttribute('data-kui-mode', colorMode)
  }, [currentTheme, colorMode])

  // Auto-join when URL params ?pid=X&join=CODE&name=NAME are present (simulation mode)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const autoJoin = params.get('join')
    const autoName = params.get('name')
    if (autoJoin && autoName && !hasExplicitlyJoined) {
      setGameCode(autoJoin)
      setName(autoName)
      joinGame(autoJoin, playerId, autoName)
        .then(() => setHasExplicitlyJoined(true))
        .catch(console.error)
    }
  }, [playerId])

  const handleCreate = async () => {
    const code = await createGame(playerId)
    setGameCode(code)
  }

  const handleJoin = async () => {
    if (!name || !gameCode) return
    await joinGame(gameCode, playerId, name)
    setHasExplicitlyJoined(true)
  }

  const handleStartGame = async () => { await startGame(gameCode) }

  const handleResolveNight = async () => {
    const { resolveNight } = await import('./api/game')
    await resolveNight(gameCode)
  }

  const handleRestartGame = async () => {
    const { restartGame } = await import('./api/game')
    await restartGame(gameCode)
  }

  const handleRolesChange = async (newRoles: { chor: number; daktar: number; police: number; babu: number }) => {
    const { updateRoleConfig } = await import('./api/game')
    await updateRoleConfig(gameCode, newRoles)
  }

  const isHost = gameState.hostId === playerId
  const gamePlayers = Object.fromEntries(
    Object.entries(gameState.players).filter(([id]) => id !== gameState.hostId)
  )

  const screen = deriveScreen(gameCode, hasExplicitlyJoined, gameState, playerId, isHost)

  if (screen !== 'lobby' && isHost) {
    return (
      <KuiProvider theme={currentTheme} colorMode={colorMode}>
        <PhaseTransition phase={(gameState.phase ?? 'lobby') as CpdbPhase} visible={phaseOverlayVisible} />
        <HostGameScreen
          gameCode={gameCode}
          gameState={gameState}
          gamePlayers={gamePlayers}
          playerId={playerId}
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
          onNextPhase={() => nextPhase(gameCode)}
          onResolveNight={handleResolveNight}
          onRestartGame={handleRestartGame}
          onRolesChange={handleRolesChange}
          onStartGame={handleStartGame}
        />
      </KuiProvider>
    )
  }

  return (
    <KuiProvider theme={currentTheme} colorMode={colorMode}>
      <PhaseTransition phase={(gameState.phase ?? 'lobby') as CpdbPhase} visible={phaseOverlayVisible} />
      <div className="app-container">
        {screen === 'lobby' && <h2>Chor Police Daktar Babu</h2>}
        {screen === 'lobby' && (
          <CreateGameBar
            name={name}
            gameCode={gameCode}
            onNameChange={setName}
            onGameCodeChange={setGameCode}
            onCreate={handleCreate}
            onJoin={handleJoin}
          />
        )}
        {screen !== 'lobby' && (
          <PlayerGameScreen
            gameCode={gameCode}
            gameState={gameState}
            gamePlayers={gamePlayers}
            playerId={playerId}
            name={name}
            showRole={showRole}
            onToggleShowRole={() => setShowRole(v => !v)}
            onNextPhase={() => nextPhase(gameCode)}
            onResolveNight={handleResolveNight}
          />
        )}
        <ThemeSelector
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
        />
      </div>
    </KuiProvider>
  )
}

type Screen = 'lobby' | 'waiting' | 'game' | 'results'

function deriveScreen(
  gameCode: string,
  hasJoined: boolean,
  gs: { hostId: string | null; players: Record<string, unknown>; phase: CpdbPhase | null; gameEnded: boolean },
  playerId: string,
  isHost: boolean,
): Screen {
  if (!gameCode || !gs.hostId) return 'lobby'
  const inGame = isHost || (hasJoined && !!gs.players[playerId])
  if (!inGame) return 'lobby'
  if (gs.gameEnded) return 'results'
  if (!gs.phase) return 'waiting'
  return 'game'
}

export default App
