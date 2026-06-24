import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { format, addDays, parseISO, differenceInCalendarDays } from "date-fns";

/* ============================================================
   COLORS
============================================================ */
const CREAM = "#F8F5F0";
const CARD = "#FFFDF9";
const SIDEBAR = "#F0E8D8";
const CHARCOAL = "#2D2A25";
const GOLD = "#C9A84C";
const MUTED = "#7A7267";
const BORDER = "#E5DDD0";
const OLIVE = "#6E8B6B";
const RED = "#C0392B";

/* ============================================================
   SUBJECTS (hours-based)
============================================================ */
interface SubjectDef {
  id: string;
  name: string;
  totalHours: number; // total lecture hours to complete this subject
  netOnly?: boolean;
}

const JAM_SUBJECTS_V2: SubjectDef[] = [
  { id: "linear_algebra", name: "Linear Algebra", totalHours: 60 },
  { id: "group_theory", name: "Group Theory", totalHours: 50 },
  { id: "ring_field", name: "Ring + Field", totalHours: 40 },
  { id: "real_analysis", name: "Real Analysis", totalHours: 60 },
  { id: "complex_analysis", name: "Complex Analysis", totalHours: 50 },
  { id: "ode", name: "ODE", totalHours: 40 },
  { id: "pde", name: "PDE", totalHours: 40 },
  { id: "integral_equations", name: "Integral Equations", totalHours: 30 },
  {
    id: "calculus_of_variations",
    name: "Calculus of Variations",
    totalHours: 30,
  },
  { id: "numerical_analysis", name: "Numerical Analysis", totalHours: 30 },
];

const NET_EXTRA_V2: SubjectDef[] = [
  { id: "topology", name: "Topology", totalHours: 40, netOnly: true },
  {
    id: "functional_analysis",
    name: "Functional Analysis",
    totalHours: 40,
    netOnly: true,
  },
];

function getSubjects(examType: string): SubjectDef[] {
  return examType === "NET_GATE"
    ? [...JAM_SUBJECTS_V2, ...NET_EXTRA_V2]
    : JAM_SUBJECTS_V2;
}

/* ============================================================
   STAGE PRESETS
============================================================ */
interface StagePreset {
  key: string;
  emoji: string;
  title: string;
  subtitle: string;
  defaultMonths: number;
}

const STAGE_PRESETS: StagePreset[] = [
  {
    key: "bsc_1st",
    emoji: "🌱",
    title: "BSc 1st Year",
    subtitle: "3-year preparation plan",
    defaultMonths: 36,
  },
  {
    key: "bsc_2nd",
    emoji: "📚",
    title: "BSc 2nd Year",
    subtitle: "2-year preparation plan",
    defaultMonths: 24,
  },
  {
    key: "bsc_3rd",
    emoji: "🎯",
    title: "BSc 3rd Year",
    subtitle: "6–8 month intensive plan",
    defaultMonths: 7,
  },
  {
    key: "dropper",
    emoji: "💪",
    title: "Dropper",
    subtitle: "12-month focused plan",
    defaultMonths: 12,
  },
  {
    key: "msc_1st",
    emoji: "🔬",
    title: "MSc 1st Year",
    subtitle: "18-month preparation plan",
    defaultMonths: 18,
  },
  {
    key: "msc_2nd",
    emoji: "🏆",
    title: "MSc 2nd Year",
    subtitle: "6-month final push",
    defaultMonths: 6,
  },
  {
    key: "working",
    emoji: "💼",
    title: "Working Professional",
    subtitle: "12–18 month flexible plan",
    defaultMonths: 15,
  },
];

/* ============================================================
   TYPES
============================================================ */
interface UnavailablePeriodV2 {
  id: string;
  reason: string;
  startDate: string;
  endDate: string;
}

interface VariableIntensityPeriodV2 {
  id: string;
  reason: string;
  startDate: string;
  endDate: string;
  extraHoursPerDay: number; // additional hours/day during this period
}

type LearningSpeed = "slow" | "normal" | "fast";
const SPEED_MULTIPLIER: Record<LearningSpeed, number> = {
  slow: 1.4,
  normal: 1.0,
  fast: 0.75,
};

type StudyMode = "single" | "multiple";

interface SimultaneousSlotV2 {
  id: string;
  label: string;
  startDate: string;
  endDate: string | "indefinite";
  mode: StudyMode;
  subjectIds: string[];
  hoursPerSubject: Record<string, number>; // hours/day per subject during this slot
}

interface RoadmapV2 {
  stageKey: string;
  examType: "JAM" | "NET_GATE";
  startDate: string;
  hoursPerDay: number;
  daysPerWeek: number;
  targetMonths: number;
  revisionPercent: number;
  unavailablePeriods: UnavailablePeriodV2[];
  variableIntensityPeriods: VariableIntensityPeriodV2[];
  topicSpeed: Record<string, LearningSpeed>;
  subjectOrder: string[];
  simSlots: SimultaneousSlotV2[];
}

/* ============================================================
   STORAGE
============================================================ */
function lsKey(uid: string) {
  return `hs_roadmap_v2_${uid}`;
}

