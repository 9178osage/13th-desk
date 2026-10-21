import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { transform } from "lightningcss";
import { rolldown } from "rolldown";

const css = readFileSync(new URL("../src/styles.css", import.meta.url));

// Parse the shipped CSS instead of matching comments or formatting with regexes.
function parse(code) {
  let sheet;
  transform({
    filename: "mobile-layout.css",
    code: Buffer.from(code),
    errorRecovery: false,
    visitor: {
      StyleSheet(value) {
        sheet = value;
      },
    },
  });
  return sheet.rules;
}

const rules = parse(css);
const selectorCache = new Map();
function selectorAst(selector) {
  if (!selectorCache.has(selector)) {
    selectorCache.set(selector, JSON.stringify(parse(`${selector} {}`)[0].value.selectors[0]));
  }
  return selectorCache.get(selector);
}

function matchesWidth(query, width) {
  return query.mediaQueries.some(({ mediaType, condition }) => {
    if (mediaType !== "all" || condition?.type !== "feature") return false;
    const feature = condition.value;
    const length = feature.value?.value?.value;
    if (feature.name !== "width" || length?.unit !== "px") return false;
    if (feature.operator === "less-than-equal") return width <= length.value;
    if (feature.operator === "greater-than-equal") return width >= length.value;
    return false;
  });
}

function declaration(selector, property, width = 390) {
  const target = selectorAst(selector);
  let found;
  function walk(nodes) {
    for (const rule of nodes) {
      if (rule.type === "media" && matchesWidth(rule.value.query, width)) {
        walk(rule.value.rules);
      } else if (rule.type === "style") {
        if (!rule.value.selectors.some((entry) => JSON.stringify(entry) === target)) continue;
        for (const item of rule.value.declarations.declarations) {
          const name =
            item.property === "unparsed"
              ? item.value.propertyId.property
              : item.property === "custom"
                ? item.value.name
                : item.property;
          if (name === property) found = item;
        }
      }
    }
  }
  walk(rules);
  return found;
}

function expectDeclaration(selector, property, value, width) {
  const expected = parse(`${selector} { ${property}: ${value}; }`)[0].value.declarations
    .declarations[0];
  assert.deepEqual(declaration(selector, property, width), expected, `${selector}: ${property}`);
}

