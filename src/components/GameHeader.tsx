import { RoleBadge } from './RoleBadge';

interface GameHeaderProps {
  gameCode: string;
  phase: string | null;
  round: number;
  isHost: boolean;
  myRole: string;
  showRole: boolean;
  onToggleShowRole: () => void;
  onNextPhase: () => void;
  onResolveNight: () => void;
}

export function GameHeader(props: GameHeaderProps) {
  const { gameCode, phase, round, isHost, myRole, showRole, onToggleShowRole, onNextPhase, onResolveNight } = props;

  return (
    <div style={{ position: 'sticky', top: 0, background: '#fff', paddingBottom: 8, zIndex: 10, borderBottom: '1px solid #eee' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Game Code: {gameCode}</h3>
        {phase && <div>Phase: <strong>{phase}</strong> · Round: <strong>{round}</strong></div>}
        {isHost && phase && (
          <>
            <button onClick={onNextPhase}>Next Phase</button>
            {phase === 'night' && (
              <button style={{ marginLeft: 8 }} onClick={onResolveNight}>
                Resolve Night
              </button>
            )}
          </>
        )}
      </div>
      {!!myRole && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={onToggleShowRole}>
            {showRole ? 'Hide My Role' : 'Show My Role'}
          </button>
          {showRole && <RoleBadge role={myRole} />}
        </div>
      )}
    </div>
  );
}
