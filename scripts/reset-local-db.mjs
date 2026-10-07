// Deletes the LOCAL embedded database (./.data/pglite). Stop `npm run dev` first.
// Has no effect on a Supabase database configured via DATABASE_URL.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";

const dir = path.join(process.cwd(), ".data", "pglite");
if (!fs.existsSync(dir)) {
  console.log("No local database found at", dir);
  process.exit(0);
}
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question(
  `This permanently deletes ALL local candidate sessions, responses and reports in\n  ${dir}\nType RESET to continue: `,
);
rl.close();
if (answer.trim() !== "RESET") {
  console.log("Cancelled.");
  process.exit(1);
}
fs.rmSync(dir, { recursive: true, force: true });
console.log("Local database deleted. It will be recreated and re-seeded on next start.");
