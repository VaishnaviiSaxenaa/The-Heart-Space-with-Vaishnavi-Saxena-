import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  Send,
  CheckSquare,
  Square,
} from "lucide-react";

const CREAM = "#FAF7F2";
const CHARCOAL = "#2C1810";
const GOLD = "#C9A96E";
const DARK = "#3D2314";
const CARD = "#FFFFFF";
const MUTED = "#8C7B70";
const BORDER = "#E8DDD0";
const OLIVE = "#6E8B6B";

const JAM_SUBJECTS = [
  {
    key: "linear_algebra",
    name: "Linear Algebra",
    topics: [
      "Vector Spaces",
      "Linear Transformations",
      "Matrices",
      "Eigenvalues & Eigenvectors",
      "Inner Product Spaces",
    ],
  },
  {
    key: "calculus",
    name: "Calculus",
    topics: [
      "Limits & Continuity",
      "Differentiation",
      "Integration",
      "Sequences & Series",
      "Multivariable Calculus",
    ],
  },
  {
    key: "real_analysis",
    name: "Real Analysis",
    topics: [
      "Real Numbers",
      "Sequences",
      "Series",
      "Continuity",
      "Differentiability",
      "Riemann Integration",
    ],
  },
  {
    key: "differential_equations",
    name: "Differential Equations",
    topics: [
      "First Order ODEs",
      "Second Order ODEs",
      "Systems of ODEs",
      "Laplace Transforms",
      "PDEs",
    ],
  },
  {
    key: "abstract_algebra",
    name: "Abstract Algebra",
    topics: [
      "Groups",
      "Rings",
      "Fields",
      "Homomorphisms",
      "Quotient Structures",
    ],
  },
  {
    key: "complex_analysis",
    name: "Complex Analysis",
    topics: [
      "Analytic Functions",
      "Contour Integration",
      "Laurent Series",
      "Residue Theorem",
      "Conformal Mappings",
    ],
  },
  {
    key: "numerical_methods",
    name: "Numerical Methods",
    topics: [
      "Root Finding",
      "Interpolation",
      "Numerical Integration",
      "ODE Methods",
      "Linear Systems",
    ],
  },
  {
    key: "statistics",
    name: "Statistics & Probability",
    topics: [
      "Probability",
      "Random Variables",
      "Distributions",
      "Estimation",
      "Testing",
    ],
  },
];

const NET_EXTRA = [
  {
    key: "topology",
    name: "Topology",
    topics: [
      "Metric Spaces",
      "Topological Spaces",
      "Connectedness",
      "Compactness",
      "Continuity",
    ],
  },
  {
    key: "functional_analysis",
    name: "Functional Analysis",
    topics: [
      "Normed Spaces",
      "Banach Spaces",
      "Hilbert Spaces",
      "Linear Operators",
      "Spectral Theory",
    ],
  },
];

interface NoteLog {
  id: string;
  topic_key: string;
  subject: string;
  topic: string;
  done: boolean;
  noted_at: string | null;
}

