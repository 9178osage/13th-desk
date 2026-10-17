import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const root = join(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const compiled = new Map();

// Execute the actual TSX and its event handlers without a browser or real desk storage.
function load(file, mocks = {}, globals = {}) {
  if (!compiled.has(file)) {
    const source = readFileSync(join(root, file), "utf8");
    compiled.set(
      file,
      ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText,
    );
  }
  const exports = {};
  runInNewContext(compiled.get(file), {
    exports,
    require: (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id === "react/jsx-runtime") return require(id);
      throw new Error(`Unexpected component dependency: ${id}`);
    },
    ...globals,
  });
  return exports;
}

function hookRunner() {
  const slots = [];
  let cursor = 0;
  let effects = [];
  let dirty = false;
  let mounted = true;
  let writes = 0;
  const sameDeps = (a, b) =>
    a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useState(initial) {
      const i = cursor++;
      slots[i] ??= { value: typeof initial === "function" ? initial() : initial };
      return [
        slots[i].value,
        (next) => {
          assert.ok(mounted, "a stale callback must not update an unmounted component");
          writes++;
          const value = typeof next === "function" ? next(slots[i].value) : next;
          if (!Object.is(value, slots[i].value)) dirty = true;
          slots[i].value = value;
        },
      ];
    },
    useRef(initial) {
      return (slots[cursor++] ??= { current: initial });
    },
    useEffect(effect, deps) {
      const i = cursor++;
      const previous = slots[i];
      if (sameDeps(previous?.deps, deps)) return;
      effects.push(() => {
        previous?.cleanup?.();
        slots[i] = { deps, cleanup: effect() };
      });
    },
    useMemo(compute, deps) {
      const i = cursor++;
      if (!sameDeps(slots[i]?.deps, deps)) slots[i] = { deps, value: compute() };
      return slots[i].value;
    },
    lazy: () => "LazyChart",
    Suspense: "Suspense",
  };
  return {
    hooks,
    get writes() {
      return writes;
    },
    render(Component) {
      for (let pass = 0; pass < 10; pass++) {
        cursor = 0;
        effects = [];
        dirty = false;
        const tree = Component();
        for (const effect of effects) effect();
        if (!dirty) return tree;
      }
      throw new Error("Component did not settle after its effects");
    },
    unmount() {
      for (const slot of slots) slot?.cleanup?.();
      mounted = false;
    },
  };
}

function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}

function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join("");
  if (typeof tree === "string" || typeof tree === "number") return String(tree);
  return tree?.props ? text(tree.props.children) : "";
}

const tr = (lang, copy) => copy[lang] || copy.en;
const districts = load("src/data/districts.ts");
const gpa = load("src/lib/gpa.ts");
const langs = ["en", "zh", "es", "ko", "vi", "ja"];
const position = { coords: { longitude: -123.0726, latitude: 44.0448 } };
const outside = { coords: { longitude: 0, latitude: 0 } };
const failedNotes = [
  "No location came back. Pick the district yourself.",
  "暂时无法获取位置，请手动选择学区。",
  "No llegó la ubicación. Elige el distrito tú.",
  "위치를 받지 못했어요. 학구를 직접 고르세요.",
  "Không lấy được vị trí. Tự chọn học khu.",
  "位置が取れませんでした。学区は自分で選んでください。",
];

function districtFixture({ supported = true } = {}) {
  const runner = hookRunner();
  const requests = [];
  const choices = [];
  let lang = "en";
  const state = {
    level: "mid",
    district: null,
    setDistrict(value) {
      choices.push(value);
      state.district = value;
    },
  };
  const { DistrictBar } = load(
    "src/components/district-bar.tsx",
    {
      react: runner.hooks,
      "@/data/districts": districts,
      "@/lib/store": { useLang: () => lang, useDesk: (select) => select(state) },
      "@/lib/text": { tr },
      "@/lib/cn": { cn: (...parts) => parts.filter(Boolean).join(" ") },
    },
    {
      navigator: supported
        ? {
            geolocation: {
              getCurrentPosition: (success, error) => requests.push({ success, error }),
            },
          }
        : {},
    },
  );
  let tree;
  const render = () => (tree = runner.render(DistrictBar));
  const locateButton = () => nodes(tree).find((n) => n.type === "button" && "disabled" in n.props);
  render();
  nodes(tree)
    .find((n) => n.type === "button")
    .props.onClick();
  render();
  return {
    runner,
    state,
    requests,
    choices,
    render,
    locateButton,
    note: () => text(nodes(tree).find((n) => n.type === "p")),
    locate() {
      assert.equal(locateButton().props.disabled, false);
      locateButton().props.onClick();
      render();
      return requests.at(-1);
    },
    select(value) {
      nodes(tree)
        .find((n) => n.type === "select")
        .props.onChange({ target: { value } });
      render();
    },
    language(value) {
      lang = value;
      render();
    },
  };
}

