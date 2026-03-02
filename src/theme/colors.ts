export interface AppColors {
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primarySoft: string;
  primaryBorder: string;
  primaryText: string;
  dataBlue: string;
  dataBlueSoft: string;
  success: string;
  warning: string;
  danger: string;
  navBg: string;
  navCard: string;
  navText: string;
  navTextActive: string;
}

export const lightColors: AppColors = {
  background: '#E9EEF4',
  card: '#FFFFFF',
  text: '#1F2937',
  muted: '#64748B',
  border: '#D8E0EA',
  primary: '#F97316',
  primarySoft: '#FFF1E8',
  primaryBorder: '#FDBA74',
  primaryText: '#9A3412',
  dataBlue: '#0EA5E9',
  dataBlueSoft: '#E0F2FE',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  navBg: '#262B35',
  navCard: '#4A4E57',
  navText: '#8FA0BC',
  navTextActive: '#FFFFFF',
};

export const darkColors: AppColors = {
  background: '#1E2128',
  card: '#343A45',
  text: '#FFFFFF',
  muted: '#C3CCD9',
  border: '#4A5361',
  primary: '#FB923C',
  primarySoft: '#4A3628',
  primaryBorder: '#F97316',
  primaryText: '#FFD0A8',
  dataBlue: '#39BDF8',
  dataBlueSoft: '#153A52',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  navBg: '#191C23',
  navCard: '#3A414C',
  navText: '#B7C0CD',
  navTextActive: '#FFFFFF',
};

// Legacy export used by screens that still import a static palette.
export const colors = lightColors;
