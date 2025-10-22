interface AnnouncementsProps {
  lastDeath: string | null;
  lastElimination: string | null;
  lastInvestigation: { policeId: string; targetId: string; isChor: boolean } | null;
  players: Record<string, { name: string; alive?: boolean }>;
  playerId: string;
}

export function Announcements(props: AnnouncementsProps) {
  const { lastDeath, lastElimination, lastInvestigation, players, playerId } = props;

  if (!lastDeath && !lastElimination && !lastInvestigation) {
    return null;
  }

  return (
    <div className="announcements">
      <h4 className="announcements-title">Announcements</h4>
      {lastDeath && <div>Night: {players[lastDeath]?.name ?? lastDeath} was attacked { /* saved -> victim null handled in API */}</div>}
      {lastElimination && <div>Voting: {players[lastElimination]?.name ?? lastElimination} was eliminated.</div>}
      {lastInvestigation && lastInvestigation.policeId === playerId && (
        <div>Police Result: {players[lastInvestigation.targetId]?.name ?? lastInvestigation.targetId} is {lastInvestigation.isChor ? 'Chor' : 'not Chor'}.</div>
      )}
    </div>
  );
}
