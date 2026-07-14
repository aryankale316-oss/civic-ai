import { useTheme } from '../../context/ThemeContext';

// Derived from the civic design tokens (see index.css @theme) rather than a
// separate palette — light band reads off paper/ink, dark band off the
// board casing.
const INK = {
  light: { secondary: '#5b6472', muted: '#8a92a0', grid: '#d9d7c9', axis: '#c7c4b3', cursor: '#e7dfc6', tooltipBg: '#ffffff', tooltipText: '#1c2b45', tooltipBorder: '#d9d7c9' },
  dark: { secondary: '#eef0ea', muted: '#8a92a0', grid: '#262b33', axis: '#33383f', cursor: 'rgba(238,240,234,0.06)', tooltipBg: '#14171c', tooltipText: '#eef0ea', tooltipBorder: '#262b33' },
};

const SEQUENTIAL_BRASS = { light: '#b8893e', dark: '#c9994f' };

// Status palette (fixed, never themed) mapped onto complaint priority levels
// — matches the StatusFlap tone mapping in Badges.jsx.
export const PRIORITY_COLORS = {
  Critical: '#b23a2e',
  High: '#c68a2e',
  Medium: '#b8893e',
  Low: '#5b6472',
  Unclassified: '#c7c4b3',
};

export const PRIORITY_ORDER = ['Critical', 'High', 'Medium', 'Low', 'Unclassified'];

// Matches the SentimentBadge component's seal-green/ink-soft/stamp-red convention.
export const SENTIMENT_COLORS = {
  positive: '#3c7a5a',
  neutral: '#5b6472',
  negative: '#b23a2e',
};

export function useChartTheme() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const ink = isDark ? INK.dark : INK.light;

  return {
    isDark,
    ink,
    sequentialBlue: isDark ? SEQUENTIAL_BRASS.dark : SEQUENTIAL_BRASS.light,
    cursorFill: ink.cursor,
    tooltipStyle: {
      borderRadius: 3,
      border: `1px solid ${ink.tooltipBorder}`,
      backgroundColor: ink.tooltipBg,
      color: ink.tooltipText,
      fontSize: 12,
      fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
    },
  };
}
