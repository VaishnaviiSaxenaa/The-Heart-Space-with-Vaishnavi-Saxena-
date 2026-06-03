import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { format, differenceInDays } from "date-fns";
import { ChevronDown, ChevronUp, RotateCcw, Send } from "lucide-react";

const CREAM = "#FAF7F2";
const CHARCOAL = "#2C1810";
const GOLD = "#C9A96E";
const DARK = "#3D2314";
const CARD = "#FFFFFF";
const MUTED = "#8C7B70";
const BORDER = "#E8DDD0";
const OLIVE = "#6E8B6B";

// JAM subjects and topics (matches syllabus tracker)
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
      "Complex Numbers",
      "Analytic Functions",
      "Contour Integration",
      "Laurent Series",
      "Residue Theorem",
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

const CONFIDENCE = [
  {
    key: "not_confident",
    label: "Not Confident",
    color: "#C62828",
    bg: "#FFEBEE",
  },
  {
    key: "somewhat_confident",
    label: "Somewhat Confident",
    color: "#E65100",
    bg: "#FFF3E0",
  },
  {
    key: "very_confident",
    label: "Very Confident",
    color: OLIVE,
    bg: "#E8F5E9",
  },
];

interface RevisionLog {
  id: string;
  topic_key: string;
  subject: string;
  topic: string;
  confidence: string;
  revised_at: string;
}

