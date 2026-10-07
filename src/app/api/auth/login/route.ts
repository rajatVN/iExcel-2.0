import { z } from "zod";
import { getDb } from "@/lib/db";
import { setCandidateCookie } from "@/lib/auth";
import { verifyAccessCode } from "@/lib/passwords";
import { errorJson, json, readJson } from "@/lib/api";

const Body = z.object({
  candidateCode: z.string().trim().min(1).max(64),
  accessCode: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return errorJson("invalid_credentials", 400);
  const db = await getDb();
  const rows = await db.query<{ id: string; access_code_hash: string }>(
    `select id, access_code_hash from candidates where upper(candidate_code) = upper($1)`,
    [parsed.data.candidateCode],
  );
  const c = rows[0];
  if (!c || !verifyAccessCode(parsed.data.accessCode.trim(), c.access_code_hash)) {
    return errorJson("invalid_credentials", 401);
  }
  await setCandidateCookie(c.id);
  return json({ ok: true });
}
