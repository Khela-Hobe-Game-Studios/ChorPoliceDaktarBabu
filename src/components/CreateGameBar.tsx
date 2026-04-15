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
    <div className="create-game-container">
      <input className="input" placeholder="Your name" value={name} onChange={(e) => onNameChange(e.target.value)} />
      <div className="create-game-controls">
        <button className="btn" onClick={onCreate}>Create Game</button>
        <input className="input game-code-input" placeholder="Game code" value={gameCode} onChange={(e) => onGameCodeChange(e.target.value)} />
        <button className="btn" onClick={onJoin}>Join</button>
      </div>
    </div>
  );
}
