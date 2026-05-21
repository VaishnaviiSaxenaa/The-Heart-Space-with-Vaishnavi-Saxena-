import "@testing-library/jest-dom";

/* Mock localStorage */
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

/* Mock Supabase */
vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      resetPasswordForEmail: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnValue({
        then: (cb: any) => Promise.resolve(cb({ data: null, error: null })),
      }),
      order: vi.fn().mockReturnThis(),
    }),
  },
  ROLE_MAP: {
    admin: { role: "counsellor", space: null, redirect: "/counsellor" },
    academy_student: {
      role: "student",
      space: "zenith",
      redirect: "/dashboard",
    },
    prep_student: { role: "student", space: "apex", redirect: "/dashboard" },
    counseling_client: {
      role: "student",
      space: "heartspace",
      redirect: "/self-dashboard",
    },
  },
  SERVICE_INFO: {
    admin: {
      name: "Admin",
      color: "#3D2314",
      tagline: "HeartSpace Administration",
    },
    academy_student: {
      name: "Zenith",
      color: "#C9A96E",
      tagline: "Full mentorship + counsellor support",
    },
    prep_student: {
      name: "Apex+",
      color: "#3D2314",
      tagline: "Academic tracking + AI guidance",
    },
    counseling_client: {
      name: "HeartSpace",
      color: "#D4A5A5",
      tagline: "Personal counselling + emotional support",
    },
  },
}));
