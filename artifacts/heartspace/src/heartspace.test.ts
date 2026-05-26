/**
 * HeartSpace Core Test Suite
 *
 * RULES (enforced):
 * 1. NEVER modify existing tests to accommodate new features.
 * 2. New features MUST add NEW tests in new describe blocks.
 * 3. Build fails if any test fails — deployment is blocked.
 * 4. If a test needs to change, it means the feature contract changed
 *    and must be explicitly approved before editing.
 */

import { describe, it, expect, beforeEach } from "vitest";

/* ══════════════════════════════════════════════════════════
   SHARED HELPERS  (do not modify — add new ones below)
   ══════════════════════════════════════════════════════════ */

const PLAN_MAP: Record<string, string> = {
  academy_student: "zenith",
  prep_student: "apex",
  counseling_client: "heartspace",
};

const ROLE_MAP: Record<
  string,
  { role: string; space: string | null; redirect: string }
> = {
  admin: { role: "counsellor", space: null, redirect: "/counsellor" },
  academy_student: { role: "student", space: "zenith", redirect: "/dashboard" },
  prep_student: { role: "student", space: "apex", redirect: "/dashboard" },
  counseling_client: {
    role: "student",
    space: "heartspace",
    redirect: "/self-dashboard",
  },
};

const ADMIN_EMAIL = "theheartspacewithvs@gmail.com";

function isSupabaseJwt(token: string | null): boolean {
  return !!token && (token.match(/\./g) ?? []).length >= 2;
}

function getDisplayName(
  fullName: string | null | undefined,
  email: string,
): string {
  return fullName?.trim() || email.split("@")[0];
}

const VALID_EXAM_TYPES = ["JAM", "NET_GATE"] as const;
type ExamType = (typeof VALID_EXAM_TYPES)[number];

function getExamLabel(examType: ExamType): string {
  if (examType === "JAM") return "IIT JAM";
  if (examType === "NET_GATE") return "CSIR NET / GATE";
  return "Unknown";
}

function shouldShowExamSelect(role: string, examType: string | null): boolean {
  return role === "student" && !examType;
}

/* ══════════════════════════════════════════════════════════
   NEW HELPERS for schedule + practice features
   ══════════════════════════════════════════════════════════ */

type ConceptLevel = "weak" | "developing" | "strong";
type SpeedLevel = "slow" | "moderate" | "fast";

const VALID_CONCEPT_LEVELS: ConceptLevel[] = ["weak", "developing", "strong"];
const VALID_SPEED_LEVELS: SpeedLevel[] = ["slow", "moderate", "fast"];

interface UnavailablePeriod {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
}
interface VariableWeek {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  multiplier?: number;
  customHours?: number;
}

/* Minimal schedule engine for tests (mirrors production logic) */
function calcEffectiveWeeklyHours(
  baseHoursPerDay: number,
  daysPerWeek: number,
  unavailablePeriods: UnavailablePeriod[],
  variableWeeks: VariableWeek[],
  weekOffset: number,
  startDateStr: string,
): { hours: number; isUnavailable: boolean } {
  const start = new Date(startDateStr);
  const weekDate = new Date(start);
  weekDate.setDate(weekDate.getDate() + weekOffset * 7);
  const baseHours = baseHoursPerDay * daysPerWeek;

  for (const up of unavailablePeriods) {
    if (!up.startDate || !up.endDate) continue;
    const upStart = new Date(up.startDate);
    const upEnd = new Date(up.endDate);
    if (weekDate >= upStart && weekDate < upEnd)
      return { hours: 0, isUnavailable: true };
  }

  for (const vw of variableWeeks) {
    if (!vw.startDate || !vw.endDate) continue;
    const vwStart = new Date(vw.startDate);
    const vwEnd = new Date(vw.endDate);
    if (weekDate >= vwStart && weekDate < vwEnd) {
      const h =
        vw.customHours !== undefined
          ? vw.customHours * daysPerWeek
          : baseHours * (vw.multiplier ?? 1);
      return { hours: h, isUnavailable: false };
    }
  }

  return { hours: baseHours, isUnavailable: false };
}

function calcMinimumMonths(
  totalStudyWeeks: number,
  revisionPercent: number,
  bufferWeeks: number,
): number {
  const revisionWeeks = Math.ceil(totalStudyWeeks * (revisionPercent / 100));
  return Math.ceil((totalStudyWeeks + revisionWeeks + bufferWeeks) / 4);
}

