/**
 * Default page-wise content for CATC Camp documents.
 * Stored as JSON in reportTemplates/catcCamp and editable from the Templates tab.
 *
 * Placeholders (auto-filled values are rendered bold + underlined):
 *   {{regtlNo}} {{rank}} {{name}} {{institution}} {{unit}} {{sonDaughter}}
 *   {{campLocation}} {{fromDate}} {{toDate}} {{catc}} {{atc}}
 */

export const CATC_CAMP_TEMPLATE_DOC_ID = "catcCamp";

export interface CatcCampPageSections {
  [sectionKey: string]: string;
}

export interface CatcCampTemplateData {
  institution: string;
  unit: string;
  countersignStation: string;
  defaultCampLocation: string;
  pages: {
    page1: CatcCampPageSections;
    page2: CatcCampPageSections;
    page3: CatcCampPageSections;
    page4: CatcCampPageSections;
  };
}

export const CATC_TEMPLATE_VARIABLES = [
  "{{regtlNo}}",
  "{{rank}}",
  "{{name}}",
  "{{institution}}",
  "{{unit}}",
  "{{sonDaughter}}",
  "{{campLocation}}",
  "{{fromDate}}",
  "{{toDate}}",
  "{{catc}}",
  "{{atc}}",
];

export const CATC_PAGE_LABELS: Record<
  keyof CatcCampTemplateData["pages"],
  string
> = {
  page1: "Page 1 — Appx 'B' Medical Fitness",
  page2: "Page 2 — Appx 'C' Risk / Parent / Principal",
  page3: "Page 3 — Appx 'D' Safety Precaution",
  page4: "Page 4 — Appx 'E' Indemnity Bond",
};

export const CATC_SECTION_LABELS: Record<string, Record<string, string>> = {
  page1: {
    title: "Title",
    line1Prefix: "Paragraph 1 — line 1 (before blanks)",
    line2NamePrefix: "Paragraph 1 — Name line prefix",
    line3InstitutionPrefix: "Paragraph 1 — Institution line prefix",
    para1Continuation: "Paragraph 1 — continuation (after blank fields)",
    para2: "Paragraph 2",
    note: "*NOTE text",
    countersignHeading: "Countersigned heading",
  },
  page2: {
    riskParagraph: "Risk / Volunteer certificate paragraph",
    parentParagraph: "Parent's consent paragraph",
    principalParagraph: "Principal attestation paragraph",
    countersignHeading: "Countersigned heading",
  },
  page3: {
    point1: "Point 1",
    point2: "Point 2",
    anoParagraph: "Certificate from the ANO paragraph",
    countersignHeading: "Countersigned heading",
  },
  page4: {
    bondParagraph: "Indemnity bond paragraph",
    witnessesHeading: "Witnesses heading",
    countersignHeading: "Countersigned heading",
  },
};

