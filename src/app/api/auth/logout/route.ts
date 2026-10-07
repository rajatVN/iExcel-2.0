import { clearCandidateCookie } from "@/lib/auth";
import { json } from "@/lib/api";

export async function POST() {
  await clearCandidateCookie();
  return json({ ok: true });
}
