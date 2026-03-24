// Attendance feature type definitions

export interface AttendanceSession {
  id?: string;
  title: string;
  date: string;
  type: string;
  year?: string;
  division?: string;
  platoon?: string;
  location?: string;
  createdAt: string;
  locked: boolean;
  totalCadets: number;
}

export interface AttendanceMark {
  sessionId: string;
  cadetId: string;
  status: AttendanceStatus;
  timestamp: string;
  deviceId?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'medical';

export interface AttendanceStats {
  sessionId: string;
  total: number;
  present: number;
  absent: number;
  leave: number;
  medical: number;
}
