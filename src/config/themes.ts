export interface Theme {
  primary: string;
  secondary: string;
  tertiary: string;
  background: string;
  text: string;
  border: string;
}

export const themes: Record<string, Theme> = {
  default: {
    primary: '#6b73ff',
    secondary: '#ff9a9e',
    tertiary: '#ff6b6b',
    background: '#f0f4ff',
    text: '#4a5568',
    border: '#6b73ff'
  },
  chor: {
    primary: '#8B0000',
    secondary: '#FF6B6B',
    tertiary: '#FFD700',
    background: '#FFF5F5',
    text: '#2C1810',
    border: '#8B0000'
  },
  daktar: {
    primary: '#006400',
    secondary: '#00FF7F',
    tertiary: '#FF1493',
    background: '#F0FFF0',
    text: '#2F4F4F',
    border: '#006400'
  },
  police: {
    primary: '#000080',
    secondary: '#87CEEB',
    tertiary: '#FF4500',
    background: '#F0F8FF',
    text: '#191970',
    border: '#000080'
  },
  babu: {
    primary: '#8B4513',
    secondary: '#DDA0DD',
    tertiary: '#FF69B4',
    background: '#FFF8DC',
    text: '#654321',
    border: '#8B4513'
  }
};
