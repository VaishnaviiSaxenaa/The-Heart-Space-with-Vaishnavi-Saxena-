export interface Subject {
  id: string;
  syllabusId: string;
  name: string;
  totalHours: number;
  studyWeeks: number;
  assignmentWeeks: number;
}

export const JAM_SUBJECTS: Subject[] = [
  { id: "la", syllabusId: "linear_algebra", name: "Linear Algebra", totalHours: 60, studyWeeks: 4, assignmentWeeks: 0.5 },
  { id: "aa", syllabusId: "abstract_algebra", name: "Group Theory + Ring & Field", totalHours: 90, studyWeeks: 5, assignmentWeeks: 1 },
  { id: "ra", syllabusId: "real_analysis", name: "Real Analysis", totalHours: 75, studyWeeks: 5, assignmentWeeks: 0.5 },
  { id: "ca", syllabusId: "complex_analysis", name: "Complex Analysis", totalHours: 50, studyWeeks: 3, assignmentWeeks: 0.5 },
  { id: "ode", syllabusId: "ode", name: "ODE", totalHours: 40, studyWeeks: 2, assignmentWeeks: 0.5 },
  { id: "pde", syllabusId: "pde", name: "PDE", totalHours: 40, studyWeeks: 2, assignmentWeeks: 0.5 },
  { id: "ie", syllabusId: "integral_equations", name: "Integral Equations", totalHours: 30, studyWeeks: 2, assignmentWeeks: 0.5 },
  { id: "cv", syllabusId: "calculus_of_variations", name: "Calculus of Variations", totalHours: 30, studyWeeks: 2, assignmentWeeks: 0.5 },
  { id: "na", syllabusId: "numerical_analysis", name: "Numerical Analysis", totalHours: 30, studyWeeks: 2, assignmentWeeks: 0.5 },
  { id: "mech", syllabusId: "mechanics", name: "Mechanics", totalHours: 33, studyWeeks: 2, assignmentWeeks: 0.5 },
];

export const NET_SUBJECTS: Subject[] = [
  { id: "la", syllabusId: "linear_algebra", name: "Linear Algebra", totalHours: 60, studyWeeks: 4, assignmentWeeks: 0.5 },
  { id: "aa", syllabusId: "abstract_algebra", name: "Group Theory + Ring & Field", totalHours: 90, studyWeeks: 5, assignmentWeeks: 1 },
  { id: "ra", syllabusId: "real_analysis", name: "Real Analysis", totalHours: 75, studyWeeks: 5, assignmentWeeks: 0.5 },
  { id: "ca", syllabusId: "complex_analysis", name: "Complex Analysis", totalHours: 50, studyWeeks: 3, assignmentWeeks: 0.5 },
  { id: "ode", syllabusId: "ode", name: "ODE", totalHours: 40, studyWeeks: 2, assignmentWeeks: 0.5 },
  { id: "pde", syllabusId: "pde", name: "PDE", totalHours: 40, studyWeeks: 2, assignmentWeeks: 0.5 },
  { id: "ie", syllabusId: "integral_equations", name: "Integral Equations", totalHours: 30, studyWeeks: 2, assignmentWeeks: 0.5 },
  { id: "cv", syllabusId: "calculus_of_variations", name: "Calculus of Variations", totalHours: 30, studyWeeks: 2, assignmentWeeks: 0.5 },
  { id: "na", syllabusId: "numerical_analysis", name: "Numerical Analysis", totalHours: 30, studyWeeks: 2, assignmentWeeks: 0.5 },
  { id: "topo", syllabusId: "topology", name: "Topology", totalHours: 44, studyWeeks: 3, assignmentWeeks: 0.5 },
  { id: "fa", syllabusId: "functional_analysis", name: "Functional Analysis", totalHours: 22, studyWeeks: 1.5, assignmentWeeks: 0.5 },
  { id: "lp", syllabusId: "linear_programming", name: "Linear Programming", totalHours: 28, studyWeeks: 2, assignmentWeeks: 0.5 },
  { id: "sp", syllabusId: "statistics", name: "Statistics & Probability", totalHours: 44, studyWeeks: 3, assignmentWeeks: 0.5 },
];

export function getSubjectsForExamType(examType: string): Subject[] {
  return examType === "NET_GATE" || examType === "NET" ? NET_SUBJECTS : JAM_SUBJECTS;
}
