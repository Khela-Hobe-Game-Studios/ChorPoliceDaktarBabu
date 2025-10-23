import { useState } from 'react';

interface NightActionsProps {
  myRole: string;
  gameCode: string;
  playerId: string;
  livingPlayers: Record<string, { name: string; alive?: boolean }>;
  canAct: boolean;
}

export function NightActions({ myRole, gameCode, playerId, livingPlayers, canAct }: NightActionsProps) {
  const [target, setTarget] = useState<string>("");
  const [actionSubmitted, setActionSubmitted] = useState<boolean>(false);
  
  const actionable = ['chor', 'daktar', 'police'].includes(myRole);
  if (!actionable) {
    return <div className="no-action-message">Night phase: no action for your role.</div>;
  }

  const actionLabels = {
    chor: 'Choose a victim',
    daktar: 'Choose someone to save',
    police: 'Investigate a player'
  };

  return (
    <div className="night-actions-container">
      <h4 className="night-actions-title">Night Action</h4>
      <div className="night-actions-label">{actionLabels[myRole as keyof typeof actionLabels]}</div>
      <div className="night-actions-controls">
        <select className="select" value={target} onChange={(e) => setTarget(e.target.value)} disabled={!canAct}>
          <option value="">-- Select Player --</option>
          {Object.entries(livingPlayers).filter(([id, p]) => {
            if (p.alive === false) return false;
            // Thief cannot select themselves as victim
            if (myRole === 'chor' && id === playerId) return false;
            return true;
          }).map(([id, p]) => (
            <option key={id} value={id}>{p.name}</option>
          ))}
        </select>
        <button className="btn confirm-btn" disabled={!target || !canAct || actionSubmitted} onClick={async () => {
          const { setNightAction } = await import('../api/game');
          await setNightAction(gameCode, playerId, { type: myRole as 'chor' | 'daktar' | 'police', target });
          setActionSubmitted(true);
        }}>
          {actionSubmitted ? '✅ Action Submitted' : 'Confirm'}
        </button>
      </div>
    </div>
  );
}
