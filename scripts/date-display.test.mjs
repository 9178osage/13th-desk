import { test } from "node:test";
import assert from "node:assert/strict";
import { rolldown } from "rolldown";
import { createRequire } from "node:module";

test("real date display tolerates invalid dates and keeps all six languages", async () => {
  const bundle = await rolldown({
    input: "src/lib/time.ts",
    platform: "node",
    tsconfig: "tsconfig.json",
    resolve: { alias: { "@": process.cwd() + "/src" } },
  });
  const output = await bundle.generate({ format: "cjs", codeSplitting: false });
  await bundle.close();
  const module = { exports: {} };
  new Function(
    "require",
    "module",
    "exports",
    output.output.find((item) => item.type === "chunk").code,
  )(createRequire(import.meta.url), module, module.exports);
  const { formatWhen } = module.exports;
  for (const lang of ["en", "zh", "es", "ko", "vi", "ja"]) {
    for (const invalid of ["2026-13-01", "2026-02-31", "2026-02-29", "2026-1-01", ""]) {
      assert.equal(formatWhen(invalid, "2026-02-28", lang), "—", `${lang} ${invalid}`);
    }
    assert.ok(formatWhen("2024-02-29", "2024-02-28", lang));
    assert.ok(formatWhen("2026-10-17", "invalid today", lang));
    assert.equal(
      formatWhen("2026-10-17", "invalid today", lang),
      formatWhen("2026-10-17", "2026-10-01", lang),
    );
  }
});
