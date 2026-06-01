import React, { useState, useMemo, useRef } from "react";
import {
  LayoutDashboard, Network, Table2, Plus, X, Download, Upload,
  CheckCircle2, Clock, AlertTriangle, PauseCircle, CircleDot,
  Users, Trash2, Edit3, Mail, Phone, TrendingUp, Search,
  RefreshCw, Cloud, CloudOff
} from "lucide-react";

// ⚙️ URL Google Apps Script Web App của bạn — thay khi cần
const SHEET_URL = "https://script.google.com/macros/s/AKfycbx2j4ItP0EhRT1q7fIfNpBgsL4nxAGcJBTr6N4qAfrMcx6nAnGUChwI6Fh5Y5UpK1jQ8A/exec";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from "recharts";

// ---------- Status config ----------
const STATUS = {
  not_started: { label: "Chưa thực hiện", color: "#94a3b8", icon: CircleDot },
  in_progress: { label: "Đang thực hiện", color: "#3b82f6", icon: Clock },
  pending_review: { label: "Đang chờ duyệt", color: "#f59e0b", icon: AlertTriangle },
  done: { label: "Hoàn thành", color: "#10b981", icon: CheckCircle2 },
  overdue: { label: "Quá hạn", color: "#ef4444", icon: AlertTriangle },
  paused: { label: "Tạm dừng", color: "#8b5cf6", icon: PauseCircle },
};
const STATUS_KEYS = Object.keys(STATUS);

// ---------- Seed data ----------
const seed = [
  {
    id: "p1", role: "Admin", name: "LE TIN",
    email: "tin.lehoang32@gmail.com", phone: "0900000000",
    avatar: null, parentId: null,
    tasks: [
      { id: "t1", title: "Thiết lập cấu trúc dự án", status: "done", deadline: "2026-06-10", note: "Khởi tạo ban đầu" },
      { id: "t2", title: "Phân quyền nhân sự", status: "in_progress", deadline: "2026-06-15", note: "" },
    ],
  },
  {
    id: "p2", role: "Trưởng phòng KD", name: "Nguyễn An",
    email: "an.nguyen@example.com", phone: "0911111111",
    avatar: null, parentId: "p1",
    tasks: [
      { id: "t3", title: "Lập kế hoạch quý 2", status: "pending_review", deadline: "2026-06-08", note: "Chờ duyệt từ Admin" },
      { id: "t4", title: "Báo cáo doanh số", status: "overdue", deadline: "2026-05-28", note: "Trễ hạn" },
    ],
  },
  {
    id: "p3", role: "Nhân viên Marketing", name: "Trần Bình",
    email: "binh.tran@example.com", phone: "0922222222",
    avatar: null, parentId: "p1",
    tasks: [
      { id: "t5", title: "Thiết kế campaign mới", status: "in_progress", deadline: "2026-06-20", note: "" },
      { id: "t6", title: "Đăng bài social", status: "not_started", deadline: "2026-06-25", note: "" },
      { id: "t7", title: "Tổng hợp insight", status: "done", deadline: "2026-06-01", note: "" },
    ],
  },
];

const uid = () => Math.random().toString(36).slice(2, 9);

