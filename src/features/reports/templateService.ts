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
export const ON_DUTY_HEADER_TEMPLATE_DOC_ID = 'onDutyHeader';

export const DEFAULT_ON_DUTY_HEADER_TEMPLATE = `<div style="display:flex; align-items:center; gap:12px; border-bottom:1px solid #222; padding-bottom:10px;">
  {{LogoBlock}}
  <div style="flex:1; text-align:center;">
    <div style="font-weight:700; font-size:16px;">THIAGARAJAR COLLEGE OF ENGINEERING, MADURAI - 15.</div>
    <div style="font-size:12px; margin-top:2px;">(A Govt. aided autonomous Institution, Affiliated to Anna University)</div>
    <div style="font-size:12px; margin-top:4px;">4 (TN) ENGR COY, NCC - MADURAI</div>
  </div>
</div>`;

export const DEFAULT_ON_DUTY_TEMPLATE = `<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-top:10px;">
  <div>
    <div>To</div>
    <div style="margin-left:34px; margin-top:4px;">
      The Principal,<br/>
      Thiagarajar College of Engineering,<br/>
      Madurai -15.
    </div>
  </div>
  <div style="font-weight:700;">{{LetterDate}}</div>
</div>

<p style="margin-top:22px;">Respected Sir,</p>

<p style="font-weight:700; margin-left:34px;">Sub: Request for On-Duty Permission - Reg.</p>

<p style="text-align:justify; text-indent:40px; margin-top:12px;">
  Kindly permit the following NCC cadets to attend <strong>{{Reason}}</strong> at <strong>{{Location}}</strong> {{DateClause}} and grant them On-Duty.
</p>

<p style="margin-top:10px;">Total Cadets: {{CadetCount}}</p>

<p style="margin-top:64px; text-align:center;">Thanking you</p>`;

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

export async function getOnDutyHeaderTemplate(): Promise<OnDutyTemplate> {
  const templateRef = doc(db, 'reportTemplates', ON_DUTY_HEADER_TEMPLATE_DOC_ID);
  const snapshot = await getDoc(templateRef);

  if (!snapshot.exists()) {
    return {
      content: DEFAULT_ON_DUTY_HEADER_TEMPLATE,
      logoUrl: '',
    };
  }

  const data = snapshot.data() as Partial<OnDutyTemplate>;
  return {
    content: data.content || DEFAULT_ON_DUTY_HEADER_TEMPLATE,
    logoUrl: data.logoUrl || '',
  };
}

export async function getOnDutyTemplateById(templateId: string, fallbackContent = ''): Promise<OnDutyTemplate> {
  const templateRef = doc(db, 'reportTemplates', templateId);
  const snapshot = await getDoc(templateRef);

  if (!snapshot.exists()) {
    return {
      content: fallbackContent,
      logoUrl: '',
    };
  }

  const data = snapshot.data() as Partial<OnDutyTemplate>;
  return {
    content: data.content || fallbackContent,
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
