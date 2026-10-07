import "server-only";
import fs from "node:fs";
import path from "node:path";
import { seedDatabase } from "./seed";

/**
 * Minimal database adapter.
 *
 * - DATABASE_URL set   → PostgreSQL over the network (Supabase), via `postgres`.
 * - DATABASE_URL empty → embedded PostgreSQL (PGlite) persisted in ./.data/pglite.
 *
 * Both speak the same SQL, so the schema and every query are shared.
 */

export type Row = Record<string, unknown>;

export interface Queryable {
  query<T extends Row = Row>(text: string, params?: unknown[]): Promise<T[]>;
}

export interface Database extends Queryable {
  transaction<R>(fn: (tx: Queryable) => Promise<R>): Promise<R>;
  kind: "pglite" | "postgres";
}

async function createPglite(): Promise<Database> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const pg = new PGlite(dir);
  await pg.waitReady;
  return {
    kind: "pglite",
    async query<T extends Row>(text: string, params: unknown[] = []) {
      const res = await pg.query<T>(text, params);
      return res.rows;
    },
    async transaction<R>(fn: (tx: Queryable) => Promise<R>) {
      return pg.transaction(async (tx) =>
        fn({
          async query<T extends Row>(text: string, params: unknown[] = []) {
            const res = await tx.query<T>(text, params);
            return res.rows;
          },
        }),
      );
    },
  };
}

async function createPostgres(url: string): Promise<Database> {
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, {
    max: 5,
    prepare: false, // compatible with Supabase's transaction pooler
    ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
    onnotice: () => {},
  });
  // Both the pool and a transaction handle expose `unsafe(text, params)`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Unsafe = { unsafe: (text: string, params?: any[]) => PromiseLike<unknown> };
  const wrap = (s: Unsafe): Queryable => ({
    async query<T extends Row>(text: string, params: unknown[] = []) {
      return (await s.unsafe(text, params)) as unknown as T[];
    },
  });
  return {
    kind: "postgres",
    query: wrap(sql).query,
    async transaction<R>(fn: (tx: Queryable) => Promise<R>) {
      return (await sql.begin((tx) => fn(wrap(tx)))) as R;
    },
  };
}

async function init(): Promise<Database> {
  const url = process.env.DATABASE_URL?.trim();
  const db = url ? await createPostgres(url) : await createPglite();
  const schema = fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  for (const stmt of splitSql(schema)) await db.query(stmt);
  await seedDatabase(db);
  return db;
}

/** Split on semicolons at end of line, ignoring `--` comments. Schema has no functions/strings with ';'. */
function splitSql(sql: string): string[] {
  return sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// One instance per server process (survives Next.js hot reloads).
const g = globalThis as unknown as { __inbasketDb?: Promise<Database> };

export function getDb(): Promise<Database> {
  if (!g.__inbasketDb) {
    g.__inbasketDb = init().catch((err) => {
      g.__inbasketDb = undefined;
      throw err;
    });
  }
  return g.__inbasketDb;
}

/** Normalise bytea results (Uint8Array from PGlite, Buffer from postgres). */
export function toBuffer(v: unknown): Buffer {
  if (Buffer.isBuffer(v)) return v;
  if (v instanceof Uint8Array) return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
  throw new Error("Expected binary column");
}
