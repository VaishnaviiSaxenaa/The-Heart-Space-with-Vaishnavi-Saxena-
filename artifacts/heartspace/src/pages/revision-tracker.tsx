import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { loadRevisionSpeedFromDB, saveRevisionSpeedToDB, loadTopicSpeedFromDB } from "../lib/supabase-sync";
import { format, differenceInDays } from "date-fns";
import { ChevronDown, ChevronUp, RotateCcw, Send } from "lucide-react";
import GenericCalendar, { GenericSubjectDef, loadGenericCalendarFromDB, calendarKey } from "./generic-calendar";
import { JAM_SUBJECTS as ROADMAP_SUBJECTS_JAM, NET_SUBJECTS as ROADMAP_SUBJECTS_NET } from "./subjects";
import { MyProgressTab } from "./roadmap";

const CREAM = "#F8F5F0";
const CHARCOAL = "#2D2A25";
const GOLD = "#C9A84C";
const PROGRESS_PURPLE = "#6B568F";
const DARK = "#2D2A25";
const CARD = "#FFFDF9";
const MUTED = "#7A7267";
const BORDER = "#E5DDD0";
const OLIVE = "#6E8B6B";

/* Roadmap subjects with hours, used ONLY for the Revision Calendar below.
   These match roadmap.tsx exactly so revision hours = 40% of study hours. */
/* ROADMAP_SUBJECTS now imported from ./subjects.ts (canonical source) */

