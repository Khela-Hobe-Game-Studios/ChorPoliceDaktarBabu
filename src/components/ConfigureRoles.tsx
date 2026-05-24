import { Button, Card } from '@khelahobe/kui'
import { RoleRow } from './RoleRow'
import { getDefaultRolesByCount } from '../utils'

interface ConfigureRolesProps {
  roles: { chor: number; daktar: number; police: number; babu: number }
  totalPlayers: number
  onRolesChange: (roles: { chor: number; daktar: number; police: number; babu: number }) => void
  onStartGame: () => void
}

export function ConfigureRoles({ roles, totalPlayers, onRolesChange, onStartGame }: ConfigureRolesProps) {
  const autoBabu = Math.max(0, totalPlayers - (roles.chor + roles.daktar + roles.police))

  const setRole = (key: 'chor' | 'daktar' | 'police', delta: number) => {
    const next = { ...roles, [key]: Math.max(0, roles[key] + delta) }
    next.babu = Math.max(0, totalPlayers - (next.chor + next.daktar + next.police))
    onRolesChange(next)
  }

  const isValid = totalPlayers > 0 && roles.chor >= 1 &&
    (roles.chor + roles.daktar + roles.police + autoBabu) === totalPlayers

  return (
    <Card>
      <Card.Header>Configure Roles</Card.Header>
      <Card.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <RoleRow label="Chor 🦹‍♂️" value={roles.chor} onDec={() => setRole('chor', -1)} onInc={() => setRole('chor', +1)} />
          <RoleRow label="Daktar 💉" value={roles.daktar} onDec={() => setRole('daktar', -1)} onInc={() => setRole('daktar', +1)} />
          <RoleRow label="Police 👮" value={roles.police} onDec={() => setRole('police', -1)} onInc={() => setRole('police', +1)} />
          <p style={{ margin: 0, fontFamily: 'var(--kui-font-sans)', fontSize: 'var(--kui-text-sm)', color: 'var(--kui-text-muted)' }}>
            Babu 👤: {autoBabu} (auto)
          </p>
        </div>
        {!isValid && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {roles.chor < 1 && <p style={errorStyle}>At least 1 Chor required.</p>}
            {roles.chor > Math.floor(totalPlayers * 0.4) && totalPlayers > 0 && (
              <p style={errorStyle}>Warning: Chor exceed 40% of players.</p>
            )}
            {autoBabu < 2 && totalPlayers >= 4 && (
              <p style={errorStyle}>Warning: At least 2 Babu recommended.</p>
            )}
          </div>
        )}
      </Card.Body>
      <Card.Footer>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" disabled={!isValid} onClick={onStartGame}>Start Game</Button>
          <Button variant="ghost" onClick={() => onRolesChange(getDefaultRolesByCount(totalPlayers))}>Reset</Button>
        </div>
      </Card.Footer>
    </Card>
  )
}

const errorStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 'var(--kui-text-sm)',
  fontFamily: 'var(--kui-font-sans)',
  color: 'var(--kui-tertiary)',
}
