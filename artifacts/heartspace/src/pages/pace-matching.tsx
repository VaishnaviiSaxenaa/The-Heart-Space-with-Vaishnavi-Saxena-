import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { SYLLABUS } from "./syllabus";

const DARK = "#2D2A26", MUTED = "#7A7267", CARD = "#FDFBF7", BORDER = "#E7DFD0", CREAM = "#F7F2E9";
const OLIVE = "#6E8B6B", GOLD = "#E0B428", PURPLE = "#7B5EA7", FIRE = "#E07A28", BAD = "#B5533C";

const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shift = (k: string, n: number) => { const d = new Date(k + "T12:00:00"); d.setDate(d.getDate() + n); return keyOf(d); };

interface Row {
  id: string; name: string; exam: "JAM" | "NET";
  pct: number; done: number; total: number;
  hours14: number; days14: number; streak: number; attempts14: number; coverage: number | null;
  score: number; active: boolean;
}

function totalsFor(isJAM: boolean) {
  let n = 0;
  (SYLLABUS as any[])
    .filter((s) => !(s.netOnly && isJAM) && !(s.jamOnly && !isJAM))
    .forEach((s) => (s.topics ?? [])
      .filter((t: any) => !(t.netOnly && isJAM) && !(t.jamOnly && !isJAM))
      .forEach((t: any) => (t.subtopics ?? []).filter((st: any) => !(st.netOnly && isJAM)).forEach(() => { n++; })));
  return n;
}