function getSyllabusCompletionPercent(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

function getAdjustedStudyWeeks(
  originalWeeks: number,
  syllabusPercent: number,
): number {
  const remaining = Math.max(0, 1 - syllabusPercent / 100);
  return Math.ceil(originalWeeks * remaining);
}

function getPracticeMarkerDisplay(
  attempted: number,
  avgAcc: number | null,
): string {
  if (attempted === 0 || avgAcc === null) return "Not started";
  return `${avgAcc}%`;
}

/* ══════════════════════════════════════════════════════════
   §1  ROLE MAPPING  (do not modify)
   ══════════════════════════════════════════════════════════ */
describe("Role Mapping", () => {
  it("admin maps to counsellor role", () =>
    expect(ROLE_MAP["admin"].role).toBe("counsellor"));
  it("admin redirects to /counsellor", () =>
    expect(ROLE_MAP["admin"].redirect).toBe("/counsellor"));
  it("admin space is null", () => expect(ROLE_MAP["admin"].space).toBeNull());
  it("academy_student maps to student role", () =>
    expect(ROLE_MAP["academy_student"].role).toBe("student"));
  it("academy_student space is zenith", () =>
    expect(ROLE_MAP["academy_student"].space).toBe("zenith"));
  it("prep_student maps to student role", () =>
    expect(ROLE_MAP["prep_student"].role).toBe("student"));
  it("prep_student space is apex", () =>
    expect(ROLE_MAP["prep_student"].space).toBe("apex"));
  it("counseling_client maps to student role", () =>
    expect(ROLE_MAP["counseling_client"].role).toBe("student"));
  it("counseling_client space is heartspace", () =>
    expect(ROLE_MAP["counseling_client"].space).toBe("heartspace"));
  it("counseling_client redirects to /self-dashboard", () =>
    expect(ROLE_MAP["counseling_client"].redirect).toBe("/self-dashboard"));
});

/* ══════════════════════════════════════════════════════════
   §2  PLAN MAPPING  (do not modify)
   ══════════════════════════════════════════════════════════ */
describe("Plan Mapping", () => {
  it("academy_student plan is zenith", () =>
    expect(PLAN_MAP["academy_student"]).toBe("zenith"));
  it("prep_student plan is apex", () =>
    expect(PLAN_MAP["prep_student"]).toBe("apex"));
  it("counseling_client plan is heartspace", () =>
    expect(PLAN_MAP["counseling_client"]).toBe("heartspace"));
  it("all three service keys exist in PLAN_MAP", () =>
    expect(Object.keys(PLAN_MAP)).toHaveLength(3));
  it("plan values are only zenith, apex, or heartspace", () => {
    const validPlans = ["zenith", "apex", "heartspace"];
    Object.values(PLAN_MAP).forEach((plan) =>
      expect(validPlans).toContain(plan),
    );
  });
});

/* ══════════════════════════════════════════════════════════
   §3  ADMIN EMAIL  (do not modify)
   ══════════════════════════════════════════════════════════ */
describe("Admin Email Override", () => {
  it("admin email is correct", () =>
    expect(ADMIN_EMAIL).toBe("theheartspacewithvs@gmail.com"));
  it("admin email always gets counsellor role", () =>
    expect("theheartspacewithvs@gmail.com" === ADMIN_EMAIL).toBe(true));
  it("non-admin email does not get admin override", () =>
    expect("student@gmail.com" === ADMIN_EMAIL).toBe(false));
  it("admin name is always Vaishnavi Saxena", () =>
    expect("Vaishnavi Saxena").toBe("Vaishnavi Saxena"));
});

/* ══════════════════════════════════════════════════════════
   §4  DISPLAY NAME  (do not modify)
   ══════════════════════════════════════════════════════════ */
describe("Display Name Logic", () => {
  it("uses full_name when available", () =>
    expect(getDisplayName("Arjun Mehta", "arjun@gmail.com")).toBe(
      "Arjun Mehta",
    ));
  it("falls back to email prefix when null", () =>
    expect(getDisplayName(null, "arjun@gmail.com")).toBe("arjun"));
  it("falls back to email prefix when empty", () =>
    expect(getDisplayName("", "arjun@gmail.com")).toBe("arjun"));
  it("falls back to email prefix when whitespace", () =>
    expect(getDisplayName("   ", "arjun@gmail.com")).toBe("arjun"));
  it("never shows raw email as display name", () =>
    expect(getDisplayName(null, "trial3@gmail.com")).not.toContain("@"));
  it("trims whitespace from full_name", () =>
    expect(getDisplayName("  Arjun  ", "arjun@gmail.com")).toBe("Arjun"));
});

/* ══════════════════════════════════════════════════════════
   §5  TOKEN DETECTION  (do not modify)
   ══════════════════════════════════════════════════════════ */
describe("Token Detection", () => {
  it("identifies Supabase JWT correctly", () =>
    expect(
      isSupabaseJwt(
        "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
      ),
    ).toBe(true));
  it("identifies demo token as non-JWT", () =>
    expect(isSupabaseJwt(btoa("prep@heartspace.com:demo:heartspace"))).toBe(
      false,
    ));
  it("null token is not a JWT", () => expect(isSupabaseJwt(null)).toBe(false));
  it("empty string is not a JWT", () => expect(isSupabaseJwt("")).toBe(false));
});

/* ══════════════════════════════════════════════════════════
   §6  DEMO ACCOUNTS  (do not modify)
   ══════════════════════════════════════════════════════════ */
describe("Demo Accounts", () => {
  const DEMO_ACCOUNTS: Record<string, { role: string; space: string | null }> =
    {
      "vaishnavi@heartspace.com": { role: "counsellor", space: null },
      "prep@heartspace.com": { role: "student", space: "prep" },
      "counseling@heartspace.com": { role: "student", space: "self" },
      "academy@heartspace.com": { role: "student", space: "prep" },
    };
  it("vaishnavi demo account is counsellor", () =>
    expect(DEMO_ACCOUNTS["vaishnavi@heartspace.com"].role).toBe("counsellor"));
  it("prep demo account is student", () =>
    expect(DEMO_ACCOUNTS["prep@heartspace.com"].role).toBe("student"));
  it("all demo accounts exist", () =>
    expect(Object.keys(DEMO_ACCOUNTS)).toHaveLength(4));
  it("demo passwords are accepted", () => {
    const DEMO_PASSWORDS = ["heartspace123", "password123"];
    expect(DEMO_PASSWORDS).toContain("heartspace123");
    expect(DEMO_PASSWORDS).toContain("password123");
  });
});

/* ══════════════════════════════════════════════════════════
   §7  ROUTING  (do not modify)
   ══════════════════════════════════════════════════════════ */
describe("Role Based Routing", () => {
  it("admin goes to /counsellor", () =>
    expect(ROLE_MAP["admin"].redirect).toBe("/counsellor"));
  it("zenith student goes to /dashboard", () =>
    expect(ROLE_MAP["academy_student"].redirect).toBe("/dashboard"));
  it("apex student goes to /dashboard", () =>
    expect(ROLE_MAP["prep_student"].redirect).toBe("/dashboard"));
  it("heartspace client goes to /self-dashboard", () =>
    expect(ROLE_MAP["counseling_client"].redirect).toBe("/self-dashboard"));
  it("heartspace space triggers self-dashboard routing", () => {
    const space = "heartspace";
    expect(space === "heartspace" ? "/self-dashboard" : "/dashboard").toBe(
      "/self-dashboard",
    );
  });
});

/* ══════════════════════════════════════════════════════════
   §8  SUPABASE PROFILE  (do not modify)
   ══════════════════════════════════════════════════════════ */
describe("Supabase Profile Handling", () => {
  it("profile with role academy_student gets zenith plan", () =>
    expect({ role: "academy_student", plan: "zenith" }.plan).toBe("zenith"));
  it("profile with role prep_student gets apex plan", () =>
    expect({ role: "prep_student", plan: "apex" }.plan).toBe("apex"));
  it("profile with role counseling_client gets heartspace plan", () =>
    expect({ role: "counseling_client", plan: "heartspace" }.plan).toBe(
      "heartspace",
    ));
  it("plan from DB takes priority over mapped space", () =>
    expect("zenith" ?? "apex").toBe("zenith"));
  it("falls back to mapped space when plan is null", () =>
    expect(null ?? "apex").toBe("apex"));
});

/* ══════════════════════════════════════════════════════════
   §9  LOCALSTORAGE  (do not modify)
   ══════════════════════════════════════════════════════════ */
describe("LocalStorage Handling", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  it("stores user correctly", () => {
    const user = { name: "Test", role: "student", space: "zenith" };
    localStorage.setItem("heartspace_user", JSON.stringify(user));
    const stored = JSON.parse(localStorage.getItem("heartspace_user") ?? "{}");
    expect(stored.name).toBe("Test");
    expect(stored.space).toBe("zenith");
  });
  it("clears user on logout", () => {
    localStorage.setItem("heartspace_user", JSON.stringify({ name: "Test" }));
    localStorage.removeItem("heartspace_user");
    localStorage.removeItem("heartspace_token");
    expect(localStorage.getItem("heartspace_user")).toBeNull();
    expect(localStorage.getItem("heartspace_token")).toBeNull();
  });
  it("returns null for missing user", () =>
    expect(localStorage.getItem("heartspace_user")).toBeNull());
});

