import { sameOrigin } from "../../../lib/server";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const { key, token, board } = await request.json();
    if (
      typeof key !== "string" ||
      !/^[a-zA-Z0-9]{16,100}$/.test(key) ||
      typeof token !== "string" ||
      !/^[a-zA-Z0-9_-]{16,512}$/.test(token) ||
      typeof board !== "string" ||
      !/^[a-zA-Z0-9]{6,32}$/.test(board)
    )
      return Response.json(
        { error: "보드 ID, API Key와 토큰을 확인해 주세요." },
        { status: 400 },
      );
    const headers = {
      Authorization: `OAuth oauth_consumer_key="${key}", oauth_token="${token}"`,
    };
    const base = `https://api.trello.com/1/boards/${board}`;
    const [cardsResponse, listsResponse] = await Promise.all([
      fetch(`${base}/cards?fields=id,name,idList,dueComplete&filter=open`, {
        headers,
        signal: AbortSignal.timeout(15000),
      }),
      fetch(`${base}/lists?fields=id,name&filter=open`, {
        headers,
        signal: AbortSignal.timeout(15000),
      }),
    ]);
    if (!cardsResponse.ok || !listsResponse.ok)
      return Response.json(
        {
          error:
            "Trello 보드 접근에 실패했어요. 읽기 권한과 인증 정보를 확인해 주세요.",
        },
        { status: 400 },
      );
    const cards: {
      id: string;
      name: string;
      idList: string;
      dueComplete: boolean;
    }[] = await cardsResponse.json();
    const lists: { id: string; name: string }[] = await listsResponse.json();
    const names = [
      ["월", "월요일", "mon", "monday"],
      ["화", "화요일", "tue", "tuesday"],
      ["수", "수요일", "wed", "wednesday"],
      ["목", "목요일", "thu", "thursday"],
      ["금", "금요일", "fri", "friday"],
      ["토", "토요일", "sat", "saturday"],
      ["일", "일요일", "sun", "sunday"],
    ];
    const todos = cards
      .slice(0, 1000)
      .map((c) => ({
        id: `trello-${c.id}`,
        source: c.id,
        title: c.name.slice(0, 200),
        minutes: 60,
        category: "work",
        done: !!c.dueComplete,
        day: names.findIndex((ns) =>
          ns.includes(
            (lists.find((l) => l.id === c.idList)?.name ?? "")
              .trim()
              .toLowerCase(),
          ),
        ),
      }))
      .map((t) => ({ ...t, day: t.day < 0 ? undefined : t.day }));
    return Response.json(
      { todos },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error: "Trello를 불러오지 못했어요. 입력값과 네트워크를 확인해 주세요.",
      },
      { status: 400 },
    );
  }
}
