import { useState, useEffect, useMemo } from "react";
import {
  format,
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  parseISO,
} from "date-fns";
import {
  loadGenericCalendar,
  loadGenericCalendarFromDB,
  saveGenericCalendar,
  calendarKey,
  type GenericSubjectDef,
  type CalendarData,
  type DayEntry,
} from "./generic-calendar";

/* ============================================================
   COLORS
============================================================ */
const CREAM = "#F8F5F0";
const CARD = "#FFFDF9";
const CHARCOAL = "#2D2A25";
const GOLD = "#C9A84C";
const MUTED = "#7A7267";
const BORDER = "#E5DDD0";

type SourceType = "study" | "revision" | "practice";

const TYPE_CONFIG: Record<
  SourceType,
  { label: string; color: string; emoji: string }
> = {
  study: { label: "Study", color: "#2C4A73", emoji: "📖" },
  revision: { label: "Revision", color: "#E07A28", emoji: "🔁" },
  practice: { label: "Practice", color: "#2E7D52", emoji: "✏️" },
};

/* roadmap.tsx uses namespace key "study" via hs_calendar_${uid} (legacy key from before
   generic-calendar existed). We bridge that here. */
function loadStudyCalendar(uid: string): CalendarData {
  try {
    const r = localStorage.getItem(`hs_calendar_${uid}`);
    return r ? JSON.parse(r) : {};
  } catch {
    return {};
  }
}
function saveStudyCalendar(uid: string, data: CalendarData) {
  try {
    localStorage.setItem(`hs_calendar_${uid}`, JSON.stringify(data));
  } catch {}
}

interface MergedEntry extends DayEntry {
  type: SourceType;
}
type MergedCalendarData = Record<string, MergedEntry[]>;

interface DashboardCalendarProps {
  uid: string;
  studySubjects: GenericSubjectDef[];
  revisionSubjects: GenericSubjectDef[];
  practiceSubjects: GenericSubjectDef[];
}

