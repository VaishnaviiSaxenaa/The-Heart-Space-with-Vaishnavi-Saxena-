import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
)

export type SupabaseRole = 'admin' | 'prep_student' | 'counseling_client' | 'academy_student'

export interface Profile {
  id: string
  full_name: string | null
  role: SupabaseRole
  avatar_url: string | null
}

export const ROLE_MAP: Record<SupabaseRole, { role: 'student' | 'counsellor'; space: 'prep' | 'self' | null; redirect: string }> = {
  admin:             { role: 'counsellor', space: null,   redirect: '/counsellor'     },
  prep_student:      { role: 'student',    space: 'prep', redirect: '/dashboard'      },
  counseling_client: { role: 'student',    space: 'self', redirect: '/self-dashboard' },
  academy_student:   { role: 'student',    space: 'prep', redirect: '/dashboard'      },
}
