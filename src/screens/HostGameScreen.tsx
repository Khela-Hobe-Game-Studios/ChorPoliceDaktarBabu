import { WinnerDisplay } from '@khelahobe/kui'
import type { KuiTheme, KuiColorMode } from '@khelahobe/kui'
import { VoteTally } from '@khelahobe/kui/cpdb'
import type { VoteTallyEntry } from '@khelahobe/kui/cpdb'
import {
  GameHeader, PlayerList, Announcements, Voting,
  ConfigureRoles, ThemeSelector,
} from '../components'
import type { useGameState } from '../hooks/useGameState'

type GameState = ReturnType<typeof useGameState>
type GamePlayers = Record<string, { name: string; alive?: boolean; role?: string; vote?: string | null }>

interface Props {
  gameCode: string
  gameState: GameState
  gamePlayers: GamePlayers
  playerId: string
  currentTheme: KuiTheme
  onThemeChange: (t: KuiTheme) => void
  colorMode: KuiColorMode
  onColorModeChange: (mode: KuiColorMode) => void
  onNextPhase: () => void
  onResolveNight: () => void
  onRestartGame: () => void
  onRolesChange: (roles: { chor: number; daktar: number; police: number; babu: number }) => void
  onStartGame: () => void
}

const phaseEmoji: Record<string, string> = { night: '🌙', day: '☀️', voting: '🗳️' }

export function HostGameScreen({
  gameCode, gameState, gamePlayers, playerId,
  currentTheme, onThemeChange,
  colorMode, onColorModeChange,
  onNextPhase, onResolveNight, onRestartGame,
  onRolesChange, onStartGame,
}: Props) {
  const totalPlayers = Object.keys(gamePlayers).length

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
          <ThemeSelector
            currentTheme={currentTheme}
            onThemeChange={onThemeChange}
            colorMode={colorMode}
            onColorModeChange={onColorModeChange}
          />
        </div>
      </div>

      {gameState.gameEnded && gameState.phase && (
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16, background: 'var(--kui-surface)', borderBottom: '2px solid var(--kui-border)' }}>
          <WinnerDisplay
            winners={[{ name: gameState.winner === 'chor' ? 'Chor Wins! 🦹‍♂️' : 'Village Wins! 🏘️', initial: gameState.winner === 'chor' ? 'C' : 'V' }]}
            animated
          />
          <button
            onClick={onRestartGame}
            style={{ marginLeft: 'auto', padding: '8px 20px', borderRadius: 'var(--kui-radius-md)', border: '2px solid var(--kui-border)', background: 'var(--kui-primary)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: 'var(--kui-font-sans)' }}
          >
            Restart Game
          </button>
        </div>
      )}

      <div className="host-layout">
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
              onRolesChange={onRolesChange}
              onStartGame={onStartGame}
            />
          )}
        </div>

        <div className="host-panel host-panel--main">
          <div className="host-panel-heading">⚙️ Game Controls</div>
          <GameHeader
            phase={gameState.phase}
            round={gameState.round}
            isHost={true}
            gameEnded={gameState.gameEnded}
            onNextPhase={onNextPhase}
            onResolveNight={onResolveNight}
          />
          {gameState.phase === 'voting' && (() => {
            const living = Object.entries(gamePlayers).filter(([, p]) => p.alive !== false)
            const tallyMap: Record<string, { name: string; count: number }> = {}
            let votedCount = 0
            living.forEach(([, p]) => {
              const vote = p.vote
              if (vote) {
                votedCount++
                tallyMap[vote] = { name: gamePlayers[vote]?.name ?? vote, count: (tallyMap[vote]?.count ?? 0) + 1 }
              }
            })
            const nominations: VoteTallyEntry[] = Object.entries(tallyMap)
              .sort(([, a], [, b]) => b.count - a.count)
              .map(([id, { name, count }], i, arr) => ({
                playerId: id, name,
                initial: (name[0] ?? '?').toUpperCase(),
                votes: count,
                isLeading: i === 0 && count > 0 && (arr[1]?.[1].count ?? 0) < count,
              }))
            const majority = Math.floor(living.length / 2) + 1
            return (
              <>
                <p style={{ margin: 0, fontFamily: 'var(--kui-font-sans)', fontSize: 'var(--kui-text-sm)', color: 'var(--kui-text-muted)' }}>
                  🗳️ {votedCount} / {living.length} voted · Need {majority} for elimination
                </p>
                {nominations.length > 0
                  ? <VoteTally nominations={nominations} totalVoters={living.length} />
                  : <p style={{ margin: 0, color: 'var(--kui-text-muted)', fontFamily: 'var(--kui-font-sans)', fontSize: 'var(--kui-text-sm)' }}>Waiting for votes…</p>
                }
                <Voting gameCode={gameCode} playerId={playerId} livingPlayers={gamePlayers} isHost={true} canVote={gameState.myAlive} />
              </>
            )
          })()}
        </div>

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
