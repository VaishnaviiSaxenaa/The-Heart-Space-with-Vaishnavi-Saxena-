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
import { supabase } from "../lib/supabase";

/* ============================================================
   COLORS
============================================================ */
const CREAM = "#F8F5F0";
const CARD = "#FFFDF9";
const CHARCOAL = "#2D2A25";
const GOLD = "#C9A84C";
const PROGRESS_PURPLE = "#6B568F";
const MUTED = "#7A7267";
const BORDER = "#E5DDD0";

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
   TYPES (exported for reuse across pages)
============================================================ */
export interface GenericSubjectDef {
  id: string;
  name: string;
  totalHours: number;
}

export interface DayEntry {
  subjectId: string;
  hours: number;
}
export type CalendarData = Record<string, DayEntry[]>;

export interface PeriodBase {
  startDate: string;
  endDate: string;
}

/* ============================================================
   STORAGE (namespaced — e.g. "study", "revision", "practice")
============================================================ */
export function calendarKey(namespace: string, uid: string): string {
  return `hs_cal_${namespace}_${uid}`;
}

export function loadGenericCalendar(
  namespace: string,
  uid: string,
): CalendarData {
  try {
    const r = localStorage.getItem(calendarKey(namespace, uid));
    return r ? JSON.parse(r) : {};
  } catch {
    return {};
  }
}

export function saveGenericCalendar(
  namespace: string,
  uid: string,
  data: CalendarData,
) {
  try {
    localStorage.setItem(calendarKey(namespace, uid), JSON.stringify(data));
  } catch {}
  supabase
    .from("generic_calendars")
    .upsert(
      { user_id: uid, namespace, data, updated_at: new Date().toISOString() },
      { onConflict: "user_id,namespace" },
    )
    .then(() => {})
    .catch(() => {});
}

export function getConsumedHours(
  data: CalendarData,
  subjectId: string,
): number {
  let total = 0;
  Object.values(data).forEach((entries) => {
    entries.forEach((e) => {
      if (e.subjectId === subjectId) total += e.hours;
    });
  });
  return total;
}

/* ============================================================
   AUTO-GENERATE
============================================================ */
export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DEFAULT_SELECTED_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri, matches old default of 5 days/week

function isStudyDay(date: Date, selectedDays: number[]): boolean {
  return selectedDays.includes(date.getDay());
}

function isDateInPeriod(dateStr: string, p: PeriodBase): boolean {
  if ((p.endDate as any) === "indefinite") return dateStr >= p.startDate;
  return dateStr >= p.startDate && dateStr <= p.endDate;
}

