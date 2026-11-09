import { test } from "node:test";
import assert from "node:assert/strict";
import {
  weekDates,
  dateKey,
  placeBlock,
  calendarIcs,
  validPlan,
} from "../lib/planner.ts";
import type { Block, Plan } from "../lib/planner.ts";
const block: Block = {
  id: "a",
  todoId: "t",
  date: "2026-11-09",
  start: 600,
  minutes: 60,
};
const plan: Plan = {
  version: 1,
  todos: [
    {
      id: "t",
      title: "책, 읽기; 회고\n다음 줄",
      minutes: 120,
      category: "study",
      done: false,
    },
  ],
  blocks: [block],
  bedtime: 60,
};
test("Sunday still belongs to the previous Monday; navigation crosses years", () => {
  assert.equal(dateKey(weekDates(0, new Date(2027, 0, 3))[0]), "2026-12-28");
  assert.equal(dateKey(weekDates(1, new Date(2027, 0, 3))[0]), "2027-01-04");
});
test("Overlapping blocks are rejected, adjacent blocks and separate days accepted", () => {
  assert.throws(
    () => placeBlock([block], { ...block, id: "b", start: 630 }),
    /겹쳐/,
  );
  assert.equal(
    placeBlock([block], { ...block, id: "b", start: 660 }).length,
    2,
  );
  assert.equal(
    placeBlock([block], { ...block, id: "b", date: "2026-11-10" }).length,
    2,
  );
});
test("Moving an existing block replaces it without colliding with itself", () => {
  const moved = placeBlock([block], { ...block, start: 630 });
  assert.equal(moved.length, 1);
  assert.equal(moved[0].start, 630);
  assert.equal(block.start, 600);
});
test("Out-of-day and invalid durations cannot be placed", () => {
  for (const [start, minutes] of [
    [-15, 60],
    [1410, 60],
    [600, 0],
    [600, NaN],
    [600, 14],
    [600.5, 60],
  ])
    assert.throws(() => placeBlock([], { ...block, start, minutes }));
  assert.equal(
    placeBlock([], { ...block, start: 1380, minutes: 60 }).length,
    1,
  );
});
test("Backup validation rejects missing todos, wrong versions and invalid blocks", () => {
  assert.equal(validPlan(plan), true);
  assert.equal(validPlan({ ...plan, version: 2 }), false);
  assert.equal(validPlan({ ...plan, todos: [] }), false);
  assert.equal(
    validPlan({ ...plan, blocks: [{ ...block, minutes: -60 }] }),
    false,
  );
  assert.equal(validPlan({ ...plan, bedtime: NaN }), false);
});
test("ICS escapes user input and exports a midnight end as the following date", () => {
  const ics = calendarIcs(plan.todos, [{ ...block, start: 1380, minutes: 60 }]);
  assert.match(ics, /SUMMARY:책\\, 읽기\\; 회고\\n다음 줄/);
  assert.match(ics, /UID:a@dayflow/);
  assert.match(ics, /END:VEVENT\r\nEND:VCALENDAR\r\n$/);
  const end = new Date(2026, 10, 10, 0, 0)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z/, "Z");
  assert.ok(ics.includes(`DTEND:${end}`));
});

test("Backup validation rejects null entries, duplicate IDs and impossible dates", () => {
  assert.equal(validPlan({ ...plan, todos: [null] }), false);
  assert.equal(
    validPlan({ ...plan, todos: [...plan.todos, ...plan.todos] }),
    false,
  );
  assert.equal(
    validPlan({ ...plan, blocks: [{ ...block, date: "2026-02-30" }] }),
    false,
  );
  assert.equal(validPlan({ ...plan, blocks: [block, block] }), false);
});
test("Korean calendar summaries fold at 75 UTF-8 octets without corrupting text", () => {
  const title = "가나다라마바사".repeat(20);
  const ics = calendarIcs([{ ...plan.todos[0], title }], plan.blocks);
  for (const line of ics.split("\r\n"))
    assert.ok(new TextEncoder().encode(line).length <= 75);
  assert.ok(ics.replace(/\r\n /g, "").includes(`SUMMARY:${title}`));
});
