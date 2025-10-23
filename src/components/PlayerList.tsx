interface PlayerListProps {
  players: Record<string, { name: string; alive?: boolean }>;
  lastInvestigation?: { policeId: string; targetId: string; isChor: boolean } | null;
  playerId: string;
  myRole: string;
}

export function PlayerList(props: PlayerListProps) {
  const { players, lastInvestigation, playerId, myRole } = props;

  return (
    <ul className="player-list">
      {Object.entries(players).map(([id, p]) => {
        // Show thief emoji only for police when they have correctly identified a chor
        const isPolice = myRole === 'police';
        const isInvestigatedChor = lastInvestigation && 
          lastInvestigation.policeId === playerId && 
          lastInvestigation.targetId === id && 
          lastInvestigation.isChor;
        
        return (
          <li key={id} className={`player-item ${p.alive === false ? 'dead-player' : ''} ${isPolice && isInvestigatedChor ? 'police-identified-chor' : ''}`}>
            {isPolice && isInvestigatedChor ? '🦹‍♂️ ' : ''}{p.name} {p.alive === false && !(isPolice && isInvestigatedChor) ? '— 💀' : ''}
          </li>
        );
      })}
    </ul>
  );
}
