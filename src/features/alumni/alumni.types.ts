export type AlumniProfileStatus = 'pending' | 'active' | 'rejected';
export type AlumniProfileSource = 'rollover' | 'deletion' | 'self_submit' | 'manual';

export interface AlumniProfile {
  name: string;
  email?: string;
  phone?: string;
  bloodGroup?: string;
  division?: 'SD' | 'SW';
  department?: string;
  passOutYear?: string;
  batchYears?: string;
  rank?: string;
  achievements?: string;
  regimentalNumber?: string;
  nccYear?: string;
  year?: string;
  status: AlumniProfileStatus;
  visible: boolean;
  source: AlumniProfileSource;
  createdAt: string;
  createdBy?: string;
  submittedAt?: string;
  archivedAt?: string;
  reasonForArchival?: string;
}