function loadRoadmapV2(uid: string): RoadmapV2 | null {
  try {
    const r = localStorage.getItem(lsKey(uid));
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}

function saveRoadmapV2(uid: string, rm: RoadmapV2) {
  try {
    localStorage.setItem(lsKey(uid), JSON.stringify(rm));
  } catch {}
  // Best-effort cloud sync (table: roadmap_v2, columns: user_id, data)
  supabase
    .from("roadmap_v2")
    .upsert(
      { user_id: uid, data: rm, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    )
    .then(() => {})
    .catch(() => {});
}

function getCurrentUserId(fallbackUserId?: string): string {
  if (fallbackUserId) return fallbackUserId;
  try {
    const s = localStorage.getItem("heartspace_user");
    if (s) return JSON.parse(s).id || "";
  } catch {}
  return "";
}

/* ============================================================
   SYLLABUS PROGRESS (reuse existing syllabus tracker data)
============================================================ */
interface SubtopicStatus {
  status?: "not_started" | "in_progress" | "done";
}
type SyllabusData = Record<string, SubtopicStatus>;

function lsSyllabusKey(uid: string) {
  return `hs_syllabus_${uid}`;
}
function loadSyllabusData(uid: string): SyllabusData {
  try {
    const r = localStorage.getItem(lsSyllabusKey(uid));
    return r ? JSON.parse(r) : {};
  } catch {
    return {};
  }
}

/* Rough mapping: % of subject complete, based on subtopic key prefix matching subject id.
   This is intentionally loose since the old syllabus tracker uses short codes (la, ra, etc).
   We expose a percent-complete-per-subject map; if no data found, defaults to 0. */
const SUBJECT_CODE_MAP: Record<string, string> = {
  linear_algebra: "la",
  real_analysis: "ra",
  group_theory: "gt",
  ring_field: "rf",
  complex_analysis: "ca",
  ode: "ode",
  pde: "pde",
  integral_equations: "ie",
  calculus_of_variations: "cv",
  numerical_analysis: "na",
  topology: "tp",
  functional_analysis: "fa",
};

function getSubjectCompletionPercent(
  syllabus: SyllabusData,
  subjectId: string,
): number {
  const code = SUBJECT_CODE_MAP[subjectId];
  if (!code) return 0;
  const keys = Object.keys(syllabus).filter((k) => k.startsWith(code + "_"));
  if (keys.length === 0) return 0;
  const done = keys.filter((k) => syllabus[k]?.status === "done").length;
  return Math.round((done / keys.length) * 100);
}

/* ============================================================
   HOURS-BASED SCHEDULE ENGINE
============================================================ */
interface SubjectScheduleResult {
  subject: SubjectDef;
  completionPercent: number;
  remainingHours: number;
  effectiveHoursNeeded: number; // after speed multiplier
  hoursAllocatedSoFarPlan: number;
  daysToComplete: number;
  startsOnDay: number; // offset in days from roadmap start
  endsOnDay: number;
}

interface ScheduleResultV2 {
  perSubject: SubjectScheduleResult[];
  totalEffectiveHoursRemaining: number;
  totalCalendarDaysNeeded: number;
  estimatedEndDate: string;
  fullyCompletableCount: number;
  minMonthsNeeded: number;
  feasible: boolean;
  weeklyHoursAvailable: number;
  monthlyHoursAvailable: number;
  totalHoursInTarget: number;
}

function dateInRange(
  d: Date,
  start: string,
  end: string | "indefinite",
): boolean {
  const s = parseISO(start);
  if (d < s) return false;
  if (end === "indefinite") return true;
  const e = parseISO(end);
  return d <= e;
}

/** Returns net study hours available on a given calendar date, after accounting for
 *  unavailable periods, variable intensity periods, and weekly day-of-week pattern. */
function hoursAvailableOnDate(
  date: Date,
  baseHoursPerDay: number,
  daysPerWeek: number,
  unavailable: UnavailablePeriodV2[],
  variableIntensity: VariableIntensityPeriodV2[],
): number {
  // Simple weekly pattern: study daysPerWeek days out of 7, starting Monday.
  const dow = date.getDay(); // 0 = Sunday
  const isStudyDay = daysPerWeek >= 7 || dow !== 0; // crude pattern; refine: study Mon-Sat minus skip days for <6
  // For daysPerWeek < 6, skip extra days starting from Saturday backward
  let studyDay = true;
  if (daysPerWeek <= 6) {
    const skipCount = 7 - daysPerWeek;
    // skip Sunday always (dow 0) is 1 of the skips when daysPerWeek <=6
    const skipDows = [0, 6, 5, 4, 3, 2, 1].slice(0, skipCount); // Sun, Sat, Fri,... in priority
    studyDay = !skipDows.includes(dow);
  }
  if (!studyDay) return 0;

  for (const u of unavailable) {
    if (dateInRange(date, u.startDate, u.endDate)) return 0;
  }
  let hours = baseHoursPerDay;
  for (const v of variableIntensity) {
    if (dateInRange(date, v.startDate, v.endDate)) {
      hours += v.extraHoursPerDay;
    }
  }
  return hours;
}

function getActiveSimSlot(
  date: Date,
  slots: SimultaneousSlotV2[],
): SimultaneousSlotV2 | null {
  for (const s of slots) {
    if (dateInRange(date, s.startDate, s.endDate)) return s;
  }
  return null;
}

function computeScheduleV2(
  rm: RoadmapV2,
  syllabus: SyllabusData,
): ScheduleResultV2 {
  const subjects = getSubjects(rm.examType);
  const orderedIds =
    rm.subjectOrder.length > 0 ? rm.subjectOrder : subjects.map((s) => s.id);
  const orderedSubjects = orderedIds
    .map((id) => subjects.find((s) => s.id === id))
    .filter((s): s is SubjectDef => !!s);

  // Remaining effective hours per subject (after completion % and speed multiplier)
  const remaining: Record<string, number> = {};
  let totalEffectiveHoursRemaining = 0;
  for (const subj of orderedSubjects) {
    const pct = getSubjectCompletionPercent(syllabus, subj.id) / 100;
    const rawRemaining = subj.totalHours * (1 - pct);
    const speed = rm.topicSpeed[subj.id] ?? "normal";
    const effective = rawRemaining * SPEED_MULTIPLIER[speed];
    remaining[subj.id] = effective;
    totalEffectiveHoursRemaining += effective;
  }
  // Add revision time on top
  const revisionMultiplier = 1 + rm.revisionPercent / 100;
  totalEffectiveHoursRemaining *= revisionMultiplier;
  for (const id of Object.keys(remaining)) remaining[id] *= revisionMultiplier;

  // Walk day by day, allocating hours to subjects (sequential by default, or simultaneous via slots)
  const start = parseISO(rm.startDate);
  const queueIds = orderedSubjects
    .map((s) => s.id)
    .filter((id) => remaining[id] > 0.01);
  const perSubjectDays: Record<
    string,
    { startDay: number | null; endDay: number | null }
  > = {};
  for (const id of queueIds)
    perSubjectDays[id] = { startDay: null, endDay: null };

  let dayOffset = 0;
  const MAX_DAYS = 365 * 10; // safety cap
  let cursor = [...queueIds]; // sequential pointer queue

  while (cursor.length > 0 && dayOffset < MAX_DAYS) {
    const date = addDays(start, dayOffset);
    const dayHours = hoursAvailableOnDate(
      date,
      rm.hoursPerDay,
      rm.daysPerWeek,
      rm.unavailablePeriods,
      rm.variableIntensityPeriods,
    );

    if (dayHours > 0) {
      const slot = getActiveSimSlot(date, rm.simSlots);
      if (slot && slot.mode === "multiple" && slot.subjectIds.length > 0) {
        // Simultaneous: allocate each subject's configured hours/day (capped by remaining)
        for (const sid of slot.subjectIds) {
          if (!(sid in remaining) || remaining[sid] <= 0) continue;
          const alloc = Math.min(
            slot.hoursPerSubject[sid] ?? 0,
            remaining[sid],
          );
          if (alloc <= 0) continue;
          if (perSubjectDays[sid] && perSubjectDays[sid].startDay === null)
            perSubjectDays[sid].startDay = dayOffset;
          remaining[sid] -= alloc;
          if (remaining[sid] <= 0.01 && perSubjectDays[sid])
            perSubjectDays[sid].endDay = dayOffset;
        }
      } else {
        // Sequential: spend the day's hours on the first subject left in cursor
        let hoursLeftToday = dayHours;
        while (hoursLeftToday > 0 && cursor.length > 0) {
          const sid = cursor[0];
          if (!(sid in remaining) || remaining[sid] <= 0) {
            cursor.shift();
            continue;
          }
          if (perSubjectDays[sid] && perSubjectDays[sid].startDay === null)
            perSubjectDays[sid].startDay = dayOffset;
          const alloc = Math.min(hoursLeftToday, remaining[sid]);
          remaining[sid] -= alloc;
          hoursLeftToday -= alloc;
          if (remaining[sid] <= 0.01) {
            if (perSubjectDays[sid]) perSubjectDays[sid].endDay = dayOffset;
            cursor.shift();
          }
        }
      }
    }

    // Recompute cursor to drop any subjects finished via simultaneous mode
    cursor = cursor.filter((id) => remaining[id] > 0.01);
    dayOffset++;

    // Stop if everything (sequential + simultaneous) is done
    const stillRemaining = queueIds.some((id) => remaining[id] > 0.01);
    if (!stillRemaining) break;
  }

  const totalCalendarDaysNeeded = dayOffset;
  const estimatedEndDate = format(
    addDays(start, totalCalendarDaysNeeded),
    "MMM d, yyyy",
  );

  const perSubject: SubjectScheduleResult[] = orderedSubjects.map((subj) => {
    const pct = getSubjectCompletionPercent(syllabus, subj.id);
    const rawRemainingHours = subj.totalHours * (1 - pct / 100);
    const speed = rm.topicSpeed[subj.id] ?? "normal";
    const effectiveHoursNeeded =
      rawRemainingHours * SPEED_MULTIPLIER[speed] * revisionMultiplier;
    const d = perSubjectDays[subj.id] ?? { startDay: null, endDay: null };
    return {
      subject: subj,
      completionPercent: pct,
      remainingHours: Math.round(rawRemainingHours * 10) / 10,
      effectiveHoursNeeded: Math.round(effectiveHoursNeeded * 10) / 10,
      hoursAllocatedSoFarPlan: 0,
      daysToComplete:
        d.startDay !== null && d.endDay !== null
          ? d.endDay - d.startDay + 1
          : 0,
      startsOnDay: d.startDay ?? -1,
      endsOnDay: d.endDay ?? -1,
    };
  });

  const weeklyHoursAvailable = rm.hoursPerDay * rm.daysPerWeek;
  const monthlyHoursAvailable = weeklyHoursAvailable * 4.33;
  const totalHoursInTarget = monthlyHoursAvailable * rm.targetMonths;

  // What can be completed within targetMonths (greedy by subjectOrder)
  const targetDays = Math.round(rm.targetMonths * 30.44);
  let fullyCompletableCount = 0;
  for (const s of perSubject) {
    if (s.endsOnDay >= 0 && s.endsOnDay <= targetDays) fullyCompletableCount++;
  }

  const minMonthsNeeded =
    Math.ceil((totalCalendarDaysNeeded / 30.44) * 10) / 10;
  const feasible = totalCalendarDaysNeeded <= targetDays;

  return {
    perSubject,
    totalEffectiveHoursRemaining:
      Math.round(totalEffectiveHoursRemaining * 10) / 10,
    totalCalendarDaysNeeded,
    estimatedEndDate,
    fullyCompletableCount,
    minMonthsNeeded,
    feasible,
    weeklyHoursAvailable: Math.round(weeklyHoursAvailable * 10) / 10,
    monthlyHoursAvailable: Math.round(monthlyHoursAvailable * 10) / 10,
    totalHoursInTarget: Math.round(totalHoursInTarget),
  };
}

/* ============================================================
   STAGE SELECTION SCREEN
============================================================ */
function StageSelectionScreen({
  examType,
  onSelect,
}: {
  examType: "JAM" | "NET_GATE";
  onSelect: (stageKey: string) => void;
}) {
  return (
    <div
      style={{ background: CREAM, minHeight: "100vh", padding: "2.5rem 2rem" }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "1.85rem",
            fontWeight: 700,
            color: CHARCOAL,
            margin: "0 0 0.4rem",
            fontFamily: "Playfair Display, Georgia, serif",
          }}
        >
          My Roadmap
        </h1>
        <p style={{ color: MUTED, margin: "0 0 0.3rem", fontSize: "0.95rem" }}>
          Set up your {examType === "NET_GATE" ? "CSIR NET/GATE" : "IIT JAM"}{" "}
          preparation roadmap.
        </p>
        <h2
          style={{
            fontSize: "1.15rem",
            fontWeight: 700,
            color: CHARCOAL,
            margin: "1.5rem 0 0.3rem",
          }}
        >
          What is your current academic stage?
        </h2>
        <p style={{ color: MUTED, fontSize: "0.85rem", margin: "0 0 1.5rem" }}>
          This sets your default preparation timeline. You can edit it anytime.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1rem",
          }}
        >
          {STAGE_PRESETS.map((stage) => (
            <button
              key={stage.key}
              onClick={() => onSelect(stage.key)}
              style={{
                background: CARD,
                border: `1.5px solid ${BORDER}`,
                borderRadius: 16,
                padding: "1.5rem",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = GOLD)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
            >
              <span style={{ fontSize: "1.8rem" }}>{stage.emoji}</span>
              <span
                style={{ fontWeight: 700, color: CHARCOAL, fontSize: "1rem" }}
              >
                {stage.title}
              </span>
              <span style={{ color: MUTED, fontSize: "0.8rem" }}>
                {stage.subtitle}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   EXPORTS for use by other parts of this file (Part 2)
============================================================ */
export {
  CREAM,
  CARD,
  SIDEBAR,
  CHARCOAL,
  GOLD,
  MUTED,
  BORDER,
  OLIVE,
  RED,
  getSubjects,
  STAGE_PRESETS,
  SPEED_MULTIPLIER,
  loadRoadmapV2,
  saveRoadmapV2,
  getCurrentUserId,
  loadSyllabusData,
  getSubjectCompletionPercent,
  computeScheduleV2,
  StageSelectionScreen,
};
export type {
  SubjectDef,
  UnavailablePeriodV2,
  VariableIntensityPeriodV2,
  LearningSpeed,
  StudyMode,
  SimultaneousSlotV2,
  RoadmapV2,
  ScheduleResultV2,
  SubjectScheduleResult,
  SyllabusData,
};

/* ============================================================
   OVERVIEW TAB
============================================================ */
function OverviewTabV2({
  rm,
  schedule,
}: {
  rm: RoadmapV2;
  schedule: ScheduleResultV2;
}) {
  const stage = STAGE_PRESETS.find((s) => s.key === rm.stageKey);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
        }}
      >
        {[
          {
            label: "Stage",
            value: `${stage?.emoji ?? ""} ${stage?.title ?? "—"}`,
            color: GOLD,
          },
          {
            label: "Start Date",
            value: format(parseISO(rm.startDate), "MMM d, yyyy"),
            color: CHARCOAL,
          },
          {
            label: "Estimated End",
            value: schedule.estimatedEndDate,
            color: schedule.feasible ? OLIVE : RED,
          },
          {
            label: "Hours Remaining",
            value: `${schedule.totalEffectiveHoursRemaining} hrs`,
            color: CHARCOAL,
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 14,
              padding: "1.1rem",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: MUTED,
                marginBottom: "0.3rem",
              }}
            >
              {card.label}
            </div>
            <div
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                color: card.color,
              }}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: "1.25rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
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
            Timeline at a glance
          </h3>
          <span
            style={{
              fontSize: "0.78rem",
              color: schedule.feasible ? OLIVE : RED,
              fontWeight: 600,
            }}
          >
            {schedule.feasible ? "✅ On track" : "⚠️ Needs more time"}
          </span>
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
        >
          {schedule.perSubject.map((s) => (
            <div
              key={s.subject.id}
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <span
                style={{
                  flex: "0 0 160px",
                  fontSize: "0.85rem",
                  color: CHARCOAL,
                  fontWeight: 600,
                }}
              >
                {s.subject.name}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  background: BORDER,
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${s.completionPercent}%`,
                    height: "100%",
                    background: GOLD,
                  }}
                />
              </div>
              <span
                style={{
                  flex: "0 0 90px",
                  fontSize: "0.75rem",
                  color: MUTED,
                  textAlign: "right",
                }}
              >
                {s.completionPercent}% · {s.remainingHours}h left
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MY PROGRESS TAB (syllabus tracker mirror)
============================================================ */
function MyProgressTabV2({
  rm,
  syllabus,
}: {
  rm: RoadmapV2;
  syllabus: SyllabusData;
}) {
  const subjects = getSubjects(rm.examType);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <p style={{ color: MUTED, fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
        This mirrors your Syllabus Tracker. Mark subtopics there — progress
        updates here automatically.
      </p>
      {subjects.map((subj) => {
        const pct = getSubjectCompletionPercent(syllabus, subj.id);
        return (
          <div
            key={subj.id}
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 14,
              padding: "1rem 1.25rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{ fontWeight: 700, color: CHARCOAL, fontSize: "0.9rem" }}
              >
                {subj.name}
              </span>
              <span style={{ fontSize: "0.8rem", color: MUTED }}>
                {pct}% complete
              </span>
            </div>
            <div
              style={{
                height: 8,
                background: BORDER,
                borderRadius: 10,
                overflow: "hidden",
                marginTop: "0.5rem",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: pct === 100 ? OLIVE : GOLD,
                }}
              />
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: MUTED,
                marginTop: "0.35rem",
              }}
            >
              {subj.totalHours} total hours ·{" "}
              {Math.round(subj.totalHours * (1 - pct / 100) * 10) / 10}h
              remaining
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   STUDY SCHEDULE PLANNER (top of My Schedule tab)
============================================================ */
function StudySchedulePlannerV2({
  rm,
  schedule,
  onUpdate,
}: {
  rm: RoadmapV2;
  schedule: ScheduleResultV2;
  onUpdate: (patch: Partial<RoadmapV2>) => void;
}) {
  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: "1.25rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.4rem",
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
          Study Schedule Planner
        </h3>
        <span
          style={{
            fontSize: "0.72rem",
            color: GOLD,
            fontWeight: 700,
            background: `${GOLD}1A`,
            borderRadius: 20,
            padding: "0.2rem 0.6rem",
          }}
        >
          ⚡ Auto-updates with syllabus
        </span>
      </div>
      <p style={{ color: MUTED, fontSize: "0.82rem", margin: "0 0 1.25rem" }}>
        Set your availability once. Schedule auto-recalculates whenever your
        syllabus progress changes or you adjust these inputs.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
        {[
          {
            label: "Study hours per day",
            value: rm.hoursPerDay,
            unit: "hrs",
            min: 0.5,
            max: 12,
            step: 0.5,
            key: "hoursPerDay" as const,
            lo: "0.5 hrs",
            hi: "12 hrs",
          },
          {
            label: "Study days per week",
            value: rm.daysPerWeek,
            unit: "days",
            min: 1,
            max: 7,
            step: 1,
            key: "daysPerWeek" as const,
            lo: "1 day",
            hi: "7 days",
          },
          {
            label: "Target completion",
            value: rm.targetMonths,
            unit: "months",
            min: 1,
            max: 36,
            step: 1,
            key: "targetMonths" as const,
            lo: "1 month",
            hi: "36 months",
          },
          {
            label: "Revision intensity",
            value: rm.revisionPercent,
            unit: "% of study time",
            min: 25,
            max: 100,
            step: 5,
            key: "revisionPercent" as const,
            lo: "25% (min)",
            hi: "100% (intensive)",
          },
        ].map((field) => (
          <div key={field.key}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.3rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: CHARCOAL,
                }}
              >
                {field.label}
              </span>
              <span
                style={{ fontSize: "0.85rem", fontWeight: 700, color: GOLD }}
              >
                {field.value} {field.unit}
              </span>
            </div>
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={field.value}
              onChange={(e) =>
                onUpdate({
                  [field.key]: parseFloat(e.target.value),
                } as Partial<RoadmapV2>)
              }
              style={{ width: "100%", accentColor: GOLD }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.7rem",
                color: MUTED,
                marginTop: "0.15rem",
              }}
            >
              <span>{field.lo}</span>
              <span>{field.hi}</span>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.75rem",
          marginTop: "1.25rem",
        }}
      >
        {[
          { label: "Per Week", value: `${schedule.weeklyHoursAvailable} hrs` },
          {
            label: "Per Month",
            value: `${schedule.monthlyHoursAvailable} hrs`,
          },
          {
            label: "In Target",
            value: `${schedule.totalHoursInTarget} hrs total`,
          },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              background: CREAM,
              borderRadius: 12,
              padding: "0.75rem",
              textAlign: "center",
            }}
          >
            <div
              style={{ fontSize: "1.1rem", fontWeight: 700, color: CHARCOAL }}
            >
              {c.value}
            </div>
            <div style={{ fontSize: "0.72rem", color: MUTED }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "1.25rem",
          padding: "1rem",
          borderRadius: 12,
          background: schedule.feasible ? `${OLIVE}14` : `${RED}14`,
          border: `1px solid ${schedule.feasible ? OLIVE : RED}`,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            color: CHARCOAL,
            fontSize: "0.85rem",
            marginBottom: "0.5rem",
          }}
        >
          What You Can Complete
        </div>
        <p style={{ fontSize: "0.82rem", color: MUTED, margin: "0 0 0.6rem" }}>
          With {rm.hoursPerDay} hrs/day × {rm.daysPerWeek} days/week for{" "}
          {rm.targetMonths} months, factoring in your syllabus progress:
        </p>
        <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.6rem" }}>
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color: GOLD }}>
              {schedule.fullyCompletableCount}
            </div>
            <div style={{ fontSize: "0.7rem", color: MUTED }}>
              Fully Complete
            </div>
          </div>
          <div>
            <div
              style={{ fontSize: "1.4rem", fontWeight: 700, color: CHARCOAL }}
            >
              {schedule.minMonthsNeeded} mo
            </div>
            <div style={{ fontSize: "0.7rem", color: MUTED }}>
              Minimum Needed
            </div>
          </div>
        </div>
        <p
          style={{
            fontSize: "0.82rem",
            fontWeight: 600,
            color: schedule.feasible ? OLIVE : RED,
            margin: 0,
          }}
        >
          {schedule.feasible
            ? `✅ You can complete the remaining syllabus in ${rm.targetMonths} months at this pace!`
            : `⚠️ At this pace you'll need about ${schedule.minMonthsNeeded} months — consider increasing hours or extending your target.`}
        </p>
      </div>
    </div>
  );
}

export { OverviewTabV2, MyProgressTabV2, StudySchedulePlannerV2 };

/* ============================================================
   UNAVAILABLE PERIODS
============================================================ */
function UnavailablePeriodsV2({
  periods,
  onChange,
}: {
  periods: UnavailablePeriodV2[];
  onChange: (p: UnavailablePeriodV2[]) => void;
}) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ reason: "", startDate: "", endDate: "" });

  function add() {
    if (!form.reason || !form.startDate || !form.endDate) return;
    onChange([...periods, { id: `${Date.now()}`, ...form }]);
    setForm({ reason: "", startDate: "", endDate: "" });
    setShow(false);
  }

  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: "1.25rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: CHARCOAL,
              margin: 0,
            }}
          >
            ⏸ Unavailable Periods
          </h3>
          <p
            style={{ fontSize: "0.78rem", color: MUTED, margin: "0.2rem 0 0" }}
          >
            Add periods when you cannot study. These pause your schedule and
            push your end date forward.
          </p>
        </div>
        <button
          onClick={() => setShow((s) => !s)}
          style={{
            background: GOLD,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "0.5rem 0.9rem",
            fontWeight: 600,
            fontSize: "0.82rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          + Add Unavailable Period
        </button>
      </div>

      {show && (
        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
          }}
        >
          <input
            placeholder="Reason"
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            style={{
              padding: "0.55rem 0.8rem",
              borderRadius: 10,
              border: `1.5px solid ${BORDER}`,
              background: CREAM,
              fontSize: "0.85rem",
              outline: "none",
            }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.6rem",
            }}
          >
            <input
              type="date"
              value={form.startDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, startDate: e.target.value }))
              }
              style={{
                padding: "0.55rem 0.8rem",
                borderRadius: 10,
                border: `1.5px solid ${BORDER}`,
                background: CREAM,
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
            <input
              type="date"
              value={form.endDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, endDate: e.target.value }))
              }
              style={{
                padding: "0.55rem 0.8rem",
                borderRadius: 10,
                border: `1.5px solid ${BORDER}`,
                background: CREAM,
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={add}
              style={{
                flex: 1,
                background: GOLD,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "0.6rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Save
            </button>
            <button
              onClick={() => setShow(false)}
              style={{
                flex: 1,
                background: CREAM,
                color: MUTED,
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "0.6rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {periods.length > 0 && (
        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {periods.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: CREAM,
                borderRadius: 10,
                padding: "0.6rem 0.9rem",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    color: CHARCOAL,
                  }}
                >
                  {p.reason}
                </div>
                <div style={{ fontSize: "0.72rem", color: MUTED }}>
                  {format(parseISO(p.startDate), "MMM d")} –{" "}
                  {format(parseISO(p.endDate), "MMM d, yyyy")}
                </div>
              </div>
              <button
                onClick={() => onChange(periods.filter((x) => x.id !== p.id))}
                style={{
                  background: "none",
                  border: "none",
                  color: RED,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   VARIABLE INTENSITY PERIODS
============================================================ */
function VariableIntensityV2({
  periods,
  onChange,
}: {
  periods: VariableIntensityPeriodV2[];
  onChange: (p: VariableIntensityPeriodV2[]) => void;
}) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    reason: "",
    startDate: "",
    endDate: "",
    extraHoursPerDay: 1,
  });

  function add() {
    if (!form.reason || !form.startDate || !form.endDate) return;
    onChange([...periods, { id: `${Date.now()}`, ...form }]);
    setForm({ reason: "", startDate: "", endDate: "", extraHoursPerDay: 1 });
    setShow(false);
  }

  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: "1.25rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: CHARCOAL,
              margin: 0,
            }}
          >
            ⚡ Variable Intensity Periods
          </h3>
          <p
            style={{ fontSize: "0.78rem", color: MUTED, margin: "0.2rem 0 0" }}
          >
            Add periods when you can study more than usual — holidays, breaks,
            etc.
          </p>
        </div>
        <button
          onClick={() => setShow((s) => !s)}
          style={{
            background: GOLD,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "0.5rem 0.9rem",
            fontWeight: 600,
            fontSize: "0.82rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          + Add Variable Intensity Period
        </button>
      </div>

      {show && (
        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
          }}
        >
          <input
            placeholder="Reason"
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            style={{
              padding: "0.55rem 0.8rem",
              borderRadius: 10,
              border: `1.5px solid ${BORDER}`,
              background: CREAM,
              fontSize: "0.85rem",
              outline: "none",
            }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.6rem",
            }}
          >
            <input
              type="date"
              value={form.startDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, startDate: e.target.value }))
              }
              style={{
                padding: "0.55rem 0.8rem",
                borderRadius: 10,
                border: `1.5px solid ${BORDER}`,
                background: CREAM,
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
            <input
              type="date"
              value={form.endDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, endDate: e.target.value }))
              }
              style={{
                padding: "0.55rem 0.8rem",
                borderRadius: 10,
                border: `1.5px solid ${BORDER}`,
                background: CREAM,
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.8rem", color: MUTED }}>
              Extra hours per day: {form.extraHoursPerDay}
            </label>
            <input
              type="range"
              min={0.5}
              max={8}
              step={0.5}
              value={form.extraHoursPerDay}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  extraHoursPerDay: parseFloat(e.target.value),
                }))
              }
              style={{ width: "100%", accentColor: GOLD }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={add}
              style={{
                flex: 1,
                background: GOLD,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "0.6rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Save
            </button>
            <button
              onClick={() => setShow(false)}
              style={{
                flex: 1,
                background: CREAM,
                color: MUTED,
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "0.6rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {periods.length > 0 && (
        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {periods.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: CREAM,
                borderRadius: 10,
                padding: "0.6rem 0.9rem",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    color: CHARCOAL,
                  }}
                >
                  {p.reason} (+{p.extraHoursPerDay}h/day)
                </div>
                <div style={{ fontSize: "0.72rem", color: MUTED }}>
                  {format(parseISO(p.startDate), "MMM d")} –{" "}
                  {format(parseISO(p.endDate), "MMM d, yyyy")}
                </div>
              </div>
              <button
                onClick={() => onChange(periods.filter((x) => x.id !== p.id))}
                style={{
                  background: "none",
                  border: "none",
                  color: RED,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   TOPIC LEARNING SPEED
============================================================ */
function TopicLearningSpeedV2({
  examType,
  topicSpeed,
  onChange,
}: {
  examType: "JAM" | "NET_GATE";
  topicSpeed: Record<string, LearningSpeed>;
  onChange: (m: Record<string, LearningSpeed>) => void;
}) {
  const subjects = getSubjects(examType);
  const SPEEDS: { key: LearningSpeed; label: string; desc: string }[] = [
    { key: "slow", label: "🐢 Slow", desc: "+40% time" },
    { key: "normal", label: "🚶 Normal", desc: "standard time" },
    { key: "fast", label: "⚡ Fast", desc: "75% of time" },
  ];
  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: "1.25rem",
      }}
    >
      <h3
        style={{
          fontSize: "1rem",
          fontWeight: 700,
          color: CHARCOAL,
          margin: "0 0 0.3rem",
        }}
      >
        🎯 Topic Learning Speed
      </h3>
      <p style={{ fontSize: "0.78rem", color: MUTED, margin: "0 0 1rem" }}>
        Set your learning speed per subject. Slow adds 40% more time, Fast needs
        only 75% of the time.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {subjects.map((subj) => {
          const current = topicSpeed[subj.id] ?? "normal";
          return (
            <div
              key={subj.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  color: CHARCOAL,
                  fontSize: "0.85rem",
                  flex: "1 1 140px",
                }}
              >
                {subj.name}
              </span>
              <div style={{ display: "flex", gap: "0.35rem" }}>
                {SPEEDS.map((sp) => (
                  <button
                    key={sp.key}
                    onClick={() =>
                      onChange({ ...topicSpeed, [subj.id]: sp.key })
                    }
                    title={sp.desc}
                    style={{
                      background: current === sp.key ? GOLD : CREAM,
                      color: current === sp.key ? "#fff" : MUTED,
                      border: `1.5px solid ${current === sp.key ? GOLD : BORDER}`,
                      borderRadius: 8,
                      padding: "0.35rem 0.65rem",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {sp.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   SUBJECT STUDY ORDER (drag & drop)
============================================================ */
function SubjectOrderV2({
  examType,
  order,
  onChange,
}: {
  examType: "JAM" | "NET_GATE";
  order: string[];
  onChange: (ids: string[]) => void;
}) {
  const subjects = getSubjects(examType);
  const orderedIds = order.length > 0 ? order : subjects.map((s) => s.id);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function move(from: number, to: number) {
    const next = [...orderedIds];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: "1.25rem",
      }}
    >
      <h3
        style={{
          fontSize: "1rem",
          fontWeight: 700,
          color: CHARCOAL,
          margin: "0 0 0.3rem",
        }}
      >
        🔢 Subject Study Order
      </h3>
      <p style={{ fontSize: "0.78rem", color: MUTED, margin: "0 0 1rem" }}>
        Drag to reorder which subject you study first.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {orderedIds.map((id, idx) => {
          const subj = subjects.find((s) => s.id === id);
          if (!subj) return null;
          return (
            <div
              key={id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIdx !== null && dragIdx !== idx) move(dragIdx, idx);
                setDragIdx(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                background: CREAM,
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "0.6rem 0.9rem",
                cursor: "grab",
                opacity: dragIdx === idx ? 0.5 : 1,
              }}
            >
              <span style={{ color: MUTED, fontSize: "0.8rem" }}>⠿</span>
              <span
                style={{
                  fontWeight: 700,
                  color: GOLD,
                  fontSize: "0.85rem",
                  flex: "0 0 24px",
                }}
              >
                {idx + 1}
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color: CHARCOAL,
                  fontSize: "0.88rem",
                }}
              >
                {subj.name}
              </span>
              <div
                style={{ marginLeft: "auto", display: "flex", gap: "0.3rem" }}
              >
                <button
                  disabled={idx === 0}
                  onClick={() => move(idx, idx - 1)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: idx === 0 ? "default" : "pointer",
                    color: idx === 0 ? BORDER : MUTED,
                    fontSize: "0.9rem",
                  }}
                >
                  ↑
                </button>
                <button
                  disabled={idx === orderedIds.length - 1}
                  onClick={() => move(idx, idx + 1)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor:
                      idx === orderedIds.length - 1 ? "default" : "pointer",
                    color: idx === orderedIds.length - 1 ? BORDER : MUTED,
                    fontSize: "0.9rem",
                  }}
                >
                  ↓
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export {
  UnavailablePeriodsV2,
  VariableIntensityV2,
  TopicLearningSpeedV2,
  SubjectOrderV2,
};

/* ============================================================
   SIMULTANEOUS STUDIES
============================================================ */
function SimultaneousStudiesV2({
  examType,
  slots,
  onChange,
}: {
  examType: "JAM" | "NET_GATE";
  slots: SimultaneousSlotV2[];
  onChange: (s: SimultaneousSlotV2[]) => void;
}) {
  const subjects = getSubjects(examType);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    label: "",
    startDate: "",
    endDate: "",
    indefinite: false,
    mode: "single" as StudyMode,
    subjectIds: [] as string[],
    hoursPerSubject: {} as Record<string, number>,
  });

  function toggleSubject(id: string) {
    setForm((f) => ({
      ...f,
      subjectIds: f.subjectIds.includes(id)
        ? f.subjectIds.filter((x) => x !== id)
        : [...f.subjectIds, id],
    }));
  }

  function add() {
    if (!form.label || !form.startDate) return;
    if (!form.indefinite && !form.endDate) return;
    if (form.mode === "multiple" && form.subjectIds.length < 2) return;

    const newSlot: SimultaneousSlotV2 = {
      id: `${Date.now()}`,
      label: form.label,
      startDate: form.startDate,
      endDate: form.indefinite ? "indefinite" : form.endDate,
      mode: form.mode,
      subjectIds: form.subjectIds,
      hoursPerSubject: form.hoursPerSubject,
    };
    onChange([...slots, newSlot]);
    setForm({
      label: "",
      startDate: "",
      endDate: "",
      indefinite: false,
      mode: "single",
      subjectIds: [],
      hoursPerSubject: {},
    });
    setShow(false);
  }

  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: "1.25rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: CHARCOAL,
              margin: 0,
            }}
          >
            📚 Simultaneous Studies
          </h3>
          <p
            style={{ fontSize: "0.78rem", color: MUTED, margin: "0.2rem 0 0" }}
          >
            {slots.length === 0
              ? "Sequential by default — add a slot to study topics together"
              : `${slots.length} slot${slots.length > 1 ? "s" : ""} configured`}
          </p>
        </div>
        <button
          onClick={() => setShow((s) => !s)}
          style={{
            background: GOLD,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "0.5rem 0.9rem",
            fontWeight: 600,
            fontSize: "0.82rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          + Add Simultaneous Study Slot
        </button>
      </div>

      {show && (
        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div>
            <label
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: CHARCOAL,
                display: "block",
                marginBottom: "0.3rem",
              }}
            >
              Label
            </label>
            <input
              value={form.label}
              onChange={(e) =>
                setForm((f) => ({ ...f, label: e.target.value }))
              }
              placeholder="e.g. Linear Algebra + Real Analysis"
              style={{
                width: "100%",
                padding: "0.55rem 0.8rem",
                borderRadius: 10,
                border: `1.5px solid ${BORDER}`,
                background: CREAM,
                fontSize: "0.85rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.6rem",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: CHARCOAL,
                  display: "block",
                  marginBottom: "0.3rem",
                }}
              >
                Start date
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
                style={{
                  width: "100%",
                  padding: "0.55rem 0.8rem",
                  borderRadius: 10,
                  border: `1.5px solid ${BORDER}`,
                  background: CREAM,
                  fontSize: "0.85rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: CHARCOAL,
                  display: "block",
                  marginBottom: "0.3rem",
                }}
              >
                End date
              </label>
              <input
                type="date"
                disabled={form.indefinite}
                value={form.endDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
                style={{
                  width: "100%",
                  padding: "0.55rem 0.8rem",
                  borderRadius: 10,
                  border: `1.5px solid ${BORDER}`,
                  background: form.indefinite ? BORDER : CREAM,
                  fontSize: "0.85rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.indefinite}
              onChange={(e) =>
                setForm((f) => ({ ...f, indefinite: e.target.checked }))
              }
              style={{ accentColor: GOLD }}
            />
            <span style={{ fontSize: "0.82rem", color: MUTED }}>
              Continue indefinitely (no end date)
            </span>
          </label>

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
              Study mode
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setForm((f) => ({ ...f, mode: "single" }))}
                style={{
                  flex: 1,
                  background: form.mode === "single" ? GOLD : CREAM,
                  color: form.mode === "single" ? "#fff" : MUTED,
                  border: `1.5px solid ${form.mode === "single" ? GOLD : BORDER}`,
                  borderRadius: 10,
                  padding: "0.55rem",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                📖 One topic at a time
              </button>
              <button
                onClick={() => setForm((f) => ({ ...f, mode: "multiple" }))}
                style={{
                  flex: 1,
                  background: form.mode === "multiple" ? GOLD : CREAM,
                  color: form.mode === "multiple" ? "#fff" : MUTED,
                  border: `1.5px solid ${form.mode === "multiple" ? GOLD : BORDER}`,
                  borderRadius: 10,
                  padding: "0.55rem",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                📚 Multiple topics
              </button>
            </div>
          </div>

          {form.mode === "multiple" && (
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
                Select subjects (pick 2 or more)
              </label>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.4rem",
                  marginBottom: "0.75rem",
                }}
              >
                {subjects.map((subj) => {
                  const selected = form.subjectIds.includes(subj.id);
                  return (
                    <button
                      key={subj.id}
                      onClick={() => toggleSubject(subj.id)}
                      style={{
                        background: selected ? CHARCOAL : CREAM,
                        color: selected ? "#fff" : MUTED,
                        border: `1.5px solid ${selected ? CHARCOAL : BORDER}`,
                        borderRadius: 20,
                        padding: "0.3rem 0.7rem",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {subj.name}
                    </button>
                  );
                })}
              </div>

              {form.subjectIds.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                  }}
                >
                  <label
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: MUTED,
                    }}
                  >
                    Hours per day for each subject:
                  </label>
                  {form.subjectIds.map((sid) => {
                    const subj = subjects.find((s) => s.id === sid);
                    return (
                      <div
                        key={sid}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          background: CREAM,
                          borderRadius: 10,
                          padding: "0.5rem 0.8rem",
                        }}
                      >
                        <span
                          style={{
                            flex: 1,
                            fontSize: "0.82rem",
                            color: CHARCOAL,
                            fontWeight: 600,
                          }}
                        >
                          {subj?.name}
                        </span>
                        <input
                          type="number"
                          min={0.5}
                          max={12}
                          step={0.5}
                          value={form.hoursPerSubject[sid] ?? ""}
                          placeholder="hrs/day"
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              hoursPerSubject: {
                                ...f.hoursPerSubject,
                                [sid]: parseFloat(e.target.value) || 0,
                              },
                            }))
                          }
                          style={{
                            width: 80,
                            padding: "0.35rem 0.5rem",
                            borderRadius: 8,
                            border: `1.5px solid ${BORDER}`,
                            background: CARD,
                            fontSize: "0.8rem",
                            outline: "none",
                            textAlign: "center",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
            <button
              onClick={add}
              style={{
                flex: 1,
                background: GOLD,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "0.65rem",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              Add Simultaneous Study Period
            </button>
            <button
              onClick={() => setShow(false)}
              style={{
                flex: 1,
                background: CREAM,
                color: MUTED,
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "0.65rem",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {slots.length > 0 && (
        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {slots.map((s) => (
            <div
              key={s.id}
              style={{
                background: CREAM,
                borderRadius: 10,
                padding: "0.7rem 0.9rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      color: CHARCOAL,
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: MUTED,
                      marginTop: "0.15rem",
                    }}
                  >
                    {format(parseISO(s.startDate), "MMM d")} –{" "}
                    {s.endDate === "indefinite"
                      ? "Indefinitely"
                      : format(parseISO(s.endDate), "MMM d, yyyy")}
                    {" · "}
                    {s.mode === "multiple"
                      ? "📚 Multiple topics"
                      : "📖 One at a time"}
                  </div>
                  {s.mode === "multiple" && s.subjectIds.length > 0 && (
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: GOLD,
                        marginTop: "0.25rem",
                        fontWeight: 600,
                      }}
                    >
                      {s.subjectIds
                        .map((id) => {
                          const subj = subjects.find((x) => x.id === id);
                          return `${subj?.name ?? id} (${s.hoursPerSubject[id] ?? 0}h/day)`;
                        })
                        .join("  •  ")}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onChange(slots.filter((x) => x.id !== s.id))}
                  style={{
                    background: "none",
                    border: "none",
                    color: RED,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { SimultaneousStudiesV2 };

/* ============================================================
   MY SCHEDULE TAB (wraps all schedule sub-sections)
============================================================ */
function MyScheduleTabV2({
  rm,
  schedule,
  onUpdate,
  onUpdateArr,
}: {
  rm: RoadmapV2;
  schedule: ScheduleResultV2;
  onUpdate: (patch: Partial<RoadmapV2>) => void;
  onUpdateArr: <K extends keyof RoadmapV2>(key: K, value: RoadmapV2[K]) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <StudySchedulePlannerV2 rm={rm} schedule={schedule} onUpdate={onUpdate} />
      <UnavailablePeriodsV2
        periods={rm.unavailablePeriods}
        onChange={(p) => onUpdateArr("unavailablePeriods", p)}
      />
      <VariableIntensityV2
        periods={rm.variableIntensityPeriods}
        onChange={(p) => onUpdateArr("variableIntensityPeriods", p)}
      />
      <TopicLearningSpeedV2
        examType={rm.examType}
        topicSpeed={rm.topicSpeed}
        onChange={(m) => onUpdateArr("topicSpeed", m)}
      />
      <SubjectOrderV2
        examType={rm.examType}
        order={rm.subjectOrder}
        onChange={(ids) => onUpdateArr("subjectOrder", ids)}
      />
      <SimultaneousStudiesV2
        examType={rm.examType}
        slots={rm.simSlots}
        onChange={(s) => onUpdateArr("simSlots", s)}
      />
    </div>
  );
}

/* ============================================================
   MAIN PAGE COMPONENT
============================================================ */
export default function RoadmapV2Page() {
  const { user } = useAuth();
  const examType = (((user as any)?.exam_type as string | null) ?? "JAM") as
    | "JAM"
    | "NET_GATE";
  const uid = getCurrentUserId(user?.id ? String(user.id) : undefined);

  const [rm, setRm] = useState<RoadmapV2 | null>(null);
  const [syllabus, setSyllabus] = useState<SyllabusData>({});
  const [activeTab, setActiveTab] = useState<
    "overview" | "progress" | "schedule"
  >("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    const loaded = loadRoadmapV2(uid);
    setRm(loaded);
    setSyllabus(loadSyllabusData(uid));
    setLoading(false);
  }, [uid]);

  function handleStageSelect(stageKey: string) {
    const stage = STAGE_PRESETS.find((s) => s.key === stageKey);
    const newRm: RoadmapV2 = {
      stageKey,
      examType,
      startDate: format(new Date(), "yyyy-MM-dd"),
      hoursPerDay: 2.5,
      daysPerWeek: 5,
      targetMonths: stage?.defaultMonths ?? 12,
      revisionPercent: 30,
      unavailablePeriods: [],
      variableIntensityPeriods: [],
      topicSpeed: {},
      subjectOrder: getSubjects(examType).map((s) => s.id),
      simSlots: [],
    };
    setRm(newRm);
    saveRoadmapV2(uid, newRm);
  }

  function updatePatch(patch: Partial<RoadmapV2>) {
    if (!rm) return;
    const next = { ...rm, ...patch };
    setRm(next);
    saveRoadmapV2(uid, next);
  }

  function updateArrField<K extends keyof RoadmapV2>(
    key: K,
    value: RoadmapV2[K],
  ) {
    if (!rm) return;
    const next = { ...rm, [key]: value };
    setRm(next);
    saveRoadmapV2(uid, next);
  }

  if (loading) {
    return (
      <div
        style={{
          background: CREAM,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: MUTED,
        }}
      >
        Loading...
      </div>
    );
  }

  if (!rm) {
    return (
      <StageSelectionScreen examType={examType} onSelect={handleStageSelect} />
    );
  }

  const schedule = computeScheduleV2(rm, syllabus);
  const stage = STAGE_PRESETS.find((s) => s.key === rm.stageKey);

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "2rem" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                color: CHARCOAL,
                margin: 0,
                fontFamily: "Playfair Display, Georgia, serif",
              }}
            >
              My Roadmap{" "}
              <span style={{ fontSize: "1rem", color: MUTED, fontWeight: 500 }}>
                (v2 — hours-based)
              </span>
            </h1>
            <p
              style={{
                color: MUTED,
                margin: "0.3rem 0 0",
                fontSize: "0.88rem",
              }}
            >
              {stage?.emoji} {stage?.title} ·{" "}
              {examType === "NET_GATE" ? "CSIR NET/GATE" : "IIT JAM"}
            </p>
          </div>
          <button
            onClick={() => {
              if (confirm("Reset roadmap and choose a different stage?")) {
                localStorage.removeItem(lsKey(uid));
                setRm(null);
              }
            }}
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "0.5rem 0.9rem",
              fontSize: "0.8rem",
              color: MUTED,
              cursor: "pointer",
            }}
          >
            Change Stage
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            background: SIDEBAR,
            borderRadius: 12,
            padding: "0.3rem",
            marginBottom: "1.5rem",
            width: "fit-content",
          }}
        >
          {[
            { key: "overview" as const, label: "Overview" },
            { key: "progress" as const, label: "My Progress" },
            { key: "schedule" as const, label: "My Schedule" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: activeTab === tab.key ? CHARCOAL : "transparent",
                color: activeTab === tab.key ? "#fff" : MUTED,
                border: "none",
                borderRadius: 8,
                padding: "0.5rem 1.1rem",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <OverviewTabV2 rm={rm} schedule={schedule} />
        )}
        {activeTab === "progress" && (
          <MyProgressTabV2 rm={rm} syllabus={syllabus} />
        )}
        {activeTab === "schedule" && (
          <MyScheduleTabV2
            rm={rm}
            schedule={schedule}
            onUpdate={updatePatch}
            onUpdateArr={updateArrField}
          />
        )}
      </div>
    </div>
  );
}
