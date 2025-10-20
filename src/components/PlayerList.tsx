interface PlayerListProps {
  players: Record<string, { name: string; alive?: boolean }>;
}

export function PlayerList(props: PlayerListProps) {
  const { players } = props;

  return (
    <ul>
      {Object.entries(players).map(([id, p]) => (
        <li key={id}>
          {p.name} {p.alive === false ? '— 💀' : ''}
        </li>
      ))}
    </ul>
  );
}
