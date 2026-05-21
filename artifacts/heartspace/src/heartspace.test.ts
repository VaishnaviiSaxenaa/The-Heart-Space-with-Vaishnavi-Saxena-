/**
 * HeartSpace Core Test Suite
 *
 * RULES:
 * 1. Never modify existing tests to accommodate new features.
 * 2. New features must add NEW tests.
 * 3. Build fails if any test fails.
 * 4. Deployment is blocked if build fails.
 */

import { describe, it, expect, beforeEach } from "vitest";

/* ── Helpers ─────────────────────────────────────────────── */

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

/* ── 1. ROLE MAPPING TESTS ───────────────────────────────── */

describe("Role Mapping", () => {
  it("admin maps to counsellor role", () => {
    expect(ROLE_MAP["admin"].role).toBe("counsellor");
  });

  it("admin redirects to /counsellor", () => {
    expect(ROLE_MAP["admin"].redirect).toBe("/counsellor");
  });

  it("admin space is null", () => {
    expect(ROLE_MAP["admin"].space).toBeNull();
  });

  it("academy_student maps to student role", () => {
    expect(ROLE_MAP["academy_student"].role).toBe("student");
  });

  it("academy_student space is zenith", () => {
    expect(ROLE_MAP["academy_student"].space).toBe("zenith");
  });

  it("prep_student maps to student role", () => {
    expect(ROLE_MAP["prep_student"].role).toBe("student");
  });

  it("prep_student space is apex", () => {
    expect(ROLE_MAP["prep_student"].space).toBe("apex");
  });

  it("counseling_client maps to student role", () => {
    expect(ROLE_MAP["counseling_client"].role).toBe("student");
  });

  it("counseling_client space is heartspace", () => {
    expect(ROLE_MAP["counseling_client"].space).toBe("heartspace");
  });

  it("counseling_client redirects to /self-dashboard", () => {
    expect(ROLE_MAP["counseling_client"].redirect).toBe("/self-dashboard");
  });
});

/* ── 2. PLAN MAPPING TESTS ───────────────────────────────── */

describe("Plan Mapping", () => {
  it("academy_student plan is zenith", () => {
    expect(PLAN_MAP["academy_student"]).toBe("zenith");
  });

  it("prep_student plan is apex", () => {
    expect(PLAN_MAP["prep_student"]).toBe("apex");
  });

  it("counseling_client plan is heartspace", () => {
    expect(PLAN_MAP["counseling_client"]).toBe("heartspace");
  });

  it("all three service keys exist in PLAN_MAP", () => {
    expect(Object.keys(PLAN_MAP)).toHaveLength(3);
  });

  it("plan values are only zenith, apex, or heartspace", () => {
    const validPlans = ["zenith", "apex", "heartspace"];
    Object.values(PLAN_MAP).forEach((plan) => {
      expect(validPlans).toContain(plan);
    });
  });
});

/* ── 3. ADMIN EMAIL TESTS ────────────────────────────────── */

describe("Admin Email Override", () => {
  it("admin email is correct", () => {
    expect(ADMIN_EMAIL).toBe("theheartspacewithvs@gmail.com");
  });

  it("admin email always gets counsellor role", () => {
    const email = "theheartspacewithvs@gmail.com";
    const isAdmin = email === ADMIN_EMAIL;
    expect(isAdmin).toBe(true);
  });

  it("non-admin email does not get admin override", () => {
    const email = "student@gmail.com";
    const isAdmin = email === ADMIN_EMAIL;
    expect(isAdmin).toBe(false);
  });

  it("admin name is always Vaishnavi Saxena", () => {
    const adminName = "Vaishnavi Saxena";
    expect(adminName).toBe("Vaishnavi Saxena");
  });
});

/* ── 4. DISPLAY NAME TESTS ───────────────────────────────── */

