import { createHash } from "node:crypto";
import { googleAccess, sameOrigin } from "../../../../lib/server";
import { validPlan, validDate, timeLabel, Plan } from "../../../../lib/planner";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 1000000)
      return Response.json({ error: "요청이 너무 큽니다." }, { status: 413 });
    const data = await request.json();
    const plan = {
      version: 1,
      todos: data.todos,
      blocks: data.blocks,
      bedtime: 60,
    };
    if (
      !validPlan(plan) ||
      !validDate(data.week) ||
      plan.blocks.length > 100 ||
      plan.blocks.some(
        (b) =>
          b.date < data.week ||
          b.date >
            new Date(
              new Date(`${data.week}T12:00:00Z`).getTime() + 6 * 86400000,
            )
              .toISOString()
              .slice(0, 10),
      )
    )
      return Response.json(
        { error: "올바른 주간 시간표를 선택해 주세요. (최대 100개)" },
        { status: 400 },
      );
    try {
      if (typeof data.timeZone !== "string") throw Error();
      new Intl.DateTimeFormat("en", { timeZone: data.timeZone }).format();
    } catch {
      return Response.json(
        { error: "시간대를 확인해 주세요." },
        { status: 400 },
      );
    }
    const session = await googleAccess();
    const headers = {
      Authorization: `Bearer ${session.access}`,
      "Content-Type": "application/json",
    };
    const base =
      "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    const api = async (url: string, init: RequestInit = {}) =>
      fetch(url, { ...init, headers, signal: AbortSignal.timeout(15000) });
    // Fully list this app/session's events before mutating; never touch unrelated events.
    const existing: { id: string }[] = [];
    let page: string | undefined;
    do {
      const q = new URLSearchParams();
      q.append("privateExtendedProperty", `dayflowOwner=${session.owner}`);
      q.append("privateExtendedProperty", `dayflowWeek=${data.week}`);
      q.set("maxResults", "250");
      if (page) q.set("pageToken", page);
      const r = await api(`${base}?${q}`);
      if (!r.ok)
        throw Error("캘린더 조회에 실패했어요. 연결과 권한을 확인해 주세요.");
      const d = await r.json();
      existing.push(...(d.items ?? []));
      page = d.nextPageToken;
    } while (page);
    const ids = new Set<string>();
    for (const b of plan.blocks) {
      const id = createHash("sha256")
        .update(`${session.owner}:${b.id}`)
        .digest("hex");
      ids.add(id);
      const todo = (plan as Plan).todos.find((t) => t.id === b.todoId)!;
      const wall = (minutes: number) => {
        if (minutes === 1440) {
          const date = new Date(`${b.date}T12:00:00Z`);
          date.setUTCDate(date.getUTCDate() + 1);
          return `${date.toISOString().slice(0, 10)}T00:00:00`;
        }
        return `${b.date}T${timeLabel(minutes)}:00`;
      };
      const event = {
        status: "confirmed",
        summary: todo.title,
        description: "DayFlow에서 배치한 일정",
        start: { dateTime: wall(b.start), timeZone: data.timeZone },
        end: { dateTime: wall(b.start + b.minutes), timeZone: data.timeZone },
        extendedProperties: {
          private: { dayflowOwner: session.owner, dayflowWeek: data.week },
        },
      };
      let r = await api(`${base}/${id}`, {
        method: "PUT",
        body: JSON.stringify(event),
      });
      if (r.status === 404)
        r = await api(base, {
          method: "POST",
          body: JSON.stringify({ ...event, id }),
        });
      if (!r.ok)
        throw Error(
          "일부 일정을 반영하지 못했어요. 다시 시도하면 같은 일정이 갱신됩니다.",
        );
    }
    for (const event of existing) {
      if (!ids.has(event.id)) {
        const r = await api(`${base}/${event.id}`, { method: "DELETE" });
        if (!r.ok && r.status !== 410 && r.status !== 404)
          throw Error(
            "이전에 배치한 일정 삭제에 실패했어요. 다시 반영해 주세요.",
          );
      }
    }
    return Response.json({ count: plan.blocks.length });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof SyntaxError
            ? "요청 형식을 확인해 주세요."
            : e instanceof Error && /Google|캘린더|일정/.test(e.message)
              ? e.message
              : "캘린더 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 400 },
    );
  }
}
