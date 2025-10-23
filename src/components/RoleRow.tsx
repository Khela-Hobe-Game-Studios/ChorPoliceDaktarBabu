interface RoleRowProps {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
}

export function RoleRow(props: RoleRowProps) {
  const { label, value, onDec, onInc } = props;
  
  const handleDec = () => {
    console.log('Decrease clicked for:', label);
    onDec();
  };
  
  const handleInc = () => {
    console.log('Increase clicked for:', label);
    onInc();
  };
  
  return (
    <div className="role-row">
      <span className="role-row-label">{label}</span>
      <div className="role-row-controls">
        <button className="role-row-btn" onClick={handleDec} aria-label={`Decrease ${label}`}>-</button>
        <span className="role-row-count">{value}</span>
        <button className="role-row-btn" onClick={handleInc} aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
