import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { getResponses, responsesDto, saveResponse, startSession, submitSession, SessionError } from "@/lib/sessions";
import { buildReportData } from "@/lib/report/data";
import { renderDocx } from "@/lib/report/docx";
import { renderPdf } from "@/lib/report/pdf";
import fs from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

/** Pull word/document.xml out of a .docx (a zip) without extra dependencies. */
function docxXml(buf: Buffer): string {
  let i = buf.indexOf("word/document.xml");
  while (i > 0 && buf.readUInt32LE(i - 30) !== 0x04034b50) i = buf.indexOf("word/document.xml", i + 1);
  const h = i - 30;
  const method = buf.readUInt16LE(h + 8);
  const size = buf.readUInt32LE(h + 18);
  const start = h + 30 + buf.readUInt16LE(h + 26) + buf.readUInt16LE(h + 28);
  const body = buf.subarray(start, start + size);
  return (method === 8 ? inflateRawSync(body) : body).toString("utf8");
}
const docxText = (buf: Buffer) => docxXml(buf).replace(/<[^>]+>/g, "");

async function candidateId(code: string) {
  const db = await getDb();
  const [c] = await db.query<{ id: string }>(`select id from candidates where candidate_code = $1`, [code]);
  return c.id;
}

describe("Say now / Hold storage", () => {
  let sessionId: string;
  beforeAll(async () => {
    sessionId = (await startSession(await candidateId("C01"))).id;
  });

  it("migration is safe to run more than once", async () => {
    const db = await getDb(); // init already applied schema.sql once
    const schema = fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
    const stmts = schema
      .split("\n")
      .filter((l) => !l.trim().startsWith("--"))
      .join("\n")
      .split(/;\s*(?:\n|$)/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (let n = 0; n < 2; n++) for (const s of stmts) await db.query(s);
    const cols = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_name = 'assessment_responses'`,
    );
    expect(cols.map((c) => c.column_name)).toEqual(
      expect.arrayContaining(["say_now_text", "hold_text", "say_hold_text"]),
    );
  });

  it("stores say_now and hold separately and reads them back", async () => {
    await saveResponse(sessionId, 1, { say_now_text: "Tell Ravi now", hold_text: "Hold the date" });
    const r = (await getResponses(sessionId)).find((x) => x.item_id === 1)!;
    expect(r.say_now_text).toBe("Tell Ravi now");
    expect(r.hold_text).toBe("Hold the date");
    expect(r.say_hold_text).toBeNull();
    expect(responsesDto([r])[0]).toMatchObject({ say_now_text: "Tell Ravi now", hold_text: "Hold the date" });

    const db = await getDb();
    const versions = await db.query<{ field_changed: string }>(
      `select field_changed from response_versions where session_id = $1 and item_id = 1`,
      [sessionId],
    );
    expect(versions.map((v) => v.field_changed).sort()).toEqual(["hold_text", "say_now_text"]);
  });

  it("allows either field to be empty", async () => {
    await saveResponse(sessionId, 2, { say_now_text: "Only this", hold_text: "" });
    const r = (await getResponses(sessionId)).find((x) => x.item_id === 2)!;
    expect([r.say_now_text, r.hold_text]).toEqual(["Only this", null]);
  });

  it("rejects the new fields on Item 9", async () => {
    await expect(saveResponse(sessionId, 9, { say_now_text: "x" })).rejects.toBeInstanceOf(SessionError);
  });

  it("keeps legacy combined data and shows everything in the export", async () => {
    // Simulate a response saved before the split.
    const db = await getDb();
    await db.query(
      `update assessment_responses set say_hold_text = 'Say: thanks / Hold: budget' where session_id = $1 and item_id = 3`,
      [sessionId],
    );
    await submitSession(sessionId, "manual");

    const data = await buildReportData(sessionId);
    const it1 = data.items.find((i) => i.id === 1)!;
    const it3 = data.items.find((i) => i.id === 3)!;
    expect([it1.sayNow, it1.hold, it1.sayHoldLegacy]).toEqual(["Tell Ravi now", "Hold the date", null]);
    expect(it3.sayHoldLegacy).toBe("Say: thanks / Hold: budget");
    expect(it3.blank).toBe(false);

    const text = docxText(await renderDocx(data));
    // Field labels are rendered in capitals.
    expect(text).toContain("SAY NOWTell Ravi now");
    expect(text).toContain("HOLDHold the date");
    expect(text).toContain("SAY NOW / HOLD (LEGACY)Say: thanks / Hold: budget");
    // Legacy heading only appears on the item that has legacy data.
    expect(text.split("SAY NOW / HOLD (LEGACY)")).toHaveLength(2);

    const pdf = await renderPdf(data);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