export default function DashboardCalendar({
  uid,
  studySubjects,
  revisionSubjects,
  practiceSubjects,
}: DashboardCalendarProps) {
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(new Date());
  const [studyCal, setStudyCal] = useState<CalendarData>({});
  const [revisionCal, setRevisionCal] = useState<CalendarData>({});
  const [practiceCal, setPracticeCal] = useState<CalendarData>({});
  const [loaded, setLoaded] = useState(false);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [addType, setAddType] = useState<SourceType>("study");
  const [customTaskName, setCustomTaskName] = useState("");
  const [customTaskCat, setCustomTaskCat] = useState("Study");
  const [taskRefresh, setTaskRefresh] = useState(0);

  useEffect(() => {
    if (!uid) return;
    setStudyCal(loadStudyCalendar(uid));
    setRevisionCal(loadGenericCalendar("revision", uid));
    setPracticeCal(loadGenericCalendar("practice", uid));
    setLoaded(true);
    let cancelled = false;
    (async () => {
      const [rev, prac] = await Promise.all([
        loadGenericCalendarFromDB("revision", uid),
        loadGenericCalendarFromDB("practice", uid),
      ]);
      if (cancelled) return;
      if (rev && Object.keys(rev).length > 0) {
        setRevisionCal(rev);
        try { localStorage.setItem(calendarKey("revision", uid), JSON.stringify(rev)); } catch {}
      }
      if (prac && Object.keys(prac).length > 0) {
        setPracticeCal(prac);
        try { localStorage.setItem(calendarKey("practice", uid), JSON.stringify(prac)); } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  // Load today's plan tasks from localStorage
  const todayTasks = useMemo(() => {
    try {
      const todayLocal = new Date();
      const todayKey = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth()+1).padStart(2,'0')}-${String(todayLocal.getDate()).padStart(2,'0')}`;
      const raw = localStorage.getItem(`heartspace_today_plan_${uid}`);
      const parsed = raw ? JSON.parse(raw) : { date: todayKey, tasks: [] };
      const planTasks = parsed.date === todayKey ? (parsed.tasks ?? []) : [];
      return planTasks;
    } catch { return []; }
  }, [taskRefresh]);

  // Get custom tasks for any date
  function getCustomTasksForDate(dateKey: string): Array<{id:string;name:string;category:string;done:boolean}> {
    try {
      const raw = localStorage.getItem(`heartspace_custom_tasks_${uid}_${dateKey}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  const CAT_COLORS: Record<string, string> = {
    Study: "#2C4A73", Revision: "#E07A28", Practice: "#E0B428",
    Physical: "#6E8B6B", Personal: "#9B7BB0",
  };

  function subjectsFor(type: SourceType): GenericSubjectDef[] {
    if (type === "study") return studySubjects;
    if (type === "revision") return revisionSubjects;
    return practiceSubjects;
  }

  function calFor(type: SourceType): CalendarData {
    if (type === "study") return studyCal;
    if (type === "revision") return revisionCal;
    return practiceCal;
  }

  function persistType(type: SourceType, next: CalendarData) {
    if (type === "study") {
      setStudyCal(next);
      saveStudyCalendar(uid, next);
    } else if (type === "revision") {
      setRevisionCal(next);
      saveGenericCalendar("revision", uid, next);
    } else {
      setPracticeCal(next);
      saveGenericCalendar("practice", uid, next);
    }
  }

  function getConsumed(
    type: SourceType,
    subjectId: string,
    excludeDayKey?: string,
    excludeIdx?: number,
  ): number {
    let total = 0;
    Object.entries(calFor(type)).forEach(([dayKey, entries]) => {
      entries.forEach((e, i) => {
        if (e.subjectId !== subjectId) return;
        if (dayKey === excludeDayKey && i === excludeIdx) return;
        total += e.hours;
      });
    });
    return total;
  }

  function addEntry(
    dayKey: string,
    type: SourceType,
    subjectId: string,
    hours: number,
  ) {
    const subj = subjectsFor(type).find((s) => s.id === subjectId);
    const cap = subj?.totalHours ?? Infinity;
    const consumed = getConsumed(type, subjectId);
    const remaining = Math.max(0, cap - consumed);
    if (remaining <= 0) {
      alert(
        `This subject's ${Math.round(cap * 10) / 10}h ${TYPE_CONFIG[type].label.toLowerCase()} total is already fully scheduled.`,
      );
      return;
    }
    const allowed = Math.min(hours, remaining);
    const cal = calFor(type);
    const next = { ...cal };
    const existing = next[dayKey] ?? [];
    next[dayKey] = [...existing, { subjectId, hours: allowed }];
    persistType(type, next);
  }

  function updateEntry(
    dayKey: string,
    type: SourceType,
    idx: number,
    hours: number,
  ) {
    const cal = calFor(type);
    const next = { ...cal };
    const entries = [...(next[dayKey] ?? [])];
    const subjectId = entries[idx]?.subjectId;
    if (hours <= 0) {
      entries.splice(idx, 1);
    } else {
      const subj = subjectsFor(type).find((s) => s.id === subjectId);
      const cap = subj?.totalHours ?? Infinity;
      const consumedElsewhere = getConsumed(type, subjectId, dayKey, idx);
      const remaining = Math.max(0, cap - consumedElsewhere);
      const allowed = Math.min(hours, remaining);
      entries[idx] = { ...entries[idx], hours: allowed };
    }
    next[dayKey] = entries;
    if (entries.length === 0) delete next[dayKey];
    persistType(type, next);
  }

  function removeEntry(dayKey: string, type: SourceType, idx: number) {
    const cal = calFor(type);
    const next = { ...cal };
    const entries = [...(next[dayKey] ?? [])];
    entries.splice(idx, 1);
    next[dayKey] = entries;
    if (entries.length === 0) delete next[dayKey];
    persistType(type, next);
  }

  /* Merge all 3 calendars into one structure for display */
  const merged: MergedCalendarData = useMemo(() => {
    const result: MergedCalendarData = {};
    const sources: [SourceType, CalendarData][] = [
      ["study", studyCal],
      ["revision", revisionCal],
      ["practice", practiceCal],
    ];
    sources.forEach(([type, cal]) => {
      Object.entries(cal).forEach(([dayKey, entries]) => {
        if (!result[dayKey]) result[dayKey] = [];
        entries.forEach((e) => result[dayKey].push({ ...e, type }));
      });
    });
    return result;
  }, [studyCal, revisionCal, practiceCal]);

  const days = useMemo(() => {
    if (view === "month") {
      const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
      const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
      return eachDayOfInterval({ start: gridStart, end: gridEnd });
    }
    const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });
    return eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(cursor, { weekStartsOn: 1 }),
    });
  }, [view, cursor]);

  function navigate(dir: 1 | -1) {
    setCursor((prev) =>
      view === "month" ? addMonths(prev, dir) : addDays(prev, dir * 7),
    );
  }

  if (!loaded) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: MUTED }}>
        Loading...
      </div>
    );
  }

  const editingEntries = editingDay ? (merged[editingDay] ?? []) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.6rem",
        }}
      >
        <h3
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: CHARCOAL,
            margin: 0,
          }}
        >
          🗓️ Combined Calendar
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "0.35rem 0.6rem",
              cursor: "pointer",
            }}
          >
            ←
          </button>
          <span
            style={{
              fontWeight: 600,
              color: CHARCOAL,
              fontSize: "0.85rem",
              minWidth: 130,
              textAlign: "center",
            }}
          >
            {view === "month"
              ? format(cursor, "MMMM yyyy")
              : `${format(startOfWeek(cursor, { weekStartsOn: 1 }), "MMM d")} – ${format(endOfWeek(cursor, { weekStartsOn: 1 }), "MMM d")}`}
          </span>
          <button
            onClick={() => navigate(1)}
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "0.35rem 0.6rem",
              cursor: "pointer",
            }}
          >
            →
          </button>
          <button
            onClick={() => setView(view === "month" ? "week" : "month")}
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "0.35rem 0.7rem",
              cursor: "pointer",
              fontSize: "0.78rem",
              fontWeight: 600,
              color: MUTED,
            }}
          >
            {view === "month" ? "Week view" : "Month view"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        {(Object.keys(TYPE_CONFIG) as SourceType[]).map((t) => (
          <div
            key={t}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "0.75rem",
              color: MUTED,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: TYPE_CONFIG[t].color,
              }}
            />
            {TYPE_CONFIG[t].emoji} {TYPE_CONFIG[t].label}
          </div>
        ))}
      </div>

      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          overflowX: "auto",
          overflowY: "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            borderBottom: `1px solid ${BORDER}`,
            minWidth: 640,
          }}
        >
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div
              key={d}
              style={{
                textAlign: "center",
                padding: "0.4rem",
                fontSize: "0.68rem",
                fontWeight: 700,
                color: MUTED,
              }}
            >
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", minWidth: 640 }}>
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const entries = merged[key] ?? [];
            const inMonth = view === "week" || isSameMonth(day, cursor);
            const today = isToday(day);
            return (
              <div
                key={key}
                onClick={() => setEditingDay(key)}
                style={{
                  minHeight: view === "month" ? 80 : 130,
                  borderRight: `1px solid ${BORDER}`,
                  borderBottom: `1px solid ${BORDER}`,
                  padding: "0.3rem",
                  background: today ? "#FFFBEF" : inMonth ? CARD : CREAM,
                  opacity: inMonth ? 1 : 0.4,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: today ? 800 : 600,
                    color: today ? GOLD : CHARCOAL,
                  }}
                >
                  {format(day, "d")}
                </span>
                {(() => {
                  const cellTasks = today ? todayTasks : getCustomTasksForDate(key);
                  if (cellTasks.length === 0) return null;
                  return (
                    <div style={{ marginTop: 2, marginBottom: 2 }}>
                      {cellTasks.slice(0, view === "month" ? 2 : 5).map((t: any, i: number) => (
                        <div key={i} style={{
                          fontSize: "0.6rem",
                          padding: "1px 4px",
                          borderRadius: 4,
                          marginBottom: 1,
                          background: `${CAT_COLORS[t.category] ?? "#9B7BB0"}22`,
                          color: CAT_COLORS[t.category] ?? "#9B7BB0",
                          fontWeight: 600,
                          textDecoration: t.done ? "line-through" : "none",
                          opacity: t.done ? 0.6 : 1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {t.done ? "✓ " : ""}{t.name}
                        </div>
                      ))}
                      {cellTasks.length > (view === "month" ? 2 : 5) && (
                        <div style={{ fontSize: "0.55rem", color: MUTED }}>
                          +{cellTasks.length - (view === "month" ? 2 : 5)} more
                        </div>
                      )}
                    </div>
                  );
                })()}
                {(() => {
                  let doneList: string[] = [];
                  try { doneList = JSON.parse(localStorage.getItem(`hs_cal_done_${uid}_${key}`) ?? "[]"); } catch {}
                  const typeCounters: Record<string, number> = {};
                  return entries.slice(0, view === "month" ? 3 : 7).map((e, i) => {
                    const subj = subjectsFor(e.type).find(
                      (s) => s.id === e.subjectId,
                    );
                    const color = TYPE_CONFIG[e.type].color;
                    const idxWithinType = typeCounters[e.type] ?? 0;
                    typeCounters[e.type] = idxWithinType + 1;
                    const entryKey = `${e.type}-${e.subjectId}-${idxWithinType}`;
                    const isDone = doneList.includes(entryKey);
                    return (
                      <div
                        key={i}
                        style={{
                          fontSize: "0.58rem",
                          fontWeight: 600,
                          color: "#fff",
                          background: isDone ? "#9B9689" : color,
                          opacity: isDone ? 0.6 : 1,
                          borderRadius: 4,
                          padding: "0.05rem 0.3rem",
                          marginTop: "0.12rem",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textDecoration: isDone ? "line-through" : "none",
                        }}
                      >
                        {isDone ? "✓" : TYPE_CONFIG[e.type].emoji} {subj?.name ?? e.subjectId} ·{" "}
                        {e.hours}h
                      </div>
                    );
                  });
                })()}
                {entries.length > (view === "month" ? 3 : 7) && (
                  <span style={{ fontSize: "0.56rem", color: MUTED }}>
                    +{entries.length - (view === "month" ? 3 : 7)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {editingDay && (
        <div
          onClick={() => setEditingDay(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: CARD,
              borderRadius: 16,
              padding: "1.25rem",
              width: 400,
              maxWidth: "90vw",
              maxHeight: "78vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.8rem",
              }}
            >
              <h4
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: CHARCOAL,
                  margin: 0,
                }}
              >
                {format(parseISO(editingDay), "EEEE, MMM d")}
              </h4>
              <button
                onClick={() => setEditingDay(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1rem",
                  color: MUTED,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
                marginBottom: "1rem",
              }}
            >
              {editingEntries.length === 0 && (
                <p
                  style={{
                    color: MUTED,
                    fontSize: "0.8rem",
                    textAlign: "center",
                  }}
                >
                  No entries yet.
                </p>
              )}
              {editingEntries.map((e, idx) => {
                const subj = subjectsFor(e.type).find(
                  (s) => s.id === e.subjectId,
                );
                const color = TYPE_CONFIG[e.type].color;
                /* idx here is the index within the TYPE-specific calendar, recompute */
                const typeEntries = calFor(e.type)[editingDay] ?? [];
                const typeIdx = typeEntries.findIndex((te, ti) => {
                  const seen = editingEntries
                    .slice(0, idx)
                    .filter((x) => x.type === e.type).length;
                  return ti === seen;
                });
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      background: CREAM,
                      borderRadius: 8,
                      padding: "0.4rem 0.6rem",
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: color,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "0.68rem",
                        color: MUTED,
                        fontWeight: 600,
                      }}
                    >
                      {TYPE_CONFIG[e.type].emoji}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: CHARCOAL,
                      }}
                    >
                      {subj?.name ?? e.subjectId}
                    </span>
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={e.hours}
                      onChange={(ev) =>
                        updateEntry(
                          editingDay,
                          e.type,
                          typeIdx,
                          parseFloat(ev.target.value) || 0,
                        )
                      }
                      style={{
                        width: 55,
                        padding: "0.25rem",
                        borderRadius: 6,
                        border: `1px solid ${BORDER}`,
                        textAlign: "center",
                        fontSize: "0.75rem",
                      }}
                    />
                    <button
                      onClick={() => removeEntry(editingDay, e.type, typeIdx)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#C0392B",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ marginBottom: "0.6rem" }}>
              <label
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: CHARCOAL,
                  display: "block",
                  marginBottom: "0.35rem",
                }}
              >
                Add new entry — choose type:
              </label>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {(Object.keys(TYPE_CONFIG) as SourceType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setAddType(t)}
                    style={{
                      flex: 1,
                      background: addType === t ? TYPE_CONFIG[t].color : CREAM,
                      color: addType === t ? "#fff" : MUTED,
                      border: `1.5px solid ${addType === t ? TYPE_CONFIG[t].color : BORDER}`,
                      borderRadius: 8,
                      padding: "0.4rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {TYPE_CONFIG[t].emoji} {TYPE_CONFIG[t].label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {subjectsFor(addType).map((s) => (
                <button
                  key={s.id}
                  onClick={() => addEntry(editingDay, addType, s.id, 1)}
                  style={{
                    background: `${TYPE_CONFIG[addType].color}1A`,
                    color: CHARCOAL,
                    border: `1.5px solid ${TYPE_CONFIG[addType].color}`,
                    borderRadius: 20,
                    padding: "0.25rem 0.6rem",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + {s.name}
                </button>
              ))}
            </div>

            {/* Custom task section */}
            <div style={{ marginTop: "1rem", borderTop: `1px solid ${BORDER}`, paddingTop: "0.8rem" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: CHARCOAL, display: "block", marginBottom: "0.4rem" }}>
                ✏️ Add custom task for this day:
              </label>
              <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem" }}>
                {["Study", "Revision", "Practice", "Physical", "Personal"].map(cat => (
                  <button key={cat} onClick={() => setCustomTaskCat(cat)}
                    style={{
                      flex: 1, padding: "0.3rem", borderRadius: 6, fontSize: "0.65rem", fontWeight: 600, cursor: "pointer",
                      background: customTaskCat === cat ? CHARCOAL : CREAM,
                      color: customTaskCat === cat ? "#fff" : MUTED,
                      border: `1px solid ${customTaskCat === cat ? CHARCOAL : BORDER}`,
                    }}
                  >{cat}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <input
                  type="text"
                  placeholder="Task name..."
                  value={customTaskName}
                  onChange={e => setCustomTaskName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && customTaskName.trim()) {
                      const planKey = `heartspace_custom_tasks_${uid}_${editingDay}`;
                      const raw = localStorage.getItem(planKey);
                      const tasks = raw ? JSON.parse(raw) : [];
                      tasks.push({ id: `custom_${Date.now()}`, name: customTaskName.trim(), category: customTaskCat, done: false });
                      localStorage.setItem(planKey, JSON.stringify(tasks));
                      // Also add to today's plan if editing today
                      const todayLocal = new Date();
                      const todayKey = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth()+1).padStart(2,'0')}-${String(todayLocal.getDate()).padStart(2,'0')}`;
                      if (editingDay === todayKey) {
                        const planRaw = localStorage.getItem(`heartspace_today_plan_${uid}`);
                        const plan = planRaw ? JSON.parse(planRaw) : { date: todayKey, tasks: [] };
                        const planTasks = plan.date === todayKey ? plan.tasks : [];
                        planTasks.push({ id: `custom_${Date.now()}`, name: customTaskName.trim(), category: customTaskCat, done: false });
                        localStorage.setItem(`heartspace_today_plan_${uid}`, JSON.stringify({ date: todayKey, tasks: planTasks }));
                      }
                      setCustomTaskName("");
                      setTaskRefresh(r => r + 1);
                    }
                  }}
                  style={{
                    flex: 1, padding: "0.4rem 0.6rem", borderRadius: 8,
                    border: `1px solid ${BORDER}`, fontSize: "0.8rem",
                  }}
                />
                <button
                  onClick={() => {
                    if (!customTaskName.trim()) return;
                    const planKey = `heartspace_custom_tasks_${uid}_${editingDay}`;
                    const raw = localStorage.getItem(planKey);
                    const tasks = raw ? JSON.parse(raw) : [];
                    tasks.push({ id: `custom_${Date.now()}`, name: customTaskName.trim(), category: customTaskCat, done: false });
                    localStorage.setItem(planKey, JSON.stringify(tasks));
                    const todayLocal = new Date();
                    const todayKey = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth()+1).padStart(2,'0')}-${String(todayLocal.getDate()).padStart(2,'0')}`;
                    if (editingDay === todayKey) {
                      const planRaw = localStorage.getItem(`heartspace_today_plan_${uid}`);
                      const plan = planRaw ? JSON.parse(planRaw) : { date: todayKey, tasks: [] };
                      const planTasks = plan.date === todayKey ? plan.tasks : [];
                      planTasks.push({ id: `custom_${Date.now()}`, name: customTaskName.trim(), category: customTaskCat, done: false });
                      localStorage.setItem(`heartspace_today_plan_${uid}`, JSON.stringify({ date: todayKey, tasks: planTasks }));
                    }
                    setCustomTaskName("");
                    setTaskRefresh(r => r + 1);
                  }}
                  style={{
                    padding: "0.4rem 0.8rem", borderRadius: 8, fontWeight: 600,
                    background: CHARCOAL, color: "#fff", border: "none", cursor: "pointer", fontSize: "0.8rem",
                  }}
                >Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
