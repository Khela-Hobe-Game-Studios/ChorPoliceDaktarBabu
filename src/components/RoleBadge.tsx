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
  
  // Try to load image, fallback to text if not found
  const imagePath = `/src/assets/${role}.png`;
  
  return (
    <span className={`role-badge ${roleClass}`}>
      <img 
        src={imagePath} 
        alt={role}
        className="role-image"
        onError={(e) => {
          // Fallback to text if image fails to load
          e.currentTarget.style.display = 'none';
          const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
          if (nextElement) nextElement.style.display = 'inline';
        }}
      />
      <span className="role-text" style={{ display: 'none' }}>{label}</span>
    </span>
  );
}
