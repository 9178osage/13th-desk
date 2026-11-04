import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));

describe("Node.js version configuration", () => {
  it("keeps package.json engines.node aligned with .nvmrc", () => {
    const major = readFileSync(`${root}/.nvmrc`, "utf8").trim();
    const { engines } = JSON.parse(readFileSync(`${root}/package.json`, "utf8"));

    assert.match(major, /^\d+$/, ".nvmrc must contain a Node.js major version");
    assert.equal(engines?.node, `${major}.x`);
  });
});
