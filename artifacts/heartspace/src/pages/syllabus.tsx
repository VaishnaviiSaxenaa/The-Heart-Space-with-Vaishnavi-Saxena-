import { useState, useEffect } from "react";
import { saveSyllabusToDB } from "../lib/supabase-sync";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  Circle,
  PlayCircle,
} from "lucide-react";

/* ─── Brand tokens ─────────────────────── */
const CREAM = "#F8F5F0";
const CHARCOAL = "#2D2A25";
const GOLD = "#C9A84C";
const PROGRESS_PURPLE = "#6B568F";
const MUTED = "#7A7267";
const BORDER = "#E5DDD0";
const SIDEBAR = "#3D2314";
const OLIVE = "#4A8F5C"; // now = COMPLETED_GREEN
const ROSE = "#D4A5A5";

/* ─── Types ────────────────────────────── */
type TopicStatus = "not_started" | "in_progress" | "done";

export interface SubtopicEntry {
  status: TopicStatus;
  doneAt?: string;
}

export type SyllabusProgress = Record<string, SubtopicEntry>;

interface Subtopic {
  id: string;
  name: string;
  netOnly?: boolean;
}
interface Topic {
  id: string;
  name: string;
  subtopics: Subtopic[];
  netOnly?: boolean;
  jamOnly?: boolean;
}
interface Subject {
  id: string;
  name: string;
  topics: Topic[];
  netOnly?: boolean;
  jamOnly?: boolean;
}

