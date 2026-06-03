import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  LayoutDashboard, Network, Table2, Plus, X, Download, Upload,
  CheckCircle2, AlertTriangle, Users, Trash2, Mail, Phone, Search,
  RefreshCw, Cloud, CloudOff, FileText, Image as ImageIcon, UserPlus,
  Link2, Move, Maximize2
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from "recharts";

const SHEET_URL = "https://script.google.com/macros/s/AKfycbx2j4ItP0EhRT1q7fIfNpBgsL4nxAGcJBTr6N4qAfrMcx6nAnGUChwI6Fh5Y5UpK1jQ8A/exec";

const STATUS = {
  not_started: { label: "Chưa thực hiện", color: "#94a3b8" },
  in_progress: { label: "Đang thực hiện", color: "#3b82f6" },
  pending_review: { label: "Đang chờ duyệt", color: "#f59e0b" },
  done: { label: "Hoàn thành", color: "#10b981" },
  overdue: { label: "Quá hạn", color: "#ef4444" },
  paused: { label: "Tạm dừng", color: "#8b5cf6" },
};
const STATUS_KEYS = Object.keys(STATUS);
const uid = () => Math.random().toString(36).slice(2, 9);
const NODE_W = 260;
const LINK_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

// Bảng màu tông xanh dịu (lam → lá), đậm đến nhạt, app tự gán theo thứ tự cấp
const TIER_PALETTE = [
  { bg: "linear-gradient(135deg,#0c4a6e,#0369a1)", solid: "#0c4a6e", soft: "#e0f2fe", text: "#0c4a6e" }, // xanh lam đậm nhất
  { bg: "linear-gradient(135deg,#0369a1,#0ea5e9)", solid: "#0369a1", soft: "#e0f2fe", text: "#075985" }, // xanh lam
  { bg: "linear-gradient(135deg,#0891b2,#22d3ee)", solid: "#0891b2", soft: "#cffafe", text: "#0e7490" }, // xanh cyan
  { bg: "linear-gradient(135deg,#0d9488,#2dd4bf)", solid: "#0d9488", soft: "#ccfbf1", text: "#0f766e" }, // xanh ngọc (lam-lá)
  { bg: "linear-gradient(135deg,#059669,#34d399)", solid: "#059669", soft: "#d1fae5", text: "#047857" }, // xanh lá
  { bg: "linear-gradient(135deg,#65a30d,#a3e635)", solid: "#65a30d", soft: "#ecfccb", text: "#4d7c0f" }, // xanh lá nhạt
];
const tierColor = (i) => TIER_PALETTE[i % TIER_PALETTE.length];

// Vị trí có x,y. Liên kết tách riêng (cho phép 2 sếp 1 nhân viên)
const seed = {
  orgName: "Dự án mới",
  logo: null,
  tiers: [
    { id: "tier1", name: "Giám đốc" },
    { id: "tier2", name: "Quản lý" },
    { id: "tier3", name: "Nhân viên" },
  ],
  positions: [
    { id: "pos1", title: "Ban Giám đốc", x: 360, y: 40, tierId: "tier1", members: [
      { id: "m1", name: "LE TIN", email: "tin.lehoang32@gmail.com", phone: "0900000000", avatar: null, plan: "", issue: "",
        tasks: [
          { id: "t1", title: "Thiết lập cấu trúc dự án", status: "done", deadline: "2026-06-10", note: "Khởi tạo" },
          { id: "t2", title: "Phân quyền nhân sự", status: "in_progress", deadline: "2026-06-15", note: "" },
        ] },
    ] },
    { id: "pos2", title: "Phòng Kinh doanh", x: 80, y: 320, tierId: "tier2", members: [
      { id: "m2", name: "Nguyễn An", email: "an.nguyen@example.com", phone: "0911111111", avatar: null, plan: "", issue: "",
        tasks: [
          { id: "t3", title: "Lập kế hoạch quý 2", status: "pending_review", deadline: "2026-06-08", note: "Chờ duyệt" },
          { id: "t4", title: "Báo cáo doanh số", status: "overdue", deadline: "2026-05-28", note: "Trễ" },
        ] },
      { id: "m3", name: "Lê Cường", email: "cuong.le@example.com", phone: "0933333333", avatar: null, plan: "", issue: "",
        tasks: [{ id: "t8", title: "Chăm sóc khách VIP", status: "in_progress", deadline: "2026-06-18", note: "" }] },
    ] },
    { id: "pos3", title: "Phòng Marketing", x: 640, y: 320, tierId: "tier2", members: [
      { id: "m4", name: "Trần Bình", email: "binh.tran@example.com", phone: "0922222222", avatar: null, plan: "", issue: "",
        tasks: [
          { id: "t5", title: "Thiết kế campaign", status: "in_progress", deadline: "2026-06-20", note: "" },
          { id: "t6", title: "Đăng bài social", status: "not_started", deadline: "2026-06-25", note: "" },
          { id: "t7", title: "Tổng hợp insight", status: "done", deadline: "2026-06-01", note: "" },
        ] },
    ] },
  ],
  links: [
    { id: "l1", from: "pos1", to: "pos2", style: "solid", color: "#3b82f6", label: "" },
    { id: "l2", from: "pos1", to: "pos3", style: "solid", color: "#3b82f6", label: "" },
  ],
};

const STORAGE_KEY = "quanly_congviec_data";

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const d = JSON.parse(saved);
      if (d && d.positions) return d;
    }
  } catch (e) { /* localStorage không khả dụng (vd trong sandbox) */ }
  return seed;
}

