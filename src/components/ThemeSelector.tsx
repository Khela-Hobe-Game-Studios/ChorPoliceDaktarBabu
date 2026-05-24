import type { KuiTheme, KuiColorMode } from '@khelahobe/kui'

interface ThemeSelectorProps {
  currentTheme: KuiTheme
  onThemeChange: (theme: KuiTheme) => void
  colorMode: KuiColorMode
  onColorModeChange: (mode: KuiColorMode) => void
}

const THEMES: { id: KuiTheme; label: string }[] = [
  { id: 'default', label: 'Default' },
  { id: 'chor',    label: 'Red'     },
  { id: 'police',  label: 'Blue'    },
  { id: 'daktar',  label: 'Green'   },
]

export function ThemeSelector({
  currentTheme,
  onThemeChange,
  colorMode,
  onColorModeChange,
}: ThemeSelectorProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'center',
        padding: '16px 0 6px 0',
      }}
    >
      {THEMES.map(t => {
        const isActive = currentTheme === t.id
        return (
          <button
            key={t.id}
            data-kui-theme={t.id}
            data-kui-mode={colorMode}
            onClick={() => onThemeChange(t.id)}
            title={t.label}
            aria-label={`${t.label} theme`}
            aria-pressed={isActive}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: isActive
                ? '3px solid var(--kui-primary)'
                : '3px solid transparent',
              background: 'var(--kui-primary)',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
              outline: isActive ? '2px solid var(--kui-primary)' : 'none',
              outlineOffset: 2,
              transition: 'border 0.15s, outline 0.15s',
            }}
          />
        )
      })}

      <button
        onClick={() => onColorModeChange(colorMode === 'dark' ? 'light' : 'dark')}
        aria-label={colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          padding: '4px 10px',
          borderRadius: 'var(--kui-radius-full)',
          border: '1px solid var(--kui-border)',
          background: 'var(--kui-bg)',
          color: 'var(--kui-text)',
          cursor: 'pointer',
          fontSize: 14,
          fontFamily: 'var(--kui-font-sans)',
          lineHeight: 1,
          transition: 'background 0.15s, color 0.15s',
          flexShrink: 0,
        }}
      >
        {colorMode === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  )
}