/* ─── Full Syllabus ────────────────────── */
export const SYLLABUS: Subject[] = [
  {
    id: "linear_algebra",
    name: "Linear Algebra",
    topics: [
      { id: "linear_algebra_t0", name: "SOLE", subtopics: [
        { id: "linear_algebra_0_0", name: "Simultaneous Eq." },
        { id: "linear_algebra_0_1", name: "ERO's & pivot" },
        { id: "linear_algebra_0_2", name: "Rank" },
        { id: "linear_algebra_0_3", name: "Investigation of Simultaneous Eq." },
        { id: "linear_algebra_0_4", name: "Matrix & determinants" },
      ]},
      { id: "linear_algebra_t1", name: "Vector Space", subtopics: [
        { id: "linear_algebra_1_0", name: "Vector Space" },
        { id: "linear_algebra_1_1", name: "Field" },
        { id: "linear_algebra_1_2", name: "Matrix Space" },
        { id: "linear_algebra_1_3", name: "Space for All Polynomials" },
        { id: "linear_algebra_1_4", name: "Subspace & its Test" },
        { id: "linear_algebra_1_5", name: "Span" },
        { id: "linear_algebra_1_6", name: "LI & LD Vectors" },
        { id: "linear_algebra_1_7", name: "Basis & Dimension" },
        { id: "linear_algebra_1_8", name: "Investigation on Subspaces" },
      ]},
      { id: "linear_algebra_t2", name: "Linear Transformation", subtopics: [
        { id: "linear_algebra_2_0", name: "Linear Transformation" },
        { id: "linear_algebra_2_1", name: "Matrix Representation of LT" },
        { id: "linear_algebra_2_2", name: "Null Space" },
        { id: "linear_algebra_2_3", name: "Range Space" },
        { id: "linear_algebra_2_4", name: "Onto & One-One Criteria" },
        { id: "linear_algebra_2_5", name: "Rank-Nullity Theorem" },
        { id: "linear_algebra_2_6", name: "Composition in LT" },
        { id: "linear_algebra_2_7", name: "Change of Basis" },
      ]},
      { id: "linear_algebra_t3", name: "Eigenvalues", subtopics: [
        { id: "linear_algebra_3_0", name: "Introduction of EV" },
        { id: "linear_algebra_3_1", name: "Eigenvalues & Eigenvectors" },
        { id: "linear_algebra_3_2", name: "Eigenspace of lambda" },
        { id: "linear_algebra_3_3", name: "Diagonalizability" },
        { id: "linear_algebra_3_4", name: "Eigenvalue Problem" },
        { id: "linear_algebra_3_5", name: "Cases of Repeated Eigenvalues" },
        { id: "linear_algebra_3_6", name: "Important Properties of EV" },
        { id: "linear_algebra_3_7", name: "Properties of EV related to Matrices" },
        { id: "linear_algebra_3_8", name: "Minimal & Characteristic Polynomial" },
        { id: "linear_algebra_3_9", name: "Monic Polynomial" },
      ]},
    ],
  },
  {
    id: "real_analysis",
    name: "Real Analysis",
    topics: [
      { id: "real_analysis_t0", name: "Set Theory & Point Set Topology", subtopics: [
        { id: "real_analysis_0_0", name: "Sets & some terminologies" },
        { id: "real_analysis_0_1", name: "Relation & Functions" },
        { id: "real_analysis_0_2", name: "Countability & its properties" },
        { id: "real_analysis_0_3", name: "Natural Numbers" },
        { id: "real_analysis_0_4", name: "Rational Numbers & its drawbacks" },
        { id: "real_analysis_0_5", name: "Bounded Sets & LUB-GLB" },
        { id: "real_analysis_0_6", name: "Archimedean Property" },
        { id: "real_analysis_0_7", name: "Intervals" },
        { id: "real_analysis_0_8", name: "Neighbourhood of a Set" },
        { id: "real_analysis_0_9", name: "Interior Point & Open Sets" },
        { id: "real_analysis_0_10", name: "Limit Point & Derived Sets" },
        { id: "real_analysis_0_11", name: "Closed Sets" },
        { id: "real_analysis_0_12", name: "Isolated Point" },
        { id: "real_analysis_0_13", name: "Closure of a Set" },
        { id: "real_analysis_0_14", name: "Dense & Perfect Set" },
        { id: "real_analysis_0_15", name: "Open & Closed Covers" },
        { id: "real_analysis_0_16", name: "Heine-Borel Theorem" },
        { id: "real_analysis_0_17", name: "Lindelof Theorem" },
        { id: "real_analysis_0_18", name: "Sequential Compactness" },
        { id: "real_analysis_0_19", name: "Bolzano-Weierstrass Property" },
        { id: "real_analysis_0_20", name: "Connected & Disconnected Sets" },
        { id: "real_analysis_0_21", name: "Countable Sets & Properties" },
        { id: "real_analysis_0_22", name: "Denumerable Set" },
        { id: "real_analysis_0_23", name: "Power Set" },
        { id: "real_analysis_0_24", name: "Cardinal Numbers & its Types" },
        { id: "real_analysis_0_25", name: "Continuum Hypothesis" },
      ]},
      { id: "real_analysis_t1", name: "Real Sequences", subtopics: [
        { id: "real_analysis_1_0", name: "Real Sequences" },
        { id: "real_analysis_1_1", name: "Convergence of R.S." },
        { id: "real_analysis_1_2", name: "Bounded Sequence" },
        { id: "real_analysis_1_3", name: "Limit Point of a Sequence" },
        { id: "real_analysis_1_4", name: "Limit Superior & Inferior" },
        { id: "real_analysis_1_5", name: "Bolzano-Weierstrass Theorem" },
        { id: "real_analysis_1_6", name: "Sandwich Theorem" },
        { id: "real_analysis_1_7", name: "Properties" },
        { id: "real_analysis_1_8", name: "Divergent Sequence" },
        { id: "real_analysis_1_9", name: "Methods of Convergence" },
        { id: "real_analysis_1_10", name: "Direct Substitution" },
        { id: "real_analysis_1_11", name: "Telescopic Method" },
        { id: "real_analysis_1_12", name: "Method of Inequalities" },
        { id: "real_analysis_1_13", name: "MCT & Wavy Curve" },
        { id: "real_analysis_1_14", name: "Cauchy Criteria of Convergence" },
        { id: "real_analysis_1_15", name: "AM-GM Inequality" },
        { id: "real_analysis_1_16", name: "Fixed Point Iteration" },
        { id: "real_analysis_1_17", name: "Subsequence" },
        { id: "real_analysis_1_18", name: "Contractive Sequences" },
        { id: "real_analysis_1_19", name: "Cauchy's Theorems on Limits" },
        { id: "real_analysis_1_20", name: "Stolz-Cesaro Theorem" },
      ]},
      { id: "real_analysis_t2", name: "Infinite Series", subtopics: [
        { id: "real_analysis_2_0", name: "Infinite Series & Properties" },
        { id: "real_analysis_2_1", name: "Cauchy Criteria of Convergence" },
        { id: "real_analysis_2_2", name: "SOPT" },
        { id: "real_analysis_2_3", name: "Tests for SOPT" },
        { id: "real_analysis_2_4", name: "Comparison Tests" },
        { id: "real_analysis_2_5", name: "Integral Test" },
        { id: "real_analysis_2_6", name: "Ratio & Root Test" },
        { id: "real_analysis_2_7", name: "Log Test" },
        { id: "real_analysis_2_8", name: "Raabe's Test" },
        { id: "real_analysis_2_9", name: "CCT" },
        { id: "real_analysis_2_10", name: "General Ratio & Root Test" },
        { id: "real_analysis_2_11", name: "Alternating Series" },
        { id: "real_analysis_2_12", name: "Test for Alternating Series" },
        { id: "real_analysis_2_13", name: "Absolute Convergence" },
        { id: "real_analysis_2_14", name: "Conditional Convergence" },
        { id: "real_analysis_2_15", name: "Leibnitz Test" },
        { id: "real_analysis_2_16", name: "Abel's Test" },
        { id: "real_analysis_2_17", name: "Dirichlet's Test" },
      ]},
      { id: "real_analysis_t3", name: "Power Series", subtopics: [
        { id: "real_analysis_3_0", name: "Power Series & its Types" },
        { id: "real_analysis_3_1", name: "Tests for Convergence" },
        { id: "real_analysis_3_2", name: "Ratio Test" },
        { id: "real_analysis_3_3", name: "Root Test" },
        { id: "real_analysis_3_4", name: "Manual Investigation" },
        { id: "real_analysis_3_5", name: "Sum of Series" },
        { id: "real_analysis_3_6", name: "Differentiation & Integration of Power Series" },
        { id: "real_analysis_3_7", name: "Representation of Some Functions as a Power Series" },
      ]},
    ],
  },
  {
    id: "abstract_algebra",
    name: "Abstract Algebra",
    topics: [
      {
        id: "aa_gt1",
        name: "Group Theory — Basics",
        subtopics: [
          { id: "aa_gt1_1", name: "Definition, Examples, Subgroups" },
          { id: "aa_gt1_2", name: "Cyclic Groups, Order of Element" },
          { id: "aa_gt1_3", name: "Cosets & Lagrange's Theorem" },
        ],
      },
      {
        id: "aa_gt2",
        name: "Group Theory — Intermediate",
        subtopics: [
          { id: "aa_gt2_1", name: "Normal Subgroups & Quotient Groups" },
          { id: "aa_gt2_2", name: "Group Homomorphisms" },
          {
            id: "aa_gt2_3",
            name: "Isomorphism Theorems (First, Second, Third)",
          },
          { id: "aa_gt2_4", name: "Permutation Groups, Cayley's Theorem" },
        ],
      },
      {
        id: "aa_gt3",
        name: "Group Theory — Advanced",
        netOnly: true,
        subtopics: [
          { id: "aa_gt3_1", name: "Group Actions, Orbit-Stabiliser Theorem" },
          { id: "aa_gt3_2", name: "Sylow Theorems" },
          { id: "aa_gt3_3", name: "Simple & Solvable Groups" },
        ],
      },
      {
        id: "aa_rt1",
        name: "Ring Theory — Basics",
        netOnly: true,
        subtopics: [
          {
            id: "aa_rt1_1",
            name: "Definition, Subrings, Ideals, Quotient Rings",
          },
          { id: "aa_rt1_2", name: "Ring Homomorphisms & Isomorphism Theorems" },
          { id: "aa_rt1_3", name: "Integral Domains & Fields" },
        ],
      },
      {
        id: "aa_rt2",
        name: "Ring Theory — Advanced",
        netOnly: true,
        subtopics: [
          { id: "aa_rt2_1", name: "Prime & Maximal Ideals" },
          { id: "aa_rt2_2", name: "PID, UFD, Euclidean Domains" },
          { id: "aa_rt2_3", name: "Polynomial Rings, Eisenstein Criterion" },
        ],
      },
      {
        id: "aa_ft",
        name: "Field Theory",
        netOnly: true,
        subtopics: [
          {
            id: "aa_ft_1",
            name: "Field Extensions, Algebraic & Transcendental",
          },
          { id: "aa_ft_2", name: "Finite Fields, Splitting Fields" },
          {
            id: "aa_ft_3",
            name: "Fundamental Theorem of Galois Theory (Statement)",
          },
        ],
      },
    ],
  },
  {
    id: "complex_analysis",
    name: "Complex Analysis",
    netOnly: true,
    topics: [
      {
        id: "ca_cn",
        name: "Complex Numbers",
        subtopics: [
          { id: "ca_cn_1", name: "Algebra, Modulus, Argument, Polar Form" },
          { id: "ca_cn_2", name: "De Moivre's Theorem, Roots of Unity" },
        ],
      },
      {
        id: "ca_af",
        name: "Analytic Functions",
        subtopics: [
          { id: "ca_af_1", name: "Cauchy-Riemann Equations" },
          { id: "ca_af_2", name: "Harmonic Functions & Conjugates" },
        ],
      },
      {
        id: "ca_ci",
        name: "Complex Integration",
        subtopics: [
          { id: "ca_ci_1", name: "Contour Integrals, Cauchy-Goursat Theorem" },
          { id: "ca_ci_2", name: "Cauchy Integral Formula" },
          { id: "ca_ci_3", name: "Liouville's Theorem, Morera's Theorem" },
        ],
      },
      {
        id: "ca_ps",
        name: "Power Series",
        subtopics: [
          { id: "ca_ps_1", name: "Taylor Series & Laurent Series" },
          {
            id: "ca_ps_2",
            name: "Zeros of Analytic Functions, Identity Theorem",
          },
        ],
      },
      {
        id: "ca_sr",
        name: "Singularities & Residues",
        subtopics: [
          { id: "ca_sr_1", name: "Removable, Poles, Essential Singularities" },
          { id: "ca_sr_2", name: "Residue Theorem" },
          { id: "ca_sr_3", name: "Evaluation of Real Integrals" },
          { id: "ca_sr_4", name: "Rouche's Theorem" },
        ],
      },
      {
        id: "ca_mt",
        name: "Möbius Transformations",
        subtopics: [
          { id: "ca_mt_1", name: "Cross-ratio, Fixed Points" },
          { id: "ca_mt_2", name: "Mapping of Circles and Lines" },
        ],
      },
      {
        id: "ca_mmp",
        name: "Maximum Modulus Principle",
        subtopics: [
          { id: "ca_mmp_1", name: "Maximum & Minimum Modulus Theorems" },
          { id: "ca_mmp_2", name: "Schwarz Lemma, Open Mapping Theorem" },
        ],
      },
      {
        id: "ca_cm",
        name: "Conformal Mappings",
        subtopics: [
          { id: "ca_cm_1", name: "Angle Preservation, Standard Mappings" },
          { id: "ca_cm_2", name: "Riemann Mapping Theorem (Statement)" },
        ],
      },
    ],
  },
  {
    id: "ode",
    name: "Ordinary Differential Equations",
    topics: [
      { id: "ode_t0", name: "First Order ODEs", subtopics: [
        { id: "ode_0_0", name: "Separable, Exact, Integrating Factors" },
        { id: "ode_0_1", name: "Linear First Order, Bernoulli Equation" },
        { id: "ode_0_2", name: "Clairaut Equation, Singular Solutions" },
        { id: "ode_0_3", name: "Orthogonal Trajectories" },
      ]},
      { id: "ode_t1", name: "Higher Order Linear ODEs", subtopics: [
        { id: "ode_1_0", name: "Constant Coefficient - Homogeneous" },
        { id: "ode_1_1", name: "Characteristic Equation, Complementary Function" },
        { id: "ode_1_2", name: "Particular Integral - Undetermined Coefficients" },
        { id: "ode_1_3", name: "Variation of Parameters, Cauchy-Euler Equation" },
      ]},
    ],
  },
  {
    id: "pde",
    name: "Partial Differential Equations",
    netOnly: true,
    topics: [
      {
        id: "pde_fo",
        name: "First Order PDEs",
        subtopics: [
          { id: "pde_fo_1", name: "Method of Characteristics" },
          { id: "pde_fo_2", name: "Lagrange-Charpit Method, Cauchy Problem" },
        ],
      },
      {
        id: "pde_class",
        name: "Classification of 2nd Order PDEs",
        subtopics: [
          { id: "pde_class_1", name: "Elliptic, Parabolic, Hyperbolic" },
          { id: "pde_class_2", name: "Canonical Forms" },
        ],
      },
      {
        id: "pde_wave",
        name: "Wave Equation",
        subtopics: [
          { id: "pde_wave_1", name: "D'Alembert's Solution" },
          { id: "pde_wave_2", name: "Separation of Variables" },
        ],
      },
      {
        id: "pde_heat",
        name: "Heat Equation",
        subtopics: [
          {
            id: "pde_heat_1",
            name: "Separation of Variables, Fundamental Solution",
          },
          { id: "pde_heat_2", name: "Maximum Principle" },
        ],
      },
      {
        id: "pde_lap",
        name: "Laplace Equation",
        subtopics: [
          { id: "pde_lap_1", name: "Harmonic Functions, Mean Value Property" },
          { id: "pde_lap_2", name: "Green's Identities, Dirichlet & Neumann" },
        ],
      },
      {
        id: "pde_four",
        name: "Fourier Methods",
        subtopics: [
          { id: "pde_four_1", name: "Fourier Series, Dirichlet Conditions" },
          {
            id: "pde_four_2",
            name: "Parseval's Identity, Sine & Cosine Series",
          },
          { id: "pde_four_3", name: "Fourier Transform & Convolution Theorem" },
        ],
      },
    ],
  },
  {
    id: "numerical_analysis",
    name: "Numerical Analysis",
    topics: [
      {
        id: "na_rf",
        name: "Root Finding",
        subtopics: [
          { id: "na_rf_1", name: "Bisection, Regula Falsi, Newton-Raphson" },
          { id: "na_rf_2", name: "Secant Method, Fixed Point Iteration" },
          { id: "na_rf_3", name: "Convergence Analysis" },
        ],
      },
      {
        id: "na_interp",
        name: "Interpolation",
        subtopics: [
          { id: "na_interp_1", name: "Newton Forward & Backward Differences" },
          { id: "na_interp_2", name: "Lagrange & Divided Differences" },
          { id: "na_interp_3", name: "Hermite & Spline Interpolation" },
        ],
      },
      {
        id: "na_ni",
        name: "Numerical Integration",
        subtopics: [
          { id: "na_ni_1", name: "Trapezoidal Rule, Simpson's Rules" },
          { id: "na_ni_2", name: "Gaussian Quadrature, Error Bounds" },
        ],
      },
      {
        id: "na_nla",
        name: "Numerical Linear Algebra",
        subtopics: [
          { id: "na_nla_1", name: "Gaussian Elimination, LU Decomposition" },
          { id: "na_nla_2", name: "Jacobi & Gauss-Seidel Methods" },
        ],
      },
      {
        id: "na_node",
        name: "Numerical ODEs",
        subtopics: [
          { id: "na_node_1", name: "Euler, Modified Euler Methods" },
          { id: "na_node_2", name: "Runge-Kutta Methods (RK2, RK4)" },
          { id: "na_node_3", name: "Multistep Methods, Stability" },
        ],
      },
    ],
  },
  {
    id: "linear_programming",
    name: "Linear Programming",
    topics: [
      {
        id: "lp_form",
        name: "Formulation",
        subtopics: [
          {
            id: "lp_form_1",
            name: "LPP Formulation, Standard & Canonical Form",
          },
          { id: "lp_form_2", name: "Slack & Surplus Variables" },
        ],
      },
      {
        id: "lp_simplex",
        name: "Simplex Method",
        subtopics: [
          {
            id: "lp_simplex_1",
            name: "Basic Feasible Solutions, Simplex Algorithm",
          },
          { id: "lp_simplex_2", name: "Big-M Method, Two-phase Method" },
        ],
      },
      {
        id: "lp_dual",
        name: "Duality",
        subtopics: [
          { id: "lp_dual_1", name: "Dual Problem, Weak & Strong Duality" },
          { id: "lp_dual_2", name: "Complementary Slackness, Dual Simplex" },
        ],
      },
      {
        id: "lp_ta",
        name: "Transportation & Assignment",
        subtopics: [
          {
            id: "lp_ta_1",
            name: "Transportation Problem, Vogel's Approximation",
          },
          { id: "lp_ta_2", name: "Assignment Problem, Hungarian Method" },
        ],
      },
    ],
  },
  {
    id: "statistics",
    name: "Statistics & Probability",
    topics: [
      {
        id: "stat_prob",
        name: "Probability Theory",
        subtopics: [
          {
            id: "stat_prob_1",
            name: "Axioms, Conditional Probability, Bayes Theorem",
          },
          { id: "stat_prob_2", name: "Independence" },
        ],
      },
      {
        id: "stat_rv",
        name: "Random Variables",
        subtopics: [
          { id: "stat_rv_1", name: "PMF, PDF, CDF, Expectation, Variance" },
          {
            id: "stat_rv_2",
            name: "Moment Generating & Characteristic Functions",
          },
        ],
      },
      {
        id: "stat_dist",
        name: "Standard Distributions",
        subtopics: [
          {
            id: "stat_dist_1",
            name: "Binomial, Poisson, Geometric, Negative Binomial",
          },
          { id: "stat_dist_2", name: "Normal, Exponential, Gamma, Beta" },
          { id: "stat_dist_3", name: "Chi-square, t, F Distributions" },
        ],
      },
      {
        id: "stat_lim",
        name: "Limit Theorems",
        subtopics: [
          { id: "stat_lim_1", name: "Markov, Chebyshev Inequalities" },
          { id: "stat_lim_2", name: "WLLN, SLLN, CLT" },
        ],
      },
      {
        id: "stat_est",
        name: "Estimation",
        subtopics: [
          { id: "stat_est_1", name: "Unbiasedness, Consistency, UMVUE" },
          { id: "stat_est_2", name: "Cramer-Rao Bound, MLE, MOM" },
        ],
      },
      {
        id: "stat_test",
        name: "Testing of Hypotheses",
        subtopics: [
          {
            id: "stat_test_1",
            name: "Type I & II Errors, Power, Neyman-Pearson",
          },
          { id: "stat_test_2", name: "UMP Tests, Likelihood Ratio Tests" },
        ],
      },
    ],
  },
  {
    id: "topology",
    name: "Topology",
    netOnly: true,
    topics: [
      {
        id: "top_ts",
        name: "Topological Spaces",
        subtopics: [
          { id: "top_ts_1", name: "Open & Closed Sets, Basis & Subbasis" },
          { id: "top_ts_2", name: "Examples: discrete, indiscrete, cofinite" },
        ],
      },
      {
        id: "top_cont",
        name: "Continuity & Homeomorphism",
        subtopics: [
          { id: "top_cont_1", name: "Continuous Maps, Topological Properties" },
          { id: "top_cont_2", name: "Topological Invariants" },
        ],
      },
      {
        id: "top_sep",
        name: "Separation Axioms",
        subtopics: [
          { id: "top_sep_1", name: "T0, T1, T2 (Hausdorff), T3, T4" },
          { id: "top_sep_2", name: "Urysohn's Lemma, Tietze Extension" },
        ],
      },
      {
        id: "top_comp",
        name: "Compactness",
        subtopics: [
          { id: "top_comp_1", name: "Compact Spaces, Tychonoff's Theorem" },
          { id: "top_comp_2", name: "One-point Compactification" },
        ],
      },
      {
        id: "top_conn",
        name: "Connectedness",
        subtopics: [
          { id: "top_conn_1", name: "Connected & Path Connected Spaces" },
          { id: "top_conn_2", name: "Components, Locally Connected" },
        ],
      },
      {
        id: "top_quot",
        name: "Quotient Topology",
        subtopics: [
          { id: "top_quot_1", name: "Quotient Map & Quotient Space" },
          { id: "top_quot_2", name: "Examples: Cylinder, Torus, Möbius Band" },
        ],
      },
    ],
  },
  {
    id: "functional_analysis",
    name: "Functional Analysis",
    netOnly: true,
    topics: [
      {
        id: "fa_nls",
        name: "Normed Linear Spaces",
        subtopics: [
          { id: "fa_nls_1", name: "Banach Spaces, Examples: lp, Lp, C[a,b]" },
          { id: "fa_nls_2", name: "Equivalence of Norms in Finite Dimensions" },
        ],
      },
      {
        id: "fa_ips",
        name: "Inner Product Spaces",
        subtopics: [
          { id: "fa_ips_1", name: "Hilbert Spaces, Bessel's Inequality" },
          { id: "fa_ips_2", name: "Riesz Representation Theorem" },
        ],
      },
      {
        id: "fa_blo",
        name: "Bounded Linear Operators",
        subtopics: [
          { id: "fa_blo_1", name: "Operator Norm, Dual Space" },
          { id: "fa_blo_2", name: "Hahn-Banach Theorem" },
          { id: "fa_blo_3", name: "Open Mapping & Closed Graph Theorems" },
          { id: "fa_blo_4", name: "Uniform Boundedness Principle" },
        ],
      },
    ],
  },
  {
    id: "calculus_of_variations",
    name: "Calculus of Variations",
    netOnly: true,
    topics: [
      {
        id: "cov_euler",
        name: "Euler-Lagrange Equation",
        subtopics: [
          { id: "cov_euler_1", name: "Functional, Variation, Euler-Lagrange" },
          { id: "cov_euler_2", name: "Fixed & Free Endpoint Problems" },
        ],
      },
      {
        id: "cov_special",
        name: "Special Problems",
        subtopics: [
          { id: "cov_special_1", name: "Brachistochrone, Geodesics" },
          { id: "cov_special_2", name: "Isoperimetric Problems" },
        ],
      },
    ],
  },
  {
    id: "mechanics",
    name: "Mechanics",
    jamOnly: true,
    topics: [
      { id: "mech_vc", name: "Vector Calculus Prerequisites", subtopics: [
        { id: "mech_vc_1", name: "Gradient, Divergence, Curl" },
        { id: "mech_vc_2", name: "Greens, Stokes, Gauss Divergence Theorem" },
      ]},
      { id: "mech_statics", name: "Statics", subtopics: [
        { id: "mech_statics_1", name: "Forces, Equilibrium, Moments, Couples" },
        { id: "mech_statics_2", name: "Friction, Centre of Mass and Gravity" },
      ]},
      { id: "mech_dyn_particle", name: "Dynamics - Particle", subtopics: [
        { id: "mech_dyn_particle_1", name: "Newtons Laws, Rectilinear Motion, SHM" },
        { id: "mech_dyn_particle_2", name: "Projectile, Circular Motion" },
        { id: "mech_dyn_particle_3", name: "Work-Energy Theorem, Conservation of Energy" },
        { id: "mech_dyn_particle_4", name: "Impulse and Momentum" },
      ]},
      { id: "mech_dyn_system", name: "Dynamics - System of Particles", subtopics: [
        { id: "mech_dyn_system_1", name: "Centre of Mass Motion, Conservation of Linear Momentum" },
        { id: "mech_dyn_system_2", name: "Angular Momentum, Conservation of Angular Momentum" },
      ]},
      { id: "mech_central", name: "Central Forces", subtopics: [
        { id: "mech_central_1", name: "Central Force Motion, Orbit Equation" },
        { id: "mech_central_2", name: "Keplers Laws, Inverse Square Law" },
      ]},
      { id: "mech_rigid", name: "Rigid Body Dynamics", subtopics: [
        { id: "mech_rigid_1", name: "Moment of Inertia, Parallel/Perpendicular Axis Theorems" },
        { id: "mech_rigid_2", name: "Rotation About Fixed Axis, Rolling Motion" },
      ]},
    ],
  },
  {
    id: "integral_equations",
    name: "Integral Equations",
    topics: [
      { id: "ie_intro", name: "Introduction to Integral Equations", subtopics: [
        { id: "ie_intro_1", name: "Fredholm and Volterra Equations" },
        { id: "ie_intro_2", name: "Classification - First and Second Kind" },
      ]},
      { id: "ie_methods", name: "Solution Methods", subtopics: [
        { id: "ie_methods_1", name: "Method of Successive Approximations" },
        { id: "ie_methods_2", name: "Relation to ODEs and Boundary Value Problems" },
      ]},
    ],
  },
  {
    id: "group_theory",
    name: "Group Theory",
    topics: [
      { id: "group_theory_t0", name: "Groups & Cyclic Groups", subtopics: [
        { id: "group_theory_0_0", name: "Group and its Properties" },
        { id: "group_theory_0_1", name: "Cayley Table" },
        { id: "group_theory_0_2", name: "Some Important Groups" },
        { id: "group_theory_0_3", name: "Subgroups" },
        { id: "group_theory_0_4", name: "Cyclic Groups & Generators" },
        { id: "group_theory_0_5", name: "Results on Cyclic Groups" },
        { id: "group_theory_0_6", name: "Fundamental Theorem of Cyclic Groups" },
        { id: "group_theory_0_7", name: "Evaluation of Subgroups" },
      ]},
      { id: "group_theory_t1", name: "Permutation Group", subtopics: [
        { id: "group_theory_1_0", name: "Permutation & Symmetric Groups" },
        { id: "group_theory_1_1", name: "Methods of Representation" },
        { id: "group_theory_1_2", name: "Properties" },
        { id: "group_theory_1_3", name: "Even and Odd Permutations" },
        { id: "group_theory_1_4", name: "Alternating Group" },
        { id: "group_theory_1_5", name: "Conjugacy in An/Sn" },
      ]},
      { id: "group_theory_t2", name: "Isomorphism", subtopics: [
        { id: "group_theory_2_0", name: "Isomorphism & Properties" },
        { id: "group_theory_2_1", name: "Cayley's Theorem" },
        { id: "group_theory_2_2", name: "Automorphism & Inner Automorphism" },
        { id: "group_theory_2_3", name: "Some Important Results" },
        { id: "group_theory_2_4", name: "Classification of Groups" },
      ]},
      { id: "group_theory_t3", name: "Cosets & EDP", subtopics: [
        { id: "group_theory_3_0", name: "Cosets and Properties" },
        { id: "group_theory_3_1", name: "Lagrange's Theorem" },
        { id: "group_theory_3_2", name: "Fermat's Little Theorem" },
        { id: "group_theory_3_3", name: "External Direct Product" },
        { id: "group_theory_3_4", name: "Properties of EDP" },
      ]},
      { id: "group_theory_t4", name: "Normal Subgroups & Quotient Group", subtopics: [
        { id: "group_theory_4_0", name: "Normal Subgroups" },
        { id: "group_theory_4_1", name: "Quotient Group" },
        { id: "group_theory_4_2", name: "Important Results" },
      ]},
      { id: "group_theory_t5", name: "Homomorphism & Sylow's Theorem", subtopics: [
        { id: "group_theory_5_0", name: "Homomorphism and its Kernel" },
        { id: "group_theory_5_1", name: "Properties of Homomorphism wrt Elements" },
        { id: "group_theory_5_2", name: "Properties of Homomorphism wrt Groups" },
        { id: "group_theory_5_3", name: "Fundamental Theorem of Homomorphism" },
        { id: "group_theory_5_4", name: "Normal Subgroups as Kernel" },
        { id: "group_theory_5_5", name: "Results" },
        { id: "group_theory_5_6", name: "Sylow's First Theorem" },
        { id: "group_theory_5_7", name: "Sylow-P Subgroup" },
        { id: "group_theory_5_8", name: "Conjugate Subgroup" },
        { id: "group_theory_5_9", name: "Sylow's 2nd Theorem" },
        { id: "group_theory_5_10", name: "Sylow's 3rd Theorem" },
      ]},
    ],
  },
  {
    id: "functions_of_one_variable",
    name: "Functions of One Variable",
    topics: [
      { id: "functions_of_one_variable_t0", name: "Functions", subtopics: [
        { id: "functions_of_one_variable_0_0", name: "Relation" },
        { id: "functions_of_one_variable_0_1", name: "Function" },
        { id: "functions_of_one_variable_0_2", name: "Types of Function" },
        { id: "functions_of_one_variable_0_3", name: "Transformation of Graphs" },
      ]},
      { id: "functions_of_one_variable_t1", name: "Limits", subtopics: [
        { id: "functions_of_one_variable_1_0", name: "Limits (formal+calculative)" },
        { id: "functions_of_one_variable_1_1", name: "L'Hospital Rule" },
        { id: "functions_of_one_variable_1_2", name: "Sequential Criteria of Limits" },
        { id: "functions_of_one_variable_1_3", name: "Squeeze Principle" },
      ]},
      { id: "functions_of_one_variable_t2", name: "Continuity", subtopics: [
        { id: "functions_of_one_variable_2_0", name: "Continuity (formal+calculative)" },
        { id: "functions_of_one_variable_2_1", name: "Sequential Criteria of Continuity" },
        { id: "functions_of_one_variable_2_2", name: "Properties of Continuity (basic+adv)" },
        { id: "functions_of_one_variable_2_3", name: "Discontinuity" },
      ]},
      { id: "functions_of_one_variable_t3", name: "Differentiability", subtopics: [
        { id: "functions_of_one_variable_3_0", name: "Differentiability" },
        { id: "functions_of_one_variable_3_1", name: "Properties of Differentiable Functions" },
        { id: "functions_of_one_variable_3_2", name: "Inverse Derivative Theorem" },
        { id: "functions_of_one_variable_3_3", name: "Darboux's Theorem" },
        { id: "functions_of_one_variable_3_4", name: "Mean Value Theorem" },
        { id: "functions_of_one_variable_3_5", name: "Rolle's Theorem" },
        { id: "functions_of_one_variable_3_6", name: "LMVT" },
        { id: "functions_of_one_variable_3_7", name: "Cauchy's MVT" },
      ]},
      { id: "functions_of_one_variable_t4", name: "Inc-Dec Functions & Max-Min", subtopics: [
        { id: "functions_of_one_variable_4_0", name: "Inc-Dec Function over an Interval" },
        { id: "functions_of_one_variable_4_1", name: "Differentiability & Inc-Dec Function" },
        { id: "functions_of_one_variable_4_2", name: "Local & Global Extrema" },
        { id: "functions_of_one_variable_4_3", name: "Critical Point" },
        { id: "functions_of_one_variable_4_4", name: "Stationary Point" },
        { id: "functions_of_one_variable_4_5", name: "Point of Inflection" },
        { id: "functions_of_one_variable_4_6", name: "Concavity" },
        { id: "functions_of_one_variable_4_7", name: "Derivative Tests" },
        { id: "functions_of_one_variable_4_8", name: "Leibnitz Rule" },
      ]},
    ],
  },
  {
    id: "multiple_variable_calculus",
    name: "Multiple Variable Calculus",
    topics: [
      { id: "multiple_variable_calculus_t0", name: "LCD (2 Variables)", subtopics: [
        { id: "multiple_variable_calculus_0_0", name: "Existence of Limits" },
        { id: "multiple_variable_calculus_0_1", name: "Non-existence of Limits & Methods" },
        { id: "multiple_variable_calculus_0_2", name: "Rational Limit Theorem" },
        { id: "multiple_variable_calculus_0_3", name: "Sertoz Theorem" },
        { id: "multiple_variable_calculus_0_4", name: "Polar Form of Limits" },
        { id: "multiple_variable_calculus_0_5", name: "Simultaneous and Repeated Limits" },
        { id: "multiple_variable_calculus_0_6", name: "Continuity and its Requirement" },
        { id: "multiple_variable_calculus_0_7", name: "Formal Def of Limit and Continuity" },
        { id: "multiple_variable_calculus_0_8", name: "Mixed & Higher Order Derivatives" },
        { id: "multiple_variable_calculus_0_9", name: "Partial Derivatives and Continuity" },
        { id: "multiple_variable_calculus_0_10", name: "Differentiability" },
        { id: "multiple_variable_calculus_0_11", name: "Polar Form" },
      ]},
      { id: "multiple_variable_calculus_t1", name: "Maxima & Minima", subtopics: [
        { id: "multiple_variable_calculus_1_0", name: "Definition" },
        { id: "multiple_variable_calculus_1_1", name: "Critical Point" },
        { id: "multiple_variable_calculus_1_2", name: "Derivative Test for Local Extrema" },
        { id: "multiple_variable_calculus_1_3", name: "Saddle Point" },
        { id: "multiple_variable_calculus_1_4", name: "Euler's Homogenous Theorem" },
        { id: "multiple_variable_calculus_1_5", name: "Directional Derivative and Gradient" },
        { id: "multiple_variable_calculus_1_6", name: "Young's & Schwarz's Theorem" },
        { id: "multiple_variable_calculus_1_7", name: "Implicit Differentiation Formula" },
      ]},
      { id: "multiple_variable_calculus_t2", name: "Lagrange's Multiplier", subtopics: [
        { id: "multiple_variable_calculus_2_0", name: "Lagrange's Multiplier" },
        { id: "multiple_variable_calculus_2_1", name: "Tangent Plane" },
      ]},
    ],
  },
  {
    id: "integration",
    name: "Integration",
    topics: [
      { id: "integration_t0", name: "Double Integrals", subtopics: [
        { id: "integration_0_0", name: "Double Integrals - Cartesian Form" },
        { id: "integration_0_1", name: "Double Integrals - Polar Form" },
        { id: "integration_0_2", name: "Change of Order of Integration" },
      ]},
      { id: "integration_t1", name: "Triple Integrals", subtopics: [
        { id: "integration_1_0", name: "Triple Integrals - Cartesian Form" },
        { id: "integration_1_1", name: "Triple Integrals - Spherical and Cylindrical Forms" },
      ]},
      { id: "integration_t2", name: "Applications", subtopics: [
        { id: "integration_2_0", name: "Surface Area" },
        { id: "integration_2_1", name: "Solids of Revolution" },
        { id: "integration_2_2", name: "Volume Calculations" },
      ]},
    ],
  },
  {
    id: "miscellaneous",
    name: "Miscellaneous",
    topics: [
      { id: "miscellaneous_t0", name: "Miscellaneous Topics", subtopics: [
        { id: "miscellaneous_0_0", name: "SOR/VOR" },
        { id: "miscellaneous_0_1", name: "Surface Area" },
        { id: "miscellaneous_0_2", name: "Riemann Integration" },
        { id: "miscellaneous_0_3", name: "Taylor's Series" },
        { id: "miscellaneous_0_4", name: "Permutation and Combination" },
        { id: "miscellaneous_0_5", name: "Binomial Theorem" },
      ]},
    ],
  },
];

