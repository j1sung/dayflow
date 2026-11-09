export type Todo = {
  id: string;
  title: string;
  minutes: number;
  category: "work" | "study" | "life";
  done: boolean;
  source?: string;
  day?: number;
};
export type Block = {
  id: string;
  todoId: string;
  date: string;
  start: number;
  minutes: number;
};
export type Plan = {
  version: 1;
  todos: Todo[];
  blocks: Block[];
  bedtime: number;
};
export const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function weekDates(offset = 0, now = new Date()) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}
export const timeLabel = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
export const durationLabel = (minutes: number) =>
  minutes >= 60
    ? `${Math.floor(minutes / 60)}시간${minutes % 60 ? ` ${minutes % 60}분` : ""}`
    : `${minutes}분`;
export function placeBlock(blocks: Block[], block: Block) {
  if (
    !validDate(block.date) ||
    !Number.isInteger(block.start) ||
    !Number.isInteger(block.minutes) ||
    block.minutes < 15 ||
    block.start < 0 ||
    block.start + block.minutes > 1440
  )
    throw new Error("하루 안에서 15분 이상의 시간을 선택해 주세요.");
  if (
    blocks.some(
      (b) =>
        b.id !== block.id &&
        b.date === block.date &&
        b.start < block.start + block.minutes &&
        block.start < b.start + b.minutes,
    )
  )
    throw new Error("이미 배치한 일정과 겹쳐요. 다른 시간을 선택해 주세요.");
  return [...blocks.filter((b) => b.id !== block.id), block];
}
export function validDate(date: unknown): date is string {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}
export function validPlan(value: unknown): value is Plan {
  if (!value || typeof value !== "object") return false;
  const p = value as Plan;
  return (
    p.version === 1 &&
    Array.isArray(p.todos) &&
    p.todos.length <= 5000 &&
    p.todos.every(
      (t) =>
        t !== null &&
        typeof t === "object" &&
        typeof t.id === "string" &&
        t.id.length > 0 &&
        t.id.length <= 100 &&
        typeof t.title === "string" &&
        t.title.trim().length > 0 &&
        t.title.length <= 200 &&
        Number.isInteger(t.minutes) &&
        t.minutes >= 15 &&
        t.minutes <= 1440 &&
        ["work", "study", "life"].includes(t.category) &&
        typeof t.done === "boolean",
    ) &&
    new Set(p.todos.map((t) => t.id)).size === p.todos.length &&
    Array.isArray(p.blocks) &&
    p.blocks.length <= 20000 &&
    p.blocks.every(
      (b) =>
        b !== null &&
        typeof b === "object" &&
        typeof b.id === "string" &&
        b.id.length > 0 &&
        b.id.length <= 100 &&
        p.todos.some((t) => t.id === b.todoId) &&
        validDate(b.date) &&
        Number.isInteger(b.start) &&
        b.start >= 0 &&
        Number.isInteger(b.minutes) &&
        b.minutes >= 15 &&
        b.start + b.minutes <= 1440,
    ) &&
    new Set(p.blocks.map((b) => b.id)).size === p.blocks.length &&
    Number.isInteger(p.bedtime) &&
    p.bedtime >= 0 &&
    p.bedtime <= 1439
  );
}
export function calendarIcs(todos: Todo[], blocks: Block[]) {
  const esc = (s: string) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/\r/g, "")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const stamp = (date: string, min: number) => {
    const d = new Date(`${date}T00:00:00`);
    d.setMinutes(min);
    return d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z/, "Z");
  };
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DayFlow//Planner//KO",
    "CALSCALE:GREGORIAN",
  ];
  for (const b of blocks) {
    const t = todos.find((t) => t.id === b.todoId);
    if (t)
      lines.push(
        "BEGIN:VEVENT",
        `UID:${b.id}@dayflow`,
        `DTSTAMP:${stamp(dateKey(new Date()), 0)}`,
        `DTSTART:${stamp(b.date, b.start)}`,
        `DTEND:${stamp(b.date, b.start + b.minutes)}`,
        `SUMMARY:${esc(t.title)}`,
        "END:VEVENT",
      );
  }
  lines.push("END:VCALENDAR");
  const folded = lines.map((line) => {
    const chunks: string[] = [];
    let chunk = "",
      size = 0;
    for (const character of line) {
      const bytes = new TextEncoder().encode(character).length;
      if (size + bytes > 75) {
        chunks.push(chunk);
        chunk = " ";
        size = 1;
      }
      chunk += character;
      size += bytes;
    }
    chunks.push(chunk);
    return chunks.join("\r\n");
  });
  return folded.join("\r\n") + "\r\n";
}
