import { db } from '@/config/firebase';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';

export interface OnDutyTemplate {
  content: string;
  logoUrl: string;
}

export interface ReportTemplate {
  id: string;
  title: string;
  content: string;
  logoUrl?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const ON_DUTY_TEMPLATE_DOC_ID = 'onDutyLetter';

export const DEFAULT_ON_DUTY_TEMPLATE = `To
The Principal,
Thiagarajar College of Engineering, Madurai.

Respected Sir,

Sub: Request for On-Duty Permission - Reg.

Kindly permit the following NCC cadets to attend {{Reason}} at {{Location}} {{DateClause}} and grant them On-Duty.

Total Cadets: {{CadetCount}}

Thanking you,

Yours faithfully,`;

export async function getOnDutyTemplate(): Promise<OnDutyTemplate> {
  const templateRef = doc(db, 'reportTemplates', ON_DUTY_TEMPLATE_DOC_ID);
  const snapshot = await getDoc(templateRef);

  if (!snapshot.exists()) {
    return {
      content: DEFAULT_ON_DUTY_TEMPLATE,
      logoUrl: '',
    };
  }

  const data = snapshot.data() as Partial<OnDutyTemplate>;
  return {
    content: data.content || DEFAULT_ON_DUTY_TEMPLATE,
    logoUrl: data.logoUrl || '',
  };
}

export async function saveOnDutyTemplate(payload: OnDutyTemplate) {
  const templateRef = doc(db, 'reportTemplates', ON_DUTY_TEMPLATE_DOC_ID);
  await setDoc(templateRef, {
    id: ON_DUTY_TEMPLATE_DOC_ID,
    title: 'On-Duty Letter Template',
    content: payload.content,
    logoUrl: payload.logoUrl,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function listReportTemplates(): Promise<ReportTemplate[]> {
  const snapshot = await getDocs(collection(db, 'reportTemplates'));
  const items = snapshot.docs.map(docSnap => {
    const data = docSnap.data() as Partial<ReportTemplate>;
    return {
      id: docSnap.id,
      title: data.title || docSnap.id,
      content: data.content || '',
      logoUrl: data.logoUrl || '',
      description: data.description || '',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as ReportTemplate;
  });

  return items.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getReportTemplate(templateId: string): Promise<ReportTemplate | null> {
  const templateRef = doc(db, 'reportTemplates', templateId);
  const snapshot = await getDoc(templateRef);
  if (!snapshot.exists()) return null;

  const data = snapshot.data() as Partial<ReportTemplate>;
  return {
    id: snapshot.id,
    title: data.title || snapshot.id,
    content: data.content || '',
    logoUrl: data.logoUrl || '',
    description: data.description || '',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function saveReportTemplate(template: ReportTemplate) {
  const templateRef = doc(db, 'reportTemplates', template.id);
  await setDoc(templateRef, {
    id: template.id,
    title: template.title,
    content: template.content,
    logoUrl: template.logoUrl || '',
    description: template.description || '',
    createdAt: template.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function deleteReportTemplate(templateId: string) {
  const templateRef = doc(db, 'reportTemplates', templateId);
  await deleteDoc(templateRef);
}