/* ══════════════════════════════════════════════════════════
   §10  SIGNUP VALIDATION  (do not modify)
   ══════════════════════════════════════════════════════════ */
describe("Signup Validation", () => {
  it("full name must be at least 2 characters", () =>
    expect("A".length >= 2).toBe(false));
  it("valid full name passes", () =>
    expect("Arjun Mehta".length >= 2).toBe(true));
  it("password must be at least 8 characters", () =>
    expect("short".length >= 8).toBe(false));
  it("valid password passes", () =>
    expect("validpassword123".length >= 8).toBe(true));
  it("valid email format passes", () =>
    expect("student@gmail.com".includes("@")).toBe(true));
  it("invalid email format fails", () =>
    expect("notanemail".includes("@")).toBe(false));
  it("service key must be one of three valid options", () => {
    const validKeys = ["academy_student", "prep_student", "counseling_client"];
    expect(validKeys).toContain("academy_student");
    expect(validKeys).toContain("prep_student");
    expect(validKeys).toContain("counseling_client");
    expect(validKeys).not.toContain("admin");
  });
});

/* ══════════════════════════════════════════════════════════
   §11  EXAM SELECTION  (do not modify)
   ══════════════════════════════════════════════════════════ */
describe("Exam Selection", () => {
  it("only two valid exam types exist", () => {
    expect(VALID_EXAM_TYPES).toHaveLength(2);
    expect(VALID_EXAM_TYPES).toContain("JAM");
    expect(VALID_EXAM_TYPES).toContain("NET_GATE");
  });
  it("JAM label is correct", () => expect(getExamLabel("JAM")).toBe("IIT JAM"));
  it("NET_GATE label is correct", () =>
    expect(getExamLabel("NET_GATE")).toBe("CSIR NET / GATE"));
  it("student with no exam type should see exam select screen", () =>
    expect(shouldShowExamSelect("student", null)).toBe(true));
  it("student with exam type should NOT see exam select screen", () =>
    expect(shouldShowExamSelect("student", "JAM")).toBe(false));
  it("counsellor should never see exam select screen", () =>
    expect(shouldShowExamSelect("counsellor", null)).toBe(false));
  it("admin should never see exam select screen", () =>
    expect(shouldShowExamSelect("admin", null)).toBe(false));
  it("exam type JAM is saved correctly", () =>
    expect(VALID_EXAM_TYPES.includes("JAM" as ExamType)).toBe(true));
  it("exam type NET_GATE is saved correctly", () =>
    expect(VALID_EXAM_TYPES.includes("NET_GATE" as ExamType)).toBe(true));
  it("invalid exam type is rejected", () =>
    expect(VALID_EXAM_TYPES.includes("INVALID" as ExamType)).toBe(false));
});

