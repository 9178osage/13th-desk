import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(join(root, file), "utf8");

function load(file, mocks) {
  const output = ts.transpileModule(read(file), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports = {};
  runInNewContext(output, {
    exports,
    console: { warn() {} },
    require: (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id === "react/jsx-runtime") return require(id);
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return exports;
}

const text = (node) =>
  typeof node === "string"
    ? node
    : Array.isArray(node)
      ? node.map(text).join(" ")
      : node?.props
        ? text(node.props.children)
        : "";
const buttons = (node, out = []) => {
  if (Array.isArray(node)) node.forEach((child) => buttons(child, out));
  else if (node?.props) {
    if (node.type === "button") out.push(node);
    buttons(node.props.children, out);
  }
  return out;
};

test("a failed optional part shows a six-language notice with Try again, not an error page", async () => {
  const react = require("react");
  const { deskText } = await import("../src/lib/desk-copy.ts");
  const { LoadBoundary } = load("src/components/load-boundary.tsx", {
    react,
    "@/lib/desk-copy": { deskText },
  });
  const expected = {
    en: ["This part didn't load. Your desk and saved data are fine.", "Try again"],
    zh: ["这一部分没有加载出来。书桌和已保存的内容都没有受影响。", "重试"],
    es: ["Esta parte no se cargó. Tu escritorio y tus datos guardados están bien.", "Reintentar"],
    ko: ["이 부분을 불러오지 못했어요. 책상과 저장된 내용은 그대로예요.", "다시 시도"],
    vi: ["Phần này chưa tải được. Bàn học và dữ liệu đã lưu vẫn ổn.", "Thử lại"],
    ja: ["この部分を読み込めませんでした。デスクと保存した内容はそのままです。", "再試行"],
  };
  for (const [lang, [message, retry]] of Object.entries(expected)) {
    let retried = 0;
    const boundary = new LoadBoundary({
      lang,
      onRetry: () => retried++,
      children: "chart",
    });
    assert.equal(boundary.render(), "chart", "renders its children while healthy");
    // React calls this when the lazy import rejects or the part throws while rendering.
    boundary.state = { ...boundary.state, ...LoadBoundary.getDerivedStateFromError(new Error()) };
    const notice = boundary.render();
    assert.equal(notice.props.role, "alert");
    assert.ok(text(notice).includes(message), lang);
    const [button] = buttons(notice);
    assert.equal(text(button), retry);
    let reset = null;
    boundary.setState = (next) => (reset = next);
    button.props.onClick();
    assert.equal(retried, 1, "Try again asks for a fresh import");
    assert.equal(reset?.failed, false, "and clears the notice");
  }
});

test("the palette and the GPA chart are wrapped; preloads never leave an unhandled rejection", () => {
  const shell = read("src/components/shell.tsx");
  assert.match(shell, /loadPalette\(\)\.catch\(\(\) => \{\}\)/);
  assert.doesNotMatch(shell, /void loadPalette\(\)/);
  assert.match(shell, /<LoadBoundary[\s\S]*?<CommandPalette[\s\S]*?<\/LoadBoundary>/);
  assert.match(shell, /useRetryableLazy\(loadPalette\)/);
  const gpa = read("src/routes/gpa.tsx");
  assert.match(gpa, /<LoadBoundary lang=\{lang\} onRetry=\{retryChart\}>[\s\S]*?<GpaChart/);
  // A rejected lazy() is cached by React; retry must create a new one.
  const hook = read("src/lib/retryable-lazy.ts");
  assert.match(hook, /setLoaded\(\(\) => lazy\(load\)\)/);
});
