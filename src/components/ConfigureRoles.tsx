import { RoleRow } from './RoleRow';
import { getDefaultRolesByCount } from '../utils';
import { updateRoleConfig } from '../api/game';

interface ConfigureRolesProps {
  roles: { chor: number; daktar: number; police: number; babu: number };
  totalPlayers: number;
  gameCode: string;
  onRoleChange: (key: 'chor' | 'daktar' | 'police', delta: number) => void;
  onRolesChange: (roles: { chor: number; daktar: number; police: number; babu: number }) => void;
  onStartGame: () => void;
}

export function ConfigureRoles(props: ConfigureRolesProps) {
  const { roles, totalPlayers, gameCode, onRoleChange, onRolesChange, onStartGame } = props;
  
  const autoBabu = Math.max(0, totalPlayers - (roles.chor + roles.daktar + roles.police));

  const setRole = (key: 'chor' | 'daktar' | 'police', delta: number) => {
    const currentValue = key === 'chor' ? roles.chor : key === 'daktar' ? roles.daktar : roles.police;
    const nextValue = Math.max(0, currentValue + delta);
    const next = { ...roles, [key]: nextValue };
    next.babu = Math.max(0, totalPlayers - (next.chor + next.daktar + next.police));
    onRolesChange(next);
  };

  const saveRoles = async () => {
    await updateRoleConfig(gameCode, { ...roles, babu: autoBabu });
  };

  const isConfigValid = () => {
    if (!totalPlayers) return false;
    if (roles.chor < 1) return false;
    if ((roles.chor + roles.daktar + roles.police + autoBabu) !== totalPlayers) return false;
    return true;
  };

  const handleStartGame = async () => {
    if (!isConfigValid()) return;
    await saveRoles();
    onStartGame();
  };

  return (
    <div className="configure-roles">
      <h4 className="configure-roles-title">Configure Roles</h4>
      <RoleRow label="Chor 🦹‍♂️" value={roles.chor} onDec={() => setRole('chor', -1)} onInc={() => setRole('chor', +1)} />
      <RoleRow label="Daktar 💉" value={roles.daktar} onDec={() => setRole('daktar', -1)} onInc={() => setRole('daktar', +1)} />
      <RoleRow label="Police 👮" value={roles.police} onDec={() => setRole('police', -1)} onInc={() => setRole('police', +1)} />
      <div className="babu-info">Babu 👤: {autoBabu} (auto)</div>

      <div className="validation-errors">
        {roles.chor < 1 && <div className="validation-error">At least 1 Chor required.</div>}
        {roles.chor > Math.floor(totalPlayers * 0.4) && totalPlayers > 0 && (
          <div className="validation-error">Warning: Chor exceed 40% of players.</div>
        )}
        {autoBabu < 2 && totalPlayers >= 4 && (
          <div className="validation-error">Warning: At least 2 Babu recommended.</div>
        )}
        {(roles.chor + roles.daktar + roles.police + autoBabu) !== totalPlayers && (
          <div className="validation-error">Total roles must equal total players.</div>
        )}
      </div>
      <button className="btn save-roles-btn" onClick={saveRoles}>Save Role Config</button>
      <div className="configure-controls">
        <button className="btn start-game-btn" disabled={!isConfigValid()} onClick={handleStartGame}>
          Start Game
        </button>
        <button className="btn reset-default-btn" onClick={() => onRolesChange(getDefaultRolesByCount(totalPlayers))}>
          Reset to Default
        </button>
      </div>
    </div>
  );
}
