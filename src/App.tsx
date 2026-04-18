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

  useTheme(currentTheme)

  useEffect(() => {
    const val = localStorage.getItem('cp_show_role')
    setShowRole(val === '1')
  }, [])

  useEffect(() => {
    localStorage.setItem('cp_show_role', showRole ? '1' : '0')
  }, [showRole])

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

  const isHost = gameState.hostId === playerId
  const hasJoinedGame = gameCode && hasExplicitlyJoined && gameState.players[playerId]
  const showGameInterface = hasJoinedGame || (gameCode && isHost)
  const gamePlayers = Object.fromEntries(
    Object.entries(gameState.players).filter(([id]) => id !== gameState.hostId)
  )
  const totalPlayers = Object.keys(gamePlayers).length

  const phaseEmoji: Record<string, string> = { night: '🌙', day: '☀️', voting: '🗳️' }

  // ── HOST DASHBOARD ─────────────────────────────────────────────────
  if (showGameInterface && isHost) {
    return (
      <div className="host-root">
        <div className="host-topbar">
          <h2 className="host-topbar-title">Chor Police Daktar Babu</h2>

          <div className="host-topbar-code-hero">
            <span className="host-topbar-code-label">Room Code</span>
            <span className="host-topbar-code">{gameCode}</span>
          </div>

          <div className="host-topbar-right">
            {gameState.phase ? (
              <span className={`host-phase-chip host-phase-chip--${gameState.phase}`}>
                {phaseEmoji[gameState.phase]} {gameState.phase} · Round {gameState.round}
              </span>
            ) : (
              <span className="host-phase-chip host-phase-chip--lobby">🏠 Lobby</span>
            )}
            <span className="host-player-count">
              👥 {totalPlayers} player{totalPlayers !== 1 ? 's' : ''}
            </span>
            <ThemeSelector currentTheme={currentTheme} onThemeChange={setCurrentTheme} />
          </div>
        </div>

        {gameState.gameEnded && gameState.phase && (
          <div className={`host-winner-bar host-winner-bar--${gameState.winner}`}>
            <span className="host-winner-text">
              🎉 {gameState.winner === 'chor' ? 'Chor Wins! 🦹‍♂️' : 'Village Wins! 🏘️'}
            </span>
            <button className="btn host-restart-btn" onClick={handleRestartGame}>
              Restart Game
            </button>
          </div>
        )}

        <div className="host-layout">
          {/* ── Left: players + lobby config ── */}
          <div className="host-panel">
            <div className="host-panel-heading">👥 Players</div>
            <PlayerList
              players={gamePlayers}
              lastInvestigation={gameState.lastInvestigation}
              playerId={playerId}
              myRole={gameState.myRole}
            />
            {!gameState.phase && (
              <ConfigureRoles
                roles={gameState.roles}
                totalPlayers={totalPlayers}
                onRolesChange={async (newRoles) => {
                  const { updateRoleConfig } = await import('./api/game')
                  await updateRoleConfig(gameCode, newRoles)
                }}
                onStartGame={handleStartGame}
              />
            )}
          </div>

          {/* ── Centre: game controls ── */}
          <div className="host-panel host-panel--main">
            <div className="host-panel-heading">⚙️ Game Controls</div>
            <GameHeader
              phase={gameState.phase}
              round={gameState.round}
              isHost={isHost}
              gameEnded={gameState.gameEnded}
              onNextPhase={() => nextPhase(gameCode)}
              onResolveNight={handleResolveNight}
            />
            {gameState.phase === 'voting' && (() => {
              // Build live tally from player data (vote field is in Firebase but not typed)
              const living = Object.entries(gamePlayers).filter(([, p]) => p.alive !== false)
              const tally: Record<string, { name: string; count: number }> = {}
              let votedCount = 0
              living.forEach(([, p]) => {
                const vote = (p as any).vote as string | null
                if (vote) {
                  votedCount++
                  const targetName = gamePlayers[vote]?.name ?? vote
                  tally[vote] = { name: targetName, count: (tally[vote]?.count ?? 0) + 1 }
                }
              })
              const majority = Math.floor(living.length / 2) + 1
              const sorted = Object.values(tally).sort((a, b) => b.count - a.count)

              return (
                <>
                  <div className="host-vote-progress">
                    <div className="host-vote-header">
                      <span className="host-vote-count">
                        🗳️ {votedCount} / {living.length} voted
                      </span>
                      <span className="host-vote-majority">
                        Need {majority} for elimination
                      </span>
                    </div>
                    {sorted.length > 0 && (
                      <div className="host-vote-tally">
                        {sorted.map(({ name, count }) => (
                          <div key={name} className="host-vote-tally-row">
                            <span className="host-vote-tally-name">{name}</span>
                            <div className="host-vote-tally-bar-wrap">
                              <div
                                className={`host-vote-tally-bar${count >= majority ? ' host-vote-tally-bar--majority' : ''}`}
                                style={{ width: `${Math.round((count / living.length) * 100)}%` }}
                              />
                            </div>
                            <span className="host-vote-tally-num">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {sorted.length === 0 && (
                      <div className="host-vote-waiting">Waiting for votes...</div>
                    )}
                  </div>
                  <Voting
                    gameCode={gameCode}
                    playerId={playerId}
                    livingPlayers={gamePlayers}
                    isHost={isHost}
                    canVote={gameState.myAlive}
                  />
                </>
              )
            })()}
          </div>

          {/* ── Right: announcements feed ── */}
          <div className="host-panel">
            <div className="host-panel-heading">📢 Feed</div>
            <Announcements
              lastDeath={gameState.lastDeath}
              lastElimination={gameState.lastElimination}
              lastInvestigation={gameState.lastInvestigation}
              players={gameState.players}
              playerId={playerId}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── PLAYER MOBILE VIEW + LOBBY ──────────────────────────────────────
  return (
    <div className="app-container">
      {!showGameInterface && <h2>Chor Police Daktar Babu</h2>}

      {/* Lobby */}
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

      {/* In-game player view */}
      {showGameInterface && (
        <>
          <div className="game-code-display">
            <div className="player-name-main">
              {name}
              {gameState.players[playerId]?.alive === false && (
                <span className="eliminated-status"> (Eliminated)</span>
              )}
            </div>
            <div className="game-code-subheader">Game Code: {gameCode}</div>
          </div>

          <GameHeader
            phase={gameState.phase}
            round={gameState.round}
            isHost={false}
            gameEnded={gameState.gameEnded}
            onNextPhase={() => nextPhase(gameCode)}
            onResolveNight={handleResolveNight}
          />

          <RoleDisplay
            myRole={gameState.myRole}
            showRole={showRole}
            onToggleShowRole={() => setShowRole(v => !v)}
          />

          <PlayerList
            players={gamePlayers}
            lastInvestigation={gameState.lastInvestigation}
            playerId={playerId}
            myRole={gameState.myRole}
          />

          {gameState.gameEnded && gameState.phase && (
            <div className="game-end-container">
              <h3 className="game-end-title">🎉 Game Ended! 🎉</h3>
              <div className="game-end-winner">
                {gameState.winner === 'chor' ? 'Chor Wins! 🦹‍♂️' : 'Village Wins! 🏘️'}
              </div>
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
              isHost={false}
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
        </>
      )}

      <ThemeSelector currentTheme={currentTheme} onThemeChange={setCurrentTheme} />
    </div>
  )
}

export default App
