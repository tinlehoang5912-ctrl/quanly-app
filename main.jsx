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

// Vị trí có x,y. Liên kết tách riêng (cho phép 2 sếp 1 nhân viên)
const seed = {
  orgName: "Dự án mới",
  logo: null,
  positions: [
    { id: "pos1", title: "Ban Giám đốc", x: 360, y: 40, members: [
      { id: "m1", name: "LE TIN", email: "tin.lehoang32@gmail.com", phone: "0900000000", avatar: null, plan: "",
        tasks: [
          { id: "t1", title: "Thiết lập cấu trúc dự án", status: "done", deadline: "2026-06-10", note: "Khởi tạo" },
          { id: "t2", title: "Phân quyền nhân sự", status: "in_progress", deadline: "2026-06-15", note: "" },
        ] },
    ] },
    { id: "pos2", title: "Phòng Kinh doanh", x: 80, y: 320, members: [
      { id: "m2", name: "Nguyễn An", email: "an.nguyen@example.com", phone: "0911111111", avatar: null, plan: "",
        tasks: [
          { id: "t3", title: "Lập kế hoạch quý 2", status: "pending_review", deadline: "2026-06-08", note: "Chờ duyệt" },
          { id: "t4", title: "Báo cáo doanh số", status: "overdue", deadline: "2026-05-28", note: "Trễ" },
        ] },
      { id: "m3", name: "Lê Cường", email: "cuong.le@example.com", phone: "0933333333", avatar: null, plan: "",
        tasks: [{ id: "t8", title: "Chăm sóc khách VIP", status: "in_progress", deadline: "2026-06-18", note: "" }] },
    ] },
    { id: "pos3", title: "Phòng Marketing", x: 640, y: 320, members: [
      { id: "m4", name: "Trần Bình", email: "binh.tran@example.com", phone: "0922222222", avatar: null, plan: "",
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

export default function App() {
  const [view, setView] = useState("org");
  const [data, setData] = useState(seed);
  const [selected, setSelected] = useState(null);
  const [syncState, setSyncState] = useState("idle");
  const [autoSync, setAutoSync] = useState(false);
  const fileRef = useRef(null);
  const logoRef = useRef(null);

  const { orgName, logo, positions, links } = data;
  const setPositions = (fn) => setData((d) => ({ ...d, positions: typeof fn === "function" ? fn(d.positions) : fn }));
  const setLinks = (fn) => setData((d) => ({ ...d, links: typeof fn === "function" ? fn(d.links) : fn }));
  const setOrgName = (v) => setData((d) => ({ ...d, orgName: v }));
  const setLogo = (v) => setData((d) => ({ ...d, logo: v }));

  const selectedPos = positions.find((p) => p.id === selected);

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
  React.useEffect(() => { if (autoSync) { const t = setTimeout(() => syncToSheet(data), 1200); return () => clearTimeout(t); } }, [data, autoSync]);

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
  const addMember = (posId) => { const pos = positions.find((p) => p.id === posId); updatePosition(posId, { members: [...pos.members, { id: uid(), name: "Nhân viên mới", email: "email@example.com", phone: "0000000000", avatar: null, plan: "", tasks: [] }] }); };
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
      <div style={{ background: "linear-gradient(135deg,#1e40af,#3b82f6)", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 20px rgba(30,64,175,.25)", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div onClick={() => logoRef.current.click()} title="Tải logo tổ chức" style={{ width: 46, height: 46, borderRadius: 10, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", border: "1px dashed rgba(255,255,255,.4)" }}>
            {logo ? <img src={logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color="#fff" />}
          </div>
          <input ref={logoRef} type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
          <div>
            <input value={orgName} onChange={(e) => setOrgName(e.target.value)} style={{ background: "none", border: "none", outline: "none", color: "#fff", fontWeight: 700, fontSize: 18 }} />
            <div style={{ color: "#bfdbfe", fontSize: 12 }}>Project & Org Management</div>
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
          <input ref={fileRef} type="file" accept=".json" onChange={importJSON} style={{ display: "none" }} />
        </div>
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      </div>

      <div style={{ display: "flex", gap: 4, padding: "14px 28px 0", background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
        {[{ k: "org", label: "Sơ đồ tổ chức", icon: Network }, { k: "dashboard", label: "Dashboard", icon: LayoutDashboard }, { k: "data", label: "Bảng dữ liệu", icon: Table2 }].map((t) => (
          <button key={t.k} onClick={() => setView(t.k)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: view === t.k ? "#1e40af" : "#64748b", borderBottom: view === t.k ? "3px solid #3b82f6" : "3px solid transparent", marginBottom: -1 }}>
            <t.icon size={17} /> {t.label}
          </button>
        ))}
      </div>

      {view === "org" && <OrgCanvas positions={positions} links={links} onSelect={setSelected} onAdd={addPosition} onMove={movePosition} onAddLink={addLink} onUpdateLink={updateLink} onRemoveLink={removeLink} />}
      {view === "dashboard" && <div style={{ padding: 28 }}><Dashboard positions={positions} statusCounts={statusCounts} overallPct={overallPct} allTasks={allTasks} allMembers={allMembers} /></div>}
      {view === "data" && <div style={{ padding: 28 }}><DataTable positions={positions} onSelect={setSelected} /></div>}

      {selectedPos && (
        <PositionModal pos={selectedPos} onClose={() => setSelected(null)}
          onUpdatePos={(patch) => updatePosition(selectedPos.id, patch)} onRemovePos={() => removePosition(selectedPos.id)}
          onAddMember={() => addMember(selectedPos.id)} onUpdateMember={(mId, patch) => updateMember(selectedPos.id, mId, patch)} onRemoveMember={(mId) => removeMember(selectedPos.id, mId)}
          onAddTask={(mId) => addTask(selectedPos.id, mId)} onUpdateTask={(mId, tId, patch) => updateTask(selectedPos.id, mId, tId, patch)} onRemoveTask={(mId, tId) => removeTask(selectedPos.id, mId, tId)} />
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
function OrgCanvas({ positions, links, onSelect, onAdd, onMove, onAddLink, onUpdateLink, onRemoveLink }) {
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
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 28px", background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
        <button onClick={onAdd} style={{ ...btn("#3b82f6") }}><Plus size={15} /> Thêm vị trí</button>
        <span style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}><Move size={14} /> Kéo khối để di chuyển</span>
        <span style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}><Link2 size={14} /> Kéo từ chấm xanh dưới khối sang khối khác để nối</span>
        <span style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}><Maximize2 size={14} /> Bấm đường nối để sửa/xóa</span>
      </div>

      <div ref={canvasRef} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onClick={() => setSelLink(null)}
        style={{ position: "relative", height: "calc(100vh - 230px)", overflow: "auto", background: "radial-gradient(#dde4ee 1px, transparent 1px)", backgroundSize: "22px 22px" }}>
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
                <div style={{ background: "linear-gradient(135deg,#eff6ff,#dbeafe)", padding: "9px 14px", fontSize: 13, fontWeight: 700, color: "#1e40af", textAlign: "center", display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}><Network size={14} /> {p.title}</div>
                <div style={{ padding: 12 }}>
                  {p.members.length === 0 && <div style={{ textAlign: "center", color: "#cbd5e1", fontSize: 12, padding: 8 }}>Chưa có nhân viên</div>}
                  {p.members.map((m) => (
                    <div key={m.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "5px 0", borderBottom: "1px solid #f1f5f9" }}>
                      <Avatar m={m} size={34} />
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div><div style={{ fontSize: 10, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.email}</div></div>
                      <span style={{ fontSize: 10, background: "#eff6ff", color: "#1e40af", padding: "1px 6px", borderRadius: 20, fontWeight: 600 }}>{m.tasks.length}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", fontSize: 11 }}><span style={{ color: "#64748b" }}>{p.members.length} nhân viên</span>{tasks.length > 0 && <span style={{ color: "#10b981", fontWeight: 600 }}>{Math.round((done / tasks.length) * 100)}%</span>}</div>
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
function PositionModal({ pos, onClose, onUpdatePos, onRemovePos, onAddMember, onUpdateMember, onRemoveMember, onAddTask, onUpdateTask, onRemoveTask }) {
  const [openMember, setOpenMember] = useState(pos.members[0] ? pos.members[0].id : null);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, width: "min(780px,100%)", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <div style={{ background: "linear-gradient(135deg,#1e40af,#3b82f6)", padding: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <Network size={26} color="#fff" />
          <input value={pos.title} onChange={(e) => onUpdatePos({ title: e.target.value })} style={{ background: "none", border: "none", outline: "none", color: "#fff", fontSize: 20, fontWeight: 700, flex: 1 }} />
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.2)", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
        </div>
        <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Nhân viên ({pos.members.length})</div>
            <button onClick={onAddMember} style={{ ...btn("#3b82f6"), padding: "7px 12px" }}><UserPlus size={15} /> Thêm nhân viên</button>
          </div>
          {pos.members.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>Chưa có nhân viên. Bấm "Thêm nhân viên".</div>}
          {pos.members.map((m) => (
            <MemberCard key={m.id} m={m} open={openMember === m.id} onToggle={() => setOpenMember(openMember === m.id ? null : m.id)}
              onUpdate={(patch) => onUpdateMember(m.id, patch)} onRemove={() => onRemoveMember(m.id)}
              onAddTask={() => onAddTask(m.id)} onUpdateTask={(tId, patch) => onUpdateTask(m.id, tId, patch)} onRemoveTask={(tId) => onRemoveTask(m.id, tId)}
              onReport={(mem) => openMemberReport({ member: mem, posTitle: pos.title })} />
          ))}
        </div>
        <div style={{ padding: 14, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between" }}>
          <button onClick={onRemovePos} style={{ ...btn("#ef4444"), padding: "9px 14px" }}><Trash2 size={15} /> Xóa vị trí</button>
          <button onClick={onClose} style={{ ...btn("#1e40af"), padding: "9px 18px" }}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

function MemberCard({ m, open, onToggle, onUpdate, onRemove, onAddTask, onUpdateTask, onRemoveTask, onReport }) {
  const done = m.tasks.filter((t) => t.status === "done").length;
  const pct = m.tasks.length ? Math.round((done / m.tasks.length) * 100) : 0;
  const avaRef = useRef(null);
  const handleAva = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => onUpdate({ avatar: ev.target.result }); r.readAsDataURL(f); };
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, marginBottom: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", padding: 14, background: "#f8fafc" }}>
        <div onClick={() => avaRef.current.click()} title="Bấm để đổi ảnh" style={{ position: "relative", cursor: "pointer" }}>
          <Avatar m={m} size={64} />
          <div style={{ position: "absolute", bottom: 0, right: 0, background: "#3b82f6", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}><ImageIcon size={11} color="#fff" /></div>
        </div>
        <input ref={avaRef} type="file" accept="image/*" onChange={handleAva} style={{ display: "none" }} />
        <div style={{ flex: 1 }}>
          <input value={m.name} onChange={(e) => onUpdate({ name: e.target.value })} style={{ border: "none", outline: "none", fontWeight: 700, fontSize: 15, background: "none", width: "100%" }} />
          <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Mail size={13} color="#94a3b8" /><input value={m.email} onChange={(e) => onUpdate({ email: e.target.value })} style={{ border: "none", outline: "none", fontSize: 12, color: "#64748b", background: "none", width: 150 }} /></span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Phone size={13} color="#94a3b8" /><input value={m.phone} onChange={(e) => onUpdate({ phone: e.target.value })} style={{ border: "none", outline: "none", fontSize: 12, color: "#64748b", background: "none", width: 110 }} /></span>
          </div>
        </div>
        <div style={{ textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#1e40af" }}>{pct}%</div><div style={{ fontSize: 10, color: "#94a3b8" }}>{m.tasks.length} việc</div></div>
        <button onClick={onToggle} style={{ ...btn("#3b82f6"), padding: "6px 10px" }}>{open ? "Thu gọn" : "Công việc"}</button>
        <button onClick={() => onReport(m)} title="Xuất báo cáo cá nhân" style={{ ...btn("#10b981"), padding: "6px 10px" }}><FileText size={14} /> Báo cáo</button>
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 size={16} /></button>
      </div>
      {open && (
        <div style={{ padding: 14 }}>
          <button onClick={onAddTask} style={{ ...btn("#10b981"), padding: "6px 11px", marginBottom: 10 }}><Plus size={14} /> Thêm việc</button>
          {m.tasks.length === 0 && <div style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: 10 }}>Chưa có việc</div>}
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
          <div style={{ marginTop: 12, padding: 12, background: "#eff6ff", borderRadius: 10, border: "1px solid #dbeafe" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", marginBottom: 6 }}>Kế hoạch tuần tới</div>
            <textarea value={m.plan || ""} onChange={(e) => onUpdate({ plan: e.target.value })} placeholder="Nhập kế hoạch, mục tiêu cho tuần tiếp theo..." rows={3} style={{ width: "100%", border: "1px solid #bfdbfe", borderRadius: 8, padding: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ============ REPORT: TỔNG ============
function openReport({ orgName, logo, positions, allTasks, statusCounts, overallPct, allMembers }) {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const today = new Date().toLocaleDateString("vi-VN");
  let acc = 0; const segs = STATUS_KEYS.map((k) => { const v = statusCounts[k]; const pctv = allTasks.length ? (v / allTasks.length) * 100 : 0; const seg = STATUS[k].color + " " + acc + "% " + (acc + pctv) + "%"; acc += pctv; return v > 0 ? seg : null; }).filter(Boolean).join(",");
  const maxTasks = Math.max(1, ...positions.map((p) => p.members.flatMap((m) => m.tasks).length));
  const bars = positions.map((p) => { const tot = p.members.flatMap((m) => m.tasks).length; const dn = p.members.flatMap((m) => m.tasks).filter((t) => t.status === "done").length; return '<div style="margin:8px 0"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span>' + esc(p.title) + '</span><span style="color:#64748b">' + dn + '/' + tot + '</span></div><div style="height:22px;background:#eef2f7;border-radius:6px;overflow:hidden"><div style="height:100%;width:' + ((tot / maxTasks) * 100) + '%;background:#3b82f6;display:flex;align-items:center"><div style="height:100%;width:' + (tot ? (dn / tot) * 100 : 0) + '%;background:#10b981"></div></div></div></div>'; }).join("");
  const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
  const upcoming = allTasks.filter((t) => t.deadline && t.status !== "done").map((t) => ({ ...t, d: new Date(t.deadline) })).filter((t) => !isNaN(t.d)).sort((a, b) => a.d - b.d).slice(0, 12);
  const timeline = upcoming.length ? upcoming.map((t) => { const days = Math.ceil((t.d - todayD) / 86400000); const overdue = days < 0; const soon = days >= 0 && days <= 2; const c = overdue ? "#ef4444" : soon ? "#f59e0b" : "#3b82f6"; const lbl = overdue ? ("Trễ " + (-days) + " ngày") : days === 0 ? "Hôm nay" : ("Còn " + days + " ngày"); return '<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9"><div style="width:10px;height:10px;border-radius:50%;background:' + c + ';flex-shrink:0"></div><div style="flex:1"><div style="font-weight:600;font-size:13px">' + esc(t.title) + '</div><div style="font-size:11px;color:#64748b">' + esc(t.owner) + " • " + esc(t.posTitle) + '</div></div><div style="text-align:right"><div style="font-size:12px;color:' + c + ';font-weight:700">' + lbl + '</div><div style="font-size:11px;color:#94a3b8">' + esc(t.deadline) + '</div></div></div>'; }).join("") : '<div style="color:#94a3b8;padding:14px;text-align:center">Không có deadline sắp tới</div>';
  const legend = STATUS_KEYS.filter((k) => statusCounts[k] > 0).map((k) => '<span style="display:inline-flex;align-items:center;gap:5px;margin-right:14px;font-size:12px"><span style="width:10px;height:10px;border-radius:2px;background:' + STATUS[k].color + '"></span>' + STATUS[k].label + ' (' + statusCounts[k] + ')</span>').join("");
  const tableRows = positions.map((p) => p.members.map((m) => m.tasks.length ? m.tasks.map((t, i) => '<tr><td>' + (i === 0 ? esc(p.title) : "") + '</td><td>' + (i === 0 ? esc(m.name) : "") + '</td><td>' + esc(t.title) + '</td><td><span style="background:' + STATUS[t.status].color + '22;color:' + STATUS[t.status].color + ';padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600">' + STATUS[t.status].label + '</span></td><td>' + esc(t.deadline) + '</td><td>' + esc(t.note) + '</td></tr>').join("") : '<tr><td>' + esc(p.title) + '</td><td>' + esc(m.name) + '</td><td colspan="4" style="color:#cbd5e1">— chưa có việc —</td></tr>').join("")).join("");
  const html = '<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Báo cáo - ' + esc(orgName) + '</title><style>*{box-sizing:border-box;margin:0;padding:0;font-family:"Segoe UI",system-ui,sans-serif}body{background:#f1f5f9;color:#0f172a;padding:30px}.wrap{max-width:900px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 30px rgba(0,0,0,.08)}.head{background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;padding:28px;display:flex;align-items:center;gap:18px}.head img{width:64px;height:64px;border-radius:12px;object-fit:cover;background:#fff}.head h1{font-size:24px}.head p{color:#bfdbfe;font-size:13px;margin-top:4px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:24px}.card{border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:center}.card .v{font-size:28px;font-weight:800}.card .l{font-size:12px;color:#64748b;margin-top:3px}.sec{padding:0 24px 24px}.sec h2{font-size:16px;margin-bottom:14px;color:#1e40af}.grid2{display:grid;grid-template-columns:240px 1fr;gap:24px;align-items:center}.donut{width:200px;height:200px;border-radius:50%;margin:0 auto}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f8fafc;text-align:left;padding:10px;color:#64748b;font-size:11px;text-transform:uppercase}td{padding:10px;border-top:1px solid #f1f5f9;vertical-align:top}.btn{position:fixed;top:20px;right:20px;background:#1e40af;color:#fff;border:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(30,64,175,.3)}.prog{height:18px;background:#e2e8f0;border-radius:20px;overflow:hidden}.prog>div{height:100%;background:linear-gradient(90deg,#3b82f6,#10b981);border-radius:20px}@media print{.btn{display:none}body{padding:0;background:#fff}.wrap{box-shadow:none}}</style></head><body><button class="btn" onclick="window.print()">In / Lưu PDF</button><div class="wrap"><div class="head">' + (logo ? '<img src="' + logo + '" alt="logo">' : "") + '<div><h1>' + esc(orgName) + '</h1><p>Báo cáo tiến độ công việc • ' + today + '</p></div></div><div class="cards"><div class="card"><div class="v" style="color:#3b82f6">' + positions.length + '</div><div class="l">Vị trí</div></div><div class="card"><div class="v" style="color:#8b5cf6">' + allMembers.length + '</div><div class="l">Nhân viên</div></div><div class="card"><div class="v" style="color:#10b981">' + statusCounts.done + '</div><div class="l">Hoàn thành</div></div><div class="card"><div class="v" style="color:#ef4444">' + statusCounts.overdue + '</div><div class="l">Quá hạn</div></div></div><div class="sec"><h2>Tiến độ tổng thể: ' + overallPct + '%</h2><div class="prog"><div style="width:' + overallPct + '%"></div></div></div><div class="sec"><h2>Cơ cấu trạng thái</h2><div class="grid2"><div class="donut" style="background:conic-gradient(' + (segs || "#e2e8f0 0% 100%") + ')"></div><div>' + (legend || '<span style="color:#94a3b8">Chưa có dữ liệu</span>') + '</div></div></div><div class="sec"><h2>Khối lượng theo vị trí</h2>' + bars + '</div><div class="sec"><h2>Deadline sắp tới</h2>' + timeline + '</div><div class="sec"><h2>Chi tiết công việc</h2><table><thead><tr><th>Vị trí</th><th>Nhân viên</th><th>Công việc</th><th>Trạng thái</th><th>Deadline</th><th>Ghi chú</th></tr></thead><tbody>' + (tableRows || '<tr><td colspan="6" style="text-align:center;color:#94a3b8">Chưa có dữ liệu</td></tr>') + '</tbody></table></div></div></body></html>';
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
  const avatarHtml = m.avatar ? '<img src="' + m.avatar + '" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid #fff">' : '<div style="width:90px;height:90px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:800;color:#fff">' + esc((m.name || "?").split(" ").map((w) => w[0]).slice(-2).join("").toUpperCase()) + '</div>';
  const html = '<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Báo cáo - ' + esc(m.name) + '</title><style>*{box-sizing:border-box;margin:0;padding:0;font-family:"Segoe UI",system-ui,sans-serif}body{background:#f1f5f9;color:#0f172a;padding:30px}.wrap{max-width:780px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 30px rgba(0,0,0,.08)}.head{background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;padding:28px;display:flex;align-items:center;gap:20px}.head h1{font-size:24px}.head .role{color:#bfdbfe;font-size:14px;margin-top:3px}.head .contact{color:#dbeafe;font-size:12px;margin-top:6px}.pctbox{margin-left:auto;text-align:center}.pctbox .big{font-size:38px;font-weight:800}.pctbox .sm{font-size:11px;color:#bfdbfe}.sec{padding:0 26px 22px}.sec:first-of-type{padding-top:22px}.sec h2{font-size:15px;margin-bottom:12px;color:#1e40af}.grid2{display:grid;grid-template-columns:180px 1fr;gap:22px;align-items:center}.donut{width:160px;height:160px;border-radius:50%;margin:0 auto}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f8fafc;text-align:left;padding:9px;color:#64748b;font-size:11px;text-transform:uppercase}td{padding:9px;border-top:1px solid #f1f5f9;vertical-align:top}.btn{position:fixed;top:20px;right:20px;background:#1e40af;color:#fff;border:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(30,64,175,.3)}@media print{.btn{display:none}body{padding:0;background:#fff}.wrap{box-shadow:none}}</style></head><body><button class="btn" onclick="window.print()">In / Lưu PDF</button><div class="wrap"><div class="head">' + avatarHtml + '<div><h1>' + esc(m.name) + '</h1><div class="role">' + esc(posTitle || "") + '</div><div class="contact">' + esc(m.email) + ' • ' + esc(m.phone) + '</div></div><div class="pctbox"><div class="big">' + pct + '%</div><div class="sm">hoàn thành • ' + total + ' việc</div></div></div><div class="sec"><h2>Tổng quan trạng thái</h2><div class="grid2"><div class="donut" style="background:conic-gradient(' + (segs || "#e2e8f0 0% 100%") + ')"></div><div>' + (legend || '<span style="color:#94a3b8">Chưa có dữ liệu</span>') + '</div></div></div><div class="sec"><h2>Danh sách công việc</h2><table><thead><tr><th>Công việc</th><th>Trạng thái</th><th>Deadline</th><th>Ghi chú</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="sec"><h2>Kế hoạch tuần tiếp theo</h2>' + planTasks + planNote + '</div><div class="sec" style="color:#94a3b8;font-size:12px;text-align:center;border-top:1px solid #f1f5f9;padding-top:14px">Xuất ngày ' + today + '</div></div></body></html>';
  const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); } else { window.open(URL.createObjectURL(new Blob([html], { type: "text/html" })), "_blank"); }
}
