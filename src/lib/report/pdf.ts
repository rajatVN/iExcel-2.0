import "server-only";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { ReportData, ReportItem } from "./data";

/**
 * PDF version of the candidate response report, laid out to mirror the DOCX.
 * Real text (embedded Noto Sans), so it is selectable and searchable, and it
 * covers characters such as ₹, curly quotes and en dashes.
 */

const NAVY = "#14284B";
const GREY = "#5B6474";
const RULE = "#C9D1DE";
const LABEL_BG = "#F3F5F9";

const MARGIN = 56.7; // 2 cm
const FOOTER_SPACE = 34;

const fontDir = path.join(process.cwd(), "assets", "fonts");
const FONTS = {
  regular: path.join(fontDir, "NotoSans_400Regular.ttf"),
  bold: path.join(fontDir, "NotoSans_700Bold.ttf"),
  italic: path.join(fontDir, "NotoSans_400Regular_Italic.ttf"),
};

export async function renderPdf(d: ReportData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: MARGIN, bottom: MARGIN + FOOTER_SPACE, left: MARGIN, right: MARGIN },
    bufferPages: true,
    info: {
      Title: `${d.reportName} – ${d.candidate.code}`,
      Author: "iExcel 2.0 In-Basket Assessment",
      Subject: "Candidate response record. Contains no assessor material or scoring.",
      CreationDate: d.submittedAtDate,
      ModDate: d.submittedAtDate,
    },
  });
  doc.registerFont("Body", FONTS.regular);
  doc.registerFont("Bold", FONTS.bold);
  doc.registerFont("Italic", FONTS.italic);

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const width = doc.page.width - MARGIN * 2;
  const bottomLimit = () => doc.page.height - doc.page.margins.bottom;
  const ensureSpace = (h: number) => {
    if (doc.y + h > bottomLimit()) doc.addPage();
  };
  const rule = (color: string, weight: number) => {
    doc.save().moveTo(MARGIN, doc.y).lineTo(MARGIN + width, doc.y).lineWidth(weight).strokeColor(color).stroke().restore();
  };

  /* ---- Title block ---- */
  doc.font("Bold").fontSize(18).fillColor(NAVY).text(d.title, MARGIN, MARGIN, { width });
  doc.moveDown(0.15);
  doc.font("Body").fontSize(14).fillColor(NAVY).text(d.subtitle, { width });
  doc.moveDown(0.1);
  doc.font("Body").fontSize(12).fillColor(GREY).text(d.reportName, { width });
  doc.moveDown(0.5);
  rule(NAVY, 1.5);
  doc.moveDown(1);

  /* ---- Info table ---- */
  const labelW = 140;
  const info: [string, string][] = [
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
  const pad = 5;
  doc.save().moveTo(MARGIN, doc.y).lineTo(MARGIN + width, doc.y).lineWidth(0.5).strokeColor(RULE).stroke().restore();
  for (const [k, v] of info) {
    doc.font("Body").fontSize(10);
    const h = Math.max(doc.heightOfString(v, { width: width - labelW - pad * 3 }), 12) + pad * 2;
    ensureSpace(h);
    const y = doc.y;
    doc.save().rect(MARGIN, y, labelW, h).fill(LABEL_BG).restore();
    doc.font("Bold").fontSize(10).fillColor(NAVY).text(k, MARGIN + pad, y + pad, { width: labelW - pad * 2 });
    doc.font("Body").fontSize(10).fillColor("#000").text(v, MARGIN + labelW + pad * 2, y + pad, {
      width: width - labelW - pad * 3,
    });
    doc.y = y + h;
    doc.save().moveTo(MARGIN, doc.y).lineTo(MARGIN + width, doc.y).lineWidth(0.5).strokeColor(RULE).stroke().restore();
  }
  doc.x = MARGIN;
  doc.moveDown(0.8);
  doc
    .font("Italic")
    .fontSize(9)
    .fillColor(GREY)
    .text(
      `Times shown in ${d.timeZone}. This report records the candidate's submitted responses exactly as entered. It contains no evaluation or scoring.`,
      MARGIN,
      doc.y,
      { width },
    );

  /* ---- Items ---- */
  const fieldLabel = (label: string) => {
    ensureSpace(40);
    doc.moveDown(0.6);
    doc.font("Bold").fontSize(8.5).fillColor(GREY).text(label.toUpperCase(), MARGIN, doc.y, {
      width,
      characterSpacing: 0.6,
    });
    doc.moveDown(0.25);
  };
  const candidateText = (value: string | null, emptyLabel = "[No response]") => {
    if (!value || !value.trim()) {
      doc.font("Italic").fontSize(10.5).fillColor(GREY).text(emptyLabel, MARGIN, doc.y, { width });
      return;
    }
    doc
      .font("Body")
      .fontSize(11)
      .fillColor("#000")
      .text(value.replace(/\r\n?/g, "\n"), MARGIN, doc.y, { width, lineGap: 2.5, paragraphGap: 1 });
  };

  const item = (it: ReportItem) => {
    ensureSpace(150);
    doc.moveDown(1.4);
    rule(NAVY, 1.5);
    doc.moveDown(0.5);
    doc.font("Bold").fontSize(10).fillColor(NAVY).text(`ITEM ${it.id}`, MARGIN, doc.y, { width, characterSpacing: 1.2 });
    doc.moveDown(0.15);
    doc.font("Bold").fontSize(14).fillColor(NAVY).text(it.shortTitle, { width });
    doc.moveDown(0.2);
    doc.font("Body").fontSize(9).fillColor(GREY).text(`${it.formatLabel} · From: ${it.from}`, { width });
    doc.text(`Subject: ${it.subject}`, { width });

    if (it.type === "recommendation") {
      fieldLabel("Recommendation");
      candidateText(it.recommendation);
      doc.moveDown(0.5);
      doc.font("Bold").fontSize(10).fillColor("#000").text("Word count: ", MARGIN, doc.y, { continued: true });
      doc.font("Body").text(String(it.wordCount));
    } else {
      fieldLabel("Priority");
      if (it.priority) doc.font("Bold").fontSize(11).fillColor("#000").text(it.priority.toUpperCase(), MARGIN, doc.y, { width });
      else candidateText(null, "[Not set]");
      fieldLabel("Action");
      candidateText(it.action);
      fieldLabel("Say now / Hold");
      candidateText(it.sayHold);
    }
  };
  d.items.forEach(item);

  ensureSpace(60);
  doc.moveDown(2);
  rule(RULE, 0.75);
  doc.moveDown(0.6);
  doc.font("Bold").fontSize(11).fillColor("#000").text("Assessment status: ", MARGIN, doc.y, { continued: true });
  doc.fillColor(NAVY).text(d.status);
  doc.moveDown(0.2);
  doc.font("Italic").fontSize(9).fillColor(GREY).text("End of report", { width });

  /* ---- Footers with page numbers ---- */
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = doc.page.height - MARGIN - 12;
    doc.save().moveTo(MARGIN, y - 6).lineTo(MARGIN + width, y - 6).lineWidth(0.5).strokeColor(RULE).stroke().restore();
    doc.font("Body").fontSize(8).fillColor(GREY);
    doc.text(`${d.candidate.code} · ${d.reportName} · Confidential`, MARGIN, y, { width, lineBreak: false });
    const pageLabel = `Page ${i + 1} of ${range.count}`;
    doc.text(pageLabel, MARGIN + width - doc.widthOfString(pageLabel), y, { lineBreak: false });
    doc.page.margins.bottom = savedBottom;
  }

  doc.end();
  return done;
}
