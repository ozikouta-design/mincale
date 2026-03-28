/**
 * みんカレ Design System
 * Premium indigo-based palette with clean surfaces
 */

export const C = {
  // Brand
  primary:      '#5B5BD6',
  primaryDark:  '#4646B5',
  primaryLight: '#EEEEFB',
  primaryGlow:  'rgba(91,91,214,0.12)',

  // Status
  success:      '#22C55E',
  successLight: '#DCFCE7',
  danger:       '#EF4444',
  dangerLight:  '#FEE2E2',
  warning:      '#F59E0B',

  // Calendar
  today:        '#5B5BD6',
  currentTime:  '#F97316',
  sunday:       '#EF4444',
  saturday:     '#3B82F6',

  // Surfaces
  bg:           '#F5F6FC',
  card:         '#FFFFFF',
  input:        '#F5F6FC',

  // Borders
  border:       '#E4E6F0',
  borderLight:  '#EEF0F8',

  // Text
  text:         '#0F172A',
  textSub:      '#64748B',
  textMuted:    '#94A3B8',
  inverse:      '#FFFFFF',

  // Google brand colors (keep for auth UI)
  gBlue:        '#4285F4',
  gGreen:       '#34A853',
  gRed:         '#EA4335',
} as const;

export const SHADOW = {
  xs: {
    shadowColor: '#1E1E5E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowColor: '#1E1E5E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#1E1E5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
  },
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

export const R = {
  xs:   6,
  sm:   10,
  md:   14,
  lg:   18,
  xl:   24,
  full: 9999,
} as const;
