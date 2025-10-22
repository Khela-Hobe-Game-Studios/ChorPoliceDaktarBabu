interface RoleRowProps {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
}

export function RoleRow(props: RoleRowProps) {
  const { label, value, onDec, onInc } = props;
  
  return (
    <div className="role-row">
      <span className="role-row-label">{label}</span>
      <div className="role-row-controls">
        <button className="role-row-btn" onClick={onDec} aria-label={`Decrease ${label}`}>-</button>
        <span className="role-row-count">{value}</span>
        <button className="role-row-btn" onClick={onInc} aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
