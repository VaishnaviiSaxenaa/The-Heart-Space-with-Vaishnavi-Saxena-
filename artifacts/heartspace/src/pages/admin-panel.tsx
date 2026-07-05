import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

const CREAM = "#F8F5F0";
const CHARCOAL = "#2D2A25";
const BORDER = "#E5DDD0";
const CARD = "#FFFDF9";
const MUTED = "#7A7267";
const OLIVE = "#6E8B6B";
const PURPLE = "#6B568F";
const RED = "#C0392B";

interface Student {
  id: string;
  email: string;
  full_name: string;
  role: string;
  plan: string;
  exam_type: string;
  status: string;
  created_at: string;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "suspended">("all");

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setStudents(data as Student[]);
    setLoading(false);
  }

  async function updateStatus(studentId: string, newStatus: string) {
    setUpdating(studentId);
    await supabase.from("profiles").update({ status: newStatus }).eq("id", studentId);
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: newStatus } : s));
    setUpdating(null);
  }

  async function updatePlan(studentId: string, newPlan: string) {
    await supabase.from("profiles").update({ plan: newPlan }).eq("id", studentId);
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, plan: newPlan } : s));
  }

  if (user?.role !== "counsellor") {
    return <div style={{ padding: "2rem", color: RED }}>Access denied.</div>;
  }

  const STUDENT_ROLES = ["academy_student", "prep_student", "counseling_client"];
  const filtered = students.filter(s => STUDENT_ROLES.includes(s.role) && (filter === "all" || s.status === filter));
  const counts = {
    all: students.filter(s => STUDENT_ROLES.includes(s.role)).length,
    pending: students.filter(s => STUDENT_ROLES.includes(s.role) && s.status === "pending").length,
    active: students.filter(s => STUDENT_ROLES.includes(s.role) && s.status === "active").length,
    suspended: students.filter(s => STUDENT_ROLES.includes(s.role) && s.status === "suspended").length,
  };

  return (
    <div style={{ minHeight: "100vh", background: CREAM, padding: "2rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: CHARCOAL, marginBottom: "0.5rem" }}>
          🎛️ Student Access Control
        </h1>
        <p style={{ color: MUTED, marginBottom: "1.5rem" }}>Manage student subscriptions and access</p>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {(["all", "pending", "active", "suspended"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: "0.4rem 1rem", borderRadius: 20, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                background: filter === f ? CHARCOAL : CARD,
                color: filter === f ? "#fff" : MUTED,
                border: `1px solid ${filter === f ? CHARCOAL : BORDER}`,
              }}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: MUTED }}>Loading...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {filtered.length === 0 && (
              <p style={{ color: MUTED, textAlign: "center", padding: "2rem" }}>No students in this category.</p>
            )}
            {filtered.map(student => (
              <div key={student.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "1rem 1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <p style={{ fontWeight: 700, color: CHARCOAL, margin: 0 }}>{student.full_name || "—"}</p>
                    <p style={{ fontSize: "0.8rem", color: MUTED, margin: "0.2rem 0 0" }}>{student.email}</p>
                    <p style={{ fontSize: "0.75rem", color: MUTED, margin: "0.1rem 0 0" }}>
                      {student.exam_type || "—"} · Joined {new Date(student.created_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span style={{
                    padding: "0.25rem 0.75rem", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700,
                    background: student.status === "active" ? `${OLIVE}22` : student.status === "pending" ? "#FFF8DC" : `${RED}15`,
                    color: student.status === "active" ? OLIVE : student.status === "pending" ? "#B8860B" : RED,
                  }}>
                    {student.status === "active" ? "✓ Active" : student.status === "pending" ? "⏳ Pending" : "🔒 Suspended"}
                  </span>

                  {/* Plan selector */}
                  <select value={student.plan || ""} onChange={e => updatePlan(student.id, e.target.value)}
                    style={{ padding: "0.3rem 0.5rem", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: "0.8rem", background: CARD, color: CHARCOAL, cursor: "pointer" }}>
                    <option value="">No Plan</option>
                    <option value="apex">Apex</option>
                    <option value="zenith">Zenith</option>
                    <option value="heartspace">HeartSpace</option>
                  </select>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {student.status !== "active" && (
                      <button onClick={() => updateStatus(student.id, "active")}
                        disabled={updating === student.id}
                        style={{ padding: "0.4rem 0.9rem", borderRadius: 8, border: "none", background: OLIVE, color: "#fff", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                        {updating === student.id ? "..." : "✓ Activate"}
                      </button>
                    )}
                    {student.status !== "suspended" && (
                      <button onClick={() => updateStatus(student.id, "suspended")}
                        disabled={updating === student.id}
                        style={{ padding: "0.4rem 0.9rem", borderRadius: 8, border: "none", background: RED, color: "#fff", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                        {updating === student.id ? "..." : "🔒 Suspend"}
                      </button>
                    )}
                    {student.status !== "pending" && (
                      <button onClick={() => updateStatus(student.id, "pending")}
                        disabled={updating === student.id}
                        style={{ padding: "0.4rem 0.9rem", borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD, color: MUTED, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                        Set Pending
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