export default function App() {
  const [view, setView] = useState("org");
  const [data, setData] = useState(loadData);
  const [cloudState, setCloudState] = useState("idle"); // idle | loading | loaded | err
  const [selected, setSelected] = useState(null);
  const [selMember, setSelMember] = useState(null); // {posId, memberId}
  const [syncState, setSyncState] = useState("idle");
  const [autoSync, setAutoSync] = useState(true);
  const fileRef = useRef(null);
  const logoRef = useRef(null);

  const { orgName, logo, positions, links } = data;
  const tiers = data.tiers || [];
  const setPositions = (fn) => setData((d) => ({ ...d, positions: typeof fn === "function" ? fn(d.positions) : fn }));
  const setLinks = (fn) => setData((d) => ({ ...d, links: typeof fn === "function" ? fn(d.links) : fn }));
  const setOrgName = (v) => setData((d) => ({ ...d, orgName: v }));
  const setLogo = (v) => setData((d) => ({ ...d, logo: v }));
  const setTiers = (fn) => setData((d) => ({ ...d, tiers: typeof fn === "function" ? fn(d.tiers || []) : fn }));
  const addTier = () => setTiers((ts) => [...ts, { id: uid(), name: "Cấp mới" }]);
  const updateTier = (id, name) => setTiers((ts) => ts.map((t) => (t.id === id ? { ...t, name } : t)));
  const removeTier = (id) => { setTiers((ts) => ts.filter((t) => t.id !== id)); setPositions((ps) => ps.map((p) => (p.tierId === id ? { ...p, tierId: null } : p))); };

  const selectedPos = positions.find((p) => p.id === selected);
  const selMemberData = selMember ? (() => { const p = positions.find((x) => x.id === selMember.posId); const m = p && p.members.find((x) => x.id === selMember.memberId); return m ? { ...m, posTitle: p.title, posId: p.id } : null; })() : null;

  const allMembers = useMemo(() => positions.flatMap((p) => p.members.map((m) => ({ ...m, posTitle: p.title, posId: p.id }))), [positions]);
  const allTasks = useMemo(() => allMembers.flatMap((m) => m.tasks.map((t) => ({ ...t, owner: m.name, posTitle: m.posTitle }))), [allMembers]);
  const statusCounts = useMemo(() => { const c = Object.fromEntries(STATUS_KEYS.map((k) => [k, 0])); allTasks.forEach((t) => { c[t.status]++; }); return c; }, [allTasks]);
  const overallPct = allTasks.length ? Math.round((statusCounts.done / allTasks.length) * 100) : 0;

  const syncToSheet = async (d = data) => {
    setSyncState("syncing");
    try {
      await fetch(SHEET_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(d) });
      setSyncState("ok"); setTimeout(() => setSyncState("idle"), 2500);
    } catch { setSyncState("err"); setTimeout(() => setSyncState("idle"), 3500); }
  };
  // Tải dữ liệu từ Google Sheet khi mở app (đồng bộ 2 chiều)
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setCloudState("loading");
      try {
        const res = await fetch(SHEET_URL + "?action=read&t=" + Date.now());
        const json = await res.json();
        if (!cancelled && json && json.positions) {
          setData(json);
          setCloudState("loaded");
        } else { setCloudState("idle"); }
      } catch (e) { if (!cancelled) setCloudState("err"); }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line
  }, []);

  // Tự lưu vào trình duyệt — reload không mất dữ liệu (dự phòng offline)
  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* sandbox chặn */ }
  }, [data]);

  React.useEffect(() => {
    if (cloudState === "loading") return; // chưa tải xong thì chưa ghi, tránh ghi đè Sheet
    if (autoSync) { const t = setTimeout(() => syncToSheet(data), 1200); return () => clearTimeout(t); }
  }, [data, autoSync, cloudState]);

  // Position CRUD
  const addPosition = () => {
    const np = { id: uid(), title: "Vị trí mới", x: 200 + Math.random() * 200, y: 200 + Math.random() * 120, members: [] };
    setPositions((p) => [...p, np]); setSelected(np.id);
  };
  const updatePosition = (id, patch) => setPositions((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const movePosition = (id, x, y) => setPositions((ps) => ps.map((p) => (p.id === id ? { ...p, x, y } : p)));
  const removePosition = (id) => { setPositions((ps) => ps.filter((p) => p.id !== id)); setLinks((ls) => ls.filter((l) => l.from !== id && l.to !== id)); setSelected(null); };

  // Link CRUD
  const addLink = (from, to) => {
    if (from === to) return;
    setLinks((ls) => ls.some((l) => l.from === from && l.to === to) ? ls : [...ls, { id: uid(), from, to, style: "solid", color: "#3b82f6", label: "" }]);
  };
  const updateLink = (id, patch) => setLinks((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLink = (id) => setLinks((ls) => ls.filter((l) => l.id !== id));

  // Member/Task CRUD
  const addMember = (posId) => { const pos = positions.find((p) => p.id === posId); updatePosition(posId, { members: [...pos.members, { id: uid(), name: "Nhân viên mới", email: "email@example.com", phone: "0000000000", avatar: null, plan: "", issue: "", tasks: [] }] }); };
  const updateMember = (posId, mId, patch) => { const pos = positions.find((p) => p.id === posId); updatePosition(posId, { members: pos.members.map((m) => (m.id === mId ? { ...m, ...patch } : m)) }); };
  const removeMember = (posId, mId) => { const pos = positions.find((p) => p.id === posId); updatePosition(posId, { members: pos.members.filter((m) => m.id !== mId) }); };
  const addTask = (posId, mId) => { const pos = positions.find((p) => p.id === posId); const m = pos.members.find((x) => x.id === mId); updateMember(posId, mId, { tasks: [...m.tasks, { id: uid(), title: "Công việc mới", status: "not_started", deadline: "", note: "" }] }); };
  const updateTask = (posId, mId, tId, patch) => { const pos = positions.find((p) => p.id === posId); const m = pos.members.find((x) => x.id === mId); updateMember(posId, mId, { tasks: m.tasks.map((t) => (t.id === tId ? { ...t, ...patch } : t)) }); };
  const removeTask = (posId, mId, tId) => { const pos = positions.find((p) => p.id === posId); const m = pos.members.find((x) => x.id === mId); updateMember(posId, mId, { tasks: m.tasks.filter((t) => t.id !== tId) }); };

  const handleLogo = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => setLogo(ev.target.result); r.readAsDataURL(f); };

  const exportExcel = () => {
    const rows = [["Vị trí", "Nhân viên", "Email", "SĐT", "Công việc", "Trạng thái", "Deadline", "Ghi chú"]];
    positions.forEach((p) => p.members.forEach((m) => {
      if (!m.tasks.length) rows.push([p.title, m.name, m.email, m.phone, "", "", "", ""]);
      m.tasks.forEach((t) => rows.push([p.title, m.name, m.email, m.phone, t.title, STATUS[t.status].label, t.deadline, t.note]));
    }));
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })); a.download = "BaoCao_" + new Date().toISOString().slice(0, 10) + ".csv"; a.click();
  };
  const exportJSON = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); a.download = "backup.json"; a.click(); };
  const importJSON = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { try { const d = JSON.parse(ev.target.result); if (d.positions) setData({ orgName: d.orgName || "Dự án", logo: d.logo || null, positions: d.positions.map((p) => ({ x: 200, y: 200, ...p })), links: d.links || [] }); } catch { alert("File không hợp lệ"); } }; r.readAsText(f); };
  const exportReport = () => openReport({ orgName, logo, positions, allTasks, statusCounts, overallPct, allMembers });

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#f1f5f9", minHeight: "100vh", color: "#0f172a" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
        @keyframes gradientMove{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .landing-hero{background:linear-gradient(120deg,#0c4a6e,#0369a1,#0891b2,#0d9488);background-size:300% 300%;animation:gradientMove 12s ease infinite}
        .blob{position:absolute;border-radius:50%;filter:blur(8px);animation:floatY 7s ease-in-out infinite}
        .fade-up{animation:fadeUp .8s cubic-bezier(.2,.8,.2,1) both}
        .app-tab{transition:all .2s}
        .app-tab:hover{background:#f1f5f9!important}
      `}</style>

      {/* ===== LANDING ngắn phía trên ===== */}
      <div className="landing-hero" style={{ position: "relative", color: "#fff", padding: "70px 28px 80px", overflow: "hidden", textAlign: "center" }}>
        <div className="blob" style={{ width: 200, height: 200, background: "rgba(255,255,255,.08)", top: -40, left: "12%" }} />
        <div className="blob" style={{ width: 150, height: 150, background: "rgba(255,255,255,.07)", bottom: -30, right: "15%", animationDelay: "2s" }} />
        <div className="blob" style={{ width: 90, height: 90, background: "rgba(255,255,255,.06)", top: "40%", right: "30%", animationDelay: "4s" }} />
        <div style={{ position: "relative", maxWidth: 760, margin: "0 auto" }}>
          {logo && <img src={logo} alt="logo" className="fade-up" style={{ width: 64, height: 64, borderRadius: 16, objectFit: "cover", background: "#fff", padding: 4, marginBottom: 18 }} />}
          <h1 className="fade-up" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 44, fontWeight: 800, letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 14 }}>{orgName}</h1>
          <p className="fade-up" style={{ fontSize: 17, color: "#bae6fd", maxWidth: 540, margin: "0 auto 28px", animationDelay: ".1s", lineHeight: 1.6 }}>
            Quản lý dự án, sơ đồ tổ chức và tiến độ công việc — trực quan, đồng bộ thời gian thực.
          </p>
          <div className="fade-up" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", animationDelay: ".2s" }}>
            <button onClick={() => document.getElementById("app-section").scrollIntoView({ behavior: "smooth" })} style={{ background: "#fff", color: "#0369a1", border: "none", padding: "14px 30px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", boxShadow: "0 8px 24px rgba(0,0,0,.18)" }}>Vào ứng dụng →</button>
            <button onClick={exportReport} style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.35)", padding: "14px 26px", borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: "pointer" }}>Xem báo cáo</button>
          </div>
          {/* 3 điểm nổi bật */}
          <div className="fade-up" style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap", marginTop: 44, animationDelay: ".3s" }}>
            {[{ icon: Network, t: "Sơ đồ kéo-thả", d: "Thiết kế tổ chức trực quan" }, { icon: LayoutDashboard, t: "Dashboard", d: "Thống kê thời gian thực" }, { icon: Cloud, t: "Đồng bộ cloud", d: "Truy cập mọi thiết bị" }].map((f, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.1)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,.18)", borderRadius: 16, padding: "18px 22px", width: 200, textAlign: "left" }}>
                <f.icon size={24} color="#fff" />
                <div style={{ fontWeight: 700, fontSize: 15, marginTop: 10 }}>{f.t}</div>
                <div style={{ fontSize: 12, color: "#bae6fd", marginTop: 3 }}>{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="app-section" />
      <div style={{ background: "linear-gradient(135deg,#1e40af,#3b82f6)", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 20px rgba(30,64,175,.25)", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div onClick={() => logoRef.current.click()} title="Tải logo tổ chức" style={{ width: 46, height: 46, borderRadius: 10, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", border: "1px dashed rgba(255,255,255,.4)" }}>
            {logo ? <img src={logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color="#fff" />}
          </div>
          <input ref={logoRef} type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
          <div>
            <input value={orgName} onChange={(e) => setOrgName(e.target.value)} style={{ background: "none", border: "none", outline: "none", color: "#fff", fontWeight: 700, fontSize: 18 }} />
            <div style={{ color: "#bfdbfe", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              Project & Org Management
              {cloudState === "loading" && <span style={{ color: "#fde68a" }}>• đang tải từ cloud...</span>}
              {cloudState === "loaded" && <span style={{ color: "#86efac" }}>• đã tải từ cloud</span>}
              {cloudState === "err" && <span style={{ color: "#fca5a5" }}>• không kết nối được cloud (dùng dữ liệu cục bộ)</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={exportReport} style={btn("#10b981")}><FileText size={15} /> Báo cáo HTML</button>
          <button onClick={() => syncToSheet()} style={btn(syncState === "ok" ? "#10b981" : syncState === "err" ? "#ef4444" : "rgba(255,255,255,.18)")}>
            <RefreshCw size={15} style={{ animation: syncState === "syncing" ? "spin 1s linear infinite" : "none" }} />
            {syncState === "syncing" ? "Đang gửi" : syncState === "ok" ? "Đã đồng bộ" : syncState === "err" ? "Lỗi" : "Đồng bộ Sheet"}
          </button>
          <button onClick={() => setAutoSync((a) => !a)} style={btn(autoSync ? "#10b981" : "rgba(255,255,255,.18)")}>{autoSync ? <Cloud size={15} /> : <CloudOff size={15} />} Auto {autoSync ? "ON" : "OFF"}</button>
          <button onClick={exportExcel} style={btn("rgba(255,255,255,.18)")}><Download size={15} /> Excel</button>
          <button onClick={exportJSON} style={btn("rgba(255,255,255,.18)")}><Download size={15} /> Backup</button>
          <button onClick={() => fileRef.current.click()} style={btn("rgba(255,255,255,.18)")}><Upload size={15} /> Khôi phục</button>
          <button onClick={() => { if (window.confirm("Xóa toàn bộ dữ liệu và làm lại từ đầu? Hành động này không hoàn tác được.")) { try { localStorage.removeItem(STORAGE_KEY); } catch (e) {} setData(seed); } }} style={btn("rgba(255,255,255,.18)")}><Trash2 size={15} /> Làm lại</button>
          <input ref={fileRef} type="file" accept=".json" onChange={importJSON} style={{ display: "none" }} />
        </div>
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      </div>

      <div style={{ display: "flex", gap: 4, padding: "14px 28px 0", background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
        {[{ k: "org", label: "Sơ đồ tổ chức", icon: Network }, { k: "dashboard", label: "Dashboard", icon: LayoutDashboard }, { k: "data", label: "Bảng dữ liệu", icon: Table2 }].map((t) => (
          <button key={t.k} className="app-tab" onClick={() => setView(t.k)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "12px 20px", border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: view === t.k ? "#0369a1" : "#64748b", borderBottom: view === t.k ? "3px solid #0891b2" : "3px solid transparent", marginBottom: -1, borderRadius: "8px 8px 0 0" }}>
            <t.icon size={17} /> {t.label}
          </button>
        ))}
      </div>

      {view === "org" && <OrgCanvas positions={positions} links={links} tiers={tiers} onSelect={setSelected} onSelectMember={(posId, memberId) => setSelMember({ posId, memberId })} onAdd={addPosition} onMove={movePosition} onAddLink={addLink} onUpdateLink={updateLink} onRemoveLink={removeLink} onAddTier={addTier} onUpdateTier={updateTier} onRemoveTier={removeTier} />}
      {view === "dashboard" && <div style={{ padding: 28 }}><Dashboard positions={positions} statusCounts={statusCounts} overallPct={overallPct} allTasks={allTasks} allMembers={allMembers} /></div>}
      {view === "data" && <div style={{ padding: 28 }}><DataTable positions={positions} onSelect={setSelected} /></div>}

      {selectedPos && (
        <PositionModal pos={selectedPos} tiers={tiers} onClose={() => setSelected(null)}
          onUpdatePos={(patch) => updatePosition(selectedPos.id, patch)} onRemovePos={() => removePosition(selectedPos.id)}
          onAddMember={() => addMember(selectedPos.id)} onUpdateMember={(mId, patch) => updateMember(selectedPos.id, mId, patch)} onRemoveMember={(mId) => removeMember(selectedPos.id, mId)}
          onOpenMember={(mId) => { setSelected(null); setSelMember({ posId: selectedPos.id, memberId: mId }); }} />
      )}

      {selMemberData && (
        <MemberModal m={selMemberData} posTitle={selMemberData.posTitle} onClose={() => setSelMember(null)}
          onUpdate={(patch) => updateMember(selMember.posId, selMember.memberId, patch)}
          onAddTask={() => addTask(selMember.posId, selMember.memberId)}
          onUpdateTask={(tId, patch) => updateTask(selMember.posId, selMember.memberId, tId, patch)}
          onRemoveTask={(tId) => removeTask(selMember.posId, selMember.memberId, tId)}
          onReport={(mem) => openMemberReport({ member: mem, posTitle: selMemberData.posTitle })} />
      )}
    </div>
  );
}

const btn = (bg) => ({ display: "flex", alignItems: "center", gap: 6, background: bg, color: "#fff", border: "none", padding: "9px 13px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer" });

function Avatar({ m, size = 44 }) {
  if (m.avatar) return <img src={m.avatar} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  const initials = (m.name || "?").split(" ").map((w) => w[0]).slice(-2).join("").toUpperCase();
  return <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#1e40af)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.34, flexShrink: 0 }}>{initials}</div>;
}

// ============ ORG CANVAS (kéo-thả + nối tay) ============
function OrgCanvas({ positions, links, tiers, onSelect, onSelectMember, onAdd, onMove, onAddLink, onUpdateLink, onRemoveLink, onAddTier, onUpdateTier, onRemoveTier }) {
  const tierIndex = (id) => tiers.findIndex((t) => t.id === id);
  const tierOf = (p) => { const i = tierIndex(p.tierId); return i >= 0 ? { ...tiers[i], color: tierColor(i) } : null; };
  const [showTiers, setShowTiers] = useState(false);
  const canvasRef = useRef(null);
  const [drag, setDrag] = useState(null);       // {id, dx, dy} kéo khối
  const [connect, setConnect] = useState(null);  // {from, x, y} đang kéo dây nối
  const [selLink, setSelLink] = useState(null);   // link đang chọn để sửa
  const heights = useRef({});

  const nodeH = (p) => 70 + p.members.length * 46;

  const pointFromEvent = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: cx, y: cy };
  };

  const onMouseMove = useCallback((e) => {
    if (drag) { const { x, y } = pointFromEvent(e); onMove(drag.id, x - drag.dx, y - drag.dy); }
    else if (connect) { const { x, y } = pointFromEvent(e); setConnect((c) => ({ ...c, x, y })); }
  }, [drag, connect, onMove]);

  const onMouseUp = useCallback((e) => {
    if (connect) {
      // tìm khối đích dưới con trỏ
      const { x, y } = pointFromEvent(e);
      const target = positions.find((p) => { const h = nodeH(p); return x >= p.x && x <= p.x + NODE_W && y >= p.y && y <= p.y + h; });
      if (target && target.id !== connect.from) onAddLink(connect.from, target.id);
    }
    setDrag(null); setConnect(null);
  }, [connect, positions, onAddLink]);

  // anchor: điểm nối (giữa dưới = out, giữa trên = in)
  const anchorOut = (p) => ({ x: p.x + NODE_W / 2, y: p.y + nodeH(p) });
  const anchorIn = (p) => ({ x: p.x + NODE_W / 2, y: p.y });

  const pathFor = (from, to) => {
    const a = anchorOut(from), b = anchorIn(to);
    const my = (a.y + b.y) / 2;
    return "M " + a.x + " " + a.y + " C " + a.x + " " + my + ", " + b.x + " " + my + ", " + b.x + " " + b.y;
  };

  const byId = (id) => positions.find((p) => p.id === id);

  return (
    <div style={{ position: "relative" }}>
      {/* toolbar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 28px", background: "#fff", borderBottom: "1px solid #e2e8f0", flexWrap: "wrap" }}>
        <button onClick={onAdd} style={{ ...btn("#3b82f6") }}><Plus size={15} /> Thêm vị trí</button>
        <button onClick={() => setShowTiers((s) => !s)} style={{ ...btn(showTiers ? "#0369a1" : "#64748b") }}><Network size={15} /> Quản lý cấp</button>
        {/* chú thích màu cấp */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginLeft: 4 }}>
          {tiers.map((t, i) => <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#475569" }}><span style={{ width: 14, height: 14, borderRadius: 4, background: tierColor(i).solid }} />{t.name}</span>)}
        </div>
        <span style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}><Move size={13} /> Kéo khối • <Link2 size={13} /> Kéo chấm để nối • <Maximize2 size={13} /> Bấm đường nối để sửa</span>
      </div>

      {/* panel quản lý cấp */}
      {showTiers && (
        <div style={{ padding: "14px 28px", background: "#f0f9ff", borderBottom: "1px solid #bae6fd" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0c4a6e" }}>Các cấp phân loại (màu tự gán theo thứ tự)</div>
            <button onClick={onAddTier} style={{ ...btn("#0369a1"), padding: "6px 11px" }}><Plus size={14} /> Thêm cấp</button>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {tiers.map((t, i) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #bae6fd", borderRadius: 10, padding: "6px 10px" }}>
                <span style={{ width: 18, height: 18, borderRadius: 5, background: tierColor(i).solid, flexShrink: 0 }} />
                <input value={t.name} onChange={(e) => onUpdateTier(t.id, e.target.value)} style={{ border: "none", outline: "none", fontSize: 13, fontWeight: 600, width: 120 }} />
                <button onClick={() => onRemoveTier(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 size={14} /></button>
              </div>
            ))}
            {tiers.length === 0 && <span style={{ color: "#7dd3fc", fontSize: 13 }}>Chưa có cấp nào. Bấm "Thêm cấp".</span>}
          </div>
        </div>
      )}

      <div ref={canvasRef} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onClick={() => setSelLink(null)}
        style={{ position: "relative", height: "calc(100vh - 230px)", overflow: "auto", background: "radial-gradient(#cbd9ec 1.2px, transparent 1.2px), linear-gradient(180deg,#f8fafc,#eef2f9)", backgroundSize: "24px 24px, 100% 100%" }}>
        {/* SVG đường nối */}
        <svg style={{ position: "absolute", top: 0, left: 0, width: 2400, height: 1600, pointerEvents: "none" }}>
          <defs>
            {LINK_COLORS.map((c) => <marker key={c} id={"arr" + c.slice(1)} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill={c} /></marker>)}
          </defs>
          {links.map((l) => { const f = byId(l.from), t = byId(l.to); if (!f || !t) return null;
            return (
              <g key={l.id} style={{ pointerEvents: "all", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setSelLink(l.id); }}>
                <path d={pathFor(f, t)} fill="none" stroke={l.color} strokeWidth={selLink === l.id ? 4 : 2.5} strokeDasharray={l.style === "dashed" ? "7 5" : "0"} markerEnd={"url(#arr" + l.color.slice(1) + ")"} opacity={selLink === l.id ? 1 : 0.85} />
                {l.label && (() => { const a = anchorOut(f), b = anchorIn(t); const mx = (a.x + b.x) / 2, mItem = (a.y + b.y) / 2; return <g><rect x={mx - l.label.length * 3.6 - 6} y={mItem - 10} width={l.label.length * 7.2 + 12} height={20} rx={10} fill="#fff" stroke={l.color} /><text x={mx} y={mItem + 4} textAnchor="middle" fontSize="11" fill={l.color} fontWeight="600">{l.label}</text></g>; })()}
              </g>
            );
          })}
          {/* dây đang kéo */}
          {connect && (() => { const f = byId(connect.from); const a = anchorOut(f); return <path d={"M " + a.x + " " + a.y + " L " + connect.x + " " + connect.y} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="5 4" />; })()}
        </svg>

        {/* các khối vị trí */}
        {positions.map((p) => {
          const tasks = p.members.flatMap((m) => m.tasks);
          const done = tasks.filter((t) => t.status === "done").length;
          return (
            <div key={p.id} style={{ position: "absolute", left: p.x, top: p.y, width: NODE_W }}>
              <div
                onMouseDown={(e) => { if (e.target.dataset.handle) return; const { x, y } = pointFromEvent(e); setDrag({ id: p.id, dx: x - p.x, dy: y - p.y }); }}
                onClick={(e) => { e.stopPropagation(); if (!drag) onSelect(p.id); }}
                style={{ background: "#fff", borderRadius: 14, boxShadow: "0 4px 16px rgba(15,23,42,.1)", border: "1px solid #e2e8f0", cursor: "grab", overflow: "hidden", userSelect: "none" }}>
                <div style={{ background: (tierOf(p) ? tierOf(p).color.bg : "linear-gradient(135deg,#eff6ff,#dbeafe)"), padding: "9px 14px", fontSize: 13, fontWeight: 700, color: (tierOf(p) ? "#fff" : "#1e40af"), textAlign: "center", display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}><Network size={14} /> {p.title}</div>
                <div style={{ padding: 12 }}>
                  {p.members.length === 0 && <div style={{ textAlign: "center", color: "#cbd5e1", fontSize: 12, padding: 8 }}>Chưa có nhân viên</div>}
                  {p.members.map((m) => (
                    <div key={m.id} data-handle="1" onClick={(e) => { e.stopPropagation(); if (!drag) onSelectMember(p.id, m.id); }}
                      title="Bấm xem chi tiết công việc"
                      style={{ display: "flex", gap: 10, alignItems: "center", padding: "5px 4px", borderBottom: "1px solid #f1f5f9", borderRadius: 6, cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <Avatar m={m} size={34} />
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div><div style={{ fontSize: 10, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.email}</div></div>
                      <span style={{ fontSize: 10, background: "#eff6ff", color: "#1e40af", padding: "1px 6px", borderRadius: 20, fontWeight: 600 }}>{m.tasks.length}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>{tierOf(p) ? <span style={{ color: tierOf(p).color.text, fontWeight: 600, background: tierOf(p).color.soft, padding: "2px 8px", borderRadius: 20 }}>{tierOf(p).name}</span> : <span style={{ color: "#cbd5e1" }}>Chưa phân cấp</span>}{tasks.length > 0 && <span style={{ color: "#10b981", fontWeight: 600 }}>{Math.round((done / tasks.length) * 100)}%</span>}</div>
                </div>
              </div>
              {/* chấm nối (out) */}
              <div data-handle="1" title="Kéo để nối sang khối khác"
                onMouseDown={(e) => { e.stopPropagation(); const { x, y } = pointFromEvent(e); setConnect({ from: p.id, x, y }); }}
                style={{ position: "absolute", left: NODE_W / 2 - 8, bottom: -10, width: 16, height: 16, borderRadius: "50%", background: "#3b82f6", border: "3px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,.2)", cursor: "crosshair" }} />
            </div>
          );
        })}
      </div>

      {/* bảng sửa link */}
      {selLink && (() => { const l = links.find((x) => x.id === selLink); if (!l) return null;
        return (
          <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#fff", borderRadius: 14, boxShadow: "0 8px 30px rgba(0,0,0,.18)", border: "1px solid #e2e8f0", padding: 14, display: "flex", gap: 14, alignItems: "center", zIndex: 40 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#1e40af" }}>Đường nối</span>
            <select value={l.style} onChange={(e) => onUpdateLink(l.id, { style: e.target.value })} style={{ padding: "6px 9px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}>
              <option value="solid">Nét liền (trực tiếp)</option>
              <option value="dashed">Nét đứt (hỗ trợ)</option>
            </select>
            <div style={{ display: "flex", gap: 5 }}>{LINK_COLORS.map((c) => <div key={c} onClick={() => onUpdateLink(l.id, { color: c })} style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: l.color === c ? "3px solid #0f172a" : "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,.2)" }} />)}</div>
            <input value={l.label} onChange={(e) => onUpdateLink(l.id, { label: e.target.value })} placeholder="Nhãn (vd: báo cáo)" style={{ padding: "6px 9px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, width: 140 }} />
            <button onClick={() => { onRemoveLink(l.id); setSelLink(null); }} style={{ ...btn("#ef4444"), padding: "7px 11px" }}><Trash2 size={14} /> Xóa</button>
            <button onClick={() => setSelLink(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={18} /></button>
          </div>
        );
      })()}
    </div>
  );
}

// ============ DASHBOARD ============
function Dashboard({ positions, statusCounts, overallPct, allTasks, allMembers }) {
  const pieData = STATUS_KEYS.map((k) => ({ name: STATUS[k].label, value: statusCounts[k], color: STATUS[k].color })).filter((d) => d.value > 0);
  const posData = positions.map((p) => ({ name: p.title.length > 12 ? p.title.slice(0, 12) + "…" : p.title, "Tổng việc": p.members.flatMap((m) => m.tasks).length, "Hoàn thành": p.members.flatMap((m) => m.tasks).filter((t) => t.status === "done").length }));
  const cards = [
    { label: "Vị trí", value: positions.length, color: "#3b82f6", icon: Network },
    { label: "Nhân viên", value: allMembers.length, color: "#8b5cf6", icon: Users },
    { label: "Hoàn thành", value: statusCounts.done, color: "#10b981", icon: CheckCircle2 },
    { label: "Quá hạn", value: statusCounts.overdue, color: "#ef4444", icon: AlertTriangle },
  ];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 16, marginBottom: 20 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 10px rgba(15,23,42,.05)", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: 13, color: "#64748b" }}>{c.label}</div><div style={{ fontSize: 30, fontWeight: 800, color: c.color }}>{c.value}</div></div>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: c.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}><c.icon size={24} color={c.color} /></div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16, marginBottom: 16 }}>
        <Panel title="Cơ cấu trạng thái nhiệm vụ">
          {pieData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.value}>{pieData.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer>
          )}
        </Panel>
        <Panel title="Khối lượng công việc theo vị trí">
          <ResponsiveContainer width="100%" height={260}><BarChart data={posData}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 12 }} allowDecimals={false} /><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="Tổng việc" fill="#3b82f6" radius={[4, 4, 0, 0]} /><Bar dataKey="Hoàn thành" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
        </Panel>
      </div>
      <Panel title="Tiến độ hoàn thành tổng thể">
        <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "10px 0" }}>
          <div style={{ fontSize: 44, fontWeight: 800, color: "#1e40af" }}>{overallPct}%</div>
          <div style={{ flex: 1 }}><div style={{ height: 16, background: "#e2e8f0", borderRadius: 20, overflow: "hidden" }}><div style={{ width: overallPct + "%", height: "100%", background: "linear-gradient(90deg,#3b82f6,#10b981)", borderRadius: 20 }} /></div><div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>{statusCounts.done}/{allTasks.length} công việc đã hoàn thành</div></div>
        </div>
      </Panel>
    </div>
  );
}
function Panel({ title, children }) { return <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 10px rgba(15,23,42,.05)", border: "1px solid #e2e8f0" }}><div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{title}</div>{children}</div>; }
const Empty = () => <div style={{ textAlign: "center", color: "#94a3b8", padding: 60 }}>Chưa có dữ liệu</div>;

// ============ DATA TABLE ============
function DataTable({ positions, onSelect }) {
  const [q, setQ] = useState("");
  const rows = positions.flatMap((p) => p.members.length ? p.members.flatMap((m) => m.tasks.length ? m.tasks.map((t) => ({ p, m, t })) : [{ p, m, t: null }]) : [{ p, m: null, t: null }]);
  const filtered = rows.filter(({ p, m, t }) => (p.title + (m ? m.name : "") + (t ? t.title : "")).toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 10px rgba(15,23,42,.05)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <div style={{ padding: 16, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}><Search size={18} color="#94a3b8" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm vị trí, nhân viên, công việc..." style={{ border: "none", outline: "none", fontSize: 14, flex: 1 }} /></div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ background: "#f8fafc", color: "#64748b", textAlign: "left" }}>{["Vị trí", "Nhân viên", "Công việc", "Trạng thái", "Deadline", "Ghi chú"].map((h) => <th key={h} style={{ padding: "12px 16px", fontWeight: 600, fontSize: 12, textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(({ p, m, t }, i) => (
              <tr key={i} onClick={() => onSelect(p.id)} style={{ borderTop: "1px solid #f1f5f9", cursor: "pointer" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px 16px", fontWeight: 600, color: "#1e40af" }}>{p.title}</td>
                <td style={{ padding: "12px 16px" }}>{m ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar m={m} size={28} /> {m.name}</span> : <span style={{ color: "#cbd5e1" }}>— trống —</span>}</td>
                <td style={{ padding: "12px 16px" }}>{t ? t.title : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                <td style={{ padding: "12px 16px" }}>{t && <Badge status={t.status} />}</td>
                <td style={{ padding: "12px 16px", color: "#64748b" }}>{t ? t.deadline : "-"}</td>
                <td style={{ padding: "12px 16px", color: "#64748b" }}>{t ? t.note : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function Badge({ status }) { const s = STATUS[status]; return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: s.color + "18", color: s.color, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color }} />{s.label}</span>; }

// ============ POSITION MODAL ============
function PositionModal({ pos, tiers, onClose, onUpdatePos, onRemovePos, onAddMember, onUpdateMember, onRemoveMember, onOpenMember }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, width: "min(640px,100%)", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <div style={{ background: "linear-gradient(135deg,#1e40af,#3b82f6)", padding: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <Network size={26} color="#fff" />
          <input value={pos.title} onChange={(e) => onUpdatePos({ title: e.target.value })} style={{ background: "none", border: "none", outline: "none", color: "#fff", fontSize: 20, fontWeight: 700, flex: 1 }} />
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.2)", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
        </div>
        <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: 12, background: "#f8fafc", borderRadius: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Cấp phân loại:</span>
            <select value={pos.tierId || ""} onChange={(e) => onUpdatePos({ tierId: e.target.value || null })} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, fontWeight: 600 }}>
              <option value="">— Chưa phân cấp —</option>
              {(tiers || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Nhân viên ({pos.members.length})</div>
            <button onClick={onAddMember} style={{ ...btn("#3b82f6"), padding: "7px 12px" }}><UserPlus size={15} /> Thêm nhân viên</button>
          </div>
          {pos.members.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>Chưa có nhân viên. Bấm "Thêm nhân viên".</div>}
          {pos.members.map((m) => {
            const done = m.tasks.filter((t) => t.status === "done").length;
            const pct = m.tasks.length ? Math.round((done / m.tasks.length) * 100) : 0;
            return (
              <div key={m.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, border: "1px solid #e2e8f0", borderRadius: 12, marginBottom: 10 }}>
                <Avatar m={m} size={48} />
                <div style={{ flex: 1 }}>
                  <input value={m.name} onChange={(e) => onUpdateMember(m.id, { name: e.target.value })} style={{ border: "none", outline: "none", fontWeight: 700, fontSize: 15, background: "none", width: "100%" }} />
                  <div style={{ fontSize: 12, color: "#64748b" }}>{m.email} • {m.tasks.length} việc • {pct}% hoàn thành</div>
                </div>
                <button onClick={() => onOpenMember(m.id)} style={{ ...btn("#10b981"), padding: "7px 12px" }}>Xem chi tiết</button>
                <button onClick={() => onRemoveMember(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 size={16} /></button>
              </div>
            );
          })}
        </div>
        <div style={{ padding: 14, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between" }}>
          <button onClick={onRemovePos} style={{ ...btn("#ef4444"), padding: "9px 14px" }}><Trash2 size={15} /> Xóa vị trí</button>
          <button onClick={onClose} style={{ ...btn("#1e40af"), padding: "9px 18px" }}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

function MemberModal({ m, posTitle, onClose, onUpdate, onAddTask, onUpdateTask, onRemoveTask, onReport }) {
  const avaRef = useRef(null);
  const handleAva = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => onUpdate({ avatar: ev.target.result }); r.readAsDataURL(f); };
  const total = m.tasks.length;
  const cnt = Object.fromEntries(STATUS_KEYS.map((k) => [k, 0])); m.tasks.forEach((t) => { cnt[t.status]++; });
  const pct = total ? Math.round((cnt.done / total) * 100) : 0;
  // donut bằng conic-gradient
  let acc = 0; const segs = STATUS_KEYS.map((k) => { const v = cnt[k]; const pv = total ? (v / total) * 100 : 0; const seg = STATUS[k].color + " " + acc + "% " + (acc + pv) + "%"; acc += pv; return v > 0 ? seg : null; }).filter(Boolean).join(",");
  // vướng mắc tự động: việc quá hạn / chờ duyệt
  const autoIssues = m.tasks.filter((t) => t.status === "overdue" || t.status === "pending_review");

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, width: "min(820px,100%)", maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        {/* header */}
        <div style={{ background: "linear-gradient(135deg,#1e40af,#3b82f6)", padding: 22, display: "flex", gap: 16, alignItems: "center", position: "relative" }}>
          <div onClick={() => avaRef.current.click()} title="Đổi ảnh" style={{ position: "relative", cursor: "pointer" }}>
            <Avatar m={m} size={72} />
            <div style={{ position: "absolute", bottom: 0, right: 0, background: "#10b981", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}><ImageIcon size={12} color="#fff" /></div>
          </div>
          <input ref={avaRef} type="file" accept="image/*" onChange={handleAva} style={{ display: "none" }} />
          <div style={{ flex: 1 }}>
            <input value={m.name} onChange={(e) => onUpdate({ name: e.target.value })} style={{ background: "none", border: "none", outline: "none", color: "#fff", fontSize: 22, fontWeight: 700, width: "100%" }} />
            <div style={{ color: "#bfdbfe", fontSize: 13, marginTop: 2 }}>{posTitle}</div>
            <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Mail size={13} color="#bfdbfe" /><input value={m.email} onChange={(e) => onUpdate({ email: e.target.value })} style={{ background: "none", border: "none", outline: "none", fontSize: 12, color: "#dbeafe", width: 170 }} /></span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Phone size={13} color="#bfdbfe" /><input value={m.phone} onChange={(e) => onUpdate({ phone: e.target.value })} style={{ background: "none", border: "none", outline: "none", fontSize: 12, color: "#dbeafe", width: 120 }} /></span>
            </div>
          </div>
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.2)", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
        </div>

        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
          {/* THỐNG KÊ */}
          <div style={{ display: "flex", gap: 20, alignItems: "center", padding: 16, background: "#f8fafc", borderRadius: 14, marginBottom: 18 }}>
            <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}>
              <div style={{ width: 110, height: 110, borderRadius: "50%", background: segs ? "conic-gradient(" + segs + ")" : "#e2e8f0" }} />
              <div style={{ position: "absolute", inset: 14, background: "#fff", borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#1e40af" }}>{pct}%</div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>hoàn thành</div>
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STATUS_KEYS.filter((k) => cnt[k] > 0).map((k) => (
                <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: STATUS[k].color + "18", color: STATUS[k].color, padding: "5px 11px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS[k].color }} />{STATUS[k].label}: {cnt[k]}
                </span>
              ))}
              {total === 0 && <span style={{ color: "#94a3b8", fontSize: 13 }}>Chưa có công việc</span>}
            </div>
            <button onClick={() => onReport(m)} style={{ ...btn("#10b981"), padding: "9px 14px" }}><FileText size={15} /> Báo cáo</button>
          </div>

          {/* CÔNG VIỆC */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Công việc đang theo ({total})</div>
            <button onClick={onAddTask} style={{ ...btn("#3b82f6"), padding: "6px 11px" }}><Plus size={14} /> Thêm việc</button>
          </div>
          {total === 0 && <div style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: 14 }}>Chưa có việc</div>}
          {m.tasks.map((t) => (
            <div key={t.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, marginBottom: 8, borderLeft: "4px solid " + STATUS[t.status].color }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input value={t.title} onChange={(e) => onUpdateTask(t.id, { title: e.target.value })} style={{ flex: 1, border: "none", outline: "none", fontWeight: 600, fontSize: 14 }} />
                <button onClick={() => onRemoveTask(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 size={15} /></button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <select value={t.status} onChange={(e) => onUpdateTask(t.id, { status: e.target.value })} style={{ padding: "5px 9px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: STATUS[t.status].color, fontWeight: 600 }}>{STATUS_KEYS.map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}</select>
                <input type="date" value={t.deadline} onChange={(e) => onUpdateTask(t.id, { deadline: e.target.value })} style={{ padding: "5px 9px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
                <input value={t.note} placeholder="Ghi chú..." onChange={(e) => onUpdateTask(t.id, { note: e.target.value })} style={{ flex: 1, minWidth: 100, padding: "5px 9px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
              </div>
            </div>
          ))}

          {/* KẾ HOẠCH */}
          <div style={{ marginTop: 16, padding: 14, background: "#eff6ff", borderRadius: 12, border: "1px solid #dbeafe" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>📋 Kế hoạch tuần tới</div>
            <textarea value={m.plan || ""} onChange={(e) => onUpdate({ plan: e.target.value })} placeholder="Mục tiêu, kế hoạch cho tuần tiếp theo..." rows={3} style={{ width: "100%", border: "1px solid #bfdbfe", borderRadius: 8, padding: 9, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
          </div>

          {/* VƯỚNG MẮC */}
          <div style={{ marginTop: 12, padding: 14, background: "#fef2f2", borderRadius: 12, border: "1px solid #fecaca" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>⚠️ Vướng mắc</div>
            {autoIssues.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#991b1b", marginBottom: 5, fontWeight: 600 }}>Tự động phát hiện (quá hạn / chờ duyệt):</div>
                {autoIssues.map((t) => (
                  <div key={t.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, padding: "4px 0" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS[t.status].color }} />
                    <span style={{ flex: 1, fontWeight: 600 }}>{t.title}</span>
                    <span style={{ color: STATUS[t.status].color, fontWeight: 600 }}>{STATUS[t.status].label}</span>
                  </div>
                ))}
              </div>
            )}
            <textarea value={m.issue || ""} onChange={(e) => onUpdate({ issue: e.target.value })} placeholder="Ghi chú vướng mắc, khó khăn cần hỗ trợ..." rows={2} style={{ width: "100%", border: "1px solid #fecaca", borderRadius: 8, padding: 9, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
          </div>
        </div>

        <div style={{ padding: 14, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ ...btn("#1e40af"), padding: "9px 18px" }}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ============ REPORT: TỔNG ============
function openReport({ orgName, logo, positions, allTasks, statusCounts, overallPct, allMembers }) {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const today = new Date().toLocaleDateString("vi-VN");
  let acc = 0; const segs = STATUS_KEYS.map((k) => { const v = statusCounts[k]; const pctv = allTasks.length ? (v / allTasks.length) * 100 : 0; const seg = STATUS[k].color + " " + acc + "% " + (acc + pctv) + "%"; acc += pctv; return v > 0 ? seg : null; }).filter(Boolean).join(",");
  const maxTasks = Math.max(1, ...positions.map((p) => p.members.flatMap((m) => m.tasks).length));
  const bars = positions.map((p) => { const tot = p.members.flatMap((m) => m.tasks).length; const dn = p.members.flatMap((m) => m.tasks).filter((t) => t.status === "done").length; const rate = tot ? Math.round((dn / tot) * 100) : 0; return '<div class="bar-row"><div class="bar-head"><span class="bar-name">' + esc(p.title) + '</span><span class="bar-num">' + dn + '/' + tot + ' • ' + rate + '%</span></div><div class="bar-track"><div class="bar-total" style="width:' + ((tot / maxTasks) * 100) + '%"><div class="bar-done" style="width:' + (tot ? (dn / tot) * 100 : 0) + '%"></div></div></div></div>'; }).join("");
  const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
  const upcoming = allTasks.filter((t) => t.deadline && t.status !== "done").map((t) => ({ ...t, d: new Date(t.deadline) })).filter((t) => !isNaN(t.d)).sort((a, b) => a.d - b.d).slice(0, 12);
  const timeline = upcoming.length ? upcoming.map((t) => { const days = Math.ceil((t.d - todayD) / 86400000); const overdue = days < 0; const soon = days >= 0 && days <= 2; const c = overdue ? "#ef4444" : soon ? "#f59e0b" : "#3b82f6"; const lbl = overdue ? ("Trễ " + (-days) + " ngày") : days === 0 ? "Hôm nay" : ("Còn " + days + " ngày"); return '<div class="tl-row"><div class="tl-dot" style="background:' + c + '"></div><div style="flex:1"><div class="tl-title">' + esc(t.title) + '</div><div class="tl-sub">' + esc(t.owner) + " • " + esc(t.posTitle) + '</div></div><div style="text-align:right"><div class="tl-badge" style="color:' + c + ';background:' + c + '15">' + lbl + '</div><div class="tl-date">' + esc(t.deadline) + '</div></div></div>'; }).join("") : '<div class="empty">Không có deadline sắp tới</div>';
  const legend = STATUS_KEYS.filter((k) => statusCounts[k] > 0).map((k) => '<div class="lg-item"><span class="lg-dot" style="background:' + STATUS[k].color + '"></span><span class="lg-label">' + STATUS[k].label + '</span><span class="lg-count">' + statusCounts[k] + '</span></div>').join("");
  const tableRows = positions.map((p) => p.members.map((m) => m.tasks.length ? m.tasks.map((t, i) => '<tr><td>' + (i === 0 ? esc(p.title) : "") + '</td><td>' + (i === 0 ? esc(m.name) : "") + '</td><td>' + esc(t.title) + '</td><td><span class="pill" style="background:' + STATUS[t.status].color + '1a;color:' + STATUS[t.status].color + '">' + STATUS[t.status].label + '</span></td><td>' + esc(t.deadline) + '</td><td>' + esc(t.note) + '</td></tr>').join("") : '<tr><td>' + esc(p.title) + '</td><td>' + esc(m.name) + '</td><td colspan="4" class="muted">— chưa có việc —</td></tr>').join("")).join("");

  const css = '@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap");'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:"Inter",system-ui,sans-serif;background:#eef2f9;color:#0f172a;padding:32px 16px}'
    + 'h1,h2,h3,.num,.kpi-v{font-family:"Plus Jakarta Sans",sans-serif}'
    + '.wrap{max-width:920px;margin:0 auto}'
    + '.card-bg{background:#fff;border-radius:20px;box-shadow:0 4px 24px rgba(15,23,42,.06);overflow:hidden;margin-bottom:18px}'
    + '.head{position:relative;background:linear-gradient(135deg,#0c4a6e 0%,#0369a1 55%,#0891b2 100%);color:#fff;padding:34px 32px;overflow:hidden}'
    + '.head::after{content:"";position:absolute;right:-60px;top:-60px;width:240px;height:240px;border-radius:50%;background:rgba(255,255,255,.08)}'
    + '.head::before{content:"";position:absolute;right:60px;bottom:-90px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.06)}'
    + '.head .row{position:relative;display:flex;align-items:center;gap:18px;z-index:1}'
    + '.head img{width:66px;height:66px;border-radius:16px;object-fit:cover;background:#fff;padding:4px}'
    + '.head h1{font-size:28px;font-weight:800;letter-spacing:-.5px}'
    + '.head p{color:#bae6fd;font-size:13px;margin-top:5px}'
    + '.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding:24px}'
    + '.kpi{position:relative;border-radius:16px;padding:20px 18px;background:#fff;border:1px solid #eef2f7;overflow:hidden;transition:transform .2s,box-shadow .2s}'
    + '.kpi:hover{transform:translateY(-4px);box-shadow:0 10px 26px rgba(15,23,42,.1)}'
    + '.kpi::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--c)}'
    + '.kpi-v{font-size:34px;font-weight:800;color:var(--c);line-height:1}'
    + '.kpi-l{font-size:12px;color:#64748b;margin-top:6px;font-weight:500}'
    + '.sec{padding:8px 28px 26px}.sec h2{font-size:17px;font-weight:700;margin-bottom:16px;color:#0f172a;display:flex;align-items:center;gap:9px}'
    + '.sec h2::before{content:"";width:5px;height:18px;border-radius:3px;background:linear-gradient(#0369a1,#0891b2)}'
    + '.prog-wrap{display:flex;align-items:center;gap:18px}'
    + '.prog-pct{font-size:40px;font-weight:800;font-family:"Plus Jakarta Sans";background:linear-gradient(90deg,#0369a1,#059669);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}'
    + '.prog{flex:1;height:20px;background:#e8eef6;border-radius:30px;overflow:hidden}'
    + '.prog>div{height:100%;border-radius:30px;background:linear-gradient(90deg,#0369a1,#0891b2,#059669);animation:grow 1.1s cubic-bezier(.2,.8,.2,1)}'
    + '@keyframes grow{from{width:0}}'
    + '.grid2{display:grid;grid-template-columns:230px 1fr;gap:30px;align-items:center}'
    + '.donut-wrap{position:relative;width:200px;height:200px;margin:0 auto}'
    + '.donut{width:200px;height:200px;border-radius:50%}'
    + '.donut-hole{position:absolute;inset:32px;background:#fff;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:inset 0 2px 8px rgba(0,0,0,.04)}'
    + '.donut-hole .n{font-size:30px;font-weight:800;font-family:"Plus Jakarta Sans";color:#0f172a}'
    + '.donut-hole .t{font-size:11px;color:#94a3b8}'
    + '.legend{display:flex;flex-direction:column;gap:10px}'
    + '.lg-item{display:flex;align-items:center;gap:10px;font-size:13px}'
    + '.lg-dot{width:12px;height:12px;border-radius:4px;flex-shrink:0}'
    + '.lg-label{flex:1;color:#475569;font-weight:500}.lg-count{font-weight:700;color:#0f172a}'
    + '.bar-row{margin:12px 0}'
    + '.bar-head{display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px}'
    + '.bar-name{font-weight:600}.bar-num{color:#64748b;font-weight:600}'
    + '.bar-track{height:24px;background:#eef2f7;border-radius:8px;overflow:hidden}'
    + '.bar-total{height:100%;background:#7dd3fc;display:flex;align-items:center;border-radius:8px;transition:width .8s}'
    + '.bar-done{height:100%;background:linear-gradient(90deg,#059669,#34d399)}'
    + '.tl-row{display:flex;gap:12px;align-items:center;padding:11px 0;border-bottom:1px solid #f1f5f9}'
    + '.tl-dot{width:11px;height:11px;border-radius:50%;flex-shrink:0;box-shadow:0 0 0 4px rgba(0,0,0,.04)}'
    + '.tl-title{font-weight:600;font-size:13px}.tl-sub{font-size:11px;color:#94a3b8;margin-top:2px}'
    + '.tl-badge{font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px}'
    + '.tl-date{font-size:11px;color:#94a3b8;margin-top:3px}'
    + 'table{width:100%;border-collapse:collapse;font-size:13px}'
    + 'th{background:#f1f6fc;text-align:left;padding:11px 12px;color:#475569;font-size:11px;text-transform:uppercase;font-weight:700;letter-spacing:.4px}'
    + 'td{padding:11px 12px;border-top:1px solid #f1f5f9;vertical-align:top}'
    + 'tr:hover td{background:#f8fafc}'
    + '.pill{padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap}'
    + '.muted{color:#cbd5e1}.empty{color:#94a3b8;padding:16px;text-align:center;font-size:13px}'
    + '.btn{position:fixed;top:22px;right:22px;background:linear-gradient(135deg,#0369a1,#0891b2);color:#fff;border:none;padding:13px 22px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 6px 20px rgba(3,105,161,.35);font-family:"Plus Jakarta Sans"}'
    + '.btn:hover{transform:translateY(-2px)}'
    + '@media print{.btn{display:none}body{padding:0;background:#fff}.card-bg{box-shadow:none;border:1px solid #e2e8f0}.kpi:hover{transform:none}}'
    + '@media(max-width:640px){.kpis{grid-template-columns:repeat(2,1fr)}.grid2{grid-template-columns:1fr}}';

  const html = '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Báo cáo - ' + esc(orgName) + '</title><style>' + css + '</style></head><body>'
    + '<button class="btn" onclick="window.print()">⬇ In / Lưu PDF</button>'
    + '<div class="wrap">'
    + '<div class="card-bg"><div class="head"><div class="row">' + (logo ? '<img src="' + logo + '" alt="logo">' : "") + '<div><h1>' + esc(orgName) + '</h1><p>Báo cáo tiến độ công việc • ' + today + '</p></div></div></div>'
    + '<div class="kpis">'
    + '<div class="kpi" style="--c:#0369a1"><div class="kpi-v">' + positions.length + '</div><div class="kpi-l">Vị trí</div></div>'
    + '<div class="kpi" style="--c:#0891b2"><div class="kpi-v">' + allMembers.length + '</div><div class="kpi-l">Nhân viên</div></div>'
    + '<div class="kpi" style="--c:#059669"><div class="kpi-v">' + statusCounts.done + '</div><div class="kpi-l">Hoàn thành</div></div>'
    + '<div class="kpi" style="--c:#ef4444"><div class="kpi-v">' + statusCounts.overdue + '</div><div class="kpi-l">Quá hạn</div></div>'
    + '</div></div>'
    + '<div class="card-bg"><div class="sec" style="padding-top:24px"><h2>Tiến độ tổng thể</h2><div class="prog-wrap"><div class="prog-pct">' + overallPct + '%</div><div class="prog"><div style="width:' + overallPct + '%"></div></div></div></div>'
    + '<div class="sec"><h2>Cơ cấu trạng thái</h2><div class="grid2"><div class="donut-wrap"><div class="donut" style="background:conic-gradient(' + (segs || "#e2e8f0 0% 100%") + ')"></div><div class="donut-hole"><div class="n">' + allTasks.length + '</div><div class="t">công việc</div></div></div><div class="legend">' + (legend || '<span class="muted">Chưa có dữ liệu</span>') + '</div></div></div></div>'
    + '<div class="card-bg"><div class="sec" style="padding-top:24px"><h2>Khối lượng theo vị trí</h2>' + bars + '</div></div>'
    + '<div class="card-bg"><div class="sec" style="padding-top:24px"><h2>Deadline sắp tới</h2>' + timeline + '</div></div>'
    + '<div class="card-bg"><div class="sec" style="padding-top:24px"><h2>Chi tiết công việc</h2><table><thead><tr><th>Vị trí</th><th>Nhân viên</th><th>Công việc</th><th>Trạng thái</th><th>Deadline</th><th>Ghi chú</th></tr></thead><tbody>' + (tableRows || '<tr><td colspan="6" class="empty">Chưa có dữ liệu</td></tr>') + '</tbody></table></div></div>'
    + '</div></body></html>';
  const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); } else { window.open(URL.createObjectURL(new Blob([html], { type: "text/html" })), "_blank"); }
}

// ============ REPORT: CÁ NHÂN ============
function openMemberReport({ member, posTitle, orgName, logo }) {
  const m = member;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const today = new Date().toLocaleDateString("vi-VN");
  const total = m.tasks.length;
  const cnt = Object.fromEntries(STATUS_KEYS.map((k) => [k, 0])); m.tasks.forEach((t) => { cnt[t.status]++; });
  const pct = total ? Math.round((cnt.done / total) * 100) : 0;
  let acc = 0; const segs = STATUS_KEYS.map((k) => { const v = cnt[k]; const pv = total ? (v / total) * 100 : 0; const seg = STATUS[k].color + " " + acc + "% " + (acc + pv) + "%"; acc += pv; return v > 0 ? seg : null; }).filter(Boolean).join(",");
  const legend = STATUS_KEYS.filter((k) => cnt[k] > 0).map((k) => '<span style="display:inline-flex;align-items:center;gap:5px;margin:3px 14px 3px 0;font-size:12px"><span style="width:10px;height:10px;border-radius:2px;background:' + STATUS[k].color + '"></span>' + STATUS[k].label + ' (' + cnt[k] + ')</span>').join("");
  const rows = m.tasks.length ? m.tasks.map((t) => '<tr><td>' + esc(t.title) + '</td><td><span style="background:' + STATUS[t.status].color + '22;color:' + STATUS[t.status].color + ';padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600">' + STATUS[t.status].label + '</span></td><td>' + esc(t.deadline) + '</td><td>' + esc(t.note) + '</td></tr>').join("") : '<tr><td colspan="4" style="text-align:center;color:#94a3b8">Chưa có công việc</td></tr>';
  const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
  const next7 = m.tasks.filter((t) => t.deadline && t.status !== "done").map((t) => ({ ...t, d: new Date(t.deadline) })).filter((t) => !isNaN(t.d)).filter((t) => { const days = Math.ceil((t.d - todayD) / 86400000); return days >= 0 && days <= 7; }).sort((a, b) => a.d - b.d);
  const planTasks = next7.length ? next7.map((t) => { const days = Math.ceil((t.d - todayD) / 86400000); const lbl = days === 0 ? "Hôm nay" : ("Còn " + days + " ngày"); return '<div style="display:flex;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid #f1f5f9"><div style="width:9px;height:9px;border-radius:50%;background:#3b82f6"></div><div style="flex:1;font-size:13px;font-weight:600">' + esc(t.title) + '</div><div style="font-size:12px;color:#3b82f6;font-weight:700">' + lbl + '</div><div style="font-size:11px;color:#94a3b8;width:90px;text-align:right">' + esc(t.deadline) + '</div></div>'; }).join("") : '<div style="color:#94a3b8;padding:8px;font-size:13px">Không có việc đến hạn trong 7 ngày tới</div>';
  const planNote = m.plan ? '<div style="margin-top:12px;padding:12px;background:#eff6ff;border-radius:8px;border:1px solid #dbeafe;font-size:13px;white-space:pre-wrap">' + esc(m.plan) + '</div>' : '';
  const autoIssues = m.tasks.filter((t) => t.status === "overdue" || t.status === "pending_review");
  const issueAuto = autoIssues.length ? autoIssues.map((t) => '<div style="display:flex;gap:8px;align-items:center;padding:5px 0;font-size:13px"><span style="width:8px;height:8px;border-radius:50%;background:' + STATUS[t.status].color + '"></span><span style="flex:1;font-weight:600">' + esc(t.title) + '</span><span style="color:' + STATUS[t.status].color + ';font-weight:600;font-size:12px">' + STATUS[t.status].label + '</span></div>').join("") : '';
  const issueNote = m.issue ? '<div style="margin-top:8px;padding:12px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca;font-size:13px;white-space:pre-wrap">' + esc(m.issue) + '</div>' : '';
  const issueSection = (autoIssues.length || m.issue) ? ('<div class="sec"><h2 style="color:#dc2626">Vướng mắc</h2>' + issueAuto + issueNote + '</div>') : '<div class="sec"><h2 style="color:#dc2626">Vướng mắc</h2><div style="color:#94a3b8;font-size:13px">Không có vướng mắc</div></div>';
  const avatarHtml = m.avatar ? '<img src="' + m.avatar + '" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:4px solid rgba(255,255,255,.4)">' : '<div style="width:96px;height:96px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;color:#fff;font-family:Plus Jakarta Sans">' + esc((m.name || "?").split(" ").map((w) => w[0]).slice(-2).join("").toUpperCase()) + '</div>';

  const css = '@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap");'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:"Inter",system-ui,sans-serif;background:#eef2f9;color:#0f172a;padding:32px 16px}'
    + 'h1,h2,.n{font-family:"Plus Jakarta Sans",sans-serif}'
    + '.wrap{max-width:800px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 6px 30px rgba(15,23,42,.08)}'
    + '.head{position:relative;background:linear-gradient(135deg,#0c4a6e,#0369a1 60%,#0891b2);color:#fff;padding:30px;display:flex;align-items:center;gap:22px;overflow:hidden}'
    + '.head::after{content:"";position:absolute;right:-50px;top:-50px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,.08)}'
    + '.head>*{position:relative;z-index:1}'
    + '.head h1{font-size:26px;font-weight:800}.head .role{color:#bae6fd;font-size:14px;margin-top:3px}.head .contact{color:#e0f2fe;font-size:12px;margin-top:7px}'
    + '.pctbox{margin-left:auto;text-align:center}.pctbox .big{font-size:42px;font-weight:800;font-family:Plus Jakarta Sans}.pctbox .sm{font-size:11px;color:#bae6fd}'
    + '.sec{padding:22px 28px}.sec+.sec{padding-top:0}.sec h2{font-size:16px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:9px}'
    + '.sec h2::before{content:"";width:5px;height:17px;border-radius:3px;background:linear-gradient(#0369a1,#0891b2)}'
    + '.grid2{display:grid;grid-template-columns:200px 1fr;gap:26px;align-items:center}'
    + '.donut-wrap{position:relative;width:170px;height:170px;margin:0 auto}'
    + '.donut{width:170px;height:170px;border-radius:50%}'
    + '.donut-hole{position:absolute;inset:28px;background:#fff;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center}'
    + '.donut-hole .n{font-size:26px;font-weight:800;color:#0369a1}.donut-hole .t{font-size:10px;color:#94a3b8}'
    + '.legend{display:flex;flex-direction:column;gap:9px}'
    + '.lg{display:flex;align-items:center;gap:9px;font-size:13px}.lg-dot{width:11px;height:11px;border-radius:4px}.lg-l{flex:1;color:#475569;font-weight:500}.lg-c{font-weight:700}'
    + 'table{width:100%;border-collapse:collapse;font-size:13px}'
    + 'th{background:#f1f6fc;text-align:left;padding:10px;color:#475569;font-size:11px;text-transform:uppercase;font-weight:700}'
    + 'td{padding:10px;border-top:1px solid #f1f5f9;vertical-align:top}tr:hover td{background:#f8fafc}'
    + '.pill{padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap}'
    + '.plan-card{padding:14px;background:#eff6ff;border-radius:12px;border:1px solid #dbeafe}'
    + '.tl{display:flex;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid #f1f5f9}'
    + '.tl-dot{width:9px;height:9px;border-radius:50%;background:#0369a1}'
    + '.note-box{margin-top:10px;padding:12px;border-radius:10px;font-size:13px;white-space:pre-wrap}'
    + '.issue-card{padding:14px;background:#fef2f2;border-radius:12px;border:1px solid #fecaca}'
    + '.muted{color:#94a3b8;font-size:13px}'
    + '.btn{position:fixed;top:22px;right:22px;background:linear-gradient(135deg,#0369a1,#0891b2);color:#fff;border:none;padding:13px 22px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 6px 20px rgba(3,105,161,.35);font-family:Plus Jakarta Sans}'
    + '.foot{color:#94a3b8;font-size:12px;text-align:center;border-top:1px solid #f1f5f9;padding:16px}'
    + '@media print{.btn{display:none}body{padding:0;background:#fff}.wrap{box-shadow:none}}'
    + '@media(max-width:640px){.grid2{grid-template-columns:1fr}.head{flex-wrap:wrap}.pctbox{margin:0}}';

  const legend2 = STATUS_KEYS.filter((k) => cnt[k] > 0).map((k) => '<div class="lg"><span class="lg-dot" style="background:' + STATUS[k].color + '"></span><span class="lg-l">' + STATUS[k].label + '</span><span class="lg-c">' + cnt[k] + '</span></div>').join("");
  const rows2 = m.tasks.length ? m.tasks.map((t) => '<tr><td>' + esc(t.title) + '</td><td><span class="pill" style="background:' + STATUS[t.status].color + '1a;color:' + STATUS[t.status].color + '">' + STATUS[t.status].label + '</span></td><td>' + esc(t.deadline) + '</td><td>' + esc(t.note) + '</td></tr>').join("") : '<tr><td colspan="4" style="text-align:center" class="muted">Chưa có công việc</td></tr>';
  const planTasks2 = next7.length ? next7.map((t) => { const days = Math.ceil((t.d - todayD) / 86400000); const lbl = days === 0 ? "Hôm nay" : ("Còn " + days + " ngày"); return '<div class="tl"><div class="tl-dot"></div><div style="flex:1;font-size:13px;font-weight:600">' + esc(t.title) + '</div><div style="font-size:12px;color:#0369a1;font-weight:700">' + lbl + '</div><div style="font-size:11px;color:#94a3b8;width:90px;text-align:right">' + esc(t.deadline) + '</div></div>'; }).join("") : '<div class="muted" style="padding:6px">Không có việc đến hạn trong 7 ngày tới</div>';
  const planNote2 = m.plan ? '<div class="note-box" style="background:#eff6ff;border:1px solid #dbeafe">' + esc(m.plan) + '</div>' : '';
  const issueAuto2 = autoIssues.length ? '<div style="margin-bottom:8px"><div style="font-size:11px;color:#991b1b;font-weight:700;margin-bottom:5px">Tự động phát hiện:</div>' + autoIssues.map((t) => '<div class="tl" style="border-color:#fee2e2"><span style="width:8px;height:8px;border-radius:50%;background:' + STATUS[t.status].color + '"></span><span style="flex:1;font-weight:600;font-size:13px">' + esc(t.title) + '</span><span style="color:' + STATUS[t.status].color + ';font-weight:700;font-size:12px">' + STATUS[t.status].label + '</span></div>').join("") + '</div>' : '';
  const issueNote2 = m.issue ? '<div class="note-box" style="background:#fff;border:1px solid #fecaca">' + esc(m.issue) + '</div>' : '';

  const html = '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Báo cáo - ' + esc(m.name) + '</title><style>' + css + '</style></head><body>'
    + '<button class="btn" onclick="window.print()">⬇ In / Lưu PDF</button>'
    + '<div class="wrap">'
    + '<div class="head">' + avatarHtml + '<div><h1>' + esc(m.name) + '</h1><div class="role">' + esc(posTitle || "") + '</div><div class="contact">' + esc(m.email) + ' • ' + esc(m.phone) + '</div></div><div class="pctbox"><div class="big">' + pct + '%</div><div class="sm">hoàn thành • ' + total + ' việc</div></div></div>'
    + '<div class="sec"><h2>Tổng quan trạng thái</h2><div class="grid2"><div class="donut-wrap"><div class="donut" style="background:conic-gradient(' + (segs || "#e2e8f0 0% 100%") + ')"></div><div class="donut-hole"><div class="n">' + total + '</div><div class="t">việc</div></div></div><div class="legend">' + (legend2 || '<span class="muted">Chưa có dữ liệu</span>') + '</div></div></div>'
    + '<div class="sec"><h2>Danh sách công việc</h2><table><thead><tr><th>Công việc</th><th>Trạng thái</th><th>Deadline</th><th>Ghi chú</th></tr></thead><tbody>' + rows2 + '</tbody></table></div>'
    + '<div class="sec"><h2>Kế hoạch tuần tiếp theo</h2><div class="plan-card">' + planTasks2 + planNote2 + '</div></div>'
    + '<div class="sec"><h2 style="color:#dc2626"><span></span>Vướng mắc</h2><div class="issue-card">' + (issueAuto2 + issueNote2 || '<span class="muted">Không có vướng mắc</span>') + '</div></div>'
    + '<div class="foot">Xuất ngày ' + today + (orgName ? ' • ' + esc(orgName) : '') + '</div>'
    + '</div></body></html>';
  const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); } else { window.open(URL.createObjectURL(new Blob([html], { type: "text/html" })), "_blank"); }
}