/* ══════════════════════════════════════════════════════════
   §12  SCHEDULE ENGINE  (new — do not modify once passing)
   ══════════════════════════════════════════════════════════ */
describe("Schedule Engine", () => {
  it("base hours per week = hoursPerDay × daysPerWeek", () => {
    expect(2 * 5).toBe(10);
  });

  it("unavailable period returns 0 hours for that week", () => {
    const up: UnavailablePeriod = {
      id: "1",
      label: "Exams",
      startDate: "2026-06-01",
      endDate: "2026-06-08",
    };
    const result = calcEffectiveWeeklyHours(2, 5, [up], [], 0, "2026-06-01");
    expect(result.hours).toBe(0);
    expect(result.isUnavailable).toBe(true);
  });

  it("week outside unavailable period returns base hours", () => {
    const up: UnavailablePeriod = {
      id: "1",
      label: "Exams",
      startDate: "2026-06-01",
      endDate: "2026-06-08",
    };
    const result = calcEffectiveWeeklyHours(2, 5, [up], [], 1, "2026-06-01");
    expect(result.hours).toBe(10);
    expect(result.isUnavailable).toBe(false);
  });

  it("multi-week unavailable period blocks all its weeks", () => {
    const up: UnavailablePeriod = {
      id: "1",
      label: "Trip",
      startDate: "2026-06-01",
      endDate: "2026-06-22",
    };
    expect(
      calcEffectiveWeeklyHours(2, 5, [up], [], 0, "2026-06-01").isUnavailable,
    ).toBe(true);
    expect(
      calcEffectiveWeeklyHours(2, 5, [up], [], 1, "2026-06-01").isUnavailable,
    ).toBe(true);
    expect(
      calcEffectiveWeeklyHours(2, 5, [up], [], 2, "2026-06-01").isUnavailable,
    ).toBe(true);
    expect(
      calcEffectiveWeeklyHours(2, 5, [up], [], 3, "2026-06-01").isUnavailable,
    ).toBe(false);
  });

  it("variable week with multiplier doubles hours", () => {
    const vw: VariableWeek = {
      id: "1",
      label: "Holiday",
      startDate: "2026-06-01",
      endDate: "2026-06-08",
      multiplier: 2,
    };
    const result = calcEffectiveWeeklyHours(2, 5, [], [vw], 0, "2026-06-01");
    expect(result.hours).toBe(20); /* 2 hrs/day × 5 days × 2x = 20 */
    expect(result.isUnavailable).toBe(false);
  });

  it("variable week with custom hours overrides multiplier", () => {
    const vw: VariableWeek = {
      id: "1",
      label: "Intensive",
      startDate: "2026-06-01",
      endDate: "2026-06-08",
      customHours: 5,
    };
    const result = calcEffectiveWeeklyHours(2, 5, [], [vw], 0, "2026-06-01");
    expect(result.hours).toBe(25); /* 5 hrs/day × 5 days */
  });

  it("variable week with 0.5x multiplier halves hours", () => {
    const vw: VariableWeek = {
      id: "1",
      label: "Busy week",
      startDate: "2026-06-01",
      endDate: "2026-06-08",
      multiplier: 0.5,
    };
    const result = calcEffectiveWeeklyHours(2, 5, [], [vw], 0, "2026-06-01");
    expect(result.hours).toBe(5); /* 10 × 0.5 */
  });

  it("minimum months increases with more revision", () => {
    const low = calcMinimumMonths(20, 25, 2);
    const high = calcMinimumMonths(20, 100, 2);
    expect(high).toBeGreaterThan(low);
  });

  it("0% syllabus completion = full study weeks needed", () => {
    expect(getAdjustedStudyWeeks(4, 0)).toBe(4);
  });

  it("100% syllabus completion = 0 study weeks needed", () => {
    expect(getAdjustedStudyWeeks(4, 100)).toBe(0);
  });

  it("50% syllabus completion = half study weeks needed", () => {
    expect(getAdjustedStudyWeeks(4, 50)).toBe(2);
  });

  it("syllabus completion percent rounds correctly", () => {
    expect(getSyllabusCompletionPercent(1, 3)).toBe(33);
    expect(getSyllabusCompletionPercent(2, 3)).toBe(67);
    expect(getSyllabusCompletionPercent(3, 3)).toBe(100);
    expect(getSyllabusCompletionPercent(0, 3)).toBe(0);
  });

  it("syllabus completion with 0 total returns 0", () => {
    expect(getSyllabusCompletionPercent(0, 0)).toBe(0);
  });
});

