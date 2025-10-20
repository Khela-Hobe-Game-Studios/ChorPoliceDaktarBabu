interface RoleRowProps {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
}

export function RoleRow(props: RoleRowProps) {
  const { label, value, onDec, onInc } = props;
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
  };
  const controlsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };
  const btnStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 6,
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  };
  const countStyle: React.CSSProperties = {
    minWidth: 28,
    textAlign: 'center',
    fontWeight: 600,
  };
  return (
    <div style={rowStyle}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <div style={controlsStyle}>
        <button style={btnStyle} onClick={onDec} aria-label={`Decrease ${label}`}>-</button>
        <span style={countStyle}>{value}</span>
        <button style={btnStyle} onClick={onInc} aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