test("manual district selection, including unset, invalidates pending success and error callbacks", () => {
  for (const selection of ["bethel", ""]) {
    for (const finish of [
      (r) => r.success(position),
      (r) => r.success(outside),
      (r) => r.error(),
    ]) {
      const f = districtFixture();
      const request = f.locate();
      f.select(selection);
      const writes = f.runner.writes;
      finish(request);
      f.render();
      assert.equal(f.state.district, selection || null);
      assert.deepEqual(f.choices, [selection || null]);
      assert.equal(f.runner.writes, writes);
      assert.equal(f.locateButton().props.disabled, false);
      // Bethel has its separate calendar notice, but stale location feedback must stay absent.
      assert.ok(!f.note().includes("location"));
    }
  }
});

test("level changes and unmount invalidate both geolocation callbacks", () => {
  for (const level of ["high", "uni"]) {
    for (const finish of [(r) => r.success(position), (r) => r.error()]) {
      const f = districtFixture();
      const request = f.locate();
      f.state.level = level;
      f.render();
      const writes = f.runner.writes;
      finish(request);
      assert.equal(f.runner.writes, writes);
      assert.deepEqual(f.choices, []);
      if (level === "high") assert.equal(f.locateButton().props.disabled, false);
    }
  }
  for (const finish of [(r) => r.success(position), (r) => r.success(outside), (r) => r.error()]) {
    const f = districtFixture();
    const request = f.locate();
    f.runner.unmount();
    const writes = f.runner.writes;
    finish(request);
    assert.equal(f.runner.writes, writes);
    assert.deepEqual(f.choices, []);
  }
});

test("a stale error cannot clear a newer lookup's busy state or successful feedback", () => {
  const f = districtFixture();
  const old = f.locate();
  f.select("bethel");
  const current = f.locate();
  old.error();
  f.render();
  assert.equal(f.locateButton().props.disabled, true);
  assert.equal(f.state.district, "bethel");
  current.success(position);
  f.render();
  const note = f.note();
  assert.ok(note.startsWith("This is where you are standing: Eugene 4J."));
  old.error();
  old.success(outside);
  f.render();
  assert.equal(f.note(), note);
  assert.equal(f.locateButton().props.disabled, false);
  assert.deepEqual(f.choices, ["bethel", "4j"]);
});

test("district feedback uses the current language during and after each lookup outcome", () => {
  const cases = [
    { finish: (r) => r.error(), expected: failedNotes },
    {
      finish: (r) => r.success(position),
      expected: [
        "This is where you are standing: Eugene 4J.",
        "根据当前位置，可能属于尤金 4J 学区。",
        "Según donde estás parado: Eugene 4J.",
        "지금 서 있는 곳으로는 Eugene 4J예요.",
        "Theo chỗ bạn đang đứng: Eugene 4J.",
        "今立っている場所だと Eugene 4J です。",
      ],
    },
    {
      finish: (r) => r.success(outside),
      expected: [
        "That spot is outside the districts around Eugene.",
        "当前位置不在已收录的学区范围内，",
        "Ese punto está fuera de los distritos cerca de Eugene.",
        "그 위치는 유진 근처 학구 밖이에요.",
        "Vị trí đó nằm ngoài các học khu quanh Eugene.",
        "その位置はユージン周辺の学区の外です。",
      ],
    },
  ];
  for (const { finish, expected } of cases) {
    const f = districtFixture();
    const request = f.locate();
    f.language("es");
    finish(request);
    f.render();
    assert.ok(f.note().startsWith(expected[2]));
    langs.forEach((lang, i) => {
      f.language(lang);
      assert.ok(f.note().startsWith(expected[i]), lang);
    });
    assert.equal(f.requests.length, 1, "translation must not restart geolocation");
  }
});

