import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { format } from "date-fns";

const DARK    = "#3D2314";
const GOLD    = "#C9A96E";
const CREAM   = "#FAF7F2";
const CARD    = "#FFFFFF";
const BORDER  = "#E8DDD0";
const MUTED   = "#8C7B70";
const CHARCOAL = "#3D2314";
const OLIVE   = "#6E8B6B";

interface Student {
  id: string;
  full_name: string;
  email: string;
  role: string;
  plan: string;
  created_at: string;
}

interface StudentData {
  syllabus: Record<string, unknown>;
  practice: Record<string, unknown>;
  roadmap: Record<string, unknown>;
  scheduleInputs: Record<string, unknown>;
  topicSpeed: Record<string, unknown>;
  subjectOrder: string[];
  studyPeriods: unknown[];
  baseWeeks: Record<string, unknown>;
  daily: Record<string, unknown>;
  sessions: unknown[];
}

const EMPTY_DATA: StudentData = {
  syllabus: {}, practice: {}, roadmap: {}, scheduleInputs: {},
  topicSpeed: {}, subjectOrder: [], studyPeriods: [], baseWeeks: {}, daily: {}, sessions: [],
};

async function fetchStudentData(userId: string): Promise<StudentData> {
  const tables = [
    "syllabus_progress", "practice_progress", "roadmap_data",
    "schedule_inputs", "topic_speed", "subject_order",
    "study_periods", "base_weeks", "daily_tracker", "sessions_data",
  ];
  const results = await Promise.all(
    tables.map(t =>
      supabase.from(t).select("data").eq("user_id", userId).single()
        .then(r => r.data?.data ?? null)
    )
  );
  return {
    syllabus:       results[0] ?? {},
    practice:       results[1] ?? {},
    roadmap:        results[2] ?? {},
    scheduleInputs: results[3] ?? {},
    topicSpeed:     results[4] ?? {},
    subjectOrder:   results[5] ?? [],
    studyPeriods:   results[6] ?? [],
    baseWeeks:      results[7] ?? {},
    daily:          results[8] ?? {},
    sessions:       (results[9] ?? []) as unknown[],
  };
}

async function saveStudentData(
  userId: string,
  table: string,
  data: unknown
): Promise<void> {
  await supabase.from(table).upsert(
    { user_id: userId, data, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
}

/* ── Syllabus subject list ── */
const JAM_SUBJECTS = [
  { id: "linear_algebra",        name: "Linear Algebra" },
  { id: "real_analysis",         name: "Real Analysis" },
  { id: "differential_calculus", name: "Functions of One Variable" },
  { id: "abstract_algebra",      name: "Group Theory" },
  { id: "ode",                   name: "ODE" },
  { id: "mvc",                   name: "Multivariable Calculus" },
  { id: "mi",                    name: "Mathematical Intuition" },
];

/* ── Schedule inputs display ── */
function SchedulePanel({ data, onChange }: {
  data: Record<string, unknown>;
  onChange: (key: string, val: unknown) => void;
}) {
  const hrs = (data.hoursPerDay as number) ?? 2;
  const days = (data.daysPerWeek as number) ?? 5;
  const months = (data.targetMonths as number) ?? 12;
  const rev = (data.revisionPercent as number) ?? 30;

  return (
    <div className="space-y-3">
      {[
        { label: "Hours per day", key: "hoursPerDay", val: hrs, min: 1, max: 12 },
        { label: "Days per week", key: "daysPerWeek", val: days, min: 1, max: 7 },
        { label: "Target months", key: "targetMonths", val: months, min: 1, max: 36 },
        { label: "Revision %", key: "revisionPercent", val: rev, min: 25, max: 60 },
      ].map(({ label, key, val, min, max }) => (
        <div key={key} className="flex items-center gap-3">
          <span className="text-xs w-32" style={{ color: MUTED }}>{label}</span>
          <input type="number" min={min} max={max} value={val}
            onChange={e => onChange(key, parseFloat(e.target.value))}
            className="w-20 h-8 px-2 rounded-lg text-xs text-center border-2 outline-none"
            style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }} />
          <span className="text-xs" style={{ color: MUTED }}>
            {key === "hoursPerDay" ? "hrs" : key === "daysPerWeek" ? "days" : key === "targetMonths" ? "months" : "%"}
          </span>
        </div>
      ))}
      <p className="text-xs" style={{ color: OLIVE }}>
        Total: {hrs * days} hrs/week · {hrs * days * 4 * months} hrs over {months} months
      </p>
    </div>
  );
}

