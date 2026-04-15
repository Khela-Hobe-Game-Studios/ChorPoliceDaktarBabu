interface RoleDisplayProps {
  myRole: string;
  showRole: boolean;
  onToggleShowRole: () => void;
}

export function RoleDisplay(props: RoleDisplayProps) {
  const { myRole, showRole, onToggleShowRole } = props;

  if (!myRole) return null;

  return (
    <div className="role-display-container">
      {!showRole ? (
        <button className="role-display-button" onClick={onToggleShowRole}>
          Show Role
        </button>
      ) : (
        <div className="role-display-expanded">
          <div className="role-image-container">
            <img 
              src={`/src/assets/${myRole}.png`} 
              alt={myRole}
              className="role-image-large"
              onClick={onToggleShowRole}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'block';
              }}
            />
            <div className="role-fallback" style={{ display: 'none' }}>
              <div className="role-fallback-text">
                {myRole === 'chor' ? 'Chor 🦹‍♂️' : 
                 myRole === 'daktar' ? 'Daktar 💉' : 
                 myRole === 'police' ? 'Police 👮' : 'Babu 👤'}
              </div>
            </div>
            <button 
              className="role-minimize-button" 
              onClick={onToggleShowRole}
              title="Minimize"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
