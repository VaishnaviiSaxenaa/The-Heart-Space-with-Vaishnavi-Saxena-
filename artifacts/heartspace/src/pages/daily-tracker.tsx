import { useState } from "react";
import { saveDailyToDB } from "../lib/supabase-sync";
import { useAuth } from "../lib/auth";
import { format } from "date-fns";
import {
  Moon,
  Zap,
  BookOpen,
  Brain,
  Save,
  Heart,
  Plus,
  Trash2,
  Sun,
  Battery,
  Target,
  Calendar,
  FileText,
} from "lucide-react";

/* ─── Brand tokens ─────────────────────── */
const CREAM = "#FAF7F2";
const CHARCOAL = "#2C1810";
const GOLD = "#C9A96E";
const DARK = "#3D2314";
const CARD = "#FFFFFF";
const MUTED = "#8C7B70";
const BORDER = "#E8DDD0";
const SAGE = "#A8BFA3";
const OLIVE = "#6E8B6B";
const ROSE = "#D4A5A5";

/* ─── Constants ────────────────────────── */
const MOOD_EMOJIS = ["😞", "😕", "😐", "🙂", "😄"];
const MOOD_LABELS = ["Struggling", "Low", "Okay", "Good", "Great"];
const BASE_EMOTIONAL = [
  "Calm",
  "Anxious",
  "Motivated",
  "Tired",
  "Overwhelmed",
  "Focused",
  "Sad",
  "Excited",
  "Grateful",
  "Irritable",
];
const BASE_ACTIVITY = [
  "Running",
  "Walking",
  "Gym",
  "Yoga",
  "Swimming",
  "Cycling",
  "Sports",
];

const HOURS_24 = Array.from({ length: 49 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
});

/* ─── Memory keys ──────────────────────── */
function memKey(userId: string, type: string) {
  return `hs_mem_${type}_${userId}`;
}

function loadMemory(userId: string, type: string): string[] {
  try {
    const r = localStorage.getItem(memKey(userId, type));
    return r ? JSON.parse(r) : [];
  } catch {
    return [];
  }
}

function saveMemory(userId: string, type: string, items: string[]) {
  localStorage.setItem(memKey(userId, type), JSON.stringify(items));
}

/* ─── Types ────────────────────────────── */
type EnergyLevel = "high" | "medium" | "low";
interface EnergySlot {
  id: string;
  start: string;
  end: string;
}
type EnergySlots = Record<EnergyLevel, EnergySlot[]>;
interface Priority {
  id: string;
  text: string;
  done: boolean;
}
interface NextDayTask {
  id: string;
  text: string;
}

export interface DailyEntry {
  date: string;
  mood: number | null;
  note: string;
  sleepHours: number | null;
  sleepQuality: number | null;
  physicalActivity: boolean;
  activityType: string;
  meTimeMinutes: number | null;
  stressLevel: number | null;
  emotionalState: string[];
  energySlots: EnergySlots;
  studyHours: number | null;
  sittingCapacityHours: number | null;
  studyCapacityHours: number | null;
  priorities: Priority[];
  nextDayTasks: NextDayTask[];
}

/* ─── localStorage helpers ─────────────── */
function lsKey(userId: string) {
  return `hs_daily_${userId}`;
}

export function loadDailyAll(userId: string): Record<string, DailyEntry> {
  try {
    const r = localStorage.getItem(lsKey(userId));
    return r ? JSON.parse(r) : {};
  } catch {
    return {};
  }
}

function saveAll(userId: string, data: Record<string, DailyEntry>) {
  localStorage.setItem(lsKey(userId), JSON.stringify(data));
  saveDailyToDB(userId, data).catch(() => {});
}

function blank(date: string): DailyEntry {
  return {
    date,
    mood: null,
    note: "",
    sleepHours: null,
    sleepQuality: null,
    physicalActivity: false,
    activityType: "",
    meTimeMinutes: null,
    stressLevel: null,
    emotionalState: [],
    energySlots: { high: [], medium: [], low: [] },
    studyHours: null,
    sittingCapacityHours: null,
    studyCapacityHours: null,
    priorities: [],
    nextDayTasks: [],
  };
}

/* ─── Sub-components ───────────────────── */
function Divider() {
  return <div className="h-px" style={{ background: BORDER }} />;
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4" style={{ color: GOLD }} />
      <h3 className="font-semibold" style={{ color: CHARCOAL }}>
        {title}
      </h3>
    </div>
  );
}

