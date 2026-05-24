import { Input, Button } from '@khelahobe/kui'

interface CreateGameBarProps {
  name: string
  gameCode: string
  onNameChange: (name: string) => void
  onGameCodeChange: (gameCode: string) => void
  onCreate: () => void
  onJoin: () => void
}

export function CreateGameBar({ name, gameCode, onNameChange, onGameCodeChange, onCreate, onJoin }: CreateGameBarProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Input placeholder="Your name" value={name} onChange={e => onNameChange(e.target.value)} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <Button variant="primary" onClick={onCreate}>Create Game</Button>
        <div style={{ flex: 1 }}>
          <Input placeholder="Game code" value={gameCode} onChange={e => onGameCodeChange(e.target.value)} />
        </div>
        <Button variant="secondary" onClick={onJoin}>Join</Button>
      </div>
    </div>
  )
}
