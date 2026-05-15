import { useState } from "react";
import { useAuth } from "../lib/auth";
import { Plus, Clock, X, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { format, addDays } from "date-fns";

const CREAM    = "#FAF7F2";
const CHARCOAL = "#2C1810";
const GOLD     = "#C9A96E";
const DARK     = "#3D2314";
const CARD     = "#FFFFFF";
const MUTED    = "#8C7B70";
const BORDER   = "#E8DDD0";
const OLIVE    = "#6E8B6B";

export interface SessionRecord {
  id: string;
  createdAt: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  discuss: string;
  problems: string;
  bothering: string;
  additionalNotes: string;
  scheduledDate?: string;
}

function lsKey(userId: string) { return `hs_sessions_${userId}`; }

function loadSessions(userId: string): SessionRecord[] {
  try { const r = localStorage.getItem(lsKey(userId)); return r ? JSON.parse(r) : []; }
  catch { return []; }
}

function saveSessions(userId: string, list: SessionRecord[]) {
  localStorage.setItem(lsKey(userId), JSON.stringify(list));
}

const STATUS_CFG = {
  pending:   { label: "Requested",  bg: `${GOLD}22`,  text: "#8A5A10" },
  confirmed: { label: "Confirmed",  bg: "#E8F0E6",    text: "#2D5A29" },
  completed: { label: "Completed",  bg: "#DFF0DA",    text: "#2D5A29" },
  cancelled: { label: "Cancelled",  bg: "#EDE4D8",    text: "#7A5A40" },
} as const;

const blankForm = {
  discuss: "",
  problems: "",
  bothering: "",
  additionalNotes: "",
};

function BookingModal({ onClose, onSave }: { onClose: () => void; onSave: (form: typeof blankForm) => void }) {
  const [form, setForm] = useState(blankForm);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof blankForm, string>>>({});

  const set = (k: keyof typeof blankForm) => (v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  function submit() {
    const errs: typeof errors = {};
    if (!form.discuss.trim())          errs.discuss = "Required";
    if (!form.problems.trim())         errs.problems = "Required";
    if (!form.bothering.trim())        errs.bothering = "Required";
    if (!form.additionalNotes.trim())  errs.additionalNotes = "Required";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave(form);
  }

  const fields: { key: keyof typeof blankForm; label: string; placeholder: string }[] = [
    {
      key: "discuss",
      label: "What would you like to discuss in this session?",
      placeholder: "Topics, goals, or situations you want help with…",
    },
    {
      key: "problems",
      label: "What problems did you face recently?",
      placeholder: "Challenges in academics, life, or wellbeing…",
    },
    {
      key: "bothering",
      label: "What is bothering you the most right now?",
      placeholder: "Your biggest concern or worry…",
    },
    {
      key: "additionalNotes",
      label: "Additional notes for your counsellor",
      placeholder: "Anything else you'd like them to know…",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(44,24,16,.45)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px rgba(44,24,16,.25)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5"
          style={{ background: DARK }}>
          <div>
            <h2 className="font-serif text-lg font-bold" style={{ color: CREAM }}>Book a Session</h2>
            <p className="text-xs mt-0.5" style={{ color: "rgba(250,247,242,.6)" }}>
              Please fill in all fields — your counsellor will review these before your session
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {fields.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: CHARCOAL }}>
                {label} <span style={{ color: "#C0392B" }}>*</span>
              </label>
              <textarea rows={2}
                value={form[key]}
                onChange={(e) => set(key)(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 rounded-xl text-sm border-2 outline-none resize-none leading-relaxed"
                style={{
                  background: CREAM,
                  borderColor: errors[key] ? "#C0392B" : BORDER,
                  color: CHARCOAL,
                }} />
              {errors[key] && (
                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "#C0392B" }}>
                  <AlertCircle className="w-3 h-3" /> {errors[key]}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex gap-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          <button onClick={submit}
            className="flex-1 h-11 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01]"
            style={{ background: `linear-gradient(135deg, #A07840 0%, ${GOLD} 100%)`, color: "#fff" }}>
            Submit Request
          </button>
          <button onClick={onClose}
            className="px-5 h-11 rounded-xl text-sm font-medium"
            style={{ background: BORDER, color: MUTED }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionCard({ session, onCancel }: { session: SessionRecord; onCancel: (id: string) => void }) {
  const cfg = STATUS_CFG[session.status];
  const date = new Date(session.createdAt);

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(44,24,16,.06)" }}>
      <div className="flex flex-col md:flex-row">
        {/* Date panel */}
        <div className="p-5 md:w-36 flex flex-col items-center justify-center text-center flex-shrink-0"
          style={{
            background: session.status === "pending" || session.status === "confirmed"
              ? `linear-gradient(160deg, ${DARK} 0%, #6B3A28 100%)`
              : "#F3EDE6",
            borderRight: `1px solid ${BORDER}`,
          }}>
          <div className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
            style={{ color: session.status === "completed" || session.status === "cancelled" ? MUTED : "rgba(250,247,242,.55)" }}>
            {format(date, "EEEE")}
          </div>
          <div className="text-4xl font-serif font-bold"
            style={{ color: session.status === "completed" || session.status === "cancelled" ? MUTED : GOLD }}>
            {format(date, "d")}
          </div>
          <div className="text-xs"
            style={{ color: session.status === "completed" || session.status === "cancelled" ? MUTED : "rgba(250,247,242,.7)" }}>
            {format(date, "MMM yyyy")}
          </div>
          <div className="flex items-center gap-1 text-[10px] mt-1.5"
            style={{ color: session.status === "completed" || session.status === "cancelled" ? MUTED : "rgba(250,247,242,.45)" }}>
            <Clock className="w-3 h-3" />{format(date, "h:mm a")}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 flex-1">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="font-serif text-base font-semibold" style={{ color: CHARCOAL }}>
              Counselling Session Request
            </h3>
            <span className="flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: cfg.bg, color: cfg.text }}>
              {cfg.label}
            </span>
          </div>

          <div className="space-y-2">
            {[
              { label: "Discuss", value: session.discuss },
              { label: "Problems", value: session.problems },
              { label: "Bothering me", value: session.bothering },
            ].filter((f) => f.value).map(({ label, value }) => (
              <div key={label}>
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>{label}: </span>
                <span className="text-xs" style={{ color: CHARCOAL }}>{value}</span>
              </div>
            ))}
          </div>

          {session.status === "pending" && (
            <div className="mt-4 pt-4 flex items-center gap-3" style={{ borderTop: `1px solid ${BORDER}` }}>
              <button onClick={() => onCancel(session.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: "#EDE4D8", color: "#7A5A40" }}>
                <X className="w-3.5 h-3.5" /> Cancel Request
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Sessions() {
  const { user } = useAuth();
  const userId = String(user?.id ?? "guest");

  const [sessions, setSessions] = useState<SessionRecord[]>(() => loadSessions(userId));
  const [showModal, setShowModal] = useState(false);

  function persist(next: SessionRecord[]) { setSessions(next); saveSessions(userId, next); }

  function handleBook(form: typeof blankForm) {
    const record: SessionRecord = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "pending",
      ...form,
    };
    persist([record, ...sessions]);
    setShowModal(false);
  }

  function cancel(id: string) {
    persist(sessions.map((s) => s.id === id ? { ...s, status: "cancelled" as const } : s));
  }

  const upcoming = sessions.filter((s) => s.status === "pending" || s.status === "confirmed");
  const past     = sessions.filter((s) => s.status === "completed" || s.status === "cancelled");

  return (
    <div className="space-y-7 animate-in fade-in duration-500">
      {showModal && (
        <BookingModal onClose={() => setShowModal(false)} onSave={handleBook} />
      )}

      {/* Header */}
      <div className="flex items-start gap-4 justify-between flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold" style={{ color: CHARCOAL }}>Sessions</h1>
          <p className="mt-1.5 text-sm" style={{ color: MUTED }}>
            {user?.role === "student"
              ? "Request sessions and track your counselling journey."
              : "Manage your student counselling sessions."}
          </p>
        </div>
        {user?.role === "student" && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, #A07840 0%, ${GOLD} 100%)`, color: "#fff", boxShadow: "0 4px 14px rgba(201,169,110,.30)" }}>
            <Plus className="w-4 h-4" /> Book Session
          </button>
        )}
      </div>

      {/* Info banner for students */}
      {user?.role === "student" && sessions.length === 0 && (
        <div className="rounded-2xl p-6"
          style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}44` }}>
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: CHARCOAL }}>Ready to book your first session?</p>
              <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                Click "Book Session" to submit a request. Your counsellor will confirm a time that works for both of you.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: CHARCOAL }}>
            Upcoming & Pending
          </h2>
          <div className="space-y-3">
            {upcoming.map((s) => (
              <SessionCard key={s.id} session={s} onCancel={cancel} />
            ))}
          </div>
        </section>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: CHARCOAL }}>History</h2>
          <div className="space-y-3">
            {past.map((s) => <SessionCard key={s.id} session={s} onCancel={cancel} />)}
          </div>
        </section>
      )}

      {sessions.length === 0 && (
        <div className="text-center py-20 rounded-2xl"
          style={{ background: CREAM, border: `1.5px dashed ${BORDER}` }}>
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: GOLD }} />
          <p className="text-sm font-medium" style={{ color: CHARCOAL }}>No sessions yet</p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>Book your first session to get started</p>
        </div>
      )}
    </div>
  );
}
