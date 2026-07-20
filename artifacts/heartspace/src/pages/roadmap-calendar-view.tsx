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
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { supabase } from "../lib/supabase";

/* ============================================================
   COLORS (matches HeartSpace warm-cream system)
============================================================ */
const CREAM = "#F8F5F0";
const CARD = "#FFFDF9";
const CHARCOAL = "#2D2A25";
const GOLD = "#C9A84C";
const PROGRESS_PURPLE = "#6B568F";
const MUTED = "#7A7267";
const BORDER = "#E5DDD0";
const OLIVE = "#6E8B6B";

/* Distinct subject colors (cycled) */
const SUBJECT_COLORS = [
  "#4A90D9",
  "#E07B9A",
  "#7B6FD0",
  "#5CB85C",
  "#E8724A",
  "#C9A84C",
  "#5BA8A0",
  "#B06AB3",
];
function colorForSubject(id: string, allIds: string[]): string {
  const idx = allIds.indexOf(id);
  return SUBJECT_COLORS[idx % SUBJECT_COLORS.length] ?? PROGRESS_PURPLE;
}

/* ============================================================
   TYPES
============================================================ */
export interface CalendarSubjectDef {
  id: string;
  syllabusId: string;
  name: string;
  totalHours: number;
}

export interface DayEntry {
  subjectId: string;
  hours: number;
}
export type CalendarData = Record<string, DayEntry[]>; // key = "yyyy-MM-dd"

