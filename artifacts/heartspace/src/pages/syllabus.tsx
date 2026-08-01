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
    jamOnly: true,
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
    jamOnly: true,
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
        { id: "real_analysis_2_5", name: "Integral Test (of Test)" },
        { id: "real_analysis_2_5b", name: "Integral Test" },
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
    name: "Modern Algebra",
    netOnly: true,
    topics: [
      { id: "abstract_algebra_t0", name: "Group Theory", subtopics: [
        { id: "abstract_algebra_0_0", name: "Cyclic Groups" },
        { id: "abstract_algebra_0_1", name: "Isomorphism" },
        { id: "abstract_algebra_0_2", name: "Cosets and Lagrange's Theorem" },
        { id: "abstract_algebra_0_3", name: "External Direct Product" },
        { id: "abstract_algebra_0_4", name: "Sylow's Theorems" },
        { id: "abstract_algebra_0_5", name: "Homomorphism" },
      ]},
      { id: "abstract_algebra_t1", name: "Ring Theory", subtopics: [
        { id: "abstract_algebra_1_0", name: "Rings and Subrings" },
        { id: "abstract_algebra_1_1", name: "Integral Domain" },
        { id: "abstract_algebra_1_2", name: "Ring Homomorphism" },
        { id: "abstract_algebra_1_3", name: "Ideals" },
        { id: "abstract_algebra_1_4", name: "Polynomial Rings - Irreducibility Criteria, Eisenstein Criterion, Test of Degree 2 and 3, Gauss Test, Tests on Z" },
        { id: "abstract_algebra_1_5", name: "UFD, PID and ED" },
      ]},
      { id: "abstract_algebra_t2", name: "Field Theory", subtopics: [
        { id: "abstract_algebra_2_0", name: "Field Extensions - Algebraic and Transcendental Extension, Finite Field and its Properties" },
        { id: "abstract_algebra_2_1", name: "Galois Theory" },
      ]},
    ],
  },
  {
    id: "complex_analysis",
    name: "Complex Analysis",
    netOnly: true,
    topics: [
      { id: "complex_analysis_t0", name: "Basic Definitions", subtopics: [
        { id: "complex_analysis_0_0", name: "Basic Definitions" },
      ]},
      { id: "complex_analysis_t1", name: "Complex Valued Functions", subtopics: [
        { id: "complex_analysis_1_0", name: "Complex Valued Functions" },
      ]},
      { id: "complex_analysis_t2", name: "Analytic Functions", subtopics: [
        { id: "complex_analysis_2_0", name: "Limit, Continuity, Differentiability, Analytic Functions, Liouville Theorem" },
        { id: "complex_analysis_2_1", name: "Open mapping theorem" },
        { id: "complex_analysis_2_2", name: "Rouche Theorem" },
        { id: "complex_analysis_2_3", name: "Schwarz Lemma" },
        { id: "complex_analysis_2_4", name: "Results on polynomials" },
      ]},
      { id: "complex_analysis_t3", name: "Complex Integration", subtopics: [
        { id: "complex_analysis_3_0", name: "Contour integration" },
        { id: "complex_analysis_3_1", name: "Cauchy integral formula" },
        { id: "complex_analysis_3_2", name: "Polar form of integration" },
        { id: "complex_analysis_3_3", name: "ML Inequality" },
      ]},
      { id: "complex_analysis_t4", name: "Taylor Series and Laurent Series", subtopics: [
        { id: "complex_analysis_4_0", name: "Taylor Series and Laurent Series" },
      ]},
      { id: "complex_analysis_t5", name: "Residues and Poles", subtopics: [
        { id: "complex_analysis_5_0", name: "Singularity and its types" },
        { id: "complex_analysis_5_1", name: "Types of poles" },
        { id: "complex_analysis_5_2", name: "Types of zeroes and method of evaluation" },
      ]},
      { id: "complex_analysis_t6", name: "Complex Mapping", subtopics: [
        { id: "complex_analysis_6_0", name: "Some important maps" },
        { id: "complex_analysis_6_1", name: "Mobius Transformation" },
        { id: "complex_analysis_6_2", name: "Mapping on disc" },
        { id: "complex_analysis_6_3", name: "Conformal Mapping" },
      ]},
    ],
  },
  {
    id: "ode",
    name: "Ordinary Differential Equations",
    jamOnly: true,
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
    name: "PDE",
    netOnly: true,
    topics: [
      { id: "pde_t0", name: "Partial Differential Equations", subtopics: [
        { id: "pde_0_0", name: "PDE of First Order" },
        { id: "pde_0_1", name: "Lagrange's Method" },
        { id: "pde_0_2", name: "Charpit's Method" },
        { id: "pde_0_3", name: "PDE of Second Order" },
        { id: "pde_0_4", name: "Heat, Wave and Laplace Equations" },
      ]},
    ],
  },
  {
    id: "numerical_analysis",
    name: "Numerical Analysis",
    netOnly: true,
    topics: [
      { id: "numerical_analysis_t0", name: "Solution of Algebraic and Transcendental Equations", subtopics: [
        { id: "numerical_analysis_0_0", name: "Bisection Method, Regula-Falsi Method, Secant Method" },
        { id: "numerical_analysis_0_1", name: "Newton-Raphson Method (Formula, Rate/Order of Convergence)" },
        { id: "numerical_analysis_0_2", name: "Fixed-Point Iteration Method" },
      ]},
      { id: "numerical_analysis_t1", name: "Solutions of Linear Systems", subtopics: [
        { id: "numerical_analysis_1_0", name: "Direct Methods - Gauss Elimination, Gauss-Jordan, LU Decomposition" },
        { id: "numerical_analysis_1_1", name: "Iterative Methods - Jacobi Method, Gauss-Seidel Method" },
      ]},
      { id: "numerical_analysis_t2", name: "Interpolation", subtopics: [
        { id: "numerical_analysis_2_0", name: "Lagrange's Interpolation, Newton's Divided Difference" },
        { id: "numerical_analysis_2_1", name: "Newton's Forward/Backward Difference" },
        { id: "numerical_analysis_2_2", name: "Central Difference Formulas (Gauss, Stirling, Bessel)" },
        { id: "numerical_analysis_2_3", name: "Hermite Interpolation and Piecewise Spline Interpolation" },
        { id: "numerical_analysis_2_4", name: "Error bounds in interpolation formulas" },
      ]},
      { id: "numerical_analysis_t3", name: "Numerical Differentiation and Integration", subtopics: [
        { id: "numerical_analysis_3_0", name: "Numerical Differentiation using Newton's formulas" },
        { id: "numerical_analysis_3_1", name: "Newton-Cotes Quadrature - Trapezoidal, Simpson's 1/3, Simpson's 3/8" },
        { id: "numerical_analysis_3_2", name: "Errors in Quadrature formulas" },
        { id: "numerical_analysis_3_3", name: "Gauss Quadrature Formulas" },
      ]},
      { id: "numerical_analysis_t4", name: "Numerical Solution of ODEs", subtopics: [
        { id: "numerical_analysis_4_0", name: "Picard's Method" },
        { id: "numerical_analysis_4_1", name: "Euler's Method and Modified Euler's Method" },
        { id: "numerical_analysis_4_2", name: "Runge-Kutta Methods (2nd and 4th order)" },
        { id: "numerical_analysis_4_3", name: "Predictor-Corrector Methods (Milne's, Adams-Bashforth)" },
      ]},
    ],
  },
  {
    id: "calculus_of_variations",
    name: "Calculus of Variations",
    netOnly: true,
    topics: [
      { id: "calculus_of_variations_t0", name: "Functionals and Extremals", subtopics: [
        { id: "calculus_of_variations_0_0", name: "Definition of functionals" },
        { id: "calculus_of_variations_0_1", name: "Continuous functionals" },
        { id: "calculus_of_variations_0_2", name: "Concept of variation (δy)" },
      ]},
      { id: "calculus_of_variations_t1", name: "Euler-Lagrange Equations", subtopics: [
        { id: "calculus_of_variations_1_0", name: "Functional depends on x, y, y'" },
        { id: "calculus_of_variations_1_1", name: "Functional independent of x, y, or y'" },
        { id: "calculus_of_variations_1_2", name: "Higher-order derivatives" },
        { id: "calculus_of_variations_1_3", name: "Multiple dependent variables" },
      ]},
      { id: "calculus_of_variations_t2", name: "Variational Problems with Constraints", subtopics: [
        { id: "calculus_of_variations_2_0", name: "Isoperimetric problems - Lagrange multipliers" },
      ]},
      { id: "calculus_of_variations_t3", name: "Boundary Conditions", subtopics: [
        { id: "calculus_of_variations_3_0", name: "Fixed boundary conditions" },
        { id: "calculus_of_variations_3_1", name: "Moving/Variable boundary conditions (Natural and Transversality conditions)" },
      ]},
      { id: "calculus_of_variations_t4", name: "Sufficient Conditions for Extremum", subtopics: [
        { id: "calculus_of_variations_4_0", name: "Jacobi's condition and Conjugate points" },
        { id: "calculus_of_variations_4_1", name: "Weierstrass condition and Legendre condition (Weak and Strong extrema)" },
      ]},
      { id: "calculus_of_variations_t5", name: "Variational Methods", subtopics: [
        { id: "calculus_of_variations_5_0", name: "Ritz method" },
        { id: "calculus_of_variations_5_1", name: "Galerkin method" },
      ]},
    ],
  },
  {
    id: "integral_equations",
    name: "Integral Equations",
    netOnly: true,
    topics: [
      { id: "integral_equations_t0", name: "Classification of Integral Equations", subtopics: [
        { id: "integral_equations_0_0", name: "Linear vs Non-linear" },
        { id: "integral_equations_0_1", name: "Volterra Integral Equations (1st and 2nd kind)" },
        { id: "integral_equations_0_2", name: "Fredholm Integral Equations (1st and 2nd kind)" },
        { id: "integral_equations_0_3", name: "Singular and Regular integral equations" },
      ]},
      { id: "integral_equations_t1", name: "Conversion of Differential Equations to Integral Equations", subtopics: [
        { id: "integral_equations_1_0", name: "Converting IVP to Volterra equations" },
        { id: "integral_equations_1_1", name: "Converting BVP to Fredholm equations (using Green's Function)" },
      ]},
      { id: "integral_equations_t2", name: "Methods of Solving Fredholm Integral Equations (2nd Kind)", subtopics: [
        { id: "integral_equations_2_0", name: "Separable/Degenerate Kernels" },
        { id: "integral_equations_2_1", name: "Resolvent Kernel method (Neumann Series)" },
      ]},
      { id: "integral_equations_t3", name: "Methods of Solving Volterra Integral Equations (2nd Kind)", subtopics: [
        { id: "integral_equations_3_0", name: "Method of Successive Approximations" },
        { id: "integral_equations_3_1", name: "Resolvent Kernel method" },
        { id: "integral_equations_3_2", name: "Laplace Transform method" },
      ]},
      { id: "integral_equations_t4", name: "Eigenvalues and Eigenfunctions", subtopics: [
        { id: "integral_equations_4_0", name: "Characteristic values and eigenfunctions for homogeneous Fredholm equations" },
      ]},
      { id: "integral_equations_t5", name: "Symmetric Kernels", subtopics: [
        { id: "integral_equations_5_0", name: "Hilbert-Schmidt Theory" },
        { id: "integral_equations_5_1", name: "Orthogonal eigenfunctions" },
        { id: "integral_equations_5_2", name: "Expansion of symmetric kernels" },
      ]},
    ],
  },
  {
    id: "group_theory",
    name: "Group Theory",
    jamOnly: true,
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
    jamOnly: true,
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
        { id: "functions_of_one_variable_3_5", name: "Mean Value Theorem - Rolle's Theorem" },
        { id: "functions_of_one_variable_3_6", name: "Mean Value Theorem - LMVT" },
        { id: "functions_of_one_variable_3_7", name: "Mean Value Theorem - Cauchy's MVT" },
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
    jamOnly: true,
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
    jamOnly: true,
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
    jamOnly: true,
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
  {
    id: "linear_algebra_net",
    name: "Linear Algebra",
    netOnly: true,
    topics: [
      { id: "linear_algebra_net_t0", name: "System of Linear Equations", subtopics: [
        { id: "linear_algebra_net_0_0", name: "Consistent and Inconsistent system" },
        { id: "linear_algebra_net_0_1", name: "Homogeneous system" },
        { id: "linear_algebra_net_0_2", name: "Method of solution" },
      ]},
      { id: "linear_algebra_net_t1", name: "Matrices and Determinants", subtopics: [
        { id: "linear_algebra_net_1_0", name: "Types of Matrices" },
        { id: "linear_algebra_net_1_1", name: "Determinant and its properties" },
      ]},
      { id: "linear_algebra_net_t2", name: "Vector Spaces", subtopics: [
        { id: "linear_algebra_net_2_0", name: "Definition and Examples" },
        { id: "linear_algebra_net_2_1", name: "Subspace" },
        { id: "linear_algebra_net_2_2", name: "Span" },
        { id: "linear_algebra_net_2_3", name: "Linear independence" },
        { id: "linear_algebra_net_2_4", name: "Basis and dimension" },
        { id: "linear_algebra_net_2_5", name: "Investigation on subspaces – Union, intersection and Sum" },
      ]},
      { id: "linear_algebra_net_t3", name: "Linear Transformations", subtopics: [
        { id: "linear_algebra_net_3_0", name: "Definition" },
        { id: "linear_algebra_net_3_1", name: "Matrix representation" },
        { id: "linear_algebra_net_3_2", name: "Range space, null space" },
        { id: "linear_algebra_net_3_3", name: "Rank nullity theorem" },
        { id: "linear_algebra_net_3_4", name: "One-one and onto transformation" },
        { id: "linear_algebra_net_3_5", name: "Composition and inverse" },
        { id: "linear_algebra_net_3_6", name: "Change of Basis" },
      ]},
      { id: "linear_algebra_net_t4", name: "Eigenvalues and Eigenvectors", subtopics: [
        { id: "linear_algebra_net_4_0", name: "Eigenvalue problem" },
        { id: "linear_algebra_net_4_1", name: "Properties of eigenvalues and eigenvectors" },
        { id: "linear_algebra_net_4_2", name: "Algebraic and Geometric Multiplicity" },
        { id: "linear_algebra_net_4_3", name: "Diagonalization" },
        { id: "linear_algebra_net_4_4", name: "Eigenvalues of special matrices" },
        { id: "linear_algebra_net_4_5", name: "Annihilating and Minimal Polynomial" },
      ]},
      { id: "linear_algebra_net_t5", name: "Inner Product Spaces", subtopics: [
        { id: "linear_algebra_net_5_0", name: "Definition" },
        { id: "linear_algebra_net_5_1", name: "Norm of vector space" },
      ]},
      { id: "linear_algebra_net_t6", name: "Jordan Canonical Forms", subtopics: [
        { id: "linear_algebra_net_6_0", name: "Definition and Method of Solution" },
      ]},
      { id: "linear_algebra_net_t7", name: "Bilinear and Quadratic Forms", subtopics: [
        { id: "linear_algebra_net_7_0", name: "Triangular form" },
        { id: "linear_algebra_net_7_1", name: "Matrix representation" },
      ]},
    ],
  },
  {
    id: "real_analysis_net",
    name: "Real Analysis",
    netOnly: true,
    topics: [
      { id: "real_analysis_net_t0", name: "Set Theory", subtopics: [
        { id: "real_analysis_net_0_0", name: "Set Theory" },
      ]},
      { id: "real_analysis_net_t1", name: "Sequences of Real Numbers", subtopics: [
        { id: "real_analysis_net_1_0", name: "Methods of Convergence" },
        { id: "real_analysis_net_1_1", name: "Cauchy Sequences" },
        { id: "real_analysis_net_1_2", name: "Contractive Sequences" },
        { id: "real_analysis_net_1_3", name: "Cauchy's Theorem" },
      ]},
      { id: "real_analysis_net_t2", name: "Series of Real Numbers", subtopics: [
        { id: "real_analysis_net_2_0", name: "Series of Positive Terms" },
        { id: "real_analysis_net_2_1", name: "Infinite Series" },
        { id: "real_analysis_net_2_2", name: "Power Series" },
      ]},
      { id: "real_analysis_net_t3", name: "Sequences & Series of Functions", subtopics: [
        { id: "real_analysis_net_3_0", name: "Pointwise vs Uniform Convergence" },
        { id: "real_analysis_net_3_1", name: "Tests for Uniform Convergence" },
        { id: "real_analysis_net_3_2", name: "Term-by-term Differentiation/Integration" },
      ]},
    ],
  },
  {
    id: "ode_net",
    name: "ODE",
    netOnly: true,
    topics: [
      { id: "ode_net_t0", name: "Ordinary Differential Equations", subtopics: [
        { id: "ode_net_0_0", name: "Existence and Uniqueness Theorem" },
        { id: "ode_net_0_1", name: "Equations of First Order and First Degree" },
        { id: "ode_net_0_2", name: "Methods for First Order Equations" },
        { id: "ode_net_0_3", name: "Orthogonal Trajectories" },
        { id: "ode_net_0_4", name: "2nd Order ODE" },
        { id: "ode_net_0_5", name: "Solution of 2nd Order ODE" },
        { id: "ode_net_0_6", name: "Cauchy-Euler Equation" },
        { id: "ode_net_0_7", name: "Wronskian" },
        { id: "ode_net_0_8", name: "Variation of Parameters" },
        { id: "ode_net_0_9", name: "System of ODEs" },
        { id: "ode_net_0_10", name: "Sturm-Liouville Problem" },
        { id: "ode_net_0_11", name: "Green's Function" },
      ]},
    ],
  },
  {
    id: "differential_calculus_net",
    name: "Differential Calculus",
    netOnly: true,
    topics: [
      { id: "differential_calculus_net_t0", name: "Function of One Variable", subtopics: [
        { id: "differential_calculus_net_0_0", name: "Function, Limit, Continuity" },
        { id: "differential_calculus_net_0_1", name: "Properties of Continuity" },
        { id: "differential_calculus_net_0_2", name: "Differentiability" },
        { id: "differential_calculus_net_0_3", name: "Mean Value Theorems" },
        { id: "differential_calculus_net_0_4", name: "Increasing/Decreasing Functions" },
        { id: "differential_calculus_net_0_5", name: "Maxima & Minima" },
      ]},
      { id: "differential_calculus_net_t1", name: "Function of Several Variables", subtopics: [
        { id: "differential_calculus_net_1_0", name: "Limit, Continuity" },
        { id: "differential_calculus_net_1_1", name: "Partial Derivatives" },
        { id: "differential_calculus_net_1_2", name: "Differentiability" },
        { id: "differential_calculus_net_1_3", name: "Maxima & Minima" },
        { id: "differential_calculus_net_1_4", name: "Inverse and Implicit Function Theorem" },
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
  abstract_algebra: 60,
  group_theory: 50,
  functions_of_one_variable: 50,
  multiple_variable_calculus: 25,
  miscellaneous: 25,
  complex_analysis: 80,
  ode: 40,
  pde: 40,
  differential_calculus: 50,
  integration: 30,
  numerical_analysis: 40,
  calculus_of_variations: 40,
  linear_algebra_net: 80,
  real_analysis_net: 80,
  ode_net: 40,
  differential_calculus_net: 60,
  linear_programming: 30,
  statistics: 30,
  topology: 30,
  functional_analysis: 30,
  mechanics: 33,
  integral_equations: 40,
};

// Map syllabus subject IDs to roadmap calendar subject IDs
const SYLLABUS_TO_CAL_ID: Record<string, string> = {
  linear_algebra: "la",
  real_analysis: "ra",
  differential_calculus: "dc",
  linear_algebra_net: "la",
  real_analysis_net: "ra",
  ode_net: "ode",
  differential_calculus_net: "dc",
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
