import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "..");

// Execute the real component handlers with deterministic hooks and API/DOM boundaries.
// Browser layout, focus and Next router integration are covered by the parent's visual QA.
function harness(file, globals = {}) {
  const slots = [];
  const effects = [];
  let index = 0;
  let component;
  let props;
  const listeners = new Map();
  const router = { pushes: [], refreshes: 0, push(url) { this.pushes.push(url); }, refresh() { this.refreshes++; } };
  const hooks = {
    Suspense: "suspense",
    useState(initial) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = typeof initial === "function" ? initial() : initial;
      return [slots[slot], (value) => { slots[slot] = typeof value === "function" ? value(slots[slot]) : value; }];
    },
    useRef(initial) {
      const slot = index++;
      slots[slot] ??= { current: initial };
      return slots[slot];
    },
    useEffect(callback, deps) {
      const slot = index++;
      const previous = slots[slot];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        effects.push(() => {
          previous?.cleanup?.();
          slots[slot] = { deps, cleanup: callback() };
        });
      }
    },
  };
  const eventTarget = {
    addEventListener(name, listener) { listeners.set(name, listener); },
    removeEventListener(name, listener) { if (listeners.get(name) === listener) listeners.delete(name); },
  };
  class Element { closest() { return this; } }
  class Anchor extends Element {
    constructor(href) { super(); this.href = href; this.target = ""; }
    hasAttribute() { return false; }
  }
  const document = { ...eventTarget, getElementById: () => null };
  const window = { ...eventTarget, navigation: eventTarget, location: new URL("https://example.com/dashboard/bots/bot-1/edit"), confirm: () => false };
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path);
    const source = readFileSync(path, "utf8");
    const code = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const module = { exports: {} };
    const localRequire = (id) => {
      if (id === "react") return hooks;
      if (id === "next/link") return { __esModule: true, default: "a" };
      if (id === "next/navigation") return { useRouter: () => router, useSearchParams: () => new URLSearchParams() };
      if (id.startsWith("@/")) {
        const path = resolve(root, "src", id.slice(2));
        return load(path + (id.startsWith("@/components/") ? ".tsx" : ".ts"));
      }
      return require(id);
    };
    vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, document, window, Element, HTMLAnchorElement: Anchor, HTMLElement: Element, URL, setTimeout, clearTimeout, ...globals }, { filename: path });
    cache.set(path, module.exports);
    return module.exports;
  }
  const exports = load(resolve(root, file));
  return {
    exports, router, listeners, document, window, Anchor,
    mount(name, initialProps, unwrap = false) {
      component = exports[name]; props = initialProps;
      if (unwrap) {
        const inner = component(props).props.children;
        component = inner.type; props = inner.props;
      }
      return this.render();
    },
    render(nextProps = props) {
      props = nextProps; index = 0;
      const tree = component(props);
      effects.splice(0).forEach((effect) => effect());
      return tree;
    },
    dispose() { slots.forEach((slot) => slot?.cleanup?.()); },
  };
}
function nodes(tree) {
  if (tree == null || typeof tree === "boolean") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree) {
  if (tree == null || typeof tree === "boolean") return "";
  if (Array.isArray(tree)) return tree.map(text).join("");
  if (typeof tree !== "object") return String(tree);
  return text(tree.props?.children);
}
const byId = (tree, id) => nodes(tree).find((node) => node.props?.id === id);
const button = (tree, label) => nodes(tree).find((node) => node.type === "button" && text(node).includes(label));
const form = (tree) => nodes(tree).find((node) => node.type === "form");
const submit = { preventDefault() {} };
const reply = (ok, data, status = ok ? 200 : 400) => ({ ok, status, json: async () => data });
function readyWizard(h) {
  let tree = h.mount("NewBotWizard", { defaultEmail: "owner@example.com", initialPurpose: "consultation", initialIndustry: "professional" });
  button(tree, "次へ").props.onClick(); tree = h.render();
  button(tree, "次へ").props.onClick(); tree = h.render();
  assert.equal(byId(tree, "new-email").props.value, "owner@example.com");
  byId(tree, "new-company").props.onChange({ target: { value: "山田事務所" } });
  return h.render();
}

