interface CreateGameBarProps {
  name: string;
  gameCode: string;
  onNameChange: (name: string) => void;
  onGameCodeChange: (gameCode: string) => void;
  onCreate: () => void;
  onJoin: () => void;
}

export function CreateGameBar(props: CreateGameBarProps) {
  const { name, gameCode, onNameChange, onGameCodeChange, onCreate, onJoin } = props;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input placeholder="Your name" value={name} onChange={(e) => onNameChange(e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCreate}>Create Game</button>
        <input placeholder="Game code" value={gameCode} onChange={(e) => onGameCodeChange(e.target.value)} style={{ width: 120 }} />
        <button onClick={onJoin}>Join</button>
      </div>
    </div>
  );
}
