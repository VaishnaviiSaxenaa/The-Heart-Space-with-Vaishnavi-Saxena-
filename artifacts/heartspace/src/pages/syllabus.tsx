import { useState } from "react";
import { useAuth } from "../lib/auth";
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
const CREAM = "#FAF7F2";
const CHARCOAL = "#2C1810";
const GOLD = "#C9A96E";
const MUTED = "#8C7B70";
const BORDER = "#E8DDD0";
const SIDEBAR = "#3D2314";
const OLIVE = "#6E8B6B";
const ROSE = "#D4A5A5";

/* ─── Types ────────────────────────────── */
type TopicStatus = "not_started" | "in_progress" | "done";

export interface SubtopicEntry {
  status: TopicStatus;
  doneAt?: string /* ISO date string — when marked done */;
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
      {
        id: "la_sle",
        name: "System of Linear Equations",
        subtopics: [
          { id: "la_sle_1", name: "Consistency & Row Reduction" },
          { id: "la_sle_2", name: "Echelon Form" },
          { id: "la_sle_3", name: "Rank-Nullity Theorem" },
          { id: "la_sle_4", name: "Homogeneous & Non-homogeneous Systems" },
          { id: "la_sle_5", name: "Solution Space" },
        ],
      },
      {
        id: "la_vs",
        name: "Vector Spaces",
        subtopics: [
          { id: "la_vs_1", name: "Fields, Definition and Axioms" },
          { id: "la_vs_2", name: "Subspaces, Span, Linear Independence" },
          { id: "la_vs_3", name: "Basis and Dimension" },
          { id: "la_vs_4", name: "Sum and Direct Sum of Subspaces" },
          { id: "la_vs_5", name: "Quotient Spaces" },
        ],
      },
      {
        id: "la_lt",
        name: "Linear Transformations",
        subtopics: [
          { id: "la_lt_1", name: "Definition, Kernel and Image" },
          { id: "la_lt_2", name: "Rank-Nullity Theorem" },
          { id: "la_lt_3", name: "Matrix Representation & Change of Basis" },
          { id: "la_lt_4", name: "Isomorphism & Composition" },
        ],
      },
      {
        id: "la_ev",
        name: "Eigenvalues & Eigenvectors",
        subtopics: [
          { id: "la_ev_1", name: "Characteristic Polynomial" },
          { id: "la_ev_2", name: "Minimal Polynomial" },
          { id: "la_ev_3", name: "Diagonalisation" },
          { id: "la_ev_4", name: "Cayley-Hamilton Theorem" },
          { id: "la_ev_5", name: "Algebraic & Geometric Multiplicity" },
        ],
      },
      {
        id: "la_mat",
        name: "Matrices",
        subtopics: [
          { id: "la_mat_1", name: "Types of Matrices" },
          { id: "la_mat_2", name: "Determinants, Inverse, Transpose, Trace" },
          { id: "la_mat_3", name: "Similar & Orthogonal Matrices" },
        ],
      },
      {
        id: "la_ips",
        name: "Inner Product Spaces",
        netOnly: true,
        subtopics: [
          { id: "la_ips_1", name: "Inner Product, Norm, Cauchy-Schwarz" },
          { id: "la_ips_2", name: "Gram-Schmidt Orthogonalisation" },
          { id: "la_ips_3", name: "Orthonormal Basis & Projection Theorem" },
        ],
      },
      {
        id: "la_jcf",
        name: "Jordan Canonical Form",
        netOnly: true,
        subtopics: [
          { id: "la_jcf_1", name: "Jordan Blocks & Jordan Basis" },
          { id: "la_jcf_2", name: "Jordan Decomposition" },
        ],
      },
      {
        id: "la_ds",
        name: "Dual Spaces",
        netOnly: true,
        subtopics: [
          { id: "la_ds_1", name: "Dual Basis & Double Dual" },
          { id: "la_ds_2", name: "Annihilators & Transpose of Linear Map" },
        ],
      },
    ],
  },
  {
    id: "real_analysis",
    name: "Real Analysis",
    topics: [
      {
        id: "ra_set",
        name: "Basics of Set Theory",
        subtopics: [
          { id: "ra_set_1", name: "Sets, Relations, Functions" },
          { id: "ra_set_2", name: "Countable & Uncountable Sets" },
        ],
      },
      {
        id: "ra_rns",
        name: "Real Number System",
        subtopics: [
          { id: "ra_rns_1", name: "Ordered Fields & Completeness Axiom" },
          { id: "ra_rns_2", name: "Supremum, Infimum, Archimedean Property" },
          { id: "ra_rns_3", name: "Density of Rationals, Extended Real Line" },
        ],
      },
      {
        id: "ra_top",
        name: "Point Set Topology of ℝ",
        subtopics: [
          {
            id: "ra_top_1",
            name: "Interior, Limit, Boundary, Isolated Points",
          },
          { id: "ra_top_2", name: "Derived Sets, Closure, Dense Sets" },
        ],
      },
      {
        id: "ra_seq",
        name: "Real Sequences",
        subtopics: [
          {
            id: "ra_seq_1",
            name: "Convergence, Divergence, Bounded Sequences",
          },
          { id: "ra_seq_2", name: "Monotone Sequences & Subsequences" },
          { id: "ra_seq_3", name: "Bolzano-Weierstrass, lim sup & lim inf" },
          { id: "ra_seq_4", name: "Cauchy Sequences, Completeness of ℝ" },
        ],
      },
      {
        id: "ra_ser",
        name: "Infinite Series",
        subtopics: [
          {
            id: "ra_ser_1",
            name: "Convergence, Divergence, Absolute & Conditional",
          },
          { id: "ra_ser_2", name: "Comparison, Ratio, Root, Integral Tests" },
          { id: "ra_ser_3", name: "Alternating Series, Leibniz Test" },
          { id: "ra_ser_4", name: "Dirichlet & Abel Tests, Rearrangement" },
        ],
      },
      {
        id: "ra_cont",
        name: "Limits and Continuity",
        subtopics: [
          {
            id: "ra_cont_1",
            name: "Limit of a Function, Sequential Criterion",
          },
          { id: "ra_cont_2", name: "Algebra of Limits, One-sided Limits" },
          { id: "ra_cont_3", name: "Types of Discontinuity" },
          { id: "ra_cont_4", name: "Uniform Continuity, Lipschitz Continuity" },
          {
            id: "ra_cont_5",
            name: "Continuous Image of Compact & Connected Sets",
          },
        ],
      },
      {
        id: "ra_diff",
        name: "Differentiability",
        subtopics: [
          {
            id: "ra_diff_1",
            name: "Differentiability, Algebra of Derivatives, Chain Rule",
          },
          {
            id: "ra_diff_2",
            name: "Mean Value Theorems: Rolle, Lagrange, Cauchy",
          },
          {
            id: "ra_diff_3",
            name: "Taylor's Theorem with Remainder, L'Hopital's Rule",
          },
          { id: "ra_diff_4", name: "Monotonicity, Extrema, Convexity" },
        ],
      },
      {
        id: "ra_ri",
        name: "Riemann Integration",
        subtopics: [
          { id: "ra_ri_1", name: "Partitions, Upper & Lower Sums" },
          { id: "ra_ri_2", name: "Riemann Integrable Functions, Conditions" },
          { id: "ra_ri_3", name: "Fundamental Theorem of Calculus" },
          { id: "ra_ri_4", name: "Beta and Gamma Functions" },
        ],
      },
      {
        id: "ra_fsv",
        name: "Functions of Several Variables",
        subtopics: [
          { id: "ra_fsv_1", name: "Limits & Continuity in ℝⁿ" },
          {
            id: "ra_fsv_2",
            name: "Partial & Directional Derivatives, Differentiability",
          },
          { id: "ra_fsv_3", name: "Chain Rule, Mean Value Theorem in ℝⁿ" },
          { id: "ra_fsv_4", name: "Taylor's Theorem in ℝⁿ" },
          { id: "ra_fsv_5", name: "Maxima-Minima, Lagrange Multipliers" },
        ],
      },
      {
        id: "ra_sof",
        name: "Sequences & Series of Functions",
        netOnly: true,
        subtopics: [
          { id: "ra_sof_1", name: "Pointwise & Uniform Convergence" },
          { id: "ra_sof_2", name: "Weierstrass M-test" },
          { id: "ra_sof_3", name: "Power Series, Radius of Convergence" },
          { id: "ra_sof_4", name: "Taylor Series" },
        ],
      },
      {
        id: "ra_leb",
        name: "Lebesgue Measure & Integration",
        netOnly: true,
        subtopics: [
          { id: "ra_leb_1", name: "Outer Measure & Measurable Sets" },
          { id: "ra_leb_2", name: "Lebesgue Integral" },
          { id: "ra_leb_3", name: "MCT, Fatou's Lemma, DCT" },
        ],
      },
      {
        id: "ra_ms",
        name: "Metric Spaces",
        netOnly: true,
        subtopics: [
          { id: "ra_ms_1", name: "Open & Closed Sets, Convergence" },
          { id: "ra_ms_2", name: "Completeness, Baire Category Theorem" },
          { id: "ra_ms_3", name: "Compactness & Connectedness" },
        ],
      },
    ],
  },
  {
    id: "differential_calculus",
    name: "Differential Calculus (Functions of One Variable)",
    jamOnly: true,
    topics: [
      {
        id: "dc_lim",
        name: "Limits & Continuity",
        subtopics: [
          { id: "dc_lim_1", name: "Limits of Functions, Continuity" },
          { id: "dc_lim_2", name: "Uniform Continuity" },
        ],
      },
      {
        id: "dc_diff",
        name: "Differentiability",
        subtopics: [
          { id: "dc_diff_1", name: "Derivatives, Algebra, Chain Rule" },
          { id: "dc_diff_2", name: "MVT: Rolle, Lagrange, Cauchy" },
          { id: "dc_diff_3", name: "Taylor's Theorem, L'Hopital's Rule" },
          { id: "dc_diff_4", name: "Maxima & Minima, Curve Sketching" },
        ],
      },
      {
        id: "dc_seq",
        name: "Sequences & Series",
        subtopics: [
          { id: "dc_seq_1", name: "Convergence Tests" },
          { id: "dc_seq_2", name: "Power Series, Radius of Convergence" },
        ],
      },
    ],
  },
  {
    id: "integration",
    name: "Integration",
    jamOnly: true,
    topics: [
      {
        id: "int_double",
        name: "Double Integrals",
        subtopics: [
          { id: "int_double_1", name: "Double Integrals — Cartesian Form" },
          { id: "int_double_2", name: "Double Integrals — Polar Form" },
          { id: "int_double_3", name: "Change of Order of Integration" },
        ],
      },
      {
        id: "int_triple",
        name: "Triple Integrals",
        subtopics: [
          { id: "int_triple_1", name: "Triple Integrals — Cartesian Form" },
          {
            id: "int_triple_2",
            name: "Triple Integrals — Spherical & Cylindrical Forms",
          },
        ],
      },
      {
        id: "int_apps",
        name: "Applications",
        subtopics: [
          { id: "int_apps_1", name: "Surface Area" },
          { id: "int_apps_2", name: "Solids of Revolution" },
          { id: "int_apps_3", name: "Volume Calculations" },
        ],
      },
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
      {
        id: "ode_fo",
        name: "First Order ODEs",
        subtopics: [
          { id: "ode_fo_1", name: "Separable, Exact, Integrating Factors" },
          { id: "ode_fo_2", name: "Linear First Order, Bernoulli Equation" },
          { id: "ode_fo_3", name: "Clairaut Equation, Singular Solutions" },
          { id: "ode_fo_4", name: "Orthogonal Trajectories" },
        ],
      },
      {
        id: "ode_ho",
        name: "Higher Order Linear ODEs",
        subtopics: [
          { id: "ode_ho_1", name: "Constant Coefficient — Homogeneous" },
          {
            id: "ode_ho_2",
            name: "Characteristic Equation, Complementary Function",
          },
          {
            id: "ode_ho_3",
            name: "Particular Integral — Undetermined Coefficients",
          },
          {
            id: "ode_ho_4",
            name: "Variation of Parameters, Cauchy-Euler Equation",
          },
        ],
      },
      {
        id: "ode_sys",
        name: "System of ODEs",
        netOnly: true,
        subtopics: [
          { id: "ode_sys_1", name: "Linear Systems, Matrix Method" },
          { id: "ode_sys_2", name: "Phase Plane Analysis, Stability" },
        ],
      },
      {
        id: "ode_ps",
        name: "Power Series Solutions",
        netOnly: true,
        subtopics: [
          { id: "ode_ps_1", name: "Frobenius Method" },
          { id: "ode_ps_2", name: "Bessel's & Legendre's Equations" },
          { id: "ode_ps_3", name: "Sturm-Liouville Problems" },
        ],
      },
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
    color: GOLD,
    bg: `${GOLD}22`,
    icon: PlayCircle,
  },
  done: { label: "Done", color: OLIVE, bg: `${OLIVE}22`, icon: CheckCircle2 },
};