test("question-save failure retries the same created draft, including rapid double submit", async () => {
  const calls = [];
  let saveCount = 0;
  const h = harness("src/components/NewBotWizard.tsx", { fetch: async (url, options) => {
    calls.push({ url, options });
    if (options.method === "POST") return reply(true, { bot: { id: "bot-1" } });
    if (++saveCount === 1) throw new Error("offline");
    return reply(true, { ok: true });
  } });
  let tree = readyWizard(h);
  const pending = form(tree).props.onSubmit(submit);
  await form(tree).props.onSubmit(submit);
  await pending;
  tree = h.render();
  assert.equal(calls.filter((call) => call.options.method === "POST").length, 1);
  assert.ok(nodes(tree).some((node) => node.props?.href === "/dashboard/bots/bot-1/edit"));
  assert.match(text(tree), /質問の保存を再試行/);
  await form(tree).props.onSubmit(submit);
  assert.equal(calls.length, 3);
  assert.equal(calls[1].url, calls[2].url);
  assert.deepEqual(h.router.pushes, ["/dashboard/bots/bot-1/edit?template=1"]);
  h.dispose();
});

test("lost creation response does not trigger another POST", async () => {
  let creates = 0;
  const h = harness("src/components/NewBotWizard.tsx", { fetch: async () => { creates++; throw new Error("lost response"); } });
  let tree = readyWizard(h);
  await form(tree).props.onSubmit(submit); tree = h.render();
  assert.equal(button(tree, "下書きを作成").props.disabled, true);
  await form(tree).props.onSubmit(submit);
  assert.equal(creates, 1);
  assert.ok(nodes(tree).some((node) => node.props?.href === "/dashboard/bots"));
  h.dispose();
});

const questionProps = {
  botId: "bot-1", initialOpening: "こんにちは", initialCompletion: "ありがとう", initialCta: "連絡します",
  initialQuestions: [{ id: "q1", question_text: "お名前は？", question_type: "text", options: [], is_required: true, sort_order: 1 }],
};

test("dirty guards disappear after undo; a declined internal link stays on the editor", () => {
  const h = harness("src/components/QuestionsEditor.tsx");
  let tree = h.mount("QuestionsEditor", questionProps, true);
  assert.equal(h.listeners.has("beforeunload"), false);
  byId(tree, "questions-opening").props.onChange({ target: { value: "変更" } }); tree = h.render();
  assert.equal(h.listeners.has("beforeunload"), true);
  let prevented = false;
  h.listeners.get("click")({ button: 0, target: new h.Anchor("https://example.com/dashboard/bots/bot-1/publish"), preventDefault() { prevented = true; }, stopImmediatePropagation() {} });
  assert.equal(prevented, true);
  let historyPrevented = false;
  h.listeners.get("navigate")({ navigationType: "traverse", cancelable: true, destination: { sameDocument: true, url: "https://example.com/dashboard/bots" }, preventDefault() { historyPrevented = true; } });
  assert.equal(historyPrevented, true);
  byId(tree, "questions-opening").props.onChange({ target: { value: "こんにちは" } }); h.render();
  assert.equal(h.listeners.has("beforeunload"), false);
  assert.equal(h.listeners.has("click"), false);
  assert.equal(h.listeners.has("navigate"), false);
  h.dispose();
});

test("save-and-preview does not navigate on failure and removes dirty guards only after success", async () => {
  let saves = 0;
  const h = harness("src/components/QuestionsEditor.tsx", { fetch: async () => ++saves === 1 ? reply(false, { error: "保存失敗" }) : reply(true, { ok: true }) });
  let tree = h.mount("QuestionsEditor", questionProps, true);
  byId(tree, "questions-opening").props.onChange({ target: { value: "変更" } }); tree = h.render();
  const pending = button(tree, "保存して動作確認").props.onClick(); tree = h.render();
  assert.equal(nodes(tree).find((node) => node.type === "fieldset").props.disabled, true);
  await pending; tree = h.render();
  assert.deepEqual(h.router.pushes, []);
  assert.equal(h.listeners.has("beforeunload"), true);
  assert.match(text(tree), /未保存の変更/);
  await button(tree, "保存して動作確認").props.onClick(); tree = h.render();
  assert.deepEqual(h.router.pushes, ["/dashboard/bots/bot-1/preview"]);
  assert.equal(h.listeners.has("beforeunload"), false);
  assert.match(text(tree), /すべての変更を保存済み/);
  h.dispose();
});

