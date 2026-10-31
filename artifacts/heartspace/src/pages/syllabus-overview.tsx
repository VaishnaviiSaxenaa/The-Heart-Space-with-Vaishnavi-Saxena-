import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { SYLLABUS } from "./syllabus";

const DARK = "#2D2A26", MUTED = "#7A7267", CARD = "#FDFBF7", BORDER = "#E7DFD0", CREAM = "#F7F2E9";
const OLIVE = "#6E8B6B", GOLD = "#E0B428", BAD = "#B5533C", PURPLE = "#7B5EA7";

const JAM_MAP: Record<string, string> = { linear_algebra: "la", real_analysis: "ra", functions_of_one_variable: "fov", group_theory: "gt", multiple_variable_calculus: "mvc", ode: "ode", integration: "int", miscellaneous: "misc" };
const NET_MAP: Record<string, string> = { linear_algebra_net: "la", complex_analysis: "ca", real_analysis_net: "ra", differential_calculus_net: "dc", abstract_algebra: "aa", integral_equations: "ie", calculus_of_variations: "cv", ode_net: "ode", pde: "pde", numerical_analysis: "na" };
const JAM_H: Record<string, number> = { la: 70, ra: 70, fov: 50, gt: 50, mvc: 25, ode: 40, int: 30, misc: 25 };
const NET_H: Record<string, number> = { la: 80, ca: 80, ra: 80, dc: 60, aa: 60, ie: 40, cv: 40, ode: 40, pde: 40, na: 40 };
const RANK: Record<string, number> = { not_started: 0, in_progress: 1, done: 2 };

type Prog = Record<string, { status?: string; doneAt?: string }>;
interface Props {
  userId: string;
  examType: string;
  startDate: string;
  totalMonths: number;
  unavailablePeriods: { startDate: string; endDate: string }[];
}

const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const readJSON = (k: string): any => { try { return JSON.parse(localStorage.getItem(k) ?? "{}"); } catch { return {}; } };

