import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import {
  format,
  startOfDay,
  endOfDay,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isFuture,
  isPast,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Plus,
  Calendar,
  Clock,
  User,
} from "lucide-react";

const CREAM = "#FAF7F2";
const CHARCOAL = "#2C1810";
const GOLD = "#C9A96E";
const DARK = "#3D2314";
const CARD = "#FFFFFF";
const MUTED = "#8C7B70";
const BORDER = "#E8DDD0";
const OLIVE = "#6E8B6B";
const SIDEBAR = "#EBE3D9";

interface Student {
  id: string;
  full_name: string;
  email: string;
}

interface VSession {
  id: string;
  student_id: string;
  scheduled_at: string;
  status: "upcoming" | "done" | "missed";
  note?: string;
  cancel_reason?: string;
  end_time?: string;
  student_response?: string;
  student?: Student;
}

type ViewMode = "1day" | "3day" | "7day" | "month";

export default function CounsellorSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<VSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("7day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [sessionNote, setSessionNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [addToGcal, setAddToGcal] = useState(false);
  const [rescheduling, setRescheduling] = useState<string|null>(null);
  const [reschedDate, setReschedDate] = useState('');
  const [reschedTime, setReschedTime] = useState('');
  const [reschedEndTime, setReschedEndTime] = useState('');
  const [rescheduledSession, setRescheduledSession] = useState<VSession|null>(null);
  const [showBulkExport, setShowBulkExport] = useState(false);
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  function googleCalendarLink(s: VSession) {
    const start = new Date(s.scheduled_at);
    const end = s.end_time ? (() => { const d = new Date(start); const [h,m] = s.end_time!.split(":").map(Number); d.setHours(h,m,0,0); return d; })() : new Date(start.getTime() + 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const title = encodeURIComponent(s.student?.full_name ?? "Student");
    const details = encodeURIComponent(s.note ? `Note: ${s.note}` : "HeartSpace counselling session");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}`;
  }


  function bulkGoogleCalendarLinks(sessions: VSession[]) {
    return sessions.map(s => ({
      name: s.student?.full_name ?? "Student",
      url: googleCalendarLink(s),
      date: format(new Date(s.scheduled_at), "MMM d, h:mm a"),
    }));
  }

  async function loadData() {
    const [sessRes, studRes] = await Promise.all([
      supabase
        .from("vaishnavi_sessions")
        .select("*")
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "academy_student")
        .order("full_name"),
    ]);

    const studs = (studRes.data ?? []) as Student[];
    const sess = (sessRes.data ?? []) as VSession[];

    // Attach student info to sessions
    const enriched = sess.map((s) => ({
      ...s,
      student: studs.find((st) => st.id === s.student_id),
    }));

    setSessions(enriched);
    setStudents(studs);
    setLoading(false);
  }

  async function addSession() {
    if (!selectedStudent || !selectedDate || !selectedTime) return;
    setSaving(true);
    const scheduled_at = new Date(
      `${selectedDate}T${selectedTime}:00`,
    ).toISOString();
    const { data, error } = await supabase
      .from("vaishnavi_sessions")
      .insert({
        student_id: selectedStudent,
        scheduled_at,
        status: "upcoming",
        note: sessionNote.trim() || null,
        end_time: endTime || null,
      })
      .select()
      .single();

    if (!error && data) {
      const student = students.find((s) => s.id === selectedStudent);
      // Auto-open Google Calendar if checkbox checked
      const newSession = { ...(data as VSession), student, end_time: endTime || undefined };
      if (addToGcal) window.open(googleCalendarLink(newSession), "_blank");
      setSessions((prev) =>
        [...prev, { ...(data as VSession), student }].sort(
          (a, b) =>
            new Date(a.scheduled_at).getTime() -
            new Date(b.scheduled_at).getTime(),
        ),
      );
      setShowAddForm(false);
      setSelectedStudent("");
      setSessionNote("");
      setSelectedDate(format(new Date(), "yyyy-MM-dd"));
      setSelectedTime("10:00");
      setEndTime("11:00");
      setAddToGcal(false);
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: "done" | "missed") {
    await supabase.from("vaishnavi_sessions").update({ status }).eq("id", id);
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s)),
    );
  }

  async function rescheduleSession(id: string) {
    if (!reschedDate || !reschedTime) return;
    const scheduled_at = new Date(`${reschedDate}T${reschedTime}:00`).toISOString();
    await supabase.from("vaishnavi_sessions").update({ scheduled_at, end_time: reschedEndTime || null, student_response: null, rescheduled_at: new Date().toISOString() }).eq("id", id);
    const updated = sessions.find(s => s.id === id);
    if (updated) setRescheduledSession({ ...updated, scheduled_at, end_time: reschedEndTime || undefined });
    setSessions(prev => prev.map(s => s.id === id ? { ...s, scheduled_at, end_time: reschedEndTime || undefined, student_response: undefined } : s));
    setRescheduling(null);
    setReschedEndTime('');
  }

  async function deleteSession(id: string) {
    if (!confirm("Delete this session?")) return;
    await supabase.from("vaishnavi_sessions").delete().eq("id", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  // Get days to display based on view mode
  function getDays(): Date[] {
    if (viewMode === "1day") return [currentDate];
    if (viewMode === "3day")
      return [currentDate, addDays(currentDate, 1), addDays(currentDate, 2)];
    if (viewMode === "7day")
      return Array.from({ length: 7 }, (_, i) => addDays(currentDate, i));
    // month
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    });
  }

  function navigate(dir: 1 | -1) {
    const days =
      viewMode === "1day"
        ? 1
        : viewMode === "3day"
          ? 3
          : viewMode === "7day"
            ? 7
            : 30;
    setCurrentDate((prev) => addDays(prev, dir * days));
  }

  function getSessionsForDay(day: Date): VSession[] {
    return sessions.filter((s) => isSameDay(new Date(s.scheduled_at), day));
  }

  const statusColor = (status: string) => {
    if (status === "done") return { bg: "#E8F5E9", border: OLIVE, text: OLIVE };
    if (status === "missed")
      return { bg: "#FFEBEE", border: "#C62828", text: "#C62828" };
    return { bg: "#FFF8E7", border: GOLD, text: DARK };
  };

  if (loading)
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
        Loading sessions...
      </div>
    );

  const days = getDays();
  const isMonth = viewMode === "month";

  return (
    <div
      style={{
        background: CREAM,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: CARD,
          borderBottom: `1px solid ${BORDER}`,
          padding: "1.25rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: DARK,
              margin: 0,
            }}
          >
            My Calendar
          </h1>
          <p
            style={{ color: MUTED, margin: "0.25rem 0 0", fontSize: "0.85rem" }}
          >
            Manage your sessions with students
          </p>
        </div>
        <button onClick={() => setShowBulkExport(true)}
          style={{ background: "none", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 12, padding: "0.6rem 1.25rem", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
          📅 Bulk Export
        </button>
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            background: GOLD,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "0.6rem 1.25rem",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Plus size={18} /> Add Session
        </button>
      </div>

      {/* View toggle + navigation */}
      <div
        style={{
          background: CARD,
          borderBottom: `1px solid ${BORDER}`,
          padding: "0.75rem 2rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.25rem",
            background: CREAM,
            borderRadius: 10,
            padding: "0.25rem",
          }}
        >
          {(["1day", "3day", "7day", "month"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => {
                setViewMode(v);
                setCurrentDate(new Date());
              }}
              style={{
                background: viewMode === v ? DARK : "transparent",
                color: viewMode === v ? "#fff" : MUTED,
                border: "none",
                borderRadius: 8,
                padding: "0.35rem 0.75rem",
                fontWeight: 600,
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              {v === "1day"
                ? "Day"
                : v === "3day"
                  ? "3 Days"
                  : v === "7day"
                    ? "Week"
                    : "Month"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "none",
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "0.35rem",
              cursor: "pointer",
              display: "flex",
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span
            style={{
              fontWeight: 600,
              color: DARK,
              fontSize: "0.9rem",
              minWidth: 160,
              textAlign: "center",
            }}
          >
            {isMonth
              ? format(currentDate, "MMMM yyyy")
              : `${format(days[0], "MMM d")} – ${format(days[days.length - 1], "MMM d, yyyy")}`}
          </span>
          <button
            onClick={() => navigate(1)}
            style={{
              background: "none",
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "0.35rem",
              cursor: "pointer",
              display: "flex",
            }}
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => {
              setCurrentDate(new Date());
            }}
            style={{
              background: "none",
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "0.35rem 0.75rem",
              cursor: "pointer",
              fontSize: "0.8rem",
              color: MUTED,
              fontWeight: 600,
            }}
          >
            Today
          </button>
        </div>
        {/* Stats */}
        <div style={{ marginLeft: "auto", display: "flex", gap: "1rem" }}>
          {[
            {
              label: "Upcoming",
              count: sessions.filter((s) => s.status === "upcoming").length,
              color: GOLD,
            },
            {
              label: "Done",
              count: sessions.filter((s) => s.status === "done").length,
              color: OLIVE,
            },
            {
              label: "Missed",
              count: sessions.filter((s) => s.status === "missed").length,
              color: "#C62828",
            },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color }}>
                {count}
              </div>
              <div style={{ fontSize: "0.75rem", color: MUTED }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ flex: 1, padding: "1.5rem 2rem", overflowY: "auto" }}>
        {isMonth ? (
          // Month view
          <div>
            {/* Day headers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 4,
                marginBottom: 4,
              }}
            >
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  style={{
                    textAlign: "center",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: MUTED,
                    padding: "0.5rem",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
            {/* Calendar cells */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 4,
              }}
            >
              {/* Empty cells for start of month */}
              {Array.from({ length: days[0].getDay() }, (_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {days.map((day) => {
                const daySessions = getSessionsForDay(day);
                const today = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    style={{
                      background: CARD,
                      borderRadius: 10,
                      border: `1.5px solid ${today ? GOLD : BORDER}`,
                      padding: "0.5rem",
                      minHeight: 80,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: today ? 700 : 500,
                        color: today ? GOLD : CHARCOAL,
                        marginBottom: "0.25rem",
                      }}
                    >
                      {format(day, "d")}
                    </div>
                    {daySessions.map((s) => {
                      const c = statusColor(s.status);
                      return (
                        <div
                          key={s.id}
                          style={{
                            background: c.bg,
                            border: `1px solid ${c.border}`,
                            borderRadius: 6,
                            padding: "0.2rem 0.4rem",
                            marginBottom: 2,
                            fontSize: "0.7rem",
                            color: c.text,
                            fontWeight: 600,
                          }}
                        >
                          {format(new Date(s.scheduled_at), "h:mm a")} ·{" "}
                          {s.student?.full_name ?? "Student"}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Day/3day/Week view
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${days.length}, 1fr)`,
              gap: "1rem",
            }}
          >
            {days.map((day) => {
              const daySessions = getSessionsForDay(day);
              const today = isToday(day);
              return (
                <div key={day.toISOString()}>
                  {/* Day header */}
                  <div
                    style={{
                      textAlign: "center",
                      marginBottom: "0.75rem",
                      padding: "0.5rem",
                      borderRadius: 10,
                      background: today ? GOLD : "transparent",
                      color: today ? "#fff" : CHARCOAL,
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                      {format(day, "EEE")}
                    </div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                      {format(day, "d")}
                    </div>
                    <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>
                      {format(day, "MMM")}
                    </div>
                  </div>
                  {/* Sessions */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    {daySessions.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          color: MUTED,
                          fontSize: "0.8rem",
                          padding: "1rem 0",
                          opacity: 0.6,
                        }}
                      >
                        —
                      </div>
                    ) : (
                      daySessions.map((s) => {
                        const c = statusColor(s.status);
                        return (
                          <div
                            key={s.id}
                            style={{
                              background: CARD,
                              border: `2px solid ${c.border}`,
                              borderRadius: 14,
                              padding: "1rem",
                              position: "relative",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                marginBottom: "0.5rem",
                              }}
                            >
                              <User size={14} style={{ color: GOLD }} />
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: DARK,
                                  fontSize: "0.9rem",
                                }}
                              >
                                {s.student?.full_name ?? "Student"}
                              </span>
                              {s.student_response === "accepted" && <span title="Student accepted">✅</span>}
                              {s.student_response === "cancelled" && <span title={s.cancel_reason ?? "Cancelled"} style={{cursor:"help"}}>❌</span>}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                color: MUTED,
                                fontSize: "0.8rem",
                                marginBottom: "0.5rem",
                              }}
                            >
                              <Clock size={13} />
                              {format(new Date(s.scheduled_at), "h:mm a")}
                            </div>
                            {s.note && (
                              <div
                                style={{
                                  fontSize: "0.8rem",
                                  color: CHARCOAL,
                                  background: CREAM,
                                  borderRadius: 8,
                                  padding: "0.4rem 0.6rem",
                                  marginBottom: "0.5rem",
                                }}
                              >
                                📝 {s.note}
                              </div>
                            )}
                            <div
                              style={{
                                display: "inline-block",
                                background: c.bg,
                                color: c.text,
                                borderRadius: 20,
                                padding: "0.2rem 0.6rem",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                marginBottom: "0.75rem",
                              }}
                            >
                              {s.status === "done"
                                ? "✅ Done"
                                : s.status === "missed"
                                  ? "❌ Missed"
                                  : "⏳ Upcoming"}
                            </div>
                            {s.status === "upcoming" && (
                              <div style={{ display: "flex", gap: "0.4rem" }}>
                                <button
                                  onClick={() => updateStatus(s.id, "done")}
                                  style={{
                                    flex: 1,
                                    background: "#E8F5E9",
                                    color: OLIVE,
                                    border: `1px solid ${OLIVE}44`,
                                    borderRadius: 8,
                                    padding: "0.4rem",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 4,
                                  }}
                                >
                                  <CheckCircle2 size={13} /> Done
                                </button>
                                <button
                                  onClick={() => updateStatus(s.id, "missed")}
                                  style={{
                                    flex: 1,
                                    background: "#FFEBEE",
                                    color: "#C62828",
                                    border: "1px solid #C6282844",
                                    borderRadius: 8,
                                    padding: "0.4rem",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 4,
                                  }}
                                >
                                  <XCircle size={13} /> Missed
                                </button>
                              </div>
                            )}
                            <button
                              onClick={() => { setRescheduling(s.id); setReschedDate(s.scheduled_at.split("T")[0]); setReschedTime(s.scheduled_at.substring(11,16)); }}
                              style={{ marginTop: "0.5rem", background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "0.35rem 0.75rem", fontSize: "0.75rem", color: MUTED, cursor: "pointer", fontWeight: 600, width: "100%", display: "block" }}
                            >
                              🔄 Reschedule
                            </button>
                            <a href={googleCalendarLink(s)} target="_blank" rel="noopener noreferrer"
                              style={{ marginTop: "0.25rem", background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "0.35rem 0.75rem", fontSize: "0.75rem", color: MUTED, cursor: "pointer", fontWeight: 600, width: "100%", display: "block", textAlign: "center", textDecoration: "none" }}>
                              📅 Add to Google Calendar
                            </a>
                            <button
                              onClick={() => deleteSession(s.id)}
                              style={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                background: "none",
                                border: "none",
                                color: MUTED,
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                opacity: 0.5,
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduling && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: CARD, borderRadius: 20, padding: "2rem", width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: DARK, margin: "0 0 1.5rem" }}>🔄 Reschedule Session</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: CHARCOAL, display: "block", marginBottom: "0.4rem" }}>New Date</label>
                <input type="date" value={reschedDate} onChange={e => setReschedDate(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CREAM, color: CHARCOAL, fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: CHARCOAL, display: "block", marginBottom: "0.4rem" }}>New Start Time</label>
                <input type="time" value={reschedTime} onChange={e => setReschedTime(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CREAM, color: CHARCOAL, fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: CHARCOAL, display: "block", marginBottom: "0.4rem" }}>Duration</label>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  {[10, 15, 20, 30, 45, 60].map(mins => (
                    <button key={mins} type="button"
                      onClick={() => {
                        if (!reschedTime) return;
                        const [h, m] = reschedTime.split(":").map(Number);
                        const total = h * 60 + m + mins;
                        setReschedEndTime(`${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`);
                      }}
                      style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "0.3rem 0.6rem", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600, color: MUTED }}>
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: CHARCOAL, display: "block", marginBottom: "0.4rem" }}>New End Time</label>
                <input type="time" value={reschedEndTime} onChange={e => setReschedEndTime(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CREAM, color: CHARCOAL, fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button onClick={() => rescheduleSession(rescheduling)}
                  style={{ flex: 1, background: GOLD, color: "#fff", border: "none", borderRadius: 10, padding: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                  Save
                </button>
                <button onClick={() => setRescheduling(null)}
                  style={{ flex: 1, background: CREAM, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
              {rescheduledSession && (
                <a href={googleCalendarLink(rescheduledSession)} target="_blank" rel="noopener noreferrer"
                  style={{ display: "block", textAlign: "center", marginTop: "0.5rem", background: "#E8F0FE", color: "#1a73e8", borderRadius: 10, padding: "0.75rem", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none" }}>
                  📅 Update Google Calendar
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Export Modal */}
      {showBulkExport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: CARD, borderRadius: 20, padding: "2rem", width: 480, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", maxHeight: "80vh", overflow: "auto" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: DARK, margin: "0 0 0.5rem" }}>📅 Add All to Google Calendar</h2>
            <p style={{ color: MUTED, fontSize: "0.85rem", margin: "0 0 1.25rem" }}>Click each session to add it to Google Calendar</p>
            {/* Select all */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <button onClick={() => setSelectedForExport(new Set(sessions.filter(s => s.status === "upcoming").map(s => s.id)))}
                style={{ background: "none", border: "none", color: "#1a73e8", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
                Select all
              </button>
              <button onClick={() => setSelectedForExport(new Set())}
                style={{ background: "none", border: "none", color: MUTED, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
                Clear
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 350, overflowY: "auto" }}>
              {Object.entries(
                sessions.filter(s => s.status === "upcoming").reduce((acc, s) => {
                  const date = format(new Date(s.scheduled_at), "EEEE, MMM d");
                  if (!acc[date]) acc[date] = [];
                  acc[date].push(s);
                  return acc;
                }, {} as Record<string, typeof sessions>)
              ).map(([date, dateSessions]) => (
                <div key={date}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 0.5rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: MUTED, textTransform: "uppercase" }}>{date}</span>
                    <button onClick={() => {
                      const next = new Set(selectedForExport);
                      const allSelected = dateSessions.every(s => next.has(s.id));
                      dateSessions.forEach(s => allSelected ? next.delete(s.id) : next.add(s.id));
                      setSelectedForExport(next);
                    }} style={{ background: "none", border: "none", color: "#1a73e8", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                      {dateSessions.every(s => selectedForExport.has(s.id)) ? "Deselect day" : "Select day"}
                    </button>
                  </div>
                  {dateSessions.map(s => {
                const checked = selectedForExport.has(s.id);
                return (
                  <div key={s.id} onClick={() => {
                    const next = new Set(selectedForExport);
                    checked ? next.delete(s.id) : next.add(s.id);
                    setSelectedForExport(next);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: checked ? "#E8F0FE" : CREAM, borderRadius: 10, padding: "0.75rem 1rem", cursor: "pointer", border: `1.5px solid ${checked ? "#1a73e8" : BORDER}` }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? "#1a73e8" : MUTED}`, background: checked ? "#1a73e8" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {checked && <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: DARK, fontSize: "0.9rem" }}>{s.student?.full_name ?? "Student"}</div>
                      <div style={{ color: MUTED, fontSize: "0.8rem" }}>{format(new Date(s.scheduled_at), "MMM d, h:mm a")}{s.end_time ? ` – ${s.end_time}` : ""}</div>
                    </div>
                  </div>
                );
              })}
                </div>
              ))}
              {sessions.filter(s => s.status === "upcoming").length === 0 && (
                <p style={{ color: MUTED, textAlign: "center", padding: "1rem" }}>No upcoming sessions</p>
              )}
            </div>
            <button
              disabled={selectedForExport.size === 0}
              onClick={() => {
                const toExport = sessions.filter(s => selectedForExport.has(s.id));
                // Open first one directly (allowed by browser)
                if (toExport.length > 0) window.open(googleCalendarLink(toExport[0]), "_blank");
                // Store remaining for sequential manual open
                setShowBulkExport(false);
                setSelectedForExport(new Set());
                if (toExport.length > 1) {
                  alert(`${toExport.length} sessions selected. Due to browser restrictions, only 1 tab opens at a time. Please click "📅 Add to Google Calendar" on each session card individually, or allow popups in your browser settings for this site.`);
                }
              }}
              style={{ marginTop: "1rem", width: "100%", background: selectedForExport.size > 0 ? "#1a73e8" : BORDER, color: selectedForExport.size > 0 ? "#fff" : MUTED, border: "none", borderRadius: 10, padding: "0.75rem", fontWeight: 600, cursor: selectedForExport.size > 0 ? "pointer" : "default", fontSize: "0.95rem" }}>
              {selectedForExport.size > 0 ? `📅 Add ${selectedForExport.size} session${selectedForExport.size > 1 ? "s" : ""} to Google Calendar` : "Select sessions above"}
            </button>
            <button onClick={() => { setShowBulkExport(false); setSelectedForExport(new Set()); }}
              style={{ marginTop: "0.5rem", width: "100%", background: CREAM, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Post-reschedule Google Calendar banner */}
      {rescheduledSession && !rescheduling && (
        <div style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", background: CARD, borderRadius: 16, padding: "1rem 1.5rem", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: "1rem", zIndex: 60, border: `1px solid ${BORDER}` }}>
          <span style={{ fontSize: "0.9rem", color: CHARCOAL, fontWeight: 600 }}>✅ Session rescheduled!</span>
          <a href={googleCalendarLink(rescheduledSession)} target="_blank" rel="noopener noreferrer"
            style={{ background: "#E8F0FE", color: "#1a73e8", borderRadius: 10, padding: "0.5rem 1rem", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none", whiteSpace: "nowrap" }}>
            📅 Update Google Calendar
          </a>
          <button onClick={() => setRescheduledSession(null)} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: "1rem" }}>✕</button>
        </div>
      )}

      {/* Add Session Modal */}
      {showAddForm && (
        <div
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
            style={{
              background: CARD,
              borderRadius: 20,
              padding: "2rem",
              width: 420,
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: DARK,
                margin: "0 0 1.5rem",
              }}
            >
              Add Session
            </h2>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div>
                <label
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: CHARCOAL,
                    display: "block",
                    marginBottom: "0.4rem",
                  }}
                >
                  Student
                </label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.75rem",
                    borderRadius: 10,
                    border: `1.5px solid ${BORDER}`,
                    background: CREAM,
                    color: CHARCOAL,
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                >
                  <option value="">Select student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: CHARCOAL,
                      display: "block",
                      marginBottom: "0.4rem",
                    }}
                  >
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.75rem",
                      borderRadius: 10,
                      border: `1.5px solid ${BORDER}`,
                      background: CREAM,
                      color: CHARCOAL,
                      fontSize: "0.9rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: CHARCOAL,
                      display: "block",
                      marginBottom: "0.4rem",
                    }}
                  >
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.75rem",
                      borderRadius: 10,
                      border: `1.5px solid ${BORDER}`,
                      background: CREAM,
                      color: CHARCOAL,
                      fontSize: "0.9rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: CHARCOAL, display: "block", marginBottom: "0.4rem" }}>Duration</label>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    {[10, 15, 20, 30, 45, 60].map(mins => (
                      <button key={mins} type="button"
                        onClick={() => {
                          if (!selectedTime) return;
                          const [h, m] = selectedTime.split(":").map(Number);
                          const total = h * 60 + m + mins;
                          setEndTime(`${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`);
                        }}
                        style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "0.3rem 0.6rem", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600, color: MUTED }}>
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: CHARCOAL, display: "block", marginBottom: "0.4rem" }}>End Time</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: CREAM, color: CHARCOAL, fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              <div>
                <label
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: CHARCOAL,
                    display: "block",
                    marginBottom: "0.4rem",
                  }}
                >
                  Note (optional)
                </label>
                <textarea
                  value={sessionNote}
                  onChange={(e) => setSessionNote(e.target.value)}
                  placeholder="e.g. Focus on Linear Algebra doubts..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.75rem",
                    borderRadius: 10,
                    border: `1.5px solid ${BORDER}`,
                    background: CREAM,
                    color: CHARCOAL,
                    fontSize: "0.9rem",
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div
                style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}
              >
                <button
                  onClick={addSession}
                  disabled={
                    saving || !selectedStudent || !selectedDate || !selectedTime
                  }
                  style={{
                    flex: 1,
                    background: GOLD,
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "0.75rem",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    opacity: saving || !selectedStudent ? 0.5 : 1,
                  }}
                >
                  {saving ? "Saving..." : "Add Session"}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  style={{
                    flex: 1,
                    background: CREAM,
                    color: MUTED,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 10,
                    padding: "0.75rem",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