/* ─── localStorage helpers ─────────────── */
function getStorageKey(userId: string) {
  return `hs_syllabus_${userId}`;
}

export function loadSyllabusProgress(userId: string): SyllabusProgress {
  try {
    const r = localStorage.getItem(getStorageKey(userId));
    if (!r) return {};
    const raw = JSON.parse(r);
    /* Migrate old format (plain string) to new format (object with status + doneAt) */
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
  } catch {
    /* ignore */
  }
}

/* ─── Filter syllabus by exam ──────────── */
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

/* ─── Progress calc ────────────────────── */
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

/* ─── Main Component ───────────────────── */
export default function Syllabus() {
  const { user } = useAuth();
  const userId = String(user?.id ?? "guest");
  const examType = (user as any)?.exam_type as string | null;

  const [progress, setProgress] = useState<SyllabusProgress>(() =>
    loadSyllabusProgress(userId),
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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

  function updateStatus(subtopicId: string, status: TopicStatus) {
    const now = new Date().toISOString();
    const prev = progress[subtopicId];
    const next: SyllabusProgress = {
      ...progress,
      [subtopicId]: {
        status,
        /* Set doneAt when first marked done, clear it if un-marked */
        doneAt: status === "done" ? (prev?.doneAt ?? now) : undefined,
      },
    };
    setProgress(next);
    saveProgress(userId, next);
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
            {examLabel} Mathematics · {totalSubtopics} subtopics total
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
          · Click subtopic to cycle status
        </span>
      </div>

      {/* Subjects */}
      {syllabus.map((subject) => {
        const { pct, done, total } = calcProgress(subject, progress);
        const isOpen = expanded[subject.id] ?? false;

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
            <button
              onClick={() =>
                setExpanded((p) => ({ ...p, [subject.id]: !p[subject.id] }))
              }
              className="w-full flex items-center gap-4 px-6 py-4 text-left transition-all hover:opacity-80"
              style={{ background: isOpen ? `${SIDEBAR}08` : "#FFF" }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <BookOpen
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: GOLD }}
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
                      style={{ background: `${GOLD}22`, color: SIDEBAR }}
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
                        background: pct === 100 ? OLIVE : GOLD,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-semibold flex-shrink-0"
                    style={{ color: pct === 100 ? OLIVE : MUTED }}
                  >
                    {pct}% · {done}/{total}
                  </span>
                </div>
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

            {isOpen && (
              <div style={{ borderTop: `1px solid ${BORDER}` }}>
                {subject.topics.map((topic, tIdx) => {
                  const isTopicOpen = expandedT[topic.id] ?? false;
                  const topicDone = topic.subtopics.filter(
                    (st) => progress[st.id]?.status === "done",
                  ).length;

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
                      <button
                        onClick={() =>
                          setExpandedT((p) => ({
                            ...p,
                            [topic.id]: !p[topic.id],
                          }))
                        }
                        className="w-full flex items-center gap-3 px-6 py-3 text-left transition-all hover:opacity-80"
                        style={{
                          background: isTopicOpen ? `${GOLD}08` : "#FAF7F2",
                        }}
                      >
                        <div className="w-5 flex-shrink-0 flex items-center justify-center">
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
                          style={{ color: CHARCOAL }}
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
                            style={{ background: `${GOLD}22`, color: SIDEBAR }}
                          >
                            JAM
                          </span>
                        )}
                        <span
                          className="text-xs flex-shrink-0"
                          style={{ color: MUTED }}
                        >
                          {topicDone}/{topic.subtopics.length}
                        </span>
                      </button>

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
                              updateStatus(st.id, next);
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
            style={{ color: GOLD }}
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