export default function App() {
  const [view, setView] = useState("org");
  const [people, setPeople] = useState(seed);
  const [selected, setSelected] = useState(null);
  const [syncState, setSyncState] = useState("idle"); // idle | syncing | ok | err
  const [autoSync, setAutoSync] = useState(false);
  const fileRef = useRef(null);

  const selectedPerson = people.find((p) => p.id === selected);

  // ---------- Google Sheet sync ----------
  const syncToSheet = async (data = people) => {
    setSyncState("syncing");
    try {
      await fetch(SHEET_URL, {
        method: "POST",
        mode: "no-cors", // Apps Script không trả CORS header → no-cors để gửi được
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(data),
      });
      // no-cors không đọc được response → coi như gửi thành công
      setSyncState("ok");
      setTimeout(() => setSyncState("idle"), 2500);
    } catch (e) {
      setSyncState("err");
      setTimeout(() => setSyncState("idle"), 3500);
    }
  };

  // tự đồng bộ khi bật autoSync và people thay đổi
  React.useEffect(() => {
    if (autoSync) {
      const t = setTimeout(() => syncToSheet(people), 1200);
      return () => clearTimeout(t);
    }
  }, [people, autoSync]);

  // ---------- Stats ----------
  const allTasks = useMemo(() => people.flatMap((p) => p.tasks.map((t) => ({ ...t, owner: p.name, role: p.role }))), [people]);

  const statusCounts = useMemo(() => {
    const c = Object.fromEntries(STATUS_KEYS.map((k) => [k, 0]));
    allTasks.forEach((t) => { c[t.status] = (c[t.status] || 0) + 1; });
    return c;
  }, [allTasks]);

  const pieData = STATUS_KEYS.map((k) => ({ name: STATUS[k].label, value: statusCounts[k], color: STATUS[k].color })).filter((d) => d.value > 0);

  const barData = people.map((p) => ({
    name: p.name.split(" ").slice(-1)[0],
    full: p.name,
    "Tổng việc": p.tasks.length,
    "Hoàn thành": p.tasks.filter((t) => t.status === "done").length,
  }));

  const overallPct = allTasks.length ? Math.round((statusCounts.done / allTasks.length) * 100) : 0;

  // ---------- People CRUD ----------
  const addPerson = (parentId) => {
    const np = { id: uid(), role: "Chức vụ mới", name: "Nhân sự mới", email: "email@example.com", phone: "0000000000", avatar: null, parentId, tasks: [] };
    setPeople((p) => [...p, np]);
    setSelected(np.id);
  };
  const updatePerson = (id, patch) => setPeople((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const removePerson = (id) => {
    setPeople((ps) => ps.filter((p) => p.id !== id && p.parentId !== id));
    setSelected(null);
  };

  // ---------- Task CRUD ----------
  const addTask = (pid) => updatePerson(pid, { tasks: [...(people.find((p) => p.id === pid).tasks), { id: uid(), title: "Công việc mới", status: "not_started", deadline: "", note: "" }] });
  const updateTask = (pid, tid, patch) => {
    const p = people.find((x) => x.id === pid);
    updatePerson(pid, { tasks: p.tasks.map((t) => (t.id === tid ? { ...t, ...patch } : t)) });
  };
  const removeTask = (pid, tid) => {
    const p = people.find((x) => x.id === pid);
    updatePerson(pid, { tasks: p.tasks.filter((t) => t.id !== tid) });
  };

  // ---------- Excel export (CSV BOM) ----------
  const exportExcel = () => {
    const rows = [["Vị trí", "Nhân sự", "Email", "SĐT", "Công việc", "Trạng thái", "Deadline", "Ghi chú"]];
    people.forEach((p) => {
      if (p.tasks.length === 0) rows.push([p.role, p.name, p.email, p.phone, "", "", "", ""]);
      p.tasks.forEach((t) => rows.push([p.role, p.name, p.email, p.phone, t.title, STATUS[t.status].label, t.deadline, t.note]));
    });
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `BaoCao_CongViec_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(people, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "backup_data.json"; a.click(); URL.revokeObjectURL(url);
  };
  const importJSON = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => { try { setPeople(JSON.parse(ev.target.result)); } catch { alert("File không hợp lệ"); } };
    r.readAsText(f);
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#f1f5f9", minHeight: "100vh", color: "#0f172a" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1e40af,#3b82f6)", padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 20px rgba(30,64,175,.25)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Network size={22} color="#fff" />
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 18, lineHeight: 1 }}>Quản Lý Công Việc</div>
            <div style={{ color: "#bfdbfe", fontSize: 12, marginTop: 3 }}>Project & Org Management</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => syncToSheet()} style={btnStyle(
            syncState === "ok" ? "#10b981" : syncState === "err" ? "#ef4444" : "rgba(255,255,255,.18)"
          )}>
            <RefreshCw size={15} style={{ animation: syncState === "syncing" ? "spin 1s linear infinite" : "none" }} />
            {syncState === "syncing" ? "Đang gửi..." : syncState === "ok" ? "Đã đồng bộ" : syncState === "err" ? "Lỗi" : "Đồng bộ Sheet"}
          </button>
          <button onClick={() => setAutoSync((a) => !a)} title="Tự động đồng bộ sau mỗi thay đổi" style={btnStyle(autoSync ? "#10b981" : "rgba(255,255,255,.18)")}>
            {autoSync ? <Cloud size={15} /> : <CloudOff size={15} />} Auto {autoSync ? "ON" : "OFF"}
          </button>
          <button onClick={exportExcel} style={btnStyle("rgba(255,255,255,.18)")}><Download size={15} /> Excel</button>
          <button onClick={exportJSON} style={btnStyle("rgba(255,255,255,.18)")}><Download size={15} /> Backup</button>
          <button onClick={() => fileRef.current.click()} style={btnStyle("rgba(255,255,255,.18)")}><Upload size={15} /> Khôi phục</button>
          <input ref={fileRef} type="file" accept=".json" onChange={importJSON} style={{ display: "none" }} />
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "14px 28px 0", background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
        {[
          { k: "org", label: "Sơ đồ tổ chức", icon: Network },
          { k: "dashboard", label: "Dashboard", icon: LayoutDashboard },
          { k: "data", label: "Bảng dữ liệu", icon: Table2 },
        ].map((t) => (
          <button key={t.k} onClick={() => setView(t.k)} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", border: "none",
            background: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
            color: view === t.k ? "#1e40af" : "#64748b",
            borderBottom: view === t.k ? "3px solid #3b82f6" : "3px solid transparent", marginBottom: -1,
          }}>
            <t.icon size={17} /> {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 28 }}>
        {view === "org" && <OrgView people={people} onSelect={setSelected} onAdd={addPerson} />}
        {view === "dashboard" && <Dashboard pieData={pieData} barData={barData} overallPct={overallPct} statusCounts={statusCounts} people={people} allTasks={allTasks} />}
        {view === "data" && <DataTable people={people} onSelect={setSelected} />}
      </div>

      {selectedPerson && (
        <PersonModal
          person={selectedPerson}
          onClose={() => setSelected(null)}
          onUpdate={(patch) => updatePerson(selectedPerson.id, patch)}
          onRemove={() => removePerson(selectedPerson.id)}
          onAddTask={() => addTask(selectedPerson.id)}
          onUpdateTask={(tid, patch) => updateTask(selectedPerson.id, tid, patch)}
          onRemoveTask={(tid) => removeTask(selectedPerson.id, tid)}
        />
      )}
    </div>
  );
}

const btnStyle = (bg) => ({
  display: "flex", alignItems: "center", gap: 6, background: bg, color: "#fff",
  border: "none", padding: "9px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer",
});

// ---------- ORG VIEW ----------
function OrgView({ people, onSelect, onAdd }) {
  const roots = people.filter((p) => !p.parentId);
  const childrenOf = (id) => people.filter((p) => p.parentId === id);

  const Node = ({ person }) => {
    const kids = childrenOf(person.id);
    const taskCount = person.tasks.length;
    const doneCount = person.tasks.filter((t) => t.status === "done").length;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div onClick={() => onSelect(person.id)} style={{
          background: "#fff", borderRadius: 14, width: 260, boxShadow: "0 4px 16px rgba(15,23,42,.08)",
          border: "1px solid #e2e8f0", cursor: "pointer", overflow: "hidden", transition: "transform .15s",
        }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}>
          <div style={{ background: "linear-gradient(135deg,#eff6ff,#dbeafe)", padding: "8px 14px", fontSize: 12, fontWeight: 700, color: "#1e40af", textAlign: "center" }}>{person.role}</div>
          <div style={{ padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
            <Avatar person={person} size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{person.name}</div>
              <div style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{person.email}</div>
              <div style={{ marginTop: 6, display: "flex", gap: 5, alignItems: "center" }}>
                <span style={{ fontSize: 11, background: "#eff6ff", color: "#1e40af", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{taskCount} việc</span>
                {taskCount > 0 && <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>{Math.round((doneCount / taskCount) * 100)}%</span>}
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => onAdd(person.id)} style={{
          marginTop: 8, background: "#fff", border: "1px dashed #93c5fd", color: "#3b82f6", borderRadius: 8,
          padding: "4px 10px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontWeight: 600,
        }}><Plus size={13} /> Thêm cấp dưới</button>

        {kids.length > 0 && (
          <>
            <div style={{ width: 2, height: 22, background: "#cbd5e1" }} />
            <div style={{ display: "flex", gap: 28, paddingTop: 4, position: "relative" }}>
              {kids.length > 1 && <div style={{ position: "absolute", top: 0, left: "12%", right: "12%", height: 2, background: "#cbd5e1" }} />}
              {kids.map((k) => (
                <div key={k.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 2, height: 14, background: "#cbd5e1" }} />
                  <Node person={k} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ overflowX: "auto", paddingBottom: 40 }}>
      <div style={{ display: "flex", gap: 60, justifyContent: "center", minWidth: "fit-content", paddingTop: 10 }}>
        {roots.map((r) => <Node key={r.id} person={r} />)}
      </div>
    </div>
  );
}

function Avatar({ person, size = 40 }) {
  if (person.avatar) return <img src={person.avatar} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  const initials = person.name.split(" ").map((w) => w[0]).slice(-2).join("").toUpperCase();
  return <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#1e40af)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.36, flexShrink: 0 }}>{initials}</div>;
}

// ---------- DASHBOARD ----------
function Dashboard({ pieData, barData, overallPct, statusCounts, people, allTasks }) {
  const cards = [
    { label: "Tổng nhân sự", value: people.length, color: "#3b82f6", icon: Users },
    { label: "Tổng công việc", value: allTasks.length, color: "#8b5cf6", icon: Table2 },
    { label: "Hoàn thành", value: statusCounts.done, color: "#10b981", icon: CheckCircle2 },
    { label: "Quá hạn", value: statusCounts.overdue, color: "#ef4444", icon: AlertTriangle },
  ];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 20 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 10px rgba(15,23,42,.05)", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>{c.label}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value}</div>
            </div>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: c.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <c.icon size={24} color={c.color} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16, marginBottom: 16 }}>
        <Panel title="Cơ cấu trạng thái nhiệm vụ" icon={CircleDot}>
          {pieData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.value}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>
        <Panel title="Khối lượng công việc theo nhân sự" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Tổng việc" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Hoàn thành" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="Tiến độ hoàn thành tổng thể" icon={TrendingUp}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "10px 0" }}>
          <div style={{ fontSize: 44, fontWeight: 800, color: "#1e40af" }}>{overallPct}%</div>
          <div style={{ flex: 1 }}>
            <div style={{ height: 16, background: "#e2e8f0", borderRadius: 20, overflow: "hidden" }}>
              <div style={{ width: `${overallPct}%`, height: "100%", background: "linear-gradient(90deg,#3b82f6,#10b981)", borderRadius: 20, transition: "width .4s" }} />
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>{statusCounts.done}/{allTasks.length} công việc đã hoàn thành</div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 10px rgba(15,23,42,.05)", border: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontWeight: 700, fontSize: 15 }}>
        <Icon size={18} color="#3b82f6" /> {title}
      </div>
      {children}
    </div>
  );
}
const Empty = () => <div style={{ textAlign: "center", color: "#94a3b8", padding: 60, fontSize: 14 }}>Chưa có dữ liệu</div>;

// ---------- DATA TABLE ----------
function DataTable({ people, onSelect }) {
  const [q, setQ] = useState("");
  const rows = people.flatMap((p) => p.tasks.length ? p.tasks.map((t) => ({ p, t })) : [{ p, t: null }]);
  const filtered = rows.filter(({ p, t }) => {
    const s = (p.name + p.role + (t?.title || "")).toLowerCase();
    return s.includes(q.toLowerCase());
  });
  return (
    <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 10px rgba(15,23,42,.05)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <div style={{ padding: 16, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
        <Search size={18} color="#94a3b8" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo nhân sự, vị trí, công việc..." style={{ border: "none", outline: "none", fontSize: 14, flex: 1 }} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc", color: "#64748b", textAlign: "left" }}>
              {["Vị trí", "Nhân sự", "Công việc", "Trạng thái", "Deadline", "Ghi chú"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: .3 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ p, t }, i) => (
              <tr key={i} onClick={() => onSelect(p.id)} style={{ borderTop: "1px solid #f1f5f9", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "12px 16px", fontWeight: 600, color: "#1e40af" }}>{p.role}</td>
                <td style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}><Avatar person={p} size={28} /> {p.name}</td>
                <td style={{ padding: "12px 16px" }}>{t ? t.title : <span style={{ color: "#cbd5e1" }}>— chưa có việc —</span>}</td>
                <td style={{ padding: "12px 16px" }}>{t && <StatusBadge status={t.status} />}</td>
                <td style={{ padding: "12px 16px", color: "#64748b" }}>{t?.deadline || "-"}</td>
                <td style={{ padding: "12px 16px", color: "#64748b" }}>{t?.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS[status];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: s.color + "18", color: s.color, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color }} />{s.label}</span>;
}

// ---------- PERSON MODAL ----------
function PersonModal({ person, onClose, onUpdate, onRemove, onAddTask, onUpdateTask, onRemoveTask }) {
  const done = person.tasks.filter((t) => t.status === "done").length;
  const pct = person.tasks.length ? Math.round((done / person.tasks.length) * 100) : 0;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, width: "min(720px,100%)", maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        {/* header */}
        <div style={{ background: "linear-gradient(135deg,#1e40af,#3b82f6)", padding: 22, display: "flex", gap: 16, alignItems: "center", position: "relative" }}>
          <Avatar person={person} size={64} />
          <div style={{ flex: 1 }}>
            <input value={person.name} onChange={(e) => onUpdate({ name: e.target.value })} style={editInput(20, "#fff", true)} />
            <input value={person.role} onChange={(e) => onUpdate({ role: e.target.value })} style={editInput(13, "#bfdbfe")} />
          </div>
          <div style={{ textAlign: "center", color: "#fff", marginRight: 30 }}>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{pct}%</div>
            <div style={{ fontSize: 11, color: "#bfdbfe" }}>hoàn thành</div>
          </div>
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.2)", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
        </div>

        {/* contact */}
        <div style={{ padding: "14px 22px", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 20 }}>
          <Field icon={Mail} value={person.email} onChange={(v) => onUpdate({ email: v })} />
          <Field icon={Phone} value={person.phone} onChange={(v) => onUpdate({ phone: v })} />
        </div>

        {/* tasks */}
        <div style={{ padding: 22, overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Công việc ({person.tasks.length})</div>
            <button onClick={onAddTask} style={{ ...btnStyle("#3b82f6"), padding: "7px 12px" }}><Plus size={15} /> Thêm việc</button>
          </div>
          {person.tasks.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 30, fontSize: 14 }}>Chưa có công việc nào</div>}
          {person.tasks.map((t) => (
            <div key={t.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, marginBottom: 10, borderLeft: `4px solid ${STATUS[t.status].color}` }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input value={t.title} onChange={(e) => onUpdateTask(t.id, { title: e.target.value })} style={{ flex: 1, border: "none", outline: "none", fontWeight: 600, fontSize: 14 }} />
                <button onClick={() => onRemoveTask(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 size={16} /></button>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <select value={t.status} onChange={(e) => onUpdateTask(t.id, { status: e.target.value })} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: STATUS[t.status].color, fontWeight: 600 }}>
                  {STATUS_KEYS.map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
                </select>
                <input type="date" value={t.deadline} onChange={(e) => onUpdateTask(t.id, { deadline: e.target.value })} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
                <input value={t.note} placeholder="Ghi chú..." onChange={(e) => onUpdateTask(t.id, { note: e.target.value })} style={{ flex: 1, minWidth: 120, padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: 16, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between" }}>
          <button onClick={onRemove} style={{ ...btnStyle("#ef4444"), padding: "9px 14px" }}><Trash2 size={15} /> Xóa nhân sự</button>
          <button onClick={onClose} style={{ ...btnStyle("#1e40af"), padding: "9px 18px" }}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

const editInput = (size, color, bold) => ({ background: "none", border: "none", outline: "none", color, fontSize: size, fontWeight: bold ? 700 : 500, width: "100%", padding: 0, marginBottom: 2 });

function Field({ icon: Icon, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
      <Icon size={16} color="#94a3b8" />
      <input value={value} onChange={(e) => onChange(e.target.value)} style={{ border: "none", outline: "none", fontSize: 13, flex: 1, color: "#334155" }} />
    </div>
  );
}