function ScaleCircles({
  value,
  onChange,
  count = 5,
  colors,
}: {
  value: number | null;
  onChange: (v: number) => void;
  count?: number;
  colors?: string[];
}) {
  const cs = colors ?? ["#C0392B", "#E67E22", "#F1C40F", SAGE, "#27AE60"];
  return (
    <div className="flex gap-2">
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="w-10 h-10 rounded-full text-sm font-bold transition-all duration-150 hover:scale-110"
          style={{
            background: value === n ? cs[n - 1] : `${cs[n - 1]}22`,
            color: value === n ? "#fff" : cs[n - 1],
            border: `2px solid ${value === n ? cs[n - 1] : "transparent"}`,
            boxShadow: value === n ? `0 0 0 3px ${cs[n - 1]}33` : "none",
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

/* ─── Activity Selector with "Other" + memory ── */
function ActivitySelector({
  value,
  onChange,
  userId,
}: {
  value: string;
  onChange: (v: string) => void;
  userId: string;
}) {
  const customActivities = loadMemory(userId, "activities");
  const all = [...BASE_ACTIVITY, ...customActivities, "Other"];
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState("");

  function selectActivity(a: string) {
    if (a === "Other") {
      setShowCustom(true);
      return;
    }
    onChange(a);
    setShowCustom(false);
  }

  function saveCustom() {
    const t = customText.trim();
    if (!t) return;
    const existing = loadMemory(userId, "activities");
    if (!existing.includes(t)) {
      const updated = [...existing, t];
      saveMemory(userId, "activities", updated);
    }
    onChange(t);
    setCustomText("");
    setShowCustom(false);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {all.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => selectActivity(a)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={
              value === a
                ? { background: OLIVE, color: "#fff" }
                : { background: `${BORDER}88`, color: CHARCOAL }
            }
          >
            {a}
          </button>
        ))}
      </div>
      {showCustom && (
        <div className="flex gap-2 mt-2">
          <input
            autoFocus
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveCustom();
              if (e.key === "Escape") setShowCustom(false);
            }}
            placeholder="Type activity name…"
            className="flex-1 h-9 px-3 rounded-xl text-sm border-2 outline-none"
            style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }}
          />
          <button
            type="button"
            onClick={saveCustom}
            className="px-3 h-9 rounded-xl text-xs font-semibold"
            style={{ background: `${GOLD}28`, color: "#9A6010" }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowCustom(false)}
            className="px-3 h-9 rounded-xl text-xs font-semibold"
            style={{ background: BORDER, color: MUTED }}
          >
            Cancel
          </button>
        </div>
      )}
      {value && value !== "Other" && (
        <p className="text-xs mt-1" style={{ color: OLIVE }}>
          ✓ Selected: {value}
        </p>
      )}
    </div>
  );
}

/* ─── Emotional State with "Other" + memory ── */
function EmotionalStateSelector({
  value,
  onChange,
  userId,
  accentColor,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  userId: string;
  accentColor?: string;
}) {
  const accent = accentColor ?? DARK;
  const customEmotions = loadMemory(userId, "emotions");
  const all = [...BASE_EMOTIONAL, ...customEmotions, "Other"];
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState("");

  function toggleEmotion(opt: string) {
    if (opt === "Other") {
      setShowCustom(true);
      return;
    }
    const next = value.includes(opt)
      ? value.filter((e) => e !== opt)
      : [...value, opt];
    onChange(next);
  }

  function saveCustom() {
    const t = customText.trim();
    if (!t) return;
    const existing = loadMemory(userId, "emotions");
    if (!existing.includes(t)) {
      saveMemory(userId, "emotions", [...existing, t]);
    }
    if (!value.includes(t)) onChange([...value, t]);
    setCustomText("");
    setShowCustom(false);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {all.map((opt) => {
          const active = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggleEmotion(opt)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150"
              style={
                active
                  ? { background: accent, color: CREAM }
                  : { background: `${BORDER}88`, color: CHARCOAL }
              }
            >
              {opt}
            </button>
          );
        })}
      </div>
      {showCustom && (
        <div className="flex gap-2 mt-2">
          <input
            autoFocus
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveCustom();
              if (e.key === "Escape") setShowCustom(false);
            }}
            placeholder="Type emotional state…"
            className="flex-1 h-9 px-3 rounded-xl text-sm border-2 outline-none"
            style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }}
          />
          <button
            type="button"
            onClick={saveCustom}
            className="px-3 h-9 rounded-xl text-xs font-semibold"
            style={{ background: `${GOLD}28`, color: "#9A6010" }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowCustom(false)}
            className="px-3 h-9 rounded-xl text-xs font-semibold"
            style={{ background: BORDER, color: MUTED }}
          >
            Cancel
          </button>
        </div>
      )}
      <p className="text-[10px] mt-1" style={{ color: MUTED }}>
        Select all that apply
      </p>
    </div>
  );
}

