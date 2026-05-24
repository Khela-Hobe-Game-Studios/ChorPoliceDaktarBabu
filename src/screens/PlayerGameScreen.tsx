import { WinnerDisplay } from '@khelahobe/kui'
import {
  GameHeader, PlayerList, Announcements, Voting,
  NightActions, RoleDisplay,
} from '../components'
import type { useGameState } from '../hooks/useGameState'

type GameState = ReturnType<typeof useGameState>
type GamePlayers = Record<string, { name: string; alive?: boolean; role?: string; vote?: string | null }>

interface Props {
  gameCode: string
  gameState: GameState
  gamePlayers: GamePlayers
  playerId: string
  name: string
  showRole: boolean
  onToggleShowRole: () => void
  onNextPhase: () => void
  onResolveNight: () => void
}

export function PlayerGameScreen({
  gameCode, gameState, gamePlayers, playerId,
  name, showRole, onToggleShowRole,
  onNextPhase, onResolveNight,
}: Props) {
  return (
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
        onNextPhase={onNextPhase}
        onResolveNight={onResolveNight}
      />

      <RoleDisplay
        myRole={gameState.myRole}
        showRole={showRole}
        onToggleShowRole={onToggleShowRole}
        playerName={name}
      />

      <PlayerList
        players={gamePlayers}
        lastInvestigation={gameState.lastInvestigation}
        playerId={playerId}
        myRole={gameState.myRole}
      />

      {gameState.gameEnded && gameState.phase && (
        <WinnerDisplay
          winners={[{ name: gameState.winner === 'chor' ? 'Chor Wins! 🦹‍♂️' : 'Village Wins! 🏘️', initial: gameState.winner === 'chor' ? 'C' : 'V' }]}
          animated
        />
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
  )
}
