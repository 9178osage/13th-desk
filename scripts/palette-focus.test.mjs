import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { rolldown } from "rolldown";

test("the real palette captures its opener and restores focus on close", async () => {
  const mocks = {
    react: "export const useRef = value => ({current: value});",
    "react/jsx-runtime":
      "export const jsx = (type, props) => ({type, props}); export const jsxs = jsx;",
    cmdk: 'export const Command = Object.assign("Command", {});',
    "@radix-ui/react-dialog":
      'export const Root="Root", Portal="Portal", Overlay="Overlay", Content="Content", Title="Title", Close="Close";',
    "@tanstack/react-router": "export const useNavigate = () => () => {};",
    "lucide-react":
      'export const ArrowUpRight="Icon", CalendarDays="Icon", Compass="Icon", Languages="Icon", MapPin="Icon", Search="Icon", X="Icon";',
    "@/lib/store":
      'export const useLang=()=>"en"; export const useDesk=fn=>fn({level:"uni",district:null});',
    "@/lib/use-clock": "export const useClock=()=>null;",
  };
  const bundle = await rolldown({
    input: "src/components/command-palette.tsx",
    platform: "node",
    tsconfig: "tsconfig.json",
    resolve: { alias: { "@": process.cwd() + "/src" } },
    plugins: [
      {
        name: "palette-component-test",
        resolveId(id) {
          if (id in mocks) return "mock:" + id;
        },
        load(id) {
          if (id.startsWith("mock:")) return mocks[id.slice(5)];
        },
      },
    ],
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
  const Palette = module.exports.default ?? module.exports;
  const find = (node, type) => {
    if (!node || typeof node !== "object") return null;
    if (node.type === type) return node;
    for (const child of [node.props?.children].flat()) {
      const found = find(child, type);
      if (found) return found;
    }
    return null;
  };
  const onOpenChange = () => {};
  const tree = Palette({ open: true, onOpenChange });
  assert.equal(tree.props.onOpenChange, onOpenChange);
  const close = find(tree, "Close");
  assert.ok(close, "touch users need a visible Radix Close, not only the Escape key");
  assert.equal(close.props.asChild, true);
  assert.equal(close.props.children.type, "button");
  assert.equal(close.props.children.props.type, "button");
  assert.equal(close.props.children.props["aria-label"], "Cancel");
  assert.match(close.props.children.props.className, /\bicon-button\b/);
  // The primitive owns the controlled close event; focus still returns via Content.
  const content = find(tree, "Content");
  assert.ok(content, "the palette must expose Radix content focus handlers");
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const originalHTMLElement = Object.getOwnPropertyDescriptor(globalThis, "HTMLElement");
  class Opener {
    isConnected = true;
    focused = false;
    focus() {
      this.focused = true;
    }
  }
  try {
    globalThis.HTMLElement = Opener;
    for (const kind of ["button", "input"]) {
      const opener = new Opener();
      globalThis.document = { activeElement: opener };
      content.props.onOpenAutoFocus();
      let prevented = false;
      content.props.onCloseAutoFocus({
        preventDefault() {
          prevented = true;
        },
      });
      assert.equal(prevented, true, kind);
      assert.equal(opener.focused, true, kind);
      opener.isConnected = false;
      opener.focused = false;
      content.props.onCloseAutoFocus({ preventDefault() {} });
      assert.equal(opener.focused, false, "do not focus an opener removed by navigation");
    }
  } finally {
    if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
    else delete globalThis.document;
    if (originalHTMLElement) Object.defineProperty(globalThis, "HTMLElement", originalHTMLElement);
    else delete globalThis.HTMLElement;
  }
});