export default function RevisionTracker() {
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : "";
  const examType = (user as any)?.examType ?? "JAM";
  const subjects =
    examType === "NET_GATE" ? [...JAM_SUBJECTS, ...NET_EXTRA] : JAM_SUBJECTS;

  const [logs, setLogs] = useState<RevisionLog[]>([]);
  const [methodResponses, setMethodResponses] = useState<string[]>([]);
  const [newMethod, setNewMethod] = useState("");
  const [showMethodInput, setShowMethodInput] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(
    new Set([subjects[0]?.key]),
  );
  const [revising, setRevising] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      supabase
        .from("revision_logs")
        .select("*")
        .eq("student_id", userId)
        .order("revised_at", { ascending: false }),
      supabase
        .from("revision_method")
        .select("*")
        .eq("student_id", userId)
        .single(),
    ]).then(([logsRes, methodRes]) => {
      if (logsRes.data) setLogs(logsRes.data as RevisionLog[]);
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
    await supabase.from("revision_method").upsert(
      {
        student_id: userId,
        responses: updated,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id" },
    );
  }

  async function logRevision(
    subjectKey: string,
    subjectName: string,
    topicName: string,
  ) {
    if (!confidence) return;
    const topicKey = `${subjectKey}::${topicName}`;
    const { data } = await supabase
      .from("revision_logs")
      .insert({
        student_id: userId,
        topic_key: topicKey,
        subject: subjectName,
        topic: topicName,
        confidence,
      })
      .select()
      .single();
    if (data) setLogs((prev) => [data as RevisionLog, ...prev]);
    setRevising(null);
    setConfidence("");
  }

  function getTopicLogs(subjectKey: string, topicName: string) {
    return logs.filter((l) => l.topic_key === `${subjectKey}::${topicName}`);
  }

  function getLastRevised(subjectKey: string, topicName: string) {
    const tl = getTopicLogs(subjectKey, topicName);
    if (!tl.length) return null;
    return new Date(tl[0].revised_at);
  }

  function getDueStatus(subjectKey: string, topicName: string) {
    const last = getLastRevised(subjectKey, topicName);
    if (!last) return "never";
    const days = differenceInDays(new Date(), last);
    if (days >= 7) return "due";
    return "ok";
  }

  function toggleSubject(key: string) {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const totalTopics = subjects.reduce((a, s) => a + s.topics.length, 0);
  const revisedOnce = new Set(logs.map((l) => l.topic_key)).size;
  const dueCount = subjects.reduce(
    (a, s) =>
      a + s.topics.filter((t) => getDueStatus(s.key, t) === "due").length,
    0,
  );

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
            Revision Tracker
          </h1>
          <p style={{ color: MUTED, margin: "0.4rem 0 0", fontSize: "0.9rem" }}>
            Track your revisions and stay on schedule
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
            { label: "Topics Revised", value: revisedOnce, color: GOLD },
            { label: "Total Topics", value: totalTopics, color: CHARCOAL },
            {
              label: "Due for Revision",
              value: dueCount,
              color: dueCount > 0 ? "#C62828" : OLIVE,
            },
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

        {/* How do you revise? */}
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
              💭 How do you revise?
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
                placeholder="Describe your revision method..."
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
              No responses yet. How do you revise your topics?
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

        {/* Due for revision alert */}
        {dueCount > 0 && (
          <div
            style={{
              background: "#FFF3E0",
              border: "1.5px solid #E65100",
              borderRadius: 14,
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>⚠️</span>
            <div>
              <div
                style={{
                  fontWeight: 700,
                  color: "#E65100",
                  fontSize: "0.9rem",
                }}
              >
                Revision due!
              </div>
              <div style={{ color: "#E65100", fontSize: "0.85rem" }}>
                {dueCount} topic{dueCount > 1 ? "s" : ""} haven't been revised
                in 7+ days. Try to revise at least once a week.
              </div>
            </div>
          </div>
        )}

        {/* Techniques */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "1.25rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: CHARCOAL, margin: "0 0 1rem" }}>🧠 Revision Techniques</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={{ background: "#EEF2FF", borderRadius: 12, padding: "1rem", border: "1px solid #C7D2FE" }}>
              <div style={{ fontWeight: 700, color: "#3730A3", fontSize: "0.9rem", marginBottom: "0.4rem" }}>⚡ Active Recall</div>
              <div style={{ fontSize: "0.8rem", color: "#4338CA", lineHeight: 1.5 }}>Close your notes and try to recall the concept from memory — or after a lecture, recall everything you learned. Test yourself by trying to remember instead of re-reading. This is proven to be 2-3× more effective than passive reading.</div>
            </div>
            <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "1rem", border: "1px solid #BBF7D0" }}>
              <div style={{ fontWeight: 700, color: "#166534", fontSize: "0.9rem", marginBottom: "0.4rem" }}>📅 Spaced Repetition</div>
              <div style={{ fontSize: "0.8rem", color: "#15803D", lineHeight: 1.5 }}>Revise a topic (by recalling) the same day, then 7 days, then 4 weeks. You can choose to recall immediately after the lecture or at the end of the day. Each time you recall successfully, increase the gap. This builds long-term memory efficiently.</div>
            </div>
          </div>
        </div>

        {/* Subject list */}
        {subjects.map((subject) => {
          const expanded = expandedSubjects.has(subject.key);
          const subjectLogs = logs.filter((l) => l.subject === subject.name);
          const revisedCount = new Set(subjectLogs.map((l) => l.topic_key))
            .size;
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
                    {revisedCount}/{subject.topics.length} revised
                  </span>
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
                    const topicKey = `${subject.key}::${topic}`;
                    const topicLogs = getTopicLogs(subject.key, topic);
                    const lastRevised = getLastRevised(subject.key, topic);
                    const status = getDueStatus(subject.key, topic);
                    const isRevising = revising === topicKey;
                    const latestConf = topicLogs[0]?.confidence;
                    const confInfo = CONFIDENCE.find(
                      (c) => c.key === latestConf,
                    );

                    return (
                      <div
                        key={topic}
                        style={{
                          padding: "0.85rem 1.25rem",
                          borderBottom: `1px solid ${BORDER}88`,
                          display: "flex",
                          alignItems: "flex-start",
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
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 600,
                                color: CHARCOAL,
                                fontSize: "0.9rem",
                              }}
                            >
                              {topic}
                            </span>
                            {status === "never" && (
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  background: "#F5F5F5",
                                  color: MUTED,
                                  borderRadius: 20,
                                  padding: "0.15rem 0.5rem",
                                  fontWeight: 600,
                                }}
                              >
                                Not yet revised
                              </span>
                            )}
                            {status === "due" && (
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  background: "#FFEBEE",
                                  color: "#C62828",
                                  borderRadius: 20,
                                  padding: "0.15rem 0.5rem",
                                  fontWeight: 600,
                                }}
                              >
                                ⚠️ Due
                              </span>
                            )}
                            {confInfo && (
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  background: confInfo.bg,
                                  color: confInfo.color,
                                  borderRadius: 20,
                                  padding: "0.15rem 0.5rem",
                                  fontWeight: 600,
                                }}
                              >
                                {confInfo.label}
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: MUTED,
                              marginTop: "0.2rem",
                            }}
                          >
                            {topicLogs.length > 0 ? (
                              <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                                <button onClick={() => setExpandedHistory(prev => { const n = new Set(prev); n.has(topicKey) ? n.delete(topicKey) : n.add(topicKey); return n; })}
                                  style={{ background: "none", border: "none", padding: 0, fontSize: "0.75rem", color: GOLD, cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}>
                                  Revised {topicLogs.length}×
                                </button>
                                <span>· Last: {format(new Date(topicLogs[0].revised_at), "MMM d, yyyy")}</span>
                              </span>
                            ) : (
                              "Never revised"
                            )}
                          </div>
                          {expandedHistory.has(topicKey) && (
                            <div style={{ marginTop: "0.5rem", background: CREAM, borderRadius: 8, padding: "0.5rem 0.75rem", border: `1px solid ${BORDER}` }}>
                              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: MUTED, marginBottom: "0.3rem", textTransform: "uppercase" }}>Revision History</div>
                              {topicLogs.map((log, i) => {
                                const conf = CONFIDENCE.find(c => c.key === log.confidence);
                                return (
                                  <div key={log.id} style={{ fontSize: "0.78rem", color: CHARCOAL, display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.2rem 0" }}>
                                    <span style={{ color: MUTED }}>#{topicLogs.length - i}</span>
                                    <span>{format(new Date(log.revised_at), "MMM d, yyyy · h:mm a")}</span>
                                    {conf && <span style={{ background: conf.bg, color: conf.color, borderRadius: 20, padding: "0.1rem 0.4rem", fontSize: "0.7rem", fontWeight: 600 }}>{conf.label}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {isRevising && (
                            <div
                              style={{
                                marginTop: "0.75rem",
                                background: CREAM,
                                borderRadius: 10,
                                padding: "0.75rem",
                                border: `1px solid ${BORDER}`,
                              }}
                            >
                              <p
                                style={{
                                  fontSize: "0.8rem",
                                  fontWeight: 600,
                                  color: CHARCOAL,
                                  margin: "0 0 0.5rem",
                                }}
                              >
                                How confident are you after revising?
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "0.4rem",
                                  flexWrap: "wrap",
                                  marginBottom: "0.5rem",
                                }}
                              >
                                {CONFIDENCE.map((c) => (
                                  <button
                                    key={c.key}
                                    onClick={() => setConfidence(c.key)}
                                    style={{
                                      background:
                                        confidence === c.key ? c.bg : CARD,
                                      color:
                                        confidence === c.key ? c.color : MUTED,
                                      border: `1.5px solid ${confidence === c.key ? c.color : BORDER}`,
                                      borderRadius: 8,
                                      padding: "0.35rem 0.65rem",
                                      fontSize: "0.78rem",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    {c.label}
                                  </button>
                                ))}
                              </div>
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button
                                  onClick={() =>
                                    logRevision(
                                      subject.key,
                                      subject.name,
                                      topic,
                                    )
                                  }
                                  disabled={!confidence}
                                  style={{
                                    background: confidence ? OLIVE : BORDER,
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 8,
                                    padding: "0.4rem 0.85rem",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    cursor: confidence ? "pointer" : "default",
                                  }}
                                >
                                  Log Revision
                                </button>
                                <button
                                  onClick={() => {
                                    setRevising(null);
                                    setConfidence("");
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
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {!isRevising && (
                          <button
                            onClick={() => {
                              setRevising(topicKey);
                              setConfidence("");
                            }}
                            style={{
                              background: CREAM,
                              border: `1px solid ${BORDER}`,
                              borderRadius: 8,
                              padding: "0.35rem 0.65rem",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              color: CHARCOAL,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              flexShrink: 0,
                            }}
                          >
                            <RotateCcw size={13} /> Revised
                          </button>
                        )}
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
