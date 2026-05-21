import { useState } from "react";
import { useAuth } from "../lib/auth";
import { format } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Edit3,
  Save,
  User,
  Star,
  RefreshCw,
} from "lucide-react";

/* ─── Brand tokens ─────────────────────── */
const CREAM = "#FAF7F2";
const CHARCOAL = "#2C1810";
const GOLD = "#C9A96E";
const DARK = "#3D2314";
const CARD = "#FFFFFF";
const MUTED = "#8C7B70";
const BORDER = "#E8DDD0";
const OLIVE = "#6E8B6B";
const ROSE = "#D4A5A5";

/* ─── Types ────────────────────────────── */
type SessionStatus =
  | "requested"
  | "confirmed"
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
  notes?: string;
}

interface VaishnaviNote {
  concern: string;
  updatedAt: string;
}

/* ─── localStorage helpers ─────────────── */
function lsKey(userId: string, type: string) {
  return `hs_${type}_${userId}`;
}

function loadSagarSessions(userId: string): SagarSession[] {
  try {
    const r = localStorage.getItem(lsKey(userId, "sagar_sessions"));
    return r ? JSON.parse(r) : [];
  } catch {
    return [];
  }
}

function saveSagarSessions(userId: string, list: SagarSession[]) {
  localStorage.setItem(lsKey(userId, "sagar_sessions"), JSON.stringify(list));
}