test("mobile text controls use readable type without disabling pinch zoom", () => {
  for (const width of [320, 390, 430, 767]) {
    for (const selector of [
      '.desk-shell input:not([type="checkbox"]):not([type="radio"])',
      ".desk-shell select",
      ".desk-shell textarea",
    ]) {
      expectDeclaration(selector, "font-size", "1rem", width);
      assert.equal(declaration(selector, "font-size", 768), undefined);
    }
  }
  const root = readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(root, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:[,"'\s]|$)/);
});

test("mobile preference controls share flexible columns and the compact search breakpoint", () => {
  for (const width of [320, 390, 767]) {
    expectDeclaration(".desk-preferences", "display", "grid", width);
    expectDeclaration(
      ".desk-preferences",
      "grid-template-columns",
      "repeat(2, minmax(0, 1fr))",
      width,
    );
    expectDeclaration(".desk-preferences label", "min-width", "0", width);
    expectDeclaration(".desk-preferences select", "width", "100%", width);
    expectDeclaration(".desk-preferences select", "max-width", "none", width);
    expectDeclaration(".desk-preferences label > span:not(.sr-only)", "display", "block", width);
    expectDeclaration(
      ".desk-preferences label > span:not(.sr-only)",
      "position",
      "absolute",
      width,
    );
    expectDeclaration(
      ".desk-preferences label > span:not(.sr-only)",
      "clip-path",
      "inset(50%)",
      width,
    );
    expectDeclaration(".palette-trigger-label", "display", "none", width);
  }
  expectDeclaration(".desk-preferences", "display", "flex", 768);
  assert.equal(declaration(".palette-trigger-label", "display", 768), undefined);
});

test("mobile backup, notice and district actions have at least 44px targets", () => {
  for (const selector of [".backup-link", ".district-toolbar button", ".district-toolbar select"]) {
    expectDeclaration(selector, "min-height", "44px");
  }
  expectDeclaration(".backup-link", "min-width", "44px");
  for (const selector of [".backup-undo-dismiss", ".tab-notice-dismiss"]) {
    expectDeclaration(selector, "width", "44px");
    expectDeclaration(selector, "height", "44px");
  }
  expectDeclaration(".backup-link", "min-height", "36px", 1280);
});

test("mobile content and focus scrolling reserve bottom navigation and landscape safe areas", () => {
  expectDeclaration("html", "scroll-padding-bottom", "var(--mobile-nav-space)");
  expectDeclaration(".desk-workspace", "padding-bottom", "var(--mobile-nav-space)");
  for (const selector of [".desk-topbar", ".shell-main", ".district-toolbar", ".desk-footer"]) {
    expectDeclaration(
      selector,
      "padding-left",
      "max(var(--page-gutter), env(safe-area-inset-left))",
    );
    expectDeclaration(
      selector,
      "padding-right",
      "max(var(--page-gutter), env(safe-area-inset-right))",
    );
  }
  expectDeclaration(".task-filters button", "min-width", "0");
});

test("mobile task filters keep whole labels with counts on their own line", () => {
  expectDeclaration(".task-filters button", "flex", "1");
  expectDeclaration(".task-filters button", "white-space", "nowrap");
  expectDeclaration(".task-filters button span", "display", "block");
  expectDeclaration(".task-filters button span", "margin-left", "0");
  assert.equal(declaration(".task-filters button", "overflow-wrap"), undefined);
});

test("search results can shrink and scroll inside a dynamic-height dialog", () => {
  expectDeclaration(".palette-content", "display", "flex");
  expectDeclaration(".palette-content", "overflow", "hidden");
  expectDeclaration(
    ".palette-content",
    "max-height",
    "calc(100dvh - var(--palette-top) - max(0.75rem, env(safe-area-inset-bottom)))",
  );
  expectDeclaration(".palette", "min-height", "0");
  expectDeclaration(".palette-input", "flex-shrink", "0");
  expectDeclaration(".palette-list", "min-height", "0");
  expectDeclaration(".palette-list", "max-height", "min(60dvh, 26rem)");
  expectDeclaration(".palette-list", "overflow-y", "auto");
  expectDeclaration(".palette-close", "flex-shrink", "0");
  expectDeclaration(".icon-button", "width", "44px");
});

test("mobile backup and confirmation panels are scroll-contained and viewport-bounded", () => {
  expectDeclaration(".backup-panel", "max-height", "min(85dvh, 36rem)");
  expectDeclaration(
    ".dialog-content",
    "max-height",
    "calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom)))",
  );
  for (const selector of [".backup-panel", ".dialog-content"]) {
    expectDeclaration(selector, "overscroll-behavior", "contain");
  }
});

test("mobile GPA spacing and submit adapt without changing desktop spacing", () => {
  expectDeclaration(".gpa-page", "gap", "1.5rem");
  expectDeclaration(".gpa-add-submit", "width", "100%");
  expectDeclaration(".gpa-empty-state", "padding-block", "1.25rem");
  assert.equal(declaration(".gpa-page", "gap", 768), undefined);
  assert.equal(declaration(".gpa-add-submit", "width", 768), undefined);
});

test("the real GPA add form pairs credits and grade while keeping the name full-width", async () => {
  const mocks = {
    react:
      'export const lazy=()=>"Lazy", Suspense="Suspense", useEffect=()=>{}, useMemo=fn=>fn(), useState=value=>[typeof value==="function"?value():value,()=>{}];',
    "react/jsx-runtime":
      'export const jsx=(type,props)=>({type,props}); export const jsxs=jsx, Fragment="Fragment";',
    "@tanstack/react-router": "export const createFileRoute=()=>options=>options;",
    "@radix-ui/react-alert-dialog":
      'export const Root="Root", Trigger="Trigger", Portal="Portal", Overlay="Overlay", Content="Content", Title="Title", Description="Description", Cancel="Cancel", Action="Action";',
    "@/lib/store":
      "export const useLang=()=>fixture.lang; export const useDesk=select=>select(fixture.desk);",
    "@/lib/desk-replaced": "export const useDeskReplaced=()=>{};",
    "@/components/gpa-chart": "export default function Chart() {}",
  };
  const bundle = await rolldown({
    input: "src/routes/gpa.tsx",
    platform: "node",
    tsconfig: "tsconfig.json",
    resolve: { alias: { "@": process.cwd() + "/src" } },
    plugins: [
      {
        name: "mobile-gpa-form-test",
        resolveId(id) {
          if (id in mocks) return "mock:" + id;
        },
        load(id) {
          if (id.startsWith("mock:")) return mocks[id.slice(5)];
        },
      },
    ],
  });
  let output;
  try {
    output = await bundle.generate({ format: "cjs", codeSplitting: false });
  } finally {
    await bundle.close();
  }
  const fixture = { lang: "en", desk: { level: "uni", hydrated: true, buckets: {} } };
  const module = { exports: {} };
  new Function(
    "require",
    "module",
    "exports",
    "fixture",
    output.output.find((item) => item.type === "chunk").code,
  )(createRequire(import.meta.url), module, module.exports, fixture);
  function find(node, predicate) {
    if (!node || typeof node !== "object") return null;
    if (predicate(node)) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const found = find(child, predicate);
      if (found) return found;
    }
    return null;
  }
  for (const level of ["elem", "mid", "high", "uni"]) {
    fixture.desk.level = level;
    fixture.desk.buckets[level] = {
      grades: [],
      priorGpa: "",
      priorWeighted: "",
      priorCredits: "",
    };
    for (const lang of ["en", "zh", "es", "ko", "vi", "ja"]) {
      fixture.lang = lang;
      const tree = module.exports.Route.component();
      const form = find(tree, (node) => node.type === "form");
      assert.ok(form, `${level}/${lang}: add form`);
      const fields = find(form, (node) => node.props?.className === "grid grid-cols-2 gap-3");
      assert.ok(fields, `${level}/${lang}: paired controls on narrow screens`);
      const name = fields.props.children[0];
      assert.equal(name.type, "label");
      assert.match(name.props.className, /\bcol-span-2\b/);
      const grade = fields.props.children.at(-1);
      assert.equal(grade.type, "label");
      assert.equal(/\bcol-span-2\b/.test(grade.props.className), level === "elem");
      assert.ok(find(grade, (node) => node.type === "select" && node.props.value === "A"));
      const submit = find(form, (node) => node.props?.className === "gpa-add-submit");
      assert.equal(submit.props.type, "submit");
      assert.equal(submit.props.disabled, false);
    }
  }
});