export default function SyllabusOverview({ userId, examType, startDate, totalMonths, unavailablePeriods }: Props) {
  const [prog, setProg] = useState<Prog>(() => readJSON(`hs_topic_syllabus_${userId}`));
  const [cal, setCal] = useState<Record<string, any[]>>(() => readJSON(`hs_calendar_${userId}`));

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: d } = await supabase.from("syllabus_progress").select("data").eq("user_id", userId).single();
        if (cancelled) return;
        const remote = ((d?.data ?? {}) as Prog);
        const local = readJSON(`hs_topic_syllabus_${userId}`) as Prog;
        const synced = !!localStorage.getItem(`hs_topic_syllabus_synced_${userId}`);
        if (synced && Object.keys(remote).length) { setProg(remote); return; }
        const merged: Prog = { ...remote };
        Object.entries(local).forEach(([id, v]) => {
          const r = merged[id];
          if (!r || (RANK[v?.status ?? ""] ?? 0) > (RANK[r.status ?? ""] ?? 0)) merged[id] = v;
        });
        setProg(merged);
      } catch {}
    })();
    (async () => {
      try {
        const { data: d } = await supabase.from("roadmap_calendar").select("data").eq("user_id", userId).single();
        if (!cancelled && d?.data && Object.keys(d.data as object).length) setCal(d.data as any);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const isJAM = examType === "JAM";
  const map = isJAM ? JAM_MAP : NET_MAP;
  const hrs = isJAM ? JAM_H : NET_H;
  const todayKey = keyOf(new Date());

  const covered: Record<string, number> = {};
  Object.entries(cal).forEach(([day, entries]) => {
    if (day <= todayKey) (entries ?? []).forEach((e: any) => { covered[e.subjectId] = (covered[e.subjectId] ?? 0) + (e.hours ?? 0); });
  });

  const subjects = (SYLLABUS as any[])
    .filter((s) => !(s.netOnly && isJAM) && !(s.jamOnly && !isJAM))
    .map((s) => {
      const ids: string[] = [];
      (s.topics ?? [])
        .filter((t: any) => !(t.netOnly && isJAM) && !(t.jamOnly && !isJAM))
        .forEach((t: any) => (t.subtopics ?? []).filter((st: any) => !(st.netOnly && isJAM)).forEach((st: any) => ids.push(st.id)));
      const calId = map[s.id];
      return { id: s.id as string, name: s.name as string, calId, total: ids.length, done: ids.filter((id) => prog[id]?.status === "done").length, planned: hrs[calId] ?? 0, covered: Math.round((covered[calId] ?? 0) * 10) / 10 };
    });

  const totalSubs = subjects.reduce((t, s) => t + s.total, 0);
  const doneSubs = subjects.reduce((t, s) => t + s.done, 0);
  const pct = totalSubs ? Math.round((doneSubs / totalSubs) * 100) : 0;

  /* Projection */
  const start = new Date(startDate + "T12:00:00");
  const now = new Date();
  const target = new Date(start);
  target.setMonth(target.getMonth() + (totalMonths || 0));
  const unDays = unavailablePeriods.reduce((t, p) => t + Math.max(0, Math.round((new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / 86400000) + 1), 0);
  target.setDate(target.getDate() + unDays);
  let projText = "", statusText = "", statusColor = MUTED;
  if (start > now) {
    projText = "Your plan hasn't started yet.";
  } else if (doneSubs === 0) {
    projText = "Mark some subtopics done to see a projected finish date.";
  } else {
    const elapsed = Math.max(7, (now.getTime() - start.getTime()) / 86400000);
    const rate = doneSubs / elapsed;
    const daysLeft = (totalSubs - doneSubs) / rate;
    if (daysLeft > 3650) {
      projText = "More than 10 years at the current pace.";
      statusText = "Behind"; statusColor = BAD;
    } else {
      const proj = new Date(now.getTime() + daysLeft * 86400000);
      projText = fmtDate(proj);
      const diff = Math.round((proj.getTime() - target.getTime()) / 86400000);
      if (diff <= 0) { statusText = diff === 0 ? "On track" : `On track · ${Math.abs(diff)} days ahead`; statusColor = OLIVE; }
      else { statusText = diff > 14 ? `Behind by ${Math.round(diff / 7)} weeks` : `Behind by ${diff} days`; statusColor = BAD; }
    }
  }

  /* Next 7 days */
  const nameByCal: Record<string, string> = {};
  subjects.forEach((s) => { if (s.calId) nameByCal[s.calId] = s.name; });
  const week = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    const k = keyOf(d);
    const unavailable = unavailablePeriods.some((p) => p.startDate <= k && k <= p.endDate);
    const entries = (cal[k] ?? []) as any[];
    const by: Record<string, number> = {};
    entries.forEach((e) => { by[e.subjectId] = (by[e.subjectId] ?? 0) + (e.hours ?? 0); });
    return { k, label: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }), unavailable, items: Object.entries(by).map(([id, h]) => ({ name: nameByCal[id] ?? id, h })) };
  });

  const card: React.CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "1.25rem" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "0.75rem" }}>
        <div style={{ ...card, textAlign: "center" }}>
          <p style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0, color: PURPLE }}>{pct}%</p>
          <p style={{ fontSize: "0.78rem", fontWeight: 600, margin: "0.2rem 0 0", color: DARK }}>Syllabus complete</p>
          <p style={{ fontSize: "0.68rem", margin: "0.15rem 0 0", color: MUTED }}>{doneSubs} of {totalSubs} subtopics</p>
        </div>
        <div style={{ ...card, textAlign: "center" }}>
          <p style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: DARK }}>{fmtDate(target)}</p>
          <p style={{ fontSize: "0.78rem", fontWeight: 600, margin: "0.2rem 0 0", color: DARK }}>Target finish</p>
          <p style={{ fontSize: "0.68rem", margin: "0.15rem 0 0", color: MUTED }}>{totalMonths} months{unDays ? ` + ${unDays} unavailable days` : ""}</p>
        </div>
        <div style={{ ...card, textAlign: "center" }}>
          <p style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: DARK }}>{projText}</p>
          <p style={{ fontSize: "0.78rem", fontWeight: 600, margin: "0.2rem 0 0", color: DARK }}>Projected finish</p>
          {statusText && <p style={{ fontSize: "0.72rem", fontWeight: 700, margin: "0.15rem 0 0", color: statusColor }}>{statusText}</p>}
        </div>
      </div>

      <div style={card}>
        <p style={{ fontSize: "0.9rem", fontWeight: 700, margin: "0 0 0.8rem", color: DARK }}>Subject progress and hours</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
          {subjects.map((s) => {
            const p = s.total ? Math.round((s.done / s.total) * 100) : 0;
            const hp = s.planned ? Math.min(100, Math.round((s.covered / s.planned) * 100)) : 0;
            return (
              <div key={s.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: DARK, marginBottom: 3, gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                  <span style={{ color: MUTED }}>{s.done}/{s.total} topics · {s.covered}/{s.planned}h</span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: BORDER, overflow: "hidden", marginBottom: 3 }}>
                  <div style={{ width: `${p}%`, height: "100%", background: PURPLE, borderRadius: 99 }} />
                </div>
                <div style={{ height: 5, borderRadius: 99, background: BORDER, overflow: "hidden" }}>
                  <div style={{ width: `${hp}%`, height: "100%", background: GOLD, borderRadius: 99 }} />
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: "0.66rem", color: MUTED, margin: "0.7rem 0 0" }}>Purple bar: subtopics done. Gold bar: calendar hours covered so far.</p>
      </div>

      <div style={card}>
        <p style={{ fontSize: "0.9rem", fontWeight: 700, margin: "0 0 0.8rem", color: DARK }}>Next 7 days</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {week.map((d) => (
            <div key={d.k} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.5rem 0.7rem", borderRadius: 10, background: CREAM, border: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: "0.74rem", fontWeight: 700, color: DARK, width: 86, flexShrink: 0 }}>{d.label}</span>
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                {d.unavailable ? (
                  <span style={{ fontSize: "0.72rem", color: BAD, fontWeight: 600 }}>🚫 Unavailable</span>
                ) : d.items.length === 0 ? (
                  <span style={{ fontSize: "0.72rem", color: MUTED }}>Nothing planned</span>
                ) : (
                  d.items.map((it) => (
                    <span key={it.name} style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: 99, background: "#EFE8F7", color: PURPLE }}>
                      {it.name} · {Math.round(it.h * 10) / 10}h
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
