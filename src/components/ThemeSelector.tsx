interface ThemeSelectorProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

export function ThemeSelector(props: ThemeSelectorProps) {
  const { currentTheme, onThemeChange } = props;

  const themes = [
    {
      id: 'chor',
      name: 'Chor Theme',
      colors: {
        primary: '#8B0000',      // Dark red
        secondary: '#FF6B6B',   // Bright red
        tertiary: '#FFD700',     // Gold
        background: '#FFF5F5',   // Light red
        text: '#2C1810',         // Dark brown
        border: '#8B0000'        // Dark red
      }
    },
    {
      id: 'daktar',
      name: 'Daktar Theme',
      colors: {
        primary: '#006400',      // Dark green
        secondary: '#00FF7F',     // Spring green
        tertiary: '#FF1493',     // Deep pink
        background: '#F0FFF0',   // Honeydew
        text: '#2F4F4F',         // Dark slate gray
        border: '#006400'        // Dark green
      }
    },
    {
      id: 'police',
      name: 'Police Theme',
      colors: {
        primary: '#000080',      // Navy blue
        secondary: '#87CEEB',    // Sky blue
        tertiary: '#FF4500',     // Orange red
        background: '#F0F8FF',   // Alice blue
        text: '#191970',         // Midnight blue
        border: '#000080'        // Navy blue
      }
    },
    {
      id: 'babu',
      name: 'Babu Theme',
      colors: {
        primary: '#8B4513',      // Saddle brown
        secondary: '#DDA0DD',    // Plum
        tertiary: '#FF69B4',     // Hot pink
        background: '#FFF8DC',   // Cornsilk
        text: '#654321',         // Dark brown
        border: '#8B4513'        // Saddle brown
      }
    }
  ];

  return (
    <div className="theme-selector">
      <div className="theme-options">
        {themes.map((theme) => (
          <label key={theme.id} className="theme-option">
            <input
              type="radio"
              name="theme"
              value={theme.id}
              checked={currentTheme === theme.id}
              onChange={(e) => onThemeChange(e.target.value)}
            />
            <div 
              className="theme-radio"
              style={{
                backgroundColor: theme.colors.secondary,
                borderColor: theme.colors.secondary
              }}
            >
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
