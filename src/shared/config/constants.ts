// User roles
export const ROLES = {
  VISITOR: 'visitor',
  MEMBER: 'member',         // basic role (trainee)
  SUBADMIN: 'subadmin',     // helper to admins
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
  ALUMNI: 'alumni'
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

// Attendance status
export const ATTENDANCE_STATUS = {
  PRESENT: 'P',
  ABSENT: 'A'
} as const;

export type AttendanceStatus = typeof ATTENDANCE_STATUS[keyof typeof ATTENDANCE_STATUS];

// Event types
export const EVENT_TYPES = {
  CAMP: 'camp',
  PARADE: 'parade',
  TRAINING: 'training',
  COMPETITION: 'competition',
  SOCIAL_WORK: 'social_work',
  NATIONAL_DAY: 'national_day',
  OTHER: 'other'
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

// Duty roles
export const DUTY_ROLES = {
  ORDERLY: 'orderly',
  OFFICE: 'office',
  QUARTER_GUARD: 'quarter_guard',
  FLAG_DETAIL: 'flag_detail'
} as const;

export type DutyRole = typeof DUTY_ROLES[keyof typeof DUTY_ROLES];

// NCC Ranks (Army Wing)
export interface Rank {
  code: string;
  name: string;
  order: number;
}

export const NCC_RANKS: Rank[] = [
  { code: 'CDT', name: 'Cadet', order: 1 },
  { code: 'LCPL', name: 'Lance Corporal', order: 2 },
  { code: 'CPL', name: 'Corporal', order: 3 },
  { code: 'SGT', name: 'Sergeant', order: 4 },
  { code: 'CSM', name: 'Company Sergeant Major', order: 5 },
  { code: 'CQMS', name: 'Company Quarter Master Sergeant', order: 6 },
  { code: 'CUO', name: 'Cadet Under Officer', order: 7 },
  { code: 'SUO', name: 'Senior Under Officer', order: 8 }
];

// Academic departments
export interface DepartmentDef {
  code: string;
  name: string;
}

export const DEPARTMENT_DEFS = [
  { code: 'IT', name: 'Information Technology' },
  { code: 'CSE', name: 'Computer Science and Engineering' },
  { code: 'ECE', name: 'Electronics and Communication Engineering' },
  { code: 'EEE', name: 'Electrical and Electronics Engineering' },
  { code: 'AMCS', name: 'Data Science' },
  { code: 'CSE AIML', name: 'Computer Science and Engineering (AI & ML)' },
  { code: 'MECH', name: 'Mechanical Engineering' },
  { code: 'MECT', name: 'Mechatronics Engineering' },
  { code: 'CIVIL', name: 'Civil Engineering' },
  { code: 'CSBS', name: 'Computer Science and Business Systems' },
  { code: 'ARCH', name: 'Architecture' }
] as const;

export type Department = typeof DEPARTMENT_DEFS[number]['code'];

// Academic years
export const ACADEMIC_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'] as const;
export type AcademicYear = typeof ACADEMIC_YEARS[number];

// Academic year equivalent aliases.
// Keep ACADEMIC_YEARS canonical to avoid breaking existing UI select/options.
export const ACADEMIC_YEAR_EQUIVALENTS: Record<AcademicYear, readonly string[]> = {
  '1st Year': ['1st Year', '1st', '1', 'I'],
  '2nd Year': ['2nd Year', '2nd', '2', 'II'],
  '3rd Year': ['3rd Year', '3rd', '3', 'III'],
  '4th Year': ['4th Year', '4th', '4', 'IV'],
  '5th Year': ['5th Year', '5th', '5', 'V'],
} as const;

// Year display helpers
export const ROMAN_YEAR_MAP: Record<string, string> = {
  '1st': 'I',
  '2nd': 'II',
  '3rd': 'III',
  '4th': 'IV',
  '5th': 'V',
  '1': 'I',
  '2': 'II',
  '3': 'III',
  '4': 'IV',
  '5': 'V',
  'I': 'I',
  'II': 'II',
  'III': 'III',
  'IV': 'IV',
  'V': 'V',
  '1st Year': 'I',
  '2nd Year': 'II',
  '3rd Year': 'III',
  '4th Year': 'IV',
  '5th Year': 'V',
};

// Notification channels
export const NOTIFICATION_CHANNELS = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  SMS: 'sms',
  WHATSAPP: 'whatsapp'
} as const;

export type NotificationChannel = typeof NOTIFICATION_CHANNELS[keyof typeof NOTIFICATION_CHANNELS];

// Export formats
export const EXPORT_FORMATS = {
  CSV: 'csv',
  EXCEL: 'xlsx',
  PDF: 'pdf'
} as const;

export type ExportFormat = typeof EXPORT_FORMATS[keyof typeof EXPORT_FORMATS];

// NCC Divisions (only SD and SW for this unit)
export const DIVISIONS = ['SD', 'SW'] as const;
export type Division = typeof DIVISIONS[number];

export const DIVISION_LABELS: Record<Division, string> = {
  SD: 'Senior Division',
  SW: 'Senior Wing',
};

// NCC Training Years (1st, 2nd, 3rd year of NCC training)
export const NCC_YEARS = ['1st Year', '2nd Year', '3rd Year'] as const;
export type NccYear = typeof NCC_YEARS[number];

// NCC year equivalent aliases.
// Keep NCC_YEARS canonical to avoid side effects in existing modules.
export const NCC_YEAR_EQUIVALENTS: Record<NccYear, readonly string[]> = {
  '1st Year': ['1st Year', '1st', '1', 'I'],
  '2nd Year': ['2nd Year', '2nd', '2', 'II'],
  '3rd Year': ['3rd Year', '3rd', '3', 'III'],
} as const;

const normalizeYearToken = (value: string | number): string =>
  String(value).trim().toLowerCase().replace(/\s+/g, '');

const ACADEMIC_YEAR_ALIAS_MAP: Record<string, AcademicYear> = Object.entries(ACADEMIC_YEAR_EQUIVALENTS)
  .reduce((acc, [canonical, aliases]) => {
    aliases.forEach((alias) => {
      acc[normalizeYearToken(alias)] = canonical as AcademicYear;
    });
    return acc;
  }, {} as Record<string, AcademicYear>);

const NCC_YEAR_ALIAS_MAP: Record<string, NccYear> = Object.entries(NCC_YEAR_EQUIVALENTS)
  .reduce((acc, [canonical, aliases]) => {
    aliases.forEach((alias) => {
      acc[normalizeYearToken(alias)] = canonical as NccYear;
    });
    return acc;
  }, {} as Record<string, NccYear>);

export function normalizeAcademicYear(
  value?: string | number | null
): AcademicYear | '' {
  if (value === undefined || value === null) return '';
  return ACADEMIC_YEAR_ALIAS_MAP[normalizeYearToken(value)] || '';
}

export function normalizeNccYear(
  value?: string | number | null
): NccYear | '' {
  if (value === undefined || value === null) return '';
  return NCC_YEAR_ALIAS_MAP[normalizeYearToken(value)] || '';
}

// Attendance thresholds
export const ATTENDANCE_THRESHOLDS = {
  LOW: 75,      // Below this is low attendance
  GOOD: 85,     // Above this is good
  EXCELLENT: 95 // Above this is excellent
} as const;
