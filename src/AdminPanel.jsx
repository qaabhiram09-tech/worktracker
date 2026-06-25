import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { createIsolatedClient } from "./supabaseIsolatedClient";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function AdminPanel({ onSignOut }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadMembers = async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (!error) setMembers(data);
    setLoading(false);
  };

  useEffect(() => { loadMembers(); }, []);

  const addMember = async (e) => {
    e.preventDefault();
    setError("");
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    if (!email) { setError("Enter an email address."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setBusy(true);
    const iso = createIsolatedClient();

    const { data, error: signErr } = await iso.auth.signUp({ email, password });
    if (signErr) { setError(signErr.message); setBusy(false); return; }
    if (!data.session) {
      setError("Account created, but it needs email confirmation before it can be used. Turn off \"Confirm email\" in Supabase Auth settings to skip this.");
      setBusy(false);
      return;
    }

    const { error: profErr } = await iso.from("profiles").insert({ id: data.user.id, email, role: "member", status: "active" });
    if (profErr) { setError("Account created but profile setup failed: " + profErr.message); setBusy(false); return; }

    setForm({ email: "", password: "" });
    setBusy(false);
    loadMembers();
  };

  const toggleSuspend = async (m) => {
    const newStatus = m.status === "active" ? "suspended" : "active";
    const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", m.id);
    if (error) { alert("Failed to update: " + error.message); return; }
    loadMembers();
  };

  const deleteMember = async (m) => {
    if (!window.confirm(`Permanently delete ${m.email}? This removes ALL their projects and data and cannot be undone.`)) return;
    const { error: delProjErr } = await supabase.from("projects").delete().eq("user_id", m.id);
    if (delProjErr) { alert("Failed to delete their projects: " + delProjErr.message); return; }
    const { error: delProfErr } = await supabase.from("profiles").delete().eq("id", m.id);
    if (delProfErr) { alert("Projects deleted, but failed to remove profile: " + delProfErr.message); return; }
    loadMembers();
  };

  const inp = {
    width: "100%", background: "#141e2e", border: "1px solid #1e2d42", borderRadius: 9,
    padding: "10px 13px", color: "#e2e8f0", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box",
  };
  const lbl = { fontSize: 12, color: "#64748b", marginBottom: 6, display: "block", fontWeight: 500 };

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", minHeight: "100vh", color: "#f1f5f9" }}>
      {/* ── Header ── */}
      <header className="wt-header" style={{ background: "#0f1623", borderBottom: "1px solid #1e2d42", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, position: "sticky", top: 0, zIndex: 50, boxShadow: "0 1px 0 #00000040" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, flexShrink: 0, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>⚡</div>
          <span className="wt-title" style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px" }}>WorkTracker</span>
          <span className="wt-hide-mobile" style={{ color: "#475569", fontSize: 13 }}>/ Admin</span>
        </div>
        <button className="wt-btn-ghost" onClick={onSignOut} title="Sign out" style={{ background: "#1e2d42", border: "none", color: "#94a3b8", width: 34, height: 34, borderRadius: 9, fontSize: 14, cursor: "pointer" }}>⏻</button>
      </header>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: 28 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Members</div>
          <div style={{ color: "#64748b", fontSize: 13 }}>Add, suspend, or remove member accounts. Each member's projects are private to them.</div>
        </div>

        {/* Add Member */}
        <div style={{ background: "#0f1623", border: "1px solid #1e2d42", borderRadius: 13, padding: 20, marginBottom: 28 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>＋ Add Member</div>
          <form onSubmit={addMember} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 200px" }}>
              <label style={lbl}>Email</label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inp} placeholder="member@example.com" />
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <label style={lbl}>Password</label>
              <input type="text" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={inp} placeholder="At least 6 characters" />
            </div>
            <button type="submit" disabled={busy} className="wt-btn-primary" style={{
              background: "#6366f1", color: "#fff", border: "none", borderRadius: 9, padding: "10px 20px",
              fontWeight: 700, fontSize: 14, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1, whiteSpace: "nowrap",
            }}>
              {busy ? "Adding…" : "Add Member"}
            </button>
          </form>
          {error && (
            <div style={{ marginTop: 12, background: "#ef444422", color: "#f87171", border: "1px solid #ef444444", borderRadius: 8, padding: "9px 12px", fontSize: 12 }}>
              {error}
            </div>
          )}
        </div>

        {/* Members table */}
        {loading ? (
          <div style={{ color: "#64748b", fontSize: 13 }}>Loading members…</div>
        ) : (
          <div style={{ background: "#0f1623", border: "1px solid #1e2d42", borderRadius: 13, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", background: "#141e2e" }}>
                  <th style={{ padding: "12px 18px" }}>Email</th>
                  <th style={{ padding: "12px 18px" }}>Role</th>
                  <th style={{ padding: "12px 18px" }}>Status</th>
                  <th style={{ padding: "12px 18px" }}>Joined</th>
                  <th style={{ padding: "12px 18px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} className="wt-table-row" style={{ borderTop: "1px solid #1e2d42" }}>
                    <td style={{ padding: "13px 18px", fontWeight: 600 }}>{m.email}</td>
                    <td style={{ padding: "13px 18px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: m.role === "admin" ? "#6366f122" : "#1e2d42", color: m.role === "admin" ? "#818cf8" : "#94a3b8" }}>
                        {m.role}
                      </span>
                    </td>
                    <td style={{ padding: "13px 18px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: m.status === "active" ? "#064e3b33" : "#451a0333", color: m.status === "active" ? "#34d399" : "#fbbf24" }}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ padding: "13px 18px", color: "#64748b" }}>{fmtDate(m.created_at)}</td>
                    <td style={{ padding: "13px 18px", textAlign: "right" }}>
                      {m.role !== "admin" && (
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button className="wt-pill" onClick={() => toggleSuspend(m)} style={{
                            padding: "6px 12px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                            background: "#141e2e", color: m.status === "active" ? "#fbbf24" : "#34d399",
                          }}>
                            {m.status === "active" ? "Suspend" : "Unsuspend"}
                          </button>
                          <button className="wt-btn-danger" onClick={() => deleteMember(m)} style={{
                            padding: "6px 12px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                            background: "#ef444422", color: "#f87171",
                          }}>
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