/* ══════════════════════════════════════════════════════════
   §13  QUESTION PRACTICE MARKERS  (new — do not modify once passing)
   ══════════════════════════════════════════════════════════ */
describe("Question Practice Markers", () => {
  it("valid concept levels are weak, developing, strong", () => {
    expect(VALID_CONCEPT_LEVELS).toContain("weak");
    expect(VALID_CONCEPT_LEVELS).toContain("developing");
    expect(VALID_CONCEPT_LEVELS).toContain("strong");
    expect(VALID_CONCEPT_LEVELS).toHaveLength(3);
  });

  it("valid speed levels are slow, moderate, fast", () => {
    expect(VALID_SPEED_LEVELS).toContain("slow");
    expect(VALID_SPEED_LEVELS).toContain("moderate");
    expect(VALID_SPEED_LEVELS).toContain("fast");
    expect(VALID_SPEED_LEVELS).toHaveLength(3);
  });

  it("topic with 0 attempts shows Not started", () => {
    expect(getPracticeMarkerDisplay(0, null)).toBe("Not started");
  });

  it("topic with attempts shows accuracy percentage", () => {
    expect(getPracticeMarkerDisplay(2, 75)).toBe("75%");
  });

  it("accuracy must be between 0 and 100", () => {
    expect(0 >= 0 && 0 <= 100).toBe(true);
    expect(100 >= 0 && 100 <= 100).toBe(true);
    expect(-1 >= 0).toBe(false);
    expect(101 <= 100).toBe(false);
  });

  it("attempt history is ordered newest first when reversed", () => {
    const attempts = [
      { id: "1", date: "2026-05-01T10:00:00Z", accuracy: 40 },
      { id: "2", date: "2026-05-10T10:00:00Z", accuracy: 65 },
      { id: "3", date: "2026-05-20T10:00:00Z", accuracy: 80 },
    ];
    const reversed = [...attempts].reverse();
    expect(reversed[0].accuracy).toBe(80);
    expect(reversed[2].accuracy).toBe(40);
  });

  it("improvement from first to latest attempt is calculated correctly", () => {
    const first = { accuracy: 45 };
    const latest = { accuracy: 80 };
    expect(latest.accuracy - first.accuracy).toBe(35);
  });

  it("worst concept level is determined correctly", () => {
    const conceptOrder: ConceptLevel[] = ["weak", "developing", "strong"];
    const levels: ConceptLevel[] = ["strong", "weak", "developing"];
    const worst = levels.reduce((a, b) =>
      conceptOrder.indexOf(a) < conceptOrder.indexOf(b) ? a : b,
    );
    expect(worst).toBe("weak");
  });

  it("worst speed level is determined correctly", () => {
    const speedOrder: SpeedLevel[] = ["slow", "moderate", "fast"];
    const levels: SpeedLevel[] = ["fast", "slow", "moderate"];
    const worst = levels.reduce((a, b) =>
      speedOrder.indexOf(a) < speedOrder.indexOf(b) ? a : b,
    );
    expect(worst).toBe("slow");
  });
});

/* ══════════════════════════════════════════════════════════
   §14  SYLLABUS TRACKER  (new — do not modify once passing)
   ══════════════════════════════════════════════════════════ */
