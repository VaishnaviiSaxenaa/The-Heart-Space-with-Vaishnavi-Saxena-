import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
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

interface Subtopic {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  name: string;
  subtopics: Subtopic[];
  jamOnly?: boolean;
  netOnly?: boolean;
}

interface Subject {
  id: string;
  name: string;
  topics: Topic[];
  jamOnly?: boolean;
  netOnly?: boolean;
}

/* ─── Full Syllabus Data ───────────────── */
const SYLLABUS: Subject[] = [
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
          { id: "la_vs_5", name: "Quotient Spaces", netOnly: true },
        ],
      },
      {
        id: "la_lt",
        name: "Linear Transformations",
        subtopics: [
          { id: "la_lt_1", name: "Kernel and Image" },
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
          { id: "ra_set_3", name: "Cantor's Theorem, Cardinal Numbers" },
        ],
      },
      {
        id: "ra_rns",
        name: "Real Number System",
        subtopics: [
          { id: "ra_rns_1", name: "Ordered Fields & Completeness Axiom" },
          { id: "ra_rns_2", name: "Supremum, Infimum, Archimedean Property" },
          { id: "ra_rns_3", name: "Density of Rationals" },
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
          { id: "ra_top_2", name: "Open & Closed Sets" },
          { id: "ra_top_3", name: "Cantor Set" },
        ],
      },
      {
        id: "ra_comp",
        name: "Compactness",
        subtopics: [
          { id: "ra_comp_1", name: "Heine-Borel Theorem" },
          { id: "ra_comp_2", name: "Sequential Compactness" },
          { id: "ra_comp_3", name: "Bolzano-Weierstrass" },
        ],
      },
      {
        id: "ra_seq",
        name: "Real Sequences",
        subtopics: [
          { id: "ra_seq_1", name: "Convergence & Divergence" },
          { id: "ra_seq_2", name: "Monotone Sequences & Subsequences" },
          { id: "ra_seq_3", name: "lim sup, lim inf, Cauchy Sequences" },
        ],
      },
      {
        id: "ra_ser",
        name: "Real Series",
        subtopics: [
          {
            id: "ra_ser_1",
            name: "Convergence Tests: Comparison, Ratio, Root",
          },
          {
            id: "ra_ser_2",
            name: "Integral Test, Alternating Series, Leibniz",
          },
          { id: "ra_ser_3", name: "Absolute & Conditional Convergence" },
          { id: "ra_ser_4", name: "Dirichlet & Abel Tests" },
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
          { id: "ra_cont_2", name: "Types of Discontinuity" },
          { id: "ra_cont_3", name: "Uniform Continuity, Lipschitz" },
        ],
      },
      {
        id: "ra_diff",
        name: "Differentiability",
        subtopics: [
          {
            id: "ra_diff_1",
            name: "Mean Value Theorems: Rolle, Lagrange, Cauchy",
          },
          { id: "ra_diff_2", name: "Taylor's Theorem, L'Hopital's Rule" },
          { id: "ra_diff_3", name: "Monotonicity, Extrema, Convexity" },
        ],
      },
      {
        id: "ra_ri",
        name: "Riemann Integration",
        subtopics: [
          { id: "ra_ri_1", name: "Partitions, Upper & Lower Sums" },
          { id: "ra_ri_2", name: "Fundamental Theorem of Calculus" },
          { id: "ra_ri_3", name: "Improper Integrals, Beta & Gamma Functions" },
        ],
      },
      {
        id: "ra_sof",
        name: "Sequences & Series of Functions",
        subtopics: [
          { id: "ra_sof_1", name: "Pointwise & Uniform Convergence" },
          { id: "ra_sof_2", name: "Weierstrass M-test" },
          { id: "ra_sof_3", name: "Power Series, Radius of Convergence" },
          { id: "ra_sof_4", name: "Taylor Series" },
        ],
      },
      {
        id: "ra_fsv",
        name: "Functions of Several Variables",
        subtopics: [
          { id: "ra_fsv_1", name: "Partial & Directional Derivatives" },
          { id: "ra_fsv_2", name: "Chain Rule, MVT in ℝⁿ" },
          { id: "ra_fsv_3", name: "Lagrange Multipliers" },
          { id: "ra_fsv_4", name: "Implicit & Inverse Function Theorems" },
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
    id: "complex_analysis",
    name: "Complex Analysis",
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
          { id: "ca_ps_2", name: "Zeros of Analytic Functions" },
          { id: "ca_ps_3", name: "Identity Theorem" },
        ],
      },
      {
        id: "ca_sr",
        name: "Singularities & Residues",
        subtopics: [
          {
            id: "ca_sr_1",
            name: "Isolated Singularities: Removable, Poles, Essential",
          },
          { id: "ca_sr_2", name: "Residue Theorem" },
          { id: "ca_sr_3", name: "Evaluation of Real Integrals" },
          { id: "ca_sr_4", name: "Rouche's Theorem" },
        ],
      },
      {
        id: "ca_mt",
        name: "Mobius Transformations",
        netOnly: true,
        subtopics: [
          { id: "ca_mt_1", name: "Cross-ratio, Fixed Points" },
          { id: "ca_mt_2", name: "Mapping of Circles and Lines" },
        ],
      },
      {
        id: "ca_mmp",
        name: "Maximum Modulus Principle",
        netOnly: true,
        subtopics: [
          { id: "ca_mmp_1", name: "Maximum & Minimum Modulus Theorems" },
          { id: "ca_mmp_2", name: "Schwarz Lemma, Open Mapping Theorem" },
        ],
      },
      {
        id: "ca_cm",
        name: "Conformal Mappings",
        netOnly: true,
        subtopics: [
          { id: "ca_cm_1", name: "Angle Preservation, Standard Mappings" },
          { id: "ca_cm_2", name: "Riemann Mapping Theorem (Statement)" },
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
          {
            id: "aa_gt2_2",
            name: "Isomorphism Theorems (First, Second, Third)",
          },
          { id: "aa_gt2_3", name: "Permutation Groups, Cayley's Theorem" },
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
        ],
      },
      {
        id: "ode_ho",
        name: "Higher Order Linear ODEs",
        subtopics: [
          {
            id: "ode_ho_1",
            name: "Constant Coefficient, Characteristic Equation",
          },
          { id: "ode_ho_2", name: "Method of Undetermined Coefficients" },
          { id: "ode_ho_3", name: "Variation of Parameters, Cauchy-Euler" },
        ],
      },
      {
        id: "ode_sys",
        name: "System of ODEs",
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
      {
        id: "ode_eu",
        name: "Existence & Uniqueness",
        netOnly: true,
        subtopics: [
          { id: "ode_eu_1", name: "Picard's Theorem, Lipschitz Condition" },
          { id: "ode_eu_2", name: "Gronwall Inequality" },
        ],
      },
    ],
  },
  {
    id: "pde",
    name: "Partial Differential Equations",
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
          {
            id: "pde_class_1",
            name: "Elliptic, Parabolic, Hyperbolic Classification",
          },
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
          { id: "top_quot_2", name: "Examples: Cylinder, Torus, Mobius Band" },
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
    id: "mechanics",
    name: "Mechanics",
    jamOnly: true,
    topics: [
      {
        id: "mech_vc",
        name: "Vector Calculus Prerequisites",
        subtopics: [
          { id: "mech_vc_1", name: "Gradient, Divergence, Curl" },
          {
            id: "mech_vc_2",
            name: "Green's, Stokes', Gauss Divergence Theorems",
          },
        ],
      },
      {
        id: "mech_dyn",
        name: "Dynamics — Particle",
        subtopics: [
          { id: "mech_dyn_1", name: "Newton's Laws, SHM, Projectile" },
          { id: "mech_dyn_2", name: "Work-Energy, Conservation, Impulse" },
        ],
      },
      {
        id: "mech_cf",
        name: "Central Forces",
        subtopics: [{ id: "mech_cf_1", name: "Orbit Equation, Kepler's Laws" }],
      },
      {
        id: "mech_rb",
        name: "Rigid Body Dynamics",
        subtopics: [
          {
            id: "mech_rb_1",
            name: "Moment of Inertia, Parallel & Perpendicular Axes",
          },
          {
            id: "mech_rb_2",
            name: "Rotation about Fixed Axis, Rolling Motion",
          },
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

function loadProgress(userId: string): Record<string, TopicStatus> {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(userId: string, progress: Record<string, TopicStatus>) {
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

/* ─── Progress calculation ─────────────── */
function calcProgress(subject: Subject, progress: Record<string, TopicStatus>) {
  let total = 0;
  let done = 0;
  subject.topics.forEach((t) => {
    t.subtopics.forEach((st) => {
      total++;
      if (progress[st.id] === "done") done++;
    });
  });
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

/* ─── Main Component ───────────────────── */
export default function Syllabus() {
  const { user } = useAuth();
  const userId = String(user?.id ?? "guest");
  const examType = (user as any)?.exam_type as string | null;

  const [progress, setProgress] = useState<Record<string, TopicStatus>>(() =>
    loadProgress(userId),
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedT, setExpandedT] = useState<Record<string, boolean>>({});

  const syllabus = filterSyllabus(examType);

  /* Total overall progress */
  const totalSubtopics = syllabus.reduce(
    (acc, s) => acc + s.topics.reduce((a, t) => a + t.subtopics.length, 0),
    0,
  );
  const doneSubs = Object.values(progress).filter((v) => v === "done").length;
  const overallPct = totalSubtopics
    ? Math.round((doneSubs / totalSubtopics) * 100)
    : 0;

  function updateStatus(subtopicId: string, status: TopicStatus) {
    const next = { ...progress, [subtopicId]: status };
    setProgress(next);
    saveProgress(userId, next);
  }

  function toggleSubject(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleTopic(id: string) {
    setExpandedT((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const examLabel =
    examType === "JAM"
      ? "IIT JAM"
      : examType === "NET_GATE"
        ? "CSIR NET / GATE"
        : "All";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Header ── */}
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
        {/* Overall progress */}
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

      {/* ── Legend ── */}
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
          · Click any subtopic to cycle status
        </span>
      </div>

      {/* ── Subjects ── */}
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
            {/* Subject header */}
            <button
              onClick={() => toggleSubject(subject.id)}
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
                      NET only
                    </span>
                  )}
                </div>
                {/* Progress bar */}
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

            {/* Topics */}
            {isOpen && (
              <div className="border-t" style={{ borderColor: BORDER }}>
                {subject.topics.map((topic, tIdx) => {
                  const isTopicOpen = expandedT[topic.id] ?? false;
                  const topicDone = topic.subtopics.filter(
                    (st) => progress[st.id] === "done",
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
                      {/* Topic header */}
                      <button
                        onClick={() => toggleTopic(topic.id)}
                        className="w-full flex items-center gap-3 px-6 py-3 text-left transition-all hover:opacity-80"
                        style={{
                          background: isTopicOpen ? `${GOLD}08` : CREAM,
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
                        <span
                          className="text-xs flex-shrink-0"
                          style={{ color: MUTED }}
                        >
                          {topicDone}/{topic.subtopics.length}
                        </span>
                      </button>

                      {/* Subtopics */}
                      {isTopicOpen && (
                        <div
                          className="px-6 pb-3 space-y-1.5"
                          style={{ background: "#FDFBF8" }}
                        >
                          {topic.subtopics.map((st) => {
                            const status = progress[st.id] ?? "not_started";
                            const cfg = STATUS_CONFIG[status];
                            const Icon = cfg.icon;

                            /* Cycle: not_started → in_progress → done → not_started */
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
                                <span
                                  className="flex-1 text-sm"
                                  style={{
                                    color: status === "done" ? OLIVE : CHARCOAL,
                                    textDecoration:
                                      status === "done"
                                        ? "line-through"
                                        : "none",
                                    textDecorationColor: MUTED,
                                  }}
                                >
                                  {st.name}
                                </span>
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

      {/* ── No exam selected ── */}
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
