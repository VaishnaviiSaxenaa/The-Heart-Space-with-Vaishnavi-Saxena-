import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const CREAM = "#F8F5F0";
const CHARCOAL = "#2D2A25";
const BORDER = "#E5DDD0";
const CARD = "#FFFDF9";
const MUTED = "#7A7267";
const OLIVE = "#6E8B6B";
const PURPLE = "#6B568F";
const RED = "#C0392B";

interface Coupon {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  active: boolean;
  max_uses: number | null;
  used_count: number;
  applicable_plans: string | null;
  expires_at: string | null;
  created_at: string;
}

const PLAN_OPTIONS = [
  { value: "apex", label: "Apex+" },
  { value: "heartspace_1", label: "HeartSpace (1 session)" },
  { value: "heartspace_2", label: "HeartSpace (2 sessions)" },
];

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadCoupons();
  }, []);

  async function loadCoupons() {
    const { data } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCoupons(data as Coupon[]);
    setLoading(false);
  }

  function togglePlan(plan: string) {
    setSelectedPlans((prev) =>
      prev.includes(plan) ? prev.filter((p) => p !== plan) : [...prev, plan],
    );
  }

  async function saveCoupon() {
    if (!code.trim() || !discountValue) return;
    setSaving(true);
    const payload = {
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: Number(discountValue),
      max_uses: maxUses ? Number(maxUses) : null,
      applicable_plans: selectedPlans.length > 0 ? selectedPlans.join(",") : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    };
    const { error } = editingId
      ? await supabase.from("coupons").update(payload).eq("id", editingId)
      : await supabase.from("coupons").insert({ ...payload, active: true });
    if (error) {
      alert("Error saving coupon: " + error.message);
    } else {
      resetForm();
      loadCoupons();
    }
    setSaving(false);
  }

  function resetForm() {
    setCode("");
    setDiscountValue("");
    setMaxUses("");
    setExpiresAt("");
    setSelectedPlans([]);
    setEditingId(null);
  }

  function startEdit(c: Coupon) {
    setEditingId(c.id);
    setCode(c.code);
    setDiscountType(c.discount_type);
    setDiscountValue(String(c.discount_value));
    setMaxUses(c.max_uses ? String(c.max_uses) : "");
    setExpiresAt(c.expires_at ? c.expires_at.slice(0, 10) : "");
    setSelectedPlans(c.applicable_plans ? c.applicable_plans.split(",") : []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from("coupons").update({ active: !current }).eq("id", id);
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !current } : c)),
    );
  }

  async function deleteCoupon(id: string) {
    if (!confirm("Delete this coupon permanently?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div style={{ minHeight: "100vh", background: CREAM, padding: "2rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: CHARCOAL }}>
            🎟️ Coupon Codes
          </h1>
          <a
            href="/admin"
            style={{ color: PURPLE, fontWeight: 600, fontSize: "0.85rem", textDecoration: "none" }}
          >
            ← Back to Access Control
          </a>
        </div>

        {/* Create form */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "1.5rem", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: CHARCOAL, marginBottom: "1rem" }}>
            Create New Coupon
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", color: MUTED, fontWeight: 600 }}>Coupon Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. WELCOME20"
                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: 10, border: `1px solid ${BORDER}`, marginTop: "0.25rem", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: MUTED, fontWeight: 600 }}>Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: 10, border: `1px solid ${BORDER}`, marginTop: "0.25rem", boxSizing: "border-box" }}
              >
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: MUTED, fontWeight: 600 }}>
                Discount Value {discountType === "percent" ? "(%)" : "(₹)"}
              </label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percent" ? "e.g. 20" : "e.g. 100"}
                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: 10, border: `1px solid ${BORDER}`, marginTop: "0.25rem", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: MUTED, fontWeight: 600 }}>Max Uses (optional)</label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Leave blank for unlimited"
                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: 10, border: `1px solid ${BORDER}`, marginTop: "0.25rem", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", color: MUTED, fontWeight: 600 }}>Expires On (optional)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: 10, border: `1px solid ${BORDER}`, marginTop: "0.25rem", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.8rem", color: MUTED, fontWeight: 600 }}>
              Applicable Plans (leave unselected for all plans)
            </label>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
              {PLAN_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => togglePlan(p.value)}
                  style={{
                    padding: "0.4rem 0.9rem",
                    borderRadius: 20,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: selectedPlans.includes(p.value) ? PURPLE : CREAM,
                    color: selectedPlans.includes(p.value) ? "#fff" : MUTED,
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={saveCoupon}
            disabled={saving || !code.trim() || !discountValue}
            style={{
              padding: "0.7rem 1.5rem",
              borderRadius: 12,
              background: saving ? MUTED : OLIVE,
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.9rem",
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : editingId ? "Update Coupon" : "Create Coupon"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              style={{ marginLeft: "0.75rem", padding: "0.7rem 1.5rem", borderRadius: 12, background: "transparent", color: MUTED, fontWeight: 600, fontSize: "0.9rem", border: `1px solid ${BORDER}`, cursor: "pointer" }}
            >
              Cancel Edit
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <p style={{ color: MUTED }}>Loading coupons…</p>
        ) : coupons.length === 0 ? (
          <p style={{ color: MUTED }}>No coupons created yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {coupons.map((c) => (
              <div
                key={c.id}
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 14,
                  padding: "1rem 1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: CHARCOAL }}>
                    {c.code}{" "}
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        padding: "0.15rem 0.5rem",
                        borderRadius: 8,
                        background: c.active ? `${OLIVE}22` : `${RED}15`,
                        color: c.active ? OLIVE : RED,
                        marginLeft: "0.5rem",
                      }}
                    >
                      {c.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: MUTED, marginTop: "0.25rem" }}>
                    {c.discount_type === "percent" ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
                    {c.applicable_plans ? ` · ${c.applicable_plans}` : " · All plans"}
                    {c.max_uses ? ` · ${c.used_count}/${c.max_uses} used` : ` · ${c.used_count} used`}
                    {c.expires_at ? ` · Expires ${new Date(c.expires_at).toLocaleDateString()}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => startEdit(c)}
                    style={{ padding: "0.4rem 0.9rem", borderRadius: 10, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", background: CREAM, color: PURPLE, border: `1px solid ${BORDER}` }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(c.id, c.active)}
                    style={{
                      padding: "0.4rem 0.9rem",
                      borderRadius: 10,
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      background: CREAM,
                      color: CHARCOAL,
                      border: `1px solid ${BORDER}`,
                    }}
                  >
                    {c.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => deleteCoupon(c.id)}
                    style={{
                      padding: "0.4rem 0.9rem",
                      borderRadius: 10,
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      background: `${RED}15`,
                      color: RED,
                      border: "none",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