function loadVaishnaviNote(userId: string): VaishnaviNote | null {
  try {
    const r = localStorage.getItem(lsKey(userId, "vaishnavi_note"));
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}

function saveVaishnaviNote(userId: string, note: VaishnaviNote) {
  localStorage.setItem(lsKey(userId, "vaishnavi_note"), JSON.stringify(note));
}

/* ─── Status config ────────────────────── */
const STATUS_CFG: Record<
  SessionStatus,
  { label: string; bg: string; color: string; icon: React.ElementType }
> = {
  requested: {
    label: "Requested",
    bg: `${GOLD}22`,
    color: "#8A5A10",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmed",
    bg: "#E8F0E6",
    color: "#2D5A29",
    icon: Calendar,
  },
  done: { label: "Done", bg: `${OLIVE}22`, color: OLIVE, icon: CheckCircle2 },
  missed: { label: "Missed", bg: "#FDE8E8", color: "#C0392B", icon: XCircle },
  rescheduled: {
    label: "Rescheduled",
    bg: `${ROSE}33`,
    color: "#8B3A3A",
    icon: RefreshCw,
  },
};

/* ─── Vaishnavi Note Section ───────────── */
function VaishnaviNoteSection({ userId }: { userId: string }) {
  const [note, setNote] = useState<VaishnaviNote | null>(() =>
    loadVaishnaviNote(userId),
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note?.concern ?? "");

  function save() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const updated: VaishnaviNote = {
      concern: trimmed,
      updatedAt: new Date().toISOString(),
    };
    setNote(updated);
    saveVaishnaviNote(userId, updated);
    setEditing(false);
  }

  function cancel() {
    setDraft(note?.concern ?? "");
    setEditing(false);
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: `linear-gradient(135deg, ${DARK}08 0%, ${GOLD}08 100%)`,
        border: `1.5px solid ${GOLD}44`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4" style={{ color: GOLD }} />
          <h3 className="font-semibold text-sm" style={{ color: DARK }}>
            What would you like to discuss with Vaishnavi Ma'am in the next
            session?
          </h3>
        </div>
        {!editing && (
          <button
            onClick={() => {
              setDraft(note?.concern ?? "");
              setEditing(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0"
            style={{ background: `${GOLD}22`, color: DARK }}
          >
            <Edit3 className="w-3 h-3" /> {note ? "Edit" : "Add"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <textarea
            autoFocus
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share what you'd like to address in your next session with Vaishnavi Ma'am… (optional)"
            className="w-full px-3 py-2.5 rounded-xl text-sm border-2 outline-none resize-none"
            style={{ background: CREAM, borderColor: GOLD, color: CHARCOAL }}
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: `linear-gradient(135deg, #A07840 0%, ${GOLD} 100%)`,
                color: "#fff",
              }}
            >
              <Save className="w-3 h-3" /> Save
            </button>
            <button
              onClick={cancel}
              className="px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: BORDER, color: MUTED }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : note ? (
        <div>
          <p className="text-sm leading-relaxed" style={{ color: CHARCOAL }}>
            {note.concern}
          </p>
          <p className="text-[10px] mt-2" style={{ color: MUTED }}>
            Last updated:{" "}
            {format(new Date(note.updatedAt), "MMM d, yyyy · h:mm a")}
          </p>
        </div>
      ) : (
        <p className="text-xs" style={{ color: MUTED }}>
          Optional — write what you'd like Vaishnavi Ma'am to address in your
          next session.
        </p>
      )}
    </div>
  );
}

/* ─── Sagar Session Request ────────────── */
function SagarSessionSection({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<SagarSession[]>(() =>
    loadSagarSessions(userId),
  );
  const [showForm, setShowForm] = useState(false);
  const [concern, setConcern] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

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

  function startEdit(s: SagarSession) {
    setEditId(s.id);
    setEditText(s.concern);
  }

  function saveEdit(id: string) {
    const trimmed = editText.trim();
    if (!trimmed) return;
    persist(
      sessions.map((s) =>
        s.id === id
          ? {
              ...s,
              concern: trimmed,
              concernUpdatedAt: new Date().toISOString(),
            }
          : s,
      ),
    );
    setEditId(null);
  }

  const active = sessions.filter(
    (s) => s.status === "requested" || s.status === "confirmed",
  );
  const past = sessions.filter(
    (s) =>
      s.status === "done" ||
      s.status === "missed" ||
      s.status === "rescheduled",
  );

  return (
    <div className="space-y-4">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
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
            What concerns would you like addressed in this session?
          </h4>
          <textarea
            autoFocus
            rows={3}
            value={concern}
            onChange={(e) => setConcern(e.target.value)}
            placeholder="Describe what you'd like to work on or discuss with Sagar Sir…"
            className="w-full px-3 py-2.5 rounded-xl text-sm border-2 outline-none resize-none"
            style={{ background: CARD, borderColor: BORDER, color: CHARCOAL }}
          />
          <div className="flex gap-2">
            <button
              onClick={submitRequest}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: `linear-gradient(135deg, #A07840 0%, ${GOLD} 100%)`,
                color: "#fff",
              }}
            >
              <Save className="w-3 h-3" /> Submit Request
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

      {active.length > 0 && (
        <div className="space-y-3">
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: MUTED }}
          >
            Upcoming & Pending
          </p>
          {active.map((s) => {
            const cfg = STATUS_CFG[s.status];
            const Icon = cfg.icon;
            return (
              <div
                key={s.id}
                className="rounded-2xl p-5"
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 2px 8px rgba(44,24,16,.05)",
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span
                    className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    <Icon className="w-3 h-3" /> {cfg.label}
                  </span>
                  <span className="text-[10px]" style={{ color: MUTED }}>
                    Requested {format(new Date(s.requestedAt), "MMM d, yyyy")}
                  </span>
                </div>

                {editId === s.id ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm border-2 outline-none resize-none"
                      style={{
                        background: CREAM,
                        borderColor: GOLD,
                        color: CHARCOAL,
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(s.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: `${GOLD}28`, color: "#9A6010" }}
                      >
                        <Save className="w-3 h-3" /> Save
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: BORDER, color: MUTED }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p
                      className="text-xs font-semibold mb-1"
                      style={{ color: MUTED }}
                    >
                      Concern:
                    </p>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: CHARCOAL }}
                    >
                      {s.concern}
                    </p>
                    <div
                      className="flex items-center justify-between mt-3 pt-3"
                      style={{ borderTop: `1px solid ${BORDER}` }}
                    >
                      <p className="text-[10px]" style={{ color: MUTED }}>
                        Last updated:{" "}
                        {format(
                          new Date(s.concernUpdatedAt),
                          "MMM d, yyyy · h:mm a",
                        )}
                      </p>
                      <button
                        onClick={() => startEdit(s)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{ background: `${GOLD}22`, color: DARK }}
                      >
                        <Edit3 className="w-3 h-3" /> Edit concern
                      </button>
                    </div>
                    {s.scheduledDate && (
                      <div
                        className="mt-3 px-3 py-2 rounded-xl flex items-center gap-2"
                        style={{
                          background: `${OLIVE}15`,
                          border: `1px solid ${OLIVE}33`,
                        }}
                      >
                        <Calendar
                          className="w-3.5 h-3.5 flex-shrink-0"
                          style={{ color: OLIVE }}
                        />
                        <p
                          className="text-xs font-semibold"
                          style={{ color: OLIVE }}
                        >
                          Scheduled: {s.scheduledDate}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: MUTED }}
          >
            Session History
          </p>
          {past.map((s) => {
            const cfg = STATUS_CFG[s.status];
            const Icon = cfg.icon;
            return (
              <div
                key={s.id}
                className="rounded-2xl p-4"
                style={{ background: CREAM, border: `1px solid ${BORDER}` }}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span
                    className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    <Icon className="w-3 h-3" /> {cfg.label}
                  </span>
                  <span className="text-[10px]" style={{ color: MUTED }}>
                    {s.scheduledDate ||
                      format(new Date(s.requestedAt), "MMM d, yyyy")}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
                  {s.concern}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {sessions.length === 0 && !showForm && (
        <div
          className="text-center py-10 rounded-2xl"
          style={{ background: CREAM, border: `1.5px dashed ${BORDER}` }}
        >
          <User
            className="w-8 h-8 mx-auto mb-2 opacity-30"
            style={{ color: GOLD }}
          />
          <p className="text-sm font-medium" style={{ color: CHARCOAL }}>
            No session requests yet
          </p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>
            Click "Request Session" to book time with Sagar Sir.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── HeartSpace Session Section ────────── */
function HeartSpaceSessionSection({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<SagarSession[]>(() =>
    loadSagarSessions(userId),
  );
  const [showForm, setShowForm] = useState(false);
  const [concern, setConcern] = useState("");

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: ROSE }} />
          <h3 className="font-semibold text-sm" style={{ color: CHARCOAL }}>
            Session Requests
          </h3>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: `${ROSE}33`, color: "#8B3A3A" }}
          >
            + Request Session
          </button>
        )}
      </div>

      {showForm && (
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{ background: CREAM, border: `1.5px solid ${ROSE}55` }}
        >
          <h4 className="text-sm font-semibold" style={{ color: CHARCOAL }}>
            What concerns would you like addressed?
          </h4>
          <textarea
            autoFocus
            rows={3}
            value={concern}
            onChange={(e) => setConcern(e.target.value)}
            placeholder="Share what's on your mind or what you'd like to discuss…"
            className="w-full px-3 py-2.5 rounded-xl text-sm border-2 outline-none resize-none"
            style={{ background: CARD, borderColor: BORDER, color: CHARCOAL }}
          />
          <div className="flex gap-2">
            <button
              onClick={submitRequest}
              className="px-4 py-2 rounded-xl text-xs font-semibold"
              style={{ background: `${ROSE}55`, color: "#8B3A3A" }}
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

      {sessions.map((s) => {
        const cfg = STATUS_CFG[s.status];
        const Icon = cfg.icon;
        return (
          <div
            key={s.id}
            className="rounded-2xl p-4"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                <Icon className="w-3 h-3" /> {cfg.label}
              </span>
              <span className="text-[10px]" style={{ color: MUTED }}>
                {format(new Date(s.requestedAt), "MMM d, yyyy")}
              </span>
            </div>
            <p className="text-sm" style={{ color: CHARCOAL }}>
              {s.concern}
            </p>
            {s.scheduledDate && (
              <p
                className="text-xs mt-2 font-semibold"
                style={{ color: OLIVE }}
              >
                📅 Scheduled: {s.scheduledDate}
              </p>
            )}
          </div>
        );
      })}

      {sessions.length === 0 && !showForm && (
        <div
          className="text-center py-10 rounded-2xl"
          style={{ background: CREAM, border: `1.5px dashed ${BORDER}` }}
        >
          <Calendar
            className="w-8 h-8 mx-auto mb-2 opacity-30"
            style={{ color: ROSE }}
          />
          <p className="text-sm font-medium" style={{ color: CHARCOAL }}>
            No sessions yet
          </p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>
            Request a session to get started.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ───────────────────── */
export default function Sessions() {
  const { user } = useAuth();
  const userId = String(user?.id ?? "guest");
  const space = (user as any)?.space as string | null;

  const isZenith = space === "zenith";
  const isApex = space === "apex";
  const isHeartSpace = space === "heartspace";

  if (isApex) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1
            className="text-3xl font-serif font-bold"
            style={{ color: CHARCOAL }}
          >
            Sessions
          </h1>
        </div>
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
            Apex+ is a self-prep plan focused on academic tracking. Upgrade to
            Zenith for counsellor sessions.
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

      {isHeartSpace && <HeartSpaceSessionSection userId={userId} />}
    </div>
  );
}
