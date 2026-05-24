import { Badge } from '@khelahobe/kui'

interface RoleBadgeProps {
  role: string
}

const ROLE_VARIANT: Record<string, 'default' | 'night' | 'day' | 'voting' | 'lobby' | 'success' | 'danger'> = {
  chor: 'danger', police: 'night', daktar: 'success', babu: 'default',
}

const ROLE_LABEL: Record<string, string> = {
  chor: 'Chor 🦹‍♂️', police: 'Police 👮', daktar: 'Daktar 💉', babu: 'Babu 👤',
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <Badge variant={ROLE_VARIANT[role] ?? 'default'}>
      {ROLE_LABEL[role] ?? role}
    </Badge>
  )
}
