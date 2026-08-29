/**
 * Kindred design system — mirrors the web app's Tailwind brand palette.
 */
export const colors = {
  cream: '#FDFBF7',
  charcoal: '#2D2D2D',
  peach: '#E89E82',
  beige: '#F1ECE1',
  muted: '#8C8C8C',
  glow: '#FFE3D3',
  white: '#FFFFFF',
  danger: '#EF4444',
  success: '#34D399',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
};

/** Typography helpers approximating the web's serif/italic look. */
export const type = {
  serif: { fontStyle: 'italic' as const },
  caption: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 2.5,
    textTransform: 'uppercase' as const,
    color: colors.muted,
  },
};