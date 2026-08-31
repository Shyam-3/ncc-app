/**
 * CATC Camp Document Generation Service
 *
 * Generates individual 4-page PDF documents per cadet using jsPDF,
 * then bundles them into a single downloadable ZIP file.
 *
 * Pages:
 *  1. Appx 'B' — Medical Fitness, Vaccination and Inoculation Certificate
 *  2. Appx 'C' — Risk/Volunteer + Parent's Consent + Principal Attestation
 *  3. Appx 'D' — Drowning/Accident/Safety Precaution Certificate
 *  4. Appx 'E' — Form of Indemnity Certificate/Bond
 */

import jsPDF from "jspdf";
import JSZip from "jszip";
import {
  DEFAULT_CATC_CAMP_TEMPLATE,
  type CatcCampTemplateData,
} from "./catcTemplateDefaults";

/* ──────────────────────────── Types ──────────────────────────── */

export interface CatcCadet {
  uid: string;
  name: string;
  regimentalNumber?: string;
  rank?: string;
  division?: "SD" | "SW";
  fatherName?: string;
  year?: string;
  nccYear?: string;
  registerNumber?: string;
  residentialStatus?: string;
  department?: string;
}

export interface CatcFormData {
  fromDate: string; // ISO date string (YYYY-MM-DD)
  toDate: string;
  campLocation: string; // dropdown value or 'Others'
  campLocationOther: string; // custom location text
}

interface TextRun {
  text: string;
  bold?: boolean;
  underline?: boolean;
}

/* ──────────────────────────── Constants ──────────────────────────── */

// Page layout (A4, mm)
const PW = 210; // page width
const ML = 25; // margin left
const MR = 22; // margin right
const RE = PW - MR; // right edge 188
const CW = RE - ML; // content width 163
const CX = PW / 2; // center x 105

const INDENT = ML + 13; // paragraph content indent (after "1. ")

const FONT = "times";
const FS_BODY = 11;
const FS_TITLE = 13;
const LH = 6; // line height body
const LH_TITLE = 8; // line height for titles

const MONTHS_SHORT = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];
const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const DEFAULT_CAMP_LOCATION =
  DEFAULT_CATC_CAMP_TEMPLATE.defaultCampLocation;

const FILL_PLACEHOLDERS = new Set([
  "regtlNo",
  "rank",
  "name",
  "institution",
  "unit",
  "sonDaughter",
  "campLocation",
  "fromDate",
  "toDate",
  "catc",
  "atc",
]);

/* ──────────────────────────── Date helpers ──────────────────────────── */

