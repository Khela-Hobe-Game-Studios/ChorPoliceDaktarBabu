import { Button } from '@khelahobe/kui'

interface RoleRowProps {
  label: string
  value: number
  onDec: () => void
  onInc: () => void
}

export function RoleRow({ label, value, onDec, onInc }: RoleRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ flex: 1, fontFamily: 'var(--kui-font-sans)', fontSize: 'var(--kui-text-sm)', color: 'var(--kui-text)' }}>
        {label}
      </span>
      <Button size="sm" variant="secondary" onClick={onDec} aria-label={`Decrease ${label}`}>−</Button>
      <span style={{ width: 24, textAlign: 'center', fontFamily: 'var(--kui-font-display)', fontWeight: 700, color: 'var(--kui-text)' }}>
        {value}
      </span>
      <Button size="sm" variant="secondary" onClick={onInc} aria-label={`Increase ${label}`}>+</Button>
    </div>
  )
}
