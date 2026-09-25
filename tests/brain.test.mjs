import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Compile the pure TypeScript modules in memory; no browser or external services.
const cache = new Map();
function load(file) {
  const filename = path.resolve(__dirname, "..", file);
  if (cache.has(filename)) return cache.get(filename);
  const compiled = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  new Function("require", "module", "exports", code)(
    (id) => load(id.replace("@/", "") + ".ts"),
    compiled,
    compiled.exports,
  );
  cache.set(filename, compiled.exports);
  return compiled.exports;
}
const { initialBrain, applyBrainEvent, learningScenario, discoveryScenario } =
  load("lib/brain/events.ts");
const { knowledgeSeed, searchKnowledge } = load("lib/mock-data/brain.ts");
test("learning commits only on completion and replay does not duplicate knowledge", () => {
  const item = { ...knowledgeSeed[0], id: "new-item" };
  const events = learningScenario(item, "run-1");
  let state = initialBrain;
  for (const e of events.slice(0, -1)) state = applyBrainEvent(state, e);
  assert.equal(state.items.length, 12);
  state = applyBrainEvent(state, events.at(-1));
  assert.equal(state.items.length, 13);
  assert.equal(state.health, 73);
  assert.equal(state.connections, 3845);
  assert.equal(applyBrainEvent(state, events.at(-1)), state);
});
test("backend and demo events use the same state transition without losing provenance", () => {
  const event = {
    id: "server-1",
    runId: "job-1",
    source: "backend",
    status: "analyzing",
    message: "Analyzing confirmed job",
  };
  const state = applyBrainEvent(initialBrain, event);
  assert.equal(state.source, "backend");
  assert.equal(state.status, "analyzing");
  assert.equal(state.items.length, 12);
});
test("discovery ends at approval, not an autonomous action", () => {
  const events = discoveryScenario("review");
  const state = events.reduce(applyBrainEvent, initialBrain);
  assert.equal(state.status, "waiting_for_approval");
  assert.equal(state.items.length, 12);
});
test("search finds relevant sources and handles unknown queries", () => {
  assert.ok(
    searchKnowledge(knowledgeSeed, "Who are my best customers?").some(
      (i) => i.category === "Customers",
    ),
  );
  assert.ok(
    searchKnowledge(knowledgeSeed, "What products have the best margins?").some(
      (i) => i.category === "Finance",
    ),
  );
  assert.equal(
    searchKnowledge(knowledgeSeed, "unmatched-zebra-query").length,
    0,
  );
});

test("owner confirmation commits on completion without duplicating knowledge or sources", () => {
  const target = initialBrain.items[0];
  const event = {
    id: "confirm-1",
    runId: "confirm",
    source: "demo",
    status: "learning",
    confirmedItemId: target.id,
    message: "Connecting",
  };
  const started = applyBrainEvent(initialBrain, event);
  assert.equal(started.items, initialBrain.items);
  const done = {
    ...event,
    id: "confirm-2",
    status: "completed",
    occurredAt: "2026-09-24T00:00:00.000Z",
  };
  const result = applyBrainEvent(started, done);
  assert.equal(result.items[0].confidence, "Confirmed by owner");
  assert.equal(result.items[0].updatedAt, done.occurredAt);
  assert.equal(result.items.length, initialBrain.items.length);
  assert.equal(result.connections, initialBrain.connections);
  assert.equal(applyBrainEvent(result, done), result);
  const again = applyBrainEvent(result, { ...done, id: "confirm-3" });
  assert.equal(
    again.items[0].sources.filter((source) => source === "Owner confirmation")
      .length,
    1,
  );
});
