import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  };

  const inp = {
    width: "100%", background: "#141e2e", border: "1px solid #1e2d42", borderRadius: 9,
    padding: "10px 13px", color: "#e2e8f0", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box",
  };
  const lbl = { fontSize: 12, color: "#64748b", marginBottom: 6, display: "block", fontWeight: 500 };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter',system-ui,sans-serif", color: "#f1f5f9" }}>
      <div style={{ width: "100%", maxWidth: 360, background: "#0f1623", border: "1px solid #1e2d42", borderRadius: 18, padding: 28, boxShadow: "0 25px 60px #00000080" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 34, height: 34, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>⚡</div>
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px" }}>WorkTracker</span>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={lbl}>Email</label>
            <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} style={inp} placeholder="you@example.com" />
          </div>
          <div>
            <label style={lbl}>Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={inp} placeholder="••••••••" />
          </div>

          {error && (
            <div style={{ background: "#ef444422", color: "#f87171", border: "1px solid #ef444444", borderRadius: 8, padding: "9px 12px", fontSize: 12 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={busy} className="wt-btn-primary" style={{
            marginTop: 4, background: "#6366f1", color: "#fff", border: "none", borderRadius: 9,
            padding: 11, fontWeight: 700, fontSize: 14, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1,
          }}>
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