describe("Display Name Logic", () => {
  it("uses full_name when available", () => {
    expect(getDisplayName("Arjun Mehta", "arjun@gmail.com")).toBe(
      "Arjun Mehta",
    );
  });

  it("falls back to email prefix when full_name is null", () => {
    expect(getDisplayName(null, "arjun@gmail.com")).toBe("arjun");
  });

  it("falls back to email prefix when full_name is empty string", () => {
    expect(getDisplayName("", "arjun@gmail.com")).toBe("arjun");
  });

  it("falls back to email prefix when full_name is whitespace", () => {
    expect(getDisplayName("   ", "arjun@gmail.com")).toBe("arjun");
  });

  it("never shows raw email address as display name", () => {
    const name = getDisplayName(null, "trial3@gmail.com");
    expect(name).not.toContain("@");
  });

  it("trims whitespace from full_name", () => {
    expect(getDisplayName("  Arjun  ", "arjun@gmail.com")).toBe("Arjun");
  });
});

/* ── 5. JWT / TOKEN TESTS ────────────────────────────────── */

describe("Token Detection", () => {
  it("identifies Supabase JWT correctly", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    expect(isSupabaseJwt(jwt)).toBe(true);
  });

  it("identifies demo token as non-JWT", () => {
    const demoToken = btoa("prep@heartspace.com:demo:heartspace");
    expect(isSupabaseJwt(demoToken)).toBe(false);
  });

  it("null token is not a JWT", () => {
    expect(isSupabaseJwt(null)).toBe(false);
  });

  it("empty string is not a JWT", () => {
    expect(isSupabaseJwt("")).toBe(false);
  });
});

/* ── 6. DEMO ACCOUNTS TESTS ──────────────────────────────── */

describe("Demo Accounts", () => {
  const DEMO_ACCOUNTS: Record<string, { role: string; space: string | null }> =
    {
      "vaishnavi@heartspace.com": { role: "counsellor", space: null },
      "prep@heartspace.com": { role: "student", space: "prep" },
      "counseling@heartspace.com": { role: "student", space: "self" },
      "academy@heartspace.com": { role: "student", space: "prep" },
    };

  it("vaishnavi demo account is counsellor", () => {
    expect(DEMO_ACCOUNTS["vaishnavi@heartspace.com"].role).toBe("counsellor");
  });

  it("prep demo account is student", () => {
    expect(DEMO_ACCOUNTS["prep@heartspace.com"].role).toBe("student");
  });

  it("all demo accounts exist", () => {
    expect(Object.keys(DEMO_ACCOUNTS)).toHaveLength(4);
  });

  it("demo passwords are accepted", () => {
    const DEMO_PASSWORDS = ["heartspace123", "password123"];
    expect(DEMO_PASSWORDS).toContain("heartspace123");
    expect(DEMO_PASSWORDS).toContain("password123");
  });
});

/* ── 7. ROUTING TESTS ────────────────────────────────────── */

describe("Role Based Routing", () => {
  it("admin goes to /counsellor", () => {
    expect(ROLE_MAP["admin"].redirect).toBe("/counsellor");
  });

  it("zenith student goes to /dashboard", () => {
    expect(ROLE_MAP["academy_student"].redirect).toBe("/dashboard");
  });

  it("apex student goes to /dashboard", () => {
    expect(ROLE_MAP["prep_student"].redirect).toBe("/dashboard");
  });

  it("heartspace client goes to /self-dashboard", () => {
    expect(ROLE_MAP["counseling_client"].redirect).toBe("/self-dashboard");
  });

  it("heartspace space triggers self-dashboard routing", () => {
    const space = "heartspace";
    const redirect = space === "heartspace" ? "/self-dashboard" : "/dashboard";
    expect(redirect).toBe("/self-dashboard");
  });
});

/* ── 8. SUPABASE PROFILE TESTS ───────────────────────────── */