/* ─── Energy Management ────────────────── */
function EnergyManager({
  slots,
  onChange,
}: {
  slots: EnergySlots;
  onChange: (s: EnergySlots) => void;
}) {
  const levels: {
    key: EnergyLevel;
    label: string;
    emoji: string;
    color: string;
    bg: string;
  }[] = [
    {
      key: "high",
      label: "High Energy",
      emoji: "🟢",
      color: OLIVE,
      bg: `${OLIVE}15`,
    },
    {
      key: "medium",
      label: "Medium Energy",
      emoji: "🟡",
      color: "#B8860B",
      bg: "#FFF8DC",
    },
    {
      key: "low",
      label: "Low Energy",
      emoji: "🔴",
      color: "#C0392B",
      bg: "#FDE8E8",
    },
  ];

  function addSlot(level: EnergyLevel) {
    onChange({
      ...slots,
      [level]: [
        ...slots[level],
        { id: `${Date.now()}`, start: "9:00 AM", end: "12:00 PM" },
      ],
    });
  }
  function removeSlot(level: EnergyLevel, id: string) {
    onChange({ ...slots, [level]: slots[level].filter((s) => s.id !== id) });
  }
  function updateSlot(
    level: EnergyLevel,
    id: string,
    field: "start" | "end",
    val: string,
  ) {
    onChange({
      ...slots,
      [level]: slots[level].map((s) =>
        s.id === id ? { ...s, [field]: val } : s,
      ),
    });
  }

  return (
    <div className="space-y-4">
      {levels.map(({ key, label, emoji, color, bg }) => (
        <div
          key={key}
          className="rounded-xl p-4"
          style={{ background: bg, border: `1px solid ${color}33` }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span>{emoji}</span>
              <span className="text-sm font-semibold" style={{ color }}>
                {label}
              </span>
            </div>
            <button
              type="button"
              onClick={() => addSlot(key)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{ background: `${color}22`, color }}
            >
              <Plus className="w-3 h-3" /> Add slot
            </button>
          </div>
          {slots[key].length === 0 && (
            <p className="text-xs" style={{ color: MUTED }}>
              No slots added. Click + Add slot.
            </p>
          )}
          <div className="space-y-2">
            {slots[key].map((slot) => (
              <div key={slot.id} className="flex items-center gap-2">
                <select
                  value={slot.start}
                  onChange={(e) =>
                    updateSlot(key, slot.id, "start", e.target.value)
                  }
                  className="flex-1 h-9 px-2 rounded-lg text-xs border outline-none"
                  style={{
                    background: CREAM,
                    borderColor: BORDER,
                    color: CHARCOAL,
                  }}
                >
                  {HOURS_24.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
                <span className="text-xs" style={{ color: MUTED }}>
                  to
                </span>
                <select
                  value={slot.end}
                  onChange={(e) =>
                    updateSlot(key, slot.id, "end", e.target.value)
                  }
                  className="flex-1 h-9 px-2 rounded-lg text-xs border outline-none"
                  style={{
                    background: CREAM,
                    borderColor: BORDER,
                    color: CHARCOAL,
                  }}
                >
                  {HOURS_24.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeSlot(key, slot.id)}
                  className="p-1.5 rounded-lg"
                  style={{ color: "#C0392B" }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Priorities ───────────────────────── */
function PrioritiesSection({
  priorities,
  onChange,
}: {
  priorities: Priority[];
  onChange: (p: Priority[]) => void;
}) {
  const [newText, setNewText] = useState("");
  function add() {
    const t = newText.trim();
    if (!t) return;
    onChange([...priorities, { id: `${Date.now()}`, text: t, done: false }]);
    setNewText("");
  }
  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="Add a priority for today…"
          className="flex-1 h-10 px-3 rounded-xl text-sm border-2 outline-none"
          style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }}
        />
        <button
          type="button"
          onClick={add}
          className="px-4 h-10 rounded-xl text-sm font-semibold"
          style={{ background: `${GOLD}28`, color: "#9A6010" }}
        >
          Add
        </button>
      </div>
      {priorities.length === 0 && (
        <p className="text-xs" style={{ color: MUTED }}>
          No priorities added yet.
        </p>
      )}
      <div className="space-y-2">
        {priorities.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: CREAM, border: `1px solid ${BORDER}` }}
          >
            <button
              type="button"
              onClick={() =>
                onChange(
                  priorities.map((x) =>
                    x.id === p.id ? { ...x, done: !x.done } : x,
                  ),
                )
              }
              className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              style={{
                borderColor: p.done ? OLIVE : BORDER,
                background: p.done ? OLIVE : "transparent",
              }}
            >
              {p.done && (
                <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                  <path
                    d="M1 3L3 5L7 1"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
            <span
              className="flex-1 text-sm"
              style={{
                color: p.done ? MUTED : CHARCOAL,
                textDecoration: p.done ? "line-through" : "none",
              }}
            >
              {p.text}
            </span>
            <button
              type="button"
              onClick={() => onChange(priorities.filter((x) => x.id !== p.id))}
              className="p-1 rounded-lg"
              style={{ color: "#C0392B" }}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Next Day Tasks ───────────────────── */
function NextDaySection({
  tasks,
  onChange,
}: {
  tasks: NextDayTask[];
  onChange: (t: NextDayTask[]) => void;
}) {
  const [newText, setNewText] = useState("");
  function add() {
    const t = newText.trim();
    if (!t) return;
    onChange([...tasks, { id: `${Date.now()}`, text: t }]);
    setNewText("");
  }
  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="Plan a task for tomorrow…"
          className="flex-1 h-10 px-3 rounded-xl text-sm border-2 outline-none"
          style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }}
        />
        <button
          type="button"
          onClick={add}
          className="px-4 h-10 rounded-xl text-sm font-semibold"
          style={{ background: `${GOLD}28`, color: "#9A6010" }}
        >
          Add
        </button>
      </div>
      {tasks.length === 0 && (
        <p className="text-xs" style={{ color: MUTED }}>
          No tasks planned for tomorrow yet.
        </p>
      )}
      <div className="space-y-2">
        {tasks.map((t, i) => (
          <div
            key={t.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: CREAM, border: `1px solid ${BORDER}` }}
          >
            <span
              className="text-xs font-bold flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: `${GOLD}22`, color: DARK }}
            >
              {i + 1}
            </span>
            <span className="flex-1 text-sm" style={{ color: CHARCOAL }}>
              {t.text}
            </span>
            <button
              type="button"
              onClick={() => onChange(tasks.filter((x) => x.id !== t.id))}
              className="p-1 rounded-lg"
              style={{ color: "#C0392B" }}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────── */
export default function DailyTracker() {
  const { user } = useAuth();
  const userId = String(user?.id ?? "guest");
  const space = (user as any)?.space as string | null;
  const today = new Date().toISOString().split("T")[0];

  const isZenith = space === "zenith";
  const isApex = space === "apex";
  const isHeartSpace = space === "heartspace";

  const [allEntries, setAllEntries] = useState<Record<string, DailyEntry>>(() =>
    loadDailyAll(userId),
  );
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<DailyEntry>(
    () => loadDailyAll(userId)[today] ?? blank(today),
  );

  const set =
    <K extends keyof DailyEntry>(k: K) =>
    (v: DailyEntry[K]) =>
      setForm((p) => ({ ...p, [k]: v }));

  function handleSave() {
    const next = { ...allEntries, [today]: { ...form, date: today } };
    setAllEntries(next);
    saveAll(userId, next);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const hasEntry = !!allEntries[today];
  const history = Object.values(allEntries).sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <div className="space-y-7 animate-in fade-in duration-500 max-w-2xl">
      {/* Header */}
      <div>
        <h1
          className="text-3xl font-serif font-bold"
          style={{ color: CHARCOAL }}
        >
          Daily Tracker
        </h1>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>
          {format(new Date(), "EEEE, MMMM d, yyyy")} ·{" "}
          {hasEntry ? "✓ Entry logged today" : "Log how you're doing"}
        </p>
        <div className="mt-2">
          <span
            className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
            style={{
              background: isZenith
                ? `${GOLD}22`
                : isApex
                  ? `${DARK}12`
                  : `${ROSE}33`,
              color: isZenith ? DARK : isApex ? DARK : "#8B3A3A",
            }}
          >
            {isZenith ? "🏆 Zenith" : isApex ? "⚡ Apex+" : "🌿 HeartSpace"}{" "}
            Daily Log
          </span>
        </div>
      </div>

      <div
        className="rounded-2xl p-6 space-y-7"
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          boxShadow: "0 4px 24px rgba(44,24,16,.08)",
        }}
      >
        {/* MOOD — all plans */}
        <section>
          <SectionHeader icon={Heart} title="How are you feeling today?" />
          <div className="flex gap-2">
            {MOOD_EMOJIS.map((emoji, idx) => {
              const val = idx + 1;
              const active = form.mood === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => set("mood")(active ? null : val)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl flex-1 transition-all duration-200 hover:scale-105"
                  style={{
                    background: active ? DARK : `${BORDER}55`,
                    border: `2px solid ${active ? DARK : "transparent"}`,
                    boxShadow: active
                      ? "0 4px 14px rgba(61,35,20,.25)"
                      : "none",
                  }}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span
                    className="text-[10px] font-semibold leading-tight text-center"
                    style={{ color: active ? CREAM : MUTED }}
                  >
                    {MOOD_LABELS[idx]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* SLEEP — Zenith + HeartSpace */}
        {(isZenith || isHeartSpace) && (
          <>
            <Divider />
            <section>
              <SectionHeader icon={Moon} title="Sleep" />
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label
                    className="text-xs font-semibold mb-2 block"
                    style={{ color: MUTED }}
                  >
                    Hours of sleep (0–24)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={form.sleepHours ?? ""}
                    onChange={(e) =>
                      set("sleepHours")(
                        e.target.value
                          ? Math.min(24, parseFloat(e.target.value))
                          : null,
                      )
                    }
                    placeholder="e.g. 7.5"
                    className="w-full h-11 px-4 rounded-xl text-sm border-2 outline-none"
                    style={{
                      background: CREAM,
                      borderColor: BORDER,
                      color: CHARCOAL,
                    }}
                  />
                </div>
                <div>
                  <label
                    className="text-xs font-semibold mb-2 block"
                    style={{ color: MUTED }}
                  >
                    Sleep quality (1 = poor, 5 = great)
                  </label>
                  <ScaleCircles
                    value={form.sleepQuality}
                    onChange={set("sleepQuality")}
                  />
                </div>
              </div>
            </section>
          </>
        )}

        {/* PHYSICAL ACTIVITY — Zenith + HeartSpace */}
        {(isZenith || isHeartSpace) && (
          <>
            <Divider />
            <section>
              <SectionHeader icon={Zap} title="Physical Activity" />
              <div className="flex gap-2 mb-3">
                {["Yes ✓", "Not today"].map((label, i) => {
                  const isYes = i === 0;
                  const active = isYes
                    ? form.physicalActivity
                    : !form.physicalActivity;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        set("physicalActivity")(isYes);
                        if (!isYes) set("activityType")("");
                      }}
                      className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={
                        active
                          ? { background: isYes ? OLIVE : DARK, color: "#fff" }
                          : { background: `${BORDER}88`, color: MUTED }
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {form.physicalActivity && (
                <div>
                  <label
                    className="text-xs font-semibold mb-2 block"
                    style={{ color: MUTED }}
                  >
                    Activity type{" "}
                    <span style={{ color: MUTED }}>
                      (select or add your own)
                    </span>
                  </label>
                  <ActivitySelector
                    value={form.activityType}
                    onChange={set("activityType")}
                    userId={userId}
                  />
                </div>
              )}
            </section>
          </>
        )}

        {/* STUDY METRICS — Zenith + Apex+ */}
        {(isZenith || isApex) && (
          <>
            <Divider />
            <section>
              <SectionHeader icon={BookOpen} title="Study Metrics" />
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label
                    className="text-xs font-semibold mb-2 block"
                    style={{ color: MUTED }}
                  >
                    Study hours today (0–24)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={form.studyHours ?? ""}
                    onChange={(e) =>
                      set("studyHours")(
                        e.target.value
                          ? Math.min(24, parseFloat(e.target.value))
                          : null,
                      )
                    }
                    placeholder="e.g. 6"
                    className="w-full h-11 px-4 rounded-xl text-sm border-2 outline-none"
                    style={{
                      background: CREAM,
                      borderColor: BORDER,
                      color: CHARCOAL,
                    }}
                  />
                </div>
                <div>
                  <label
                    className="text-xs font-semibold mb-2 block"
                    style={{ color: MUTED }}
                  >
                    Sitting capacity{" "}
                    <span className="font-normal">(focus hrs)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={form.sittingCapacityHours ?? ""}
                    onChange={(e) =>
                      set("sittingCapacityHours")(
                        e.target.value
                          ? Math.min(24, parseFloat(e.target.value))
                          : null,
                      )
                    }
                    placeholder="e.g. 2"
                    className="w-full h-11 px-4 rounded-xl text-sm border-2 outline-none"
                    style={{
                      background: CREAM,
                      borderColor: BORDER,
                      color: CHARCOAL,
                    }}
                  />
                </div>
                <div>
                  <label
                    className="text-xs font-semibold mb-2 block"
                    style={{ color: MUTED }}
                  >
                    Study capacity{" "}
                    <span className="font-normal">(total hrs/day)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={form.studyCapacityHours ?? ""}
                    onChange={(e) =>
                      set("studyCapacityHours")(
                        e.target.value
                          ? Math.min(24, parseFloat(e.target.value))
                          : null,
                      )
                    }
                    placeholder="e.g. 8"
                    className="w-full h-11 px-4 rounded-xl text-sm border-2 outline-none"
                    style={{
                      background: CREAM,
                      borderColor: BORDER,
                      color: CHARCOAL,
                    }}
                  />
                  <p className="text-[10px] mt-1" style={{ color: MUTED }}>
                    💡 Increase by 30 mins each week
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ME TIME — Zenith + HeartSpace */}
        {(isZenith || isHeartSpace) && (
          <>
            <Divider />
            <section>
              <SectionHeader icon={Sun} title="Me Time" />
              <input
                type="number"
                min={0}
                max={1440}
                step={5}
                value={form.meTimeMinutes ?? ""}
                onChange={(e) =>
                  set("meTimeMinutes")(
                    e.target.value ? parseInt(e.target.value) : null,
                  )
                }
                placeholder="e.g. 30 minutes"
                className="w-full h-11 px-4 rounded-xl text-sm border-2 outline-none"
                style={{
                  background: CREAM,
                  borderColor: BORDER,
                  color: CHARCOAL,
                }}
              />
              <p className="text-[10px] mt-1" style={{ color: MUTED }}>
                Time for hobbies, relaxation, self-care — just for you
              </p>
            </section>
          </>
        )}

        {/* STRESS — Zenith only */}
        {isZenith && (
          <>
            <Divider />
            <section>
              <SectionHeader icon={Brain} title="Stress Level" />
              <ScaleCircles
                value={form.stressLevel}
                onChange={set("stressLevel")}
                colors={["#27AE60", SAGE, "#F1C40F", "#E67E22", "#C0392B"]}
              />
              <div
                className="flex justify-between text-[10px] mt-1"
                style={{ color: MUTED }}
              >
                <span>Very calm</span>
                <span>Very stressed</span>
              </div>
            </section>
          </>
        )}

        {/* EMOTIONAL STATE — Zenith + HeartSpace */}
        {(isZenith || isHeartSpace) && (
          <>
            <Divider />
            <section>
              <SectionHeader icon={Heart} title="Emotional State" />
              <EmotionalStateSelector
                value={form.emotionalState}
                onChange={set("emotionalState")}
                userId={userId}
                accentColor={isHeartSpace ? "#8B3A3A" : DARK}
              />
            </section>
          </>
        )}

        {/* ENERGY MANAGEMENT — Zenith only */}
        {isZenith && (
          <>
            <Divider />
            <section>
              <SectionHeader icon={Battery} title="Energy Management" />
              <p className="text-xs mb-4" style={{ color: MUTED }}>
                Mark your energy time slots to align your study schedule with
                your natural rhythms.
              </p>
              <EnergyManager
                slots={form.energySlots}
                onChange={set("energySlots")}
              />
            </section>
          </>
        )}

        {/* PRIORITIES — Zenith + Apex+ */}
        {(isZenith || isApex) && (
          <>
            <Divider />
            <section>
              <SectionHeader icon={Target} title="Today's Priorities" />
              <PrioritiesSection
                priorities={form.priorities}
                onChange={set("priorities")}
              />
            </section>
          </>
        )}

        {/* PLAN TOMORROW — Zenith + Apex+ */}
        {(isZenith || isApex) && (
          <>
            <Divider />
            <section>
              <SectionHeader icon={Calendar} title="Plan Tomorrow" />
              <p className="text-xs mb-3" style={{ color: MUTED }}>
                Plan the day before to start tomorrow with clarity.
              </p>
              <NextDaySection
                tasks={form.nextDayTasks}
                onChange={set("nextDayTasks")}
              />
            </section>
          </>
        )}

        {/* NOTE — all plans */}
        <Divider />
        <section>
          <SectionHeader
            icon={FileText}
            title={isHeartSpace ? "Daily Journal" : "Daily Note"}
          />
          <textarea
            rows={3}
            value={form.note}
            onChange={(e) => set("note")(e.target.value)}
            placeholder={
              isHeartSpace
                ? "How are you feeling? What's on your mind?"
                : "How was your day? Any wins, challenges, or reflections?"
            }
            className="w-full px-4 py-3 rounded-xl text-sm border-2 outline-none resize-none leading-relaxed"
            style={{ background: CREAM, borderColor: BORDER, color: CHARCOAL }}
          />
        </section>

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full h-12 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
          style={{
            background: saved
              ? OLIVE
              : `linear-gradient(135deg, #A07840 0%, ${GOLD} 100%)`,
            color: "#fff",
            boxShadow: "0 4px 16px rgba(201,169,110,.35)",
          }}
        >
          <Save className="w-4 h-4" />
          {saved
            ? "✓ Saved!"
            : hasEntry
              ? "Update Today's Entry"
              : "Save Today's Entry"}
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2
            className="font-serif text-xl font-semibold mb-4"
            style={{ color: CHARCOAL }}
          >
            Recent History
          </h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: `${DARK}0C` }}>
                    {[
                      "Date",
                      "Mood",
                      ...(isZenith || isHeartSpace ? ["Sleep"] : []),
                      ...(isZenith || isApex ? ["Study", "Sitting"] : []),
                      ...(isZenith ? ["Stress"] : []),
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold"
                        style={{ color: MUTED }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 10).map((entry, i) => (
                    <tr
                      key={entry.date}
                      style={{ background: i % 2 === 0 ? "#FAFAFA" : CREAM }}
                    >
                      <td
                        className="px-4 py-3 font-medium"
                        style={{ color: CHARCOAL }}
                      >
                        {format(new Date(entry.date + "T00:00:00"), "MMM d")}
                      </td>
                      <td className="px-4 py-3">
                        {entry.mood ? MOOD_EMOJIS[entry.mood - 1] : "–"}
                      </td>
                      {(isZenith || isHeartSpace) && (
                        <td className="px-4 py-3" style={{ color: CHARCOAL }}>
                          {entry.sleepHours != null
                            ? `${entry.sleepHours}h`
                            : "–"}
                        </td>
                      )}
                      {(isZenith || isApex) && (
                        <>
                          <td className="px-4 py-3" style={{ color: CHARCOAL }}>
                            {entry.studyHours != null
                              ? `${entry.studyHours}h`
                              : "–"}
                          </td>
                          <td className="px-4 py-3" style={{ color: CHARCOAL }}>
                            {entry.sittingCapacityHours != null
                              ? `${entry.sittingCapacityHours}h`
                              : "–"}
                          </td>
                        </>
                      )}
                      {isZenith && (
                        <td className="px-4 py-3">
                          {entry.stressLevel ? (
                            <span
                              className="font-semibold"
                              style={{
                                color:
                                  entry.stressLevel >= 4
                                    ? "#C0392B"
                                    : entry.stressLevel <= 2
                                      ? "#27AE60"
                                      : "#E67E22",
                              }}
                            >
                              {entry.stressLevel}/5
                            </span>
                          ) : (
                            "–"
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