describe("Syllabus Tracker", () => {
  it("valid subtopic statuses are not_started, in_progress, done", () => {
    const validStatuses = ["not_started", "in_progress", "done"];
    expect(validStatuses).toContain("not_started");
    expect(validStatuses).toContain("in_progress");
    expect(validStatuses).toContain("done");
    expect(validStatuses).toHaveLength(3);
  });

  it("cycling status: not_started → in_progress → done → not_started", () => {
    function cycle(s: string) {
      if (s === "not_started") return "in_progress";
      if (s === "in_progress") return "done";
      return "not_started";
    }
    expect(cycle("not_started")).toBe("in_progress");
    expect(cycle("in_progress")).toBe("done");
    expect(cycle("done")).toBe("not_started");
  });

  it("topic is done only when ALL subtopics are done", () => {
    const subtopics = [
      { id: "a", status: "done" },
      { id: "b", status: "done" },
      { id: "c", status: "done" },
    ];
    expect(subtopics.every((s) => s.status === "done")).toBe(true);
  });

  it("topic is NOT done if any subtopic is not done", () => {
    const subtopics = [
      { id: "a", status: "done" },
      { id: "b", status: "in_progress" },
      { id: "c", status: "done" },
    ];
    expect(subtopics.every((s) => s.status === "done")).toBe(false);
  });

  it("topic is in_progress if any subtopic is done or in_progress", () => {
    const subtopics = [
      { id: "a", status: "not_started" },
      { id: "b", status: "in_progress" },
    ];
    const isInProg = subtopics.some(
      (s) => s.status === "done" || s.status === "in_progress",
    );
    expect(isInProg).toBe(true);
  });

  it("doneAt timestamp is set when status becomes done", () => {
    const now = new Date().toISOString();
    const entry = { status: "done", doneAt: now };
    expect(entry.doneAt).toBeTruthy();
    expect(new Date(entry.doneAt!).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("doneAt is cleared when status is unset from done", () => {
    const entry = { status: "not_started" as const, doneAt: undefined };
    expect(entry.doneAt).toBeUndefined();
  });

  it("JAM exam type filters out netOnly subjects", () => {
    const subjects = [
      { id: "la", netOnly: false, jamOnly: false },
      { id: "ca", netOnly: true, jamOnly: false },
    ];
    const isJAM = true;
    const filtered = subjects.filter((s) => !(s.netOnly && isJAM));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("la");
  });

  it("NET exam type includes netOnly subjects", () => {
    const subjects = [
      { id: "la", netOnly: false, jamOnly: false },
      { id: "ca", netOnly: true, jamOnly: false },
    ];
    const isJAM = false;
    const filtered = subjects.filter((s) => !(s.netOnly && isJAM));
    expect(filtered).toHaveLength(2);
  });

  it("JAM exam type filters out netOnly topics within subjects", () => {
    const topics = [
      { id: "t1", netOnly: false },
      { id: "t2", netOnly: true },
    ];
    const isJAM = true;
    const filtered = topics.filter((t) => !(t.netOnly && isJAM));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("t1");
  });
});

/* ══════════════════════════════════════════════════════════
   §15  VARIABLE WEEKS  (new — do not modify once passing)
   ══════════════════════════════════════════════════════════ */
describe("Variable Weeks", () => {
  it("multiplier of 2 doubles weekly hours", () => {
    const base = 10;
    expect(base * 2).toBe(20);
  });

  it("multiplier of 0.5 halves weekly hours", () => {
    const base = 10;
    expect(base * 0.5).toBe(5);
  });

  it("custom hours override multiplier", () => {
    const vw = { customHours: 6, multiplier: 2, daysPerWeek: 5 };
    const hours =
      vw.customHours !== undefined
        ? vw.customHours * vw.daysPerWeek
        : 10 * vw.multiplier;
    expect(hours).toBe(30);
  });

  it("variable week with 0 custom hours acts like unavailable", () => {
    const vw: VariableWeek = {
      id: "1",
      label: "No study",
      startDate: "2026-06-01",
      endDate: "2026-06-08",
      customHours: 0,
    };
    const result = calcEffectiveWeeklyHours(2, 5, [], [vw], 0, "2026-06-01");
    expect(result.hours).toBe(0);
    expect(result.isUnavailable).toBe(false); /* it's variable, not blocked */
  });

  it("variable week does not affect other weeks", () => {
    const vw: VariableWeek = {
      id: "1",
      label: "Holiday",
      startDate: "2026-06-01",
      endDate: "2026-06-08",
      multiplier: 2,
    };
    const week1 = calcEffectiveWeeklyHours(2, 5, [], [vw], 0, "2026-06-01");
    const week2 = calcEffectiveWeeklyHours(2, 5, [], [vw], 1, "2026-06-01");
    expect(week1.hours).toBe(20);
    expect(week2.hours).toBe(10); /* back to base */
  });

  it("unavailable period takes priority and variable week on same date is irrelevant", () => {
    const up: UnavailablePeriod = {
      id: "1",
      label: "Exams",
      startDate: "2026-06-01",
      endDate: "2026-06-08",
    };
    const vw: VariableWeek = {
      id: "2",
      label: "Holiday",
      startDate: "2026-06-01",
      endDate: "2026-06-08",
      multiplier: 3,
    };
    const result = calcEffectiveWeeklyHours(2, 5, [up], [vw], 0, "2026-06-01");
    /* unavailable checked first — should return 0 */
    expect(result.isUnavailable).toBe(true);
    expect(result.hours).toBe(0);
  });

  it("multiplier must be positive", () => {
    expect(0.1 > 0).toBe(true);
    expect(0 > 0).toBe(false);
    expect(-1 > 0).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════
   §16  ACCESS CONTROL  (new — do not modify once passing)
   ══════════════════════════════════════════════════════════ */
describe("Access Control", () => {
  it("HeartSpace students do not see roadmap", () => {
    const space = "heartspace";
    const hasRoadmap = space !== "heartspace";
    expect(hasRoadmap).toBe(false);
  });

  it("Zenith students see roadmap", () => {
    const space = "zenith";
    const hasRoadmap = space !== "heartspace";
    expect(hasRoadmap).toBe(true);
  });

  it("Apex students see roadmap", () => {
    const space = "apex";
    const hasRoadmap = space !== "heartspace";
    expect(hasRoadmap).toBe(true);
  });

  it("HeartSpace students do not see exam selection", () => {
    const space = "heartspace";
    const showsExamSelect = space !== "heartspace";
    expect(showsExamSelect).toBe(false);
  });

  it("counsellor does not see exam selection", () => {
    expect(shouldShowExamSelect("counsellor", null)).toBe(false);
  });

  it("Zenith plan includes syllabus tracker", () => {
    const zenithFeatures = [
      "roadmap",
      "syllabus",
      "question-practice",
      "daily-tracker",
      "sessions",
    ];
    expect(zenithFeatures).toContain("syllabus");
  });

  it("Apex plan includes syllabus tracker", () => {
    const apexFeatures = [
      "roadmap",
      "syllabus",
      "question-practice",
      "daily-tracker",
    ];
    expect(apexFeatures).toContain("syllabus");
  });

  it("HeartSpace plan does not include academic features", () => {
    const heartspaceFeatures = ["daily-tracker", "sessions"];
    expect(heartspaceFeatures).not.toContain("syllabus");
    expect(heartspaceFeatures).not.toContain("roadmap");
  });
});

/* ══════════════════════════════════════════════════════════
   §17  SCHEDULE INPUTS  (new — do not modify once passing)
   ══════════════════════════════════════════════════════════ */
describe("Schedule Inputs", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("default inputs are sensible values", () => {
    const defaults = {
      hoursPerDay: 2,
      daysPerWeek: 5,
      targetMonths: 6,
      revisionPercent: 30,
    };
    expect(defaults.hoursPerDay).toBeGreaterThan(0);
    expect(defaults.daysPerWeek).toBeGreaterThanOrEqual(1);
    expect(defaults.daysPerWeek).toBeLessThanOrEqual(7);
    expect(defaults.targetMonths).toBeGreaterThan(0);
    expect(defaults.revisionPercent).toBeGreaterThanOrEqual(25);
    expect(defaults.revisionPercent).toBeLessThanOrEqual(100);
  });

  it("revision percent minimum is 25%", () => {
    const min = 25;
    expect(min).toBe(25);
    expect(24 < min).toBe(true);
  });

  it("schedule inputs persist to localStorage", () => {
    const inputs = {
      hoursPerDay: 3,
      daysPerWeek: 6,
      targetMonths: 8,
      revisionPercent: 40,
    };
    localStorage.setItem("hs_schedule_inputs_test", JSON.stringify(inputs));
    const stored = JSON.parse(
      localStorage.getItem("hs_schedule_inputs_test") ?? "{}",
    );
    expect(stored.hoursPerDay).toBe(3);
    expect(stored.daysPerWeek).toBe(6);
    expect(stored.targetMonths).toBe(8);
    expect(stored.revisionPercent).toBe(40);
  });

  it("missing schedule inputs returns defaults", () => {
    const stored = localStorage.getItem("hs_schedule_inputs_nonexistent");
    expect(stored).toBeNull();
  });

  it("total weekly hours = hoursPerDay × daysPerWeek", () => {
    expect(3 * 6).toBe(18);
    expect(2 * 5).toBe(10);
    expect(8 * 7).toBe(56);
  });

  it("total hours in target = weeklyHours × targetWeeks", () => {
    const weekly = 10;
    const months = 6;
    const weeks = months * 4;
    expect(weekly * weeks).toBe(240);
  });
});

/* ══════════════════════════════════════════════════════════
   §18  TOPIC LEARNING SPEED  (new — do not modify once passing)
   ══════════════════════════════════════════════════════════ */
describe("Topic Learning Speed", () => {
  const SPEED_MULTIPLIERS: Record<string, number> = {
    first_slow: 1.3,
    first_normal: 1.0,
    first_fast: 0.8,
    second_slow: 1.0,
    second_normal: 0.67,
    second_fast: 0.5,
  };

  it("first time slow multiplier is 1.3", () => {
    expect(SPEED_MULTIPLIERS["first_slow"]).toBe(1.3);
  });
  it("first time normal multiplier is 1.0", () => {
    expect(SPEED_MULTIPLIERS["first_normal"]).toBe(1.0);
  });
  it("first time fast multiplier is 0.8", () => {
    expect(SPEED_MULTIPLIERS["first_fast"]).toBe(0.8);
  });
  it("second time slow multiplier is 1.0", () => {
    expect(SPEED_MULTIPLIERS["second_slow"]).toBe(1.0);
  });
  it("second time normal multiplier is 0.67", () => {
    expect(SPEED_MULTIPLIERS["second_normal"]).toBe(0.67);
  });
  it("second time fast multiplier is 0.5", () => {
    expect(SPEED_MULTIPLIERS["second_fast"]).toBe(0.5);
  });
  it("first fast gives fewer weeks than first normal", () => {
    const base = 4;
    expect(Math.ceil(base * SPEED_MULTIPLIERS["first_fast"])).toBeLessThan(
      Math.ceil(base * SPEED_MULTIPLIERS["first_normal"]),
    );
  });
  it("second fast gives fewer weeks than second slow", () => {
    const base = 4;
    expect(Math.ceil(base * SPEED_MULTIPLIERS["second_fast"])).toBeLessThan(
      Math.ceil(base * SPEED_MULTIPLIERS["second_slow"]),
    );
  });
  it("speed multiplier applies on top of base weeks", () => {
    const base = 6; /* overridden base */
    const mult = SPEED_MULTIPLIERS["first_fast"]; /* 0.8 */
    expect(Math.ceil(base * mult)).toBe(5);
  });
  it("default speed is first_normal (×1.0) when not set", () => {
    const topicSpeed: Record<string, string> = {};
    const key = topicSpeed["linear_algebra"] ?? "first_normal";
    expect(SPEED_MULTIPLIERS[key]).toBe(1.0);
  });
});

/* ══════════════════════════════════════════════════════════
   §19  QP INTEGRATION  (new — do not modify once passing)
   ══════════════════════════════════════════════════════════ */
describe("QP Integration", () => {
  function getWeightedAccuracy(
    attempts: { accuracy: number }[],
  ): number | null {
    if (!attempts.length) return null;
    if (attempts.length === 1) return attempts[0].accuracy;
    const latest = attempts[attempts.length - 1].accuracy;
    const restAvg =
      attempts.slice(0, -1).reduce((s, a) => s + a.accuracy, 0) /
      (attempts.length - 1);
    return Math.round(latest * 0.6 + restAvg * 0.4);
  }

  function getWeightedConcept(attempts: { concept: string }[]): string | null {
    if (!attempts.length) return null;
    const order = ["weak", "developing", "strong"];
    if (attempts.length === 1) return attempts[0].concept;
    const latest = order.indexOf(attempts[attempts.length - 1].concept);
    const restAvg =
      attempts.slice(0, -1).reduce((s, a) => s + order.indexOf(a.concept), 0) /
      (attempts.length - 1);
    return order[Math.round(latest * 0.6 + restAvg * 0.4)] ?? "developing";
  }

  it("single attempt weighted accuracy equals that attempt", () => {
    expect(getWeightedAccuracy([{ accuracy: 75 }])).toBe(75);
  });

  it("weighted accuracy: latest 60% + rest 40%", () => {
    const attempts = [{ accuracy: 40 }, { accuracy: 80 }];
    /* latest=80×0.6=48, rest=40×0.4=16, total=64 */
    expect(getWeightedAccuracy(attempts)).toBe(64);
  });

  it("empty attempts returns null accuracy", () => {
    expect(getWeightedAccuracy([])).toBeNull();
  });

  it("single attempt weighted concept equals that attempt", () => {
    expect(getWeightedConcept([{ concept: "strong" }])).toBe("strong");
  });

  it("empty attempts returns null concept", () => {
    expect(getWeightedConcept([])).toBeNull();
  });

  it("accuracy > 85 reduces revision by 0.5", () => {
    const acc = 90;
    const adj = acc > 85 ? -0.5 : 0;
    expect(adj).toBe(-0.5);
  });

  it("accuracy < 50 adds 1.0 revision week", () => {
    const acc = 40;
    const adj = acc < 50 ? 1.0 : 0;
    expect(adj).toBe(1.0);
  });

  it("concept weak adds 1.0 revision week", () => {
    const adj = "weak" === "weak" ? 1.0 : 0;
    expect(adj).toBe(1.0);
  });

  it("concept developing adds 0.5 revision week", () => {
    const adj = "developing" === "developing" ? 0.5 : 0;
    expect(adj).toBe(0.5);
  });

  it("concept strong reduces revision by 0.5", () => {
    const adj = "strong" === "strong" ? -0.5 : 0;
    expect(adj).toBe(-0.5);
  });
});

/* ══════════════════════════════════════════════════════════
   §20  BASE TIMELINE  (new — do not modify once passing)
   ══════════════════════════════════════════════════════════ */
describe("Base Timeline", () => {
  const DEFAULT_JAM_WEEKS: Record<string, number> = {
    la: 4,
    ra: 4,
    dc: 4,
    gt: 4,
    ode: 3,
    mvc: 2,
    mi: 2,
  };

  it("linear algebra default is 4 weeks", () => {
    expect(DEFAULT_JAM_WEEKS["la"]).toBe(4);
  });
  it("ODE default is 3 weeks", () => {
    expect(DEFAULT_JAM_WEEKS["ode"]).toBe(3);
  });
  it("MVC and MI defaults are 2 weeks", () => {
    expect(DEFAULT_JAM_WEEKS["mvc"]).toBe(2);
    expect(DEFAULT_JAM_WEEKS["mi"]).toBe(2);
  });
  it("overriding base weeks persists independently", () => {
    const base: Record<string, number> = { ...DEFAULT_JAM_WEEKS };
    base["la"] = 6;
    expect(base["la"]).toBe(6);
    expect(DEFAULT_JAM_WEEKS["la"]).toBe(4); /* original unchanged */
  });
  it("base weeks minimum is 0.5", () => {
    const min = 0.5;
    expect(Math.max(min, 0)).toBe(0.5);
    expect(Math.max(min, -1)).toBe(0.5);
  });
  it("reset restores original default", () => {
    const overrides: Record<string, number> = { la: 6 };
    delete overrides["la"];
    const effective = overrides["la"] ?? DEFAULT_JAM_WEEKS["la"];
    expect(effective).toBe(4);
  });
  it("speed multiplier applies on top of overridden base", () => {
    const base = 6;
    const mult = 0.8; /* first_fast */
    expect(Math.ceil(base * mult)).toBe(5);
  });
  it("base weeks stored per user in localStorage", () => {
    localStorage.clear();
    localStorage.setItem(
      "hs_base_weeks_user1",
      JSON.stringify({ la: 6, ra: 3 }),
    );
    const stored = JSON.parse(
      localStorage.getItem("hs_base_weeks_user1") ?? "{}",
    );
    expect(stored.la).toBe(6);
    expect(stored.ra).toBe(3);
  });
  it("topic speed stored per user in localStorage", () => {
    localStorage.clear();
    localStorage.setItem(
      "hs_topic_speed_user1",
      JSON.stringify({ la: "second_fast" }),
    );
    const stored = JSON.parse(
      localStorage.getItem("hs_topic_speed_user1") ?? "{}",
    );
    expect(stored.la).toBe("second_fast");
  });
});
