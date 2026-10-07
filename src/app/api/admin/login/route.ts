import { z } from "zod";
import { setAdminCookie } from "@/lib/auth";
import { adminAccessCode } from "@/lib/config";
import { safeEqual } from "@/lib/passwords";
import { errorJson, json, readJson } from "@/lib/api";

const Body = z.object({ accessCode: z.string().min(1).max(256) });

export async function POST(req: Request) {
  const expected = adminAccessCode();
  if (!expected) return errorJson("admin_disabled", 503, { message: "ADMIN_ACCESS_CODE is not configured" });
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success || !safeEqual(parsed.data.accessCode.trim(), expected)) {
    return errorJson("invalid_credentials", 401);
  }
  await setAdminCookie();
  return json({ ok: true });
}