/* ─── Status config ────────────────────── */
const STATUS_CONFIG = {
  not_started: {
    label: "Not Started",
    color: MUTED,
    bg: "#F0EBE5",
    icon: Circle,
  },
  in_progress: {
    label: "In Progress",
    color: PROGRESS_PURPLE,
    bg: `${PROGRESS_PURPLE}22`,
    icon: PlayCircle,
  },
  done: { label: "Done", color: OLIVE, bg: `${OLIVE}22`, icon: CheckCircle2 },
};

/* ─── localStorage ─────────────────────── */
function getStorageKey(userId: string) {
  return `hs_syllabus_${userId}`;
}

export function loadSyllabusProgress(userId: string): SyllabusProgress {
  try {
    const r = localStorage.getItem(getStorageKey(userId));
    if (!r) return {};
    const raw = JSON.parse(r);
    const migrated: SyllabusProgress = {};
    Object.entries(raw).forEach(([key, val]) => {
      if (typeof val === "string") {
        migrated[key] = {
          status: val as TopicStatus,
          doneAt: val === "done" ? new Date().toISOString() : undefined,
        };
      } else {
        migrated[key] = val as SubtopicEntry;
      }
    });
    return migrated;
  } catch {
    return {};
  }
}

function saveProgress(userId: string, progress: SyllabusProgress) {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(progress));
    saveSyllabusToDB(userId, progress).catch(() => {});
  } catch {
    /* ignore */
  }
}

