interface RoleBadgeProps {
  role: string;
}

export function RoleBadge(props: RoleBadgeProps) {
  const { role } = props;
  const color = role === 'chor' ? '#e11d48' : role === 'daktar' ? '#16a34a' : role === 'police' ? '#2563eb' : '#6b7280';
  const label = role === 'chor' ? 'Chor 🦹‍♂️' : role === 'daktar' ? 'Daktar 💉' : role === 'police' ? 'Police 👮' : 'Babu 👤';
  return (
    <span style={{
      display: 'inline-block',
      padding: '6px 10px',
      borderRadius: 8,
      background: color,
      color: '#fff',
      fontWeight: 600,
    }}>{label}</span>
  );
}
