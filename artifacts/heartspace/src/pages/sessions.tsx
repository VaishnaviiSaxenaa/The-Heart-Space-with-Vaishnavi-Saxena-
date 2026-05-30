import { useState, useEffect } from "react";
import { saveSessionsToDB } from "../lib/supabase-sync";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { format } from "date-fns";
import { Calendar, CheckCircle2, Clock, User, Star } from "lucide-react";

const CREAM = "#FAF7F2";
const CHARCOAL = "#2C1810";
const GOLD = "#C9A96E";
const DARK = "#3D2314";
const CARD = "#FFFFFF";
const MUTED = "#8C7B70";
const BORDER = "#E8DDD0";
const OLIVE = "#6E8B6B";

/* ─── Types ── */
type SessionStatus =
  | "requested"
  | "confirmed"
  | "approved"
  | "done"
  | "missed"
  | "rescheduled";

interface SagarSession {
  id: string;
  concern: string;
  concernUpdatedAt: string;
  requestedAt: string;
  status: SessionStatus;
  scheduledDate?: string;
  callMessage?: string /* message Vaishnavi writes after approving */;
  doneAt?: string /* when student ticked done */;
  notes?: string;
}

interface VaishnaviNote {
  concern: string;
  updatedAt: string;
}

/* ─── localStorage helpers ── */
function lsKey(uid: string, type: string) {
  return `hs_${type}_${uid}`;
}