export default function PaceMatching() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const [exam, setExam] = useState<"ALL" | "JAM" | "NET">("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pr, sy, da, pa, ca] = await Promise.all([
          supabase.from("profiles").select("id, full_name, email, role, exam_type, status"),
          supabase.from("syllabus_progress").select("user_id, data"),
          supabase.from("daily_tracker").select("user_id, data"),
          supabase.from("practice_progress").select("user_id, data"),
          supabase.from("roadmap_calendar").select("user_id, data"),
        ]);
        if (cancelled) return;
        if (pr.error) { setErr("Couldn't load students."); return; }
        const by = (r: any) => { const m: Record<string, any> = {}; (r.data ?? []).forEach((x: any) => { m[x.user_id] = x.data; }); return m; };
        const syM = by(sy), daM = by(da), paM = by(pa), caM = by(ca);
        const today = keyOf(new Date());
        const from = shift(today, -13);
        const totJ = totalsFor(true), totN = totalsFor(false);

        const out: Row[] = ((pr.data ?? []) as any[])
          .filter((p) => p.role !== "admin" && p.role !== "counsellor" && p.status !== "pending" && p.status !== "suspended")
          .map((p) => {
            const isJAM = p.exam_type !== "NET_GATE";
            const total = isJAM ? totJ : totN;
            const syl = syM[p.id] ?? {};
            const done = Object.values(syl).filter((v: any) => v?.status === "done").length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            const daily = daM[p.id] ?? {};
            let hours14 = 0, days14 = 0;
            for (let i = 0; i < 14; i++) {
              const h = Number(daily[shift(today, -i)]?.studyHours) || 0;
              hours14 += h; if (h > 0) days14++;
            }
            hours14 = Math.round(hours14 * 10) / 10;
            let streak = 0, c = (Number(daily[today]?.studyHours) || 0) > 0 ? today : shift(today, -1);
            while ((Number(daily[c]?.studyHours) || 0) > 0) { streak++; c = shift(c, -1); }
            let attempts14 = 0;
            Object.values(paM[p.id] ?? {}).forEach((en: any) => (en?.attempts ?? []).forEach((a: any) => {
              const d = a?.date ? String(a.date).slice(0, 10) : "";
              if (d >= from && d <= today) attempts14++;
            }));
            let planned = 0, covered = 0;
            Object.entries(caM[p.id] ?? {}).forEach(([d, es]: [string, any]) => (es ?? []).forEach((e: any) => {
              planned += e.hours ?? 0; if (d <= today) covered += e.hours ?? 0;
            }));
            const coverage = planned > 0 ? Math.round((covered / planned) * 100) : null;
            const score = Math.round(
              0.30 * Math.min(100, pct) +
              0.25 * Math.min(1, hours14 / 50) * 100 +
              0.15 * Math.min(1, attempts14 / 20) * 100 +
              0.20 * (days14 / 14) * 100 +
              0.10 * Math.min(100, coverage ?? 0));
            return {
              id: p.id, name: p.full_name || p.email || "Student", exam: isJAM ? "JAM" : "NET",
              pct, done, total, hours14, days14, streak, attempts14, coverage, score,
              active: hours14 > 0 || attempts14 > 0,
            } as Row;
          });
        setRows(out);
      } catch { if (!cancelled) setErr("Couldn't load data."); }
    })();
    return () => { cancelled = true; };
  }, []);

  const card: React.CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "1.1rem" };
  const chip = (t: string, color = PURPLE): JSX.Element => (
    <span key={t} style={{ fontSize: "0.66rem", fontWeight: 600, padding: "0.12rem 0.45rem", borderRadius: 99, background: "#F1ECF7", color }}>{t}</span>
  );
  const band = (s: number) => (s >= 60 ? { l: "Fast", c: OLIVE } : s >= 30 ? { l: "Steady", c: GOLD } : { l: "Building", c: FIRE });
  const member = (r: Row) => (
    <div key={r.id} style={{ padding: "0.6rem 0.7rem", borderRadius: 12, background: CREAM, border: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <a href={`/dashboard?viewAs=${r.id}`} style={{ fontSize: "0.85rem", fontWeight: 700, color: DARK, textDecoration: "none" }}>{r.name}</a>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: band(r.score).c }}>{band(r.score).l} · {r.score}</span>
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
        {[`${r.exam}`, `Syllabus ${r.pct}%`, `${r.hours14}h / 14d`, `${r.attempts14} attempts`, `${r.days14}/14 days`, `🔥 ${r.streak}d`, r.coverage == null ? "Coverage —" : `Coverage ${r.coverage}%`].map((t) => chip(t))}
      </div>
    </div>
  );

  if (err) return <div className="p-6" style={{ color: BAD }}>{err}</div>;
  if (!rows) return <div className="p-6" style={{ color: MUTED }}>Loading students…</div>;

  const q = search.trim().toLowerCase();
  const shown = rows.filter((r) => (exam === "ALL" || r.exam === exam) && (!q || r.name.toLowerCase().includes(q)));
  const activeRows = shown.filter((r) => r.active).sort((a, b) => b.score - a.score);
  const idle = shown.filter((r) => !r.active).sort((a, b) => a.name.localeCompare(b.name));

  const pairs: Row[][] = [];
  (["JAM", "NET"] as const).forEach((ex) => {
    const g = shown.slice().sort((x, y) => y.score - x.score).filter((r) => r.exam === ex);
    for (let i = 0; i < g.length; i += 2) {
      if (i + 1 >= g.length) {
        if (pairs.length && pairs[pairs.length - 1][0].exam === ex) pairs[pairs.length - 1].push(g[i]); else pairs.push([g[i]]);
      } else pairs.push([g[i], g[i + 1]]);
    }
  });

  return (
    <div className="min-h-screen p-6" style={{ background: CREAM }}>
      <div className="max-w-4xl mx-auto" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 700, color: DARK, margin: 0 }}>🤝 Pace Matching</h1>
          <p style={{ fontSize: "0.78rem", color: MUTED, margin: "0.2rem 0 0" }}>
            Students with the closest overall pace, paired within the same exam. Pace combines syllabus progress, study hours, practice, consistency and calendar coverage.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          {(["ALL", "JAM", "NET"] as const).map((e) => (
            <button key={e} onClick={() => setExam(e)} style={{ padding: "0.35rem 0.9rem", borderRadius: 99, border: `1px solid ${BORDER}`, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", background: exam === e ? DARK : CARD, color: exam === e ? "#fff" : DARK }}>
              {e === "ALL" ? "All" : e}
            </button>
          ))}
          <input placeholder="Search student…" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "0.35rem 0.7rem", borderRadius: 99, border: `1px solid ${BORDER}`, fontSize: "0.75rem", background: CARD, minWidth: 180 }} />
          <span style={{ fontSize: "0.72rem", color: MUTED }}>{activeRows.length} active · {idle.length} with no activity in 14 days</span>
        </div>

        <div style={card}>
          <p style={{ fontSize: "0.9rem", fontWeight: 700, color: DARK, margin: "0 0 0.7rem" }}>Suggested pairs</p>
          <p style={{ fontSize: "0.74rem", color: MUTED, margin: "0 0 0.8rem" }}>Pace bands (score out of 100): Fast 60+ · Steady 30–59 · Building below 30</p>
          <p style={{ fontSize: "0.74rem", color: MUTED, margin: "0 0 0.8rem" }}>Score = syllabus progress 30% (100% done = full) + study hours in 14 days 25% (50h = full) + consistency 20% (studied all 14 days = full) + practice attempts in 14 days 15% (20 = full) + calendar coverage 10%.</p>
          {pairs.length === 0 ? (
            <p style={{ fontSize: "0.78rem", color: MUTED, margin: 0 }}>Not enough active students to pair.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
              {pairs.map((p, i) => {
                const sc = p.map((r) => r.score);
                const gap = Math.max(...sc) - Math.min(...sc);
                return (
                  <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 14, padding: "0.7rem" }}>
                    <p style={{ fontSize: "0.7rem", fontWeight: 700, color: MUTED, margin: "0 0 0.4rem" }}>
                      {p.length > 2 ? "GROUP" : "PAIR"} {i + 1} · {p[0].exam} · pace gap {gap} point{gap === 1 ? "" : "s"}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>{p.map(member)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {idle.length > 0 && (
          <div style={card}>
            <p style={{ fontSize: "0.9rem", fontWeight: 700, color: DARK, margin: "0 0 0.5rem" }}>No activity in the last 14 days</p>
            <p style={{ fontSize: "0.72rem", color: MUTED, margin: "0 0 0.6rem" }}>Not paired, since there's no recent pace to match. These students may need a check-in.</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {idle.map((r) => (
                <a key={r.id} href={`/dashboard?viewAs=${r.id}`} style={{ fontSize: "0.74rem", padding: "0.25rem 0.6rem", borderRadius: 99, background: CREAM, border: `1px solid ${BORDER}`, color: DARK, textDecoration: "none" }}>
                  {r.name} · {r.exam}
                </a>
              ))}
            </div>
          </div>
        )}

        <div style={card}>
          <p style={{ fontSize: "0.9rem", fontWeight: 700, color: DARK, margin: "0 0 0.7rem" }}>All active students by pace</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {activeRows.map((r, i) => (
              <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ width: 26, fontSize: "0.72rem", fontWeight: 700, color: MUTED, paddingTop: 10 }}>{i + 1}</span>
                <div style={{ flex: 1 }}>{member(r)}</div>
              </div>
            ))}
          </div>
        </div>
        <p style={{ fontSize: "0.64rem", color: MUTED, margin: 0 }}>
          Pace score (0–100): syllabus progress 30%, study hours in 14 days 25% (50h = full), consistency 20%, practice attempts in 14 days 15% (20 = full), calendar coverage 10%.
        </p>
      </div>
    </div>
  );
}
