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
  const [voteSubmitted, setVoteSubmitted] = useState<boolean>(false);
  const others = Object.fromEntries(Object.entries(livingPlayers).filter(([id]) => id !== playerId));
  
  return (
    <div className="voting-container">
      {!isHost && (
        <>
          <h4 className="voting-title">Voting</h4>
          <div className="voting-controls">
            <select className="select" value={target} onChange={(e) => setTarget(e.target.value)} disabled={!canVote}>
              <option value="">-- Vote for --</option>
              {Object.entries(others).filter(([, p]) => p.alive !== false).map(([id, p]) => (
                <option key={id} value={id}>{p.name}</option>
              ))}
            </select>
            <button className="btn submit-vote-btn" disabled={!target || !canVote || voteSubmitted} onClick={async () => {
              const { setVote } = await import('../api/game');
              await setVote(gameCode, playerId, target);
              setVoteSubmitted(true);
            }}>
              {voteSubmitted ? '✅ Vote Submitted' : 'Submit Vote'}
            </button>
          </div>
        </>
      )}
      {isHost && (
        <button className="btn finalize-btn" onClick={async () => {
          const { finalizeVote } = await import('../api/game');
          await finalizeVote(gameCode);
        }}>Finalize Vote</button>
      )}
    </div>
  );
}