export function autoGenerateGeneric(
  subjects: GenericSubjectDef[],
  remainingHoursBySubject: Record<string, number>,
  startDate: string,
  hoursPerDay: number,
  selectedDaysParam: number[],
  unavailablePeriods: PeriodBase[] = [],
  existingData: CalendarData = {},
  horizonDays: number = 365,
): CalendarData {
  const data: CalendarData = { ...existingData };
  const remaining: Record<string, number> = { ...remainingHoursBySubject };
  let queue = subjects
    .map((s) => s.id)
    .filter((id) => (remaining[id] ?? 0) > 0.01);
  if (queue.length === 0) return data;

  const start = parseISO(startDate);
  let qIdx = 0;

  for (let d = 0; d < horizonDays && qIdx < queue.length; d++) {
    const date = addDays(start, d);
    if (!isStudyDay(date, selectedDaysParam)) continue;
    const key = format(date, "yyyy-MM-dd");
    if (unavailablePeriods.some((p) => isDateInPeriod(key, p))) continue;

    if (data[key] && data[key].length > 0) continue; // preserve existing manual entries

    let hoursLeftToday = hoursPerDay;
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
   GENERIC CALENDAR COMPONENT
============================================================ */
interface GenericCalendarProps {
  namespace: string; // "study" | "revision" | "practice"
  uid: string;
  subjects: GenericSubjectDef[];
  startDate: string;
  hoursPerDay: number; // initial default, overridable per-calendar below
  daysPerWeek: number; // initial default, overridable per-calendar below
  unavailablePeriods?: PeriodBase[];
  title?: string;
}

export default function GenericCalendar({
  namespace,
  uid,
  subjects,
  startDate,
  hoursPerDay: defaultHoursPerDay,
  daysPerWeek: defaultDaysPerWeek,
  unavailablePeriods = [],
  title = "Calendar",
}: GenericCalendarProps) {
  const paceKey = `hs_cal_pace_${namespace}_${uid}`;
  const [hoursPerDay, setHoursPerDay] = useState<number>(() => {
    try {
      const r = localStorage.getItem(paceKey);
      if (r) return JSON.parse(r).hoursPerDay ?? defaultHoursPerDay;
    } catch {}
    return defaultHoursPerDay;
  });
  const [daysPerWeek, setDaysPerWeek] = useState<number>(() => {
    try {
      const r = localStorage.getItem(paceKey);
      if (r) return JSON.parse(r).daysPerWeek ?? defaultDaysPerWeek;
    } catch {}
    return defaultDaysPerWeek;
  });
  const [selectedDays, setSelectedDays] = useState<number[]>(() => {
    try {
      const r = localStorage.getItem(paceKey);
      if (r) {
        const parsed = JSON.parse(r).selectedDays;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_SELECTED_DAYS.slice(0, defaultDaysPerWeek);
  });
  const [pendingDays, setPendingDays] = useState<number[]>(selectedDays);
  const [dayPickError, setDayPickError] = useState<string>("");

  function toggleDay(dow: number) {
    setPendingDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort()
    );
    setDayPickError("");
  }

  function confirmDayPick() {
    if (pendingDays.length !== daysPerWeek) {
      setDayPickError(`Please make sure your selected days match the number of days you've selected (${daysPerWeek}).`);
      return;
    }
    setSelectedDays(pendingDays);
    setDayPickError("");
  }

  useEffect(() => {
    try {
      localStorage.setItem(paceKey, JSON.stringify({ hoursPerDay, daysPerWeek, selectedDays }));
    } catch {}
  }, [hoursPerDay, daysPerWeek, selectedDays, paceKey]);

  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(new Date());
  const [calendar, setCalendar] = useState<CalendarData>({});
  const [loaded, setLoaded] = useState(false);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [dragSubject, setDragSubject] = useState<string | null>(null);

  const allSubjectIds = subjects.map((s) => s.id);

  useEffect(() => {
    if (!uid) return;
    const existing = loadGenericCalendar(namespace, uid);
    if (Object.keys(existing).length > 0) {
      setCalendar(existing);
    } else {
      const remainingHoursBySubject: Record<string, number> = {};
      subjects.forEach((s) => {
        remainingHoursBySubject[s.id] = s.totalHours;
      });
      const generated = autoGenerateGeneric(
        subjects,
        remainingHoursBySubject,
        startDate,
        hoursPerDay,
        selectedDays,
        unavailablePeriods,
      );
      setCalendar(generated);
      saveGenericCalendar(namespace, uid, generated);
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, namespace]);

  function persist(next: CalendarData) {
    setCalendar(next);
    saveGenericCalendar(namespace, uid, next);
  }

  function regenerateBaseline() {
    if (
      !confirm(
        "This will fill in any remaining unscheduled hours into open days. Your existing entries will NOT be changed. Continue?",
      )
    )
      return;
    const remainingHoursBySubject: Record<string, number> = {};
    subjects.forEach((s) => {
      const consumed = getConsumedHoursForSubject(s.id);
      remainingHoursBySubject[s.id] = Math.max(0, s.totalHours - consumed);
    });
    const generated = autoGenerateGeneric(
      subjects,
      remainingHoursBySubject,
      startDate,
      hoursPerDay,
      selectedDays,
      unavailablePeriods,
      calendar,
    );
    persist(generated);
  }

  function getTotalHoursForSubject(subjectId: string): number {
    return subjects.find((s) => s.id === subjectId)?.totalHours ?? Infinity;
  }

  function getConsumedHoursForSubject(
    subjectId: string,
    excludeDayKey?: string,
    excludeIdx?: number,
  ): number {
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
      alert(
        `This subject's ${Math.round(cap * 10) / 10} hour total is already fully scheduled.`,
      );
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
      const consumedElsewhere = getConsumedHoursForSubject(
        subjectId,
        dayKey,
        idx,
      );
      const remaining = Math.max(0, cap - consumedElsewhere);
      const allowedHours = Math.min(hours, remaining);
      if (allowedHours < hours) {
        alert(
          `Capped at ${Math.round(allowedHours * 10) / 10}h \u2014 total is ${Math.round(cap * 10) / 10} hours.`,
        );
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
            fontSize: "1rem",
            fontWeight: 700,
            color: CHARCOAL,
            margin: 0,
          }}
        >
          {title}
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
          <button
            onClick={regenerateBaseline}
            style={{
              background: CARD,
              color: PROGRESS_PURPLE,
              border: `1px solid ${PROGRESS_PURPLE}`,
              borderRadius: 8,
              padding: "0.35rem 0.7rem",
              cursor: "pointer",
              fontSize: "0.78rem",
              fontWeight: 600,
            }}
          >
            ↺ Auto-fill
          </button>
        </div>
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.9rem 1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div>
          <label style={{ fontSize: "0.78rem", fontWeight: 600, color: CHARCOAL, display: "block", marginBottom: "0.3rem" }}>
            Hours per day: <span style={{ color: PROGRESS_PURPLE }}>{hoursPerDay} hrs</span>
          </label>
          <input
            type="range"
            min={0.5}
            max={12}
            step={0.5}
            value={hoursPerDay}
            onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
        <div>
          <label style={{ fontSize: "0.78rem", fontWeight: 600, color: CHARCOAL, display: "block", marginBottom: "0.3rem" }}>
            Days per week: <span style={{ color: PROGRESS_PURPLE }}>{daysPerWeek} days</span>
          </label>
          <input
            type="range"
            min={1}
            max={7}
            step={1}
            value={daysPerWeek}
            onChange={(e) => setDaysPerWeek(parseInt(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.9rem 1rem" }}>
        <label style={{ fontSize: "0.78rem", fontWeight: 600, color: CHARCOAL, display: "block", marginBottom: "0.5rem" }}>
          Which {daysPerWeek} day{daysPerWeek !== 1 ? "s" : ""} of the week?
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.6rem" }}>
          {WEEKDAY_LABELS.map((label, dow) => {
            const checked = pendingDays.includes(dow);
            return (
              <button
                key={dow}
                onClick={() => toggleDay(dow)}
                style={{
                  background: checked ? PROGRESS_PURPLE : CREAM,
                  color: checked ? "#fff" : CHARCOAL,
                  border: `1.5px solid ${checked ? PROGRESS_PURPLE : BORDER}`,
                  borderRadius: 8,
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {dayPickError && (
          <p style={{ fontSize: "0.75rem", color: "#C0392B", marginBottom: "0.5rem" }}>{dayPickError}</p>
        )}
        <button
          onClick={confirmDayPick}
          style={{
            background: PROGRESS_PURPLE,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "0.4rem 0.9rem",
            fontSize: "0.78rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Confirm days
        </button>
        {JSON.stringify(selectedDays) === JSON.stringify(pendingDays) && (
          <span style={{ fontSize: "0.75rem", color: "#4A8F5C", marginLeft: "0.6rem", fontWeight: 600 }}>✓ Saved</span>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
        {subjects.map((s) => {
          const used = consumedHours[s.id] ?? 0;
          const remaining = Math.max(0, s.totalHours - used);
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
                gap: "0.35rem",
                cursor: "grab",
                background: `${color}1A`,
                border: `1.5px solid ${color}`,
                borderRadius: 20,
                padding: "0.25rem 0.6rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: CHARCOAL,
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
              {s.name}{" "}
              <span style={{ color: MUTED, fontWeight: 500 }}>
                · {Math.round(remaining * 10) / 10}h left
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            borderBottom: `1px solid ${BORDER}`,
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
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
                  minHeight: view === "month" ? 75 : 120,
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
                    color: today ? PROGRESS_PURPLE : CHARCOAL,
                  }}
                >
                  {format(day, "d")}
                </span>
                {entries.slice(0, view === "month" ? 2 : 6).map((e, i) => {
                  const subj = subjects.find((s) => s.id === e.subjectId);
                  const color = colorForSubject(e.subjectId, allSubjectIds);
                  return (
                    <div
                      key={i}
                      style={{
                        fontSize: "0.6rem",
                        fontWeight: 600,
                        color: "#fff",
                        background: color,
                        borderRadius: 4,
                        padding: "0.05rem 0.3rem",
                        marginTop: "0.15rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {subj?.name ?? e.subjectId} · {e.hours}h
                    </div>
                  );
                })}
                {entries.length > (view === "month" ? 2 : 6) && (
                  <span style={{ fontSize: "0.58rem", color: MUTED }}>
                    +{entries.length - (view === "month" ? 2 : 6)}
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
              width: 360,
              maxWidth: "90vw",
              maxHeight: "75vh",
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
              {(calendar[editingDay] ?? []).map((e, idx) => {
                const subj = subjects.find((s) => s.id === e.subjectId);
                const color = colorForSubject(e.subjectId, allSubjectIds);
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
                        updateEntryHours(
                          editingDay,
                          idx,
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
                      onClick={() => removeEntry(editingDay, idx)}
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
              {(calendar[editingDay] ?? []).length === 0 && (
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
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
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
                      padding: "0.25rem 0.6rem",
                      fontSize: "0.72rem",
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
      )}
    </div>
  );
}
