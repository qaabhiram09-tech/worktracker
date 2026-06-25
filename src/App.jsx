import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

// ─── Config ───────────────────────────────────────────────────────────────────

const PROJECT_CONFIGS = {
  cms:           { label: "CMS",                             price: 5000,  color: "#6366f1", totalDays: 7, phases: [{name:"Design",days:2},{name:"Corrections",days:2},{name:"Development",days:2},{name:"Bug Fix & Live",days:1}] },
  adv_cms_6000:  { label: "Advanced CMS ₹6000 (<10 pages)", price: 6000,  color: "#8b5cf6", totalDays: 7, phases: [{name:"Design",days:2},{name:"Corrections",days:2},{name:"Development",days:2},{name:"Bug Fix & Live",days:1}] },
  adv_cms_6500:  { label: "Advanced CMS ₹6500 (15 pages)",  price: 6500,  color: "#a855f7", totalDays: 7, phases: [{name:"Design",days:2},{name:"Corrections",days:2},{name:"Development",days:2},{name:"Bug Fix & Live",days:1}] },
  adv_cms_7000:  { label: "Advanced CMS ₹7000 (15+ pages)", price: 7000,  color: "#c026d3", totalDays: 7, phases: [{name:"Design",days:2},{name:"Corrections",days:2},{name:"Development",days:2},{name:"Bug Fix & Live",days:1}] },
  woocommerce:   { label: "WooCommerce (Guest Checkout)",    price: 10000, color: "#7c3aed", totalDays: 7, phases: [{name:"Design",days:2},{name:"Corrections",days:2},{name:"Development",days:2},{name:"Bug Fix & Live",days:1}] },
  shopify:       { label: "Shopify",                         price: 10000, color: "#0891b2", totalDays: 7, phases: [{name:"Design",days:2},{name:"Corrections",days:2},{name:"Development",days:2},{name:"Bug Fix & Live",days:1}] },
  adv_ecommerce: { label: "Advanced Ecommerce (User Accts)", price: 12000, color: "#0284c7", totalDays: 8, phases: [{name:"Design",days:2},{name:"Corrections",days:2},{name:"Development",days:3},{name:"Bug Fix & Live",days:1}] },
  html:          { label: "HTML Website",                    price: 5000,  color: "#059669", totalDays: 4, phases: [{name:"Design",days:1},{name:"Corrections",days:1},{name:"Development",days:1},{name:"Bug Fix & Live",days:1}] },
  custom:        { label: "Custom Project Type",              price: 5000,  color: "#ec4899", totalDays: 7, phases: [{name:"Design",days:2},{name:"Corrections",days:2},{name:"Development",days:2},{name:"Bug Fix & Live",days:1}] },
};

const typeLabel = (p) => (p.type === "custom" && p.customLabel) ? p.customLabel : PROJECT_CONFIGS[p.type]?.label;

const MILESTONE_DEFS = [
  { key: "advance", label: "Advance",      pct: 20, icon: "🔑" },
  { key: "design",  label: "After Design", pct: 20, icon: "🎨" },
  { key: "live",    label: "After Live",   pct: 60, icon: "🚀" },
];

const PHASE_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6"];

