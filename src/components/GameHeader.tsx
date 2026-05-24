import { Badge, Button } from '@khelahobe/kui'

type PhaseBadgeVariant = 'default' | 'night' | 'day' | 'voting' | 'lobby'

const PHASE_VARIANT: Record<string, PhaseBadgeVariant> = {
  lobby: 'lobby', night: 'night', day: 'day', voting: 'voting', results: 'default',
}

interface GameHeaderProps {
  phase: string | null
  round: number
  isHost: boolean
  gameEnded: boolean
  onNextPhase: () => void
  onResolveNight: () => void
}

export function GameHeader({ phase, round, isHost, gameEnded, onNextPhase, onResolveNight }: GameHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {phase && (
        <Badge
          variant={PHASE_VARIANT[phase] ?? 'default'}
          pulse={phase === 'night' || phase === 'voting'}
        >
          {phase.charAt(0).toUpperCase() + phase.slice(1)} · Round {round}
        </Badge>
      )}
      {isHost && phase && !gameEnded && (
        <>
          <Button size="sm" variant="primary" onClick={onNextPhase}>Next Phase</Button>
          {phase === 'night' && (
            <Button size="sm" variant="secondary" onClick={onResolveNight}>Resolve Night</Button>
          )}
        </>
      )}
    </div>
  )
}
