import { RoleCard } from '@khelahobe/kui/cpdb'
import type { CpdbRole } from '@khelahobe/kui/cpdb'

interface RoleDisplayProps {
  myRole: string
  showRole: boolean
  onToggleShowRole: () => void
  playerName?: string
}

export function RoleDisplay({ myRole, showRole, onToggleShowRole, playerName = '' }: RoleDisplayProps) {
  if (!myRole) return null
  return (
    <RoleCard
      role={myRole as CpdbRole}
      playerName={playerName}
      revealed={showRole}
      onClick={onToggleShowRole}
      style={{ cursor: 'pointer' }}
    />
  )
}