// JAM subjects and topics (matches syllabus tracker)
const JAM_SUBJECTS = [
  {
    key: "linear_algebra",
    name: "Linear Algebra",
    topics: [
      { name: "SOLE", subtopics: [
        "Simultaneous Eq.",
        "ERO's & pivot",
        "Rank",
        "Investigation of Simultaneous Eq.",
        "Matrix & determinants",
      ]},
      { name: "Vector Space", subtopics: [
        "Vector Space",
        "Field",
        "Matrix Space",
        "Space for All Polynomials",
        "Subspace & its Test",
        "Span",
        "LI & LD Vectors",
        "Basis & Dimension",
        "Investigation on Subspaces",
      ]},
      { name: "Linear Transformation", subtopics: [
        "Linear Transformation",
        "Matrix Representation of LT",
        "Null Space",
        "Range Space",
        "Onto & One-One Criteria",
        "Rank-Nullity Theorem",
        "Composition in LT",
        "Change of Basis",
      ]},
      { name: "Eigenvalues", subtopics: [
        "Introduction of EV",
        "Eigenvalues & Eigenvectors",
        "Eigenspace of lambda",
        "Diagonalizability",
        "Eigenvalue Problem",
        "Cases of Repeated Eigenvalues",
        "Important Properties of EV",
        "Properties of EV related to Matrices",
        "Minimal & Characteristic Polynomial",
        "Monic Polynomial",
      ]},
    ],
  },
  {
    key: "real_analysis",
    name: "Real Analysis",
    topics: [
      { name: "Set Theory & Point Set Topology", subtopics: [
        "Sets & some terminologies",
        "Relation & Functions",
        "Countability & its properties",
        "Natural Numbers",
        "Rational Numbers & its drawbacks",
        "Bounded Sets & LUB-GLB",
        "Archimedean Property",
        "Intervals",
        "Neighbourhood of a Set",
        "Interior Point & Open Sets",
        "Limit Point & Derived Sets",
        "Closed Sets",
        "Isolated Point",
        "Closure of a Set",
        "Dense & Perfect Set",
        "Open & Closed Covers",
        "Heine-Borel Theorem",
        "Lindelof Theorem",
        "Sequential Compactness",
        "Bolzano-Weierstrass Property",
        "Connected & Disconnected Sets",
        "Countable Sets & Properties",
        "Denumerable Set",
        "Power Set",
        "Cardinal Numbers & its Types",
        "Continuum Hypothesis",
      ]},
      { name: "Real Sequences", subtopics: [
        "Real Sequences",
        "Convergence of R.S.",
        "Bounded Sequence",
        "Limit Point of a Sequence",
        "Limit Superior & Inferior",
        "Bolzano-Weierstrass Theorem",
        "Sandwich Theorem",
        "Properties",
        "Divergent Sequence",
        "Methods of Convergence",
        "Direct Substitution",
        "Telescopic Method",
        "Method of Inequalities",
        "MCT & Wavy Curve",
        "Cauchy Criteria of Convergence",
        "AM-GM Inequality",
        "Fixed Point Iteration",
        "Subsequence",
        "Contractive Sequences",
        "Cauchy's Theorems on Limits",
        "Stolz-Cesaro Theorem",
      ]},
      { name: "Infinite Series", subtopics: [
        "Infinite Series & Properties",
        "Cauchy Criteria of Convergence",
        "SOPT (Series of Positive Terms)",
        "Tests for SOPT",
        "Comparison Tests",
        "Integral Test (of Test)",
        "Ratio & Root Test",
        "Log Test",
        "Raabe's Test",
        "Integral Test",
        "CCT",
        "General Ratio & Root Test",
        "Alternating Series",
        "Test for Alternating Series",
        "Absolute Convergence",
        "Conditional Convergence",
        "Leibnitz Test",
        "Abel's Test",
        "Dirichlet's Test",
      ]},
      { name: "Power Series", subtopics: [
        "Power Series & its Types",
        "Tests for Convergence",
        "Ratio Test",
        "Root Test",
        "Manual Investigation",
        "Sum of Series",
        "Differentiation & Integration of Power Series",
        "Representation of Some Functions as a Power Series",
      ]},
    ],
  },
  {
    key: "functions_of_one_variable",
    name: "Functions of One Variable",
    topics: [
      { name: "Functions", subtopics: [
        "Relation",
        "Function",
        "Types of Function",
        "Transformation of Graphs",
      ]},
      { name: "Limits", subtopics: [
        "Limits (formal+calculative)",
        "L'Hospital Rule",
        "Sequential Criteria of Limits",
        "Squeeze Principle",
      ]},
      { name: "Continuity", subtopics: [
        "Continuity (formal+calculative)",
        "Sequential Criteria of Continuity",
        "Properties of Continuity (basic+adv)",
        "Discontinuity",
      ]},
      { name: "Differentiability", subtopics: [
        "Differentiability",
        "Properties of Differentiable Functions",
        "Inverse Derivative Theorem",
        "Darboux's Theorem",
        "Mean Value Theorem",
        "Mean Value Theorem - Rolle's Theorem",
        "Mean Value Theorem - LMVT",
        "Mean Value Theorem - Cauchy's MVT",
      ]},
      { name: "Inc-Dec Functions & Max-Min", subtopics: [
        "Inc-Dec Function over an Interval",
        "Differentiability & Inc-Dec Function",
        "Local & Global Extrema",
        "Critical Point",
        "Stationary Point",
        "Point of Inflection",
        "Concavity",
        "Derivative Tests",
        "Leibnitz Rule",
      ]},
    ],
  },
  {
    key: "group_theory",
    name: "Group Theory",
    topics: [
      { name: "Groups & Cyclic Groups", subtopics: [
        "Group and its Properties",
        "Cayley Table",
        "Some Important Groups",
        "Subgroups",
        "Cyclic Groups & Generators",
        "Results on Cyclic Groups",
        "Fundamental Theorem of Cyclic Groups",
        "Evaluation of Subgroups",
      ]},
      { name: "Permutation Group", subtopics: [
        "Permutation & Symmetric Groups",
        "Methods of Representation",
        "Properties",
        "Even and Odd Permutations",
        "Alternating Group",
        "Conjugacy in An/Sn",
      ]},
      { name: "Isomorphism", subtopics: [
        "Isomorphism & Properties",
        "Cayley's Theorem",
        "Automorphism & Inner Automorphism",
        "Some Important Results",
        "Classification of Groups",
      ]},
      { name: "Cosets & EDP", subtopics: [
        "Cosets and Properties",
        "Lagrange's Theorem",
        "Fermat's Little Theorem",
        "External Direct Product",
        "Properties of EDP",
      ]},
      { name: "Normal Subgroups & Quotient Group", subtopics: [
        "Normal Subgroups",
        "Quotient Group",
        "Important Results",
      ]},
      { name: "Homomorphism & Sylow's Theorem", subtopics: [
        "Homomorphism and its Kernel",
        "Properties of Homomorphism wrt Elements",
        "Properties of Homomorphism wrt Groups",
        "Fundamental Theorem of Homomorphism",
        "Normal Subgroups as Kernel",
        "Results",
        "Sylow's First Theorem",
        "Sylow-P Subgroup",
        "Conjugate Subgroup",
        "Sylow's 2nd Theorem",
        "Sylow's 3rd Theorem",
      ]},
    ],
  },
  {
    key: "multiple_variable_calculus",
    name: "Multiple Variable Calculus",
    topics: [
      { name: "LCD (2 Variables)", subtopics: [
        "Existence of Limits",
        "Non-existence of Limits & Methods",
        "Rational Limit Theorem",
        "Sertoz Theorem",
        "Polar Form of Limits",
        "Simultaneous and Repeated Limits",
        "Continuity and its Requirement",
        "Formal Def of Limit and Continuity",
        "Mixed & Higher Order Derivatives",
        "Partial Derivatives and Continuity",
        "Differentiability",
        "Polar Form",
      ]},
      { name: "Maxima & Minima", subtopics: [
        "Definition",
        "Critical Point",
        "Derivative Test for Local Extrema",
        "Saddle Point",
        "Euler's Homogenous Theorem",
        "Directional Derivative and Gradient",
        "Young's & Schwarz's Theorem",
        "Implicit Differentiation Formula",
      ]},
      { name: "Lagrange's Multiplier", subtopics: [
        "Lagrange's Multiplier",
        "Tangent Plane",
      ]},
    ],
  },
  {
    key: "ode",
    name: "ODE",
    topics: [
      { name: "First Order ODEs", subtopics: [
        "Separable, Exact, Integrating Factors",
        "Linear First Order, Bernoulli Equation",
        "Clairaut Equation, Singular Solutions",
        "Orthogonal Trajectories",
      ]},
      { name: "Higher Order Linear ODEs", subtopics: [
        "Constant Coefficient - Homogeneous",
        "Characteristic Equation, Complementary Function",
        "Particular Integral - Undetermined Coefficients",
        "Variation of Parameters, Cauchy-Euler Equation",
      ]},
    ],
  },
  {
    key: "integration",
    name: "Integration",
    topics: [
      { name: "Double Integrals", subtopics: [
        "Double Integrals - Cartesian Form",
        "Double Integrals - Polar Form",
        "Change of Order of Integration",
      ]},
      { name: "Triple Integrals", subtopics: [
        "Triple Integrals - Cartesian Form",
        "Triple Integrals - Spherical and Cylindrical Forms",
      ]},
      { name: "Applications", subtopics: [
        "Surface Area",
        "Solids of Revolution",
        "Volume Calculations",
      ]},
    ],
  },
  {
    key: "miscellaneous",
    name: "Miscellaneous",
    topics: [
      { name: "Miscellaneous Topics", subtopics: [
        "SOR/VOR",
        "Surface Area",
        "Riemann Integration",
        "Taylor's Series",
        "Permutation and Combination",
        "Binomial Theorem",
      ]},
    ],
  },
];
function flatSubtopics(s) {
  return s.topics.flatMap((t) => t.subtopics);
}

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
  const rawUserId = user?.id ? String(user.id) : "";
  const viewAsId = new URLSearchParams(window.location.search).get("viewAs");
  const userId = viewAsId ?? rawUserId;
  const isViewMode = !!viewAsId;
  const [viewedExamType, setViewedExamType] = useState<string | null>(null);
  useEffect(() => {
    if (!viewAsId) return;
    supabase.from("profiles").select("exam_type").eq("id", viewAsId).single()
      .then(({ data }) => setViewedExamType(data?.exam_type ?? null));
  }, [viewAsId]);
  const examType = (isViewMode ? viewedExamType : (user as any)?.exam_type) ?? "JAM";
  const subjects =
    examType === "NET_GATE" ? [...JAM_SUBJECTS, ...NET_EXTRA] : JAM_SUBJECTS;

  /* Revision calendar setup: 40% of each subject's study hours */
  const roadmapSubjects = examType === "NET_GATE" ? ROADMAP_SUBJECTS_NET : ROADMAP_SUBJECTS_JAM;
  const _effectiveUid = userId || (() => { try { return JSON.parse(localStorage.getItem("heartspace_user")||"{}").id||""; } catch { return ""; } })();
  const SPEED_MULTS: Record<string, number> = { gentle: 1.40, steady: 1.30, standard: 1.00, accelerated: 0.70, rapid: 0.60 };
  const SPEED_OPTS = [["gentle","🐢","Gentle +40%"],["steady","🌿","Steady +30%"],["standard","⚖️","Standard"],["accelerated","⚡","-30%"],["rapid","🚀","-40%"]] as const;
  const [studySpeedMap, setStudySpeedMap] = useState<Record<string,string>>(() => { try { return JSON.parse(localStorage.getItem(`hs_topic_speed_${_effectiveUid}`) ?? "{}"); } catch { return {}; } });
  const [revSpeedMap, setRevSpeedMap] = useState<Record<string,string>>(() => { try { return JSON.parse(localStorage.getItem(`hs_revision_speed_${_effectiveUid}`) ?? "{}"); } catch { return {}; } });
  useEffect(() => {
    if (!_effectiveUid) return;
    loadRevisionSpeedFromDB(_effectiveUid).then((d) => {
      if (d) {
        try { localStorage.setItem(`hs_revision_speed_${_effectiveUid}`, JSON.stringify(d)); } catch {}
        setRevSpeedMap(d as Record<string, string>);
      }
    });
  }, [_effectiveUid]);
  useEffect(() => {
    if (!_effectiveUid) return;
    loadTopicSpeedFromDB(_effectiveUid).then((d) => {
      if (d) {
        try { localStorage.setItem(`hs_topic_speed_${_effectiveUid}`, JSON.stringify(d)); } catch {}
        setStudySpeedMap(d as Record<string, string>);
      }
    });
  }, [_effectiveUid]);
  const [coverageTick, setCoverageTick] = useState(0);
  useEffect(() => {
    if (!_effectiveUid) return;
    loadGenericCalendarFromDB("revision", _effectiveUid).then((d) => {
      if (d && Object.keys(d).length > 0) {
        try { localStorage.setItem(calendarKey("revision", _effectiveUid), JSON.stringify(d)); } catch {}
        setCoverageTick((t) => t + 1);
      }
    });
  }, [_effectiveUid]);
  const revisionSubjects: GenericSubjectDef[] = roadmapSubjects.map((s) => {
    const studyMult = SPEED_MULTS[studySpeedMap[s.id]] ?? 1.0;
    const revMult = SPEED_MULTS[revSpeedMap[s.id]] ?? 1.0;
    return {
      id: s.id,
      name: s.name,
      totalHours: Math.round(s.totalHours * studyMult * 0.4 * revMult * 10) / 10,
    };
  });
  let revisionStartDate = format(new Date(), "yyyy-MM-dd");
  let revisionHoursPerDay = 2;
  let revisionDaysPerWeek = 5;
  try {
    const rm = JSON.parse(localStorage.getItem(`hs_roadmap_${userId}`) || "{}");
    if (rm.startDate) revisionStartDate = rm.startDate;
    const inputs = JSON.parse(localStorage.getItem(`hs_schedule_inputs_${userId}`) || "{}");
    if (inputs.hoursPerDay) revisionHoursPerDay = inputs.hoursPerDay;
    if (inputs.daysPerWeek) revisionDaysPerWeek = inputs.daysPerWeek;
  } catch {}
  const [activeTab, setActiveTab] = useState<"log" | "calendar" | "progress">("log");

  const [logs, setLogs] = useState<RevisionLog[]>([]);
  const [methodResponses, setMethodResponses] = useState<string[]>([]);
  const [newMethod, setNewMethod] = useState("");
  const [showMethodInput, setShowMethodInput] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(
    new Set([subjects[0]?.key]),
  );
  const [expandedTopicGroups, setExpandedTopicGroups] = useState<Set<string>>(new Set());
  const toggleTopicGroup = (k: string) => setExpandedTopicGroups((prev) => {
    const n = new Set(prev);
    n.has(k) ? n.delete(k) : n.add(k);
    return n;
  });
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

  const totalTopics = subjects.reduce((a, s) => a + flatSubtopics(s).length, 0);
  const revisedOnce = new Set(logs.map((l) => l.topic_key)).size;
  const dueCount = subjects.reduce(
    (a, s) =>
      a + flatSubtopics(s).filter((t) => getDueStatus(s.key, t) === "due").length,
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

        {/* Revision Speed Picker - Topic-wise */}
        <div style={{ background: "#FFFDF9", border: "1px solid #E5DDD0", borderRadius: 12, padding: "0.75rem 1rem", marginBottom: "1rem" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7A7267", margin: "0 0 0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Revision Speed per Subject</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {roadmapSubjects.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#2D2A25", minWidth: 120 }}>{s.name}</span>
                <div style={{ display: "flex", gap: "0.25rem", flex: 1 }}>
                  {SPEED_OPTS.map(([key, emoji, label]) => {
                    const current = revSpeedMap[s.id] ?? "standard";
                    return (
                      <button key={key} onClick={() => {
                        const next = { ...revSpeedMap, [s.id]: key };
                        setRevSpeedMap(next);
                        localStorage.setItem(`hs_revision_speed_${_effectiveUid}`, JSON.stringify(next));
                        saveRevisionSpeedToDB(_effectiveUid, next);
                      }}
                      style={{
                        flex: 1, padding: "0.2rem 0.1rem", borderRadius: 6, fontSize: "0.6rem", fontWeight: 600, cursor: "pointer",
                        background: current === key ? "#6B568F" : "#F8F5F0",
                        color: current === key ? "#fff" : "#7A7267",
                        border: `1px solid ${current === key ? "#6B568F" : "#E5DDD0"}`,
                      }}>{emoji} {label}</button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.5rem" }}>
          {(["log", "calendar", "progress"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? DARK : `${BORDER}88`,
                color: activeTab === tab ? CREAM : MUTED,
                border: "none",
                borderRadius: 12,
                padding: "0.5rem 1.1rem",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              {tab === "log" ? "📝 Revision Log" : tab === "calendar" ? "📅 Calendar" : "📊 My Progress"}
            </button>
          ))}
        </div>
        {activeTab === "progress" && userId && (
          <MyProgressTab userId={userId} examType={examType} storagePrefix="rev" getSubjectHours={(syllabusId) => {
            const s = revisionSubjects.find((rs: any) => rs.syllabusId === syllabusId);
            if (!s) return null;
            try {
              const revCal = JSON.parse(localStorage.getItem(`hs_cal_revision_${_effectiveUid}`) ?? "{}");
              const todayLocal = new Date();
              const todayKey = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth()+1).padStart(2,"0")}-${String(todayLocal.getDate()).padStart(2,"0")}`;
              let consumed = 0;
              Object.entries(revCal).forEach(([day, entries]: [string, any]) => {
                if (day <= todayKey) entries.forEach((e: any) => { if (e.subjectId === s.id) consumed += e.hours; });
              });
              return { consumed, total: s.totalHours };
            } catch { return { consumed: 0, total: s.totalHours }; }
          }} />
        )}

        {activeTab === "calendar" && userId && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "1.25rem" }}>
            <GenericCalendar
              namespace="revision"
              uid={userId}
              subjects={revisionSubjects}
              startDate={revisionStartDate}
              hoursPerDay={revisionHoursPerDay}
              daysPerWeek={revisionDaysPerWeek}
              title="📅 Revision Calendar (40% of study hours)"
            />
          </div>
        )}

        {activeTab === "log" && (
        <>
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
            { label: "Topics Revised", value: revisedOnce, color: PROGRESS_PURPLE },
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
                background: PROGRESS_PURPLE,
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
                        color: PROGRESS_PURPLE,
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
                    {revisedCount}/{flatSubtopics(subject).length} revised
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
                  {subject.topics.map((topicGroup) => {
                    const tgKey = `${subject.key}::${topicGroup.name}`;
                    const tgOpen = expandedTopicGroups.has(tgKey);
                    return (
                    <div key={topicGroup.name}>
                      <button
                        onClick={() => toggleTopicGroup(tgKey)}
                        style={{ width: "100%", textAlign: "left", padding: "0.6rem 1.25rem", background: `${BORDER}33`, fontSize: "0.78rem", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.02em", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      >
                        {topicGroup.name}
                        <span>{tgOpen ? "−" : "+"}</span>
                      </button>
                      {tgOpen && topicGroup.subtopics.map((topic) => {
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
                                  style={{ background: "none", border: "none", padding: 0, fontSize: "0.75rem", color: PROGRESS_PURPLE, cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}>
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
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </>
        )}
      </div>
    </div>
  );
}
