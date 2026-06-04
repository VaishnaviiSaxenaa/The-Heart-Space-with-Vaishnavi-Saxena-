import { useState, useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import {
  format,
  addDays,
  startOfWeek,
  isSameDay,
  isToday,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Trash2,
} from "lucide-react";

const CREAM = "#F8F5F0";
const CHARCOAL = "#2D2A25";
const GOLD = "#C9A84C";
const DARK = "#2D2A25";
const CARD = "#FFFDF9";
const MUTED = "#7A7267";
const BORDER = "#E5DDD0";
const OLIVE = "#6E8B6B";

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
  student_response?: string;
  end_time?: string;
  student?: Student;
}
type ViewMode = "day" | "3day" | "week" | "month";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SLOT_HEIGHT = 60; // px per hour

function googleCalendarLink(s: VSession) {
  const start = new Date(s.scheduled_at);
  const end = s.end_time
    ? (() => {
        const d = new Date(start);
        const [h, m] = s.end_time!.split(":").map(Number);
        d.setHours(h, m, 0, 0);
        return d;
      })()
    : new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const title = encodeURIComponent(s.student?.full_name ?? "Student");
  const details = encodeURIComponent(
    s.note ? `Note: ${s.note}` : "HeartSpace counselling session",
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}`;
}

export default function CounsellorSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<VSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() + (day === 0 ? 1 : day === 1 ? 0 : 8 - day));
    return format(monday, "yyyy-MM-dd");
  });
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [sessionNote, setSessionNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [addToGcal, setAddToGcal] = useState(false);
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const [reschedDate, setReschedDate] = useState("");
  const [reschedTime, setReschedTime] = useState("");
  const [reschedEndTime, setReschedEndTime] = useState("");
  const [rescheduledSession, setRescheduledSession] = useState<VSession | null>(
    null,
  );
  const [selectedSession, setSelectedSession] = useState<VSession | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);
  useEffect(() => {
    // Scroll to 8am on load
    if (gridRef.current) gridRef.current.scrollTop = 8 * SLOT_HEIGHT;
  }, [loading]);

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
    const sess = ((sessRes.data ?? []) as VSession[]).map((s) => ({
      ...s,
      student: studs.find((st) => st.id === s.student_id),
    }));
    setSessions(sess);
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
      const newSession = {
        ...(data as VSession),
        student,
        end_time: endTime || undefined,
      };
      if (addToGcal) window.open(googleCalendarLink(newSession), "_blank");
      setSessions((prev) =>
        [...prev, newSession].sort(
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
    setSelectedSession((prev) =>
      prev?.id === id ? { ...prev, status } : prev,
    );
  }

  async function rescheduleSession(id: string) {
    if (!reschedDate || !reschedTime) return;
    const scheduled_at = new Date(
      `${reschedDate}T${reschedTime}:00`,
    ).toISOString();
    await supabase
      .from("vaishnavi_sessions")
      .update({
        scheduled_at,
        end_time: reschedEndTime || null,
        student_response: null,
        rescheduled_at: new Date().toISOString(),
      })
      .eq("id", id);
    const updated = sessions.find((s) => s.id === id);
    if (updated)
      setRescheduledSession({
        ...updated,
        scheduled_at,
        end_time: reschedEndTime || undefined,
      });
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              scheduled_at,
              end_time: reschedEndTime || undefined,
              student_response: undefined,
            }
          : s,
      ),
    );
    setRescheduling(null);
    setReschedEndTime("");
  }

  async function deleteSession(id: string) {
    if (!confirm("Delete this session?")) return;
    await supabase.from("vaishnavi_sessions").delete().eq("id", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setSelectedSession(null);
  }

  function getDays(): Date[] {
    if (viewMode === "day") return [currentDate];
    if (viewMode === "3day")
      return [currentDate, addDays(currentDate, 1), addDays(currentDate, 2)];
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    });
  }

  function navigate(dir: 1 | -1) {
    const days =
      viewMode === "day"
        ? 1
        : viewMode === "3day"
          ? 3
          : viewMode === "week"
            ? 7
            : 30;
    setCurrentDate((prev) => addDays(prev, dir * days));
  }

  function getSessionsForDay(day: Date) {
    return sessions.filter((s) => isSameDay(new Date(s.scheduled_at), day));
  }

  function getSessionTop(s: VSession) {
    const d = new Date(s.scheduled_at);
    return (d.getHours() + d.getMinutes() / 60) * SLOT_HEIGHT;
  }

  function getSessionHeight(s: VSession) {
    if (!s.end_time) return SLOT_HEIGHT;
    const start = new Date(s.scheduled_at);
    const [eh, em] = s.end_time.split(":").map(Number);
    const end = new Date(start);
    end.setHours(eh, em, 0, 0);
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.max(diff * SLOT_HEIGHT, 20);
  }

  function statusColor(status: string) {
    if (status === "done") return { bg: "#E8F5E9", border: OLIVE, text: OLIVE };
    if (status === "missed")
      return { bg: "#FFEBEE", border: "#C62828", text: "#C62828" };
    return { bg: "#FFF8E7", border: GOLD, text: DARK };
  }

  const days = getDays();
  const isMonth = viewMode === "month";

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

  return (
    <div
      style={{
        background: CREAM,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: CARD,
          borderBottom: `1px solid ${BORDER}`,
          padding: "1rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: DARK,
              margin: 0,
            }}
          >
            My Calendar
          </h1>
          <p style={{ color: MUTED, margin: "0.1rem 0 0", fontSize: "0.8rem" }}>
            Manage your sessions with students
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            background: GOLD,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "0.55rem 1.1rem",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <Plus size={16} /> Add Session
        </button>
      </div>

      {/* Toolbar */}
      <div
        style={{
          background: CARD,
          borderBottom: `1px solid ${BORDER}`,
          padding: "0.6rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexShrink: 0,
        }}
      >
        {/* View toggle */}
        <div
          style={{
            display: "flex",
            gap: "0.2rem",
            background: CREAM,
            borderRadius: 8,
            padding: "0.2rem",
          }}
        >
          {(["day", "3day", "week", "month"] as ViewMode[]).map((v) => (
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
                borderRadius: 6,
                padding: "0.3rem 0.65rem",
                fontWeight: 600,
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              {v === "day"
                ? "Day"
                : v === "3day"
                  ? "3 Days"
                  : v === "week"
                    ? "Week"
                    : "Month"}
            </button>
          ))}
        </div>
        {/* Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "none",
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              padding: "0.3rem 0.5rem",
              cursor: "pointer",
              display: "flex",
            }}
          >
            <ChevronLeft size={15} />
          </button>
          <span
            style={{
              fontWeight: 600,
              color: DARK,
              fontSize: "0.85rem",
              minWidth: 140,
              textAlign: "center",
            }}
          >
            {isMonth
              ? format(currentDate, "MMMM yyyy")
              : viewMode === "day"
                ? format(days[0], "EEEE, MMM d")
                : `${format(days[0], "MMM d")} – ${format(days[days.length - 1], "MMM d, yyyy")}`}
          </span>
          <button
            onClick={() => navigate(1)}
            style={{
              background: "none",
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              padding: "0.3rem 0.5rem",
              cursor: "pointer",
              display: "flex",
            }}
          >
            <ChevronRight size={15} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            style={{
              background: "none",
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              padding: "0.3rem 0.65rem",
              cursor: "pointer",
              fontSize: "0.78rem",
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
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color,
                  lineHeight: 1,
                }}
              >
                {count}
              </div>
              <div style={{ fontSize: "0.7rem", color: MUTED }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar body */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {isMonth ? (
          /* Month view */
          <div style={{ padding: "1rem", flex: 1, overflow: "auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 2,
                marginBottom: 2,
              }}
            >
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div
                  key={d}
                  style={{
                    textAlign: "center",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: MUTED,
                    padding: "0.4rem",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 2,
              }}
            >
              {Array.from({ length: (days[0].getDay() + 6) % 7 }, (_, i) => (
                <div key={`e${i}`} />
              ))}
              {days.map((day) => {
                const ds = getSessionsForDay(day);
                const today = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    style={{
                      background: CARD,
                      borderRadius: 8,
                      border: `1.5px solid ${today ? GOLD : BORDER}`,
                      padding: "0.4rem",
                      minHeight: 80,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: today ? 700 : 500,
                        color: today ? GOLD : CHARCOAL,
                        marginBottom: "0.2rem",
                      }}
                    >
                      {format(day, "d")}
                    </div>
                    {ds.map((s) => {
                      const c = statusColor(s.status);
                      return (
                        <div
                          key={s.id}
                          onClick={() => setSelectedSession(s)}
                          style={{
                            background: c.bg,
                            border: `1px solid ${c.border}`,
                            borderRadius: 4,
                            padding: "0.15rem 0.35rem",
                            marginBottom: 2,
                            fontSize: "0.68rem",
                            color: c.text,
                            fontWeight: 600,
                            cursor: "pointer",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {format(new Date(s.scheduled_at), "h:mm a")}{" "}
                          {s.student?.full_name ?? ""}
                          {s.student_response === "accepted" && " ✅"}
                          {s.student_response === "cancelled" && " ❌"}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Time grid view */
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            {/* Day headers */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  height: 50,
                  borderBottom: `1px solid ${BORDER}`,
                  borderRight: `1px solid ${BORDER}`,
                  width: 52,
                }}
              />
              <div style={{ flex: 1, overflow: "hidden" }} />
            </div>
            <div
              style={{
                flex: 1,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Day name headers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${days.length}, 1fr)`,
                  borderBottom: `1px solid ${BORDER}`,
                  flexShrink: 0,
                  background: CARD,
                }}
              >
                {days.map((day) => {
                  const today = isToday(day);
                  return (
                    <div
                      key={day.toISOString()}
                      style={{
                        textAlign: "center",
                        padding: "0.6rem 0.3rem",
                        borderRight: `1px solid ${BORDER}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: today ? GOLD : MUTED,
                          textTransform: "uppercase",
                        }}
                      >
                        {format(day, "EEE")}
                      </div>
                      <div
                        style={{
                          fontSize: "1.4rem",
                          fontWeight: 700,
                          color: today ? "#fff" : DARK,
                          background: today ? GOLD : "transparent",
                          borderRadius: "50%",
                          width: 36,
                          height: 36,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0.1rem auto 0",
                        }}
                      >
                        {format(day, "d")}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time grid */}
              <div
                style={{ flex: 1, overflow: "auto", display: "flex" }}
                ref={gridRef}
              >
                {/* Hour labels */}
                <div style={{ width: 52, flexShrink: 0, position: "relative" }}>
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      style={{
                        height: SLOT_HEIGHT,
                        borderBottom: `1px solid ${BORDER}`,
                        display: "flex",
                        alignItems: "flex-start",
                        paddingTop: 4,
                        paddingRight: 8,
                        justifyContent: "flex-end",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: MUTED,
                          fontWeight: 500,
                        }}
                      >
                        {h === 0
                          ? ""
                          : h < 12
                            ? `${h} AM`
                            : h === 12
                              ? "12 PM"
                              : `${h - 12} PM`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                <div
                  style={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: `repeat(${days.length}, 1fr)`,
                  }}
                >
                  {days.map((day) => {
                    const ds = getSessionsForDay(day);
                    const today = isToday(day);
                    const now = new Date();
                    const nowTop = today
                      ? (now.getHours() + now.getMinutes() / 60) * SLOT_HEIGHT
                      : null;

                    return (
                      <div
                        key={day.toISOString()}
                        style={{
                          borderRight: `1px solid ${BORDER}`,
                          position: "relative",
                          background: today ? "#FFFDF7" : CARD,
                        }}
                      >
                        {/* Hour lines */}
                        {HOURS.map((h) => (
                          <div
                            key={h}
                            style={{
                              height: SLOT_HEIGHT,
                              borderBottom: `1px solid ${BORDER}88`,
                            }}
                          />
                        ))}

                        {/* Current time indicator */}
                        {nowTop !== null && (
                          <div
                            style={{
                              position: "absolute",
                              top: nowTop,
                              left: 0,
                              right: 0,
                              height: 2,
                              background: "#EA4335",
                              zIndex: 10,
                              pointerEvents: "none",
                            }}
                          >
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                background: "#EA4335",
                                position: "absolute",
                                left: -5,
                                top: -4,
                              }}
                            />
                          </div>
                        )}

                        {/* Sessions */}
                        {ds.map((s) => {
                          const c = statusColor(s.status);
                          const top = getSessionTop(s);
                          const height = getSessionHeight(s);
                          return (
                            <div
                              key={s.id}
                              onClick={() => setSelectedSession(s)}
                              style={{
                                position: "absolute",
                                top,
                                left: 2,
                                right: 2,
                                height: Math.max(height - 2, 18),
                                background: c.bg,
                                border: `1.5px solid ${c.border}`,
                                borderRadius: 6,
                                padding: "0.2rem 0.4rem",
                                cursor: "pointer",
                                overflow: "hidden",
                                zIndex: 5,
                                boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  color: c.text,
                                  overflow: "hidden",
                                  whiteSpace: "nowrap",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {s.student?.full_name ?? "Student"}
                                {s.student_response === "accepted" && " ✅"}
                                {s.student_response === "cancelled" && " ❌"}
                              </div>
                              {height > 30 && (
                                <div
                                  style={{
                                    fontSize: "0.65rem",
                                    color: c.text,
                                    opacity: 0.8,
                                  }}
                                >
                                  {format(new Date(s.scheduled_at), "h:mm a")}
                                  {s.end_time ? ` – ${s.end_time}` : ""}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Session detail panel */}
      {selectedSession && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setSelectedSession(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: CARD,
              borderRadius: 20,
              padding: "1.75rem",
              width: 380,
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <User size={16} style={{ color: GOLD }} />
                  <h2
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: DARK,
                      margin: 0,
                    }}
                  >
                    {selectedSession.student?.full_name ?? "Student"}
                  </h2>
                  {selectedSession.student_response === "accepted" && (
                    <span title="Accepted">✅</span>
                  )}
                  {selectedSession.student_response === "cancelled" && (
                    <span
                      title={selectedSession.cancel_reason ?? "Cancelled"}
                      style={{ cursor: "help" }}
                    >
                      ❌
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    color: MUTED,
                    fontSize: "0.85rem",
                    marginTop: "0.3rem",
                  }}
                >
                  <Clock size={13} />
                  {format(
                    new Date(selectedSession.scheduled_at),
                    "EEEE, MMM d · h:mm a",
                  )}
                  {selectedSession.end_time
                    ? ` – ${selectedSession.end_time}`
                    : ""}
                </div>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: MUTED,
                  cursor: "pointer",
                  fontSize: "1.2rem",
                }}
              >
                ✕
              </button>
            </div>

            {selectedSession.note && (
              <div
                style={{
                  background: CREAM,
                  borderRadius: 10,
                  padding: "0.75rem",
                  marginBottom: "1rem",
                  fontSize: "0.85rem",
                  color: CHARCOAL,
                }}
              >
                📝 {selectedSession.note}
              </div>
            )}

            {selectedSession.cancel_reason && (
              <div
                style={{
                  background: "#FFEBEE",
                  borderRadius: 10,
                  padding: "0.75rem",
                  marginBottom: "1rem",
                  fontSize: "0.85rem",
                  color: "#C62828",
                }}
              >
                Cancelled: {selectedSession.cancel_reason}
              </div>
            )}

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: statusColor(selectedSession.status).bg,
                color: statusColor(selectedSession.status).text,
                borderRadius: 20,
                padding: "0.3rem 0.75rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                marginBottom: "1rem",
              }}
            >
              {selectedSession.status === "done"
                ? "✅ Done"
                : selectedSession.status === "missed"
                  ? "❌ Missed"
                  : "⏳ Upcoming"}
            </div>

            {selectedSession.status === "upcoming" && (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginBottom: "0.75rem",
                }}
              >
                <button
                  onClick={() => updateStatus(selectedSession.id, "done")}
                  style={{
                    flex: 1,
                    background: "#E8F5E9",
                    color: OLIVE,
                    border: `1px solid ${OLIVE}44`,
                    borderRadius: 8,
                    padding: "0.5rem",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <CheckCircle2 size={14} /> Done
                </button>
                <button
                  onClick={() => updateStatus(selectedSession.id, "missed")}
                  style={{
                    flex: 1,
                    background: "#FFEBEE",
                    color: "#C62828",
                    border: "1px solid #C6282844",
                    borderRadius: 8,
                    padding: "0.5rem",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <XCircle size={14} /> Missed
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => {
                  setRescheduling(selectedSession.id);
                  setReschedDate(selectedSession.scheduled_at.split("T")[0]);
                  setReschedTime(
                    selectedSession.scheduled_at.substring(11, 16),
                  );
                  setSelectedSession(null);
                }}
                style={{
                  flex: 1,
                  background: CREAM,
                  color: MUTED,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: "0.5rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🔄 Reschedule
              </button>
              <a
                href={googleCalendarLink(selectedSession)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  background: "#E8F0FE",
                  color: "#1a73e8",
                  border: "none",
                  borderRadius: 8,
                  padding: "0.5rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "none",
                  textAlign: "center",
                }}
              >
                📅 Google Cal
              </a>
              <button
                onClick={() => deleteSession(selectedSession.id)}
                style={{
                  background: CREAM,
                  color: "#C62828",
                  border: `1px solid #FFCDD2`,
                  borderRadius: 8,
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduling && (
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
              width: 380,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: DARK,
                margin: "0 0 1.5rem",
              }}
            >
              🔄 Reschedule Session
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
                  New Date
                </label>
                <input
                  type="date"
                  value={reschedDate}
                  onChange={(e) => setReschedDate(e.target.value)}
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
                  New Start Time
                </label>
                <input
                  type="time"
                  value={reschedTime}
                  onChange={(e) => setReschedTime(e.target.value)}
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
                  Duration
                </label>
                <div
                  style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}
                >
                  {[10, 15, 20, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        if (!reschedTime) return;
                        const [h, m] = reschedTime.split(":").map(Number);
                        const total = h * 60 + m + mins;
                        setReschedEndTime(
                          `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`,
                        );
                      }}
                      style={{
                        background: CREAM,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 8,
                        padding: "0.3rem 0.6rem",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        fontWeight: 600,
                        color: MUTED,
                      }}
                    >
                      {mins}m
                    </button>
                  ))}
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
                  New End Time
                </label>
                <input
                  type="time"
                  value={reschedEndTime}
                  onChange={(e) => setReschedEndTime(e.target.value)}
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
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => rescheduleSession(rescheduling)}
                  style={{
                    flex: 1,
                    background: GOLD,
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setRescheduling(null)}
                  style={{
                    flex: 1,
                    background: CREAM,
                    color: MUTED,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 10,
                    padding: "0.75rem",
                    fontWeight: 600,
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

      {/* Post-reschedule Google Calendar banner */}
      {rescheduledSession && !rescheduling && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: CARD,
            borderRadius: 16,
            padding: "1rem 1.5rem",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            zIndex: 60,
            border: `1px solid ${BORDER}`,
          }}
        >
          <span
            style={{ fontSize: "0.9rem", color: CHARCOAL, fontWeight: 600 }}
          >
            ✅ Session rescheduled!
          </span>
          <a
            href={googleCalendarLink(rescheduledSession)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "#E8F0FE",
              color: "#1a73e8",
              borderRadius: 10,
              padding: "0.5rem 1rem",
              fontWeight: 600,
              fontSize: "0.85rem",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            📅 Update Google Calendar
          </a>
          <button
            onClick={() => setRescheduledSession(null)}
            style={{
              background: "none",
              border: "none",
              color: MUTED,
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            ✕
          </button>
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
              maxHeight: "90vh",
              overflowY: "auto",
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
                  Duration
                </label>
                <div
                  style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}
                >
                  {[10, 15, 20, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        if (!selectedTime) return;
                        const [h, m] = selectedTime.split(":").map(Number);
                        const total = h * 60 + m + mins;
                        setEndTime(
                          `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`,
                        );
                      }}
                      style={{
                        background: CREAM,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 8,
                        padding: "0.3rem 0.6rem",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        fontWeight: 600,
                        color: MUTED,
                      }}
                    >
                      {mins}m
                    </button>
                  ))}
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
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
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
                  Note (optional)
                </label>
                <textarea
                  value={sessionNote}
                  onChange={(e) => setSessionNote(e.target.value)}
                  placeholder="e.g. Focus on Linear Algebra doubts..."
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.75rem",
                    borderRadius: 10,
                    border: `1.5px solid ${BORDER}`,
                    background: CREAM,
                    color: CHARCOAL,
                    fontSize: "0.9rem",
                    outline: "none",
                    resize: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
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
                  checked={addToGcal}
                  onChange={(e) => setAddToGcal(e.target.checked)}
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: GOLD,
                    cursor: "pointer",
                  }}
                />
                <span
                  style={{ fontSize: "0.85rem", color: MUTED, fontWeight: 500 }}
                >
                  📅 Also add to Google Calendar
                </span>
              </label>
              <div style={{ display: "flex", gap: "0.75rem" }}>
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
