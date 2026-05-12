const BASE = "/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("heartspace_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options?.headers as Record<string, string> ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

/* ── Types ────────────────────────────────── */
export interface SyllabusTopic {
  id: number; userId: number; subject: string; topic: string;
  status: "not_started" | "theory_in_progress" | "theory_done" | "practicing" | "mastered";
  confidence: number; dailyRevision: boolean; weeklyRevision: boolean;
  createdAt: string; updatedAt: string;
}

export interface Assignment {
  id: number; userId: number; subject: string; topic: string; date: string;
  questionsAttempted: number; questionsCorrect: number;
  approach: "confused" | "partial" | "clear" | "strong";
  speed: "slow" | "moderate" | "fast" | "exam_ready";
  createdAt: string;
}

export interface DailyEntry {
  id: number; userId: number; date: string;
  sleepHours: number | null; sleepQuality: number | null;
  physicalActivity: boolean | null; studyHours: number | null;
  meTimeMinutes: number | null; stressLevel: number | null;
  emotionalState: string | null; note: string | null;
  createdAt: string;
}

export interface SessionNote {
  id: number; counsellorId: number; studentId: number; sessionId: number | null;
  type: "session_note" | "intervention"; content: string; visibleToStudent: boolean;
  createdAt: string;
}

export interface StudentDetail {
  student: { id: number; name: string; email: string; role: string; space: string | null; avatarUrl: string | null; createdAt: string };
  moods: { id: number; mood: number; note: string | null; createdAt: string }[];
  dailyTracker: DailyEntry[];
  sessions: { id: number; scheduledAt: string; status: string; topic: string | null; notes: string | null }[];
  notes: SessionNote[];
  syllabusTopics: SyllabusTopic[];
  assignments: Assignment[];
  riskFlag: boolean;
}

export interface StudentOverviewItem {
  student: { id: number; name: string; email: string; role: string; space: string | null; avatarUrl: string | null; createdAt: string };
  totalSessions: number; lastSession: string | null;
  latestMood: number | null; moodAvg: number | null; sleepAvg: number | null;
  riskFlag: boolean;
  upcomingSession: any | null;
}

/* ── Syllabus ─────────────────────────────── */
export const fetchSyllabus = (userId: number) =>
  apiFetch<SyllabusTopic[]>(`/syllabus?userId=${userId}`);

export const createTopic = (data: Omit<SyllabusTopic, "id" | "createdAt" | "updatedAt">) =>
  apiFetch<SyllabusTopic>("/syllabus", { method: "POST", body: JSON.stringify(data) });

export const updateTopic = (id: number, data: Partial<Pick<SyllabusTopic, "status" | "confidence" | "dailyRevision" | "weeklyRevision">>) =>
  apiFetch<SyllabusTopic>(`/syllabus/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteTopic = (id: number) =>
  apiFetch<{ success: boolean }>(`/syllabus/${id}`, { method: "DELETE" });

/* ── Assignments ──────────────────────────── */
export const fetchAssignments = (userId: number, limit?: number) =>
  apiFetch<Assignment[]>(`/assignments?userId=${userId}${limit ? `&limit=${limit}` : ""}`);

export const createAssignment = (data: Omit<Assignment, "id" | "createdAt">) =>
  apiFetch<Assignment>("/assignments", { method: "POST", body: JSON.stringify(data) });

export const deleteAssignment = (id: number) =>
  apiFetch<{ success: boolean }>(`/assignments/${id}`, { method: "DELETE" });

/* ── Daily Tracker ────────────────────────── */
export const fetchDailyTracker = (userId: number, limit?: number) =>
  apiFetch<DailyEntry[]>(`/daily-tracker?userId=${userId}${limit ? `&limit=${limit}` : ""}`);

export const fetchTodayEntry = (userId: number) =>
  apiFetch<DailyEntry | null>(`/daily-tracker/today?userId=${userId}`);

export const upsertDailyEntry = (data: Partial<DailyEntry> & { userId: number; date: string }) =>
  apiFetch<DailyEntry>("/daily-tracker", { method: "POST", body: JSON.stringify(data) });

/* ── Notes ────────────────────────────────── */
export const fetchNotes = (params: { studentId?: number; counsellorId?: number; type?: string }) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
  return apiFetch<SessionNote[]>(`/notes?${qs}`);
};

export const createNote = (data: Omit<SessionNote, "id" | "createdAt">) =>
  apiFetch<SessionNote>("/notes", { method: "POST", body: JSON.stringify(data) });

export const updateNote = (id: number, data: { content?: string; visibleToStudent?: boolean }) =>
  apiFetch<SessionNote>(`/notes/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteNote = (id: number) =>
  apiFetch<{ success: boolean }>(`/notes/${id}`, { method: "DELETE" });

/* ── Student Detail ───────────────────────── */
export const fetchStudentDetail = (studentId: number) =>
  apiFetch<StudentDetail>(`/student-detail/${studentId}`);

/* ── AI Summary ───────────────────────────── */
export const fetchAiSummary = (studentId: number) =>
  apiFetch<{ summary: string; aiGenerated: boolean }>(`/ai-summary/${studentId}`);
