import { supabase } from "./supabase";

/* ── Generic upsert/fetch for any table ── */
async function sbGet(table: string, userId: string): Promise<unknown | null> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select("data")
      .eq("user_id", userId)
      .single();
    if (error || !data) return null;
    return data.data;
  } catch {
    return null;
  }
}

async function sbSet(
  table: string,
  userId: string,
  value: unknown,
): Promise<void> {
  try {
    await supabase
      .from(table)
      .upsert(
        { user_id: userId, data: value, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
  } catch {
    /* silent fail — localStorage is fallback */
  }
}

/* ── Syllabus Progress ── */
export async function loadSyllabusFromDB(
  userId: string,
): Promise<unknown | null> {
  return sbGet("syllabus_progress", userId);
}
export async function saveSyllabusToDB(
  userId: string,
  data: unknown,
): Promise<void> {
  return sbSet("syllabus_progress", userId, data);
}

/* ── Practice Progress ── */
export async function loadPracticeFromDB(
  userId: string,
): Promise<unknown | null> {
  return sbGet("practice_progress", userId);
}
export async function savePracticeToDB(
  userId: string,
  data: unknown,
): Promise<void> {
  return sbSet("practice_progress", userId, data);
}

/* ── Roadmap Data ── */
export async function loadRoadmapFromDB(
  userId: string,
): Promise<unknown | null> {
  return sbGet("roadmap_data", userId);
}
export async function saveRoadmapToDB(
  userId: string,
  data: unknown,
): Promise<void> {
  return sbSet("roadmap_data", userId, data);
}

/* ── Schedule Inputs ── */
export async function loadScheduleInputsFromDB(
  userId: string,
): Promise<unknown | null> {
  return sbGet("schedule_inputs", userId);
}
export async function saveScheduleInputsToDB(
  userId: string,
  data: unknown,
): Promise<void> {
  return sbSet("schedule_inputs", userId, data);
}

/* ── Topic Speed ── */
export async function loadTopicSpeedFromDB(
  userId: string,
): Promise<unknown | null> {
  return sbGet("topic_speed", userId);
}
export async function saveTopicSpeedToDB(
  userId: string,
  data: unknown,
): Promise<void> {
  return sbSet("topic_speed", userId, data);
}

/* ── Subject Order ── */
export async function loadSubjectOrderFromDB(
  userId: string,
): Promise<unknown | null> {
  return sbGet("subject_order", userId);
}
export async function saveSubjectOrderToDB(
  userId: string,
  data: unknown,
): Promise<void> {
  return sbSet("subject_order", userId, data);
}

/* ── Study Periods ── */
export async function loadStudyPeriodsFromDB(
  userId: string,
): Promise<unknown | null> {
  return sbGet("study_periods", userId);
}
export async function saveStudyPeriodsToDB(
  userId: string,
  data: unknown,
): Promise<void> {
  return sbSet("study_periods", userId, data);
}

/* ── Base Weeks ── */
export async function loadBaseWeeksFromDB(
  userId: string,
): Promise<unknown | null> {
  return sbGet("base_weeks", userId);
}
export async function saveBaseWeeksToDB(
  userId: string,
  data: unknown,
): Promise<void> {
  return sbSet("base_weeks", userId, data);
}

/* ── Sessions ── */
export async function loadSessionsFromDB(userId: string): Promise<unknown | null> {
  return sbGet("sessions_data", userId);
}
export async function saveSessionsToDB(userId: string, data: unknown): Promise<void> {
  return sbSet("sessions_data", userId, data);
}

/* ── Daily Tracker ── */
export async function loadDailyFromDB(userId: string): Promise<unknown | null> {
  return sbGet("daily_tracker", userId);
}
export async function saveDailyToDB(userId: string, data: unknown): Promise<void> {
  return sbSet("daily_tracker", userId, data);
}

/* ── Sync all data on login ──
   Call this once when user logs in.
   Pulls from Supabase → updates localStorage.
   localStorage is then used for fast reads. */
export async function syncAllFromDB(userId: string): Promise<void> {
  const tables = [
    { table: "syllabus_progress", lsKey: `hs_syllabus_${userId}` },
    { table: "practice_progress", lsKey: `hs_practice_${userId}` },
    { table: "roadmap_data", lsKey: `hs_roadmap_${userId}` },
    { table: "schedule_inputs", lsKey: `hs_schedule_inputs_${userId}` },
    { table: "topic_speed", lsKey: `hs_topic_speed_${userId}` },
    { table: "subject_order", lsKey: `hs_subject_order_${userId}` },
    { table: "study_periods", lsKey: `hs_study_periods_${userId}` },
    { table: "base_weeks", lsKey: `hs_base_weeks_${userId}` },
  ];

  await Promise.all(
    tables.map(async ({ table, lsKey }) => {
      const data = await sbGet(table, userId);
      if (data !== null) {
        try {
          localStorage.setItem(lsKey, JSON.stringify(data));
        } catch {}
      }
    }),
  );
}

/* ── Push all localStorage data to Supabase ──
   Call once on first login to migrate existing data. */
export async function pushAllToDB(userId: string): Promise<void> {
  const tables = [
    { table: "syllabus_progress", lsKey: `hs_syllabus_${userId}` },
    { table: "practice_progress", lsKey: `hs_practice_${userId}` },
    { table: "roadmap_data", lsKey: `hs_roadmap_${userId}` },
    { table: "schedule_inputs", lsKey: `hs_schedule_inputs_${userId}` },
    { table: "topic_speed", lsKey: `hs_topic_speed_${userId}` },
    { table: "subject_order", lsKey: `hs_subject_order_${userId}` },
    { table: "study_periods", lsKey: `hs_study_periods_${userId}` },
    { table: "base_weeks", lsKey: `hs_base_weeks_${userId}` },
  ];

  await Promise.all(
    tables.map(async ({ table, lsKey }) => {
      try {
        const raw = localStorage.getItem(lsKey);
        if (raw) await sbSet(table, userId, JSON.parse(raw));
      } catch {}
    }),
  );
}