export default function NoteTracker() {
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : "";
  const examType = (user as any)?.examType ?? "JAM";
  const subjects =
    examType === "NET_GATE" ? [...JAM_SUBJECTS, ...NET_EXTRA] : JAM_SUBJECTS;

  const [notes, setNotes] = useState<NoteLog[]>([]);
  const [methodResponses, setMethodResponses] = useState<string[]>([]);
  const [newMethod, setNewMethod] = useState("");
  const [showMethodInput, setShowMethodInput] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(
    new Set([subjects[0]?.key]),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      supabase.from("note_logs").select("*").eq("student_id", userId),
      supabase
        .from("note_method")
        .select("*")
        .eq("student_id", userId)
        .single(),
    ]).then(([notesRes, methodRes]) => {
      if (notesRes.data) setNotes(notesRes.data as NoteLog[]);
      if (methodRes.data) setMethodResponses(methodRes.data.responses ?? []);
      setLoading(false);
    });
  }, [userId]);

  async function saveMethod() {
    if (!newMethod.trim()) return;
    const updated = [newMethod.trim(), ...methodResponses];
    setMethodResponses(updated);
    setNewMethod("");
    setShowMethodInput(false);
    await supabase.from("note_method").upsert(
      {
        student_id: userId,
        responses: updated,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id" },
    );
  }

  async function toggleNote(
    subjectKey: string,
    subjectName: string,
    topicName: string,
  ) {
    const topicKey = `${subjectKey}::${topicName}`;
    const existing = notes.find((n) => n.topic_key === topicKey);
    const newDone = !existing?.done;
    const noted_at = newDone ? new Date().toISOString() : null;

    if (existing) {
      await supabase
        .from("note_logs")
        .update({ done: newDone, noted_at })
        .eq("id", existing.id);
      setNotes((prev) =>
        prev.map((n) =>
          n.topic_key === topicKey ? { ...n, done: newDone, noted_at } : n,
        ),
      );
    } else {
      const { data } = await supabase
        .from("note_logs")
        .insert({
          student_id: userId,
          topic_key: topicKey,
          subject: subjectName,
          topic: topicName,
          done: true,
          noted_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (data) setNotes((prev) => [...prev, data as NoteLog]);
    }
  }

  function getNote(subjectKey: string, topicName: string) {
    return notes.find((n) => n.topic_key === `${subjectKey}::${topicName}`);
  }

  function toggleSubject(key: string) {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const totalTopics = subjects.reduce((a, s) => a + s.topics.length, 0);
  const doneCount = notes.filter((n) => n.done).length;

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
        Loading...
      </div>
    );

  return (
    <div style={{ background: CREAM, minHeight: "100vh", padding: "2rem" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: DARK,
              margin: 0,
            }}
          >
            Note Tracker
          </h1>
          <p style={{ color: MUTED, margin: "0.4rem 0 0", fontSize: "0.9rem" }}>
            Track your notes per topic
          </p>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {[
            { label: "Notes Done", value: doneCount, color: OLIVE },
            { label: "Total Topics", value: totalTopics, color: CHARCOAL },
            { label: "Remaining", value: totalTopics - doneCount, color: GOLD },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background: CARD,
                borderRadius: 14,
                padding: "1rem",
                border: `1px solid ${BORDER}`,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color }}>
                {value}
              </div>
              <div style={{ fontSize: "0.8rem", color: MUTED, marginTop: 2 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* How do you make notes? */}
        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            padding: "1.25rem",
            marginBottom: "1.5rem",
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
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: CHARCOAL,
                margin: 0,
              }}
            >
              📝 How do you make notes?
            </h2>
            <button
              onClick={() => setShowMethodInput((p) => !p)}
              style={{
                background: GOLD,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "0.35rem 0.75rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Add
            </button>
          </div>
          {showMethodInput && (
            <div
              style={{
                marginBottom: "0.75rem",
                display: "flex",
                gap: "0.5rem",
              }}
            >
              <textarea
                value={newMethod}
                onChange={(e) => setNewMethod(e.target.value)}
                placeholder="Describe how you make notes..."
                rows={2}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  border: `1.5px solid ${BORDER}`,
                  padding: "0.6rem",
                  fontSize: "0.9rem",
                  resize: "none",
                  fontFamily: "inherit",
                  outline: "none",
                  background: CREAM,
                }}
              />
              <button
                onClick={saveMethod}
                style={{
                  background: OLIVE,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "0.5rem 0.75rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Send size={16} />
              </button>
            </div>
          )}
          {methodResponses.length === 0 ? (
            <p style={{ color: MUTED, fontSize: "0.85rem", margin: 0 }}>
              No responses yet. How do you make notes?
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {methodResponses.map((r, i) => (
                <div
                  key={i}
                  style={{
                    background: CREAM,
                    borderRadius: 10,
                    padding: "0.6rem 0.85rem",
                    fontSize: "0.85rem",
                    color: CHARCOAL,
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  {i === 0 && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: GOLD,
                        fontWeight: 600,
                        marginRight: 6,
                      }}
                    >
                      LATEST
                    </span>
                  )}
                  {r}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pro Tip */}
        <div style={{ background: "#FFFBEB", border: "1.5px solid #FCD34D", borderRadius: 16, padding: "1.25rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#92400E", margin: "0 0 0.75rem" }}>💡 Pro Tip: How to Make Notes That Stick</h2>
          <div style={{ fontSize: "0.85rem", color: "#78350F", lineHeight: 1.7 }}>
            <p style={{ margin: "0 0 0.6rem" }}>Before making notes, <strong>close your existing notes first</strong>. After a lecture, recall everything you can remember. Then open your notes and compare — how much did you remember?</p>
            <p style={{ margin: "0 0 0.6rem" }}>Mark your topics by how well you recalled them:</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
              <span style={{ background: "#DCFCE7", color: "#166534", borderRadius: 8, padding: "0.25rem 0.65rem", fontSize: "0.8rem", fontWeight: 600 }}>🟢 Green — Remembered fully</span>
              <span style={{ background: "#DBEAFE", color: "#1e40af", borderRadius: 8, padding: "0.25rem 0.65rem", fontSize: "0.8rem", fontWeight: 600 }}>🔵 Blue — Remembered ~50%</span>
              <span style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 8, padding: "0.25rem 0.65rem", fontSize: "0.8rem", fontWeight: 600 }}>🔴 Red — Barely remembered</span>
            </div>
            <p style={{ margin: 0 }}>Each time you revise, if you can fully recall a Blue or Red topic, upgrade it to Green. Over time, all your notes will become Green — and that's when you truly know the material. ✨</p>
          </div>
        </div>

        {/* Subject + Topic list */}
        {subjects.map((subject) => {
          const expanded = expandedSubjects.has(subject.key);
          const subjectNotes = subject.topics
            .map((t) => getNote(subject.key, t))
            .filter(Boolean);
          const doneInSubject = subjectNotes.filter((n) => n?.done).length;

          return (
            <div
              key={subject.key}
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 16,
                marginBottom: "0.75rem",
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => toggleSubject(subject.key)}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: "1rem 1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      color: DARK,
                      fontSize: "0.95rem",
                    }}
                  >
                    {subject.name}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: MUTED }}>
                    {doneInSubject}/{subject.topics.length} done
                  </span>
                  {/* Progress bar */}
                  <div
                    style={{
                      width: 60,
                      height: 6,
                      background: BORDER,
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${(doneInSubject / subject.topics.length) * 100}%`,
                        height: "100%",
                        background: OLIVE,
                        borderRadius: 10,
                      }}
                    />
                  </div>
                </div>
                {expanded ? (
                  <ChevronUp size={18} color={MUTED} />
                ) : (
                  <ChevronDown size={18} color={MUTED} />
                )}
              </button>

              {expanded && (
                <div style={{ borderTop: `1px solid ${BORDER}` }}>
                  {subject.topics.map((topic) => {
                    const note = getNote(subject.key, topic);
                    const done = note?.done ?? false;
                    return (
                      <div
                        key={topic}
                        style={{
                          padding: "0.75rem 1.25rem",
                          borderBottom: `1px solid ${BORDER}44`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "1rem",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 600,
                                color: done ? MUTED : CHARCOAL,
                                fontSize: "0.9rem",
                                textDecoration: done ? "line-through" : "none",
                              }}
                            >
                              {topic}
                            </span>
                          </div>
                          {note?.noted_at && (
                            <div
                              style={{
                                fontSize: "0.72rem",
                                color: MUTED,
                                marginTop: "0.15rem",
                              }}
                            >
                              Notes made:{" "}
                              {format(
                                new Date(note.noted_at),
                                "MMM d, yyyy · h:mm a",
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() =>
                            toggleNote(subject.key, subject.name, topic)
                          }
                          style={{
                            background: done ? "#E8F5E9" : CREAM,
                            border: `1.5px solid ${done ? OLIVE : BORDER}`,
                            borderRadius: 8,
                            padding: "0.35rem 0.75rem",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: done ? OLIVE : MUTED,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            flexShrink: 0,
                          }}
                        >
                          {done ? (
                            <>
                              <CheckSquare size={14} /> Done
                            </>
                          ) : (
                            <>
                              <Square size={14} /> Mark Done
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
