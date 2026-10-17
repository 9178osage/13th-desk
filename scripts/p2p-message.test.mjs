import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

test("inactive P2P helper rejects malformed packets before touching their fields", () => {
  const source = readFileSync(new URL("../src/lib/multiplayer/p2p.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source.replaceAll("import.meta.env", "({})"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(code, { exports });
  const received = [];
  const room = new exports.P2PRoom({
    room: "qa",
    selfId: "self",
    onMessage: (...args) => received.push(args),
  });
  const channel = { label: "reliable" };
  room.attachChannel({ info: { id: "peer" } }, channel);
  for (const data of [
    "{",
    "null",
    "0",
    "false",
    '"text"',
    "[]",
    "{}",
    '{"t":"unknown","d":"ignored"}',
  ]) {
    assert.doesNotThrow(() => channel.onmessage({ data }));
  }
  assert.equal(received.length, 0);
  channel.onmessage({ data: '{"t":"d","d":"safe payload"}' });
  assert.equal(received.length, 1);
  assert.deepEqual(received[0], ["peer", "safe payload", "reliable"]);
});
