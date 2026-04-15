import { themes } from '../config/themes';

interface ThemeSelectorProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

export function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  const themeConfigs = [
    { id: 'chor', name: 'Chor Theme', colors: themes.chor },
    { id: 'daktar', name: 'Daktar Theme', colors: themes.daktar },
    { id: 'police', name: 'Police Theme', colors: themes.police },
    { id: 'babu', name: 'Babu Theme', colors: themes.babu }
  ];

  return (
    <div className="theme-selector">
      <div className="theme-options">
        {themeConfigs.map((theme) => (
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
