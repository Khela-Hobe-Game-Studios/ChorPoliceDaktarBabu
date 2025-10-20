import { useState } from 'react';

interface NightActionsProps {
  myRole: string;
  gameCode: string;
  playerId: string;
  livingPlayers: Record<string, { name: string; alive?: boolean }>;
  canAct: boolean;
}

export function NightActions(props: NightActionsProps) {
  const { myRole, gameCode, playerId, livingPlayers, canAct } = props;
  const [target, setTarget] = useState<string>("");
  const actionable = myRole === 'chor' || myRole === 'daktar' || myRole === 'police';

  if (!actionable) {
    return <div style={{ marginTop: 12, opacity: 0.8 }}>Night phase: no action for your role.</div>;
  }

  const label = myRole === 'chor' ? 'Choose a victim' : myRole === 'daktar' ? 'Choose someone to save' : 'Investigate a player';

  return (
    <div style={{ border: '1px solid #ccc', padding: 12, borderRadius: 8, marginTop: 12 }}>
      <h4>Night Action</h4>
      <div style={{ marginBottom: 8 }}>{label}</div>
      <select value={target} onChange={(e) => setTarget(e.target.value)} disabled={!canAct}>
        <option value="">-- Select Player --</option>
        {Object.entries(livingPlayers).filter(([, p]) => p.alive !== false).map(([id, p]) => (
          <option key={id} value={id}>{p.name}</option>
        ))}
      </select>
      <button style={{ marginLeft: 8 }} disabled={!target || !canAct} onClick={async () => {
        const { setNightAction } = await import('../api/game');
        const roleType = (myRole === 'chor' || myRole === 'daktar' || myRole === 'police') ? myRole : 'chor';
        await setNightAction(gameCode, playerId, { type: roleType as 'chor' | 'daktar' | 'police', target });
        alert('Action submitted');
      }}>Confirm</button>
    </div>
  );
}
