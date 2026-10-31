import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const DARK = "#2D2A26", MUTED = "#7A7267", CARD = "#FDFBF7", BORDER = "#E7DFD0", CREAM = "#F7F2E9";
const OLIVE = "#6E8B6B", GOLD = "#E0B428", PURPLE = "#7B5EA7", FIRE = "#E07A28";

const readJSON = (k: string): any => { try { return JSON.parse(localStorage.getItem(k) ?? "{}"); } catch { return {}; } };
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shift = (k: string, n: number) => { const d = new Date(k + "T12:00:00"); d.setDate(d.getDate() + n); return keyOf(d); };

export default function Achievements({ uid }: { uid: string }) {
  const viewAs = !!new URLSearchParams(window.location.search).get("viewAs");
  const [daily, setDaily] = useState<Record<string, any>>(() => readJSON(`hs_daily_${uid}`));
  const [syl, setSyl] = useState<Record<string, any>>(() => readJSON(`hs_topic_syllabus_${uid}`));
  const [prac, setPrac] = useState<Record<string, any>>(() => readJSON(`hs_practice_${uid}`));
  const [goal, setGoal] = useState<number>(() => { const g = readJSON(`hs_weekly_goal_${uid}`); return typeof g?.hours === "number" ? g.hours : 20; });
  const [goalInput, setGoalInput] = useState<string>("");
  const [showBadges, setShowBadges] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    const get = async (table: string) => {
      try {
        const { data: d } = await supabase.from(table).select("data").eq("user_id", uid).single();
        return d?.data ?? null;
      } catch { return null; }
    };
    (async () => {
      const [d, s, p] = await Promise.all([get("daily_tracker"), get("syllabus_progress"), get("practice_progress")]);
      if (cancelled) return;
      if (d) setDaily(d as any);
      if (s) setSyl(s as any);
      if (p) setPrac(p as any);
      try {
        const { data: g } = await supabase.from("calendar_pace").select("data").eq("user_id", uid).eq("namespace", "weekly_goal").single();
        if (!cancelled && typeof (g?.data as any)?.hours === "number") {
          setGoal((g!.data as any).hours);
          try { localStorage.setItem(`hs_weekly_goal_${uid}`, JSON.stringify(g!.data)); } catch {}
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [uid]);

  function saveGoal() {
    const n = Math.round(Number(goalInput) * 10) / 10;
    setGoalInput("");
    if (!n || n <= 0 || n > 120 || viewAs) return;
    setGoal(n);
    try { localStorage.setItem(`hs_weekly_goal_${uid}`, JSON.stringify({ hours: n })); } catch {}
    supabase.from("calendar_pace").upsert({ user_id: uid, namespace: "weekly_goal", data: { hours: n }, updated_at: new Date().toISOString() }, { onConflict: "user_id,namespace" }).then(() => {});
  }

  /* ── Streaks ── */
  const studyDays = Object.keys(daily).filter((d) => (Number(daily[d]?.studyHours) || 0) > 0).sort();
  const set = new Set(studyDays);
  const today = keyOf(new Date());
  let cur = 0;
  let cursor = set.has(today) ? today : shift(today, -1);
  while (set.has(cursor)) { cur++; cursor = shift(cursor, -1); }
  let best = 0, run = 0, prev = "";
  studyDays.forEach((d) => {
    run = prev && shift(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  });

  /* ── Totals ── */
  const totalHours = studyDays.reduce((t, d) => t + (Number(daily[d]?.studyHours) || 0), 0);
  const doneSubs = Object.values(syl).filter((v: any) => v?.status === "done").length;
  let attempts = 0, catMistakes = 0;
  Object.values(prac).forEach((en: any) => (en?.attempts ?? []).forEach((a: any) => {
    attempts++;
    catMistakes += (a?.mistakeCats ?? []).filter(Boolean).length;
  }));

  /* ── Points and level ── */
  const points = Math.round(totalHours * 10) + doneSubs * 5 + attempts * 3 + best * 2;
  const level = Math.floor(Math.sqrt(points / 50)) + 1;
  const base = 50 * (level - 1) * (level - 1);
  const next = 50 * level * level;
  const lvlPct = Math.min(100, Math.round(((points - base) / (next - base)) * 100));

  /* ── Weekly goal ── */
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  const monday = new Date(now); monday.setDate(now.getDate() - mondayOffset);
  let weekHours = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    weekHours += Number(daily[keyOf(d)]?.studyHours) || 0;
  }
  weekHours = Math.round(weekHours * 10) / 10;
  const goalPct = Math.min(100, Math.round((weekHours / goal) * 100));
  const R = 34, C = 2 * Math.PI * R;

  /* ── Badges ── */
  const badges = [
    { icon: "🌱", name: "First Step", desc: "Log study time once", earned: studyDays.length >= 1 },
    { icon: "🔥", name: "3-Day Streak", desc: "Study 3 days in a row", earned: best >= 3 },
    { icon: "⚡", name: "7-Day Streak", desc: "Study 7 days in a row", earned: best >= 7 },
    { icon: "🏔️", name: "30-Day Streak", desc: "Study 30 days in a row", earned: best >= 30 },
    { icon: "⏱️", name: "10 Hours", desc: "10 study hours logged", earned: totalHours >= 10 },
    { icon: "📚", name: "50 Hours", desc: "50 study hours logged", earned: totalHours >= 50 },
    { icon: "🎓", name: "100 Hours", desc: "100 study hours logged", earned: totalHours >= 100 },
    { icon: "✅", name: "First Subtopic", desc: "Mark a subtopic done", earned: doneSubs >= 1 },
    { icon: "🧩", name: "25 Subtopics", desc: "25 subtopics done", earned: doneSubs >= 25 },
    { icon: "🏆", name: "100 Subtopics", desc: "100 subtopics done", earned: doneSubs >= 100 },
    { icon: "✏️", name: "Practice Starter", desc: "Log a practice attempt", earned: attempts >= 1 },
    { icon: "🎯", name: "50 Attempts", desc: "50 practice attempts", earned: attempts >= 50 },
    { icon: "🔍", name: "Mistake Hunter", desc: "Tag 10 mistakes with a type", earned: catMistakes >= 10 },
    { icon: "🎯", name: "Goal Getter", desc: "Reach your weekly goal", earned: weekHours >= goal },
  ];
  const earnedCount = badges.filter((b) => b.earned).length;

  const card: React.CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "1.25rem", marginTop: "1rem" };

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: DARK }}>🏆 Achievements</h3>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "0.75rem", marginTop: "1rem" }}>
        <div style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.9rem" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: MUTED, margin: 0 }}>LEVEL</p>
          <p style={{ fontSize: "1.8rem", fontWeight: 700, color: PURPLE, margin: "0.1rem 0" }}>{level}</p>
          <div style={{ height: 8, borderRadius: 99, background: BORDER, overflow: "hidden" }}>
            <div style={{ width: `${lvlPct}%`, height: "100%", background: PURPLE }} />
          </div>
          <p style={{ fontSize: "0.68rem", color: MUTED, margin: "0.35rem 0 0" }}>{points} points · {next - points} to level {level + 1}</p>
        </div>

        <div style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.9rem" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: MUTED, margin: 0 }}>STUDY STREAK</p>
          <p style={{ fontSize: "1.8rem", fontWeight: 700, color: FIRE, margin: "0.1rem 0" }}>🔥 {cur}d</p>
          <p style={{ fontSize: "0.68rem", color: MUTED, margin: 0 }}>Best: {best} days</p>
          <p style={{ fontSize: "0.66rem", color: MUTED, margin: "0.35rem 0 0" }}>{cur === 0 ? "Log study time today to start a streak." : set.has(today) ? "Today counted." : "Log study time today to keep it going."}</p>
        </div>

        <div style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.9rem", display: "flex", gap: "0.8rem", alignItems: "center" }}>
          <svg width="84" height="84" viewBox="0 0 84 84" style={{ flexShrink: 0 }}>
            <circle cx="42" cy="42" r={R} fill="none" stroke={BORDER} strokeWidth="8" />
            <circle cx="42" cy="42" r={R} fill="none" stroke={goalPct >= 100 ? OLIVE : GOLD} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - goalPct / 100)} transform="rotate(-90 42 42)" />
            <text x="42" y="47" textAnchor="middle" fontSize="15" fontWeight="700" fill={DARK}>{goalPct}%</text>
          </svg>
          <div>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, color: MUTED, margin: 0 }}>WEEKLY GOAL</p>
            <p style={{ fontSize: "0.95rem", fontWeight: 700, color: DARK, margin: "0.1rem 0" }}>{weekHours} / {goal}h</p>
            {!viewAs && (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input
                  type="number" min={1} max={120} placeholder="Set goal"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveGoal(); }}
                  style={{ width: 70, padding: "0.2rem 0.4rem", fontSize: "0.7rem", borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD }}
                />
                <button onClick={saveGoal} style={{ fontSize: "0.68rem", fontWeight: 600, padding: "0.22rem 0.5rem", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#F4EFE6", color: DARK, cursor: "pointer" }}>Save</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowBadges((v) => !v)}
        style={{ marginTop: "1rem", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.8rem", borderRadius: 12, border: `1px solid ${BORDER}`, background: CREAM, color: DARK, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
      >
        <span>🏅 Badges · {earnedCount} of {badges.length} earned</span>
        <span>{showBadges ? "▲" : "▼"}</span>
      </button>
      {showBadges && (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))", gap: "0.5rem", marginTop: "0.75rem" }}>
        {badges.map((b) => (
          <div key={b.name} title={b.desc}
            style={{ textAlign: "center", padding: "0.6rem 0.3rem", borderRadius: 12, border: `1px solid ${b.earned ? OLIVE : BORDER}`, background: b.earned ? "#EEF3EC" : CREAM, opacity: b.earned ? 1 : 0.55 }}>
            <div style={{ fontSize: "1.4rem", filter: b.earned ? "none" : "grayscale(1)" }}>{b.earned ? b.icon : "🔒"}</div>
            <p style={{ fontSize: "0.68rem", fontWeight: 700, color: DARK, margin: "0.15rem 0 0" }}>{b.name}</p>
            <p style={{ fontSize: "0.58rem", color: MUTED, margin: "0.1rem 0 0" }}>{b.desc}</p>
          </div>
        ))}
      </div>
      )}
      <p style={{ fontSize: "0.62rem", color: MUTED, margin: "0.7rem 0 0" }}>
        Points: 10 per study hour, 5 per subtopic done, 3 per practice attempt, 2 per day of your best streak.
      </p>
    </div>
  );
}
