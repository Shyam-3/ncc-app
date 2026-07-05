import { db } from '@/shared/config/firebase';
import { addDoc, collection } from 'firebase/firestore';
import type { AlumniProfile, AlumniProfileSource } from './alumni.types';

type CadetArchiveData = Record<string, unknown>;

function derivePassOutYear(data: CadetArchiveData): string {
  if (typeof data.passOutYear === 'string' && data.passOutYear.trim()) {
    return data.passOutYear.trim();
  }
  const year = String(data.year || data.nccYear || '');
  const match = year.match(/(\d+)/);
  if (match) {
    const currentYear = new Date().getFullYear();
    return String(currentYear);
  }
  return String(new Date().getFullYear());
}

export function buildAlumniProfileFromCadet(
  cadetData: CadetArchiveData,
  source: AlumniProfileSource,
  options?: {
    reasonForArchival?: string;
    createdBy?: string;
    status?: AlumniProfile['status'];
    visible?: boolean;
  }
): AlumniProfile {
  const now = new Date().toISOString();
  return {
    name: String(cadetData.name || 'Unknown'),
    email: cadetData.email ? String(cadetData.email) : undefined,
    phone: cadetData.phone ? String(cadetData.phone) : undefined,
    bloodGroup: cadetData.bloodGroup ? String(cadetData.bloodGroup) : undefined,
    division: cadetData.division as AlumniProfile['division'],
    department: cadetData.department ? String(cadetData.department) : undefined,
    passOutYear: derivePassOutYear(cadetData),
    batchYears: cadetData.batchYears ? String(cadetData.batchYears) : undefined,
    rank: cadetData.rank ? String(cadetData.rank) : undefined,
    achievements: cadetData.achievements ? String(cadetData.achievements) : undefined,
    regimentalNumber: cadetData.regimentalNumber ? String(cadetData.regimentalNumber) : undefined,
    nccYear: cadetData.nccYear ? String(cadetData.nccYear) : undefined,
    year: cadetData.year ? String(cadetData.year) : undefined,
    status: options?.status ?? 'active',
    visible: options?.visible ?? true,
    source,
    createdAt: now,
    createdBy: options?.createdBy,
    archivedAt: now,
    reasonForArchival: options?.reasonForArchival,
  };
}

export async function createAlumniProfileFromCadet(
  cadetData: CadetArchiveData,
  source: AlumniProfileSource,
  options?: {
    reasonForArchival?: string;
    createdBy?: string;
    status?: AlumniProfile['status'];
    visible?: boolean;
  }
): Promise<string> {
  const profile = buildAlumniProfileFromCadet(cadetData, source, options);
  const docRef = await addDoc(collection(db, 'alumniProfiles'), profile);
  return docRef.id;
}