/** Format date as "DD MMM YYYY" (e.g. "05 MAY 2026") — for bold+underlined in body */
function fmtDateBold(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/** Returns "June 2026" style for generation date footer */
function fmtGenMonthYear(): string {
  const now = new Date();
  return `${MONTHS_FULL[now.getMonth()]} ${now.getFullYear()}`;
}

/** Returns "19-06-2026" for ZIP filename */
function fmtGenDateFile(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${d}-${m}-${now.getFullYear()}`;
}

/* ──────────────────────────── Drawing helpers ──────────────────────────── */

function setNormal(doc: jsPDF, size = FS_BODY) {
  doc.setFont(FONT, "normal");
  doc.setFontSize(size);
}

function setBold(doc: jsPDF, size = FS_BODY) {
  doc.setFont(FONT, "bold");
  doc.setFontSize(size);
}

/** Draw a horizontal line (for blank fields) */
function drawLine(doc: jsPDF, x1: number, y: number, x2: number) {
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(x1, y + 1, x2, y + 1);
}

/** Draw text and optionally underline it. Returns the x position after the text. */
function drawText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  opts?: {
    bold?: boolean;
    underline?: boolean;
    size?: number;
    align?: "left" | "center" | "right";
  },
): number {
  const { bold, underline, size = FS_BODY, align } = opts || {};
  doc.setFont(FONT, bold ? "bold" : "normal");
  doc.setFontSize(size);

  if (align === "center") {
    doc.text(text, CX, y, { align: "center" });
  } else if (align === "right") {
    doc.text(text, RE, y, { align: "right" });
  } else {
    doc.text(text, x, y);
  }

  const tw = doc.getTextWidth(text);

  if (underline) {
    let lx: number;
    if (align === "center") lx = CX - tw / 2;
    else if (align === "right") lx = RE - tw;
    else lx = x;
    drawLine(doc, lx, y, lx + tw);
  }

  return x + tw;
}

/** Draw a blank underline field of given width starting at x */
function drawBlank(doc: jsPDF, x: number, y: number, width: number) {
  drawLine(doc, x, y, x + width);
}

/** Right-aligned label + underlined value (labels not underlined) */
function drawRightLabelValue(
  doc: jsPDF,
  label: string,
  value: string,
  y: number,
) {
  setNormal(doc);
  const labelW = doc.getTextWidth(label);
  doc.setFont(FONT, "bold");
  const valueW = doc.getTextWidth(value);
  const x = RE - labelW - valueW;
  setNormal(doc);
  doc.text(label, x, y);
  drawText(doc, value, x + labelW, y, { bold: true, underline: true });
}

/** Convert template text with {{placeholders}} and **bold** markers into runs */
function templateToRuns(
  template: string,
  vars: Record<string, string>,
): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /(\{\{(\w+)\}\}|\*\*([^*]+)\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(template)) !== null) {
    if (match.index > lastIndex) {
      runs.push({ text: template.slice(lastIndex, match.index) });
    }
    if (match[2]) {
      const key = match[2];
      runs.push({
        text: vars[key] || "",
        bold: true,
        underline: FILL_PLACEHOLDERS.has(key),
      });
    } else if (match[3]) {
      runs.push({ text: match[3], bold: true });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < template.length) {
    runs.push({ text: template.slice(lastIndex) });
  }

  return runs;
}

/** Draw justified plain paragraph from template content */
function drawJustifiedParagraph(
  doc: jsPDF,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  fontSize = FS_BODY,
): number {
  setNormal(doc, fontSize);
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, startY, { align: "justify", maxWidth });
  return startY + lines.length * lineHeight;
}

/**
 * Draw a paragraph composed of mixed-format text runs.
 * Handles word-wrapping across runs, returns next Y position.
 */
function drawRichParagraph(
  doc: jsPDF,
  runs: TextRun[],
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  fontSize: number = FS_BODY,
  justify = false,
): number {
  // Split runs into individual words preserving formatting
  interface FWord {
    text: string;
    bold: boolean;
    underline: boolean;
  }

  const words: FWord[] = [];
  for (const run of runs) {
    const parts = run.text.split(/\s+/).filter((p) => p.length > 0);
    for (const part of parts) {
      words.push({ text: part, bold: !!run.bold, underline: !!run.underline });
    }
  }

  const measureWord = (w: FWord): number => {
    doc.setFont(FONT, w.bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    return doc.getTextWidth(w.text);
  };

  doc.setFont(FONT, "normal");
  doc.setFontSize(fontSize);
  const spaceW = doc.getTextWidth(" ");

  // Build lines by word-wrapping
  const lines: FWord[][] = [];
  let curLine: FWord[] = [];
  let curW = 0;

  for (const word of words) {
    const ww = measureWord(word);
    const needed = curLine.length > 0 ? spaceW + ww : ww;
    if (curW + needed > maxWidth && curLine.length > 0) {
      lines.push(curLine);
      curLine = [word];
      curW = ww;
    } else {
      curLine.push(word);
      curW += needed;
    }
  }
  if (curLine.length > 0) lines.push(curLine);

  // Draw each line
  let y = startY;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    let cx = x;

    // Compute spacing between words
    // For justified text: distribute remaining space evenly, but never less than a normal space
    let gap = spaceW;
    if (justify && li < lines.length - 1 && line.length > 1) {
      let textW = 0;
      for (const w of line) textW += measureWord(w);
      const remaining = maxWidth - textW;
      gap = Math.max(spaceW, remaining / (line.length - 1));
    }

    for (let i = 0; i < line.length; i++) {
      const w = line[i];

      if (w.underline) {
        // Continuous underline across spaces for multi-word filled values (e.g. CATC phrase)
        const groupStart = cx;
        let groupEnd = cx;
        let j = i;
        while (j < line.length && line[j].underline) {
          const gw = line[j];
          doc.setFont(FONT, gw.bold ? "bold" : "normal");
          doc.setFontSize(fontSize);
          if (j > i) groupEnd += gap;
          doc.text(gw.text, groupEnd, y);
          groupEnd += doc.getTextWidth(gw.text);
          j++;
        }
        drawLine(doc, groupStart, y, groupEnd);
        cx = groupEnd;
        i = j - 1;
      } else {
        doc.setFont(FONT, w.bold ? "bold" : "normal");
        doc.setFontSize(fontSize);
        doc.text(w.text, cx, y);
        cx += doc.getTextWidth(w.text);
      }

      if (i < line.length - 1) cx += gap;
    }
    y += lineHeight;
  }

  return y;
}

/** Draw the "COUNTERSIGNED BY OC UNIT" footer block on every page.
 *  Positions at least at y=248 to push it towards the bottom of the A4 page. */
function drawCountersigned(
  doc: jsPDF,
  startY: number,
  genMonthYear: string,
  template: CatcCampTemplateData,
): number {
  const heading =
    template.pages.page1.countersignHeading || "COUNTERSIGNED BY OC UNIT";
  const station = template.countersignStation;

  // Push to bottom region of the page, but never overlap content above
  let y = Math.max(startY + 8, 248);

  drawText(doc, heading, 0, y, {
    bold: true,
    underline: true,
    align: "center",
    size: FS_BODY,
  });

  y += 12;
  setBold(doc);
  doc.text("Station:", ML, y);
  setNormal(doc);
  doc.text(`  ${station}`, ML + doc.getTextWidth("Station:"), y);

  y += LH + 1;
  setBold(doc);
  doc.text("Date", ML, y);
  setNormal(doc);
  doc.text(`:       ${genMonthYear}`, ML + doc.getTextWidth("Date"), y);

  return y + LH;
}

/* ──────────────────────────── Cadet helpers ──────────────────────────── */

function getCampLocation(
  formData: CatcFormData,
  template: CatcCampTemplateData,
): string {
  const loc =
    formData.campLocation === "Others"
      ? formData.campLocationOther
      : formData.campLocation;
  return (loc || template.defaultCampLocation).toUpperCase();
}

function getSonDaughter(cadet: CatcCadet): string {
  return cadet.division === "SW" ? "Daughter" : "Son";
}

function getRank(cadet: CatcCadet): string {
  return (cadet.rank || "CDT").toUpperCase();
}

function getName(cadet: CatcCadet): string {
  return (cadet.name || "").toUpperCase();
}

function getRegtlNo(cadet: CatcCadet): string {
  return (cadet.regimentalNumber || "").toUpperCase();
}

function buildTemplateVars(
  cadet: CatcCadet,
  formData: CatcFormData,
  template: CatcCampTemplateData,
): Record<string, string> {
  return {
    regtlNo: getRegtlNo(cadet),
    rank: getRank(cadet),
    name: getName(cadet),
    institution: template.institution,
    unit: template.unit,
    sonDaughter: getSonDaughter(cadet),
    campLocation: getCampLocation(formData, template),
    fromDate: fmtDateBold(formData.fromDate),
    toDate: fmtDateBold(formData.toDate),
    catc: "Combined Annual Training Camp (CATC)",
    atc: "Annual Training Camp (ATC)",
  };
}

/* ════════════════════════════════════════════════════════════════════════
 *  PAGE 1 — Appx 'B': Medical Fitness, Vaccination and Inoculation
 *
 *  IMPORTANT: No cadet data auto-filled on this page (except Son/Daughter
 *  detection). Medical officer fills No, Rank, Name, Institution, Unit
 *  manually with pen. We draw blank underlines for those fields.
 * ════════════════════════════════════════════════════════════════════════ */

function drawPage1(
  doc: jsPDF,
  cadet: CatcCadet,
  formData: CatcFormData,
  genMonthYear: string,
  template: CatcCampTemplateData,
) {
  const vars = buildTemplateVars(cadet, formData, template);
  const sonDaughter = vars.sonDaughter;
  const page = template.pages.page1;

  let y = 28;

  drawText(doc, "Appx 'B'", 0, y, {
    bold: true,
    underline: true,
    align: "right",
  });

  y += LH_TITLE + 12;
  drawText(doc, page.title, 0, y, {
    bold: true,
    underline: true,
    align: "center",
    size: FS_TITLE,
  });

  y += LH_TITLE + 14;
  setBold(doc);
  doc.text("1.", ML, y);
  setNormal(doc);
  doc.text(page.line1Prefix, INDENT, y);
  const afterNo = INDENT + doc.getTextWidth(`${page.line1Prefix} `);
  drawBlank(doc, afterNo, y, 40);
  doc.text("Rank :", afterNo + 43, y);
  drawBlank(doc, afterNo + 43 + doc.getTextWidth("Rank : "), y, 25);

  y += LH;
  doc.text(page.line2NamePrefix, ML, y);
  drawBlank(doc, ML + doc.getTextWidth(`${page.line2NamePrefix} `), y, 50);
  const sonX = ML + doc.getTextWidth(`${page.line2NamePrefix} `) + 53;
  drawText(doc, sonDaughter, sonX, y, { bold: true, underline: true });
  const afterSonDaughter =
    sonX + doc.getTextWidth(sonDaughter) + doc.getTextWidth(" ");
  doc.text("of", afterSonDaughter, y);
  const afterSon = afterSonDaughter + doc.getTextWidth("of ");
  drawBlank(doc, afterSon, y, 45);
  doc.text("of", afterSon + 47, y);

  y += LH;
  doc.text(page.line3InstitutionPrefix, ML, y);
  drawBlank(
    doc,
    ML + doc.getTextWidth(`${page.line3InstitutionPrefix} `),
    y,
    60,
  );
  const unitX = ML + doc.getTextWidth(`${page.line3InstitutionPrefix} `) + 63;
  doc.text("Unit :", unitX, y);
  drawBlank(
    doc,
    unitX + doc.getTextWidth("Unit : "),
    y,
    RE - (unitX + doc.getTextWidth("Unit : ")),
  );

  y += LH;
  const para1Runs = templateToRuns(page.para1Continuation, vars);
  y = drawRichParagraph(doc, para1Runs, ML, y, CW, LH, FS_BODY, true);

  y += 10;
  setBold(doc);
  doc.text("2.", ML, y);
  setNormal(doc);
  const para2Lines = doc.splitTextToSize(page.para2, CW - (INDENT - ML));
  doc.text(para2Lines, INDENT, y);
  y += para2Lines.length * LH;

  y += 10;
  setBold(doc);
  doc.text("*NOTE:-", ML, y);
  setNormal(doc);
  const noteX = ML + doc.getTextWidth("*NOTE:-       ");
  const noteLines = doc.splitTextToSize(page.note, RE - noteX);
  doc.text(noteLines, noteX, y);
  y += noteLines.length * LH;

  y += 20;
  setBold(doc);
  doc.text("Station  :", ML, y);
  setNormal(doc);
  doc.text("(Signature of Medical Officer)", RE, y, { align: "right" });

  y += LH;
  setBold(doc);
  doc.text("Date     :", ML, y);
  setNormal(doc);
  doc.text("Name :__________________", RE, y, { align: "right" });

  y += LH;
  doc.text("Designation :____________", RE, y, { align: "right" });

  drawCountersigned(doc, y + 8, genMonthYear, template);
}

/* ════════════════════════════════════════════════════════════════════════
 *  PAGE 2 — Appx 'C': Risk/Volunteer Certificate + Parent's Consent +
 *           TO BE ATTESTED BY PRINCIPAL/HEAD MASTER
 *
 *  Cadet data IS auto-filled on this page.
 * ════════════════════════════════════════════════════════════════════════ */

function drawPage2(
  doc: jsPDF,
  cadet: CatcCadet,
  formData: CatcFormData,
  genMonthYear: string,
  template: CatcCampTemplateData,
) {
  const vars = buildTemplateVars(cadet, formData, template);
  const page = template.pages.page2;

  let y = 28;

  drawText(doc, "Appx 'C'", 0, y, {
    bold: true,
    underline: true,
    align: "right",
  });

  y += LH_TITLE + 8;
  drawText(doc, "RISK/VOLUNTEER CERTIFICATE", 0, y, {
    bold: true,
    underline: true,
    align: "center",
    size: FS_TITLE,
  });

  y += LH_TITLE + 10;
  y = drawRichParagraph(
    doc,
    [{ text: "1. " }, ...templateToRuns(page.riskParagraph, vars)],
    ML,
    y,
    CW,
    LH,
    FS_BODY,
    true,
  );

  y += 10;
  setNormal(doc);
  doc.text("(Signature of Applicant)", RE, y, { align: "right" });

  y += 14;
  drawText(doc, "PARENT'S CONSENT CERTIFICATE", 0, y, {
    bold: true,
    underline: true,
    align: "center",
    size: FS_TITLE,
  });

  y += LH_TITLE + 10;
  y = drawRichParagraph(
    doc,
    [{ text: "1. " }, ...templateToRuns(page.parentParagraph, vars)],
    ML,
    y,
    CW,
    LH,
    FS_BODY,
    true,
  );

  y += 10;
  setBold(doc);
  doc.text("Station :", ML, y);
  setNormal(doc);
  doc.text("(Signature of Parent / Guardian)", RE, y, { align: "right" });

  y += LH;
  setBold(doc);
  doc.text("Date    :", ML, y);
  setNormal(doc);
  doc.text("Name in Block letters : ________________", RE, y, {
    align: "right",
  });

  y += LH;
  doc.text("Address : ______________________________", RE, y, {
    align: "right",
  });

  y += LH;
  drawBlank(doc, RE - 60, y, 60);

  y += 12;
  drawText(doc, "TO BE ATTESTED BY PRINCIPAL/HEAD MASTER", 0, y, {
    bold: true,
    underline: true,
    align: "center",
    size: FS_BODY,
  });

  y += LH + 8;
  y = drawRichParagraph(
    doc,
    templateToRuns(page.principalParagraph, vars),
    ML,
    y,
    CW,
    LH,
    FS_BODY,
    true,
  );

  y += 10;
  setBold(doc);
  doc.text("Station :", ML, y);
  setNormal(doc);
  doc.text("(Office Seal)", CX, y, { align: "center" });
  doc.text("Signature of Principal/Head Master", RE, y, { align: "right" });

  y += LH;
  setBold(doc);
  doc.text("Date    :", ML, y);
  setNormal(doc);
  doc.text("With seal", RE, y, { align: "right" });

  drawCountersigned(doc, y + 4, genMonthYear, template);
}

/* ════════════════════════════════════════════════════════════════════════
 *  PAGE 3 — Appx 'D': Drowning/Accident/Safety Precaution Certificate
 *
 *  Auto-fills No, Rank, Name in the Applicant signature section.
 *  Leaves Signature blank.
 * ════════════════════════════════════════════════════════════════════════ */

function drawPage3(
  doc: jsPDF,
  cadet: CatcCadet,
  formData: CatcFormData,
  genMonthYear: string,
  template: CatcCampTemplateData,
) {
  const vars = buildTemplateVars(cadet, formData, template);
  const page = template.pages.page3;

  let y = 28;

  drawText(doc, "Appx 'D'", 0, y, {
    bold: true,
    underline: true,
    align: "right",
  });

  y += LH_TITLE + 10;
  drawText(doc, "DROWNING/ACCIDENT/SAFETY PRECAUTION CERTIFICATE", 0, y, {
    bold: true,
    underline: true,
    align: "center",
    size: FS_TITLE,
  });

  y += LH_TITLE + 10;
  y = drawRichParagraph(
    doc,
    [{ text: "1. " }, ...templateToRuns(page.point1, vars)],
    ML,
    y,
    CW,
    LH,
    FS_BODY,
    true,
  );

  y += 8;
  y = drawRichParagraph(
    doc,
    [{ text: "2. " }, ...templateToRuns(page.point2, vars)],
    ML,
    y,
    CW,
    LH,
    FS_BODY,
    true,
  );

  y += 12;
  setNormal(doc);
  doc.text("(Signature of Applicant)", RE, y, { align: "right" });
  y += LH;
  drawRightLabelValue(doc, "No. ", vars.regtlNo, y);
  y += LH;
  drawRightLabelValue(doc, "Rank ", vars.rank, y);
  y += LH;
  drawRightLabelValue(doc, "Name ", vars.name, y);

  y += 16;
  drawText(doc, "CERTIFICATE FROM THE ANO", 0, y, {
    bold: true,
    underline: true,
    align: "center",
    size: FS_BODY,
  });

  y += LH + 8;
  y = drawRichParagraph(
    doc,
    templateToRuns(page.anoParagraph, vars),
    ML,
    y,
    CW,
    LH,
    FS_BODY,
    true,
  );

  y += 10;
  setNormal(doc);
  doc.text("Signature of ANO", RE, y, { align: "right" });

  y += 14;
  drawText(doc, "TO BE ATTESTED BY PRINCIPAL/HEAD MASTER", 0, y, {
    bold: true,
    underline: true,
    align: "center",
    size: FS_BODY,
  });

  y += 14;
  setBold(doc);
  doc.text("Station :", ML, y);
  setNormal(doc);
  doc.text("(Office Seal)", CX, y, { align: "center" });
  doc.text("Signature of Principal/Head Master", RE, y, { align: "right" });

  y += LH;
  setBold(doc);
  doc.text("Date    :", ML, y);
  setNormal(doc);
  doc.text("With seal", RE, y, { align: "right" });

  drawCountersigned(doc, y + 4, genMonthYear, template);
}

/* ════════════════════════════════════════════════════════════════════════
 *  PAGE 4 — Appx 'E': Form of Indemnity Certificate/Bond
 *
 *  Auto-fills No, Rank, Name, Institution at the top.
 *  Uses smaller font for the dense bond paragraph.
 * ════════════════════════════════════════════════════════════════════════ */

function drawPage4(
  doc: jsPDF,
  cadet: CatcCadet,
  formData: CatcFormData,
  genMonthYear: string,
  template: CatcCampTemplateData,
) {
  const vars = buildTemplateVars(cadet, formData, template);
  const page = template.pages.page4;

  let y = 28;

  drawText(doc, "Appx 'E'", 0, y, {
    bold: true,
    underline: true,
    align: "right",
  });

  y += LH_TITLE + 10;
  const infoRuns: TextRun[] = [
    { text: "No " },
    { text: vars.regtlNo, bold: true, underline: true },
    { text: "          Rank " },
    { text: vars.rank, bold: true, underline: true },
    { text: "          Name " },
    { text: vars.name, bold: true, underline: true },
  ];
  y = drawRichParagraph(doc, infoRuns, ML, y, CW, LH, FS_BODY, false);

  y += 2;
  const instRuns: TextRun[] = [
    { text: "Institution " },
    { text: vars.institution, bold: true, underline: true },
  ];
  y = drawRichParagraph(doc, instRuns, ML, y, CW, LH, FS_BODY, false);

  y += LH_TITLE + 8;
  drawText(
    doc,
    "FORM OF INDEMNITY CERTIFICATE/BOND FOR NCC OFFICER AND CADETS",
    0,
    y,
    {
      bold: true,
      underline: true,
      align: "center",
      size: 11,
    },
  );

  y += LH + 8;
  y = drawJustifiedParagraph(doc, page.bondParagraph, ML, y, CW, LH, FS_BODY);

  y += 12;
  setNormal(doc);
  doc.text("(Signature of the Applicant)", RE, y, { align: "right" });
  y += LH;
  doc.text("Address :", RE - 50, y);

  y += 14;
  drawText(doc, page.witnessesHeading, ML, y, { bold: true, underline: true });

  y += LH + 4;
  setNormal(doc);
  doc.text("1.  Signature of ANO", ML, y);
  drawBlank(doc, ML + doc.getTextWidth("1.  Signature of ANO"), y, 35);
  const rightCol = CX + 15;
  doc.text("Signature", rightCol, y);
  drawBlank(doc, rightCol + doc.getTextWidth("Signature "), y, 45);

  y += LH;
  doc.text("    Name & Address", ML, y);
  drawBlank(doc, ML + doc.getTextWidth("    Name & Address "), y, 30);
  doc.text("(Father/Guardian with date)", rightCol, y);

  y += LH;
  drawBlank(doc, ML + 15, y, 50);
  doc.text("Name in Block letters", rightCol, y);
  drawBlank(doc, rightCol + doc.getTextWidth("Name in Block letters "), y, 30);

  y += LH;
  drawBlank(doc, ML + 15, y, 50);
  doc.text("Address", rightCol, y);
  drawBlank(doc, rightCol + doc.getTextWidth("Address "), y, 45);

  y += LH;
  drawBlank(doc, rightCol, y, 55);

  y += LH + 2;
  doc.text("2.  Signature of HOI", ML, y);
  drawBlank(doc, ML + doc.getTextWidth("2.  Signature of HOI"), y, 35);
  drawBlank(doc, rightCol, y, 55);

  y += LH;
  doc.text("    Name & Address", ML, y);
  drawBlank(doc, ML + doc.getTextWidth("    Name & Address "), y, 30);

  y += LH;
  drawBlank(doc, ML + 15, y, 50);

  y += LH;
  drawBlank(doc, ML + 15, y, 50);

  drawCountersigned(doc, y + 4, genMonthYear, template);
}

/* ════════════════════════════════════════════════════════════════════════
 *  Main orchestration — Generate PDFs + ZIP
 * ════════════════════════════════════════════════════════════════════════ */

export async function generateCatcZip(
  cadets: CatcCadet[],
  formData: CatcFormData,
  onProgress?: (current: number, total: number) => void,
  template: CatcCampTemplateData = DEFAULT_CATC_CAMP_TEMPLATE,
): Promise<void> {
  const zip = new JSZip();
  const genMonthYear = fmtGenMonthYear();

  for (let i = 0; i < cadets.length; i++) {
    const cadet = cadets[i];
    onProgress?.(i + 1, cadets.length);

    const doc = new jsPDF({ unit: "mm", format: "a4" });

    drawPage1(doc, cadet, formData, genMonthYear, template);
    doc.addPage();
    drawPage2(doc, cadet, formData, genMonthYear, template);
    doc.addPage();
    drawPage3(doc, cadet, formData, genMonthYear, template);
    doc.addPage();
    drawPage4(doc, cadet, formData, genMonthYear, template);

    const pdfData = doc.output("arraybuffer");
    const cadetName = (cadet.name || "cadet")
      .toUpperCase()
      .replace(/\s+/g, "_");
    const regtlNo = (cadet.regimentalNumber || "unknown").toUpperCase();
    const fileName = `${cadetName}_${regtlNo}.pdf`;

    zip.file(fileName, pdfData);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const zipName = `${cadets.length}_${fmtGenDateFile()}.zip`;

  // Trigger browser download
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
