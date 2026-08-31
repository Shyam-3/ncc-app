import { db } from "@/shared/config/firebase";
import { addDoc, collection } from "firebase/firestore";
import type { AlumniProfile, AlumniProfileSource } from "./alumni.types";
import { DEPARTMENT_DEFS } from "@/shared/config/constants";

type CadetArchiveData = Record<string, unknown>;

export function buildAlumniProfileFromCadet(
  cadetData: CadetArchiveData,
  source: AlumniProfileSource,
  options?: {
    reasonForArchival?: string;
    createdBy?: string;
    status?: AlumniProfile["status"];
    visible?: boolean;
  },
): AlumniProfile {
  const now = new Date().toISOString();

  let academicYear: string | undefined;
  let nccTenure: string | undefined;

  if (
    typeof cadetData.dateOfEnrollment === "string" &&
    cadetData.dateOfEnrollment
  ) {
    const enrollYear = new Date(cadetData.dateOfEnrollment).getFullYear();
    if (!isNaN(enrollYear)) {
      nccTenure = `${enrollYear}-${enrollYear + 3}`;
    }
  }

  if (typeof cadetData.year === "string" && cadetData.year) {
    const is5Year = ["ARCH", "AMCS"].includes(String(cadetData.department));
    const courseDuration = is5Year ? 5 : 4;

    let numericYear = 99;
    const lower = cadetData.year.toLowerCase();
    if (lower.includes("1") || lower.includes("i ")) numericYear = 1;
    else if (lower.includes("2") || lower.includes("ii")) numericYear = 2;
    else if (lower.includes("3") || lower.includes("iii")) numericYear = 3;
    else if (lower.includes("4") || lower.includes("iv")) numericYear = 4;
    else if (lower.includes("5") || lower.includes("v")) numericYear = 5;

    if (numericYear <= 5) {
      const now = new Date();
      const currentAcademicYearEnd =
        now.getMonth() < 6 ? now.getFullYear() : now.getFullYear() + 1;
      const startYear = currentAcademicYearEnd - numericYear;
      academicYear = `${startYear}-${startYear + courseDuration}`;
    }
  }

  return {
    name: String(cadetData.name || "Unknown"),
    email: cadetData.email ? String(cadetData.email) : null,
    phone: cadetData.phone ? String(cadetData.phone) : null,
    bloodGroup: cadetData.bloodGroup ? String(cadetData.bloodGroup) : null,
    division: cadetData.division as AlumniProfile["division"],
    department: cadetData.department ? String(cadetData.department) : null,
    academicYear: academicYear || null,
    nccTenure: nccTenure || null,
    rank: cadetData.rank ? String(cadetData.rank) : null,
    achievements: cadetData.achievements
      ? String(cadetData.achievements)
      : null,
    regimentalNumber: cadetData.regimentalNumber
      ? String(cadetData.regimentalNumber)
      : null,
    nccYear: cadetData.nccYear ? String(cadetData.nccYear) : null,
    year: cadetData.year ? String(cadetData.year) : null,
    photoURL: cadetData.photoURL ? String(cadetData.photoURL) : null,
    cloudinaryPublicId: cadetData.cloudinaryPublicId
      ? String(cadetData.cloudinaryPublicId)
      : null,
    status: options?.status ?? "active",
    visible: options?.visible ?? true,
    source,
    createdAt: now,
    createdBy: options?.createdBy || null,
    archivedAt: now,
    reasonForArchival: options?.reasonForArchival || null,
  } as unknown as AlumniProfile;
}

export async function createAlumniProfileFromCadet(
  cadetData: CadetArchiveData,
  source: AlumniProfileSource,
  options?: {
    reasonForArchival?: string;
    createdBy?: string;
    status?: AlumniProfile["status"];
    visible?: boolean;
  },
): Promise<string> {
  const profile = buildAlumniProfileFromCadet(cadetData, source, options);
  const docRef = await addDoc(collection(db, "alumniProfiles"), profile);
  return docRef.id;
}
