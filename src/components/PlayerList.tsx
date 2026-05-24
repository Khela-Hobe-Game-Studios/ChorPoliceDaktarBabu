import { PlayerCard } from '@khelahobe/kui'

interface PlayerListProps {
  players: Record<string, { name: string; alive?: boolean }>
  lastInvestigation?: { policeId: string; targetId: string; isChor: boolean } | null
  playerId: string
  myRole: string
}

export function PlayerList({ players, lastInvestigation, playerId, myRole }: PlayerListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {Object.entries(players).map(([id, p]) => {
        const isIdentifiedChor = myRole === 'police' &&
          lastInvestigation?.policeId === playerId &&
          lastInvestigation?.targetId === id &&
          lastInvestigation?.isChor

        const status = p.alive === false
          ? 'eliminated'
          : isIdentifiedChor
          ? 'answered'
          : 'waiting'

        return (
          <PlayerCard
            key={id}
            name={isIdentifiedChor ? `🦹‍♂️ ${p.name}` : p.name}
            initial={(p.name[0] ?? '?').toUpperCase()}
            status={status}
            isMe={id === playerId}
            variant="list"
          />
        )
      })}
    </div>
  )
}
