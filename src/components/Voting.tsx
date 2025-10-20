import { useState } from 'react';

interface VotingProps {
  gameCode: string;
  playerId: string;
  livingPlayers: Record<string, { name: string; alive?: boolean }>;
  isHost: boolean;
  canVote: boolean;
}

export function Voting(props: VotingProps) {
  const { gameCode, playerId, livingPlayers, isHost, canVote } = props;
  const [target, setTarget] = useState<string>("");
  const others = Object.fromEntries(Object.entries(livingPlayers).filter(([id]) => id !== playerId));
  
  return (
    <div style={{ border: '1px solid #ccc', padding: 12, borderRadius: 8, marginTop: 12 }}>
      <h4>Voting</h4>
      <select value={target} onChange={(e) => setTarget(e.target.value)} disabled={!canVote}>
        <option value="">-- Vote for --</option>
        {Object.entries(others).filter(([, p]) => p.alive !== false).map(([id, p]) => (
          <option key={id} value={id}>{p.name}</option>
        ))}
      </select>
      <button style={{ marginLeft: 8 }} disabled={!target || !canVote} onClick={async () => {
        const { setVote } = await import('../api/game');
        await setVote(gameCode, playerId, target);
        alert('Vote submitted');
      }}>Submit Vote</button>
      {isHost && (
        <button style={{ marginLeft: 8 }} onClick={async () => {
          const { finalizeVote } = await import('../api/game');
          await finalizeVote(gameCode);
        }}>Finalize</button>
      )}
    </div>
  );
}