test("basic info PATCH corrects company without changing purpose or industry", async () => {
  let sent;
  const h = harness("src/components/BasicInfoEditor.tsx", { fetch: async (url, options) => { sent = { url, ...options }; return reply(true, { bot: {} }); } });
  let tree = h.mount("BasicInfoEditor", { botId: "bot-1", initialInfo: { name: "受付", purpose: "inquiry", industry: "other", company_name: "", notification_email: "owner@example.com", service_description: "", intake_goal: "", final_cta: "" } });
  byId(tree, "info-company").props.onChange({ target: { value: " 修正した事業者名 " } }); tree = h.render();
  await form(tree).props.onSubmit(submit); tree = h.render();
  assert.equal(sent.method, "PATCH");
  const body = JSON.parse(sent.body);
  assert.equal(body.info.company_name, "修正した事業者名");
  assert.equal(body.info.purpose, undefined);
  assert.equal(body.info.industry, undefined);
  assert.match(text(tree), /基本情報を保存しました/);
  h.dispose();
});

for (const fallback of [false, "throw", true]) {
  test(`clipboard fallback ${fallback} reports its actual result and cleans up`, async () => {
    let removed = false;
    const h = harness("src/components/CopyButton.tsx", {
      navigator: { clipboard: { writeText: async () => { throw new Error("denied"); } } },
      document: { createElement: () => ({ style: {}, setAttribute() {}, select() {}, remove() { removed = true; } }), body: { appendChild() {} }, execCommand: () => { if (fallback === "throw") throw new Error("unsupported"); return fallback; } },
    });
    let tree = h.mount("CopyButton", { value: "https://example.com/chat" });
    await button(tree, "コピー").props.onClick(); tree = h.render();
    assert.equal(removed, true);
    assert.match(text(tree), fallback === true ? /コピーしました/ : /コピーできませんでした/);
    if (fallback !== true) assert.doesNotMatch(text(tree), /コピーしました/);
    h.dispose();
  });
}

test("publish status changes only after API success and reconciles fresh server props", async () => {
  let attempts = 0;
  const h = harness("src/components/PublishControls.tsx", { fetch: async () => ++attempts === 1 ? reply(false, { error: "失敗" }) : reply(true, { bot: { status: "published" } }) });
  const props = { botId: "bot-1", status: "draft", canPublish: true };
  let tree = h.mount("PublishControls", props);
  await button(tree, "受付を公開する").props.onClick(); tree = h.render();
  assert.match(text(tree), /下書き（非公開）/);
  await button(tree, "受付を公開する").props.onClick(); tree = h.render();
  assert.match(text(tree), /● 公開中/);
  h.render({ ...props, status: "published" });
  h.render(props); tree = h.render();
  assert.match(text(tree), /下書き（非公開）/);
  h.dispose();
});

test("overlong generated greeting is rejected before any Bot is created and can be corrected", async () => {
 const calls=[];const h=harness("src/components/NewBotWizard.tsx",{fetch:async(url,options)=>{calls.push({url,options});return options.method==="POST"?reply(true,{bot:{id:"bot-long"}}):reply(true,{ok:true});}});
 let tree=readyWizard(h);byId(tree,"new-intake_goal").props.onChange({target:{value:"あ".repeat(1000)}});tree=h.render();
 await form(tree).props.onSubmit(submit);tree=h.render();assert.equal(calls.length,0);assert.match(text(tree),/1,000文字まで/);assert.equal(nodes(tree).find((n)=>n.type==="fieldset").props.disabled,false);
 byId(tree,"new-intake_goal").props.onChange({target:{value:"相談内容"}});tree=h.render();await form(tree).props.onSubmit(submit);assert.equal(calls.length,2);assert.deepEqual(h.router.pushes,["/dashboard/bots/bot-long/edit?template=1"]);h.dispose();
});
test("preview of unchanged questions never performs destructive question replacement", async () => {
 let calls=0;const h=harness("src/components/QuestionsEditor.tsx",{fetch:async()=>{calls++;return reply(true,{ok:true});}});
 const tree=h.mount("QuestionsEditor",questionProps,true);await button(tree,"動作確認へ").props.onClick();assert.equal(calls,0);assert.deepEqual(h.router.pushes,["/dashboard/bots/bot-1/preview"]);h.dispose();
});
