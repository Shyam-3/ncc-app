import * as XLSX from 'xlsx';
import type { NccYear, Division } from '@/shared/config/constants';
import { ROMAN_YEAR_MAP } from '@/shared/config/constants';
import {
  getSessionsByDivision,
  listMarks,
  getCadetsByDivision,
} from '@/features/attendance/service';
import type { AttendanceSession } from '@/features/attendance/attendance.types';
import type { Cadet } from '@/shared/types';

// ============ TYPES ============

interface SessionWithMarks {
  session: AttendanceSession & { id: string };
  marks: Map<string, string>; // cadetId -> 'P' | 'A'
}

export interface AnnualReportPreview {
  nccYear: NccYear;
  sessionCount: number;
  totalParades: number;
  sdCadetCount: number;
  swCadetCount: number;
  dateRange: { first: string; last: string } | null;
}

// ============ HELPERS ============

const UNIT_NAME = '4(TN) ENGR COY, NCC';

function getNccYearRoman(nccYear: NccYear): string {
  // nccYear is like '1st Year', '2nd Year', '3rd Year'
  const prefix = nccYear.replace(' Year', '');
  return ROMAN_YEAR_MAP[prefix] || prefix;
}

function getAcademicYearLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  // Academic year: July–June. If month >= June (5), it's currentYear–nextYear
  if (month >= 5) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }
  return `${year - 1}-${String(year).slice(-2)}`;
}

function formatDateForColumn(dateStr: string): string {
  // dateStr is 'YYYY-MM-DD' from the database
  // Return as-is from database (user requested: keep whatever format is in the database)
  // Convert YYYY-MM-DD to DD/MM/YYYY for display
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
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

// ============ DATA FETCHING ============

async function fetchSessionsWithMarks(
  nccYear: NccYear,
  division: Division,
  officialOnly = false
): Promise<SessionWithMarks[]> {
  let sessions = await getSessionsByDivision(division, nccYear);

  // Filter to official parades only if requested
  if (officialOnly) {
    sessions = sessions.filter((s) => s.isOfficialParade === true);
  }

  // Sort by date ascending
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));

  const result: SessionWithMarks[] = [];
  for (const session of sorted) {
    const marks = await listMarks(session.id!);
    const markMap = new Map<string, string>();
    marks.forEach((m) => markMap.set(m.cadetId, m.status));
    result.push({ session, marks: markMap });
  }

  return result;
}

// ============ PREVIEW ============

