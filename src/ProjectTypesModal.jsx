import { useState } from "react";
import { Modal } from "./Tracker";

const SWATCHES = ["#6366f1", "#8b5cf6", "#a855f7", "#c026d3", "#ec4899", "#0891b2", "#0284c7", "#059669", "#f59e0b", "#10b981", "#3b82f6", "#7c3aed"];
const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const blankDraft = () => ({
  label: "",
  price: 5000,
  color: SWATCHES[0],
  phases: [{ name: "Design", days: 2 }, { name: "Development", days: 2 }],
  milestones: [{ label: "Advance", icon: "🔑", pct: 50 }, { label: "On Completion", icon: "🚀", pct: 50 }],
});

const draftFromType = (t) => ({
  label: t.label,
  price: t.price,
  color: t.color,
  phases: t.phases.map(p => ({ ...p })),
  milestones: t.milestones.map(m => ({ ...m })),
});

export default function ProjectTypesModal({ types, onClose, onSave, onDelete }) {
  const [editingId, setEditingId] = useState(null); // null = not editing, "new" = creating, or a type id
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const startNew = () => { setEditingId("new"); setDraft(blankDraft()); };
  const startEdit = (t) => { setEditingId(t.id); setDraft(draftFromType(t)); };
  const cancelEdit = () => { setEditingId(null); setDraft(null); };

  const pctTotal = draft ? draft.milestones.reduce((s, m) => s + Number(m.pct || 0), 0) : 0;
  const canSaveDraft = draft && draft.label.trim() && draft.phases.length > 0 && draft.milestones.length > 0 && Math.round(pctTotal) === 100;

  const commitSave = async () => {
    setSaving(true);
    const ok = await onSave(editingId === "new" ? null : editingId, {
      label: draft.label.trim(),
      price: Number(draft.price) || 0,
      color: draft.color,
      phases: draft.phases.map(p => ({ name: p.name.trim() || "Phase", days: Math.max(1, Number(p.days) || 1) })),
      milestones: draft.milestones.map(m => ({ label: m.label.trim() || "Milestone", icon: m.icon || "💳", pct: Number(m.pct) || 0 })),
    });
    setSaving(false);
    if (ok) cancelEdit();
  };

  const inp = {
    width: "100%", background: "#0f1623", border: "1px solid #1e2d42", borderRadius: 8,
    padding: "8px 11px", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box",
  };
  const lbl = { fontSize: 11, color: "#64748b", marginBottom: 5, display: "block", fontWeight: 500 };

  return (
    <Modal title="⚙ Project Types" onClose={onClose} maxWidth={620}>
      {!editingId && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
            {types.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#64748b", fontSize: 13 }}>
                No project types yet. Create one to start adding projects.
              </div>
            )}
            {types.map(t => (
              <div key={t.id} className="wt-card" style={{ background: "#141e2e", border: "1px solid #1e2d42", borderLeft: `4px solid ${t.color}`, borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                    {fmt(t.price)} default · {t.phases.length} phases · {t.phases.reduce((s, p) => s + p.days, 0)}d total · {t.milestones.length} payment steps
                  </div>
                </div>
                <button className="wt-btn-ghost" onClick={() => startEdit(t)} style={{ background: "#1e2d42", border: "none", color: "#cbd5e1", padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Edit</button>
                <button className="wt-btn-danger" onClick={() => onDelete(t.id)} style={{ background: "#ef444422", border: "none", color: "#f87171", padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Delete</button>
              </div>
            ))}
          </div>
          <button className="wt-btn-primary" onClick={startNew} style={{ width: "100%", background: "#6366f1", color: "#fff", border: "none", borderRadius: 9, padding: 11, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            ＋ Add Project Type
          </button>
        </>
      )}

      {editingId && draft && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="wt-addform-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Type Name *</label>
              <input value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} placeholder="e.g. Landing Page" style={inp} autoFocus />
            </div>
            <div>
              <label style={lbl}>Default Price (₹)</label>
              <input type="number" value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} style={inp} />
            </div>
          </div>

          <div>
            <label style={lbl}>Color</label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {SWATCHES.map(c => (
                <button key={c} onClick={() => setDraft({ ...draft, color: c })} style={{
                  width: 26, height: 26, borderRadius: 7, background: c, border: draft.color === c ? "2px solid #fff" : "2px solid transparent",
                  cursor: "pointer", boxShadow: draft.color === c ? "0 0 0 2px #6366f1" : "none",
                }} />
              ))}
            </div>
          </div>

          {/* Phases editor */}
          <div>
            <label style={lbl}>Build Timeline Phases</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {draft.phases.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input value={p.name} onChange={e => {
                    const phases = draft.phases.map((x, j) => j === i ? { ...x, name: e.target.value } : x);
                    setDraft({ ...draft, phases });
                  }} placeholder="Phase name" style={{ ...inp, flex: 1 }} />
                  <input type="number" min={1} value={p.days} onChange={e => {
                    const phases = draft.phases.map((x, j) => j === i ? { ...x, days: e.target.value } : x);
                    setDraft({ ...draft, phases });
                  }} style={{ ...inp, width: 70, textAlign: "center" }} />
                  <span style={{ fontSize: 11, color: "#64748b", width: 24 }}>days</span>
                  <button className="wt-btn-ghost" onClick={() => setDraft({ ...draft, phases: draft.phases.filter((_, j) => j !== i) })} style={{ background: "#1e2d42", border: "none", color: "#94a3b8", width: 28, height: 28, borderRadius: 7, cursor: "pointer", fontSize: 14, flexShrink: 0 }}>×</button>
                </div>
              ))}
            </div>
            <button className="wt-btn-ghost" onClick={() => setDraft({ ...draft, phases: [...draft.phases, { name: "", days: 1 }] })} style={{ marginTop: 8, background: "#141e2e", border: "1px solid #1e2d42", color: "#94a3b8", padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              ＋ Add Phase
            </button>
          </div>

          {/* Milestones editor */}
          <div>
            <label style={lbl}>Payment Milestones <span style={{ color: Math.round(pctTotal) === 100 ? "#10b981" : "#f87171" }}>({Math.round(pctTotal)}% of 100%)</span></label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {draft.milestones.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input value={m.icon} onChange={e => {
                    const milestones = draft.milestones.map((x, j) => j === i ? { ...x, icon: e.target.value } : x);
                    setDraft({ ...draft, milestones });
                  }} style={{ ...inp, width: 44, textAlign: "center" }} />
                  <input value={m.label} onChange={e => {
                    const milestones = draft.milestones.map((x, j) => j === i ? { ...x, label: e.target.value } : x);
                    setDraft({ ...draft, milestones });
                  }} placeholder="Milestone name" style={{ ...inp, flex: 1 }} />
                  <input type="number" min={0} max={100} value={m.pct} onChange={e => {
                    const milestones = draft.milestones.map((x, j) => j === i ? { ...x, pct: e.target.value } : x);
                    setDraft({ ...draft, milestones });
                  }} style={{ ...inp, width: 70, textAlign: "center" }} />
                  <span style={{ fontSize: 11, color: "#64748b", width: 10 }}>%</span>
                  <button className="wt-btn-ghost" onClick={() => setDraft({ ...draft, milestones: draft.milestones.filter((_, j) => j !== i) })} style={{ background: "#1e2d42", border: "none", color: "#94a3b8", width: 28, height: 28, borderRadius: 7, cursor: "pointer", fontSize: 14, flexShrink: 0 }}>×</button>
                </div>
              ))}
            </div>
            <button className="wt-btn-ghost" onClick={() => setDraft({ ...draft, milestones: [...draft.milestones, { label: "", icon: "💳", pct: 0 }] })} style={{ marginTop: 8, background: "#141e2e", border: "1px solid #1e2d42", color: "#94a3b8", padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              ＋ Add Milestone
            </button>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="wt-btn-ghost" onClick={cancelEdit} style={{ flex: 1, background: "#141e2e", color: "#94a3b8", border: "1px solid #1e2d42", borderRadius: 9, padding: 11, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            <button className={canSaveDraft ? "wt-btn-primary" : ""} onClick={commitSave} disabled={!canSaveDraft || saving} style={{
              flex: 2, background: canSaveDraft ? "#6366f1" : "#1e1e3f", color: canSaveDraft ? "#fff" : "#4a4a7a",
              border: "none", borderRadius: 9, padding: 11, fontWeight: 700, fontSize: 14, cursor: canSaveDraft ? "pointer" : "not-allowed",
            }}>{saving ? "Saving…" : "Save Type"}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
