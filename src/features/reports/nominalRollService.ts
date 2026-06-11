import * as XLSX from 'xlsx';
import type { NccYear } from '@/shared/config/constants';
import { ROMAN_YEAR_MAP } from '@/shared/config/constants';
import { getCadetsByDivision } from '@/features/attendance/service';
import type { Cadet } from '@/shared/types';

// ============ TYPES ============

export interface NominalRollPreview {
  nccYear: NccYear;
  sdCadetCount: number;
  swCadetCount: number;
}

// ============ CONSTANTS ============

const UNIT_NAME = '4(TN)ENG COY,NCC';
const GROUP_HQ = 'NCC GROUP HQ, MADURAI-02';
const DIRECTORATE = 'TN,PY&AN,CHENNAI-09';
const INSTITUTION = 'THIAGARAJAR COLLEGE OF ENGINEERING';

const COLUMN_HEADERS = [
  'S. NO',
  'REGIMENTAL NO.',
  'DEPARTMENT',
  'NAME OF THE CADET',
  'RANK',
  'D.O.E',
  'D.O.B',
  'MOBILE NO.',
  'MAIL ID',
  "FATHER'S NAME / GUARDIAN'S NAME",
  'DAY SCHOLAR/HOSTELLER',
  'BLOOD GROUP',
  'AADHAR NUMBER',
  'BANK NAME',
  'BANK A/C no.',
  'IFSC CODE',
  'BANK BRANCH ADDRESS',
  'GENDER',
  'ADDRESS',
];

const TOTAL_COLS = COLUMN_HEADERS.length;

// ============ HELPERS ============

function getNccYearRoman(nccYear: NccYear): string {
  const prefix = nccYear.replace(' Year', '');
  return ROMAN_YEAR_MAP[prefix] || prefix;
}

function getNccYearText(nccYear: NccYear): string {
  const roman = getNccYearRoman(nccYear);
  const map: Record<string, string> = { I: 'FIRST', II: 'SECOND', III: 'THIRD' };
  return map[roman] || roman;
}

