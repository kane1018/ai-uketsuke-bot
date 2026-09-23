import assert from "node:assert/strict";
import test from "node:test";
import { initialChatState, transitionChat, chatValue, chatAnswers } from "../src/lib/chat-state.ts";
import { validateResponseValue } from "../src/lib/response-validation.ts";

const question = (id, question_type = "text", is_required = true) => ({
  id, question_text: `質問${id}`, question_type, is_required,
  options: ["A", "B"], sort_order: Number(id),
});
function session(questions, preview = false) {
  let state = initialChatState(questions.length);
  return {
    get state() { return state; },
    send(action, revision = state.revision) {
      state = transitionChat(state, action, revision, questions, validateResponseValue, preview);
      return state;
    },
    answer(value) {
      this.send({ type: "change", value });
      return this.send({ type: "next" });
    },
  };
}

test("last answer opens review, only explicit confirmation starts sending", () => {
  const s = session([question("1")]);
  s.answer("  名前  ");
  assert.equal(s.state.phase, "review");
  assert.equal(s.state.values["1"], "名前");
  assert.deepEqual(chatAnswers(s.state, [question("1")]), [{
    question_id: "1", question_text: "質問1", question_type: "text", value: "名前",
  }]);
  s.send({ type: "success" });
  assert.equal(s.state.phase, "review");
  s.send({ type: "confirm" });
  assert.equal(s.state.phase, "sending");
  s.send({ type: "success" });
  assert.equal(s.state.phase, "complete");
});

test("back keeps both the current draft and later answers; edits replace values", () => {
  const qs = [question("1"), question("2")];
  const s = session(qs);
  s.answer("first");
  s.send({ type: "change", value: "second draft" });
  s.send({ type: "back" });
  assert.equal(chatValue(s.state, qs[0]), "first");
  s.answer("updated");
  assert.equal(chatValue(s.state, qs[1]), "second draft");
  s.send({ type: "next" });
  s.send({ type: "edit", index: 0 });
  s.answer("final first");
  assert.equal(s.state.phase, "review");
  assert.deepEqual(chatAnswers(s.state, qs).map((a) => a.value), ["final first", "second draft"]);
  assert.deepEqual(s.state.answered, ["1", "2"]);
});

test("stale advance/change events and duplicate submission cannot change the new screen", () => {
  const s = session([question("1"), question("2", "text", false)]);
  const firstRevision = s.state.revision;
  s.answer("first");
  const current = s.state;
  s.send({ type: "next" }, firstRevision);
  s.send({ type: "change", value: "stale" }, firstRevision);
  assert.equal(s.state, current);
  s.send({ type: "next" });
  const reviewRevision = s.state.revision;
  s.send({ type: "confirm" });
  const sending = s.state;
  s.send({ type: "confirm" }, reviewRevision);
  s.send({ type: "edit", index: 0 });
  s.send({ type: "next" });
  assert.equal(s.state, sending);
});

test("failed send retains all answers; an old success cannot complete a retry", () => {
  const s = session([question("1")]);
  s.answer("keep me");
  s.send({ type: "confirm" });
  const requestRevision = s.state.revision;
  s.send({ type: "failure", error: "offline" });
  assert.equal(s.state.phase, "review");
  assert.equal(s.state.error, "offline");
  assert.equal(s.state.values["1"], "keep me");
  s.send({ type: "confirm" });
  s.send({ type: "success" }, requestRevision);
  assert.equal(s.state.phase, "sending");
  s.send({ type: "success" });
  assert.equal(s.state.phase, "complete");
});

test("all seven types use server validation including real dates and choice membership", () => {
  for (const [type, valid, invalid] of [
    ["text", "名前", " "], ["textarea", "複数行\n回答", []],
    ["email", "hello@example.com", "bad"], ["phone", "090-1234-5678", "abc"],
    ["date", "2028-02-29", "2026-02-29"],
    ["single", "A", "unknown"], ["multiple", ["A", "B"], ["unknown"]],
  ]) {
    const s = session([question("1", type)]);
    s.answer(invalid);
    assert.equal(s.state.phase, "question", type);
    assert.ok(s.state.error, type);
    s.answer(valid);
    assert.equal(s.state.phase, "review", type);
    assert.equal(s.state.error, null, type);
  }
});

test("optional empties work for all types and optional multi can be cleared", () => {
  for (const type of ["text", "textarea", "email", "phone", "date", "single", "multiple"]) {
    const q = question("1", type, false);
    const s = session([q]);
    s.send({ type: "next" });
    assert.equal(s.state.phase, "review", type);
    assert.deepEqual(chatValue(s.state, q), type === "multiple" ? [] : "");
  }
  const s = session([question("1", "multiple", false)]);
  s.answer(["A", "B"]);
  s.send({ type: "edit", index: 0 });
  s.answer([]);
  assert.deepEqual(s.state.values["1"], []);
});

test("review confirmation revalidates unfinished edits without losing other answers", () => {
  const s = session([question("1"), question("2")]);
  s.answer("first"); s.answer("second");
  s.send({ type: "edit", index: 0 });
  s.send({ type: "change", value: "" });
  s.send({ type: "back" });
  s.send({ type: "confirm" });
  assert.equal(s.state.phase, "question");
  assert.equal(s.state.index, 0);
  assert.ok(s.state.error);
  assert.equal(s.state.values["2"], "second");
});

test("preview completes locally and restart invalidates stale events", () => {
  const s = session([question("1")], true);
  s.answer("practice");
  s.send({ type: "confirm" });
  assert.equal(s.state.phase, "complete");
  const previousRevision = s.state.revision;
  s.send({ type: "restart" });
  assert.equal(s.state.phase, "question");
  assert.deepEqual(s.state.values, {});
  assert.deepEqual(s.state.answered, []);
  s.send({ type: "change", value: "stale" }, previousRevision);
  assert.deepEqual(s.state.values, {});
});

test("zero questions is an empty state with no submission or false completion", () => {
  for (const preview of [true, false]) {
    const s = session([], preview);
    for (const type of ["next", "confirm", "success", "back", "restart"]) s.send({ type });
    assert.equal(s.state.phase, "empty");
    assert.deepEqual(chatAnswers(s.state, []), []);
  }
});
