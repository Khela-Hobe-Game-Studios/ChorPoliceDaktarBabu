interface PlayerListProps {
  players: Record<string, { name: string; alive?: boolean }>;
}

export function PlayerList(props: PlayerListProps) {
  const { players } = props;

  return (
    <ul className="player-list">
      {Object.entries(players).map(([id, p]) => (
        <li key={id} className={`player-item ${p.alive === false ? 'dead-player' : ''}`}>
          {p.name} {p.alive === false ? '— 💀' : ''}
        </li>
      ))}
    </ul>
  );
}
