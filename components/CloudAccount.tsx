"use client";
import { useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Cloud, Mail } from "lucide-react";
import { Plan, validPlan } from "../lib/planner";
let client: SupabaseClient | null = null;
function cloud() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return (
    client ?? (client = createClient(url, key, { auth: { flowType: "pkce" } }))
  );
}
export default function CloudAccount({
  plan,
  onLoad,
  notify,
  ask,
}: {
  plan: Plan;
  onLoad: (p: Plan) => void;
  notify: (message: string) => void;
  ask: (message: string) => Promise<boolean>;
}) {
  const [email, setEmail] = useState(""),
    [user, setUser] = useState<string | null>(null),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const c = cloud();
    setEnabled(!!c);
    if (!c) return;
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    // The browser SDK consumes PKCE callbacks during initialization.
    // Do not exchange the same one-time code again here.
    c.auth.getSession().then(({ data, error }) => {
      setUser(data.session?.user.email ?? null);
      if (code && (error || !data.session))
        notify("로그인 링크가 만료되었어요. 다시 요청해 주세요.");
    });
    const { data } = c.auth.onAuthStateChange((event, session) => {
      setUser(session?.user.email ?? null);
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") setRevision(0);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    const c = cloud();
    if (!c) return;
    setBusy(true);
    const { error } = await c.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.origin },
    });
    setBusy(false);
    notify(
      error
        ? "로그인 메일을 보내지 못했어요. 이메일과 서비스 설정을 확인해 주세요."
        : "이메일의 로그인 링크를 이 브라우저에서 열어주세요.",
    );
  }
  async function load() {
    const c = cloud();
    if (!c) return;
    setBusy(true);
    try {
      const {
        data: { user: u },
      } = await c.auth.getUser();
      if (!u) throw Error();
      const { data, error } = await c
        .from("dayflow_plans")
        .select("payload,revision")
        .eq("user_id", u.id)
        .maybeSingle();
      if (error) throw Error();
      if (!data) {
        setRevision(0);
        notify("아직 클라우드에 저장한 계획이 없어요.");
        return;
      }
      if (!validPlan(data.payload)) throw Error();
      if (
        await ask(
          "현재 브라우저의 계획을 클라우드 계획으로 바꿀까요? 필요한 데이터는 먼저 백업해 주세요.",
        )
      ) {
        onLoad(data.payload);
        setRevision(data.revision);
        notify("클라우드에서 계획을 불러왔어요.");
      }
    } catch {
      notify(
        "계획을 불러오지 못했어요. 로그인과 데이터베이스 설정을 확인해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    const c = cloud();
    if (!c) return;
    setBusy(true);
    try {
      const { data, error } = await c.rpc("save_dayflow_plan", {
        new_payload: plan,
        expected_revision: revision,
      });
      if (error) {
        notify(
          error.message.includes("CONFLICT")
            ? "다른 기기에서 저장한 계획이 있어요. 클라우드 계획을 먼저 불러와 주세요."
            : "저장하지 못했어요. 로그인과 데이터베이스 설정을 확인해 주세요.",
        );
        return;
      }
      setRevision(data);
      notify("내 계정에 계획을 저장했어요.");
    } catch {
      notify("클라우드에 연결하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="connection-card">
      <div>
        <Cloud size={21} />
        <strong>내 계정 · 클라우드 백업</strong>
      </div>
      {!enabled ? (
        <p>
          계정 연결 준비 중입니다. 지금은 브라우저에 저장하고 파일로 백업할 수
          있어요.
        </p>
      ) : user ? (
        <>
          <p>
            {user}
            <br />
            원하는 시점에 저장하고 다른 기기에서 불러올 수 있어요.
          </p>
          <div className="cloud-actions">
            <button className="secondary" disabled={busy} onClick={load}>
              클라우드에서 불러오기
            </button>
            <button className="primary" disabled={busy} onClick={save}>
              내 계정에 저장
            </button>
            <button
              className="text-button"
              onClick={async () => {
                await cloud()?.auth.signOut();
                setUser(null);
                setRevision(0);
              }}
            >
              로그아웃
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={login}>
          <p>이메일 로그인으로 다른 기기에서도 내 계획을 이어가세요.</p>
          <label>
            이메일
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <button className="secondary" disabled={busy}>
            <Mail size={14} />
            {busy ? "보내는 중…" : "로그인 링크 받기"}
          </button>
        </form>
      )}
      <p className="help">
        이 기기의 로컬 계획은 로그아웃 후에도 남습니다. 공용 기기에서는 백업 후
        로컬 데이터를 삭제해 주세요.
      </p>
    </div>
  );
}
