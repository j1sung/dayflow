"use client";
import { useEffect, useRef, useState } from "react";
import CloudAccount from "../components/CloudAccount";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Cloud,
  GripVertical,
  LayoutDashboard,
  Link2,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import {
  Block,
  Plan,
  Todo,
  calendarIcs,
  dateKey,
  durationLabel,
  placeBlock,
  timeLabel,
  validPlan,
  weekDates,
} from "../lib/planner";
const categories = {
  work: { label: "프로젝트", color: "#6f7e5d" },
  study: { label: "학습", color: "#9a86b0" },
  life: { label: "일상", color: "#cc9860" },
};
const days = ["월", "화", "수", "목", "금", "토", "일"];
const empty: Plan = { version: 1, todos: [], blocks: [], bedtime: 60 };
function seed(): Plan {
  const d = weekDates();
  const todos: Todo[] = [
    {
      id: "demo1",
      title: "이번 주 프로젝트 계획 정리",
      minutes: 90,
      category: "work",
      done: false,
    },
    {
      id: "demo2",
      title: "새로운 아이디어 리서치",
      minutes: 120,
      category: "work",
      done: false,
    },
    {
      id: "demo3",
      title: "읽고 싶었던 책 읽기",
      minutes: 60,
      category: "study",
      done: false,
    },
    {
      id: "demo4",
      title: "가볍게 산책하기",
      minutes: 30,
      category: "life",
      done: false,
    },
    {
      id: "demo5",
      title: "주간 회고 작성",
      minutes: 45,
      category: "life",
      done: false,
    },
  ];
  return {
    ...empty,
    todos,
    blocks: [
      {
        id: "sample1",
        todoId: "demo1",
        date: dateKey(d[0]),
        start: 600,
        minutes: 90,
      },
      {
        id: "sample2",
        todoId: "demo3",
        date: dateKey(d[1]),
        start: 840,
        minutes: 60,
      },
      {
        id: "sample3",
        todoId: "demo4",
        date: dateKey(d[2]),
        start: 960,
        minutes: 30,
      },
    ],
  };
}
export default function Home() {
  const [plan, setPlan] = useState<Plan>(empty),
    [ready, setReady] = useState(false),
    [offset, setOffset] = useState(0),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [tab, setTab] = useState("week");
  const [modal, setModal] = useState<
      "todo" | "settings" | "connections" | "block" | null
    >(null),
    [editing, setEditing] = useState<string | null>(null),
    [title, setTitle] = useState(""),
    [minutes, setMinutes] = useState(60),
    [category, setCategory] = useState<Todo["category"]>("work"),
    [todoDay, setTodoDay] = useState(-1);
  const [selected, setSelected] = useState<string | null>(null),
    [blockDraft, setBlockDraft] = useState<Block | null>(null),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [google, setGoogle] = useState(false),
    [configured, setConfigured] = useState(false),
    [trelloKey, setTrelloKey] = useState(""),
    [trelloToken, setTrelloToken] = useState(""),
    [board, setBoard] = useState(""),
    [saveError, setSaveError] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const confirmResolver = useRef<((value: boolean) => void) | null>(null);
  function ask(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      confirmResolver.current = resolve;
      setConfirmMessage(message);
    });
  }
  function resolveConfirm(value: boolean) {
    confirmResolver.current?.(value);
    confirmResolver.current = null;
    setConfirmMessage("");
  }
  const storageWritable = useRef(true);
  const fileInput = useRef<HTMLInputElement>(null),
    calendar = useRef<HTMLDivElement>(null);
  const dates = weekDates(offset),
    keys = dates.map(dateKey),
    today = dateKey(new Date());
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dayflow-v1");
      if (saved) {
        const p = JSON.parse(saved);
        if (validPlan(p)) setPlan(p);
        else {
          storageWritable.current = false;
          setSaveError(true);
          setToast(
            "저장 데이터 형식을 확인해 주세요. 원본은 덮어쓰지 않았습니다.",
          );
        }
      }
    } catch {
      storageWritable.current = false;
      setSaveError(true);
    }
    setReady(true);
    fetch("/api/google/status")
      .then((r) => r.json())
      .then((d) => {
        setGoogle(d.connected);
        setConfigured(d.configured);
      })
      .catch(() => {});
    const params = new URLSearchParams(location.search);
    if (params.has("code")) setModal("settings");
    if (params.has("google")) {
      setToast(
        params.get("google") === "connected"
          ? "Google Calendar가 연결되었습니다."
          : "Google 연결을 완료하지 못했습니다. 설정을 확인해 주세요.",
      );
      history.replaceState(null, "", location.pathname);
    }
  }, []);
  useEffect(() => {
    if (!ready || !storageWritable.current) return;
    try {
      localStorage.setItem("dayflow-v1", JSON.stringify(plan));
    } catch {
      setSaveError(true);
    }
  }, [plan, ready]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (ready && calendar.current) calendar.current.scrollTop = 8 * 64;
  }, [ready]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmResolver.current) {
          resolveConfirm(false);
          return;
        }
        setModal(null);
        setSelected(null);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const weekBlocks = plan.blocks.filter((b) => keys.includes(b.date)),
    scheduled = weekBlocks.reduce((s, b) => s + b.minutes, 0),
    finished = plan.todos.filter((t) => t.done).length;
  const allocated = (id: string) =>
    weekBlocks
      .filter((b) => b.todoId === id)
      .reduce((s, b) => s + b.minutes, 0);
  const remaining = plan.todos
    .filter((t) => !t.done)
    .reduce((s, t) => s + Math.max(0, t.minutes - allocated(t.id)), 0);
  const visible = plan.todos.filter(
    (t) =>
      t.title.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "done" && t.done) ||
        (filter === "pending" && !t.done)),
  );
  function editTodo(todo?: Todo) {
    setEditing(todo?.id ?? null);
    setTitle(todo?.title ?? "");
    setMinutes(todo?.minutes ?? 60);
    setCategory(todo?.category ?? "work");
    setTodoDay(todo?.day ?? -1);
    setModal("todo");
  }
  function saveTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || minutes < 15 || minutes > 1440) return;
    const todo: Todo = {
      id: editing ?? crypto.randomUUID(),
      title: title.trim(),
      minutes,
      category,
      day: todoDay < 0 ? undefined : todoDay,
      done: plan.todos.find((t) => t.id === editing)?.done ?? false,
    };
    setPlan((p) => ({
      ...p,
      todos: editing
        ? p.todos.map((t) => (t.id === editing ? { ...t, ...todo } : t))
        : [...p.todos, todo],
    }));
    setModal(null);
  }
  function drop(todoId: string, date: string, start: number, blockId?: string) {
    const t = plan.todos.find((t) => t.id === todoId);
    if (!t) return;
    const existing = plan.blocks.find((b) => b.id === blockId);
    const duration =
      existing?.minutes ??
      Math.min(60, Math.max(15, t.minutes - allocated(t.id)));
    const b: Block = {
      id: existing?.id ?? crypto.randomUUID(),
      todoId,
      date,
      start,
      minutes: duration,
    };
    try {
      setPlan({ ...plan, blocks: placeBlock(plan.blocks, b) });
      setSelected(null);
      setToast(
        existing
          ? "일정을 이동했어요."
          : "시간표에 배치했어요. 클릭하면 시간을 조정할 수 있어요.",
      );
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  function download(name: string, data: string, type: string) {
    const u = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  }
  async function syncGoogle() {
    if (!google) {
      setModal("connections");
      return;
    }
    if (
      !weekBlocks.length &&
      !(await ask(
        "이 주에 DayFlow에서 반영한 Google 일정을 모두 지울까요? 다른 일정은 유지됩니다.",
      ))
    )
      return;
    setBusy(true);
    try {
      const r = await fetch("/api/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          todos: plan.todos,
          blocks: weekBlocks,
          week: keys[0],
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setToast(`${d.count}개 일정을 Google Calendar에 반영했어요.`);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function importTrello(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/trello", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: trelloKey, token: trelloToken, board }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPlan((p) => ({
        ...p,
        todos: [
          ...p.todos,
          ...(d.todos as Todo[]).filter(
            (t) => !p.todos.some((x) => x.source === t.source),
          ),
        ],
      }));
      setToast("Trello 카드를 불러왔어요. 예상시간을 설정해 주세요.");
      setTrelloToken("");
      setModal(null);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!ready)
    return (
      <div className="loading-screen" role="status">
        <Sun size={32} />
        <strong>DayFlow</strong>
        <p>나의 한 주를 불러오는 중…</p>
      </div>
    );
  return (
    <div className="shell">
      <aside className="sidebar">
        <a href="/" className="brand">
          <span className="brandmark">
            <Sun size={23} />
          </span>
          DayFlow<span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="avatar">나</span>
          <span>
            나의 워크스페이스<small>Personal space</small>
          </span>
          <ChevronDown size={14} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          <button
            className={tab === "week" ? "active" : ""}
            onClick={() => setTab("week")}
          >
            <CalendarDays size={18} />
            주간 플래너
            <span className="nav-dot" />
          </button>
          <button
            className={tab === "tasks" ? "active" : ""}
            onClick={() => setTab("tasks")}
          >
            <LayoutDashboard size={18} />
            전체 할 일<span className="nav-count">{plan.todos.length}</span>
          </button>
          <button onClick={() => setModal("connections")}>
            <Link2 size={18} />
            서비스 연결
            <ArrowUpRight size={14} />
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="quiet-card">
            <span>조금 더 나다운 한 주</span>
            <p>
              해야 할 일 사이에,
              <br />
              나를 위한 시간도 남겨두세요.
            </p>
            <span className="tiny-sun">✳</span>
          </div>
          <button
            className="settings-link"
            onClick={() => setModal("settings")}
          >
            <Settings2 size={17} />
            설정 및 데이터 관리
          </button>
          <div className="profile">
            <span className="profile-icon">D</span>
            <div>
              나의 DayFlow<small>나만의 속도로, 차근차근</small>
            </div>
            <span className="status-dot" />
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <span className="breadcrumb">워크스페이스</span>
            <span className="slash">/</span>
            <span>{tab === "week" ? "주간 플래너" : "전체 할 일"}</span>
          </div>
          <div className="top-right">
            <span className="save-state">
              <span className={saveError ? "status-dot error" : "status-dot"} />
              {saveError ? "저장 공간 확인 필요" : "이 브라우저에 자동 저장"}
            </span>
            <button
              className="icon-button"
              aria-label="설정"
              onClick={() => setModal("settings")}
            >
              <Settings2 size={18} />
            </button>
            <span className="profile-icon small">D</span>
          </div>
        </header>
        <div className="content">
          <section className="page-intro">
            <div>
              <div className="eyebrow">
                <span /> MAKE ROOM FOR WHAT MATTERS
              </div>
              <h1>
                {tab === "week"
                  ? "나의 한 주, 나의 흐름"
                  : "생각을 비우고, 하나씩."}
                <span>✳</span>
              </h1>
              <p>할 일을 꺼내놓고, 나에게 맞는 시간에 채워보세요.</p>
            </div>
            <button
              className="secondary"
              onClick={() => setModal("connections")}
            >
              <Link2 size={15} />
              서비스 연결
            </button>
          </section>
          <section className="stats">
            <div className="stat">
              <span className="stat-icon green">
                <CalendarDays size={19} />
              </span>
              <div>
                <span>이번 주 배치한 시간</span>
                <strong>
                  {durationLabel(scheduled)}
                  <small>일정 {weekBlocks.length}개</small>
                </strong>
              </div>
              <span className="stat-decoration">↗</span>
            </div>
            <div className="stat">
              <span className="stat-icon sand">
                <Clock3 size={19} />
              </span>
              <div>
                <span>아직 배치하지 않은 시간</span>
                <strong>
                  {durationLabel(remaining)}
                  <small>나의 속도로 채워요</small>
                </strong>
              </div>
            </div>
            <div className="stat">
              <span className="stat-icon lilac">
                <CheckCircle2 size={19} />
              </span>
              <div>
                <span>완료한 할 일</span>
                <strong>
                  {finished}
                  <em>/ {plan.todos.length}</em>
                  <small>작은 성취를 쌓아가요</small>
                </strong>
              </div>
              <div
                className="progress-ring"
                style={{
                  background: `conic-gradient(#7d8a68 ${plan.todos.length ? (finished / plan.todos.length) * 360 : 0}deg,#eeeee8 0)`,
                }}
              >
                <span>
                  {plan.todos.length
                    ? Math.round((finished / plan.todos.length) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </section>
          <section className={`planner ${tab === "tasks" ? "tasks-only" : ""}`}>
            <div className="todo-panel">
              <div className="panel-title">
                <div>
                  <h2>
                    이번 주 할 일 <span>{plan.todos.length}</span>
                  </h2>
                  <p>계획의 시작은 작은 할 일부터</p>
                </div>
                <button
                  className="icon-button"
                  aria-label="할 일 추가"
                  onClick={() => editTodo()}
                >
                  <Plus size={19} />
                </button>
              </div>
              <button
                className="trello-import"
                onClick={() => setModal("connections")}
              >
                <span className="trello-logo">▥</span>Trello에서 가져오기
                <ArrowDownToLine size={14} />
              </button>
              <div className="search">
                <Search size={15} />
                <input
                  aria-label="할 일 검색"
                  placeholder="할 일 검색하기"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="filters">
                {[
                  ["all", "전체"],
                  ["pending", "진행 중"],
                  ["done", "완료"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={filter === key ? "selected" : ""}
                    onClick={() => setFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="todo-list">
                {visible.map((todo) => (
                  <article
                    key={todo.id}
                    draggable={!todo.done}
                    onDragStart={(e) =>
                      e.dataTransfer.setData(
                        "application/dayflow",
                        JSON.stringify({ todoId: todo.id }),
                      )
                    }
                    className={`todo-card ${todo.done ? "is-done" : ""} ${selected === todo.id ? "picked" : ""}`}
                  >
                    <div className="todo-card-top">
                      <button
                        className={`check ${todo.done ? "checked" : ""}`}
                        aria-label={`${todo.title} ${todo.done ? "완료 취소" : "완료"}`}
                        onClick={() =>
                          setPlan((p) => ({
                            ...p,
                            todos: p.todos.map((t) =>
                              t.id === todo.id ? { ...t, done: !t.done } : t,
                            ),
                          }))
                        }
                      >
                        {todo.done && <Check size={12} />}
                      </button>
                      <button
                        className="todo-title"
                        onClick={() => editTodo(todo)}
                      >
                        {todo.title}
                      </button>
                      <GripVertical className="grip" size={15} />
                    </div>
                    <div className="todo-meta">
                      <span className={`category ${todo.category}`}>
                        {categories[todo.category].label}
                      </span>
                      <span>
                        <Clock3 size={12} />
                        {durationLabel(todo.minutes)}
                      </span>
                      {todo.source && (
                        <span className="source-badge">Trello</span>
                      )}
                    </div>
                    <div className="todo-bottom">
                      <span>
                        {allocated(todo.id) > 0
                          ? `${durationLabel(allocated(todo.id))} 배치됨`
                          : todo.day !== undefined
                            ? `${days[todo.day]}요일 할 일`
                            : "시간을 정해볼까요?"}
                      </span>
                      {!todo.done && (
                        <button
                          onClick={() => {
                            setSelected(selected === todo.id ? null : todo.id);
                            setToast("시간표의 빈 시간을 클릭하면 배치됩니다.");
                            setTab("week");
                          }}
                        >
                          {selected === todo.id ? "선택 해제" : "배치하기"}
                          <ArrowUpRight size={12} />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
                {!visible.length && (
                  <div className="empty-todos">
                    <span>✳</span>
                    <h3>
                      {query ? "검색 결과가 없어요" : "새로운 한 주의 시작"}
                    </h3>
                    <p>
                      {query
                        ? "다른 단어로 찾아보세요."
                        : "떠오르는 할 일을 하나 적어볼까요?"}
                    </p>
                    {!query && (
                      <button className="primary" onClick={() => editTodo()}>
                        <Plus size={14} />첫 할 일 추가
                      </button>
                    )}
                    {!plan.todos.length && (
                      <button
                        className="text-button"
                        onClick={() => {
                          setPlan(seed());
                          setToast(
                            "가상의 예시 데이터를 넣었어요. 자유롭게 바꿔보세요.",
                          );
                        }}
                      >
                        예시로 먼저 둘러보기
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button className="add-todo" onClick={() => editTodo()}>
                <Plus size={16} />
                새로운 할 일 추가
              </button>
              <div className="drag-tip">
                <span>↗</span>
                <p>
                  카드를 시간표로 드래그해 보세요.
                  <br />
                  클릭해서 배치할 수도 있어요.
                </p>
              </div>
            </div>
            <div className="schedule-panel">
              <div className="schedule-toolbar">
                <div className="week-control">
                  <h2>
                    {dates[0].getFullYear()}년 {dates[0].getMonth() + 1}월
                  </h2>
                  <div>
                    <button
                      aria-label="이전 주"
                      onClick={() => setOffset((o) => o - 1)}
                    >
                      <ArrowLeft size={15} />
                    </button>
                    <button
                      aria-label="다음 주"
                      onClick={() => setOffset((o) => o + 1)}
                    >
                      <ArrowRight size={15} />
                    </button>
                  </div>
                  <button className="today-button" onClick={() => setOffset(0)}>
                    오늘
                  </button>
                </div>
                <div className="calendar-actions">
                  <span>
                    {dates[0].getMonth() + 1}.{dates[0].getDate()} –{" "}
                    {dates[6].getMonth() + 1}.{dates[6].getDate()}
                  </span>
                  <button
                    className="icon-button"
                    aria-label="이번 주 캘린더 파일 다운로드"
                    onClick={() =>
                      download(
                        "dayflow-week.ics",
                        calendarIcs(plan.todos, weekBlocks),
                        "text/calendar;charset=utf-8",
                      )
                    }
                  >
                    <ArrowDownToLine size={17} />
                  </button>
                </div>
              </div>
              <div className="calendar-wrap">
                <div className="day-heading">
                  <span className="timezone">
                    GMT{-new Date().getTimezoneOffset() / 60 >= 0 ? "+" : ""}
                    {-new Date().getTimezoneOffset() / 60}
                  </span>
                  {dates.map((date, i) => (
                    <div
                      key={keys[i]}
                      className={`${keys[i] === today ? "is-today" : ""} ${i === 6 ? "sunday" : ""}`}
                    >
                      <span>{days[i]}</span>
                      <strong>{date.getDate()}</strong>
                      {keys[i] === today && <i />}
                    </div>
                  ))}
                </div>
                <div className="calendar-scroll" ref={calendar}>
                  <div className="calendar-grid">
                    <div className="time-labels">
                      {Array.from({ length: 24 }, (_, i) => (
                        <div key={i}>{String(i).padStart(2, "0")}:00</div>
                      ))}
                    </div>
                    {keys.map((key, day) => (
                      <div
                        className={`day-column ${key === today ? "today-column" : ""}`}
                        key={key}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          try {
                            const d = JSON.parse(
                              e.dataTransfer.getData("application/dayflow"),
                            );
                            const y =
                              e.clientY -
                              e.currentTarget.getBoundingClientRect().top;
                            drop(
                              d.todoId,
                              key,
                              Math.min(1425, Math.floor(y / 16) * 15),
                              d.blockId,
                            );
                          } catch {
                            setToast("할 일 카드를 시간표로 옮겨주세요.");
                          }
                        }}
                        onClick={(e) => {
                          if (selected) {
                            const y =
                              e.clientY -
                              e.currentTarget.getBoundingClientRect().top;
                            drop(
                              selected,
                              key,
                              Math.min(1425, Math.floor(y / 16) * 15),
                            );
                          }
                        }}
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <button
                            key={i}
                            className="hour-cell"
                            aria-label={`${days[day]}요일 ${i}시 배치`}
                            onClick={(e) => {
                              if (selected) {
                                e.stopPropagation();
                                drop(selected, key, i * 60);
                              }
                            }}
                          />
                        ))}
                        {weekBlocks
                          .filter((b) => b.date === key)
                          .map((b) => {
                            const t = plan.todos.find((t) => t.id === b.todoId);
                            return (
                              t && (
                                <button
                                  key={b.id}
                                  draggable
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    e.dataTransfer.setData(
                                      "application/dayflow",
                                      JSON.stringify({
                                        todoId: t.id,
                                        blockId: b.id,
                                      }),
                                    );
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBlockDraft(b);
                                    setModal("block");
                                  }}
                                  className={`schedule-block ${t.category} ${t.done ? "done-block" : ""}`}
                                  style={{
                                    top: (b.start / 60) * 64,
                                    height: Math.max(
                                      27,
                                      (b.minutes / 60) * 64 - 3,
                                    ),
                                  }}
                                >
                                  <span>
                                    {timeLabel(b.start)} –{" "}
                                    {timeLabel(b.start + b.minutes)}
                                  </span>
                                  <strong>{t.title}</strong>
                                  {b.minutes >= 60 && (
                                    <small>
                                      {durationLabel(b.minutes)}
                                      {t.done ? " · 완료" : ""}
                                    </small>
                                  )}
                                </button>
                              )
                            );
                          })}
                        {key === today && (
                          <div
                            className="now-line"
                            style={{
                              top:
                                ((new Date().getHours() * 60 +
                                  new Date().getMinutes()) /
                                  60) *
                                64,
                            }}
                          >
                            <i />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="calendar-footer">
                <div>
                  {Object.entries(categories).map(([key, c]) => (
                    <span key={key}>
                      <i style={{ background: c.color }} />
                      {c.label}
                    </span>
                  ))}
                </div>
                <span>
                  <Sun size={13} />
                  계획 사이, 여유도 잊지 마세요
                </span>
              </div>
            </div>
          </section>
          <footer className="bottom-bar">
            <div>
              <span className="sparkle-icon">
                <Sparkles size={18} />
              </span>
              <div>
                <strong>계획이 준비되었나요?</strong>
                <span>완성된 시간표를 캘린더에 담아보세요.</span>
              </div>
            </div>
            <button className="primary" onClick={syncGoogle} disabled={busy}>
              <CalendarDays size={16} />
              {busy ? "반영 중…" : "Google Calendar에 반영"}
              <ArrowUpRight size={15} />
            </button>
          </footer>
          <div className="footnote">
            오늘의 작은 계획이, 나다운 한 주를 만듭니다.
            <span>
              DayFlow ·{" "}
              {ready
                ? Intl.DateTimeFormat().resolvedOptions().timeZone
                : "나만의 시간"}
            </span>
          </div>
        </div>
      </main>
      {selected && (
        <div className="selection-banner">
          할 일을 배치할 빈 시간을 클릭하세요.
          <button onClick={() => setSelected(null)}>
            <X size={16} />
          </button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
          <button aria-label="알림 닫기" onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "todo"
                ? "할 일 편집"
                : modal === "block"
                  ? "일정 편집"
                  : modal === "settings"
                    ? "설정"
                    : "서비스 연결"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="닫기"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            {modal === "todo" && (
              <form onSubmit={saveTodo}>
                <div className="eyebrow">ONE THING AT A TIME</div>
                <h2>{editing ? "할 일 다듬기" : "새로운 할 일"}</h2>
                <p>무엇을 위한 시간을 만들고 싶나요?</p>
                <label>
                  할 일 이름
                  <input
                    autoFocus
                    value={title}
                    maxLength={200}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: 이번 주 프로젝트 계획 정리"
                    required
                  />
                </label>
                <div className="form-row">
                  <label>
                    예상시간 (분)
                    <input
                      type="number"
                      min={15}
                      max={1440}
                      step={15}
                      value={minutes}
                      onChange={(e) => setMinutes(Number(e.target.value))}
                      required
                    />
                  </label>
                  <label>
                    분류
                    <select
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as Todo["category"])
                      }
                    >
                      {Object.entries(categories).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  할 일 요일
                  <select
                    value={todoDay}
                    onChange={(e) => setTodoDay(Number(e.target.value))}
                  >
                    <option value={-1}>요일 미정</option>
                    {days.map((day, i) => (
                      <option key={day} value={i}>
                        {day}요일
                      </option>
                    ))}
                  </select>
                </label>
                <div className="modal-actions">
                  {editing && (
                    <button
                      type="button"
                      className="danger"
                      onClick={async () => {
                        if (await ask("이 할 일과 배치한 일정을 삭제할까요?")) {
                          setPlan((p) => ({
                            ...p,
                            todos: p.todos.filter((t) => t.id !== editing),
                            blocks: p.blocks.filter(
                              (b) => b.todoId !== editing,
                            ),
                          }));
                          setModal(null);
                        }
                      }}
                    >
                      <Trash2 size={15} />
                      삭제
                    </button>
                  )}
                  <button className="primary" type="submit">
                    {editing ? "변경 저장" : "할 일 추가"}
                    <Plus size={16} />
                  </button>
                </div>
              </form>
            )}
            {modal === "block" && blockDraft && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  try {
                    setPlan((p) => ({
                      ...p,
                      blocks: placeBlock(p.blocks, blockDraft),
                    }));
                    setModal(null);
                  } catch (err) {
                    setToast((err as Error).message);
                  }
                }}
              >
                <div className="eyebrow">MAKE TIME</div>
                <h2>시간을 조정해요</h2>
                <p>
                  {plan.todos.find((t) => t.id === blockDraft.todoId)?.title}
                </p>
                <label>
                  날짜
                  <input
                    type="date"
                    value={blockDraft.date}
                    required
                    onChange={(e) =>
                      setBlockDraft({ ...blockDraft, date: e.target.value })
                    }
                  />
                </label>
                <div className="form-row">
                  <label>
                    시작 시간
                    <input
                      type="time"
                      value={timeLabel(blockDraft.start)}
                      step={900}
                      required
                      onChange={(e) => {
                        const [h, m] = e.target.value.split(":").map(Number);
                        setBlockDraft({ ...blockDraft, start: h * 60 + m });
                      }}
                    />
                  </label>
                  <label>
                    배치 시간 (분)
                    <input
                      type="number"
                      min={15}
                      max={1440}
                      step={15}
                      value={blockDraft.minutes}
                      required
                      onChange={(e) =>
                        setBlockDraft({
                          ...blockDraft,
                          minutes: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
                <p className="help">
                  할 일 하나를 여러 날짜에 나누어 배치할 수 있어요.
                </p>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      setPlan((p) => ({
                        ...p,
                        blocks: p.blocks.filter((b) => b.id !== blockDraft.id),
                      }));
                      setModal(null);
                    }}
                  >
                    시간표에서 빼기
                  </button>
                  <button type="submit" className="primary">
                    변경 저장
                  </button>
                </div>
              </form>
            )}
            {modal === "connections" && (
              <>
                <div className="eyebrow">BETTER TOGETHER</div>
                <h2>서비스 연결</h2>
                <p>할 일은 가져오고, 완성한 계획은 내보내요.</p>
                <CloudAccount
                  plan={plan}
                  onLoad={setPlan}
                  notify={setToast}
                  ask={ask}
                />
                <div className="connection-card">
                  <div>
                    <CalendarDays size={22} />
                    <strong>Google Calendar</strong>
                    <span className="connection-status">
                      {google ? "연결됨" : "연결 전"}
                    </span>
                  </div>
                  <p>
                    {configured
                      ? "내 Google 계정으로 연결하고, 이번 주 계획을 수동으로 반영합니다."
                      : "Google OAuth 설정 후 연결할 수 있어요. 지금은 캘린더 파일로 내보낼 수 있습니다."}
                  </p>
                  {google ? (
                    <button
                      className="secondary"
                      onClick={async () => {
                        await fetch("/api/google/status", { method: "DELETE" });
                        setGoogle(false);
                      }}
                    >
                      연결 해제
                    </button>
                  ) : (
                    <a
                      className={`secondary ${!configured ? "disabled" : ""}`}
                      href={configured ? "/api/google/connect" : undefined}
                      aria-disabled={!configured}
                    >
                      Google 계정 연결
                      <ArrowUpRight size={14} />
                    </a>
                  )}
                  <button
                    className="text-button"
                    onClick={() =>
                      download(
                        "dayflow-week.ics",
                        calendarIcs(plan.todos, weekBlocks),
                        "text/calendar;charset=utf-8",
                      )
                    }
                  >
                    이번 주 .ics 다운로드
                  </button>
                </div>
                <form onSubmit={importTrello} className="connection-card">
                  <div>
                    <span className="trello-logo">▥</span>
                    <strong>Trello</strong>
                  </div>
                  <p>
                    요일별 리스트의 카드를 가져옵니다. 토큰은 저장하지 않으며,
                    중복 카드는 다시 추가하지 않습니다.
                  </p>
                  <label>
                    보드 ID 또는 짧은 ID
                    <input
                      required
                      value={board}
                      onChange={(e) => setBoard(e.target.value)}
                      placeholder="Trello 보드 주소의 /b/ 다음 값"
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      API Key
                      <input
                        type="password"
                        autoComplete="off"
                        required
                        value={trelloKey}
                        onChange={(e) => setTrelloKey(e.target.value)}
                      />
                    </label>
                    <label>
                      읽기 권한 토큰
                      <input
                        type="password"
                        autoComplete="off"
                        required
                        value={trelloToken}
                        onChange={(e) => setTrelloToken(e.target.value)}
                      />
                    </label>
                  </div>
                  <button className="secondary" disabled={busy}>
                    {busy ? "가져오는 중…" : "Trello 할 일 가져오기"}
                    <ArrowDownToLine size={14} />
                  </button>
                  <p className="help">
                    현재는 가져오기만 지원합니다. DayFlow 수정은 Trello 원본에
                    쓰지 않습니다.
                  </p>
                </form>
              </>
            )}
            {modal === "settings" && (
              <>
                <div className="eyebrow">YOUR OWN RHYTHM</div>
                <h2>설정 및 데이터</h2>
                <p>현재 기기의 이 브라우저에 데이터가 저장됩니다.</p>
                <CloudAccount
                  plan={plan}
                  onLoad={setPlan}
                  notify={setToast}
                  ask={ask}
                />
                <label>
                  기본 취침시간
                  <input
                    type="time"
                    value={timeLabel(plan.bedtime)}
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(":").map(Number);
                      setPlan((p) => ({ ...p, bedtime: h * 60 + m }));
                    }}
                  />
                </label>
                <div className="settings-note">
                  <Cloud size={20} />
                  <p>
                    브라우저 자동 저장과 클라우드 저장은 별개예요. 계정 연결 후
                    직접 저장하거나, 파일로 백업해 주세요.
                  </p>
                </div>
                <div className="settings-buttons">
                  {saveError && (
                    <button
                      className="secondary"
                      onClick={() => {
                        try {
                          const raw = localStorage.getItem("dayflow-v1");
                          if (raw)
                            download(
                              "dayflow-recovery.json",
                              raw,
                              "application/json",
                            );
                          localStorage.setItem(
                            "dayflow-v1",
                            JSON.stringify(plan),
                          );
                          storageWritable.current = true;
                          setSaveError(false);
                          setToast("원본을 백업하고 저장을 복구했어요.");
                        } catch {
                          setToast(
                            "저장 공간이 부족하거나 브라우저 저장이 차단되어 있어요. 파일로 백업해 주세요.",
                          );
                        }
                      }}
                    >
                      원본 백업 후 저장 복구
                    </button>
                  )}
                  <button
                    className="secondary"
                    onClick={() =>
                      download(
                        "dayflow-backup.json",
                        JSON.stringify(plan, null, 2),
                        "application/json",
                      )
                    }
                  >
                    내 데이터 백업
                    <ArrowDownToLine size={15} />
                  </button>
                  <button
                    className="secondary"
                    onClick={() => fileInput.current?.click()}
                  >
                    백업 불러오기
                  </button>
                  <button
                    className="danger"
                    onClick={async () => {
                      if (
                        await ask(
                          "이 브라우저의 할 일과 모든 시간표를 삭제할까요? 백업을 먼저 권장합니다.",
                        )
                      ) {
                        setPlan({ ...empty });
                        setModal(null);
                      }
                    }}
                  >
                    모든 데이터 삭제
                  </button>
                </div>
                <input
                  type="file"
                  accept="application/json,.json"
                  hidden
                  ref={fileInput}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      if (f.size > 5_000_000) throw Error();
                      const p = JSON.parse(await f.text());
                      if (!validPlan(p)) throw Error();
                      if (
                        await ask("현재 계획을 백업 파일의 내용으로 바꿀까요?")
                      ) {
                        setPlan(p);
                        setToast("백업을 불러왔어요.");
                      }
                    } catch {
                      setToast("유효한 DayFlow 백업 파일을 선택해 주세요.");
                    }
                    e.target.value = "";
                  }}
                />
              </>
            )}
          </section>
        </div>
      )}
      {confirmMessage && (
        <div className="modal-overlay confirm-layer">
          <section
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-label="변경 확인"
          >
            <h2>한 번 더 확인해 주세요</h2>
            <p>{confirmMessage}</p>
            <div className="modal-actions">
              <button
                className="secondary"
                autoFocus
                onClick={() => resolveConfirm(false)}
              >
                취소
              </button>
              <button className="primary" onClick={() => resolveConfirm(true)}>
                확인
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