/* ─── Helpers ──────────────────────────── */
function getTopicStatus(
  topic: { subtopics: { id: string }[] },
  progress: SyllabusProgress,
): TopicStatus {
  const statuses = topic.subtopics.map(
    (st) => progress[st.id]?.status ?? "not_started",
  );
  if (statuses.every((s) => s === "done")) return "done";
  if (statuses.some((s) => s === "done" || s === "in_progress"))
    return "in_progress";
  return "not_started";
}

export function markTopicStatus(
  topicSubtopics: { id: string }[],
  newStatus: TopicStatus,
  progress: SyllabusProgress,
): SyllabusProgress {
  const now = new Date().toISOString();
  const next = { ...progress };
  topicSubtopics.forEach((st) => {
    const prev = next[st.id];
    next[st.id] = {
      status: newStatus,
      doneAt: newStatus === "done" ? (prev?.doneAt ?? now) : undefined,
    };
  });
  return next;
}

function filterSyllabus(examType: string | null): Subject[] {
  const isJAM = examType === "JAM";
  return SYLLABUS.filter(
    (s) => !(s.netOnly && isJAM) && !(s.jamOnly && !isJAM),
  ).map((s) => ({
    ...s,
    topics: s.topics
      .filter((t) => !(t.netOnly && isJAM) && !(t.jamOnly && !isJAM))
      .map((t) => ({
        ...t,
        subtopics: t.subtopics.filter((st: any) => !(st.netOnly && isJAM)),
      })),
  }));
}

