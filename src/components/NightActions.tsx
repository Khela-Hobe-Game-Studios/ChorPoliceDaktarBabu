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
    return <div className="no-action-message">Night phase: no action for your role.</div>;
  }

  const label = myRole === 'chor' ? 'Choose a victim' : myRole === 'daktar' ? 'Choose someone to save' : 'Investigate a player';

  return (
    <div className="night-actions-container">
      <h4 className="night-actions-title">Night Action</h4>
      <div className="night-actions-label">{label}</div>
      <div className="night-actions-controls">
        <select className="select" value={target} onChange={(e) => setTarget(e.target.value)} disabled={!canAct}>
          <option value="">-- Select Player --</option>
          {Object.entries(livingPlayers).filter(([, p]) => p.alive !== false).map(([id, p]) => (
            <option key={id} value={id}>{p.name}</option>
          ))}
        </select>
        <button className="btn confirm-btn" disabled={!target || !canAct} onClick={async () => {
          const { setNightAction } = await import('../api/game');
          const roleType = (myRole === 'chor' || myRole === 'daktar' || myRole === 'police') ? myRole : 'chor';
          await setNightAction(gameCode, playerId, { type: roleType as 'chor' | 'daktar' | 'police', target });
          alert('Action submitted');
        }}>Confirm</button>
      </div>
    </div>
  );
}
