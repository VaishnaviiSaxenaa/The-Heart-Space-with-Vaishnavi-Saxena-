import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const CREAM = "#FAF7F2";
const CHARCOAL = "#2C1810";
const GOLD = "#C9A96E";
const DARK = "#3D2314";
const CARD = "#FFFFFF";
const MUTED = "#8C7B70";
const BORDER = "#E8DDD0";
const OLIVE = "#6E8B6B";

interface VSession {
  id: string;
  scheduled_at: string;
  status: "upcoming" | "done" | "missed";
  note?: string;
  cancel_reason?: string;
}

interface SessionNote {
  id: string;
  note: string;
  created_at: string;
}

export default function MySessions() {
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : "";
  const [sessions, setSessions] = useState<VSession[]>([]);
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showAllPast, setShowAllPast] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      supabase
        .from("vaishnavi_sessions")
        .select("*")
        .eq("student_id", userId)
        .order("scheduled_at", { ascending: false }),
      supabase
        .from("session_notes")
        .select("*")
        .eq("student_id", userId)
        .order("created_at", { ascending: false }),
    ]).then(([s, n]) => {
      if (s.data) setSessions(s.data as VSession[]);
      if (n.data) setNotes(n.data as SessionNote[]);
      setLoading(false);
    });
  }, [userId]);

  const upcoming = sessions.filter((s) => s.status === "upcoming");
  const past = sessions.filter(
    (s) => s.status === "done" || s.status === "missed",
  );
  const visiblePast = showAllPast ? past : past.slice(0, 3);
  const visibleNotes = showAllNotes ? notes : notes.slice(0, 3);

  async function submitNote() {
    if (!newNote.trim() || !userId) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("session_notes")
      .insert({ student_id: userId, note: newNote.trim() })
      .select()
      .single();
    if (!error && data) {
      setNotes((prev) => [data as SessionNote, ...prev]);
      setNewNote("");
    }
    setSaving(false);
  }

  async function cancelSession(id: string) {
    if (!cancelReason.trim()) return;
    await supabase
      .from("vaishnavi_sessions")
      .update({ status: "missed", cancel_reason: cancelReason.trim() })
      .eq("id", id);
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "missed" } : s)),
    );
    setCancellingId(null);
    setCancelReason("");
  }

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
        Loading your sessions...
      </div>
    );

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "2rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: DARK,
              margin: 0,
            }}
          >
            My Sessions with Vaishnavi Ma'am
          </h1>
          <p style={{ color: MUTED, margin: "0.5rem 0 0" }}>
            Your upcoming and past counselling sessions
          </p>
        </div>

        {/* Upcoming */}
        <div style={{ marginBottom: "2rem" }}>
          <h2
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: MUTED,
              marginBottom: "1rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Upcoming
          </h2>
          {upcoming.length === 0 ? (
            <div
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 16,
                padding: "2rem",
                textAlign: "center",
                color: MUTED,
              }}
            >
              <Calendar
                size={32}
                style={{
                  margin: "0 auto 0.75rem",
                  display: "block",
                  opacity: 0.4,
                }}
              />
              <p style={{ margin: 0 }}>No upcoming sessions scheduled yet.</p>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem" }}>
                Vaishnavi Ma'am will schedule your next session.
              </p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {upcoming.map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: CARD,
                    border: `2px solid ${GOLD}`,
                    borderRadius: 16,
                    padding: "1.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        background: GOLD,
                        borderRadius: 12,
                        padding: "0.5rem",
                        color: "#fff",
                      }}
                    >
                      <Calendar size={20} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: DARK,
                          fontSize: "1.05rem",
                        }}
                      >
                        {format(new Date(s.scheduled_at), "EEEE, MMMM d, yyyy")}
                      </div>
                      <div
                        style={{
                          color: MUTED,
                          fontSize: "0.9rem",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Clock size={14} />
                        {format(new Date(s.scheduled_at), "h:mm a")}
                      </div>
                    </div>
                  </div>
                  {s.note && (
                    <div
                      style={{
                        background: CREAM,
                        borderRadius: 10,
                        padding: "0.75rem",
                        fontSize: "0.9rem",
                        color: CHARCOAL,
                        marginBottom: "0.75rem",
                      }}
                    >
                      📝 {s.note}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <button onClick={() => { /* already accepted */ }}
                      style={{ background: "#E8F5E9", color: "#2E7D32", border: "1px solid #A5D6A7", borderRadius: 8, padding: "0.35rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, cursor: "default" }}>
                      ✅ Session accepted
                    </button>
                    <button onClick={() => setCancellingId(s.id)}
                      style={{ background: "none", border: "1px solid #FFCDD2", borderRadius: 8, padding: "0.35rem 0.75rem", fontSize: "0.8rem", color: "#C62828", cursor: "pointer", fontWeight: 600 }}>
                      Cancel session
                    </button>
                  </div>
                  {cancellingId === s.id ? (
                    <div
                      style={{
                        background: "#FFF8F8",
                        borderRadius: 10,
                        padding: "0.75rem",
                        border: "1px solid #FFCDD2",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: "#C62828",
                          margin: "0 0 0.5rem",
                        }}
                      >
                        Reason for cancellation
                      </p>
                      <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Please provide a reason..."
                        rows={2}
                        style={{
                          width: "100%",
                          borderRadius: 8,
                          border: "1.5px solid #FFCDD2",
                          padding: "0.5rem",
                          fontSize: "0.85rem",
                          resize: "none",
                          fontFamily: "inherit",
                          boxSizing: "border-box",
                        }}
                      />
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          marginTop: "0.5rem",
                        }}
                      >
                        <button
                          onClick={() => cancelSession(s.id)}
                          disabled={!cancelReason.trim()}
                          style={{
                            background: "#C62828",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "0.4rem 0.75rem",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            opacity: cancelReason.trim() ? 1 : 0.5,
                          }}
                        >
                          Confirm Cancel
                        </button>
                        <button
                          onClick={() => {
                            setCancellingId(null);
                            setCancelReason("");
                          }}
                          style={{
                            background: CREAM,
                            color: MUTED,
                            border: `1px solid ${BORDER}`,
                            borderRadius: 8,
                            padding: "0.4rem 0.75rem",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Go back
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* What I want to discuss */}
        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: CHARCOAL,
              margin: "0 0 0.5rem",
            }}
          >
            💬 What I want to discuss
          </h2>
          <p style={{ color: MUTED, fontSize: "0.85rem", margin: "0 0 1rem" }}>
            Write what you'd like to talk about in your next session. Vaishnavi
            Ma'am can see all your notes.
          </p>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="e.g. I'm struggling with Real Analysis — limits and continuity..."
            rows={3}
            style={{
              width: "100%",
              borderRadius: 10,
              border: `1.5px solid ${BORDER}`,
              padding: "0.75rem",
              fontSize: "0.95rem",
              color: CHARCOAL,
              background: CREAM,
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <button
            onClick={submitNote}
            disabled={saving || !newNote.trim()}
            style={{
              marginTop: "0.75rem",
              background: OLIVE,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "0.6rem 1.25rem",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              opacity: saving || !newNote.trim() ? 0.5 : 1,
            }}
          >
            <Send size={16} />
            {saving ? "Saving..." : "Add Note"}
          </button>

          {notes.length > 0 && (
            <div style={{ marginTop: "1.25rem" }}>
              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: MUTED,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.75rem",
                }}
              >
                Previous notes
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {visibleNotes.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      background: CREAM,
                      borderRadius: 10,
                      padding: "0.75rem 1rem",
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: MUTED,
                        marginBottom: "0.25rem",
                      }}
                    >
                      {format(new Date(n.created_at), "MMM d, yyyy · h:mm a")}
                    </div>
                    <div style={{ color: CHARCOAL, fontSize: "0.9rem" }}>
                      {n.note}
                    </div>
                  </div>
                ))}
              </div>
              {notes.length > 3 && (
                <button
                  onClick={() => setShowAllNotes((p) => !p)}
                  style={{
                    marginTop: "0.75rem",
                    background: "none",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.8rem",
                    color: MUTED,
                    cursor: "pointer",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    width: "100%",
                    justifyContent: "center",
                  }}
                >
                  {showAllNotes ? (
                    <>
                      <ChevronUp size={14} /> Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} /> Show all {notes.length} notes
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Past Sessions */}
        {past.length > 0 && (
          <div>
            <h2
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: MUTED,
                marginBottom: "1rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Past Sessions
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {visiblePast.map((s) => (
                <div
                  key={s.id}
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
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: DARK }}>
                        {format(new Date(s.scheduled_at), "EEEE, MMMM d, yyyy")}
                      </div>
                      <div
                        style={{
                          color: MUTED,
                          fontSize: "0.85rem",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          marginTop: 2,
                        }}
                      >
                        <Clock size={13} />
                        {format(new Date(s.scheduled_at), "h:mm a")}
                      </div>
                      {s.note && (
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: MUTED,
                            marginTop: 4,
                          }}
                        >
                          📝 {s.note}
                        </div>
                      )}
                      {s.cancel_reason && (
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "#C62828",
                            marginTop: 4,
                          }}
                        >
                          Cancelled: {s.cancel_reason}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        background: s.status === "done" ? "#E8F5E9" : "#FFEBEE",
                        borderRadius: 20,
                        padding: "0.3rem 0.75rem",
                        color: s.status === "done" ? OLIVE : "#C62828",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        flexShrink: 0,
                      }}
                    >
                      {s.status === "done" ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        <XCircle size={15} />
                      )}
                      {s.status === "done" ? "Done" : "Missed"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {past.length > 3 && (
              <button
                onClick={() => setShowAllPast((p) => !p)}
                style={{
                  marginTop: "0.75rem",
                  background: "none",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: "0.35rem 0.75rem",
                  fontSize: "0.8rem",
                  color: MUTED,
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                {showAllPast ? (
                  <>
                    <ChevronUp size={14} /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} /> Show all {past.length} sessions
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