function calcProgress(subject: Subject, progress: SyllabusProgress) {
  let total = 0;
  let done = 0;
  subject.topics.forEach((t) =>
    t.subtopics.forEach((st) => {
      total++;
      if (progress[st.id]?.status === "done") done++;
    }),
  );
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

/* ─── Tick Button (reused for subject + topic) ── */
function TickButton({
  allDone,
  anyDone,
  onClick,
  size = "sm",
}: {
  allDone: boolean;
  anyDone: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: "sm" | "lg";
}) {
  const dim = size === "lg" ? "w-7 h-7" : "w-6 h-6";
  return (
    <button
      type="button"
      onClick={onClick}
      title={allDone ? "Unmark all" : "Mark all as done"}
      className={`flex-shrink-0 ${dim} rounded-full border-2 flex items-center justify-center transition-all duration-200 hover:scale-110`}
      style={{
        borderColor: allDone ? OLIVE : anyDone ? PROGRESS_PURPLE : BORDER,
        background: allDone ? OLIVE : "transparent",
        boxShadow: allDone ? `0 0 0 3px ${OLIVE}22` : "none",
      }}
    >
      {allDone ? (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path
            d="M1 4L3.5 6.5L9 1"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : anyDone ? (
        <div className="w-2 h-2 rounded-full" style={{ background: PROGRESS_PURPLE }} />
      ) : null}
    </button>
  );
}

/* ─── Main Component ───────────────────── */
/* ─── Subject hours (CSIR NET) ──────────────── */
const SUBJECT_HOURS: Record<string, number> = {
  linear_algebra: 70,
  real_analysis: 70,
  abstract_algebra: 50,
  group_theory: 50,
  functions_of_one_variable: 50,
  multiple_variable_calculus: 25,
  miscellaneous: 25,
  complex_analysis: 50,
  ode: 40,
  pde: 40,
  differential_calculus: 50,
  integration: 30,
  numerical_analysis: 30,
  calculus_of_variations: 30,
  linear_programming: 30,
  statistics: 30,
  topology: 30,
  functional_analysis: 30,
  mechanics: 33,
  integral_equations: 30,
};

// Map syllabus subject IDs to roadmap calendar subject IDs
const SYLLABUS_TO_CAL_ID: Record<string, string> = {
  linear_algebra: "la",
  real_analysis: "ra",
  differential_calculus: "dc",
  abstract_algebra: "aa",
  complex_analysis: "ca",
  ode: "ode",
  pde: "pde",
  numerical_analysis: "na",
  calculus_of_variations: "cv",
  integration: "int",
  group_theory: "gt",
  functions_of_one_variable: "fov",
  multiple_variable_calculus: "mvc",
  miscellaneous: "misc",
  linear_programming: "lp",
  statistics: "sp",
  topology: "top",
  functional_analysis: "fa",
  mechanics: "mech",
  integral_equations: "ie",
};

export default function Syllabus() {
  const { user } = useAuth();
  const userId = String(user?.id ?? "guest");
  // View-as mode: counsellor viewing a student
  const viewAsId = new URLSearchParams(window.location.search).get("viewAs");
  const effectiveUserId = viewAsId ?? userId;
  const isViewMode = !!viewAsId;
  const [viewedExamType, setViewedExamType] = useState<string | null>(null);
  useEffect(() => {
    if (!viewAsId) return;
    supabase.from("profiles").select("exam_type").eq("id", viewAsId).single()
      .then(({ data }) => setViewedExamType(data?.exam_type ?? null));
  }, [viewAsId]);
  const examType = isViewMode ? viewedExamType : ((user as any)?.exam_type as string | null);

  // Load calendar hours per subject
  const calendarHours = (() => {
    try {
      const uid = effectiveUserId || userId;
      const cal = JSON.parse(localStorage.getItem(`hs_calendar_${uid}`) ?? "{}");
      const todayLocal = new Date();
      const todayKey = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth()+1).padStart(2,'0')}-${String(todayLocal.getDate()).padStart(2,'0')}`;
      const hours: Record<string, number> = {};
      Object.entries(cal).forEach(([day, entries]: [string, any]) => {
        if (day <= todayKey) {
          entries.forEach((e: any) => {
            hours[e.subjectId] = (hours[e.subjectId] ?? 0) + e.hours;
          });
        }
      });
      return hours;
    } catch { return {}; }
  })();

  const [progress, setProgress] = useState<SyllabusProgress>(() =>
    loadSyllabusProgress(effectiveUserId),
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  useEffect(() => {
    supabase.from("syllabus_progress").select("data").eq("user_id", effectiveUserId).single()
      .then(({ data: sd }) => {
        if (sd?.data) setProgress(sd.data as SyllabusProgress);
      });
  }, [effectiveUserId]);
  const [expandedT, setExpandedT] = useState<Record<string, boolean>>({});

  const syllabus = filterSyllabus(examType);
  const totalSubtopics = syllabus.reduce(
    (acc, s) => acc + s.topics.reduce((a, t) => a + t.subtopics.length, 0),
    0,
  );
  const doneSubs = Object.values(progress).filter(
    (v) => v.status === "done",
  ).length;
  const overallPct = totalSubtopics
    ? Math.round((doneSubs / totalSubtopics) * 100)
    : 0;

  function updateProgress(next: SyllabusProgress) {
    setProgress(next);
    saveProgress(userId, next);
  }

  function updateSubtopicStatus(subtopicId: string, status: TopicStatus) {
    const now = new Date().toISOString();
    const prev = progress[subtopicId];
    updateProgress({
      ...progress,
      [subtopicId]: {
        status,
        doneAt: status === "done" ? (prev?.doneAt ?? now) : undefined,
      },
    });
  }

  const examLabel =
    examType === "JAM"
      ? "IIT JAM"
      : examType === "NET_GATE"
        ? "CSIR NET / GATE"
        : "All";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1
            className="text-3xl font-serif font-bold"
            style={{ color: CHARCOAL }}
          >
            Syllabus Tracker
          </h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>
            {examLabel} · {totalSubtopics} subtopics · Click ○ on subject or
            topic to mark all done at once
          </p>
        </div>
        <div
          className="flex items-center gap-4 px-5 py-3 rounded-2xl"
          style={{ background: "#FFF", border: `1px solid ${BORDER}` }}
        >
          <div className="text-center">
            <div
              className="text-2xl font-serif font-bold"
              style={{ color: OLIVE }}
            >
              {overallPct}%
            </div>
            <div className="text-xs" style={{ color: MUTED }}>
              Complete
            </div>
          </div>
          <div className="w-px h-10" style={{ background: BORDER }} />
          <div className="text-center">
            <div
              className="text-2xl font-serif font-bold"
              style={{ color: CHARCOAL }}
            >
              {doneSubs}
            </div>
            <div className="text-xs" style={{ color: MUTED }}>
              of {totalSubtopics} done
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <cfg.icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
            <span className="text-xs font-medium" style={{ color: MUTED }}>
              {cfg.label}
            </span>
          </div>
        ))}
        <span className="text-xs" style={{ color: MUTED }}>
          · Click subject or topic circle to mark all done · Click subtopic to
          cycle
        </span>
      </div>

      {/* Subjects */}
      {syllabus.map((subject) => {
        const { pct, done, total } = calcProgress(subject, progress);
        const isOpen = expanded[subject.id] ?? false;
        const allSubtopicsInSubject = subject.topics.flatMap(
          (t) => t.subtopics,
        );
        const subjectAllDone = allSubtopicsInSubject.every(
          (st) => progress[st.id]?.status === "done",
        );
        const subjectAnyDone = allSubtopicsInSubject.some(
          (st) =>
            progress[st.id]?.status === "done" ||
            progress[st.id]?.status === "in_progress",
        );

        return (
          <div
            key={subject.id}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "#FFF",
              border: `1px solid ${BORDER}`,
              boxShadow: "0 2px 8px rgba(61,53,48,.05)",
            }}
          >
            {/* Subject header row */}
            <div
              className="flex items-center gap-3 px-4"
              style={{ background: isOpen ? `${SIDEBAR}08` : "#FFF" }}
            >
              {/* Subject-level tick */}
              <TickButton
                allDone={subjectAllDone}
                anyDone={subjectAnyDone}
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  const next = markTopicStatus(
                    allSubtopicsInSubject,
                    subjectAllDone ? "not_started" : "done",
                    progress,
                  );
                  updateProgress(next);
                }}
              />

              {/* Expand button */}
              <button
                onClick={() =>
                  setExpanded((p) => ({ ...p, [subject.id]: !p[subject.id] }))
                }
                className="flex-1 flex items-center gap-4 py-4 text-left transition-all hover:opacity-80"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <BookOpen
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: PROGRESS_PURPLE }}
                    />
                    <span
                      className="font-serif text-base font-bold"
                      style={{ color: CHARCOAL }}
                    >
                      {subject.name}
                    </span>
                    {subject.jamOnly && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `${PROGRESS_PURPLE}22`, color: SIDEBAR }}
                      >
                        JAM only
                      </span>
                    )}
                    {subject.netOnly && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `${ROSE}33`, color: "#8B3A3A" }}
                      >
                        NET / GATE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 pl-7">
                    <div
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ background: BORDER }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: pct === 100 ? OLIVE : PROGRESS_PURPLE,
                        }}
                      />
                    </div>
                    <span
                      className="text-xs font-semibold flex-shrink-0"
                      style={{ color: pct === 100 ? OLIVE : MUTED }}
                    >
                      {pct}% · {done}/{total} subtopics
                    </span>
                  </div>
                  {SUBJECT_HOURS[subject.id] && (
                    <div className="flex items-center gap-3 pl-7 mt-1">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: BORDER }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{
                          width: `${Math.min(Math.round(((calendarHours[SYLLABUS_TO_CAL_ID[subject.id] ?? subject.id] ?? 0) / SUBJECT_HOURS[subject.id]) * 100), 100)}%`,
                          background: "#E07A28",
                        }} />
                      </div>
                      <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#E07A28" }}>
                        {Math.round((calendarHours[SYLLABUS_TO_CAL_ID[subject.id] ?? subject.id] ?? 0) * 10) / 10}/{SUBJECT_HOURS[subject.id]}h
                      </span>
                    </div>
                  )}
                </div>
                {isOpen ? (
                  <ChevronDown
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: MUTED }}
                  />
                ) : (
                  <ChevronRight
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: MUTED }}
                  />
                )}
              </button>
            </div>

            {/* Topics */}
            {isOpen && (
              <div style={{ borderTop: `1px solid ${BORDER}` }}>
                {subject.topics.map((topic, tIdx) => {
                  const isTopicOpen = expandedT[topic.id] ?? false;
                  const topicDone = topic.subtopics.filter(
                    (st) => progress[st.id]?.status === "done",
                  ).length;
                  const topicStatus = getTopicStatus(topic, progress);
                  const topicAllDone = topicStatus === "done";
                  const topicAnyDone = topicStatus !== "not_started";

                  return (
                    <div
                      key={topic.id}
                      style={{
                        borderBottom:
                          tIdx < subject.topics.length - 1
                            ? `1px solid ${BORDER}`
                            : "none",
                      }}
                    >
                      {/* Topic row */}
                      <div
                        className="flex items-center gap-2 px-4"
                        style={{
                          background: isTopicOpen ? `${PROGRESS_PURPLE}08` : CREAM,
                        }}
                      >
                        <TickButton
                          allDone={topicAllDone}
                          anyDone={topicAnyDone}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateProgress(
                              markTopicStatus(
                                topic.subtopics,
                                topicAllDone ? "not_started" : "done",
                                progress,
                              ),
                            );
                          }}
                        />

                        <button
                          onClick={() =>
                            setExpandedT((p) => ({
                              ...p,
                              [topic.id]: !p[topic.id],
                            }))
                          }
                          className="flex flex-1 items-center gap-2 py-3 text-left"
                        >
                          <div className="w-4 flex-shrink-0 flex items-center justify-center">
                            {isTopicOpen ? (
                              <ChevronDown
                                className="w-3.5 h-3.5"
                                style={{ color: MUTED }}
                              />
                            ) : (
                              <ChevronRight
                                className="w-3.5 h-3.5"
                                style={{ color: MUTED }}
                              />
                            )}
                          </div>
                          <span
                            className="flex-1 text-sm font-semibold"
                            style={{
                              color: topicAllDone ? OLIVE : CHARCOAL,
                              textDecoration: topicAllDone
                                ? "line-through"
                                : "none",
                              textDecorationColor: MUTED,
                            }}
                          >
                            {topic.name}
                          </span>
                          {topic.netOnly && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{
                                background: `${ROSE}33`,
                                color: "#8B3A3A",
                              }}
                            >
                              NET
                            </span>
                          )}
                          {topic.jamOnly && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{
                                background: `${PROGRESS_PURPLE}22`,
                                color: SIDEBAR,
                              }}
                            >
                              JAM
                            </span>
                          )}
                          <span
                            className="text-xs flex-shrink-0 mr-1"
                            style={{ color: topicAllDone ? OLIVE : MUTED }}
                          >
                            {topicDone}/{topic.subtopics.length}
                          </span>
                        </button>
                      </div>

                      {/* Subtopics */}
                      {isTopicOpen && (
                        <div
                          className="px-6 pb-3 space-y-1.5"
                          style={{ background: "#FDFBF8" }}
                        >
                          {topic.subtopics.map((st) => {
                            const entry = progress[st.id] ?? {
                              status: "not_started" as TopicStatus,
                            };
                            const status = entry.status;
                            const cfg = STATUS_CONFIG[status];
                            const Icon = cfg.icon;
                            function cycleStatus() {
                              const next: TopicStatus =
                                status === "not_started"
                                  ? "in_progress"
                                  : status === "in_progress"
                                    ? "done"
                                    : "not_started";
                              updateSubtopicStatus(st.id, next);
                            }
                            return (
                              <button
                                key={st.id}
                                onClick={cycleStatus}
                                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all duration-150 hover:scale-[1.01]"
                                style={{
                                  background: cfg.bg,
                                  border: `1px solid ${cfg.color}33`,
                                }}
                              >
                                <Icon
                                  className="w-4 h-4 flex-shrink-0"
                                  style={{ color: cfg.color }}
                                />
                                <div className="flex-1">
                                  <span
                                    className="text-sm"
                                    style={{
                                      color:
                                        status === "done" ? OLIVE : CHARCOAL,
                                      textDecoration:
                                        status === "done"
                                          ? "line-through"
                                          : "none",
                                      textDecorationColor: MUTED,
                                    }}
                                  >
                                    {st.name}
                                  </span>
                                  {status === "done" && entry.doneAt && (
                                    <p
                                      className="text-[10px] mt-0.5"
                                      style={{ color: OLIVE }}
                                    >
                                      ✓ Done on{" "}
                                      {format(
                                        new Date(entry.doneAt),
                                        "MMM d, yyyy",
                                      )}
                                    </p>
                                  )}
                                </div>
                                <span
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                                  style={{
                                    background: `${cfg.color}22`,
                                    color: cfg.color,
                                  }}
                                >
                                  {cfg.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {!examType && (
        <div
          className="text-center py-16 rounded-2xl"
          style={{ background: "#FFF", border: `1.5px dashed ${BORDER}` }}
        >
          <BookOpen
            className="w-10 h-10 mx-auto mb-3 opacity-30"
            style={{ color: PROGRESS_PURPLE }}
          />
          <p className="text-sm font-medium" style={{ color: CHARCOAL }}>
            No exam selected yet
          </p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>
            Select your exam from the dashboard to see your syllabus.
          </p>
        </div>
      )}
    </div>
  );
}
