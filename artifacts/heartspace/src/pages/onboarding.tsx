import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import {
  ROADMAP_TYPES,
  RoadmapType,
  saveRoadmap,
  saveScheduleInputs,
  generatePhases,
  Roadmap,
} from "./roadmap";

const CREAM = "#F8F5F0";
const CHARCOAL = "#2D2A25";
const GOLD = "#C9A84C";
const PROGRESS_PURPLE = "#6B568F";
const DARK = "#2D2A25";
const CARD = "#FFFDF9";
const MUTED = "#7A7267";
const BORDER = "#E5DDD0";

const DAYS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

export default function Onboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const userId = String(user?.id ?? "guest");
  const examType = ((user as any)?.exam_type as string | null) ?? "JAM";

  const [step, setStep] = useState(1);
  const [type, setType] = useState<RoadmapType | null>(null);
  const [months, setMonths] = useState(6);
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [qpHours, setQpHours] = useState(1);
  const [qpDays, setQpDays] = useState(5);
  const [revHours, setRevHours] = useState(1);
  const [revDays, setRevDays] = useState(3);

  function toggleDay(d: number) {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );
  }

  function finish() {
    if (!type) return;
    const rm: Roadmap = {
      type,
      examType,
      totalMonths: months,
      startDate: new Date().toISOString().split("T")[0],
      phases: generatePhases(examType, months),
      unavailablePeriods: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    saveRoadmap(userId, rm);
    saveScheduleInputs(userId, {
      hoursPerDay,
      daysPerWeek: selectedDays.length,
      targetMonths: months,
      revisionPercent: 30,
    });
    try {
      const inputs = { hoursPerDay, daysPerWeek: selectedDays.length, targetMonths: months, revisionPercent: 30, selectedDays };
      localStorage.setItem(`hs_schedule_inputs_${userId}`, JSON.stringify(inputs));
      localStorage.setItem(`hs_qp_schedule_inputs_${userId}`, JSON.stringify({ hoursPerDay: qpHours, daysPerWeek: qpDays }));
      localStorage.setItem(`hs_rev_schedule_inputs_${userId}`, JSON.stringify({ hoursPerDay: revHours, daysPerWeek: revDays }));
    } catch {}
    setLocation("/roadmap");
  }

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "2rem" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
            Step {step} of 4
          </p>

          {step === 1 && (
            <div>
              <h1 style={{ fontFamily: "serif", fontSize: "1.5rem", fontWeight: 700, color: CHARCOAL, marginBottom: "1.25rem" }}>
                What stage are you at?
              </h1>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {(Object.entries(ROADMAP_TYPES) as [RoadmapType, (typeof ROADMAP_TYPES)[RoadmapType]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => { setType(key); setMonths(cfg.defaultMonths); setStep(2); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      padding: "0.9rem 1rem", borderRadius: 14, textAlign: "left",
                      background: type === key ? `${PROGRESS_PURPLE}15` : CREAM,
                      border: `1.5px solid ${type === key ? PROGRESS_PURPLE : BORDER}`,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: "1.4rem" }}>{cfg.emoji}</span>
                    <span>
                      <p style={{ fontWeight: 600, fontSize: "0.9rem", color: CHARCOAL }}>{cfg.label}</p>
                      <p style={{ fontSize: "0.75rem", color: MUTED }}>{cfg.description}</p>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 style={{ fontFamily: "serif", fontSize: "1.5rem", fontWeight: 700, color: CHARCOAL, marginBottom: "1.25rem" }}>
                How much time can you study?
              </h1>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: CHARCOAL, display: "block", marginBottom: "0.5rem" }}>
                Hours per day: <span style={{ color: PROGRESS_PURPLE }}>{hoursPerDay}h</span>
              </label>
              <input type="range" min={1} max={12} value={hoursPerDay} onChange={(e) => setHoursPerDay(parseInt(e.target.value))} style={{ width: "100%", marginBottom: "1.5rem" }} />

              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: CHARCOAL, display: "block", marginBottom: "0.5rem" }}>
                Which days can you study?
              </label>
              <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.5rem" }}>
                {DAYS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => toggleDay(d.value)}
                    style={{
                      flex: 1, padding: "0.5rem 0", borderRadius: 10, fontSize: "0.75rem", fontWeight: 600,
                      background: selectedDays.includes(d.value) ? PROGRESS_PURPLE : CREAM,
                      color: selectedDays.includes(d.value) ? "#fff" : MUTED,
                      border: `1px solid ${selectedDays.includes(d.value) ? PROGRESS_PURPLE : BORDER}`,
                      cursor: "pointer",
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: "0.75rem", borderRadius: 12, background: CREAM, border: `1px solid ${BORDER}`, color: MUTED, fontWeight: 600, cursor: "pointer" }}>Back</button>
                <button onClick={() => setStep(3)} style={{ flex: 2, padding: "0.75rem", borderRadius: 12, background: DARK, color: "#fff", fontWeight: 600, cursor: "pointer" }}>Continue</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 style={{ fontFamily: "serif", fontSize: "1.5rem", fontWeight: 700, color: CHARCOAL, marginBottom: "0.5rem" }}>
                Question Practice &amp; Revision
              </h1>
              <p style={{ fontSize: "0.8rem", color: MUTED, marginBottom: "1.25rem" }}>
                These run on their own schedule, separate from Topic Completion.
              </p>

              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: CHARCOAL, display: "block", marginBottom: "0.5rem" }}>
                Question Practice - hours/day: <span style={{ color: PROGRESS_PURPLE }}>{qpHours}h</span>
              </label>
              <input type="range" min={0.5} max={6} step={0.5} value={qpHours} onChange={(e) => setQpHours(parseFloat(e.target.value))} style={{ width: "100%", marginBottom: "0.5rem" }} />
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: CHARCOAL, display: "block", marginBottom: "0.5rem" }}>
                Question Practice - days/week: <span style={{ color: PROGRESS_PURPLE }}>{qpDays}</span>
              </label>
              <input type="range" min={1} max={7} value={qpDays} onChange={(e) => setQpDays(parseInt(e.target.value))} style={{ width: "100%", marginBottom: "1.5rem" }} />

              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: CHARCOAL, display: "block", marginBottom: "0.5rem" }}>
                Revision - hours/day: <span style={{ color: PROGRESS_PURPLE }}>{revHours}h</span>
              </label>
              <input type="range" min={0.5} max={6} step={0.5} value={revHours} onChange={(e) => setRevHours(parseFloat(e.target.value))} style={{ width: "100%", marginBottom: "0.5rem" }} />
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: CHARCOAL, display: "block", marginBottom: "0.5rem" }}>
                Revision - days/week: <span style={{ color: PROGRESS_PURPLE }}>{revDays}</span>
              </label>
              <input type="range" min={1} max={7} value={revDays} onChange={(e) => setRevDays(parseInt(e.target.value))} style={{ width: "100%", marginBottom: "1.5rem" }} />

              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button onClick={() => setStep(2)} style={{ flex: 1, padding: "0.75rem", borderRadius: 12, background: CREAM, border: `1px solid ${BORDER}`, color: MUTED, fontWeight: 600, cursor: "pointer" }}>Back</button>
                <button onClick={() => setStep(4)} style={{ flex: 2, padding: "0.75rem", borderRadius: 12, background: DARK, color: "#fff", fontWeight: 600, cursor: "pointer" }}>Continue</button>
              </div>
            </div>
          )}

          {step === 4 && type && (
            <div>
              <h1 style={{ fontFamily: "serif", fontSize: "1.5rem", fontWeight: 700, color: CHARCOAL, marginBottom: "1.25rem" }}>
                How long is your prep?
              </h1>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: CHARCOAL, display: "block", marginBottom: "0.5rem" }}>
                Total preparation time: <span style={{ color: PROGRESS_PURPLE }}>{months} months</span>
              </label>
              <input type="range" min={1} max={36} value={months} onChange={(e) => setMonths(parseInt(e.target.value))} style={{ width: "100%", marginBottom: "1.5rem" }} />
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button onClick={() => setStep(3)} style={{ flex: 1, padding: "0.75rem", borderRadius: 12, background: CREAM, border: `1px solid ${BORDER}`, color: MUTED, fontWeight: 600, cursor: "pointer" }}>Back</button>
                <button
                  onClick={finish}
                  style={{
                    flex: 2, padding: "0.75rem", borderRadius: 12,
                    background: `linear-gradient(135deg, #A07840 0%, ${PROGRESS_PURPLE} 100%)`,
                    color: "#fff", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Create My Plan →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
