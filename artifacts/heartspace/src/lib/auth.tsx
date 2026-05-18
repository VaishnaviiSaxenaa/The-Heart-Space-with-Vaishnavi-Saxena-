import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);

export type SupabaseRole =
  | "admin"
  | "prep_student"
  | "counseling_client"
  | "academy_student";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: SupabaseRole;
  plan: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export const SERVICE_INFO: Record<
  SupabaseRole,
  { name: string; color: string; tagline: string }
> = {
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
};

export const ROLE_MAP: Record<
  SupabaseRole,
  {
    role: "student" | "counsellor";
    space: "zenith" | "apex" | "heartspace" | null;
    redirect: string;
  }
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
