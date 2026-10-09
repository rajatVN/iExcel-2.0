import { z } from "zod";
import { getCandidate } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { errorJson, json, readJson } from "@/lib/api";

const Body = z.object({
  name: z
    .string()
    .transform((s) => s.trim().replace(/\s+/g, " "))
    .pipe(z.string().min(2).max(80).regex(/\p{L}/u)),
});

/**
 * The candidate's own name, entered once before the assessment. It replaces
 * the seeded placeholder so admins and reports show who the candidate is.
 * It cannot be changed by the candidate afterwards.
 */
export async function POST(req: Request) {
  const candidate = await getCandidate();
  if (!candidate) return errorJson("unauthorised", 401);
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return errorJson("invalid_name", 400);
  const db = await getDb();
  const rows = await db.query<{ name: string }>(
    `update candidates set name = $2, name_confirmed_at = now()
      where id = $1 and name_confirmed_at is null
      returning name`,
    [candidate.id, parsed.data.name],
  );
  if (!rows[0]) return errorJson("already_set", 409);
  return json({ ok: true, name: rows[0].name });
}
