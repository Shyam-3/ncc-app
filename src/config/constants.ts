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
  LATE: 'L',
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
  { code: 'CQMS', name: 'Company Quarter Master Sergeant', order: 5 },
  { code: 'CSM', name: 'Company Sergeant Major', order: 6 },
  { code: 'CUO', name: 'Cadet Under Officer', order: 7 },
  { code: 'SUO', name: 'Senior Under Officer', order: 8 }
];

// Platoon/Company structure
export const PLATOONS = ['Alpha', 'Bravo', 'Charlie', 'Delta'] as const;
export type Platoon = typeof PLATOONS[number];

// Academic departments
export const DEPARTMENTS = [
  'Computer Science',
  'Electronics',
  'Mechanical',
  'Civil',
  'Electrical',
  'IT'
] as const;

export type Department = typeof DEPARTMENTS[number];

// Academic years
export const ACADEMIC_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'] as const;
export type AcademicYear = typeof ACADEMIC_YEARS[number];

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