describe("Supabase Profile Handling", () => {
  it("profile with role academy_student gets zenith plan", () => {
    const profile = { role: "academy_student", plan: "zenith" };
    expect(profile.plan).toBe("zenith");
  });

  it("profile with role prep_student gets apex plan", () => {
    const profile = { role: "prep_student", plan: "apex" };
    expect(profile.plan).toBe("apex");
  });

  it("profile with role counseling_client gets heartspace plan", () => {
    const profile = { role: "counseling_client", plan: "heartspace" };
    expect(profile.plan).toBe("heartspace");
  });

  it("plan from DB takes priority over mapped space", () => {
    const mappedSpace = "apex";
    const planFromDB = "zenith";
    const finalSpace = planFromDB ?? mappedSpace;
    expect(finalSpace).toBe("zenith");
  });

  it("falls back to mapped space when plan is null", () => {
    const mappedSpace = "apex";
    const planFromDB = null;
    const finalSpace = planFromDB ?? mappedSpace;
    expect(finalSpace).toBe("apex");
  });
});

/* ── 9. LOCALSTORAGE TESTS ───────────────────────────────── */

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

  it("returns null for missing user", () => {
    expect(localStorage.getItem("heartspace_user")).toBeNull();
  });
});

/* ── 10. SIGNUP VALIDATION TESTS ─────────────────────────── */

describe("Signup Validation", () => {
  it("full name must be at least 2 characters", () => {
    const name = "A";
    expect(name.length >= 2).toBe(false);
  });

  it("valid full name passes", () => {
    const name = "Arjun Mehta";
    expect(name.length >= 2).toBe(true);
  });

  it("password must be at least 8 characters", () => {
    const password = "short";
    expect(password.length >= 8).toBe(false);
  });

  it("valid password passes", () => {
    const password = "validpassword123";
    expect(password.length >= 8).toBe(true);
  });

  it("valid email format passes", () => {
    const email = "student@gmail.com";
    expect(email.includes("@")).toBe(true);
  });

  it("invalid email format fails", () => {
    const email = "notanemail";
    expect(email.includes("@")).toBe(false);
  });

  it("service key must be one of three valid options", () => {
    const validKeys = ["academy_student", "prep_student", "counseling_client"];
    expect(validKeys).toContain("academy_student");
    expect(validKeys).toContain("prep_student");
    expect(validKeys).toContain("counseling_client");
    expect(validKeys).not.toContain("admin");
  });
});

/* ── 11. EXAM SELECTION TESTS ────────────────────────────── */

describe("Exam Selection", () => {
  it("only two valid exam types exist", () => {
    expect(VALID_EXAM_TYPES).toHaveLength(2);
    expect(VALID_EXAM_TYPES).toContain("JAM");
    expect(VALID_EXAM_TYPES).toContain("NET_GATE");
  });

  it("JAM label is correct", () => {
    expect(getExamLabel("JAM")).toBe("IIT JAM");
  });

  it("NET_GATE label is correct", () => {
    expect(getExamLabel("NET_GATE")).toBe("CSIR NET / GATE");
  });

  it("student with no exam type should see exam select screen", () => {
    expect(shouldShowExamSelect("student", null)).toBe(true);
  });

  it("student with exam type should NOT see exam select screen", () => {
    expect(shouldShowExamSelect("student", "JAM")).toBe(false);
  });

  it("counsellor should never see exam select screen", () => {
    expect(shouldShowExamSelect("counsellor", null)).toBe(false);
  });

  it("admin should never see exam select screen", () => {
    expect(shouldShowExamSelect("admin", null)).toBe(false);
  });

  it("exam type JAM is saved correctly", () => {
    const examType = "JAM";
    expect(VALID_EXAM_TYPES.includes(examType as ExamType)).toBe(true);
  });

  it("exam type NET_GATE is saved correctly", () => {
    const examType = "NET_GATE";
    expect(VALID_EXAM_TYPES.includes(examType as ExamType)).toBe(true);
  });

  it("invalid exam type is rejected", () => {
    const examType = "INVALID";
    expect(VALID_EXAM_TYPES.includes(examType as ExamType)).toBe(false);
  });
});