/* ── Syllabus progress display ── */
function SyllabusPanel({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-2">
      {JAM_SUBJECTS.map(subject => {
        const subData = (data[subject.id] as Record<string, unknown>) ?? {};
        const topics = Object.values(subData);
        const done = topics.filter((t: unknown) => (t as Record<string, unknown>)?.status === "done").length;
        const total = topics.length || 1;
        const pct = Math.round((done / total) * 100);
        return (
          <div key={subject.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
            style={{ background: CREAM, border: `1px solid ${BORDER}` }}>
            <span className="flex-1 text-xs font-medium" style={{ color: CHARCOAL }}>{subject.name}</span>
            <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: BORDER }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? OLIVE : GOLD }} />
            </div>
            <span className="text-xs w-8 text-right" style={{ color: MUTED }}>{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Practice progress display ── */
function PracticePanel({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-2">
      {JAM_SUBJECTS.map(subject => {
        const subData = (data[subject.id] as Record<string, unknown>) ?? {};
        const topics = Object.values(subData) as Record<string, unknown>[];
        const attempts = topics.flatMap(t => (t.attempts as unknown[]) ?? []);
        const totalQ = attempts.length;
        const correct = attempts.filter((a: unknown) => {
          const attempt = a as Record<string, unknown>;
          return (attempt.accuracy as number ?? 0) >= 50;
        }).length;
        const acc = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;
        return (
          <div key={subject.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
            style={{ background: CREAM, border: `1px solid ${BORDER}` }}>
            <span className="flex-1 text-xs font-medium" style={{ color: CHARCOAL }}>{subject.name}</span>
            <span className="text-xs" style={{ color: MUTED }}>{totalQ} attempts</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: acc >= 80 ? `${OLIVE}22` : `${GOLD}22`, color: acc >= 80 ? OLIVE : GOLD }}>
              {totalQ > 0 ? `${acc}%` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Counsellor Dashboard ── */
export default function CounsellorDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);
  const [studentData, setStudentData] = useState<StudentData>(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"schedule"|"syllabus"|"practice"|"daily"|"charts"|"sessions">("schedule");
  const [search, setSearch] = useState("");
  const [allPendingSessions, setAllPendingSessions] = useState<Array<{student: Student; session: Record<string,unknown>}>>([]);
  const [showPendingPanel, setShowPendingPanel] = useState(true);

  /* Load all students */
  useEffect(() => {
    supabase.from("profiles")
      .select("id, full_name, email, role, plan, created_at")
      .neq("role", "admin")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const studentsData = data as Student[];
        setStudents(studentsData);
        /* Fetch pending sessions for each student */
        studentsData.forEach(student => {
          supabase.from("sessions_data").select("data")
            .eq("user_id", student.id).single()
            .then(({ data: sd }) => {
              if (!sd?.data) return;
              const sessions = sd.data as Record<string,unknown>[];
              const pending = sessions.filter(s => s.status === "pending" || s.status === "requested" || s.status === "requested");
              if (pending.length > 0) {
                setAllPendingSessions(prev => {
                  const next = [...prev, ...pending.map(session => ({ student, session }))];
                  return next.sort((a, b) => String(b.session.requestedAt ?? "").localeCompare(String(a.session.requestedAt ?? "")));
                });
              }
            });
        });
      });
  }, []);

  /* Load selected student's data */
  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetchStudentData(selected.id)
      .then(setStudentData)
      .finally(() => setLoading(false));
  }, [selected]);

  async function handleScheduleSave(key: string, val: unknown) {
    if (!selected) return;
    const next = { ...studentData.scheduleInputs, [key]: val };
    setStudentData(d => ({ ...d, scheduleInputs: next }));
    setSaving(true);
    await saveStudentData(selected.id, "schedule_inputs", next);
    setSaving(false);
  }

  const filtered = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const planColor = (plan: string) =>
    plan === "zenith" ? GOLD : plan === "apex" ? OLIVE : MUTED;

  return (
    <div className="min-h-screen flex" style={{ background: CREAM }}>
      {/* LEFT — Student List */}
      <div className="w-72 flex-shrink-0 border-r flex flex-col" style={{ borderColor: BORDER, background: CARD }}>
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <h2 className="text-sm font-bold mb-3" style={{ color: DARK }}>All Students </h2>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full h-8 px-3 rounded-lg text-xs border-2 outline-none"
            style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }} />
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 && (
            <p className="text-xs text-center mt-8" style={{ color: MUTED }}>No students yet</p>
          )}
          {filtered.map(s => (
            <button key={s.id} type="button"
              onClick={() => setSelected(s)}
              className="w-full text-left p-3 rounded-xl transition-all"
              style={selected?.id === s.id
                ? { background: `${GOLD}15`, border: `2px solid ${GOLD}` }
                : { background: CREAM, border: `1px solid ${BORDER}` }}>
              <p className="text-xs font-semibold truncate" style={{ color: CHARCOAL }}>
                {s.full_name || s.email?.split("@")[0]}
              </p>
              <p className="text-[10px] truncate mt-0.5" style={{ color: MUTED }}>{s.email}</p>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1 inline-block"
                style={{ background: `${planColor(s.plan)}22`, color: planColor(s.plan) }}>
                {s.plan || s.role}
              </span>
            </button>
          ))}
        </div>
        <div className="p-3 border-t text-xs text-center" style={{ borderColor: BORDER, color: MUTED }}>
          {students.length} student{students.length !== 1 ? "s" : ""} registered
        </div>
      </div>

      {/* RIGHT — Student Dashboard */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Pending sessions notification */}
            {allPendingSessions.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: DARK }}>🔔 Pending Session Requests</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#E07070", color: "#fff" }}>
                      {allPendingSessions.length}
                    </span>
                  </div>
                  <button onClick={() => setShowPendingPanel(p => !p)} className="text-xs" style={{ color: MUTED }}>
                    {showPendingPanel ? "Hide" : "Show"}
                  </button>
                </div>
                {showPendingPanel && (
                  <div className="space-y-2">
                    {allPendingSessions.map(({ student, session }, idx) => (
                      <div key={idx} className="rounded-2xl p-4 cursor-pointer transition-all"
                        style={{ background: CARD, border: `2px solid ${GOLD}` }}
                        onClick={() => setSelected(student)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold" style={{ color: DARK }}>
                                {student.full_name || student.email?.split("@")[0]}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                style={{ background: `${GOLD}22`, color: GOLD }}>pending</span>
                            </div>
                            <p className="text-xs font-medium" style={{ color: CHARCOAL }}>
                              {session.topic as string || "Session Request"}
                            </p>
                            {session.preferredDate && (
                              <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                                📅 {session.preferredDate as string}
                                {session.preferredTime ? ` at ${session.preferredTime as string}` : ""}
                              </p>
                            )}
                            {(session.note || session.concern) && (
                              <p className="text-xs mt-0.5 italic" style={{ color: MUTED }}>
                                "{(session.note || session.concern) as string}"
                              </p>
                            )}
                          </div>
                          <span className="text-[10px]" style={{ color: MUTED }}>
                            {session.requestedAt ? new Date(session.requestedAt as string).toLocaleDateString() : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {allPendingSessions.length === 0 && (
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <div className="text-4xl mb-3">👤</div>
                  <p className="text-sm font-semibold" style={{ color: CHARCOAL }}>Select a student</p>
                  <p className="text-xs mt-1" style={{ color: MUTED }}>Click any student on the left to view their dashboard</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: BORDER, background: CARD }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: DARK }}>
                  {selected.full_name || selected.email?.split("@")[0]}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                  {selected.email} · {selected.plan || selected.role} ·
                  Joined {selected.created_at ? format(new Date(selected.created_at), "MMM d, yyyy") : "—"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {saving && <span className="text-xs" style={{ color: OLIVE }}>Saving…</span>}
                {loading && <span className="text-xs" style={{ color: MUTED }}>Loading…</span>}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b px-6" style={{ borderColor: BORDER, background: CARD }}>
              {([
                { key: "schedule", label: "📅 Schedule" },
                { key: "syllabus", label: "📚 Syllabus" },
                { key: "practice", label: "✏️ Practice" },
                { key: "daily",    label: "📓 Daily" },
                { key: "charts",   label: "📊 Progress" },
                { key: "sessions", label: "📋 Sessions" },
              ] as const).map(tab => (
                <button key={tab.key} type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className="px-4 py-3 text-xs font-semibold border-b-2 transition-all"
                  style={activeTab === tab.key
                    ? { borderColor: GOLD, color: DARK }
                    : { borderColor: "transparent", color: MUTED }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <p className="text-sm" style={{ color: MUTED }}>Loading student data…</p>
                </div>
              ) : (
                <>
                  {activeTab === "schedule" && (
                    <div className="max-w-lg space-y-6">
                      <div>
                        <h3 className="text-sm font-bold mb-4" style={{ color: DARK }}>Schedule Settings</h3>
                        <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                          <SchedulePanel
                            data={studentData.scheduleInputs}
                            onChange={handleScheduleSave}
                          />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold mb-3" style={{ color: DARK }}>Topic Learning Speed</h3>
                        <div className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                          {JAM_SUBJECTS.map(s => {
                            const speed = (studentData.topicSpeed as Record<string, string>)[s.id] ?? "first_normal";
                            return (
                              <div key={s.id} className="flex items-center gap-3 mb-2">
                                <span className="flex-1 text-xs" style={{ color: CHARCOAL }}>{s.name}</span>
                                <select value={speed}
                                  onChange={async e => {
                                    if (!selected) return;
                                    const next = { ...studentData.topicSpeed as Record<string, string>, [s.id]: e.target.value };
                                    setStudentData(d => ({ ...d, topicSpeed: next }));
                                    setSaving(true);
                                    await saveStudentData(selected.id, "topic_speed", next);
                                    setSaving(false);
                                  }}
                                  className="h-7 px-2 rounded-lg text-xs border outline-none"
                                  style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }}>
                                  <option value="first_slow">1st time — Slow (×1.3)</option>
                                  <option value="first_normal">1st time — Normal (×1.0)</option>
                                  <option value="first_fast">1st time — Fast (×0.8)</option>
                                  <option value="second_slow">2nd time — Slow (×1.0)</option>
                                  <option value="second_normal">2nd time — Normal (×0.67)</option>
                                  <option value="second_fast">2nd time — Fast (×0.5)</option>
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold mb-3" style={{ color: DARK }}>Subject Study Order</h3>
                        <div className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                          {(studentData.subjectOrder.length > 0 ? studentData.subjectOrder : JAM_SUBJECTS.map(s => s.id)).map((id, idx) => {
                            const subject = JAM_SUBJECTS.find(s => s.id === id);
                            if (!subject) return null;
                            return (
                              <div key={id} className="flex items-center gap-3 px-3 py-2 rounded-xl mb-1.5"
                                style={{ background: CREAM, border: `1px solid ${BORDER}` }}>
                                <span className="text-xs font-bold w-5" style={{ color: MUTED }}>{idx + 1}</span>
                                <span className="flex-1 text-xs font-medium" style={{ color: CHARCOAL }}>{subject.name}</span>
                                <div className="flex gap-1">
                                  <button type="button" disabled={idx === 0}
                                    onClick={async () => {
                                      if (!selected) return;
                                      const order = studentData.subjectOrder.length > 0 ? [...studentData.subjectOrder] : JAM_SUBJECTS.map(s => s.id);
                                      [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
                                      setStudentData(d => ({ ...d, subjectOrder: order }));
                                      setSaving(true);
                                      await saveStudentData(selected.id, "subject_order", order);
                                      setSaving(false);
                                    }}
                                    className="w-6 h-6 rounded text-xs disabled:opacity-30"
                                    style={{ background: BORDER, color: CHARCOAL }}>↑</button>
                                  <button type="button" disabled={idx === JAM_SUBJECTS.length - 1}
                                    onClick={async () => {
                                      if (!selected) return;
                                      const order = studentData.subjectOrder.length > 0 ? [...studentData.subjectOrder] : JAM_SUBJECTS.map(s => s.id);
                                      [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
                                      setStudentData(d => ({ ...d, subjectOrder: order }));
                                      setSaving(true);
                                      await saveStudentData(selected.id, "subject_order", order);
                                      setSaving(false);
                                    }}
                                    className="w-6 h-6 rounded text-xs disabled:opacity-30"
                                    style={{ background: BORDER, color: CHARCOAL }}>↓</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "syllabus" && (
                    <div className="max-w-lg">
                      <h3 className="text-sm font-bold mb-4" style={{ color: DARK }}>Syllabus Progress</h3>
                      <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                        <SyllabusPanel data={studentData.syllabus as Record<string, unknown>} />
                      </div>
                    </div>
                  )}

                  {activeTab === "practice" && (
                    <div className="max-w-lg">
                      <h3 className="text-sm font-bold mb-4" style={{ color: DARK }}>Question Practice</h3>
                      <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                        <PracticePanel data={studentData.practice as Record<string, unknown>} />
                      </div>
                    </div>
                  )}

                  {activeTab === 'daily' && (
                    <div className='max-w-2xl'>
                      <h3 className='text-sm font-bold mb-4' style={{ color: DARK }}>Daily Tracker History</h3>
                      {Object.keys(studentData.daily).length === 0 ? (
                        <p className='text-xs' style={{ color: MUTED }}>No daily entries yet.</p>
                      ) : (
                        <div className='space-y-3'>
                          {Object.entries(studentData.daily)
                            .sort(([a], [b]) => b.localeCompare(a))
                            .slice(0, 30)
                            .map(([date, entry]) => {
                              const e = entry as Record<string, unknown>;
                              return (
                                <div key={date} className='rounded-2xl p-4' style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                                  <div className='flex items-center justify-between mb-2'>
                                    <p className='text-xs font-bold' style={{ color: DARK }}>{date}</p>
                                    <div className='flex gap-3'>
                                      {e.mood != null && <span className='text-xs' style={{ color: GOLD }}>Mood: {e.mood as number}/5</span>}
                                      {e.studyHours != null && <span className='text-xs' style={{ color: OLIVE }}>Study: {e.studyHours as number}h</span>}
                                      {e.stressLevel != null && <span className='text-xs' style={{ color: MUTED }}>Stress: {e.stressLevel as number}/5</span>}
                                    </div>
                                  </div>
                                  {e.note && <p className='text-xs italic' style={{ color: MUTED }}>&#34;{e.note as string}&#34;</p>}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'charts' && (
                    <div className='max-w-2xl space-y-6'>
                      <h3 className='text-sm font-bold mb-4' style={{ color: DARK }}>Progress Overview</h3>
                      <div className='rounded-2xl p-5' style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                        <p className='text-xs font-bold mb-3' style={{ color: DARK }}>Syllabus Completion</p>
                        {JAM_SUBJECTS.map(subject => {
                          const subData = (studentData.syllabus[subject.id] as Record<string, unknown>) ?? {};
                          const topics = Object.values(subData);
                          const done = topics.filter((t: unknown) => (t as Record<string, unknown>)?.status === 'done').length;
                          const total = topics.length || 1;
                          const pct = Math.round((done / total) * 100);
                          return (
                            <div key={subject.id} className='mb-3'>
                              <div className='flex justify-between mb-1'>
                                <span className='text-xs' style={{ color: CHARCOAL }}>{subject.name}</span>
                                <span className='text-xs font-semibold' style={{ color: pct === 100 ? OLIVE : GOLD }}>{pct}%</span>
                              </div>
                              <div className='w-full h-2 rounded-full overflow-hidden' style={{ background: BORDER }}>
                                <div className='h-full rounded-full' style={{ width: `${pct}%`, background: pct === 100 ? OLIVE : GOLD }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className='rounded-2xl p-5' style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                        <p className='text-xs font-bold mb-3' style={{ color: DARK }}>Last 14 Days — Mood and Study Hours</p>
                        {Object.keys(studentData.daily).length === 0 ? (
                          <p className='text-xs' style={{ color: MUTED }}>No daily data yet.</p>
                        ) : (
                          <div className='flex items-end gap-1 h-28'>
                            {Object.entries(studentData.daily)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .slice(-14)
                              .map(([date, entry]) => {
                                const e = entry as Record<string, unknown>;
                                const mood = ((e.mood as number) ?? 0) / 5;
                                const study = Math.min(((e.studyHours as number) ?? 0) / 10, 1);
                                return (
                                  <div key={date} className='flex-1 flex flex-col items-center gap-0.5'>
                                    <div className='w-full rounded-t' style={{ height: `${study * 70}px`, background: `${GOLD}99`, minHeight: 2 }} />
                                    <div className='w-full rounded-t' style={{ height: `${mood * 35}px`, background: `${OLIVE}99`, minHeight: 2 }} />
                                    <span className='text-[8px]' style={{ color: MUTED }}>{date.slice(5)}</span>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                        <div className='flex gap-4 mt-2'>
                          <span className='text-[10px] flex items-center gap-1'><span className='w-3 h-2 rounded inline-block' style={{ background: `${GOLD}99` }} /> Study hrs</span>
                          <span className='text-[10px] flex items-center gap-1'><span className='w-3 h-2 rounded inline-block' style={{ background: `${OLIVE}99` }} /> Mood</span>
                        </div>
                      </div>
                      <div className='rounded-2xl p-5' style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                        <p className='text-xs font-bold mb-3' style={{ color: DARK }}>Practice Accuracy</p>
                        <PracticePanel data={studentData.practice as Record<string, unknown>} />
                      </div>
                    </div>
                  )}

                  {activeTab === 'sessions' && (
                    <div className='max-w-2xl'>
                      <h3 className='text-sm font-bold mb-4' style={{ color: DARK }}>Session Requests — Sagar Sir</h3>
                      {studentData.sessions.length === 0 ? (
                        <div className='rounded-2xl p-5 text-center' style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                          <p className='text-xs' style={{ color: MUTED }}>No session requests yet.</p>
                        </div>
                      ) : (
                        <div className='space-y-3'>
                          {(studentData.sessions as Array<Record<string,unknown>>)
                            .sort((a, b) => String(b.requestedAt ?? '').localeCompare(String(a.requestedAt ?? '')))
                            .map((session, idx) => {
                              const status = session.status as string;
                              const statusColor = status === 'approved' ? OLIVE : status === 'rejected' ? '#C0392B' : GOLD;
                              const statusBg = status === 'approved' ? `${OLIVE}22` : status === 'rejected' ? '#C0392B22' : `${GOLD}22`;
                              return (
                                <div key={idx} className='rounded-2xl p-4' style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                                  <div className='flex items-start justify-between gap-3'>
                                    <div className='flex-1'>
                                      <div className='flex items-center gap-2 mb-1'>
                                        <span className='text-xs font-bold' style={{ color: DARK }}>
                                          {session.topic as string || session.concern as string || 'Session Request'}
                                        </span>
                                        <span className='text-[10px] px-2 py-0.5 rounded-full font-semibold'
                                          style={{ background: statusBg, color: statusColor }}>
                                          {status}
                                        </span>
                                      </div>
                                      {session.preferredDate && (
                                        <p className='text-xs' style={{ color: MUTED }}>
                                          📅 Preferred: {session.preferredDate as string}
                                          {session.preferredTime ? ` at ${session.preferredTime as string}` : ''}
                                        </p>
                                      )}
                                      {(session.note || session.concern) && (
                                        <p className='text-xs mt-1 italic' style={{ color: MUTED }}>
                                          &#34;{session.note as string}&#34;
                                        </p>
                                      )}
                                      {session.requestedAt && (
                                        <p className='text-[10px] mt-1' style={{ color: MUTED }}>
                                          Requested: {new Date(session.requestedAt as string).toLocaleDateString()}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                      <div className='mt-4 p-3 rounded-xl' style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}33` }}>
                        <p className='text-xs font-semibold' style={{ color: DARK }}>
                          Total: {studentData.sessions.length} request{studentData.sessions.length !== 1 ? 's' : ''}
                          {' · '}
                          {(studentData.sessions as Array<Record<string,unknown>>).filter(s => s.status === 'pending' || status === 'requested').length} pending
                          {' · '}
                          {(studentData.sessions as Array<Record<string,unknown>>).filter(s => s.status === 'approved').length} approved
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
// force redeploy Sat May 30 09:02:57 UTC 2026
