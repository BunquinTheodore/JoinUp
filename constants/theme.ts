/* ── Brand tokens ─────────────────────────────────────────── */
export const Colors = {
  primary: '#1B2D45',
  accent: '#FF6B35',
  peach: '#F7C59F',
  cream: '#FFF5EF',
  slate: '#8C9BB5',
  white: '#FFFFFF',
  text: '#1B2D45',
  textSecondary: '#5A6E8C',
  divider: '#E8ECF1',
  success: '#2ECC71',
  warning: '#F39C12',
  error: '#E74C3C',
  danger: '#E74C3C',
  overlay: 'rgba(27,45,69,0.5)',
} as const;

export const Typography = {
  heading: 'Syne_700Bold',
  body: 'DMSans_400Regular',
  bodyMed: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
  display: 'Syne_700Bold',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const BorderRadius = {
  sm: 8,
  card: 16,
  pill: 24,
  full: 9999,
  input: 12,
  button: 12,
  sheet: 24,
} as const;

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  fab: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;

export const Categories = [
  'All',
  'Fitness',
  'Study',
  'Café',
  'Outdoors',
  'Gaming',
  'Social',
  'Food',
  'Other',
] as const;

export const CategoryColors: Record<string, string> = {
  Fitness: '#FF6B35',
  Study: '#3498DB',
  Café: '#F39C12',
  Outdoors: '#2ECC71',
  Gaming: '#9B59B6',
  Social: '#E91E63',
  Food: '#E74C3C',
  Other: '#8C9BB5',
} as const;
