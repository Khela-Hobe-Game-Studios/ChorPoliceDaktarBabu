import { useEffect, useMemo, useState } from 'react'
import './styles/components.scss'
import { getOrCreatePlayerId } from './utils'
import { createGame, joinGame, startGame, nextPhase } from './api/game'
import { useTheme } from './hooks/useTheme'
import { useGameState } from './hooks/useGameState'
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
  const [showRole, setShowRole] = useState<boolean>(false)
  const [currentTheme, setCurrentTheme] = useState<string>('chor')
  
  const playerId = useMemo(() => getOrCreatePlayerId(), [])
  const gameState = useGameState(gameCode, playerId)

  // Apply theme to CSS custom properties
  useTheme(currentTheme)


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

  const isHost = gameState.hostId === playerId
  // Check if player has explicitly joined or is host viewing the game
  const hasJoinedGame = gameCode && hasExplicitlyJoined && gameState.players[playerId]
  // Show game interface if host (even if not joined as player)
  const showGameInterface = hasJoinedGame || (gameCode && isHost)
  // Exclude host from player count for game logic
  const gamePlayers = Object.fromEntries(Object.entries(gameState.players).filter(([id]) => id !== gameState.hostId))
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
          {gameState.players[playerId]?.alive === false && <span className="eliminated-status"> (Eliminated)</span>}
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
            phase={gameState.phase}
            round={gameState.round}
            isHost={isHost}
            gameEnded={gameState.gameEnded}
            onNextPhase={() => nextPhase(gameCode)}
            onResolveNight={handleResolveNight}
          />
          <RoleDisplay
            myRole={gameState.myRole}
            showRole={showRole}
            onToggleShowRole={() => setShowRole((v) => !v)}
          />
          <PlayerList 
            players={gamePlayers} 
            lastInvestigation={gameState.lastInvestigation}
            playerId={playerId}
            myRole={gameState.myRole}
          />
          {gameState.gameEnded && gameState.phase && (
            <div className="game-end-container">
              <h3 className="game-end-title">
                🎉 Game Ended! 🎉
              </h3>
              <div className="game-end-winner">
                {gameState.winner === 'chor' ? 'Chor Wins! 🦹‍♂️' : 'Village Wins! 🏘️'}
              </div>
              {isHost && (
                <button className="btn restart-game-btn" onClick={handleRestartGame}>
                  Restart Game
                </button>
              )}
            </div>
          )}
          <Announcements
            lastDeath={gameState.lastDeath}
            lastElimination={gameState.lastElimination}
            lastInvestigation={gameState.lastInvestigation}
            players={gameState.players}
            playerId={playerId}
          />
          {gameState.phase === 'voting' && (
            <Voting
              gameCode={gameCode}
              playerId={playerId}
              livingPlayers={gamePlayers}
              isHost={isHost}
              canVote={gameState.myAlive}
            />
          )}
          {gameState.phase === 'night' && gameState.myRole && (
            <NightActions
              myRole={gameState.myRole}
              gameCode={gameCode}
              playerId={playerId}
              livingPlayers={gamePlayers}
              canAct={gameState.myAlive}
            />
          )}
          {isHost && !gameState.phase && (
            <ConfigureRoles
              roles={gameState.roles}
              totalPlayers={totalPlayers}
              onRolesChange={async (newRoles) => {
                console.log('Updating roles:', newRoles);
                const { updateRoleConfig } = await import('./api/game');
                await updateRoleConfig(gameCode, newRoles);
                console.log('Roles updated successfully');
              }}
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