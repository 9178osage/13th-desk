import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tempDir } from "./temp-dir.mjs";
import { test } from "node:test";
import { isMigrationFile, migrationName, pendingMigrations } from "./migration-plan.mjs";
import { projectRoot } from "./with-app-env.mjs";

const AUTH_MIGRATION = "0001_auth.sql";

/**
 * The auth-on copy of the Better Auth schema and its source, or null when the
 * app has not turned sign-in on (the shipped state).
 */
function authSchemaCopy(root) {
  const copy = join(root, "migrations", AUTH_MIGRATION);
  const source = join(root, "migrations/auth", AUTH_MIGRATION);
  if (!existsSync(copy) || !existsSync(source)) return null;
  return { copy: readFileSync(copy, "utf8"), source: readFileSync(source, "utf8") };
}

test("_migrations keys on basename, not path", () => {
  assert.equal(migrationName("/migrations/0002_todos.sql"), "0002_todos.sql");
  assert.equal(migrationName("migrations/auth/0001_auth.sql"), "0001_auth.sql");
  assert.equal(migrationName("0001_auth.sql"), "0001_auth.sql");
});

test("a file already applied from another directory does not re-apply", () => {
  // The auth-on path copies migrations/auth/0001_auth.sql into the globbed
  // directory; a database that already has it must not run it twice.
  assert.deepEqual(pendingMigrations(["/migrations/0001_auth.sql"], ["0001_auth.sql"]), []);
});

test("pending migrations are returned in name order", () => {
  assert.deepEqual(
    pendingMigrations(
      ["/migrations/0003_c.sql", "/migrations/0001_a.sql", "/migrations/0002_b.sql"],
      ["0001_a.sql"],
    ),
    [
      { name: "0002_b.sql", path: "/migrations/0002_b.sql" },
      { name: "0003_c.sql", path: "/migrations/0003_c.sql" },
    ],
  );
});

test("non-.sql entries are dropped (readdir also yields the auth/ directory)", () => {
  assert.equal(isMigrationFile("auth"), false);
  assert.deepEqual(pendingMigrations(["auth", "README.md"], []), []);
});

test("the auth schema ships outside the globbed directory", () => {
  const migrationsDir = join(projectRoot(), "migrations");
  assert.deepEqual(pendingMigrations(readdirSync(migrationsDir), []), []);
  assert.ok(readdirSync(join(migrationsDir, "auth")).includes("0001_auth.sql"));
});

test("this workspace's auth schema copy is byte-identical to its source", () => {
  // An edited copy diverges silently: basename keying skips it on a database
  // that already ran the original, and applies it on a fresh PGLite preview.
  const pair = authSchemaCopy(projectRoot());
  if (pair === null) return; // sign-in off — nothing has been copied up
  assert.equal(
    pair.copy,
    pair.source,
    "migrations/0001_auth.sql has been edited — it must stay a verbatim copy of migrations/auth/0001_auth.sql",
  );
});

test("the copy check reads both files and catches an edit", () => {
  const root = tempDir("auth-schema-");
  mkdirSync(join(root, "migrations/auth"), { recursive: true });
  writeFileSync(join(root, "migrations/auth", AUTH_MIGRATION), "create table t ();\n");
  assert.equal(authSchemaCopy(root), null);

  writeFileSync(join(root, "migrations", AUTH_MIGRATION), "create table t ();\n");
  const same = authSchemaCopy(root);
  assert.equal(same.copy, same.source);

  writeFileSync(join(root, "migrations", AUTH_MIGRATION), "create table t (x int);\n");
  const drifted = authSchemaCopy(root);
  assert.notEqual(drifted.copy, drifted.source);
});

test("DATABASE_URL: blank means unset and values are trimmed, for the migrator and db.ts alike", async () => {
  const { databaseUrlFrom } = await import("./migration-plan.mjs");
  for (const blank of [undefined, null, "", " ", "\t\n  "])
    assert.equal(databaseUrlFrom(blank), undefined);
  assert.equal(databaseUrlFrom("  postgres://u@h/db \n"), "postgres://u@h/db");
  const migrate = readFileSync(new URL("./migrate.mjs", import.meta.url), "utf8");
  assert.match(migrate, /const databaseUrl = databaseUrlFrom\(process\.env\.DATABASE_URL\);/);
  const db = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  assert.match(db, /const databaseUrl = databaseUrlFrom\(/);
  assert.doesNotMatch(db, /rawDatabaseUrl/);
});

test("the migrator skips a whitespace-only DATABASE_URL instead of opening a pool", async () => {
  const { spawnSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  // fileURLToPath, not URL.pathname: a checkout path with a space ("Eugene Student Web")
  // would otherwise reach node as "Eugene%20Student%20Web" (audit 2026-11-28 P2-02).
  const migrate = fileURLToPath(new URL("./migrate.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [migrate], {
    env: { ...process.env, DATABASE_URL: "   " },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /DATABASE_URL not set — skipping/);
});
