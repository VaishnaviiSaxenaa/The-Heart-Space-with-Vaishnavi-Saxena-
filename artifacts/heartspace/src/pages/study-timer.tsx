import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { saveDailyToDB } from "../lib/supabase-sync";

type Mode = "stopwatch" | "pomodoro";
interface TimerState {
  mode: Mode;
  running: boolean;
  startedAt: number | null;
  acc: number;
  phase: "focus" | "break";
  phaseLeft: number;
  sessions: number;
}
const FOCUS = 25 * 60000, SHORT = 5 * 60000, LONG = 15 * 60000;
const initial = (mode: Mode): TimerState => ({ mode, running: false, startedAt: null, acc: 0, phase: "focus", phaseLeft: FOCUS, sessions: 0 });

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmt(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}
function beep() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    const c = new AC(); const o = c.createOscillator(); const g = c.createGain();
    o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = 0.1; o.start();
    setTimeout(() => { o.stop(); c.close(); }, 400);
  } catch {}
  try { navigator.vibrate?.(300); } catch {}
}
function blank(date: string) {
  return {
    date, mood: null, note: "", sleepHours: null, sleepQuality: null, physicalActivity: false, activityType: "",
    meTimeMinutes: null, stressLevel: null, emotionalState: [], energySlots: { high: [], medium: [], low: [] },
    studyHours: null, sittingCapacityHours: null, studyCapacityHours: null, priorities: [], nextDayTasks: [],
  } as any;
}

