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

const CREAM = "#F8F5F0";
const CHARCOAL = "#2D2A25";
const GOLD = "#C9A84C";
const DARK = "#2D2A25";
const CARD = "#FFFDF9";
const MUTED = "#7A7267";
const BORDER = "#E5DDD0";
const OLIVE = "#6E8B6B";

export const JAM_SUBJECTS = [
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

export const NET_SUBJECTS = [
  {
    key: "linear_algebra_net",
    name: "Linear Algebra",
    topics: [
      { name: "System of Linear Equations", subtopics: [
        "Consistent and Inconsistent system",
        "Homogeneous system",
        "Method of solution",
      ]},
      { name: "Matrices and Determinants", subtopics: [
        "Types of Matrices",
        "Determinant and its properties",
      ]},
      { name: "Vector Spaces", subtopics: [
        "Definition and Examples",
        "Subspace",
        "Span",
        "Linear independence",
        "Basis and dimension",
        "Investigation on subspaces - Union, intersection and Sum",
      ]},
      { name: "Linear Transformations", subtopics: [
        "Definition",
        "Matrix representation",
        "Range space, null space",
        "Rank nullity theorem",
        "One-one and onto transformation",
        "Composition and inverse",
        "Change of Basis",
      ]},
      { name: "Eigenvalues and Eigenvectors", subtopics: [
        "Eigenvalue problem",
        "Properties of eigenvalues and eigenvectors",
        "Algebraic and Geometric Multiplicity",
        "Diagonalization",
        "Eigenvalues of special matrices",
        "Annihilating and Minimal Polynomial",
      ]},
      { name: "Inner Product Spaces", subtopics: [
        "Definition",
        "Norm of vector space",
      ]},
      { name: "Jordan Canonical Forms", subtopics: [
        "Definition and Method of Solution",
      ]},
      { name: "Bilinear and Quadratic Forms", subtopics: [
        "Triangular form",
        "Matrix representation",
      ]},
    ],
  },
  {
    key: "complex_analysis",
    name: "Complex Analysis",
    topics: [
      { name: "Basic Definitions", subtopics: [
        "Basic Definitions",
      ]},
      { name: "Complex Valued Functions", subtopics: [
        "Complex Valued Functions",
      ]},
      { name: "Analytic Functions", subtopics: [
        "Limit, Continuity, Differentiability, Analytic Functions, Liouville Theorem",
        "Open mapping theorem",
        "Rouche Theorem",
        "Schwarz Lemma",
        "Results on polynomials",
      ]},
      { name: "Complex Integration", subtopics: [
        "Contour integration",
        "Cauchy integral formula",
        "Polar form of integration",
        "ML Inequality",
      ]},
      { name: "Taylor Series and Laurent Series", subtopics: [
        "Taylor Series and Laurent Series",
      ]},
      { name: "Residues and Poles", subtopics: [
        "Singularity and its types",
        "Types of poles",
        "Types of zeroes and method of evaluation",
      ]},
      { name: "Complex Mapping", subtopics: [
        "Some important maps",
        "Mobius Transformation",
        "Mapping on disc",
        "Conformal Mapping",
      ]},
    ],
  },
  {
    key: "real_analysis_net",
    name: "Real Analysis",
    topics: [
      { name: "Set Theory", subtopics: [
        "Set Theory",
      ]},
      { name: "Sequences of Real Numbers", subtopics: [
        "Methods of Convergence",
        "Cauchy Sequences",
        "Contractive Sequences",
        "Cauchy's Theorem",
      ]},
      { name: "Series of Real Numbers", subtopics: [
        "Series of Positive Terms",
        "Infinite Series",
        "Power Series",
      ]},
      { name: "Sequences & Series of Functions", subtopics: [
        "Pointwise vs Uniform Convergence",
        "Tests for Uniform Convergence",
        "Term-by-term Differentiation/Integration",
      ]},
    ],
  },
  {
    key: "differential_calculus_net",
    name: "Differential Calculus",
    topics: [
      { name: "Function of One Variable", subtopics: [
        "Function, Limit, Continuity",
        "Properties of Continuity",
        "Differentiability",
        "Mean Value Theorems",
        "Increasing/Decreasing Functions",
        "Maxima & Minima",
      ]},
      { name: "Function of Several Variables", subtopics: [
        "Limit, Continuity",
        "Partial Derivatives",
        "Differentiability",
        "Maxima & Minima",
        "Inverse and Implicit Function Theorem",
      ]},
    ],
  },
  {
    key: "abstract_algebra",
    name: "Modern Algebra",
    topics: [
      { name: "Group Theory", subtopics: [
        "Cyclic Groups",
        "Isomorphism",
        "Cosets and Lagrange's Theorem",
        "External Direct Product",
        "Sylow's Theorems",
        "Homomorphism",
      ]},
      { name: "Ring Theory", subtopics: [
        "Rings and Subrings",
        "Integral Domain",
        "Ring Homomorphism",
        "Ideals",
        "Polynomial Rings - Irreducibility Criteria, Eisenstein Criterion, Test of Degree 2 and 3, Gauss Test, Tests on Z",
        "UFD, PID and ED",
      ]},
      { name: "Field Theory", subtopics: [
        "Field Extensions - Algebraic and Transcendental Extension, Finite Field and its Properties",
        "Galois Theory",
      ]},
    ],
  },
  {
    key: "integral_equations",
    name: "Integral Equations",
    topics: [
      { name: "Classification of Integral Equations", subtopics: [
        "Linear vs Non-linear",
        "Volterra Integral Equations (1st and 2nd kind)",
        "Fredholm Integral Equations (1st and 2nd kind)",
        "Singular and Regular integral equations",
      ]},
      { name: "Conversion of Differential Equations to Integral Equations", subtopics: [
        "Converting IVP to Volterra equations",
        "Converting BVP to Fredholm equations (using Green's Function)",
      ]},
      { name: "Methods of Solving Fredholm Integral Equations (2nd Kind)", subtopics: [
        "Separable/Degenerate Kernels",
        "Resolvent Kernel method (Neumann Series)",
      ]},
      { name: "Methods of Solving Volterra Integral Equations (2nd Kind)", subtopics: [
        "Method of Successive Approximations",
        "Resolvent Kernel method",
        "Laplace Transform method",
      ]},
      { name: "Eigenvalues and Eigenfunctions", subtopics: [
        "Characteristic values and eigenfunctions for homogeneous Fredholm equations",
      ]},
      { name: "Symmetric Kernels", subtopics: [
        "Hilbert-Schmidt Theory",
        "Orthogonal eigenfunctions",
        "Expansion of symmetric kernels",
      ]},
    ],
  },
  {
    key: "calculus_of_variations",
    name: "Calculus of Variations",
    topics: [
      { name: "Functionals and Extremals", subtopics: [
        "Definition of functionals",
        "Continuous functionals",
        "Concept of variation (δy)",
      ]},
      { name: "Euler-Lagrange Equations", subtopics: [
        "Functional depends on x, y, y'",
        "Functional independent of x, y, or y'",
        "Higher-order derivatives",
        "Multiple dependent variables",
      ]},
      { name: "Variational Problems with Constraints", subtopics: [
        "Isoperimetric problems - Lagrange multipliers",
      ]},
      { name: "Boundary Conditions", subtopics: [
        "Fixed boundary conditions",
        "Moving/Variable boundary conditions (Natural and Transversality conditions)",
      ]},
      { name: "Sufficient Conditions for Extremum", subtopics: [
        "Jacobi's condition and Conjugate points",
        "Weierstrass condition and Legendre condition (Weak and Strong extrema)",
      ]},
      { name: "Variational Methods", subtopics: [
        "Ritz method",
        "Galerkin method",
      ]},
    ],
  },
  {
    key: "ode_net",
    name: "ODE",
    topics: [
      { name: "Ordinary Differential Equations", subtopics: [
        "Existence and Uniqueness Theorem",
        "Equations of First Order and First Degree",
        "Methods for First Order Equations",
        "Orthogonal Trajectories",
        "2nd Order ODE",
        "Solution of 2nd Order ODE",
        "Cauchy-Euler Equation",
        "Wronskian",
        "Variation of Parameters",
        "System of ODEs",
        "Sturm-Liouville Problem",
        "Green's Function",
      ]},
    ],
  },
  {
    key: "pde",
    name: "PDE",
    topics: [
      { name: "Partial Differential Equations", subtopics: [
        "PDE of First Order",
        "Lagrange's Method",
        "Charpit's Method",
        "PDE of Second Order",
        "Heat, Wave and Laplace Equations",
      ]},
    ],
  },
  {
    key: "numerical_analysis",
    name: "Numerical Analysis",
    topics: [
      { name: "Solution of Algebraic and Transcendental Equations", subtopics: [
        "Bisection Method, Regula-Falsi Method, Secant Method",
        "Newton-Raphson Method (Formula, Rate/Order of Convergence)",
        "Fixed-Point Iteration Method",
      ]},
      { name: "Solutions of Linear Systems", subtopics: [
        "Direct Methods - Gauss Elimination, Gauss-Jordan, LU Decomposition",
        "Iterative Methods - Jacobi Method, Gauss-Seidel Method",
      ]},
      { name: "Interpolation", subtopics: [
        "Lagrange's Interpolation, Newton's Divided Difference",
        "Newton's Forward/Backward Difference",
        "Central Difference Formulas (Gauss, Stirling, Bessel)",
        "Hermite Interpolation and Piecewise Spline Interpolation",
        "Error bounds in interpolation formulas",
      ]},
      { name: "Numerical Differentiation and Integration", subtopics: [
        "Numerical Differentiation using Newton's formulas",
        "Newton-Cotes Quadrature - Trapezoidal, Simpson's 1/3, Simpson's 3/8",
        "Errors in Quadrature formulas",
        "Gauss Quadrature Formulas",
      ]},
      { name: "Numerical Solution of ODEs", subtopics: [
        "Picard's Method",
        "Euler's Method and Modified Euler's Method",
        "Runge-Kutta Methods (2nd and 4th order)",
        "Predictor-Corrector Methods (Milne's, Adams-Bashforth)",
      ]},
    ],
  },
];
function flatSubtopics(s: any): string[] {
  return s.topics.flatMap((t: any) => t.subtopics);
}

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
  const rawUserId = user?.id ? String(user.id) : "";
  const viewAsId = new URLSearchParams(window.location.search).get("viewAs");
  const userId = viewAsId ?? rawUserId;
  const isViewMode = !!viewAsId;
  const examType = (user as any)?.exam_type ?? "JAM";
  const subjects =
    examType === "NET_GATE" ? NET_SUBJECTS : JAM_SUBJECTS;

  const [notes, setNotes] = useState<NoteLog[]>([]);
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
      if (notesRes.data) {
        setNotes(notesRes.data as NoteLog[]);
        try {
          localStorage.setItem(`hs_note_logs_${userId}`, JSON.stringify(notesRes.data));
          // Cache subject totals for dashboard
          const subjectTotals = subjects.map(s => ({ name: s.name, total: flatSubtopics(s).length }));
          localStorage.setItem(`hs_note_subject_totals_${userId}`, JSON.stringify(subjectTotals));
        } catch {}
      }
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

  const totalTopics = subjects.reduce((a, s) => a + flatSubtopics(s).length, 0);
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

        {/* Notes Coverage Summary */}
        <div style={{ background: "#FFFDF9", border: "1px solid #E5DDD0", borderRadius: 12, padding: "0.75rem 1rem", marginBottom: "1rem" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7A7267", margin: "0 0 0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes Coverage</p>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ fontSize:"0.75rem", fontWeight:600, color:"#2D2A25" }}>Overall</span>
            <span style={{ fontSize:"0.75rem", fontWeight:700, color:"#6B568F" }}>{doneCount}/{totalTopics} topics · {totalTopics > 0 ? Math.round((doneCount/totalTopics)*100) : 0}%</span>
          </div>
          <div style={{ height:6, borderRadius:999, background:"#E5DDD0", marginBottom:8 }}>
            <div style={{ height:"100%", borderRadius:999, width:`${totalTopics > 0 ? Math.round((doneCount/totalTopics)*100) : 0}%`, background:"linear-gradient(90deg,#6B568F,#9B7BB0)" }} />
          </div>
          {subjects.map(s => {
            const topicIds = flatSubtopics(s);
            const subDone = notes.filter(n => n.topic_key?.startsWith(`${s.key}::`) && n.done).length;
            const subTotal = topicIds.length;
            const p = subTotal > 0 ? Math.round((subDone/subTotal)*100) : 0;
            return (
              <div key={s.key} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <span style={{ fontSize:"0.65rem", fontWeight:600, color:"#2D2A25", minWidth:130 }}>{s.name}</span>
                <div style={{ flex:1, height:4, borderRadius:999, background:"#E5DDD0" }}>
                  <div style={{ height:"100%", borderRadius:999, width:`${Math.min(p,100)}%`, background:"#6B568F" }} />
                </div>
                <span style={{ fontSize:"0.65rem", fontWeight:700, color:"#6B568F", minWidth:50, textAlign:"right" }}>{subDone}/{subTotal}</span>
              </div>
            );
          })}
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
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#92400E", margin: "0 0 1rem" }}>💡 Pro Tips: Study Smarter</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>

            <div style={{ fontSize: "0.85rem", color: "#78350F", lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>📖 Note-Making Recall Method</div>
              After making notes, recall everything you can remember. Then open your notes and compare — how much did you remember? Mark your topics:
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: "0.5rem 0" }}>
                <span style={{ background: "#DCFCE7", color: "#166534", borderRadius: 8, padding: "0.25rem 0.65rem", fontSize: "0.8rem", fontWeight: 600 }}>🟢 Green — Remembered fully</span>
                <span style={{ background: "#DBEAFE", color: "#1e40af", borderRadius: 8, padding: "0.25rem 0.65rem", fontSize: "0.8rem", fontWeight: 600 }}>🔵 Blue — Remembered ~50%</span>
                <span style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 8, padding: "0.25rem 0.65rem", fontSize: "0.8rem", fontWeight: 600 }}>🔴 Red — Barely remembered</span>
              </div>
              Each time you revise, if you can fully recall a Blue or Red topic, upgrade it to Green. Over time, all your notes will become Green — and that's when you truly know the material. ✨
            </div>

            <div style={{ borderTop: "1px solid #FCD34D", paddingTop: "0.75rem", fontSize: "0.85rem", color: "#78350F", lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>🃏 Flash Cards</div>
              Make flash cards for things you forget easily and revise them more often. Don't want to buy flash cards? A small notebook works just as well — write the concept on one side, explanation on the other.
            </div>

            <div style={{ borderTop: "1px solid #FCD34D", paddingTop: "0.75rem", fontSize: "0.85rem", color: "#78350F", lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>📓 Problem Book Method</div>
              Your problem book contains <em>only question numbers</em> — make 5 columns: Round 1 to Round 5.
              <ul style={{ margin: "0.4rem 0 0 1rem", padding: 0 }}>
                <li>Round 1: Write all questions you found difficult</li>
                <li>Round 2: From those, write the ones still difficult</li>
                <li>By Round 5: You're left with only the truly tough questions — perfectly filtered for deep practice</li>
              </ul>
            </div>

          </div>
        </div>

        {/* Subject + Topic list */}
        {subjects.map((subject) => {
          const expanded = expandedSubjects.has(subject.key);
          const subjectNotes = flatSubtopics(subject)
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
                    {doneInSubject}/{flatSubtopics(subject).length} done
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
                        width: `${(doneInSubject / flatSubtopics(subject).length) * 100}%`,
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
                        {tgOpen ? <ChevronUp size={16} color={MUTED} /> : <ChevronDown size={16} color={MUTED} />}
                      </button>
                      {tgOpen && topicGroup.subtopics.map((topic) => {
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
