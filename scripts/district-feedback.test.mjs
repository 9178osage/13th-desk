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
const deskCopy = load("src/lib/desk-copy.ts", {
  "./date-formatters.ts": load("src/lib/date-formatters.ts", {
    "./locale.ts": load("src/lib/locale.ts"),
  }),
});
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

const rowRef = load("src/lib/row-ref.ts", {
  "./desk-limits.ts": load("src/lib/desk-limits.ts"),
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
    hydrated: true,
    addGrade: (row) => added.push(row),
    removeGrade(ref) {
      const bucket = state.buckets[state.level];
      const result = rowRef.removeRow(bucket.grades, ref);
      if (!result) return null;
      bucket.grades = result.list;
      return result.removed;
    },
    restoreGrade(removed, level) {
      const bucket = state.buckets[level];
      if (!rowRef.canRestoreRow(bucket.grades, removed, "grades")) return false;
      const { row, index } = removed;
      bucket.grades = [...bucket.grades.slice(0, index), row, ...bucket.grades.slice(index)];
      return true;
    },
    updateGrade(ref, patch) {
      const bucket = state.buckets[state.level];
      const next = rowRef.updateRow(bucket.grades, ref, (row) => ({ ...row, ...patch }));
      if (!next) return false;
      bucket.grades = next;
      return true;
    },
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
    "@/lib/row-ref": rowRef,
    "@/lib/store": { useLang: () => lang, useDesk: (select) => select(state) },
    "@/lib/text": { tr },
    "@/lib/desk-copy": deskCopy,
    "@/lib/desk-replaced": { useDeskReplaced: () => {} },
  });
  let tree;
  const render = () => (tree = runner.render(Route.component));
  render();
  const byLabel = (prefix) =>
    nodes(tree).find((n) => n.type === "button" && n.props["aria-label"]?.startsWith(prefix));
  return {
    state,
    added,
    render,
    tree: () => tree,
    alert: () => text(nodes(tree).find((n) => n.props?.role === "alert")),
    status: () => text(nodes(tree).find((n) => n.props?.className === "inline-feedback")),
    click(prefix) {
      byLabel(prefix).props.onClick();
      render();
    },
    button: byLabel,
    undo() {
      nodes(tree)
        .find((n) => n.props?.className === "inline-feedback")
        .props.children.flat()
        .find((n) => n?.type === "button")
        .props.onClick();
      render();
    },
    editor: () => nodes(tree).find((n) => typeof n.type === "function" && n.props?.draft),
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

test("GPA rows: delete then undo puts the class back in place, in all six languages", () => {
  const f = gpaFixture(3);
  const titles = () => f.state.buckets.uni.grades.map((row) => row.id);
  f.click("Remove: Class");
  assert.deepEqual(titles(), ["1", "2"]);
  assert.match(f.status(), /Item deleted\.Undo/);
  f.undo();
  assert.deepEqual(titles(), ["0", "1", "2"], "back at its old index");
  assert.equal(f.status(), "Restored.");
  f.click("Remove: Class");
  // Restored elsewhere (another tab): undo refuses with the shared copy.
  f.state.buckets.uni.grades = [{ id: "0" }, ...f.state.buckets.uni.grades];
  const expected = [
    "Couldn't undo: it is already back, or the list is over its limit.",
    "无法撤销：这一项已经恢复，或列表已超出上限。",
    "No se pudo deshacer: ya está de vuelta o la lista supera su límite.",
    "되돌릴 수 없어요. 이미 복원됐거나 목록이 한도를 넘었어요.",
    "Không thể hoàn tác: mục này đã được khôi phục hoặc danh sách đã vượt giới hạn.",
    "元に戻せません。すでに戻っているか、リストが上限を超えています。",
  ];
  f.undo();
  langs.forEach((lang, i) => {
    f.language(lang);
    assert.ok(f.status().startsWith(expected[i]), lang);
  });
});

test("GPA rows: inline edit saves grade and credits, and a vanished row says so", () => {
  const f = gpaFixture(2);
  f.click("Edit: Class");
  const editor = f.editor();
  assert.ok(editor, "the first row turned into the editor");
  assert.deepEqual(
    { ...editor.props.draft },
    { id: "0", index: 0, grade: "A", credits: "4", boost: false },
  );
  editor.props.onChange({ ...editor.props.draft, grade: "B+", credits: "3" });
  f.render();
  f.editor().props.onSubmit({ preventDefault() {} });
  f.render();
  assert.deepEqual(f.state.buckets.uni.grades[0], {
    id: "0",
    title: "Class",
    credits: 3,
    grade: "B+",
    boost: false,
  });
  assert.equal(f.editor(), undefined);
  assert.equal(f.status(), "Class updated.");
  f.click("Edit: Class");
  f.state.buckets.uni.grades = [];
  f.editor().props.onSubmit({ preventDefault() {} });
  f.render();
  assert.equal(f.status(), "That class is no longer in your list, so nothing was saved.");
});

test("GPA writes stay disabled until the saved desk has loaded", () => {
  const f = gpaFixture(1);
  f.state.hydrated = false;
  f.render();
  const disabled = nodes(f.tree()).filter((n) => n.props?.disabled === true);
  // Add, Clear list, Edit, Remove, prior GPA and prior credits.
  assert.ok(disabled.length >= 6, String(disabled.length));
  assert.equal(f.button("Remove: Class").props.disabled, true);
  // The disabled button is not the only guard: an implicit Enter submit can still reach
  // the handler and must not write into an unloaded desk.
  f.submit();
  assert.equal(f.added.length, 0);
  f.state.hydrated = true;
  f.render();
  assert.equal(f.button("Remove: Class").props.disabled, false);
  f.submit();
  assert.equal(f.added.length, 1);
});

function scheduleFixture(count = 1) {
  const runner = hookRunner();
  const calls = [];
  const state = {
    level: "uni",
    hydrated: true,
    buckets: {
      uni: {
        schedule: Array.from({ length: count }, (_, i) => ({
          id: i ? `other-${i}` : "",
          title: i ? `Other ${i}` : "Blank ID course",
          day: i ? "tue" : "mon",
          start: "09:00",
          end: "10:00",
          place: "",
          pinned: false,
        })),
      },
    },
    addScheduleBlock(row) {
      calls.push(["add"]);
      if (state.buckets.uni.schedule.length >= 40) return false;
      state.buckets.uni.schedule.push({ ...row, id: "new", pinned: false });
      return true;
    },
    updateScheduleBlock(ref, patch) {
      calls.push(["update", ref.id]);
      const next = rowRef.updateRow(state.buckets.uni.schedule, ref, (row) => ({
        ...row,
        ...patch,
      }));
      if (!next) return false;
      state.buckets.uni.schedule = next;
      return true;
    },
    removeScheduleBlock(ref) {
      const result = rowRef.removeRow(state.buckets.uni.schedule, ref);
      if (!result) return null;
      state.buckets.uni.schedule = result.list;
      return result.removed;
    },
    restoreScheduleBlock(removed) {
      const list = state.buckets.uni.schedule;
      state.buckets.uni.schedule = [
        ...list.slice(0, removed.index),
        removed.row,
        ...list.slice(removed.index),
      ];
      return true;
    },
    toggleSchedulePin() {},
  };
  const { WeekSchedule } = load("src/components/week-schedule.tsx", {
    react: runner.hooks,
    "lucide-react": Object.fromEntries(
      [
        "AlertTriangle",
        "CalendarDays",
        "ImageDown",
        "Pencil",
        "Plus",
        "Sparkles",
        "Star",
        "Trash2",
        "X",
      ].map((name) => [name, name]),
    ),
    "@/lib/levels": { LEVELS: [] },
    "@/lib/text": { tr },
    "@/lib/schedule-samples": { sampleSlots: () => [] },
    "@/components/ui": { Button: "Button", Input: "Input" },
    "@/lib/store": {
      useLang: () => "en",
      useDesk: (select) => select(state),
      WEEK_DAYS: ["mon", "tue", "wed", "thu", "fri"].map((id) => ({ id })),
    },
    "@/lib/desk-replaced": { useDeskReplaced: () => {} },
    "@/lib/desk-copy": deskCopy,
    "@/lib/schedule": load("src/lib/schedule.ts"),
    "@/lib/row-ref": rowRef,
  });
  // Render the real inner editor; the wrapper only keys it by school level.
  const Component = WeekSchedule().type;
  let tree;
  const render = () => (tree = runner.render(Component));
  render();
  return {
    state,
    calls,
    render,
    tree: () => tree,
    edit() {
      nodes(tree)
        .find((n) => n.props?.["aria-label"] === "Edit: Blank ID course")
        .props.onClick();
      render();
    },
    add() {
      nodes(tree)
        .find((n) => n.type === "Button" && text(n) === "Add a class")
        .props.onClick();
      render();
      nodes(tree)
        .find((n) => n.type === "Input" && n.props.required && n.props.maxLength === 60)
        .props.onChange({ target: { value: "New course" } });
      render();
      nodes(tree)
        .find((n) => n.type === "select")
        .props.onChange({ target: { value: "fri" } });
      render();
    },
    submit() {
      nodes(tree)
        .find((n) => n.type === "form")
        .props.onSubmit({ preventDefault() {} });
      render();
    },
    status: () => text(nodes(tree).find((n) => n.props?.className === "inline-feedback")),
  };
}

test("timetable: a blank ID opens Edit and saves exactly one existing course", () => {
  const f = scheduleFixture();
  f.edit();
  assert.equal(text(nodes(f.tree()).find((n) => n.type === "h3")), "Edit class");
  const submit = nodes(f.tree()).find((n) => n.props?.type === "submit");
  assert.equal(text(submit), "Save changes");
  f.submit();
  assert.deepEqual(f.calls, [["update", ""]]);
  assert.equal(f.state.buckets.uni.schedule.length, 1);
  assert.equal(f.state.buckets.uni.schedule[0].id, "");
  assert.equal(f.status(), "Timetable updated.");
});

test("timetable: blank-ID edits work at the cap and a vanished row is not a cap error", () => {
  const f = scheduleFixture(40);
  f.edit();
  f.submit();
  assert.deepEqual(f.calls, [["update", ""]]);
  assert.equal(f.state.buckets.uni.schedule.length, 40);
  assert.equal(f.status(), "Timetable updated.");
  f.edit();
  f.state.buckets.uni.schedule = f.state.buckets.uni.schedule.filter((row) => row.id !== "");
  f.submit();
  assert.deepEqual(f.calls, [
    ["update", ""],
    ["update", ""],
  ]);
  assert.equal(
    f.status(),
    "That class is no longer in your timetable, so nothing was saved. Add it again if you still need it.",
  );
  assert.equal(
    nodes(f.tree()).some((n) => n.type === "form"),
    false,
  );
});

test("timetable: null editing state still adds a new course", () => {
  const f = scheduleFixture();
  f.add();
  assert.equal(text(nodes(f.tree()).find((n) => n.type === "h3")), "Add a class");
  f.submit();
  assert.deepEqual(f.calls, [["add"]]);
  assert.equal(f.state.buckets.uni.schedule.length, 2);
  assert.equal(f.state.buckets.uni.schedule[1].title, "New course");
});

test("timetable: with two blank-ID courses, Edit and Delete touch only the chosen row", () => {
  const f = scheduleFixture();
  const twin = {
    ...f.state.buckets.uni.schedule[0],
    title: "Blank twin",
    day: "mon",
    start: "11:00",
    end: "12:00",
    place: "Room 2",
  };
  f.state.buckets.uni.schedule.push(twin);
  f.render();
  f.edit();
  nodes(f.tree())
    .find((n) => n.type === "Input" && n.props.required && n.props.maxLength === 60)
    .props.onChange({ target: { value: "Edited first" } });
  f.render();
  f.submit();
  assert.deepEqual(
    f.state.buckets.uni.schedule.map((row) => [row.id, row.title, row.start, row.place]),
    [
      ["", "Edited first", "09:00", ""],
      ["", "Blank twin", "11:00", "Room 2"],
    ],
  );
  nodes(f.tree())
    .find((n) => n.props?.["aria-label"] === "Delete: Blank twin")
    .props.onClick();
  f.render();
  assert.deepEqual(
    f.state.buckets.uni.schedule.map((row) => row.title),
    ["Edited first"],
  );
});

test("GPA rows: duplicate IDs edit and remove only the chosen row, and undo puts it back", () => {
  const f = gpaFixture(3);
  f.state.buckets.uni.grades = f.state.buckets.uni.grades.map((row, i) => ({
    ...row,
    id: "dup",
    title: `Class ${i}`,
  }));
  f.render();
  f.click("Remove: Class 1");
  assert.deepEqual(
    f.state.buckets.uni.grades.map((row) => row.title),
    ["Class 0", "Class 2"],
  );
  f.undo();
  assert.deepEqual(
    f.state.buckets.uni.grades.map((row) => row.title),
    ["Class 0", "Class 1", "Class 2"],
  );
  f.click("Edit: Class 0");
  f.editor().props.onChange({ ...f.editor().props.draft, grade: "C" });
  f.render();
  f.editor().props.onSubmit({ preventDefault() {} });
  f.render();
  assert.deepEqual(
    f.state.buckets.uni.grades.map((row) => row.grade),
    ["C", "A", "A"],
  );
});

for (const ids of [
  ["a", "b", "c"],
  ["dup", "dup", "dup"],
  ["", "", ""],
]) {
  test(`GPA rows (${JSON.stringify(ids)}): the open editor stays on its row when another row is deleted or restored`, () => {
    const f = gpaFixture(3);
    f.state.buckets.uni.grades = f.state.buckets.uni.grades.map((row, i) => ({
      ...row,
      id: ids[i],
      title: `Class ${i}`,
    }));
    f.render();
    f.click("Edit: Class 1");
    f.click("Remove: Class 0");
    assert.ok(f.editor(), "editor must stay open on Class 1");
    f.undo();
    assert.ok(f.editor(), "editor must stay open after undo");
    f.click("Remove: Class 0");
    f.editor().props.onChange({ ...f.editor().props.draft, grade: "C" });
    f.render();
    f.editor().props.onSubmit({ preventDefault() {} });
    f.render();
    assert.deepEqual(
      f.state.buckets.uni.grades.map((row) => [row.title, row.grade]),
      [
        ["Class 1", "C"],
        ["Class 2", "A"],
      ],
    );
    assert.match(f.status(), /saved|updated/i);
  });

  test(`timetable (${JSON.stringify(ids)}): editing one class while another is deleted and restored saves that class`, () => {
    const f = scheduleFixture(3);
    f.state.buckets.uni.schedule = f.state.buckets.uni.schedule.map((row, i) => ({
      ...row,
      id: ids[i],
      title: `Course ${i}`,
      day: "mon",
    }));
    f.state.buckets.uni.schedule.forEach((row, i) => {
      row.start = ["08:00", "10:00", "12:00"][i];
      row.end = ["09:00", "11:00", "13:00"][i];
    });
    f.render();
    const click = (label) => {
      nodes(f.tree())
        .find((n) => n.props?.["aria-label"] === label)
        .props.onClick();
      f.render();
    };
    click("Edit: Course 1");
    click("Delete: Course 0");
    nodes(f.tree())
      .find((n) => n.props?.className === "inline-feedback")
      .props.children.flat()
      .find((n) => n?.type === "button")
      .props.onClick();
    f.render();
    click("Delete: Course 0");
    f.submit();
    assert.deepEqual(f.calls.at(-1), ["update", ids[1]]);
    assert.deepEqual(
      f.state.buckets.uni.schedule.map((row) => row.title),
      ["Course 1", "Course 2"],
    );
    assert.equal(f.status(), "Timetable updated.");
  });
}
