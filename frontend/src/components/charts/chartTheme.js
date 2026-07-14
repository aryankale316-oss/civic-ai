import { useTheme } from '../../context/ThemeContext';

// Roles from the dataviz reference palette — light and dark bands both
// validated against their respective chart surfaces (see palette.md).
const INK = {
  light: { secondary: '#52514e', muted: '#898781', grid: '#e1e0d9', axis: '#c3c2b7', cursor: '#f9f9f7', tooltipBg: '#fcfcfb', tooltipText: '#0b0b0b', tooltipBorder: '#e1e0d9' },
  dark: { secondary: '#c3c2b7', muted: '#898781', grid: '#2c2c2a', axis: '#383835', cursor: 'rgba(255,255,255,0.05)', tooltipBg: '#1a1a19', tooltipText: '#ffffff', tooltipBorder: '#383835' },
};

const SEQUENTIAL_BLUE = { light: '#2a78d6', dark: '#3987e5' };

// Status palette (fixed, never themed) mapped onto complaint priority levels
// — same steps clear 3:1 contrast on both the light and dark chart surface.
export const PRIORITY_COLORS = {
  Critical: '#d03b3b',
  High: '#ec835a',
  Medium: '#fab219',
  Low: '#0ca30c',
  Unclassified: '#c3c2b7',
};

export const PRIORITY_ORDER = ['Critical', 'High', 'Medium', 'Low', 'Unclassified'];

// Matches the SentimentBadge component's existing green/slate/red convention.
export const SENTIMENT_COLORS = {
  positive: '#0ca30c',
  neutral: '#c3c2b7',
  negative: '#d03b3b',
};

export function useChartTheme() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const ink = isDark ? INK.dark : INK.light;

  return {
    isDark,
    ink,
    sequentialBlue: isDark ? SEQUENTIAL_BLUE.dark : SEQUENTIAL_BLUE.light,
    cursorFill: ink.cursor,
    tooltipStyle: {
      borderRadius: 8,
      border: `1px solid ${ink.tooltipBorder}`,
      backgroundColor: ink.tooltipBg,
      color: ink.tooltipText,
      fontSize: 12,
    },
  };
}