/* ============================================================
   STORAGE
============================================================ */
function lsKey(uid: string) {
  return `hs_calendar_${uid}`;
}
export function loadCalendar(uid: string): CalendarData {
  try {
    const r = localStorage.getItem(lsKey(uid));
    return r ? JSON.parse(r) : {};
  } catch {
    return {};
  }
}
export function saveCalendarLocal(uid: string, data: CalendarData) {
  try {
    localStorage.setItem(lsKey(uid), JSON.stringify(data));
  } catch {}
  supabase
    .from("roadmap_calendar")
    .upsert(
      { user_id: uid, data, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    )
    .then(() => {})
    .catch(() => {});
}

/* ============================================================
   AUTO-GENERATE BASELINE
   Walks subjects sequentially (in given order), filling each
   study day with hoursPerDay, advancing to next subject once
   its remaining hours are consumed.
============================================================ */
interface SimSlotForCalendar {
  startDate: string;
  endDate: string;
  subjectIds: string[];
  hoursPerSubject: Record<string, number>;
}

function isDateInSlot(dateStr: string, slot: SimSlotForCalendar): boolean {
  if (slot.endDate === "indefinite" as any) return dateStr >= slot.startDate;
  return dateStr >= slot.startDate && dateStr <= slot.endDate;
}

interface PeriodBase {
  startDate: string;
  endDate: string;
}
interface VariablePeriod extends PeriodBase {
  customHoursPerDay?: number;
  multiplier?: number;
}

function isDateInPeriod(dateStr: string, p: PeriodBase): boolean {
  if ((p.endDate as any) === "indefinite") return dateStr >= p.startDate;
  return dateStr >= p.startDate && dateStr <= p.endDate;
}

function autoGenerateCalendar(
  subjects: CalendarSubjectDef[],
  remainingHoursBySubject: Record<string, number>,
  startDate: string,
  hoursPerDay: number,
  selectedDays: number[],
  simSlots: SimSlotForCalendar[] = [],
  unavailablePeriods: PeriodBase[] = [],
  variablePeriods: VariablePeriod[] = [],
  existingData: CalendarData = {},
  horizonDays: number = 365,
): CalendarData {
  const data: CalendarData = { ...existingData };
  const remaining: Record<string, number> = { ...remainingHoursBySubject };
  const queue = subjects
    .map((s) => s.id)
    .filter((id) => (remaining[id] ?? 0) > 0.01);
  if (queue.length === 0) return data;

  const start = parseISO(startDate);
  let qIdx = 0;

  function isStudyDay(date: Date): boolean {
    return selectedDays.includes(date.getDay());
  }

  console.log("[CAL GEN DEBUG] selectedDays at generation:", JSON.stringify(selectedDays));
  for (let d = 0; d < horizonDays && qIdx < queue.length; d++) {
    const date = addDays(start, d);
    if (!isStudyDay(date)) continue;

    const key = format(date, "yyyy-MM-dd");

    const isUnavailable = unavailablePeriods.some((p) => isDateInPeriod(key, p));
    if (isUnavailable) continue;

    if (data[key] && data[key].length > 0) continue; // preserve existing manual entries

    if (data[key] && data[key].length > 0) continue; // preserve existing manual entries

    const activeVariable = variablePeriods.find((p) => isDateInPeriod(key, p));
    const effectiveHoursPerDay = activeVariable
      ? (activeVariable.customHoursPerDay ?? hoursPerDay * (activeVariable.multiplier ?? 1))
      : hoursPerDay;

    const activeSlot = simSlots.find((s) => isDateInSlot(key, s));

    if (activeSlot && activeSlot.subjectIds.length > 0) {
      /* SIMULTANEOUS: allocate each subject's configured daily hours */
      const entries: DayEntry[] = [];
      activeSlot.subjectIds.forEach((sid) => {
        const avail = remaining[sid] ?? 0;
        if (avail <= 0.01) return;
        const wantHrs = activeSlot.hoursPerSubject[sid] ?? 0;
        const alloc = Math.min(wantHrs, avail);
        if (alloc <= 0) return;
        entries.push({ subjectId: sid, hours: Math.round(alloc * 10) / 10 });
        remaining[sid] -= alloc;
      });
      if (entries.length > 0) data[key] = entries;
      continue;
    }

    let hoursLeftToday = effectiveHoursPerDay;
    const entries: DayEntry[] = [];

    while (hoursLeftToday > 0.01 && qIdx < queue.length) {
      const sid = queue[qIdx];
      const avail = remaining[sid] ?? 0;
      if (avail <= 0.01) {
        qIdx++;
        continue;
      }
      const alloc = Math.min(hoursLeftToday, avail);
      entries.push({ subjectId: sid, hours: Math.round(alloc * 10) / 10 });
      remaining[sid] -= alloc;
      hoursLeftToday -= alloc;
      if (remaining[sid] <= 0.01) qIdx++;
    }

    if (entries.length > 0) data[key] = entries;
  }

  return data;
}

/* ============================================================
   MAIN COMPONENT
============================================================ */
interface RoadmapCalendarProps {
  uid: string;
  subjects: CalendarSubjectDef[];
  remainingHoursBySubject: Record<string, number>;
  startDate: string;
  hoursPerDay: number;
  daysPerWeek: number;
  selectedDays: number[];
  simSlots?: SimSlotForCalendar[];
  unavailablePeriods?: PeriodBase[];
  variablePeriods?: VariablePeriod[];
}

export default function RoadmapCalendar({
  uid,
  subjects,
  remainingHoursBySubject,
  startDate,
  hoursPerDay,
  daysPerWeek,
  selectedDays,
  simSlots = [],
  unavailablePeriods = [],
  variablePeriods = [],
}: RoadmapCalendarProps) {
  const [pendingRoadmapDays, setPendingRoadmapDays] = useState<number[]>(selectedDays);
  const [roadmapDayPickError, setRoadmapDayPickError] = useState<string>("");

  function confirmRoadmapDayPick() {
    if (pendingRoadmapDays.length !== daysPerWeek) {
      setRoadmapDayPickError(`Please make sure your selected days match the number of days you've selected (${daysPerWeek}).`);
      return;
    }
    setRoadmapDayPickError("");
    try {
      const key = `hs_schedule_inputs_${uid}`;
      const existing = JSON.parse(localStorage.getItem(key) || "{}");
      localStorage.setItem(key, JSON.stringify({ ...existing, selectedDays: pendingRoadmapDays }));
    } catch {}
    window.location.reload();
  }
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(new Date());
  const [calendar, setCalendar] = useState<CalendarData>({});
  const [loaded, setLoaded] = useState(false);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [dragSubject, setDragSubject] = useState<string | null>(null);

  const allSubjectIds = subjects.map((s) => s.id);
  const isViewMode = !!(new URLSearchParams(window.location.search).get("viewAs"));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!uid) {
          return;
        }
        const { data: remote } = await supabase
          .from("roadmap_calendar")
          .select("data")
          .eq("user_id", uid)
          .single();
        if (cancelled) return;
        if (remote?.data && Object.keys(remote.data).length > 0) {
          setCalendar(remote.data as CalendarData);
          try { localStorage.setItem(lsKey(uid), JSON.stringify(remote.data)); } catch {}
          setLoaded(true);
          return;
        }
        const existing = loadCalendar(uid);
        if (Object.keys(existing).length > 0) {
          setCalendar(existing);
        } else if (!isViewMode) {
          const generated = autoGenerateCalendar(
            subjects,
            remainingHoursBySubject,
            startDate,
            hoursPerDay,
            selectedDays,
            simSlots,
            unavailablePeriods,
            variablePeriods,
          );
          setCalendar(generated);
          saveCalendarLocal(uid, generated);
        }
        setLoaded(true);
      } catch (err) {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  function persist(next: CalendarData) {
    setCalendar(next);
    saveCalendarLocal(uid, next);
  }

  function regenerateBaseline() {
    if (
      !confirm(
        "This will fill in any remaining unscheduled hours into open days. Your existing entries will NOT be changed. Continue?",
      )
    )
      return;
    const trueRemaining: Record<string, number> = {};
    subjects.forEach((s) => {
      const consumed = getConsumedHoursForSubject(s.id);
      trueRemaining[s.id] = Math.max(0, s.totalHours - consumed);
    });
    const generated = autoGenerateCalendar(
      subjects,
      trueRemaining,
      startDate,
      hoursPerDay,
      selectedDays,
      simSlots,
      unavailablePeriods,
      variablePeriods,
      calendar,
    );
    persist(generated);
  }

  function resetCalendarFromToday() {
    if (
      !confirm(
        "This will clear all auto-filled AND manual entries from today onward, then regenerate fresh using your current settings. Days before today will NOT be touched. Continue?",
      )
    )
      return;
    const todayKey = format(new Date(), "yyyy-MM-dd");
    const baseData: CalendarData = {};
    Object.entries(calendar).forEach(([dayKey, entries]) => {
      if (dayKey < todayKey) baseData[dayKey] = entries;
    });
    const consumedBySubject: Record<string, number> = {};
    Object.values(baseData).forEach((entries) => {
      entries.forEach((e) => {
        consumedBySubject[e.subjectId] = (consumedBySubject[e.subjectId] ?? 0) + e.hours;
      });
    });
    const remainingHoursBySubject: Record<string, number> = {};
    subjects.forEach((s) => {
      const consumed = consumedBySubject[s.id] ?? 0;
      remainingHoursBySubject[s.id] = Math.max(0, s.totalHours - consumed);
    });
    const generated = autoGenerateCalendar(
      subjects,
      remainingHoursBySubject,
      startDate,
      hoursPerDay,
      selectedDays,
      simSlots,
      unavailablePeriods,
      variablePeriods,
      baseData,
    );
    persist(generated);
  }

  function getTotalHoursForSubject(subjectId: string): number {
    const subj = subjects.find((s) => s.id === subjectId);
    return subj?.totalHours ?? Infinity;
  }

  function getConsumedHoursForSubject(subjectId: string, excludeDayKey?: string, excludeIdx?: number): number {
    let total = 0;
    Object.entries(calendar).forEach(([dayKey, entries]) => {
      entries.forEach((e, i) => {
        if (e.subjectId !== subjectId) return;
        if (dayKey === excludeDayKey && i === excludeIdx) return;
        total += e.hours;
      });
    });
    return total;
  }

  function addEntryToDay(dayKey: string, subjectId: string, hours: number) {
    const cap = getTotalHoursForSubject(subjectId);
    const consumed = getConsumedHoursForSubject(subjectId);
    const remaining = Math.max(0, cap - consumed);
    if (remaining <= 0) {
      alert(`This subject's ${cap} hour total is already fully scheduled. Remove some existing hours first.`);
      return;
    }
    const allowedHours = Math.min(hours, remaining);
    const next = { ...calendar };
    const existing = next[dayKey] ?? [];
    next[dayKey] = [...existing, { subjectId, hours: allowedHours }];
    persist(next);
  }

  function updateEntryHours(dayKey: string, idx: number, hours: number) {
    const next = { ...calendar };
    const entries = [...(next[dayKey] ?? [])];
    const subjectId = entries[idx]?.subjectId;
    if (hours <= 0) {
      entries.splice(idx, 1);
    } else {
      const cap = getTotalHoursForSubject(subjectId);
      const consumedElsewhere = getConsumedHoursForSubject(subjectId, dayKey, idx);
      const remaining = Math.max(0, cap - consumedElsewhere);
      const allowedHours = Math.min(hours, remaining);
      if (allowedHours < hours) {
        alert(`Capped at ${allowedHours}h — this subject's total is ${cap} hours.`);
      }
      entries[idx] = { ...entries[idx], hours: allowedHours };
    }
    next[dayKey] = entries;
    if (entries.length === 0) delete next[dayKey];
    persist(next);
  }

  function removeEntry(dayKey: string, idx: number) {
    const next = { ...calendar };
    const entries = [...(next[dayKey] ?? [])];
    entries.splice(idx, 1);
    next[dayKey] = entries;
    if (entries.length === 0) delete next[dayKey];
    persist(next);
  }

  function handleDrop(dayKey: string) {
    if (!dragSubject) return;
    addEntryToDay(dayKey, dragSubject, 1);
    setDragSubject(null);
  }

  /* Consumed hours per subject, derived from calendar */
  const consumedHours = useMemo(() => {
    const result: Record<string, number> = {};
    Object.values(calendar).forEach((entries) => {
      entries.forEach((e) => {
        result[e.subjectId] = (result[e.subjectId] ?? 0) + e.hours;
      });
    });
    return result;
  }, [calendar]);

  const days = useMemo(() => {
    if (view === "month") {
      const monthStart = startOfMonth(cursor);
      const monthEnd = endOfMonth(cursor);
      const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: gridStart, end: gridEnd });
    } else {
      const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(cursor, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  }, [view, cursor]);

  function navigate(dir: 1 | -1) {
    setCursor((prev) =>
      view === "month" ? addMonths(prev, dir) : addDays(prev, dir * 7),
    );
  }

  if (!loaded) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: MUTED }}>
        Loading calendar...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header / controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "0.4rem 0.7rem",
              cursor: "pointer",
              color: CHARCOAL,
            }}
          >
            ←
          </button>
          <span
            style={{
              fontWeight: 700,
              color: CHARCOAL,
              fontSize: "0.95rem",
              minWidth: 160,
              textAlign: "center",
            }}
          >
            {view === "month"
              ? format(cursor, "MMMM yyyy")
              : `${format(startOfWeek(cursor, { weekStartsOn: 1 }), "MMM d")} – ${format(endOfWeek(cursor, { weekStartsOn: 1 }), "MMM d, yyyy")}`}
          </span>
          <button
            onClick={() => navigate(1)}
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "0.4rem 0.7rem",
              cursor: "pointer",
              color: CHARCOAL,
            }}
          >
            →
          </button>
          <button
            onClick={() => setCursor(new Date())}
            style={{
              background: CREAM,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "0.4rem 0.7rem",
              cursor: "pointer",
              fontSize: "0.78rem",
              color: MUTED,
              fontWeight: 600,
            }}
          >
            Today
          </button>
        </div>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            onClick={() => setView("month")}
            style={{
              background: view === "month" ? CHARCOAL : CARD,
              color: view === "month" ? "#fff" : MUTED,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "0.4rem 0.9rem",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            Month
          </button>
          <button
            onClick={() => setView("week")}
            style={{
              background: view === "week" ? CHARCOAL : CARD,
              color: view === "week" ? "#fff" : MUTED,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "0.4rem 0.9rem",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            Week
          </button>
          <button
            onClick={resetCalendarFromToday}
            style={{
              background: "#fff3f3",
              color: "#c0392b",
              border: "1px solid #e0b0b0",
              borderRadius: "6px",
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            Reset from Today
          </button>
          <button
            onClick={regenerateBaseline}
            style={{
              background: CARD,
              color: PROGRESS_PURPLE,
              border: `1px solid ${PROGRESS_PURPLE}`,
              borderRadius: 8,
              padding: "0.4rem 0.9rem",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            ↺ Auto-fill
          </button>
        </div>
      </div>

      {/* Subject legend / drag source */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: "0.9rem 1rem",
        }}
      >
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: MUTED,
            marginBottom: "0.5rem",
          }}
        >
          Drag a subject onto any day, or click a day to edit:
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {subjects.map((s) => {
            const total = s.totalHours;
            const used = consumedHours[s.id] ?? 0;
            const remaining = Math.max(0, total - used);
            const color = colorForSubject(s.id, allSubjectIds);
            return (
              <div
                key={s.id}
                draggable
                onDragStart={() => setDragSubject(s.id)}
                onDragEnd={() => setDragSubject(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  cursor: "grab",
                  background: `${color}1A`,
                  border: `1.5px solid ${color}`,
                  borderRadius: 20,
                  padding: "0.3rem 0.7rem",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: CHARCOAL,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: color,
                    flexShrink: 0,
                  }}
                />
                {s.name}{" "}
                <span style={{ color: MUTED, fontWeight: 500 }}>
                  · {remaining}h left
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Calendar grid */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
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
                padding: "0.5rem",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: MUTED,
                textTransform: "uppercase",
              }}
            >
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", minWidth: 640 }}>
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const entries = calendar[key] ?? [];
            const inMonth = view === "week" || isSameMonth(day, cursor);
            const today = isToday(day);
            return (
              <div
                key={key}
                onClick={() => setEditingDay(key)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(key)}
                style={{
                  minHeight: view === "month" ? 90 : 140,
                  borderRight: `1px solid ${BORDER}`,
                  borderBottom: `1px solid ${BORDER}`,
                  padding: "0.4rem",
                  background: today ? "#FFFBEF" : inMonth ? CARD : CREAM,
                  opacity: inMonth ? 1 : 0.45,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: today ? 800 : 600,
                    color: today ? PROGRESS_PURPLE : CHARCOAL,
                  }}
                >
                  {format(day, "d")}
                </span>
                {entries.slice(0, view === "month" ? 3 : 8).map((e, i) => {
                  const subj = subjects.find((s) => s.id === e.subjectId);
                  const color = colorForSubject(e.subjectId, allSubjectIds);
                  return (
                    <div
                      key={i}
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        color: "#fff",
                        background: color,
                        borderRadius: 5,
                        padding: "0.1rem 0.35rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {subj?.name ?? e.subjectId} · {e.hours}h
                    </div>
                  );
                })}
                {entries.length > (view === "month" ? 3 : 8) && (
                  <span style={{ fontSize: "0.62rem", color: MUTED }}>
                    +{entries.length - (view === "month" ? 3 : 8)} more
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day editor modal */}
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
              borderRadius: 18,
              padding: "1.5rem",
              width: 380,
              maxWidth: "90vw",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
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
                {format(parseISO(editingDay), "EEEE, MMM d, yyyy")}
              </h3>
              <button
                onClick={() => setEditingDay(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.1rem",
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
                gap: "0.5rem",
                marginBottom: "1.25rem",
              }}
            >
              {(calendar[editingDay] ?? []).map((e, idx) => {
                const subj = subjects.find((s) => s.id === e.subjectId);
                const color = colorForSubject(e.subjectId, allSubjectIds);
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      background: CREAM,
                      borderRadius: 10,
                      padding: "0.5rem 0.7rem",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontSize: "0.85rem",
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
                        updateEntryHours(
                          editingDay,
                          idx,
                          parseFloat(ev.target.value) || 0,
                        )
                      }
                      style={{
                        width: 60,
                        padding: "0.3rem",
                        borderRadius: 6,
                        border: `1px solid ${BORDER}`,
                        textAlign: "center",
                        fontSize: "0.8rem",
                      }}
                    />
                    <span style={{ fontSize: "0.75rem", color: MUTED }}>
                      hrs
                    </span>
                    <button
                      onClick={() => removeEntry(editingDay, idx)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#C0392B",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {(calendar[editingDay] ?? []).length === 0 && (
                <p
                  style={{
                    color: MUTED,
                    fontSize: "0.85rem",
                    textAlign: "center",
                    padding: "0.5rem",
                  }}
                >
                  No subjects assigned yet.
                </p>
              )}
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: CHARCOAL,
                  display: "block",
                  marginBottom: "0.4rem",
                }}
              >
                Add a subject
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {subjects.map((s) => {
                  const color = colorForSubject(s.id, allSubjectIds);
                  return (
                    <button
                      key={s.id}
                      onClick={() => addEntryToDay(editingDay, s.id, 1)}
                      style={{
                        background: `${color}1A`,
                        color: CHARCOAL,
                        border: `1.5px solid ${color}`,
                        borderRadius: 20,
                        padding: "0.3rem 0.7rem",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      + {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
