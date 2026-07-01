// Reports feature type definitions

export interface Report {
  id?: string;
  title: string;
  type: ReportType;
  templateId: string;
  generatedAt: string;
  createdBy: string;
  data: Record<string, any>;
}

export type ReportType = 'on-duty-letter' | 'attendance' | 'performance' | 'activity';

export interface ReportTemplate {
  id?: string;
  name: string;
  type: ReportType;
  fields: TemplateField[];
  html: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'textarea';
  required: boolean;
  options?: string[];
}

export interface OnDutyLetterData {
  cadetName: string;
  cadetRank: string;
  regimentalNumber: string;
  division: string;
  fromDate: string;
  toDate: string;
  location: string;
  purpose: string;
  issuingOfficer: string;
}