function formatDateForExcel(dateStr: string): string {
  // Convert YYYY-MM-DD to DD/MM/YYYY or M/D/YYYY
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const year = parts[0];
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

function sortByRegimentalNumber(cadets: (Cadet & { id: string })[]): (Cadet & { id: string })[] {
  return [...cadets].sort((a, b) => {
    const aReg = a.regimentalNumber || '';
    const bReg = b.regimentalNumber || '';
    return aReg.localeCompare(bReg, undefined, { numeric: true });
  });
}

function getGenderFromDivision(division: string): string {
  return division === 'SD' ? 'MALE' : 'FEMALE';
}

function buildCadetRow(
  serial: number,
  cadet: Cadet & { id: string },
  division: string
): (string | number)[] {
  return [
    serial,
    cadet.regimentalNumber || '',
    cadet.department || '',
    cadet.name || '',
    cadet.rank || 'CDT',
    cadet.dateOfEnrollment ? formatDateForExcel(cadet.dateOfEnrollment) : '',
    cadet.dateOfBirth ? formatDateForExcel(cadet.dateOfBirth) : '',
    cadet.phone || '',
    cadet.email || '',
    cadet.fatherName || '',
    cadet.residentialStatus || '',
    cadet.bloodGroup || '',
    '', // AADHAR NUMBER
    '', // BANK NAME
    '', // BANK A/C no.
    '', // IFSC CODE
    '', // BANK BRANCH ADDRESS
    getGenderFromDivision(division),
    cadet.address || '',
  ];
}

// ============ PREVIEW ============

export async function getNominalRollPreview(nccYear: NccYear): Promise<NominalRollPreview> {
  const [sdCadets, swCadets] = await Promise.all([
    getCadetsByDivision('SD', nccYear),
    getCadetsByDivision('SW', nccYear),
  ]);

  return {
    nccYear,
    sdCadetCount: sdCadets.length,
    swCadetCount: swCadets.length,
  };
}

// ============ EXCEL GENERATION ============

export async function generateNominalRollExcel(
  nccYear: NccYear,
  academicYearLabel: string
): Promise<void> {
  const [sdCadets, swCadets] = await Promise.all([
    getCadetsByDivision('SD', nccYear),
    getCadetsByDivision('SW', nccYear),
  ]);

  const sortedSd = sortByRegimentalNumber(sdCadets);
  const sortedSw = sortByRegimentalNumber(swCadets);

  const yearText = getNccYearText(nccYear);
  const wsData: (string | number | null)[][] = [];

  // Row 0: Title
  const row0: (string | null)[] = [
    `                                                                                                                                                              NOMINAL ROLL FOR ${yearText} YEAR ${academicYearLabel}`,
  ];
  for (let i = 1; i < TOTAL_COLS; i++) row0.push(null);
  wsData.push(row0);

  // Row 1: Subtitle
  const row1: (string | null)[] = [
    '                                                                                                                                                                      SENIOR DIVISION / SENIOR WING',
  ];
  for (let i = 1; i < TOTAL_COLS; i++) row1.push(null);
  wsData.push(row1);

  // Row 2: Unit name
  const row2: (string | null)[] = [`NAME OF UNIT                    :        ${UNIT_NAME}`];
  for (let i = 1; i < TOTAL_COLS; i++) row2.push(null);
  wsData.push(row2);

  // Row 3: Group HQ
  const row3: (string | null)[] = [`NCC GROUP HQ                   :        ${GROUP_HQ}`];
  for (let i = 1; i < TOTAL_COLS; i++) row3.push(null);
  wsData.push(row3);

  // Row 4: Directorate
  const row4: (string | null)[] = [`NCC DIRECTORATE            :        ${DIRECTORATE}`];
  for (let i = 1; i < TOTAL_COLS; i++) row4.push(null);
  wsData.push(row4);

  // Row 5: Institution
  const row5: (string | null)[] = [`NAME OF INSTITUTION     :        ${INSTITUTION}`];
  for (let i = 1; i < TOTAL_COLS; i++) row5.push(null);
  wsData.push(row5);

  // Row 6: Empty
  wsData.push(Array(TOTAL_COLS).fill(null));

  // Row 7: Column headers
  wsData.push([...COLUMN_HEADERS]);

  // Row 8: "SENIOR DIVISION" header
  const sdHeader: (string | null)[] = ['SENIOR DIVISION'];
  for (let i = 1; i < TOTAL_COLS; i++) sdHeader.push(null);
  wsData.push(sdHeader);

  // SD Cadet rows
  sortedSd.forEach((cadet, idx) => {
    wsData.push(buildCadetRow(idx + 1, cadet, 'SD'));
  });

  // Empty row between SD and SW
  wsData.push(Array(TOTAL_COLS).fill(null));

  // "SENIOR WING" header
  const swHeader: (string | null)[] = ['SENIOR WING'];
  for (let i = 1; i < TOTAL_COLS; i++) swHeader.push(null);
  wsData.push(swHeader);

  // SW Cadet rows
  sortedSw.forEach((cadet, idx) => {
    wsData.push(buildCadetRow(idx + 1, cadet, 'SW'));
  });

  // Two empty rows before footer
  wsData.push(Array(TOTAL_COLS).fill(null));
  wsData.push(Array(TOTAL_COLS).fill(null));

  // Footer: Strength
  const strengthSdRow: (string | null)[] = Array(TOTAL_COLS).fill(null);
  strengthSdRow[3] = `STRENGTH SD: ${sortedSd.length}`;
  wsData.push(strengthSdRow);

  const strengthSwRow: (string | null)[] = Array(TOTAL_COLS).fill(null);
  strengthSwRow[3] = `STRENGTH SW: ${sortedSw.length}`;
  wsData.push(strengthSwRow);

  const totalRow: (string | null)[] = Array(TOTAL_COLS).fill(null);
  totalRow[3] = `TOTAL STRENGTH : ${sortedSd.length + sortedSw.length}`;
  wsData.push(totalRow);

  // ============ BUILD WORKSHEET ============

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Row index tracking
  const sdHeaderRowIdx = 8;
  const swSectionStart = 9 + sortedSd.length; // +1 for empty row
  const swHeaderRowIdx = swSectionStart;

  // Merge cells
  ws['!merges'] = [
    // Row 0: Title
    { s: { r: 0, c: 0 }, e: { r: 0, c: TOTAL_COLS - 1 } },
    // Row 1: Subtitle
    { s: { r: 1, c: 0 }, e: { r: 1, c: TOTAL_COLS - 1 } },
    // Row 2: Unit name
    { s: { r: 2, c: 0 }, e: { r: 2, c: TOTAL_COLS - 1 } },
    // Row 3: Group HQ
    { s: { r: 3, c: 0 }, e: { r: 3, c: TOTAL_COLS - 1 } },
    // Row 4: Directorate
    { s: { r: 4, c: 0 }, e: { r: 4, c: TOTAL_COLS - 1 } },
    // Row 5: Institution
    { s: { r: 5, c: 0 }, e: { r: 5, c: TOTAL_COLS - 1 } },
    // Row 6: Empty
    { s: { r: 6, c: 0 }, e: { r: 6, c: TOTAL_COLS - 1 } },
    // SD header
    { s: { r: sdHeaderRowIdx, c: 0 }, e: { r: sdHeaderRowIdx, c: TOTAL_COLS - 1 } },
    // SW header
    { s: { r: swHeaderRowIdx, c: 0 }, e: { r: swHeaderRowIdx, c: TOTAL_COLS - 1 } },
  ];

  // Column widths (matching sample)
  ws['!cols'] = [
    { wch: 6 },   // S.NO
    { wch: 22 },  // REGIMENTAL NO
    { wch: 12 },  // DEPARTMENT
    { wch: 28 },  // NAME
    { wch: 6 },   // RANK
    { wch: 12 },  // D.O.E
    { wch: 12 },  // D.O.B
    { wch: 14 },  // MOBILE
    { wch: 32 },  // MAIL ID
    { wch: 32 },  // FATHER'S NAME
    { wch: 22 },  // DAY SCHOLAR/HOSTELLER
    { wch: 14 },  // BLOOD GROUP
    { wch: 18 },  // AADHAR
    { wch: 24 },  // BANK NAME
    { wch: 18 },  // BANK A/C
    { wch: 14 },  // IFSC
    { wch: 40 },  // BANK BRANCH
    { wch: 10 },  // GENDER
    { wch: 44 },  // ADDRESS
  ];

  // ============ BUILD WORKBOOK & DOWNLOAD ============

  const wb = XLSX.utils.book_new();
  const romanYear = getNccYearRoman(nccYear);
  const sheetName = `${romanYear.toLowerCase() === 'i' ? '1st' : romanYear.toLowerCase() === 'ii' ? '2nd' : '3rd'} YEAR`;
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  const fileName = `UNIT NOMINAL ${academicYearLabel} ${sheetName}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
