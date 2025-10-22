interface RoleBadgeProps {
  role: string;
}

export function RoleBadge(props: RoleBadgeProps) {
  const { role } = props;
  const label = role === 'chor' ? 'Chor 🦹‍♂️' : role === 'daktar' ? 'Daktar 💉' : role === 'police' ? 'Police 👮' : 'Babu 👤';
  const roleClass = role === 'chor' ? 'role-badge--chor' : 
                   role === 'daktar' ? 'role-badge--daktar' : 
                   role === 'police' ? 'role-badge--police' : 
                   'role-badge--babu';
  
  return (
    <span className={`role-badge ${roleClass}`}>{label}</span>
  );
}