const fmt  = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
const tod  = () => new Date().toISOString().split("T")[0];
const fmtD = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const rowToProject = (row) => ({
  id:         row.id,
  clientName: row.client_name,
  type:       row.type,
  customLabel: row.custom_label || "",
  price:      Number(row.price),
  startDate:  row.start_date,
  notes:      row.notes || "",
  status:     row.status,
  createdAt:  new Date(row.created_at).getTime(),
  phases: (row.project_phases || [])
    .sort((a, b) => a.position - b.position)
    .map(ph => ({ id: ph.id, name: ph.name, days: ph.days, completed: ph.completed, completedDate: ph.completed_date })),
  payments: (row.project_payments || []).map(pm => ({
    id: pm.id, key: pm.key, label: pm.label, icon: pm.icon, pct: Number(pm.pct), amount: Number(pm.amount), paid: pm.paid, paidDate: pm.paid_date,
  })),
});

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [tab,      setTab]      = useState("all");
  const [showAdd,  setShowAdd]  = useState(false);
  const [search,   setSearch]   = useState("");
  const [form, setForm] = useState({ clientName: "", type: "cms", customLabel: "", price: 5000, startDate: tod(), notes: "" });
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, project_phases(*), project_payments(*)")
        .order("created_at", { ascending: false });
      if (error) { console.error(error); setLoading(false); return; }
      setProjects(data.map(rowToProject));
      setLoading(false);
    })();
  }, []);

  // ── Actions ──

  const addProject = async () => {
    const cfg = PROJECT_CONFIGS[form.type];
    const price = Number(form.price);

    const { data: proj, error } = await supabase
      .from("projects")
      .insert({
        client_name: form.clientName.trim() || "Unnamed Client",
        type: form.type,
        custom_label: form.type === "custom" ? (form.customLabel.trim() || "Custom Project") : null,
        price,
        start_date: form.startDate,
        notes: form.notes,
        status: "active",
      })
      .select()
      .single();
    if (error) { alert("Failed to create project: " + error.message); return; }

    const phaseRows   = cfg.phases.map((ph, i) => ({ project_id: proj.id, position: i, name: ph.name, days: ph.days, completed: false, completed_date: null }));
    const paymentRows = MILESTONE_DEFS.map(m => ({ project_id: proj.id, key: m.key, label: m.label, icon: m.icon, pct: m.pct, amount: Math.round(price * m.pct / 100), paid: false, paid_date: null }));

    const [{ data: phases, error: phErr }, { data: payments, error: pmErr }] = await Promise.all([
      supabase.from("project_phases").insert(phaseRows).select(),
      supabase.from("project_payments").insert(paymentRows).select(),
    ]);
    if (phErr || pmErr) alert("Project created, but phases/payments failed to save.");

    const p = rowToProject({ ...proj, project_phases: phases || [], project_payments: payments || [] });
    setProjects(prev => [p, ...prev]);
    setShowAdd(false);
    setSelected(p.id);
    setForm({ clientName: "", type: "cms", customLabel: "", price: 5000, startDate: tod(), notes: "" });
  };

  const togglePhase = async (projId, idx) => {
    const proj = projects.find(p => p.id === projId);
    const ph = proj.phases[idx];
    const completed = !ph.completed;
    const completedDate = completed ? tod() : null;

    const phases = proj.phases.map((x, i) => i === idx ? { ...x, completed, completedDate } : x);
    const allDone = phases.every(x => x.completed);
    const newStatus = allDone ? "completed" : proj.status === "completed" ? "active" : proj.status;

    const updates = [supabase.from("project_phases").update({ completed, completed_date: completedDate }).eq("id", ph.id)];
    if (newStatus !== proj.status) updates.push(supabase.from("projects").update({ status: newStatus }).eq("id", projId));
    const results = await Promise.all(updates);
    if (results.some(r => r.error)) { alert("Failed to update phase."); return; }

    setProjects(projects.map(p => p.id === projId ? { ...p, phases, status: newStatus } : p));
  };

  const togglePayment = async (projId, key) => {
    const proj = projects.find(p => p.id === projId);
    const pm = proj.payments.find(x => x.key === key);
    const paid = !pm.paid;
    const paidDate = paid ? tod() : null;

    const { error } = await supabase.from("project_payments").update({ paid, paid_date: paidDate }).eq("id", pm.id);
    if (error) { alert("Failed to update payment: " + error.message); return; }

    setProjects(projects.map(p => {
      if (p.id !== projId) return p;
      const payments = p.payments.map(x => x.key === key ? { ...x, paid, paidDate } : x);
      return { ...p, payments };
    }));
  };

  const updatePaymentAmount = async (projId, key, rawAmount) => {
    const proj = projects.find(p => p.id === projId);
    if (!proj) return;
    const price = proj.price;

    const target = proj.payments.find(x => x.key === key);
    if (!target || target.paid) return;

    const paidOthers   = proj.payments.filter(x => x.key !== key && x.paid);
    const unpaidOthers = proj.payments.filter(x => x.key !== key && !x.paid);
    const paidSum = paidOthers.reduce((s, x) => s + x.amount, 0);
    const room = Math.max(0, price - paidSum);

    let newAmount = Math.round(Number(rawAmount));
    if (!Number.isFinite(newAmount) || newAmount < 0) newAmount = 0;
    if (newAmount > room) newAmount = room;

    const remaining = room - newAmount;

    let redistributed = [];
    if (unpaidOthers.length > 0) {
      const currentSum = unpaidOthers.reduce((s, x) => s + x.amount, 0);
      redistributed = unpaidOthers.map((x, i) => {
        if (i === unpaidOthers.length - 1) return x;
        const share = currentSum > 0 ? remaining * (x.amount / currentSum) : remaining / unpaidOthers.length;
        return { ...x, amount: Math.round(share) };
      });
      const usedSoFar = redistributed.slice(0, -1).reduce((s, x) => s + x.amount, 0);
      const last = unpaidOthers[unpaidOthers.length - 1];
      redistributed[redistributed.length - 1] = { ...last, amount: remaining - usedSoFar };
    }

    const updatedPayments = proj.payments.map(x => {
      if (x.key === key) return { ...x, amount: newAmount };
      const r = redistributed.find(o => o.key === x.key);
      return r ? { ...x, amount: r.amount } : x;
    }).map(x => ({ ...x, pct: price ? Math.round((x.amount / price) * 1000) / 10 : 0 }));

    const results = await Promise.all(
      updatedPayments.map(pm => supabase.from("project_payments").update({ amount: pm.amount, pct: pm.pct }).eq("id", pm.id))
    );
    if (results.some(r => r.error)) { alert("Failed to update payment amount."); return; }

    setProjects(projects.map(p => p.id === projId ? { ...p, payments: updatedPayments } : p));
  };

  const setStatus = async (projId, status) => {
    const { error } = await supabase.from("projects").update({ status }).eq("id", projId);
    if (error) { alert("Failed to update status: " + error.message); return; }
    setProjects(projects.map(p => p.id === projId ? { ...p, status } : p));
  };

  const deleteProject = async (projId) => {
    if (!window.confirm("Delete this project permanently?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", projId);
    if (error) { alert("Failed to delete: " + error.message); return; }
    setProjects(projects.filter(p => p.id !== projId));
    setSelected(null);
  };

  const saveNotes = async (projId, notes) => {
    const { error } = await supabase.from("projects").update({ notes }).eq("id", projId);
    if (error) { alert("Failed to save notes: " + error.message); return; }
    setProjects(projects.map(p => p.id === projId ? { ...p, notes } : p));
  };

  // ── Derived ──

  const sel      = projects.find(p => p.id === selected) || null;
  const filtered = projects.filter(p =>
    (tab === "all" || p.status === tab) &&
    (search === "" || p.clientName.toLowerCase().includes(search.toLowerCase()) || typeLabel(p).toLowerCase().includes(search.toLowerCase()))
  );

  const totalCollected = projects.reduce((s, p) => s + p.payments.filter(pm => pm.paid).reduce((ss, pm) => ss + pm.amount, 0), 0);
  const totalPending   = projects.reduce((s, p) => s + p.payments.filter(pm => !pm.paid).reduce((ss, pm) => ss + pm.amount, 0), 0);
  const activeCount    = projects.filter(p => p.status === "active").length;
  const completedCount = projects.filter(p => p.status === "completed").length;
  const holdCount      = projects.filter(p => p.status === "on_hold").length;

  // ── Render ──

  if (loading) {
    return (
      <div style={{ fontFamily: "'Inter',system-ui,sans-serif", minHeight: "100vh", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
        Loading projects…
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", minHeight: "100vh", color: "#f1f5f9" }}>

      {/* ── Header ── */}
      <header className="wt-header" style={{ background: "#0f1623", borderBottom: "1px solid #1e2d42", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, position: "sticky", top: 0, zIndex: 50, boxShadow: "0 1px 0 #00000040" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div style={{ width: 34, height: 34, flexShrink: 0, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, boxShadow: "0 4px 12px -4px #6366f199" }}>⚡</div>
          <span className="wt-title" style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px", whiteSpace: "nowrap" }}>WorkTracker</span>
          <span className="wt-hide-mobile" style={{ color: "#475569", fontSize: 13, whiteSpace: "nowrap" }}>/ Freelance CRM</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            className="wt-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            style={{ background: "#141e2e", border: "1px solid #1e2d42", borderRadius: 9, padding: "8px 13px", color: "#e2e8f0", fontSize: 13, width: 200 }}
          />
          <button className="wt-btn-primary" onClick={() => setShowAdd(true)} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 9, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            ＋ New<span className="wt-hide-mobile"> Project</span>
          </button>
        </div>
      </header>

      {/* ── Stats Bar ── */}
      <div className="wt-stats" style={{ background: "#0f1623", borderBottom: "1px solid #1e2d42", padding: "16px 28px", display: "flex", gap: 10, overflowX: "auto" }}>
        {[
          { label: "Total Projects", val: projects.length,    icon: "📁", color: "#6366f1" },
          { label: "Active",         val: activeCount,        icon: "🔄", color: "#3b82f6" },
          { label: "Completed",      val: completedCount,     icon: "✅", color: "#10b981" },
          { label: "On Hold",        val: holdCount,          icon: "⏸", color: "#f59e0b" },
          { label: "Collected",      val: fmt(totalCollected),icon: "💰", color: "#10b981" },
          { label: "Pending",        val: fmt(totalPending),  icon: "⏳", color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} className="wt-stat-item" style={{ flex: "1 1 140px", minWidth: 110, background: "#141e2e", borderRadius: 12, padding: "12px 16px", border: "1px solid #1e2d42" }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* ── Main Layout ── */}
      <div className="wt-mainlayout" style={{ display: "flex", height: "calc(100vh - 129px)" }}>

        {/* ── Left: Project List ── */}
        {(!isMobile || !sel) && (
          <div className="wt-list-panel" style={{ width: sel && !isMobile ? 360 : "100%", flexShrink: 0, display: "flex", flexDirection: "column", borderRight: sel && !isMobile ? "1px solid #1e2d42" : "none", transition: "width 0.2s" }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, padding: "14px 18px", background: "#0f1623", borderBottom: "1px solid #1e2d42" }}>
              {[["all","All"],["active","Active"],["completed","Done"],["on_hold","Hold"]].map(([k, l]) => (
                <button key={k} className="wt-pill" onClick={() => setTab(k)} style={{
                  padding: "6px 13px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                  background: tab === k ? "#6366f1" : "#141e2e",
                  color:      tab === k ? "#fff"    : "#64748b",
                }}>
                  {l} ({k === "all" ? projects.length : k === "active" ? activeCount : k === "completed" ? completedCount : holdCount})
                </button>
              ))}
            </div>

            {/* Cards */}
            <div className="wt-list-cards" style={{ flex: 1, overflowY: "auto", padding: sel && !isMobile ? "14px" : "20px", display: "grid", gridTemplateColumns: sel && !isMobile ? "1fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: 14, alignContent: "start" }}>
              {filtered.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "#475569" }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>No projects yet</div>
                  <div style={{ fontSize: 13 }}>Click <strong style={{ color: "#818cf8" }}>+ New Project</strong> to get started</div>
                </div>
              )}
              {filtered.map(p => (
                <ProjectCard key={p.id} project={p} selected={selected === p.id} onClick={() => setSelected(selected === p.id ? null : p.id)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Right: Detail Panel ── */}
        {sel && (
          <div className="wt-detail" style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            <ProjectDetail
              project={sel}
              onTogglePhase={(i) => togglePhase(sel.id, i)}
              onTogglePayment={(k) => togglePayment(sel.id, k)}
              onUpdatePaymentAmount={(k, amt) => updatePaymentAmount(sel.id, k, amt)}
              onSetStatus={(s) => setStatus(sel.id, s)}
              onDelete={() => deleteProject(sel.id)}
              onSaveNotes={(n) => saveNotes(sel.id, n)}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>

      {/* ── Add Modal ── */}
      {showAdd && (
        <Modal onClose={() => setShowAdd(false)} title="New Project">
          <AddForm form={form} setForm={setForm} onSave={addProject} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project: p, selected, onClick }) {
  const cfg            = PROJECT_CONFIGS[p.type];
  const completedCount = p.phases.filter(ph => ph.completed).length;
  const phasePct       = Math.round((completedCount / p.phases.length) * 100);
  const collected      = p.payments.filter(pm => pm.paid).reduce((s, pm) => s + pm.amount, 0);
  const pending        = p.payments.filter(pm => !pm.paid).reduce((s, pm) => s + pm.amount, 0);
  const statusCfg      = {
    active:    { bg: "#1e3a5f22", text: "#60a5fa", label: "Active" },
    completed: { bg: "#064e3b22", text: "#34d399", label: "Completed" },
    on_hold:   { bg: "#451a0322", text: "#fbbf24", label: "On Hold" },
  }[p.status];

  return (
    <div className="wt-card" onClick={onClick} style={{
      background:    selected ? "#1a2744" : "#141e2e",
      borderTop:     `1px solid ${selected ? "#6366f1" : "#1e2d42"}`,
      borderRight:   `1px solid ${selected ? "#6366f1" : "#1e2d42"}`,
      borderBottom:  `1px solid ${selected ? "#6366f1" : "#1e2d42"}`,
      borderLeft:    `4px solid ${selected ? "#6366f1" : cfg.color}`,
      borderRadius:  14, padding: 18, cursor: "pointer",
      boxShadow:     selected ? "0 0 0 2px #6366f133" : "0 1px 0 #00000030",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{p.clientName}</div>
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: cfg.color + "22", color: cfg.color }}>{typeLabel(p)}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 9px", borderRadius: 6, background: statusCfg.bg, color: statusCfg.text, whiteSpace: "nowrap" }}>{statusCfg.label}</span>
      </div>

      <div style={{ fontSize: 21, fontWeight: 800, color: "#e2e8f0", marginBottom: 12 }}>{fmt(p.price)}</div>

      {/* Phase build meter */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginBottom: 6 }}>
          <span>Build Progress</span>
          <span style={{ color: phasePct === 100 ? "#10b981" : "#94a3b8" }}>{completedCount}/{p.phases.length} phases · {phasePct}%</span>
        </div>
        <div style={{ height: 6, background: "#1e2d42", borderRadius: 3, overflow: "hidden", display: "flex" }}>
          {p.phases.map((ph, i) => (
            <div key={i} style={{
              flex: ph.days,
              background:   ph.completed ? PHASE_COLORS[i] : "transparent",
              borderRight:  i < p.phases.length - 1 ? "1px solid #080d17" : "none",
              transition:   "background 0.3s",
            }} />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Stat label="Collected" val={fmt(collected)} color="#10b981" bg="#06403022" />
        <Stat label="Pending"   val={fmt(pending)}   color="#f59e0b" bg="#451a0322" />
        <Stat label="Timeline"  val={`${cfg.totalDays}d`} color="#818cf8" bg="#1e1a4222" />
      </div>
    </div>
  );
}

function Stat({ label, val, color, bg }) {
  return (
    <div style={{ flex: 1, background: bg, borderRadius: 8, padding: "7px 9px" }}>
      <div style={{ fontSize: 10, color: "#64748b" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color }}>{val}</div>
    </div>
  );
}

// ─── Project Detail ───────────────────────────────────────────────────────────

function ProjectDetail({ project: p, onTogglePhase, onTogglePayment, onUpdatePaymentAmount, onSetStatus, onDelete, onSaveNotes, onClose }) {
  const [notes,        setNotes]        = useState(p.notes || "");
  const [notesChanged, setNotesChanged] = useState(false);
  const [editingKey,   setEditingKey]   = useState(null);
  const [editValue,    setEditValue]    = useState("");

  // Sync if project changes externally
  useEffect(() => { setNotes(p.notes || ""); setNotesChanged(false); }, [p.id, p.notes]);
  useEffect(() => { setEditingKey(null); }, [p.id]);

  const startEdit = (pm) => { setEditingKey(pm.key); setEditValue(String(pm.amount)); };
  const commitEdit = () => {
    if (editValue.trim() !== "") onUpdatePaymentAmount(editingKey, Number(editValue));
    setEditingKey(null);
  };

  const cfg       = PROJECT_CONFIGS[p.type];
  const collected = p.payments.filter(pm => pm.paid).reduce((s, pm) => s + pm.amount, 0);
  const phasePct  = Math.round((p.phases.filter(ph => ph.completed).length / p.phases.length) * 100);
  const deadline  = (() => { const d = new Date(p.startDate + "T00:00:00"); d.setDate(d.getDate() + cfg.totalDays); return fmtD(d.toISOString().split("T")[0]); })();

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 26, gap: 16, flexWrap: "wrap" }}>
        <div>
          <button className="wt-btn-ghost" onClick={onClose} style={{ background: "#1e2d42", border: "none", color: "#94a3b8", padding: "5px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer", marginBottom: 12 }}>← Back</button>
          <div style={{ fontSize: 23, fontWeight: 800, marginBottom: 6 }}>{p.clientName}</div>
          <div style={{ display: "inline-block", fontSize: 12, fontWeight: 600, padding: "4px 11px", borderRadius: 20, background: cfg.color + "22", color: cfg.color, marginBottom: 8 }}>{typeLabel(p)}</div>
          <div style={{ color: "#64748b", fontSize: 13 }}>Started {fmtD(p.startDate)} · Est. delivery {deadline}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 27, fontWeight: 800, color: "#e2e8f0" }}>{fmt(p.price)}</div>
          <div style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>{fmt(collected)} collected</div>
        </div>
      </div>

      {/* Status + Delete */}
      <div style={{ background: "#0f1623", borderRadius: 12, padding: 16, marginBottom: 22, border: "1px solid #1e2d42", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "#64748b", marginRight: 4 }}>Status:</span>
        {[["active","🔄 Active","#3b82f6"],["on_hold","⏸ On Hold","#f59e0b"],["completed","✅ Completed","#10b981"]].map(([s, l, c]) => (
          <button key={s} className="wt-pill" onClick={() => onSetStatus(s)} style={{
            padding: "6px 13px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
            background: p.status === s ? c + "33" : "#141e2e",
            color:      p.status === s ? c        : "#64748b",
            outline:    p.status === s ? `1px solid ${c}44` : "none",
          }}>{l}</button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <button className="wt-btn-danger" onClick={onDelete} style={{ background: "#ef444422", color: "#f87171", border: "none", padding: "6px 13px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🗑 Delete</button>
        </div>
      </div>

      {/* Phase Timeline */}
      <Section title="Build Timeline" icon="🛠">
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
            <span>Overall Progress</span>
            <span style={{ color: phasePct === 100 ? "#10b981" : "#94a3b8", fontWeight: 600 }}>{phasePct}%</span>
          </div>
          <div style={{ height: 8, background: "#1e2d42", borderRadius: 4, overflow: "hidden", display: "flex" }}>
            {p.phases.map((ph, i) => (
              <div key={i} style={{
                flex: ph.days,
                background:  ph.completed ? PHASE_COLORS[i] : "transparent",
                borderRight: i < p.phases.length - 1 ? "2px solid #080d17" : "none",
                transition:  "background 0.3s",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", marginTop: 4 }}>
            {p.phases.map((ph, i) => (
              <div key={i} style={{ flex: ph.days, fontSize: 9, color: ph.completed ? PHASE_COLORS[i] : "#475569", textAlign: "center" }}>{ph.days}d</div>
            ))}
          </div>
        </div>
        {p.phases.map((ph, i) => (
          <div key={i} className="wt-phase-row" onClick={() => onTogglePhase(i)} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 15px",
            background:  ph.completed ? "#0f2918" : "#141e2e",
            border:      `1px solid ${ph.completed ? "#10b98133" : "#1e2d42"}`,
            borderRadius: 9, cursor: "pointer", marginBottom: 9, transition: "all 0.15s", userSelect: "none",
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background:  ph.completed ? "#10b981" : "#1e2d42",
              border:      `2px solid ${ph.completed ? "#10b981" : "#334155"}`,
              fontSize: 12, color: "#fff", fontWeight: 700, transition: "all 0.2s",
            }}>{ph.completed ? "✓" : ""}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: ph.completed ? "#6ee7b7" : "#e2e8f0" }}>{ph.name}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{ph.days} {ph.days === 1 ? "day" : "days"}{ph.completedDate ? ` · Done ${fmtD(ph.completedDate)}` : ""}</div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: ph.completed ? "#10b981" : PHASE_COLORS[i] }} />
          </div>
        ))}
      </Section>

      {/* Payment Milestones */}
      <Section title="Payment Milestones" icon="💳">
        {p.payments.map((pm) => (
          <div key={pm.key} className="wt-pay-row" style={{
            display: "flex", alignItems: "center", gap: 14, padding: "13px 17px",
            background:   pm.paid ? "#064e3b22" : "#141e2e",
            border:       `1px solid ${pm.paid ? "#10b98144" : "#1e2d42"}`,
            borderRadius: 11, transition: "all 0.2s", marginBottom: 9,
          }}>
            <div style={{ fontSize: 24 }}>{pm.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{pm.label}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{pm.pct}% of project{pm.paidDate ? ` · Received ${fmtD(pm.paidDate)}` : ""}</div>
            </div>

            {editingKey === pm.key ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 4 }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>₹</span>
                <input
                  type="number" min={0} max={p.price} autoFocus
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingKey(null); }}
                  style={{ width: 92, background: "#0f1623", border: "1px solid #6366f1", borderRadius: 7, padding: "6px 9px", color: "#e2e8f0", fontSize: 14, textAlign: "right" }}
                />
                <button className="wt-btn-ghost" onClick={() => setEditingKey(null)} style={{ background: "#1e2d42", border: "none", color: "#94a3b8", width: 28, height: 28, borderRadius: 7, cursor: "pointer", fontSize: 14 }}>×</button>
                <button className="wt-btn-primary" onClick={commitEdit} style={{ background: "#6366f1", border: "none", color: "#fff", width: 28, height: 28, borderRadius: 7, cursor: "pointer", fontSize: 13 }}>✓</button>
              </div>
            ) : (
              <div
                onClick={() => !pm.paid && startEdit(pm)}
                title={pm.paid ? "" : `Edit amount (max ${fmt(p.price)})`}
                style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 8, cursor: pm.paid ? "default" : "pointer" }}
              >
                <div style={{ fontSize: 20, fontWeight: 800, color: pm.paid ? "#10b981" : "#e2e8f0" }}>{fmt(pm.amount)}</div>
                {!pm.paid && <span style={{ fontSize: 12, color: "#475569" }}>✎</span>}
              </div>
            )}

            <button className="wt-pill" onClick={() => onTogglePayment(pm.key)} style={{
              padding: "7px 15px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
              background: pm.paid ? "#064e3b" : "#6366f122",
              color:      pm.paid ? "#10b981" : "#818cf8",
              outline:    pm.paid ? "1px solid #10b98144" : "1px solid #6366f133",
            }}>{pm.paid ? "✓ Paid" : "Mark Paid"}</button>
          </div>
        ))}
        <div style={{ marginTop: 6, background: "#141e2e", borderRadius: 9, padding: "12px 16px", display: "flex", gap: 18, border: "1px solid #1e2d42" }}>
          {[["Total Value", fmt(p.price), "#e2e8f0"],["Collected", fmt(collected), "#10b981"],["Remaining", fmt(p.price - collected), "#f59e0b"]].map(([l, v, c]) => (
            <div key={l} style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#64748b" }}>{l}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Notes */}
      <Section title="Notes" icon="📝">
        <textarea
          value={notes}
          onChange={e => { setNotes(e.target.value); setNotesChanged(e.target.value !== (p.notes || "")); }}
          placeholder="Client details, domain, hosting info, login credentials, special requirements…"
          style={{
            width: "100%", minHeight: 110, background: "#141e2e", border: "1px solid #1e2d42",
            borderRadius: 9, padding: 13, color: "#e2e8f0", fontSize: 13, resize: "vertical",
            fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.6,
          }}
        />
        {notesChanged && (
          <button className="wt-btn-primary" onClick={() => { onSaveNotes(notes); setNotesChanged(false); }} style={{
            marginTop: 10, background: "#6366f1", color: "#fff", border: "none",
            borderRadius: 8, padding: "8px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}>Save Notes</button>
        )}
      </Section>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, icon, children }) {
  return (
    <div style={{ marginBottom: 22, background: "#0f1623", borderRadius: 13, border: "1px solid #1e2d42", overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #1e2d42", display: "flex", alignItems: "center", gap: 9 }}>
        <span>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="wt-backdrop" style={{ position: "fixed", inset: 0, background: "#000000bb", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div className="wt-modal-card" style={{ background: "#0f1623", border: "1px solid #1e2d42", borderRadius: 18, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px #00000080" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #1e2d42" }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
          <button className="wt-btn-ghost" onClick={onClose} style={{ background: "#1e2d42", border: "none", color: "#94a3b8", width: 30, height: 30, borderRadius: 7, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Add Form ─────────────────────────────────────────────────────────────────

function AddForm({ form, setForm, onSave, onCancel }) {
  const cfg      = PROJECT_CONFIGS[form.type];
  const payments = MILESTONE_DEFS.map(m => ({ ...m, amount: Math.round(form.price * m.pct / 100) }));
  const canSave  = form.clientName.trim() && (form.type !== "custom" || form.customLabel.trim());

  const inp = {
    width: "100%", background: "#141e2e", border: "1px solid #1e2d42", borderRadius: 9,
    padding: "10px 13px", color: "#e2e8f0", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box",
  };
  const lbl = { fontSize: 12, color: "#64748b", marginBottom: 6, display: "block", fontWeight: 500 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={lbl}>Client Name *</label>
        <input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} placeholder="e.g. Rajesh Traders, ABC Boutique" style={inp} autoFocus />
      </div>

      <div>
        <label style={lbl}>Project Type</label>
        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, price: PROJECT_CONFIGS[e.target.value].price })} style={{ ...inp, cursor: "pointer" }}>
          {Object.entries(PROJECT_CONFIGS).map(([k, v]) => (
            <option key={k} value={k}>{v.label} — {fmt(v.price)}</option>
          ))}
        </select>
      </div>

      {form.type === "custom" && (
        <div>
          <label style={lbl}>Custom Type Name *</label>
          <input value={form.customLabel} onChange={e => setForm({ ...form, customLabel: e.target.value })} placeholder="e.g. Landing Page, Mobile App, SEO Package" style={inp} />
        </div>
      )}

      <div className="wt-addform-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={lbl}>Project Price (₹)</label>
          <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={inp} />
        </div>
        <div>
          <label style={lbl}>Start Date</label>
          <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={inp} />
        </div>
      </div>

      {/* Preview */}
      <div style={{ background: "#141e2e", borderRadius: 11, padding: 14, border: "1px solid #1e2d42" }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>📋 Payment Breakdown</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {payments.map(m => (
            <div key={m.key} style={{ flex: 1, background: "#0f1623", borderRadius: 8, padding: "9px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>{m.icon} {m.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#818cf8" }}>{fmt(m.amount)}</div>
              <div style={{ fontSize: 10, color: "#475569" }}>{m.pct}%</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#64748b" }}>
          <span>⏱ {cfg.totalDays} working days total</span>
          <span>📐 {cfg.phases.length} phases</span>
        </div>
      </div>

      <div>
        <label style={lbl}>Notes (optional)</label>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Domain, hosting info, client contact…" style={{ ...inp, minHeight: 60, resize: "vertical", lineHeight: 1.5 }} />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button className="wt-btn-ghost" onClick={onCancel} style={{ flex: 1, background: "#141e2e", color: "#94a3b8", border: "1px solid #1e2d42", borderRadius: 9, padding: 11, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Cancel</button>
        <button className={canSave ? "wt-btn-primary" : ""} onClick={onSave} disabled={!canSave} style={{
          flex: 2, background: canSave ? "#6366f1" : "#1e1e3f", color: canSave ? "#fff" : "#4a4a7a",
          border: "none", borderRadius: 9, padding: 11, fontWeight: 700, fontSize: 14, cursor: canSave ? "pointer" : "not-allowed",
        }}>Add Project →</button>
      </div>
    </div>
  );
}
