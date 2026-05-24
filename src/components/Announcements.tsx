import { InvestigationResult, EliminationAnnouncement } from '@khelahobe/kui/cpdb'
import type { CpdbRole } from '@khelahobe/kui/cpdb'

interface AnnouncementsProps {
  lastDeath: string | null
  lastElimination: string | null
  lastInvestigation: { policeId: string; targetId: string; isChor: boolean } | null
  players: Record<string, { name: string; alive?: boolean; role?: string }>
  playerId: string
}

export function Announcements({ lastDeath, lastElimination, lastInvestigation, players, playerId }: AnnouncementsProps) {
  const isMyInvestigation = lastInvestigation?.policeId === playerId
  const hasAnnouncement = lastDeath || lastElimination || lastInvestigation

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!hasAnnouncement && (
        <p style={{ margin: 0, color: 'var(--kui-text-muted)', fontFamily: 'var(--kui-font-sans)', fontSize: 'var(--kui-text-sm)' }}>
          No new announcements
        </p>
      )}
      {lastDeath && (
        <p style={{ margin: 0, fontFamily: 'var(--kui-font-sans)', color: 'var(--kui-text)' }}>
          🌙 Night: {players[lastDeath]?.name ?? lastDeath} was attacked
        </p>
      )}
      {lastElimination && (
        <EliminationAnnouncement
          playerName={players[lastElimination]?.name ?? lastElimination}
          playerInitial={(players[lastElimination]?.name?.[0] ?? '?').toUpperCase()}
          role={(players[lastElimination]?.role as CpdbRole) ?? 'babu'}
          animated
        />
      )}
      {isMyInvestigation && lastInvestigation && (
        <InvestigationResult
          targetName={players[lastInvestigation.targetId]?.name ?? lastInvestigation.targetId}
          targetInitial={(players[lastInvestigation.targetId]?.name?.[0] ?? '?').toUpperCase()}
          isChor={lastInvestigation.isChor}
          animated
        />
      )}
    </div>
  )
}