export default function StudyTimer({ uid }: { uid: string }) {
  const viewAs = new URLSearchParams(window.location.search).get("viewAs");
  const key = `hs_timer_${uid}`;
  const [st, setSt] = useState<TimerState>(() => {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : initial("stopwatch"); } catch { return initial("stopwatch"); }
  });
  const [now, setNow] = useState(Date.now());
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const stRef = useRef(st);
  stRef.current = st;

  function commit(next: TimerState) {
    stRef.current = next;
    setSt(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  }

  useEffect(() => {
    const iv = setInterval(() => {
      setNow(Date.now());
      let s = stRef.current;
      if (s.mode === "pomodoro" && s.running && s.startedAt != null) {
        let changed = false, guard = 0;
        while (s.running && s.startedAt != null && s.startedAt + s.phaseLeft <= Date.now() && guard++ < 50) {
          const end = s.startedAt + s.phaseLeft;
          if (s.phase === "focus") {
            const sessions = s.sessions + 1;
            s = { ...s, acc: s.acc + s.phaseLeft, sessions, phase: "break", phaseLeft: sessions % 4 === 0 ? LONG : SHORT, startedAt: end };
          } else {
            s = { ...s, phase: "focus", phaseLeft: FOCUS, startedAt: end };
          }
          changed = true;
        }
        if (changed) { commit(s); beep(); }
      }
    }, 500);
    return () => clearInterval(iv);
  }, [key]);

  if (viewAs) return null;

  const seg = st.running && st.startedAt != null ? now - st.startedAt : 0;
  const focusMs = st.acc + (st.mode === "stopwatch" || st.phase === "focus" ? seg : 0);
  const left = st.phaseLeft - seg;
  const active = st.running || st.acc > 0;

  function paused(s: TimerState): TimerState {
    if (!s.running || s.startedAt == null) return s;
    const el = Date.now() - s.startedAt;
    return { ...s, running: false, startedAt: null, acc: s.acc + (s.mode === "stopwatch" || s.phase === "focus" ? el : 0), phaseLeft: s.phaseLeft - el };
  }
  function start() { setMsg(""); commit({ ...st, running: true, startedAt: Date.now() }); }
  function pause() { commit(paused(st)); }
  function reset() { commit(initial(st.mode)); setMsg(""); }
  function changeMode(m: Mode) { if (active) return; commit(initial(m)); setMsg(""); }

  async function stopSave() {
    const p = paused(stRef.current);
    const hours = Math.round((p.acc / 3600000) * 100) / 100;
    if (p.acc < 60000) { commit(initial(p.mode)); setMsg("Under 1 minute, so nothing was saved."); return; }
    setBusy(true);
    try {
      const date = todayKey();
      let all: Record<string, any> = {};
      try {
        const { data: d } = await supabase.from("daily_tracker").select("data").eq("user_id", uid).single();
        if (d?.data) all = d.data as any;
      } catch {}
      if (!Object.keys(all).length) { try { all = JSON.parse(localStorage.getItem(`hs_daily_${uid}`) || "{}"); } catch {} }
      const e = all[date] ?? blank(date);
      e.studyHours = Math.round(((e.studyHours ?? 0) + hours) * 100) / 100;
      all[date] = e;
      try { localStorage.setItem(`hs_daily_${uid}`, JSON.stringify(all)); } catch {}
      await saveDailyToDB(uid, all);
      commit(initial(p.mode));
      setMsg(`Saved ${hours}h to today's Daily Tracker (total ${e.studyHours}h).`);
    } catch {
      commit(p);
      setMsg("Couldn't save. Try again.");
    }
    setBusy(false);
  }

  const btn = (bg: string, color: string): React.CSSProperties => ({
    padding: "0.5rem 1rem", borderRadius: 10, border: "1px solid #E0D8CC", background: bg, color,
    fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
  });

  return (
    <div style={{ background: "#FDFBF7", border: "1px solid #E7DFD0", borderRadius: 16, padding: "1.25rem", marginTop: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#2D2A26" }}>⏱️ Study Timer</h3>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {(["stopwatch", "pomodoro"] as Mode[]).map((m) => (
            <button key={m} onClick={() => changeMode(m)} disabled={active && st.mode !== m}
              style={{ ...btn(st.mode === m ? "#2C4A73" : "#F4EFE6", st.mode === m ? "#fff" : "#3A3A3A"), padding: "0.3rem 0.7rem", fontSize: "0.72rem", opacity: active && st.mode !== m ? 0.5 : 1 }}>
              {m === "stopwatch" ? "Stopwatch" : "Pomodoro"}
            </button>
          ))}
        </div>
      </div>
      <div style={{ textAlign: "center", margin: "1rem 0 0.4rem" }}>
        {st.mode === "pomodoro" && (
          <p style={{ fontSize: "0.75rem", fontWeight: 700, margin: 0, color: st.phase === "focus" ? "#6E8B6B" : "#E07A28" }}>
            {st.phase === "focus" ? "FOCUS" : "BREAK"} · Session {st.sessions + (st.phase === "focus" ? 1 : 0)}
          </p>
        )}
        <p style={{ fontSize: "2.6rem", fontWeight: 700, margin: 0, color: "#2D2A26", fontVariantNumeric: "tabular-nums" }}>
          {st.mode === "stopwatch" ? fmt(focusMs) : fmt(left)}
        </p>
        {st.mode === "pomodoro" && (
          <p style={{ fontSize: "0.72rem", color: "#7A7267", margin: "0.2rem 0 0" }}>Focused so far: {fmt(focusMs)}</p>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        {!st.running && <button onClick={start} style={btn("#6E8B6B", "#fff")}>{active ? "Resume" : "Start"}</button>}
        {st.running && <button onClick={pause} style={btn("#E0B428", "#fff")}>Pause</button>}
        {active && <button onClick={stopSave} disabled={busy} style={btn("#2C4A73", "#fff")}>{busy ? "Saving…" : "Stop & save"}</button>}
        {active && <button onClick={reset} style={btn("#F4EFE6", "#3A3A3A")}>Reset</button>}
      </div>
      <p style={{ fontSize: "0.68rem", color: "#7A7267", textAlign: "center", margin: "0.6rem 0 0" }}>
        {msg || "Stop & save adds the focused time to today's study hours in the Daily Tracker."}
      </p>
    </div>
  );
}