function loadSagarSessions(uid: string): SagarSession[] {
  try {
    const r = localStorage.getItem(lsKey(uid, "sagar_sessions"));
    return r ? JSON.parse(r) : [];
  } catch {
    return [];
  }
}
function saveSagarSessions(uid: string, list: SagarSession[]) {
  localStorage.setItem(lsKey(uid, "sagar_sessions"), JSON.stringify(list));
  saveSessionsToDB(uid, list).catch(() => {});
}
function loadVaishnaviNote(uid: string): VaishnaviNote | null {
  try {
    const r = localStorage.getItem(lsKey(uid, "vaishnavi_note"));
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}
function saveVaishnaviNote(uid: string, note: VaishnaviNote) {
  localStorage.setItem(lsKey(uid, "vaishnavi_note"), JSON.stringify(note));
}

/* ─── Counsellor Sessions Page ── */
interface StudentSession {
  studentId: string;
  studentName: string;
  session: SagarSession;
}

function CounsellorSessionsPage() {
  const [allSessions, setAllSessions] = useState<StudentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"requested" | "approved" | "done">(
    "requested",
  );
  const [msgInputs, setMsgInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .neq("role", "admin")
      .then(async ({ data: students }) => {
        if (!students) {
          setLoading(false);
          return;
        }
        const all: StudentSession[] = [];
        await Promise.all(
          students.map(async (s) => {
            const { data: sd } = await supabase
              .from("sessions_data")
              .select("data")
              .eq("user_id", s.id)
              .single();
            if (sd?.data) {
              const sessions = sd.data as SagarSession[];
              sessions.forEach((session) => {
                all.push({
                  studentId: s.id,
                  studentName:
                    s.full_name || s.email?.split("@")[0] || "Student",
                  session,
                });
              });
            }
          }),
        );
        all.sort((a, b) =>
          b.session.requestedAt.localeCompare(a.session.requestedAt),
        );
        setAllSessions(all);
        setLoading(false);
      });
  }, []);

  async function approveSession(studentId: string, sessionId: string) {
    const msg = msgInputs[sessionId]?.trim();
    if (!msg) {
      alert("Please write a call time message first!");
      return;
    }
    setSaving(sessionId);
    const { data: sd } = await supabase
      .from("sessions_data")
      .select("data")
      .eq("user_id", studentId)
      .single();
    if (sd?.data) {
      const updated = (sd.data as SagarSession[]).map((s) =>
        s.id === sessionId
          ? {
              ...s,
              status: "approved" as SessionStatus,
              callMessage: msg,
              scheduledDate: msg,
            }
          : s,
      );
      await supabase.from("sessions_data").upsert(
        {
          user_id: studentId,
          data: updated,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      setAllSessions((prev) =>
        prev.map((ss) =>
          ss.studentId === studentId && ss.session.id === sessionId
            ? {
                ...ss,
                session: {
                  ...ss.session,
                  status: "approved",
                  callMessage: msg,
                  scheduledDate: msg,
                },
              }
            : ss,
        ),
      );
    }
    setSaving(null);
  }

  const requested = allSessions.filter(
    (s) => s.session.status === "requested" || s.session.status === "confirmed",
  );
  const approved = allSessions.filter((s) => s.session.status === "approved");
  const done = allSessions.filter((s) => s.session.status === "done");

  const tabs = [
    { key: "requested", label: "📋 Requested", count: requested.length },
    { key: "approved", label: "✅ Approved", count: approved.length },
    { key: "done", label: "🏁 Done", count: done.length },
  ] as const;

  const currentList =
    activeTab === "requested"
      ? requested
      : activeTab === "approved"
        ? approved
        : done;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1
          className="text-3xl font-serif font-bold"
          style={{ color: CHARCOAL }}
        >
          Sessions
        </h1>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>
          Manage all student session requests with Sagar Sir
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
            style={
              activeTab === tab.key
                ? { background: DARK, color: CREAM }
                : {
                    background: CARD,
                    border: `1px solid ${BORDER}`,
                    color: MUTED,
                  }
            }
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  background: activeTab === tab.key ? `${GOLD}44` : `${GOLD}22`,
                  color: GOLD,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: MUTED }}>
          Loading sessions…
        </p>
      ) : currentList.length === 0 ? (
        <div
          className="text-center py-16 rounded-2xl"
          style={{ background: CREAM, border: `1.5px dashed ${BORDER}` }}
        >
          <p className="text-sm font-medium" style={{ color: MUTED }}>
            {activeTab === "requested"
              ? "No pending session requests"
              : activeTab === "approved"
                ? "No approved sessions"
                : "No completed sessions yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map(({ studentId, studentName, session }) => (
            <div
              key={session.id}
              className="rounded-2xl p-5"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: `${GOLD}22`, color: GOLD }}
                    >
                      {studentName[0]?.toUpperCase()}
                    </div>
                    <p className="text-sm font-bold" style={{ color: DARK }}>
                      {studentName}
                    </p>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background:
                          session.status === "approved"
                            ? `${OLIVE}22`
                            : session.status === "done"
                              ? `${GOLD}22`
                              : `${BORDER}`,
                        color:
                          session.status === "approved"
                            ? OLIVE
                            : session.status === "done"
                              ? GOLD
                              : MUTED,
                      }}
                    >
                      {session.status}
                    </span>
                  </div>
                  <div className="ml-10">
                    <p
                      className="text-xs font-semibold mb-1"
                      style={{ color: MUTED }}
                    >
                      Student's concern:
                    </p>
                    <p
                      className="text-sm p-3 rounded-xl"
                      style={{ background: CREAM, color: CHARCOAL }}
                    >
                      {session.concern}
                    </p>
                    {session.callMessage && (
                      <div
                        className="mt-2 p-3 rounded-xl"
                        style={{
                          background: `${OLIVE}11`,
                          border: `1px solid ${OLIVE}44`,
                        }}
                      >
                        <p
                          className="text-[10px] font-semibold mb-1"
                          style={{ color: OLIVE }}
                        >
                          📅 Your message to student:
                        </p>
                        <p className="text-xs" style={{ color: CHARCOAL }}>
                          {session.callMessage}
                        </p>
                      </div>
                    )}
                    {session.doneAt && (
                      <p className="text-[10px] mt-2" style={{ color: MUTED }}>
                        ✅ Completed:{" "}
                        {format(
                          new Date(session.doneAt),
                          "MMM d, yyyy 'at' h:mm a",
                        )}
                      </p>
                    )}
                    <p className="text-[10px] mt-1" style={{ color: MUTED }}>
                      Requested:{" "}
                      {format(new Date(session.requestedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>

                {/* Approve action */}
                {(session.status === "requested" ||
                  session.status === "confirmed") && (
                  <div className="flex-shrink-0 w-64">
                    <p
                      className="text-xs font-semibold mb-1.5"
                      style={{ color: MUTED }}
                    >
                      Write call time message:
                    </p>
                    <textarea
                      rows={3}
                      value={msgInputs[session.id] ?? ""}
                      onChange={(e) =>
                        setMsgInputs((p) => ({
                          ...p,
                          [session.id]: e.target.value,
                        }))
                      }
                      placeholder="e.g. You can call at 5pm on June 8, 2026. Join via this link: …"
                      className="w-full px-3 py-2 rounded-xl text-xs border-2 outline-none resize-none mb-2"
                      style={{
                        background: CREAM,
                        borderColor: BORDER,
                        color: CHARCOAL,
                      }}
                    />
                    <button
                      onClick={() => approveSession(studentId, session.id)}
                      disabled={saving === session.id}
                      className="w-full py-2 rounded-xl text-xs font-semibold"
                      style={{ background: OLIVE, color: "#fff" }}
                    >
                      {saving === session.id
                        ? "Saving…"
                        : "✓ Approve & Send Message"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Student Sagar Session Section ── */
function SagarSessionSection({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<SagarSession[]>(() =>
    loadSagarSessions(userId),
  );
  const [showForm, setShowForm] = useState(false);
  const [concern, setConcern] = useState("");

  /* Sync from Supabase on mount */
  useEffect(() => {
    supabase
      .from("sessions_data")
      .select("data")
      .eq("user_id", userId)
      .single()
      .then(({ data: sd }) => {
        if (sd?.data) {
          const fresh = sd.data as SagarSession[];
          setSessions(fresh);
          localStorage.setItem(
            lsKey(userId, "sagar_sessions"),
            JSON.stringify(fresh),
          );
        }
      });
  }, [userId]);

  function persist(list: SagarSession[]) {
    setSessions(list);
    saveSagarSessions(userId, list);
  }

  function submitRequest() {
    const trimmed = concern.trim();
    if (!trimmed) return;
    const session: SagarSession = {
      id: `${Date.now()}`,
      concern: trimmed,
      concernUpdatedAt: new Date().toISOString(),
      requestedAt: new Date().toISOString(),
      status: "requested",
    };
    persist([session, ...sessions]);
    setConcern("");
    setShowForm(false);
  }

  function markDone(id: string) {
    persist(
      sessions.map((s) =>
        s.id === id
          ? {
              ...s,
              status: "done" as SessionStatus,
              doneAt: new Date().toISOString(),
            }
          : s,
      ),
    );
  }

  const requested = sessions.filter(
    (s) => s.status === "requested" || s.status === "confirmed",
  );
  const approved = sessions.filter((s) => s.status === "approved");
  const done = sessions.filter((s) => s.status === "done");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" style={{ color: GOLD }} />
          <h3 className="font-semibold text-sm" style={{ color: CHARCOAL }}>
            Sessions with Sagar Sir
          </h3>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{
              background: `linear-gradient(135deg, #A07840 0%, ${GOLD} 100%)`,
              color: "#fff",
            }}
          >
            + Request Session
          </button>
        )}
      </div>

      {showForm && (
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{ background: CREAM, border: `1.5px solid ${GOLD}44` }}
        >
          <h4 className="text-sm font-semibold" style={{ color: CHARCOAL }}>
            What would you like to discuss with Sagar Sir?
          </h4>
          <textarea
            autoFocus
            rows={3}
            value={concern}
            onChange={(e) => setConcern(e.target.value)}
            placeholder="Describe your concern or topic…"
            className="w-full px-3 py-2.5 rounded-xl text-sm border-2 outline-none resize-none"
            style={{ background: CARD, borderColor: BORDER, color: CHARCOAL }}
          />
          <div className="flex gap-2">
            <button
              onClick={submitRequest}
              className="px-4 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: `linear-gradient(135deg, #A07840 0%, ${GOLD} 100%)`,
                color: "#fff",
              }}
            >
              Submit Request
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setConcern("");
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: BORDER, color: MUTED }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Approved — show call message prominently */}
      {approved.length > 0 && (
        <div className="space-y-3">
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: OLIVE }}
          >
            ✅ Approved — Action Required
          </p>
          {approved.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl p-5 space-y-3"
              style={{ background: CARD, border: `2px solid ${OLIVE}66` }}
            >
              <p className="text-xs font-semibold" style={{ color: CHARCOAL }}>
                Your concern: {s.concern}
              </p>
              {s.callMessage && (
                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: `${OLIVE}11`,
                    border: `1px solid ${OLIVE}44`,
                  }}
                >
                  <p
                    className="text-[10px] font-bold mb-1"
                    style={{ color: OLIVE }}
                  >
                    📅 Message from Vaishnavi Ma'am:
                  </p>
                  <p
                    className="text-sm font-medium"
                    style={{ color: CHARCOAL }}
                  >
                    {s.callMessage}
                  </p>
                </div>
              )}
              <button
                onClick={() => markDone(s.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold w-full justify-center"
                style={{
                  background: `${OLIVE}22`,
                  color: OLIVE,
                  border: `1px solid ${OLIVE}44`,
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark as Done — Session completed with Sagar Sir
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Requested */}
      {requested.length > 0 && (
        <div className="space-y-3">
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: MUTED }}
          >
            ⏳ Pending Approval
          </p>
          {requested.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl p-4"
              style={{ background: CREAM, border: `1px solid ${BORDER}` }}
            >
              <p className="text-sm" style={{ color: CHARCOAL }}>
                {s.concern}
              </p>
              <p className="text-[10px] mt-1" style={{ color: MUTED }}>
                Requested {format(new Date(s.requestedAt), "MMM d, yyyy")} ·
                Awaiting approval
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <div className="space-y-3">
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: MUTED }}
          >
            🏁 Completed Sessions ({done.length})
          </p>
          {done.map((s, i) => (
            <div
              key={s.id}
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: CREAM, border: `1px solid ${BORDER}` }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: `${GOLD}22`, color: GOLD }}
              >
                {done.length - i}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium" style={{ color: CHARCOAL }}>
                  {s.concern}
                </p>
                {s.doneAt && (
                  <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>
                    ✅ {format(new Date(s.doneAt), "MMM d, yyyy")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {sessions.length === 0 && !showForm && (
        <div
          className="text-center py-12 rounded-2xl"
          style={{ background: CREAM, border: `1.5px dashed ${BORDER}` }}
        >
          <Calendar
            className="w-8 h-8 mx-auto mb-2 opacity-30"
            style={{ color: GOLD }}
          />
          <p className="text-sm font-medium" style={{ color: MUTED }}>
            No sessions yet
          </p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>
            Request a session with Sagar Sir to get started
          </p>
        </div>
      )}

      {/* Session stats */}
      {done.length > 0 && (
        <div
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: `${GOLD}11`, border: `1px solid ${GOLD}33` }}
        >
          <Star className="w-5 h-5 flex-shrink-0" style={{ color: GOLD }} />
          <div>
            <p className="text-sm font-bold" style={{ color: DARK }}>
              {done.length} session{done.length !== 1 ? "s" : ""} completed with
              Sagar Sir
            </p>
            {done[0]?.doneAt && (
              <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                Last: {format(new Date(done[0].doneAt), "MMM d, yyyy")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Vaishnavi Note Section ── */
function VaishnaviNoteSection({ userId }: { userId: string }) {
  const [note, setNote] = useState<VaishnaviNote | null>(() =>
    loadVaishnaviNote(userId),
  );
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note?.concern ?? "");

  function save() {
    const n: VaishnaviNote = {
      concern: text.trim(),
      updatedAt: new Date().toISOString(),
    };
    saveVaishnaviNote(userId, n);
    setNote(n);
    setEditing(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4" style={{ color: GOLD }} />
        <h3 className="font-semibold text-sm" style={{ color: CHARCOAL }}>
          Note for Vaishnavi Ma'am
        </h3>
      </div>
      {editing ? (
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{ background: CREAM, border: `1.5px solid ${GOLD}44` }}
        >
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share anything you'd like Vaishnavi Ma'am to know…"
            className="w-full px-3 py-2 rounded-xl text-sm border-2 outline-none resize-none"
            style={{ background: CARD, borderColor: BORDER, color: CHARCOAL }}
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              className="px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: GOLD, color: "#fff" }}
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: BORDER, color: MUTED }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl p-4 cursor-pointer"
          style={{ background: CREAM, border: `1px solid ${BORDER}` }}
          onClick={() => {
            setEditing(true);
            setText(note?.concern ?? "");
          }}
        >
          {note?.concern ? (
            <p className="text-sm" style={{ color: CHARCOAL }}>
              {note.concern}
            </p>
          ) : (
            <p className="text-sm italic" style={{ color: MUTED }}>
              Click to add a note for Vaishnavi Ma'am…
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Sessions Page ── */
export default function Sessions() {
  const { user } = useAuth();
  const userId = String(user?.id ?? "guest");
  const space = (user as any)?.space as string | null;
  const role = user?.role;
  const isZenith = space === "zenith";
  const isApex = space === "apex";
  const isHeartSpace = space === "heartspace";
  const isCounsellor = role === "counsellor";

  if (isCounsellor) return <CounsellorSessionsPage />;

  if (isApex) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <h1
          className="text-3xl font-serif font-bold"
          style={{ color: CHARCOAL }}
        >
          Sessions
        </h1>
        <div
          className="text-center py-20 rounded-2xl"
          style={{ background: CREAM, border: `1.5px dashed ${BORDER}` }}
        >
          <Calendar
            className="w-10 h-10 mx-auto mb-3 opacity-30"
            style={{ color: GOLD }}
          />
          <p className="text-sm font-medium" style={{ color: CHARCOAL }}>
            Sessions not available on Apex+
          </p>
          <p className="text-xs mt-1 max-w-xs mx-auto" style={{ color: MUTED }}>
            Apex+ is a self-prep plan. Upgrade to Zenith for counsellor
            sessions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-in fade-in duration-500">
      <div>
        <h1
          className="text-3xl font-serif font-bold"
          style={{ color: CHARCOAL }}
        >
          Sessions
        </h1>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>
          {isZenith
            ? "Manage your sessions with Vaishnavi Ma'am and Sagar Sir."
            : "Request and track your counselling sessions."}
        </p>
      </div>
      {isZenith && (
        <>
          <VaishnaviNoteSection userId={userId} />
          <div className="h-px" style={{ background: BORDER }} />
          <SagarSessionSection userId={userId} />
        </>
      )}
      {isHeartSpace && <SagarSessionSection userId={userId} />}
    </div>
  );
}