export async function getAnnualReportPreview(nccYear: NccYear, officialOnly = false): Promise<AnnualReportPreview> {
  let [sdSessions, swSessions] = await Promise.all([
    getSessionsByDivision('SD', nccYear),
    getSessionsByDivision('SW', nccYear),
  ]);

  // Filter to official parades only if requested
  if (officialOnly) {
    sdSessions = sdSessions.filter((s) => s.isOfficialParade === true);
    swSessions = swSessions.filter((s) => s.isOfficialParade === true);
  }

  // Use unique sessions (by id) across both divisions
  const allSessionMap = new Map<string, AttendanceSession & { id: string }>();
  [...sdSessions, ...swSessions].forEach((s) => allSessionMap.set(s.id!, s));
  const allSessions = Array.from(allSessionMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const totalParades = allSessions.reduce((sum, s) => sum + (s.paradeCount || 1), 0);

  const [sdCadets, swCadets] = await Promise.all([
    getCadetsByDivision('SD', nccYear),
    getCadetsByDivision('SW', nccYear),
  ]);

  return {
    nccYear,
    sessionCount: allSessions.length,
    totalParades,
    sdCadetCount: sdCadets.length,
    swCadetCount: swCadets.length,
    dateRange:
      allSessions.length > 0
        ? { first: allSessions[0].date, last: allSessions[allSessions.length - 1].date }
        : null,
  };
}

// ============ EXCEL GENERATION ============

export async function generateAnnualAttendanceExcel(nccYear: NccYear, officialOnly = false): Promise<void> {
  // Fetch data for both divisions
  const [sdSessionsWithMarks, swSessionsWithMarks] = await Promise.all([
    fetchSessionsWithMarks(nccYear, 'SD', officialOnly),
    fetchSessionsWithMarks(nccYear, 'SW', officialOnly),
  ]);

  const [sdCadets, swCadets] = await Promise.all([
    getCadetsByDivision('SD', nccYear),
    getCadetsByDivision('SW', nccYear),
  ]);

  // Sort cadets by regimental number within each division
  const sortedSdCadets = sortByRegimentalNumber(sdCadets);
  const sortedSwCadets = sortByRegimentalNumber(swCadets);

  // Use SD sessions for date columns (SD and SW should share session dates for the same NCC year)
  // But combine all unique session dates from both divisions
  const sessionDateMap = new Map<string, { sd?: SessionWithMarks; sw?: SessionWithMarks }>();

  sdSessionsWithMarks.forEach((swm) => {
    const key = swm.session.date;
    if (!sessionDateMap.has(key)) sessionDateMap.set(key, {});
    sessionDateMap.get(key)!.sd = swm;
  });

  swSessionsWithMarks.forEach((swm) => {
    const key = swm.session.date;
    if (!sessionDateMap.has(key)) sessionDateMap.set(key, {});
    sessionDateMap.get(key)!.sw = swm;
  });

  // Sort dates ascending
  const sortedDates = Array.from(sessionDateMap.keys()).sort();

  // Compute parade numbers
  // Each session date gets parade numbers based on its paradeCount
  const paradeLabels: string[] = [];
  let currentParade = 1;
  sortedDates.forEach((date) => {
    const entry = sessionDateMap.get(date)!;
    // Use SD session's paradeCount if available, else SW's
    const session = entry.sd?.session || entry.sw?.session;
    const count = session?.paradeCount || 1;
    if (count === 1) {
      paradeLabels.push(String(currentParade));
      currentParade += 1;
    } else {
      // Multiple parades — e.g., "2,3"
      const nums: number[] = [];
      for (let i = 0; i < count; i++) {
        nums.push(currentParade + i);
      }
      paradeLabels.push(nums.join(','));
      currentParade += count;
    }
  });

  const totalParades = currentParade - 1;

  // Number of date columns
  const numDateCols = sortedDates.length;
  // Total columns: S.NO, REG NO, RANK, NAME, ...dates..., percentage
  const totalCols = 4 + numDateCols + 1;

  const romanYear = getNccYearRoman(nccYear);
  const academicYear = getAcademicYearLabel();

  // Build worksheet data as an array of arrays
  const wsData: (string | number | null)[][] = [];

  // Row 1: Unit name
  const row1: (string | null)[] = [UNIT_NAME];
  for (let i = 1; i < totalCols; i++) row1.push(null);
  wsData.push(row1);

  // Row 2: empty
  wsData.push(Array(totalCols).fill(null));

  // Row 3: Title
  const row3: (string | null)[] = [`ATTENDANCE SHEET \u2013 ${romanYear} YEAR`];
  for (let i = 1; i < totalCols; i++) row3.push(null);
  wsData.push(row3);

  // Row 4: empty
  wsData.push(Array(totalCols).fill(null));

  // Row 5: Headers
  const headerRow: (string | null)[] = [
    'S.NO',
    'REGIMENTAL NO',
    'RANK',
    'NAME OF THE CADET',
    ...sortedDates.map(formatDateForColumn),
    'percentage',
  ];
  wsData.push(headerRow);

  // Row 6: Parade numbers
  const paradeRow: (string | null)[] = [null, null, null, null, ...paradeLabels, null];
  wsData.push(paradeRow);

  // SD Section
  // Row: "SD" header
  const sdHeaderRow: (string | null)[] = ['SD'];
  for (let i = 1; i < totalCols; i++) sdHeaderRow.push(null);
  wsData.push(sdHeaderRow);

  // SD Cadet rows
  sortedSdCadets.forEach((cadet, idx) => {
    const row: (string | number | null)[] = [
      idx + 1,
      cadet.regimentalNumber || '',
      cadet.rank || '',
      cadet.name || '',
    ];

    let presentParades = 0;

    sortedDates.forEach((date) => {
      const entry = sessionDateMap.get(date)!;
      const sdSession = entry.sd;
      if (sdSession) {
        const mark = sdSession.marks.get(cadet.id) || '';
        const status = mark.toUpperCase() === 'P' ? 'P' : mark.toUpperCase() === 'A' ? 'A' : '';
        row.push(status);
        if (status === 'P') {
          presentParades += sdSession.session.paradeCount || 1;
        }
      } else {
        row.push('');
      }
    });

    // Percentage
    const pct = totalParades > 0 ? Math.round(((presentParades / totalParades) * 100) * 100) / 100 : 0;
    row.push(pct);
    wsData.push(row);
  });

  // Empty row after SD cadets
  wsData.push(Array(totalCols).fill(null));

  // SD Total row
  const sdTotalRow: (string | number | null)[] = [null, null, null, 'TOTAL'];
  sortedDates.forEach((date) => {
    const entry = sessionDateMap.get(date)!;
    const sdSession = entry.sd;
    if (sdSession) {
      let count = 0;
      sortedSdCadets.forEach((cadet) => {
        const mark = sdSession.marks.get(cadet.id);
        if (mark && mark.toUpperCase() === 'P') count++;
      });
      sdTotalRow.push(count);
    } else {
      sdTotalRow.push(0);
    }
  });
  sdTotalRow.push(null);
  wsData.push(sdTotalRow);

  // SW Section
  const swHeaderRow: (string | null)[] = ['SW'];
  for (let i = 1; i < totalCols; i++) swHeaderRow.push(null);
  wsData.push(swHeaderRow);

  // SW Cadet rows
  sortedSwCadets.forEach((cadet, idx) => {
    const row: (string | number | null)[] = [
      idx + 1,
      cadet.regimentalNumber || '',
      cadet.rank || '',
      cadet.name || '',
    ];

    let presentParades = 0;

    sortedDates.forEach((date) => {
      const entry = sessionDateMap.get(date)!;
      const swSession = entry.sw;
      if (swSession) {
        const mark = swSession.marks.get(cadet.id) || '';
        const status = mark.toUpperCase() === 'P' ? 'P' : mark.toUpperCase() === 'A' ? 'A' : '';
        row.push(status);
        if (status === 'P') {
          presentParades += swSession.session.paradeCount || 1;
        }
      } else {
        row.push('');
      }
    });

    // Percentage
    const pct = totalParades > 0 ? Math.round(((presentParades / totalParades) * 100) * 100) / 100 : 0;
    row.push(pct);
    wsData.push(row);
  });

  // Empty row after SW cadets
  wsData.push(Array(totalCols).fill(null));

  // SW Total row
  const swTotalRow: (string | number | null)[] = [null, null, null, 'TOTAL'];
  sortedDates.forEach((date) => {
    const entry = sessionDateMap.get(date)!;
    const swSession = entry.sw;
    if (swSession) {
      let count = 0;
      sortedSwCadets.forEach((cadet) => {
        const mark = swSession.marks.get(cadet.id);
        if (mark && mark.toUpperCase() === 'P') count++;
      });
      swTotalRow.push(count);
    } else {
      swTotalRow.push(0);
    }
  });
  swTotalRow.push(null);
  wsData.push(swTotalRow);

  // Empty row
  wsData.push(Array(totalCols).fill(null));

  // Grand total row: TOTAL(SD+SW)
  const grandTotalRow: (string | number | null)[] = [' TOTAL(SD+SW)', ' ', null, null];
  sortedDates.forEach((_date, i) => {
    const sdVal = typeof sdTotalRow[4 + i] === 'number' ? (sdTotalRow[4 + i] as number) : 0;
    const swVal = typeof swTotalRow[4 + i] === 'number' ? (swTotalRow[4 + i] as number) : 0;
    grandTotalRow.push(sdVal + swVal);
  });
  grandTotalRow.push(null);
  wsData.push(grandTotalRow);

  // ============ BUILD WORKSHEET ============

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Merge cells for header rows
  ws['!merges'] = [
    // Row 1: Unit name merged across all columns
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    // Row 3: Title merged across all columns
    { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
  ];

  // Column widths
  const colWidths: XLSX.ColInfo[] = [
    { wch: 5 },  // S.NO
    { wch: 20 }, // REGIMENTAL NO
    { wch: 6 },  // RANK
    { wch: 28 }, // NAME OF THE CADET
  ];
  for (let i = 0; i < numDateCols; i++) {
    colWidths.push({ wch: 12 }); // Date columns
  }
  colWidths.push({ wch: 11 }); // percentage
  ws['!cols'] = colWidths;

  // ============ BUILD WORKBOOK & DOWNLOAD ============

  const wb = XLSX.utils.book_new();
  const sheetName = `ATTENDANCE ${romanYear} YEAR ${academicYear}`;
  // Excel sheet name max 31 chars
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  const fileName = `NCC ATTENDANCE SHEET ${romanYear} YEAR ${academicYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
