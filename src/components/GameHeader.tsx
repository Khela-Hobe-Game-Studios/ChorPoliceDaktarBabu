interface GameHeaderProps {
  gameCode: string;
  phase: string | null;
  round: number;
  isHost: boolean;
  gameEnded: boolean;
  onNextPhase: () => void;
  onResolveNight: () => void;
}

export function GameHeader(props: GameHeaderProps) {
  const { gameCode, phase, round, isHost, gameEnded, onNextPhase, onResolveNight } = props;

  return (
    <div className="game-header">
      <div className="game-header-content">
        <h3 className="game-header-title">Game Code: {gameCode}</h3>
        {phase && <div className="phase-info">Phase: <strong>{phase}</strong> · Round: <strong>{round}</strong></div>}
        {isHost && phase && !gameEnded && (
          <div className="host-controls">
            <button className="btn" onClick={onNextPhase}>Next Phase</button>
            {phase === 'night' && (
              <button className="btn resolve-night-btn" onClick={onResolveNight}>
                Resolve Night
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