export const DEFAULT_CATC_CAMP_TEMPLATE: CatcCampTemplateData = {
  institution: "THIAGARAJAR COLLEGE OF ENGINEERING, MADURAI-15",
  unit: "4(TN) ENGR COY NCC, MADURAI",
  countersignStation: "Madurai",
  defaultCampLocation: "4 (TN) ENGR COY NCC, IDAYAPATTI",
  pages: {
    page1: {
      title: "MEDICAL FITNESS, VACCINATION AND INOCULATION CERTIFICATE",
      line1Prefix: "Certified that I have examined No.",
      line2NamePrefix: "Name :",
      line3InstitutionPrefix: "Institution :",
      para1Continuation:
        "as per laid down standards in NCC Act & Rules, 1948, Appendix 'A'  and found him/her **FIT/UNFIT** to undergo training of strenuous nature of {{catc}} being conducted at {{campLocation}} from {{fromDate}} to {{toDate}}.",
      para2:
        "I also certify that the above mentioned Officer/Cadet has been inoculated/vaccinated against small pox and typhoid and is free from all diseases.",
      note: "Most Important of Signature for Govt Medical Doctor Only. Round Office Stamp must to be on Left Side Signature of Doctor.",
      countersignHeading: "COUNTERSIGNED BY OC UNIT",
    },
    page2: {
      riskParagraph:
        "This is to certify that I, No {{regtlNo}} Rank {{rank}} Name {{name}} of Institution {{institution}} Unit {{unit}} am a volunteer to attend {{catc}} being conducted at {{campLocation}} from {{fromDate}} to {{toDate}} my own risk.",
      parentParagraph:
        "It is to certify that I have no objection to spare my {{sonDaughter}} No. {{regtlNo}} Rank : {{rank}} Name : {{name}} to attend {{atc}} being conducted at {{catc}} being conducted at {{campLocation}} from {{fromDate}} to {{toDate}}.",
      principalParagraph:
        "Certified that the above named ANO/Cadet are on the roll of College / School and can be spared for attending the {{catc}} being conducted at {{campLocation}} from {{fromDate}} to {{toDate}} at his/her own risk.",
      countersignHeading: "COUNTERSIGNED BY OC UNIT",
    },
    page3: {
      point1:
        "I know that there is deep water near the campsite, en route and the area of the water is **OUT OF BOUND.** If I go there I shall do so at my own risk.",
      point2:
        "I have been explained the orders regarding precautions to be taken against drawing accident and have understood them. I have been told not to go near deep water in the vicinity by the in-charge. If I go to or near any one of these out of bound area, I shall do so at my own risk.",
      anoParagraph:
        "Certified that the above named Officer/Cadet is on the roll of the College/School and can be spared for {{catc}} being conducted at {{campLocation}} from {{fromDate}} to {{toDate}}. It is also certified that I have explained the orders regarding precaution to be taken against drowning accidents and visiting any out of bounds areas. The cadet has signed in my presence.",
      countersignHeading: "COUNTERSIGNED BY OC UNIT",
    },
    page4: {
      bondParagraph:
        "In consideration of my being nominated at my request to undergo all types of training and also participant in any travelling, I undertake and agree that neither I nor my executor nor Administrator will make any claim against the Govt of India or against any officer, JCO/OR, Civilian MT Driver or against any person in the service of the Govt of India in respect of loss or injury to the property of person (including injury resulting in death) which I suffer while or in consequence of my being in training/participation in any Camp/Course, adventure training activities in/out side NCC and travelling and I understand that no compensation will be paid by the Govt. of India or any Officers, JCOs/Other Ranks of Armed Forces/Civilian MT Driver or against any person in the service of Govt of India and in respect of any such loss or injury (including injury resulting in death) and I agree so as to bind myself, executors and administrators to indemnify the Govt of India and Officer, JCO/Other Ranks of Armed Forces/Civilian MT Driver and a person in the Govt of India against claim which may be made by any third party against them or any of them arising out of act of default on my part during or in connection of the said training/camp/course/adventure training and journey by road/rail/sea/river and flight. The Govt. has agreed to bear the stamp duty on this document.",
      witnessesHeading: "Signed in the presence of (Witnesses)",
      countersignHeading: "COUNTERSIGNED BY OC UNIT",
    },
  },
};

export function parseCatcCampTemplate(content: string): CatcCampTemplateData {
  try {
    const parsed = JSON.parse(content) as Partial<CatcCampTemplateData>;
    return mergeCatcCampTemplate(parsed);
  } catch {
    return structuredClone(DEFAULT_CATC_CAMP_TEMPLATE);
  }
}

export function mergeCatcCampTemplate(
  partial: Partial<CatcCampTemplateData>,
): CatcCampTemplateData {
  const base = structuredClone(DEFAULT_CATC_CAMP_TEMPLATE);
  if (partial.institution) base.institution = partial.institution;
  if (partial.unit) base.unit = partial.unit;
  if (partial.countersignStation)
    base.countersignStation = partial.countersignStation;
  if (partial.defaultCampLocation)
    base.defaultCampLocation = partial.defaultCampLocation;

  (["page1", "page2", "page3", "page4"] as const).forEach((pageKey) => {
    const page = partial.pages?.[pageKey];
    if (!page) return;
    Object.entries(page).forEach(([sectionKey, value]) => {
      if (typeof value === "string" && value.trim()) {
        base.pages[pageKey][sectionKey] = value;
      }
    });
  });

  return base;
}

export function serializeCatcCampTemplate(data: CatcCampTemplateData): string {
  return JSON.stringify(data, null, 2);
}
