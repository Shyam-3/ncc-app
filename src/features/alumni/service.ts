import { db } from '@/shared/config/firebase';
import { addDoc, collection } from 'firebase/firestore';
import type { AlumniProfile, AlumniProfileSource } from './alumni.types';
import { DEPARTMENT_DEFS } from '@/shared/config/constants';

type CadetArchiveData = Record<string, unknown>;



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
  
  let academicYear: string | undefined;
  let nccTenure: string | undefined;

  if (typeof cadetData.dateOfEnrollment === 'string' && cadetData.dateOfEnrollment) {
    const enrollYear = new Date(cadetData.dateOfEnrollment).getFullYear();
    if (!isNaN(enrollYear)) {
      nccTenure = `${enrollYear}-${enrollYear + 3}`;
      const deptCode = cadetData.department as string;
      const dept = DEPARTMENT_DEFS.find(d => d.code === deptCode);
      const duration = dept?.courseTenure === 5 ? 5 : 4;
      academicYear = `${enrollYear}-${enrollYear + duration}`;
    }
  }

  return {
    name: String(cadetData.name || 'Unknown'),
    email: cadetData.email ? String(cadetData.email) : undefined,
    phone: cadetData.phone ? String(cadetData.phone) : undefined,
    bloodGroup: cadetData.bloodGroup ? String(cadetData.bloodGroup) : undefined,
    division: cadetData.division as AlumniProfile['division'],
    department: cadetData.department ? String(cadetData.department) : undefined,
    academicYear,
    nccTenure,
    rank: cadetData.rank ? String(cadetData.rank) : undefined,
    achievements: cadetData.achievements ? String(cadetData.achievements) : undefined,
    regimentalNumber: cadetData.regimentalNumber ? String(cadetData.regimentalNumber) : undefined,
    nccYear: cadetData.nccYear ? String(cadetData.nccYear) : undefined,
    year: cadetData.year ? String(cadetData.year) : undefined,
    photoURL: cadetData.photoURL ? String(cadetData.photoURL) : undefined,
    cloudinaryPublicId: cadetData.cloudinaryPublicId ? String(cadetData.cloudinaryPublicId) : undefined,
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
