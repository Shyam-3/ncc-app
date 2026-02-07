// Type definitions for the application

import { AcademicYear, AttendanceStatus, Department, EventType, Platoon, UserRole } from '../config/constants';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'pending' | 'active' | 'inactive' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface Cadet {
  userId: string;
  
  // Personal Details
  name: string;
  dateOfBirth: string;
  email: string;
  
  // NCC Details
  division: 'SD' | 'SW';
  regimentalNumber: string;
  platoon: Platoon | string;
  dateOfEnrollment: string;
  rank: string;
  
  // Academic Details
  year: AcademicYear | string;
  department: Department | string;
  rollNo: string;
  registerNumber: string;
  
  // Additional Details
  phone: string;
  bloodGroup: string;
  address?: string;
  
  // System fields
  joinDate: string;
  nccNo?: string;
}

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

export interface Event {
  id?: string;
  title: string;
  type: EventType;
  startAt: string;
  endAt: string;
  location: string;
  capacity?: number;
  description?: string;
}

export interface Duty {
  id?: string;
  role: string;
  date: string;
  startAt: string;
  endAt: string;
  location?: string;
  notes?: string;
}

export interface GalleryAlbum {
  id?: string;
  title: string;
  eventId?: string;
  visibility: 'public' | 'private';
}

export interface Achievement {
  id?: string;
  cadetId: string;
  title: string;
  level: string;
  date: string;
  proofUrl?: string;
}

export interface Notification {
  id?: string;
  title: string;
  body: string;
  audienceFilter: string;
  channel: string;
  sentAt: string;
}

// CMS document types
export interface CmsSection {
  heading: string;
  body: string;
}

export interface CmsDoc {
  title: string;
  sections: CmsSection[];
  updatedAt?: string;
  updatedBy?: string;
  visibility?: 'public' | 'private';
}