test("unsupported geolocation feedback also follows all six languages", () => {
  const f = districtFixture({ supported: false });
  f.locate();
  const expected = [
    "This browser cannot share a location. Pick the district yourself.",
    "当前浏览器不支持定位，请手动选择学区。",
    "Este navegador no puede dar la ubicación. Elige el distrito tú.",
    "이 브라우저는 위치를 줄 수 없어요. 학구를 직접 고르세요.",
    "Trình duyệt này không định vị được. Tự chọn học khu.",
    "このブラウザは位置を渡せません。学区は自分で選んでください。",
  ];
  langs.forEach((lang, i) => {
    f.language(lang);
    assert.equal(f.note(), expected[i]);
  });
  assert.equal(f.locateButton().props.disabled, false);
});

function gpaFixture(count = 0) {
  const runner = hookRunner();
  let lang = "en";
  const added = [];
  const state = {
    level: "uni",
    buckets: Object.fromEntries(
      ["elem", "mid", "high", "uni"].map((level) => [
        level,
        {
          grades: Array.from({ length: level === "uni" ? count : 0 }, (_, i) => ({
            id: String(i),
            title: "Class",
            credits: 4,
            grade: "A",
            boost: false,
          })),
          priorGpa: "",
          priorWeighted: "",
          priorCredits: "",
        },
      ]),
    ),
    addGrade: (row) => added.push(row),
    removeGrade() {},
    clearGrades() {},
    setGpaPrior() {},
  };
  const { Route } = load("src/routes/gpa.tsx", {
    react: runner.hooks,
    "@tanstack/react-router": { createFileRoute: () => (options) => options },
    "@radix-ui/react-alert-dialog": Object.fromEntries(
      [
        "Root",
        "Trigger",
        "Portal",
        "Overlay",
        "Content",
        "Title",
        "Description",
        "Cancel",
        "Action",
      ].map((key) => [key, `Dialog${key}`]),
    ),
    "@/components/ui": Object.fromEntries(
      ["Button", "Card", "EmptyState", "Input", "SectionHeader", "Stat"].map((key) => [key, key]),
    ),
    "@/lib/gpa": gpa,
    "@/lib/store": { useLang: () => lang, useDesk: (select) => select(state) },
    "@/lib/text": { tr },
  });
  let tree;
  const render = () => (tree = runner.render(Route.component));
  render();
  return {
    state,
    added,
    render,
    alert: () => text(nodes(tree).find((n) => n.props?.role === "alert")),
    submit() {
      nodes(tree)
        .find((n) => n.type === "form")
        .props.onSubmit({ preventDefault() {} });
      render();
    },
    credits(value) {
      nodes(tree)
        .find((n) => n.type === "select")
        .props.onChange({ target: { value } });
      render();
    },
    language(value) {
      lang = value;
      render();
    },
  };
}

test("GPA class-limit feedback follows all six languages without resubmitting", () => {
  const f = gpaFixture(40);
  f.submit();
  const expected = [
    "40 classes is the limit. Put an older GPA in the box below instead.",
    "最多添加 40 门课程。之前的成绩可在下方填写历史 GPA 和对应学分。",
    "El límite es 40 clases. El GPA anterior va en el recuadro de abajo.",
    "수업은 40개가 한도예요. 예전 GPA는 아래 칸에 적어요.",
    "Tối đa 40 môn. GPA cũ điền vào ô bên dưới.",
    "授業は 40 個までです。それより前の GPA は下の欄へ。",
  ];
  langs.forEach((lang, i) => {
    f.language(lang);
    assert.equal(f.alert(), expected[i]);
  });
  assert.deepEqual(f.added, []);
  f.state.level = "high";
  f.render();
  assert.equal(f.alert(), "", "level changes still clear the previous error");
});

test("GPA credit feedback translates and clears after a successful submission", () => {
  const f = gpaFixture();
  f.credits("9");
  f.submit();
  const expected = [
    "Pick a credit value from the list.",
    "请从列表中选择课程学分。",
    "Elige los créditos de la lista.",
    "학점은 목록에서 고르세요.",
    "Hãy chọn tín chỉ trong danh sách.",
    "単位は一覧から選んでください。",
  ];
  langs.forEach((lang, i) => {
    f.language(lang);
    assert.equal(f.alert(), expected[i]);
  });
  f.credits("4");
  f.submit();
  assert.equal(f.alert(), "");
  assert.equal(f.added.length, 1);
  assert.equal(f.added[0].credits, 4);
});
