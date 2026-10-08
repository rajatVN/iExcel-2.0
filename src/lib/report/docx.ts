import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TableLayoutType,
  TabStopType,
  TextRun,
  WidthType,
  type IRunOptions,
} from "docx";
import type { ReportData, ReportItem } from "./data";

const NAVY = "14284B";
const GREY = "5B6474";
const RULE = "C9D1DE";
const FONT = "Calibri";

const CONTENT_WIDTH_TWIPS = 9638; // A4 (11906) minus 2 × 1134 (2 cm) margins

function text(t: string, opts: Omit<IRunOptions, "text"> = {}) {
  return new TextRun({ text: t, font: FONT, ...opts });
}

/** Candidate text: one paragraph per line, blank lines kept. Wording untouched. */
function candidateText(value: string | null): Paragraph[] {
  if (!value || !value.trim()) {
    return [
      new Paragraph({
        spacing: { after: 120 },
        children: [text("[No response]", { italics: true, color: GREY, size: 21 })],
      }),
    ];
  }
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  return lines.map(
    (line, i) =>
      new Paragraph({
        spacing: { after: i === lines.length - 1 ? 160 : 40, line: 276 },
        children: [text(line, { size: 22 })],
      }),
  );
}

function fieldLabel(label: string): Paragraph {
  return new Paragraph({
    spacing: { before: 140, after: 60 },
    keepNext: true,
    children: [text(label.toUpperCase(), { bold: true, size: 17, color: GREY, characterSpacing: 20 })],
  });
}

function infoTable(d: ReportData): Table {
  const rows: [string, string][] = [
    ["Candidate", d.candidate.name],
    ["Candidate ID", d.candidate.code],
    ["Role", `${d.role.name}\n${d.role.title}`],
    ["Assessment", d.assessment.name],
    ["Version", d.assessment.version],
    ["Assessment started", d.startedAt],
    ["Assessment submitted", d.submittedAt],
    ["Duration (time used)", d.duration],
    ["Time allowed", d.allotted],
    ["Submission", d.submission],
    [
      "Items with a response",
      `${d.respondedCount} of ${d.items.length}` +
        (d.blankItems.length ? ` (no response: Item ${d.blankItems.join(", ")})` : ""),
    ],
  ];
  const border = { style: BorderStyle.SINGLE, size: 4, color: RULE };
  return new Table({
    width: { size: CONTENT_WIDTH_TWIPS, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [2800, CONTENT_WIDTH_TWIPS - 2800],
    borders: {
      top: border,
      bottom: border,
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: border,
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: rows.map(
      ([k, v]) =>
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 2800, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, color: "auto", fill: "F3F5F9" },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [text(k, { bold: true, size: 20, color: NAVY })] })],
            }),
            new TableCell({
              width: { size: CONTENT_WIDTH_TWIPS - 2800, type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 160, right: 120 },
              children: v.split("\n").map((line) => new Paragraph({ children: [text(line, { size: 20 })] })),
            }),
          ],
        }),
    ),
  });
}

function itemSection(it: ReportItem): Paragraph[] {
  const out: Paragraph[] = [
    new Paragraph({
      spacing: { before: 360, after: 40 },
      keepNext: true,
      border: { top: { style: BorderStyle.SINGLE, size: 12, color: NAVY, space: 8 } },
      children: [text(`ITEM ${it.id}`, { bold: true, size: 20, color: NAVY, characterSpacing: 30 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      keepNext: true,
      children: [text(it.shortTitle, { bold: true, size: 28, color: NAVY })],
    }),
    new Paragraph({
      spacing: { after: 20 },
      keepNext: true,
      children: [text(`${it.formatLabel} · From: ${it.from}`, { size: 18, color: GREY })],
    }),
    new Paragraph({
      spacing: { after: 160 },
      keepNext: true,
      children: [text(`Subject: ${it.subject}`, { size: 18, color: GREY })],
    }),
  ];

  if (it.type === "recommendation") {
    out.push(fieldLabel("Recommendation"), ...candidateText(it.recommendation));
    out.push(
      new Paragraph({
        spacing: { before: 60 },
        children: [text("Word count: ", { bold: true, size: 20 }), text(String(it.wordCount), { size: 20 })],
      }),
    );
  } else {
    out.push(
      fieldLabel("Priority"),
      new Paragraph({
        spacing: { after: 120 },
        children: it.priority
          ? [text(it.priority.toUpperCase(), { bold: true, size: 22 })]
          : [text("[Not set]", { italics: true, color: GREY, size: 21 })],
      }),
      fieldLabel("Action"),
      ...candidateText(it.action),
      fieldLabel("Say now"),
      ...candidateText(it.sayNow),
      fieldLabel("Hold"),
      ...candidateText(it.hold),
    );
    if (it.sayHoldLegacy) out.push(fieldLabel("Say now / Hold (legacy)"), ...candidateText(it.sayHoldLegacy));
  }
  return out;
}

export async function renderDocx(d: ReportData): Promise<Buffer> {
  const doc = new Document({
    creator: "iExcel 2.0 In-Basket Assessment",
    title: `${d.reportName} – ${d.candidate.code}`,
    description: "Candidate response record. Contains no assessor material or scoring.",
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134, footer: 567 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH_TWIPS }],
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 6 } },
                children: [
                  text(`${d.candidate.code} · ${d.reportName} · Confidential`, { size: 16, color: GREY }),
                  text("\tPage ", { size: 16, color: GREY }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: GREY }),
                  text(" of ", { size: 16, color: GREY }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: GREY }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            spacing: { after: 60 },
            children: [text(d.title, { bold: true, size: 36, color: NAVY })],
          }),
          new Paragraph({ spacing: { after: 40 }, children: [text(d.subtitle, { size: 28, color: NAVY })] }),
          new Paragraph({
            spacing: { after: 240 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: NAVY, space: 8 } },
            children: [text(d.reportName, { size: 24, color: GREY })],
          }),
          infoTable(d),
          new Paragraph({
            spacing: { before: 160, after: 120 },
            children: [
              text(
                `Times shown in ${d.timeZone}. This report records the candidate's submitted responses exactly as entered. It contains no evaluation or scoring.`,
                { size: 18, italics: true, color: GREY },
              ),
            ],
          }),
          ...d.items.flatMap(itemSection),
          new Paragraph({
            spacing: { before: 480 },
            border: { top: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 8 } },
            children: [text("Assessment status: ", { bold: true }), text(d.status, { bold: true, color: NAVY })],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [text("End of report", { size: 18, color: GREY, italics: true })],
          }),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
